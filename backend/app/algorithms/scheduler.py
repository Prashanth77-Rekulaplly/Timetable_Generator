"""Main timetable generation engine: graph coloring + day-balanced time slot distribution + room allocation + optimization."""
from __future__ import annotations
import random
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple, Iterable
from datetime import time
from app.algorithms.graph import ConflictGraph, SessionNode, new_session_id
from app.algorithms.coloring import dsatur, ColoringResult
from app.constraints import ConstraintEngine, ScheduleAssignment, Severity, ConstraintViolation
from app.validators import TimetableValidator, ValidationResult
from app.models.base import (
    Faculty, Course, Section, Room, TimeSlot,
    FacultyAvailability, RoomAvailability, FacultyPreference
)


@dataclass
class GenerationInput:
    courses: List[Course]
    sections: List[Section]
    faculty: List[Faculty]
    rooms: List[Room]
    time_slots: List[TimeSlot]
    faculty_avail: List[FacultyAvailability] = field(default_factory=list)
    room_avail: List[RoomAvailability] = field(default_factory=list)
    faculty_prefs: List[FacultyPreference] = field(default_factory=list)
    section_filter: Optional[List[int]] = None
    room_filter: Optional[List[int]] = None
    faculty_filter: Optional[List[int]] = None
    optimize: bool = True
    max_iterations: int = 100


@dataclass
class GenerationResult:
    assignments: List[ScheduleAssignment]
    coloring: ColoringResult
    validation: ValidationResult
    time_slot_map: Dict[str, int]  # session_id -> time_slot_id
    room_map: Dict[str, int]       # session_id -> room_id
    conflicts: List[Dict] = field(default_factory=list)
    success: bool = True
    message: str = ""


class TimetableScheduler:
    """High-level generator that produces a feasible, day-balanced timetable using all rooms and labs."""

    def __init__(self, input_data: GenerationInput):
        self.input = input_data
        self.engine = ConstraintEngine(
            faculty=input_data.faculty,
            courses=input_data.courses,
            sections=input_data.sections,
            rooms=input_data.rooms,
            time_slots=input_data.time_slots,
            faculty_avail=input_data.faculty_avail,
            room_avail=input_data.room_avail,
            faculty_prefs=input_data.faculty_prefs,
        )
        self.validator = TimetableValidator(self.engine)

        # Filter entities if specified
        self.sections = self._filter(input_data.sections, input_data.section_filter)
        self.rooms = self._filter(input_data.rooms, input_data.room_filter)
        self.faculty = self._filter(input_data.faculty, input_data.faculty_filter)
        self.faculty_by_id = {f.id: f for f in self.faculty}
        self.course_by_id = {c.id: c for c in input_data.courses}
        self.room_by_id = {r.id: r for r in self.rooms}
        self.ts_by_id = {t.id: t for t in input_data.time_slots}

    @staticmethod
    def _filter(items, filter_ids):
        if not filter_ids:
            return items
        return [i for i in items if i.id in filter_ids]

    def generate(self) -> GenerationResult:
        # 1. Expand course-section pairs into sessions
        sessions = self._expand_sessions()

        if not sessions:
            return GenerationResult(
                assignments=[], coloring=ColoringResult({}, 0),
                validation=ValidationResult(True, 100.0, 0, 0, [], {}),
                time_slot_map={}, room_map={},
                success=False, message="No sessions to schedule."
            )

        # 2. Build conflict graph
        graph = self._build_conflict_graph(sessions)

        # 3. Graph coloring (DSATUR) with time slots as colors
        non_break_slots = [t for t in self.input.time_slots if not t.is_break]
        max_colors = len(non_break_slots) if non_break_slots else len(self.input.time_slots)
        coloring = dsatur(graph, max_colors=max_colors)

        if not coloring.valid():
            return self._handle_coloring_failure(sessions, graph, coloring, max_colors)

        # 4. Map colors and sessions to actual time slot IDs spread across all days of the week
        time_slot_map = self._assign_time_slots(sessions, coloring)

        # 5. Assign rooms to each session, utilizing all lecture rooms and lab rooms evenly
        room_map = self._assign_rooms(sessions, time_slot_map)

        # 6. Build ScheduleAssignment list
        assignments = self._build_assignments(sessions, time_slot_map, room_map)

        # 7. Validate
        validation = self.validator.validate(assignments)

        # 8. Optimize soft constraints if requested
        if self.input.optimize:
            assignments = self._local_search_optimize(assignments)
            validation = self.validator.validate(assignments)

        # 9. Final validation
        if validation.valid:
            return GenerationResult(
                assignments=assignments,
                coloring=coloring,
                validation=validation,
                time_slot_map=time_slot_map,
                room_map=room_map,
                success=True,
                message="Timetable generated successfully."
            )
        else:
            return GenerationResult(
                assignments=assignments,
                coloring=coloring,
                validation=validation,
                time_slot_map=time_slot_map,
                room_map=room_map,
                conflicts=[v.to_dict() for v in validation.violations],
                success=False,
                message="Timetable has hard violations. See conflicts for details."
            )

    # -- Step 1: Expand sessions --
    def _expand_sessions(self) -> List[SessionNode]:
        """Create SessionNode for each required class session."""
        sessions: List[SessionNode] = []

        for course in self.input.courses:
            course_sections = [s for s in self.sections if s.course_id == course.id]
            if not course_sections:
                continue

            # Auto-detect lab requirement from course properties or naming
            is_lab_course = bool(
                getattr(course, "is_lab", False)
                or re.search(r'\b(lab|laboratory|practical|workshop)\b', course.name or "", re.IGNORECASE)
                or re.search(r'\b(lab|laboratory|practical|workshop)\b', course.code or "", re.IGNORECASE)
            )

            for section in course_sections:
                faculty = self.faculty_by_id.get(course.faculty_id)
                if not faculty:
                    continue

                periods = section.periods_per_week or course.default_periods_per_week or 3
                for i in range(periods):
                    requires_lab = is_lab_course or getattr(section, "requires_lab", False)
                    node = SessionNode(
                        id=new_session_id(),
                        course_id=course.id,
                        section_id=section.id,
                        faculty_id=faculty.id,
                        requires_lab=requires_lab,
                        requires_projector=True,
                        capacity=section.capacity or 30,
                        is_primary=(i == 0),
                        label=f"{course.code}-{section.section_number}-{i+1}"
                    )
                    sessions.append(node)
        return sessions

    # -- Step 2: Build conflict graph --
    def _build_conflict_graph(self, sessions: List[SessionNode]) -> ConflictGraph:
        graph = ConflictGraph()
        graph.add_nodes(sessions)

        # Same faculty cannot teach at same time (base conflict)
        by_faculty: Dict[int, List[SessionNode]] = {}
        for s in sessions:
            by_faculty.setdefault(s.faculty_id, []).append(s)
        for fac_nodes in by_faculty.values():
            for i, a in enumerate(fac_nodes):
                for b in fac_nodes[i+1:]:
                    graph.add_edge(a.id, b.id)

        # Same section cannot have multiple classes at same time
        by_section: Dict[int, List[SessionNode]] = {}
        for s in sessions:
            by_section.setdefault(s.section_id, []).append(s)
        for sec_nodes in by_section.values():
            for i, a in enumerate(sec_nodes):
                for b in sec_nodes[i+1:]:
                    graph.add_edge(a.id, b.id)

        return graph

    # -- Step 3/4: Color handling --
    def _handle_coloring_failure(
        self,
        sessions: List[SessionNode],
        graph: ConflictGraph,
        coloring: ColoringResult,
        max_colors: int
    ) -> GenerationResult:
        """Analyze why coloring failed and return detailed conflict info."""
        conflicts = []
        for a_id, b_id, reason in graph.detect_resource_conflict():
            a = graph.nodes[a_id]
            b = graph.nodes[b_id]
            conflicts.append({
                "type": reason,
                "session_a": {"id": a.id, "label": a.label, "course": a.course_id, "section": a.section_id, "faculty": a.faculty_id},
                "session_b": {"id": b.id, "label": b.label, "course": b.course_id, "section": b.section_id, "faculty": b.faculty_id},
                "message": f"Conflict ({reason}): {a.label} and {b.label} cannot share a time slot."
            })

        if len(sessions) > max_colors * 2:
            conflicts.append({
                "type": "capacity",
                "message": f"Only {max_colors} non-break time slots available but {len(sessions)} sessions needed. Consider adding more time slots or reducing sessions."
            })

        return GenerationResult(
            assignments=[], coloring=coloring,
            validation=ValidationResult(False, 0.0, len(conflicts), 0, [], {}),
            time_slot_map={}, room_map={},
            conflicts=conflicts,
            success=False,
            message=f"Cannot schedule {len(sessions)} sessions into {max_colors} time slots without conflicts."
        )

    # -- Step 4: Multi-Day Balanced Time-Slot Assignment --
    def _assign_time_slots(
        self,
        sessions: List[SessionNode],
        coloring: ColoringResult,
    ) -> Dict[str, int]:
        """
        Map sessions to actual time-slot IDs such that:
        1. Sessions for each section are distributed evenly across ALL available days (Mon-Fri).
        2. Multiple periods for the same course are spread across different days of the week.
        3. Periods within a day for a section are scheduled compactly to minimize idle gaps.
        4. Faculty availability and non-overlapping constraints are strictly respected.
        """
        available_slots = [ts for ts in self.input.time_slots if not ts.is_break]
        if not available_slots:
            available_slots = list(self.input.time_slots)

        if not available_slots:
            return {}

        # Group non-break slots by day of week
        slots_by_day: Dict[int, List[TimeSlot]] = {}
        for ts in available_slots:
            slots_by_day.setdefault(ts.day_of_week, []).append(ts)
        for d in slots_by_day:
            slots_by_day[d].sort(key=lambda ts: ts.start_time)

        unique_days = sorted(slots_by_day.keys())
        num_days = len(unique_days) if unique_days else 1

        # Faculty explicit unavailability set
        fac_unavail: Set[Tuple[int, int]] = {
            (a.faculty_id, a.time_slot_id)
            for a in self.input.faculty_avail
            if not a.is_available
        }

        # Track usage
        fac_used: Set[Tuple[int, int]] = set()      # (faculty_id, time_slot_id)
        sec_used: Set[Tuple[int, int]] = set()      # (section_id, time_slot_id)
        section_day_slots: Dict[Tuple[int, int], List[int]] = {}  # (section_id, day) -> list of slot_ids
        course_day_assigned: Dict[Tuple[int, int, int], int] = {} # (section_id, course_id, day) -> count

        mapping: Dict[str, int] = {}

        # Group sessions by section
        by_section: Dict[int, List[SessionNode]] = {}
        for s in sessions:
            by_section.setdefault(s.section_id, []).append(s)

        for section_idx, (section_id, sec_sessions) in enumerate(by_section.items()):
            # Group section sessions by course
            by_course: Dict[int, List[SessionNode]] = {}
            for s in sec_sessions:
                by_course.setdefault(s.course_id, []).append(s)

            total_sessions = len(sec_sessions)
            target_per_day = max(1, (total_sessions + num_days - 1) // num_days)

            # Sort courses: lab courses first, then largest periods
            sorted_courses = sorted(
                by_course.keys(),
                key=lambda c_id: (
                    not any(s.requires_lab for s in by_course[c_id]),
                    -len(by_course[c_id]),
                    c_id
                )
            )

            # For each course, assign its sessions across different days
            for course_offset, c_id in enumerate(sorted_courses):
                c_sessions = by_course[c_id]

                # Generate preferred days permutation for this course
                day_order = [unique_days[(course_offset + section_idx + step) % num_days] for step in range(num_days)]

                for s_idx, session in enumerate(c_sessions):
                    assigned = False

                    # Score candidate days for this session
                    # Prioritize days with:
                    # 1. Zero sessions for this course so far (spread across days)
                    # 2. Total section sessions on that day < target_per_day
                    candidate_days = list(day_order)
                    candidate_days.sort(key=lambda d: (
                        course_day_assigned.get((section_id, c_id, d), 0),
                        len(section_day_slots.get((section_id, d), [])),
                    ))

                    for target_day in candidate_days:
                        day_slots = slots_by_day.get(target_day, [])
                        if not day_slots:
                            continue

                        already_used = section_day_slots.get((section_id, target_day), [])

                        # Sort day slots to encourage compactness (adjacent to existing, or standard order)
                        def slot_sort_key(ts: TimeSlot):
                            is_used_sec = (section_id, ts.id) in sec_used
                            is_used_fac = (session.faculty_id, ts.id) in fac_used
                            is_unavail = (session.faculty_id, ts.id) in fac_unavail
                            if is_used_sec or is_used_fac or is_unavail:
                                return (999, 999)
                            if already_used:
                                min_gap = min(abs(ts.id - u_id) for u_id in already_used)
                                return (0, min_gap, ts.start_time)
                            else:
                                return (1, 0, ts.start_time)

                        sorted_slots = sorted(day_slots, key=slot_sort_key)

                        for ts in sorted_slots:
                            if (section_id, ts.id) in sec_used:
                                continue
                            if (session.faculty_id, ts.id) in fac_used:
                                continue
                            if (session.faculty_id, ts.id) in fac_unavail:
                                continue

                            # Assign this slot
                            mapping[session.id] = ts.id
                            sec_used.add((section_id, ts.id))
                            fac_used.add((session.faculty_id, ts.id))
                            section_day_slots.setdefault((section_id, target_day), []).append(ts.id)
                            course_day_assigned[(section_id, c_id, target_day)] = course_day_assigned.get((section_id, c_id, target_day), 0) + 1
                            assigned = True
                            break

                        if assigned:
                            break

                    if not assigned:
                        # Fallback: try all non-break slots across all days
                        for ts in available_slots:
                            if (section_id, ts.id) in sec_used:
                                continue
                            if (session.faculty_id, ts.id) in fac_used:
                                continue
                            if (session.faculty_id, ts.id) in fac_unavail:
                                continue
                            mapping[session.id] = ts.id
                            sec_used.add((section_id, ts.id))
                            fac_used.add((session.faculty_id, ts.id))
                            section_day_slots.setdefault((section_id, ts.day_of_week), []).append(ts.id)
                            course_day_assigned[(section_id, c_id, ts.day_of_week)] = course_day_assigned.get((section_id, c_id, ts.day_of_week), 0) + 1
                            assigned = True
                            break

                    if not assigned:
                        # Absolute fallback: assign first available slot
                        color = coloring.coloring.get(session.id, 0)
                        fallback_slot = available_slots[color % len(available_slots)]
                        mapping[session.id] = fallback_slot.id

        return mapping

    # -- Step 5: Diversified Room and Lab Allotment --
    def _assign_rooms(self, sessions: List[SessionNode], time_slot_map: Dict[str, int]) -> Dict[str, int]:
        """
        Assign rooms to each session, ensuring:
        1. Lab sessions are assigned to dedicated lab premises (Lab 201, Lab 202, Lab 203...).
        2. Lecture sessions are distributed across all available classrooms (Room 101, Room 102, Room 103...).
        3. Overall room utilization is balanced across all available rooms and labs.
        4. No two sessions share the same room at the same time slot.
        """
        room_map: Dict[str, int] = {}
        if not self.rooms:
            return {s.id: 0 for s in sessions}

        # Categorize rooms
        lab_rooms = [r for r in self.rooms if r.room_type == "lab" or getattr(r, "has_computer", False)]
        lecture_rooms = [r for r in self.rooms if r.room_type in ("lecture", "classroom", "class", "tutorial") or (r.room_type != "lab" and not getattr(r, "has_computer", False))]

        if not lab_rooms:
            lab_rooms = list(self.rooms)
        if not lecture_rooms:
            lecture_rooms = list(self.rooms)

        # Build unavailable room set
        room_unavail: Set[Tuple[int, int]] = {
            (a.room_id, a.time_slot_id)
            for a in self.input.room_avail
            if not a.is_available
        }

        # Global room usage tracker across the whole schedule (for load balancing)
        room_usage: Dict[int, int] = {r.id: 0 for r in self.rooms}

        # Group sessions by assigned time slot
        by_time_slot: Dict[int, List[SessionNode]] = {}
        for s in sessions:
            ts_id = time_slot_map.get(s.id)
            if ts_id is not None:
                by_time_slot.setdefault(ts_id, []).append(s)

        # Sort time slots chronologically
        sorted_slot_ids = sorted(
            by_time_slot.keys(),
            key=lambda tid: (
                self.ts_by_id[tid].day_of_week if tid in self.ts_by_id else 0,
                self.ts_by_id[tid].start_time if tid in self.ts_by_id else time(0, 0)
            )
        )

        for ts_id in sorted_slot_ids:
            slot_sessions = by_time_slot[ts_id]
            # Assign labs first, then largest capacity
            slot_sessions.sort(key=lambda s: (not s.requires_lab, -s.capacity))

            used_rooms_in_slot: Set[int] = set()

            for session in slot_sessions:
                chosen_room_id = self._find_diversified_room(
                    session=session,
                    time_slot_id=ts_id,
                    used_rooms=used_rooms_in_slot,
                    room_unavail=room_unavail,
                    room_usage=room_usage,
                    lab_rooms=lab_rooms,
                    lecture_rooms=lecture_rooms,
                )

                if chosen_room_id:
                    room_map[session.id] = chosen_room_id
                    used_rooms_in_slot.add(chosen_room_id)
                    room_usage[chosen_room_id] = room_usage.get(chosen_room_id, 0) + 1
                else:
                    # Fallback to any room
                    fallback = self.rooms[0].id
                    for r in self.rooms:
                        if r.id not in used_rooms_in_slot:
                            fallback = r.id
                            break
                    room_map[session.id] = fallback
                    used_rooms_in_slot.add(fallback)
                    room_usage[fallback] = room_usage.get(fallback, 0) + 1

        return room_map

    def _find_diversified_room(
        self,
        session: SessionNode,
        time_slot_id: int,
        used_rooms: Set[int],
        room_unavail: Set[Tuple[int, int]],
        room_usage: Dict[int, int],
        lab_rooms: List[Room],
        lecture_rooms: List[Room],
    ) -> Optional[int]:
        """Find the best room for a session balancing room utilization and constraints."""
        target_pool = lab_rooms if session.requires_lab else lecture_rooms
        other_pool = lecture_rooms if session.requires_lab else lab_rooms

        # Pass 1: Target pool with capacity and projector requirement
        candidates = [
            r for r in target_pool
            if r.id not in used_rooms
            and (r.id, time_slot_id) not in room_unavail
            and r.capacity >= session.capacity
        ]
        if session.requires_projector:
            proj_candidates = [r for r in candidates if getattr(r, "has_projector", True)]
            if proj_candidates:
                candidates = proj_candidates

        if candidates:
            # Sort by least used first, then smallest suitable capacity
            candidates.sort(key=lambda r: (
                room_usage.get(r.id, 0),
                abs(r.capacity - session.capacity),
                r.id
            ))
            return candidates[0].id

        # Pass 2: Target pool relaxing capacity requirement
        candidates = [
            r for r in target_pool
            if r.id not in used_rooms
            and (r.id, time_slot_id) not in room_unavail
        ]
        if candidates:
            candidates.sort(key=lambda r: (
                room_usage.get(r.id, 0),
                -r.capacity
            ))
            return candidates[0].id

        # Pass 3: Other pool (fallback)
        candidates = [
            r for r in other_pool
            if r.id not in used_rooms
            and (r.id, time_slot_id) not in room_unavail
        ]
        if candidates:
            candidates.sort(key=lambda r: (
                room_usage.get(r.id, 0),
                abs(r.capacity - session.capacity),
                r.id
            ))
            return candidates[0].id

        # Pass 4: Any unused room in self.rooms
        candidates = [
            r for r in self.rooms
            if r.id not in used_rooms
        ]
        if candidates:
            candidates.sort(key=lambda r: room_usage.get(r.id, 0))
            return candidates[0].id

        return None

    # -- Step 6: Build assignments --
    def _build_assignments(
        self,
        sessions: List[SessionNode],
        time_slot_map: Dict[str, int],
        room_map: Dict[str, int]
    ) -> List[ScheduleAssignment]:
        assignments = []
        for s in sessions:
            assignments.append(ScheduleAssignment(
                course_id=s.course_id,
                section_id=s.section_id,
                faculty_id=s.faculty_id,
                room_id=room_map.get(s.id, 0),
                time_slot_id=time_slot_map.get(s.id, 0),
                is_lab=s.requires_lab,
                requires_projector=s.requires_projector,
                capacity_required=s.capacity,
            ))
        return assignments

    # -- Step 8: Local search optimization --
    def _local_search_optimize(
        self,
        assignments: List[ScheduleAssignment]
    ) -> List[ScheduleAssignment]:
        """Simple hill-climbing: try swapping time slots between two assignments while preserving hard constraints."""
        if len(assignments) < 2:
            return assignments

        best = [
            ScheduleAssignment(
                course_id=a.course_id,
                section_id=a.section_id,
                faculty_id=a.faculty_id,
                room_id=a.room_id,
                time_slot_id=a.time_slot_id,
                is_lab=a.is_lab,
                requires_projector=a.requires_projector,
                capacity_required=a.capacity_required,
                entry_id=a.entry_id,
            )
            for a in assignments
        ]
        best_val = self.validator.validate(best)
        best_score = best_val.score

        non_break_slots = [t.id for t in self.input.time_slots if not t.is_break]
        if len(non_break_slots) < 2:
            return best

        fac_unavail = {
            (a.faculty_id, a.time_slot_id) for a in self.input.faculty_avail if not a.is_available
        }

        no_improve_count = 0
        max_no_improve = min(50, self.input.max_iterations)

        for _ in range(self.input.max_iterations):
            i, j = random.sample(range(len(best)), 2)
            a, b = best[i], best[j]

            # Skip if same section or faculty
            if a.section_id == b.section_id or a.faculty_id == b.faculty_id:
                no_improve_count += 1
                if no_improve_count > max_no_improve:
                    break
                continue

            if (a.faculty_id, b.time_slot_id) in fac_unavail or (b.faculty_id, a.time_slot_id) in fac_unavail:
                no_improve_count += 1
                if no_improve_count > max_no_improve:
                    break
                continue

            # Swap time slots
            orig_a_ts, orig_b_ts = a.time_slot_id, b.time_slot_id
            a.time_slot_id, b.time_slot_id = b.time_slot_id, a.time_slot_id

            val = self.validator.validate(best)
            if val.valid and val.score > best_score:
                best_score = val.score
                best_val = val
                no_improve_count = 0
            else:
                # Revert
                a.time_slot_id, b.time_slot_id = orig_a_ts, orig_b_ts
                no_improve_count += 1

            if no_improve_count > max_no_improve:
                break

        return best


def generate_timetable(
    courses: List[Course],
    sections: List[Section],
    faculty: List[Faculty],
    rooms: List[Room],
    time_slots: List[TimeSlot],
    faculty_avail: Optional[List[FacultyAvailability]] = None,
    room_avail: Optional[List[RoomAvailability]] = None,
    faculty_prefs: Optional[List[FacultyPreference]] = None,
    **kwargs
) -> GenerationResult:
    """Convenience function for quick generation."""
    inp = GenerationInput(
        courses=courses,
        sections=sections,
        faculty=faculty,
        rooms=rooms,
        time_slots=time_slots,
        faculty_avail=faculty_avail or [],
        room_avail=room_avail or [],
        faculty_prefs=faculty_prefs or [],
        **kwargs
    )
    scheduler = TimetableScheduler(inp)
    return scheduler.generate()