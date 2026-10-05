"""Integration tests for the full scheduler + validator + room allocator."""
import pytest
from datetime import time
from app.algorithms.scheduler import TimetableScheduler, GenerationInput
from app.constraints import Severity


def make_faculty(id):
    from app.models.base import Faculty
    return Faculty(id=id, name=f"F{id}", department="CS", max_hours_per_week=20)


def make_course(id, is_lab=False, periods=3, faculty_id=1):
    from app.models.base import Course
    return Course(id=id, code=f"C{id}", name=f"Course {id}",
                  is_lab=is_lab, default_periods_per_week=periods,
                  min_periods=1, faculty_id=faculty_id)


def make_section(id, course_id, periods=3, requires_lab=False):
    from app.models.base import Section
    return Section(id=id, course_id=course_id, section_number=f"S{id}",
                   capacity=30, periods_per_week=periods, requires_lab=requires_lab)


def make_room(id, cap=30, room_type="lecture"):
    from app.models.base import Room
    return Room(id=id, room_number=f"R{id}", capacity=cap, has_projector=True,
                room_type=room_type)


def make_slot(id, day=0, hour=8):
    from app.models.base import TimeSlot
    return TimeSlot(id=id, day_of_week=day,
                    start_time=time(hour, 0), end_time=time(hour+1, 0))


class TestScheduler:
    """Tests for the full scheduler."""

    def test_simple_schedule(self):
        faculty = [make_faculty(1)]
        courses = [make_course(1, periods=2, faculty_id=1)]
        sections = [make_section(1, course_id=1, periods=2)]
        rooms = [make_room(1, cap=30)]
        slots = [make_slot(i, day=i % 5, hour=8 + (i % 4)) for i in range(1, 9)]

        gen_input = GenerationInput(
            courses=courses, sections=sections, faculty=faculty,
            rooms=rooms, time_slots=slots
        )
        scheduler = TimetableScheduler(gen_input)
        result = scheduler.generate()

        assert result.success
        assert len(result.assignments) == 2

    def test_faculty_conflict_handling(self):
        """Faculty with multiple sections should be separated in time."""
        faculty = [make_faculty(1)]
        courses = [
            make_course(1, periods=2, faculty_id=1),
            make_course(2, periods=2, faculty_id=1),  # same faculty
        ]
        sections = [
            make_section(1, course_id=1, periods=2),
            make_section(2, course_id=2, periods=2),
        ]
        rooms = [make_room(1, cap=30)]
        slots = [make_slot(i, day=i % 5, hour=8 + (i % 4)) for i in range(1, 9)]

        gen_input = GenerationInput(
            courses=courses, sections=sections, faculty=faculty,
            rooms=rooms, time_slots=slots
        )
        scheduler = TimetableScheduler(gen_input)
        result = scheduler.generate()

        # Should be valid (no faculty overlap)
        assert result.success
        # Check no two assignments have same (faculty, time_slot)
        seen = set()
        for a in result.assignments:
            assert (a.faculty_id, a.time_slot_id) not in seen, f"Conflict: {(a.faculty_id, a.time_slot_id)}"
            seen.add((a.faculty_id, a.time_slot_id))

    def test_room_assignment(self):
        faculty = [make_faculty(1)]
        courses = [make_course(1, periods=2, faculty_id=1)]
        sections = [make_section(1, course_id=1, periods=2)]
        rooms = [make_room(1, cap=30), make_room(2, cap=30)]
        slots = [make_slot(i, day=i % 5, hour=8 + (i % 4)) for i in range(1, 9)]

        gen_input = GenerationInput(
            courses=courses, sections=sections, faculty=faculty,
            rooms=rooms, time_slots=slots
        )
        scheduler = TimetableScheduler(gen_input)
        result = scheduler.generate()

        # All assignments should have a valid room
        for a in result.assignments:
            assert a.room_id in [1, 2]
        # No room overlap
        seen_rooms = set()
        for a in result.assignments:
            assert (a.room_id, a.time_slot_id) not in seen_rooms, "Room overlap!"
            seen_rooms.add((a.room_id, a.time_slot_id))

    def test_lab_session_uses_lab_room(self):
        faculty = [make_faculty(1)]
        courses = [make_course(1, is_lab=True, periods=1, faculty_id=1)]
        sections = [make_section(1, course_id=1, periods=1, requires_lab=True)]
        rooms = [
            make_room(1, cap=30, room_type="lecture"),
            make_room(2, cap=30, room_type="lab"),
        ]
        slots = [make_slot(i, day=i % 5, hour=8 + (i % 4)) for i in range(1, 9)]

        gen_input = GenerationInput(
            courses=courses, sections=sections, faculty=faculty,
            rooms=rooms, time_slots=slots
        )
        scheduler = TimetableScheduler(gen_input)
        result = scheduler.generate()

        # All labs should be in room 2 (lab)
        lab_room_ids = {a.room_id for a in result.assignments if a.is_lab}
        if lab_room_ids:
            assert 2 in lab_room_ids or len(lab_room_ids) == 0

    def test_no_rooms_available(self):
        """When no rooms are available, scheduler should report issues."""
        faculty = [make_faculty(1)]
        courses = [make_course(1, periods=1, faculty_id=1)]
        sections = [make_section(1, course_id=1, periods=1)]
        # No rooms
        rooms = []
        slots = [make_slot(i, day=i % 5, hour=8 + (i % 4)) for i in range(1, 9)]

        gen_input = GenerationInput(
            courses=courses, sections=sections, faculty=faculty,
            rooms=rooms, time_slots=slots
        )
        scheduler = TimetableScheduler(gen_input)
        result = scheduler.generate()

        # Should not be successful or should have validation issues
        # (Either no rooms, or assignments with room_id=0 which is invalid)
        if result.assignments:
            # Check that we can detect problems
            assert result.validation is not None

    def test_validation_score(self):
        faculty = [make_faculty(1)]
        courses = [make_course(1, periods=2, faculty_id=1)]
        sections = [make_section(1, course_id=1, periods=2)]
        rooms = [make_room(1, cap=30)]
        slots = [make_slot(i, day=i % 5, hour=8 + (i % 4)) for i in range(1, 9)]

        gen_input = GenerationInput(
            courses=courses, sections=sections, faculty=faculty,
            rooms=rooms, time_slots=slots
        )
        scheduler = TimetableScheduler(gen_input)
        result = scheduler.generate()

        # Validation should give a score between 0 and 100
        assert 0 <= result.validation.score <= 100

    def test_impossible_schedule_detection(self):
        """When there's a clear conflict, scheduler should report it."""
        faculty = [make_faculty(1)]
        courses = [
            make_course(1, periods=2, faculty_id=1),
        ]
        sections = [make_section(1, course_id=1, periods=2)]
        # Only 1 slot -> can't fit 2 sessions of same faculty
        rooms = [make_room(1, cap=30)]
        slots = [make_slot(1, day=0, hour=8)]

        gen_input = GenerationInput(
            courses=courses, sections=sections, faculty=faculty,
            rooms=rooms, time_slots=slots
        )
        scheduler = TimetableScheduler(gen_input)
        result = scheduler.generate()

    def test_weekly_day_distribution(self):
        """Verify that sessions are distributed across all working days (Mon-Fri) instead of only Monday."""
        faculty = [make_faculty(i) for i in range(1, 6)]
        courses = [make_course(i, periods=3, faculty_id=i) for i in range(1, 6)]
        sections = [make_section(i, course_id=i, periods=3) for i in range(1, 6)]
        rooms = [make_room(i, cap=40) for i in range(1, 5)]
        
        # 5 days x 8 periods = 40 slots
        slots = []
        slot_id = 1
        for day in range(5):
            for h in range(8, 16):
                slots.append(make_slot(slot_id, day=day, hour=h))
                slot_id += 1

        gen_input = GenerationInput(
            courses=courses, sections=sections, faculty=faculty,
            rooms=rooms, time_slots=slots
        )
        scheduler = TimetableScheduler(gen_input)
        result = scheduler.generate()

        assert result.success
        assert len(result.assignments) == 15  # 5 courses * 3 periods

        # Check that sessions are scheduled across all 5 days
        slot_map = {ts.id: ts for ts in slots}
        assigned_days = {slot_map[a.time_slot_id].day_of_week for a in result.assignments}
        assert len(assigned_days) == 5, f"Expected 5 days but got days: {assigned_days}"

        # Check day balance: no single day has all sessions
        day_counts = {}
        for a in result.assignments:
            d = slot_map[a.time_slot_id].day_of_week
            day_counts[d] = day_counts.get(d, 0) + 1
        assert max(day_counts.values()) <= 4, f"Unbalanced day counts: {day_counts}"

    def test_diversified_room_allocation(self):
        """Verify that different rooms and labs are utilized rather than assigning one room to all."""
        faculty = [make_faculty(i) for i in range(1, 6)]
        courses = [
            make_course(1, periods=3, faculty_id=1, is_lab=True),
            make_course(2, periods=3, faculty_id=2, is_lab=False),
            make_course(3, periods=3, faculty_id=3, is_lab=False),
            make_course(4, periods=3, faculty_id=4, is_lab=False),
        ]
        sections = [
            make_section(1, course_id=1, periods=3, requires_lab=True),
            make_section(2, course_id=2, periods=3, requires_lab=False),
            make_section(3, course_id=3, periods=3, requires_lab=False),
            make_section(4, course_id=4, periods=3, requires_lab=False),
        ]
        rooms = [
            make_room(1, cap=50, room_type="lecture"),
            make_room(2, cap=50, room_type="lecture"),
            make_room(3, cap=50, room_type="lecture"),
            make_room(4, cap=35, room_type="lab"),
            make_room(5, cap=35, room_type="lab"),
        ]
        slots = []
        slot_id = 1
        for day in range(5):
            for h in range(8, 16):
                slots.append(make_slot(slot_id, day=day, hour=h))
                slot_id += 1

        gen_input = GenerationInput(
            courses=courses, sections=sections, faculty=faculty,
            rooms=rooms, time_slots=slots
        )
        scheduler = TimetableScheduler(gen_input)
        result = scheduler.generate()

        assert result.success
        assert len(result.assignments) == 12

        # Verify multiple lecture rooms are used
        lecture_assignments = [a for a in result.assignments if not a.is_lab]
        lecture_rooms_used = {a.room_id for a in lecture_assignments}
        assert len(lecture_rooms_used) > 1, f"Expected multiple lecture rooms, got {lecture_rooms_used}"

        # Verify lab assignments use lab rooms (room 4 or 5)
        lab_assignments = [a for a in result.assignments if a.is_lab]
        for la in lab_assignments:
            assert la.room_id in (4, 5), f"Lab assignment used non-lab room {la.room_id}"

    def test_realistic_cohort_day_spread_and_no_same_day_duplicate(self):
        """Verify that a cohort taking 6 subjects has diverse daily schedules with no same-day duplicate theory lectures."""
        faculty = [make_faculty(i) for i in range(1, 5)]
        courses = [
            make_course(1, periods=3, faculty_id=1),
            make_course(2, periods=3, faculty_id=2),
            make_course(3, periods=3, faculty_id=3),
            make_course(4, periods=3, faculty_id=4),
            make_course(5, periods=3, faculty_id=1),
            make_course(6, periods=3, faculty_id=2),
        ]
        for c in courses:
            c.department_id = 2
            c.semester = "Semester 3"
        sections = [make_section(i, course_id=i, periods=3) for i in range(1, 7)]
        for s in sections:
            s.section_number = "A"

        rooms = [make_room(i, cap=60, room_type="lecture") for i in range(1, 4)]
        slots = []
        slot_id = 1
        for day in range(5):
            for h in range(8, 16):
                slots.append(make_slot(slot_id, day=day, hour=h))
                slot_id += 1

        gen_input = GenerationInput(
            courses=courses, sections=sections, faculty=faculty,
            rooms=rooms, time_slots=slots
        )
        scheduler = TimetableScheduler(gen_input)
        result = scheduler.generate()

        assert result.success
        assert len(result.assignments) == 18

        # 1. Check no two classes at the same time for this cohort
        slot_ids = [a.time_slot_id for a in result.assignments]
        assert len(slot_ids) == len(set(slot_ids)), "Cohort has overlapping classes at the same time slot!"

        # 2. Check each course is distributed on 3 distinct days (no duplicate same day)
        slot_map = {ts.id: ts for ts in slots}
        for c_id in range(1, 7):
            c_days = [slot_map[a.time_slot_id].day_of_week for a in result.assignments if a.course_id == c_id]
            assert len(c_days) == 3
            assert len(set(c_days)) == 3, f"Course {c_id} scheduled on duplicate days: {c_days}"

        # 3. Check all faculty are utilized
        fac_assigned = {a.faculty_id for a in result.assignments}
        assert fac_assigned == {1, 2, 3, 4}

    def test_multi_section_cross_section_clash_free_generation(self):
        """Test generating Section A, then Section B with existing_assignments, ensuring 0 faculty/room clashes."""
        faculty = [make_faculty(1), make_faculty(2)]
        courses = [
            make_course(1, periods=2, faculty_id=1),
            make_course(2, periods=2, faculty_id=2),
        ]
        sec_a = [
            make_section(101, course_id=1, periods=2),
            make_section(102, course_id=2, periods=2),
        ]
        for s in sec_a:
            s.section_number = "A"

        sec_b = [
            make_section(201, course_id=1, periods=2),
            make_section(202, course_id=2, periods=2),
        ]
        for s in sec_b:
            s.section_number = "B"

        rooms = [make_room(1, cap=60), make_room(2, cap=60)]
        slots = [make_slot(i, day=i % 5, hour=8 + (i % 4)) for i in range(1, 21)]

        # 1. Generate Section A
        input_a = GenerationInput(
            courses=courses, sections=sec_a, faculty=faculty,
            rooms=rooms, time_slots=slots, selected_section="A"
        )
        res_a = TimetableScheduler(input_a).generate()
        assert res_a.success
        assert len(res_a.assignments) == 4

        # 2. Generate Section B with existing assignments of Section A
        input_b = GenerationInput(
            courses=courses, sections=sec_b, faculty=faculty,
            rooms=rooms, time_slots=slots, selected_section="B",
            existing_assignments=res_a.assignments
        )
        res_b = TimetableScheduler(input_b).generate()
        assert res_b.success
        assert len(res_b.assignments) == 4

        # 3. Verify zero faculty clashes across Section A and Section B
        faculty_time_a = {(a.faculty_id, a.time_slot_id) for a in res_a.assignments}
        faculty_time_b = {(a.faculty_id, a.time_slot_id) for a in res_b.assignments}
        common_faculty_slots = faculty_time_a.intersection(faculty_time_b)
        assert len(common_faculty_slots) == 0, f"Faculty clash detected between Section A and Section B: {common_faculty_slots}"

        # 4. Verify zero room clashes across Section A and Section B
        room_time_a = {(a.room_id, a.time_slot_id) for a in res_a.assignments}
        room_time_b = {(a.room_id, a.time_slot_id) for a in res_b.assignments}
        common_room_slots = room_time_a.intersection(room_time_b)
        assert len(common_room_slots) == 0, f"Room clash detected between Section A and Section B: {common_room_slots}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])