"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, SuccessState, ErrorState } from "@/components/States";
import { InstitutionalTimetableSheet } from "@/components/InstitutionalTimetableSheet";
import { useToast } from "@/components/Toast";
import {
  generateTimetable,
  getDepartments,
  getSemesters,
  getCourses,
  getFaculty,
  getRooms,
  getTimeSlots,
  getSections,
  getTimetableEntries,
  getTimetable,
} from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  X,
  BookOpen,
  Users,
  Building2,
  Clock,
  CalendarRange,
  Filter,
  Play,
  ArrowLeft,
  Layers,
  Save,
  Eye,
  Download,
  Printer,
} from "lucide-react";
import { dayShort, dayName } from "@/lib/utils";
import { Course, Faculty, Room, Section, TimeSlot } from "@/lib/types";

// --- Types ---
interface CourseItem {
  id: number;
  code: string;
  name: string;
  is_lab: boolean;
  faculty?: { name: string; department?: string };
}

interface SectionItem {
  id: number;
  section_number: string;
}

interface FacultyItem {
  id: number;
  name: string;
  department?: string;
  is_full_time: boolean;
}

interface RoomItem {
  id: number;
  room_number: string;
  building?: string;
  capacity: number;
  room_type: string;
}

interface TimeSlotItem {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
}

interface GenResult {
  timetable_id: number;
  success: boolean;
  message: string;
  assignments_count: number;
  validation: { score: number; hard_violations: number; soft_violations: number; valid: boolean };
  filter_summary?: {
    courses_count?: number;
    sections_count?: number;
    faculty_count?: number;
    rooms_count?: number;
    time_slots_count?: number;
    department?: string;
    semester?: string;
  };
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// --- Multi-Select Component ---
function MultiSelect<T extends { id: number; name: string }>({
  label,
  items,
  selected,
  onChange,
  placeholder,
  renderItem,
}: {
  label: string;
  items: T[];
  selected: number[];
  onChange: (ids: number[]) => void;
  placeholder: string;
  renderItem?: (item: T) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (id: number) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };
  const selectedNames = items.filter((i) => selected.includes(i.id)).map((i) => i.name);

  return (
    <div className="relative">
      <label className="label">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input-field text-left flex items-center justify-between"
      >
        <span className={selected.length ? "text-ink-900" : "text-ink-400"}>
          {selected.length ? selectedNames.join(", ") : placeholder}
        </span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-ink-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-brand-50 cursor-pointer transition text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={() => toggle(item.id)}
                className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              {renderItem ? renderItem(item) : <span className="text-ink-900">{item.name}</span>}
            </label>
          ))}
          {items.length === 0 && (
            <p className="px-4 py-3 text-sm text-ink-500">No items available</p>
          )}
        </div>
      )}
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="mt-1 text-xs text-red-500 hover:text-red-700"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

// --- Main Generate Page ---
export default function GeneratePage() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();

  // Form state
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState<number[]>([]);
  const [numSections, setNumSections] = useState<number>(0);
  const [numRooms, setNumRooms] = useState<number>(0);
  const [optimize, setOptimize] = useState(true);
  const [maxIterations, setMaxIterations] = useState(1000);

  // Phase: form | validating | generating | success | error
  type Phase = "form" | "validating" | "generating" | "success" | "error";
  const [phase, setPhase] = useState<Phase>("form");
  const [result, setResult] = useState<GenResult | null>(null);
  const [generatedId, setGeneratedId] = useState<number | null>(null);

  // Fetch lookup data
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => getDepartments().then((r) => r.data),
  });
  const { data: semesters } = useQuery({
    queryKey: ["semesters"],
    queryFn: () => getSemesters().then((r) => r.data),
  });
  const { data: coursesData } = useQuery({
    queryKey: ["courses"],
    queryFn: () => getCourses({ limit: 200 }).then((r) => r.data),
  });
  const { data: facultyData } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => getFaculty({ limit: 200 }).then((r) => r.data),
  });
  const { data: roomsData } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getRooms({ limit: 200 }).then((r) => r.data),
  });
  const { data: timeSlotsData } = useQuery({
    queryKey: ["time-slots"],
    queryFn: () => getTimeSlots({ limit: 300 }).then((r) => r.data),
  });
  const { data: sectionsData } = useQuery({
    queryKey: ["sections"],
    queryFn: () => getSections({ limit: 200 }).then((r) => r.data),
  });

  const courses: CourseItem[] = Array.isArray(coursesData) ? coursesData : [];
  const faculties: FacultyItem[] = Array.isArray(facultyData) ? facultyData : [];
  const rooms: RoomItem[] = Array.isArray(roomsData) ? roomsData : [];
  const timeSlots: TimeSlotItem[] = Array.isArray(timeSlotsData) ? timeSlotsData : [];
  const sections: SectionItem[] = Array.isArray(sectionsData) ? sectionsData : [];

  // Filtered courses by department + semester
  const filteredCourses = courses.filter((c) => {
    if (department && c.faculty?.department && !c.faculty.department.toLowerCase().includes(department.toLowerCase())) return false;
    return true;
  });

  const filteredFaculty = faculties.filter((f) => {
    if (department && f.department && !f.department.toLowerCase().includes(department.toLowerCase())) return false;
    return true;
  });

  // Generate mutation
  const gen = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        name: "Generated Timetable",
        optimize,
        max_iterations: maxIterations,
      };
      if (department) payload.department = department;
      if (semester) payload.semester = semester;
      if (selectedCourses.length) payload.courses = selectedCourses;
      if (timeStart) payload.time_start = timeStart;
      if (timeEnd) payload.time_end = timeEnd;
      if (selectedFaculty.length) payload.faculty = selectedFaculty;
      if (numSections > 0) payload.num_sections = numSections;
      if (numRooms > 0) payload.num_rooms = numRooms;
      return generateTimetable(payload);
    },
    onSuccess: (res) => {
      const data = res.data as GenResult;
      setResult(data);
      setGeneratedId(data.timetable_id);
      setPhase("success");
      if (data.success) {
        toast.success("Timetable generated successfully!");
      } else {
        toast.warning("Timetable generated with violations");
      }
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => {
      setPhase("error");
      toast.error("Generation failed");
    },
  });

  const handleGenerate = () => {
    setPhase("generating");
    setResult(null);
    gen.mutate();
  };

  // Validate before generation without running solver
  const handleValidate = () => {
    setPhase("validating");
  };

  // Fetch entries after successful generation
  const { data: entriesData } = useQuery({
    queryKey: ["timetable-entries", generatedId],
    queryFn: () => getTimetableEntries(generatedId!).then((r) => r.data),
    enabled: !!generatedId && phase === "success",
  });

  // Preview timetable data (from form data, no assignments yet)
  const previewTimetableData = useMemo(() => {
    const selectedCourseObjs = selectedCourses
      .map((id) => courses.find((c) => c.id === id))
      .filter(Boolean) as CourseItem[];

    const selectedFacultyObjs = selectedFaculty
      .map((id) => faculties.find((f) => f.id === id))
      .filter(Boolean) as FacultyItem[];

    const selectedSectionObjs = sections;

    const metadata = {
      universityName: undefined,
      departmentName: department ? department.toUpperCase() : undefined,
      semester: semester ? `SEMESTER ${semester}` : undefined,
      academicYear: undefined,
      classCoordinator: undefined,
      coordinatorPhone: undefined,
    };

    const dayNumbers = Array.from(
      new Set(timeSlots.filter((ts) => !ts.is_break).map((ts) => ts.day_of_week))
    ).sort();

    return {
      metadata,
      courses: selectedCourseObjs.length > 0 ? selectedCourseObjs : courses,
      faculty: selectedFacultyObjs.length > 0 ? selectedFacultyObjs : faculties,
      rooms: numRooms > 0 ? rooms.slice(0, numRooms) : rooms,
      sections: selectedSectionObjs,
      timeSlots: timeSlots,
      days: dayNumbers.length > 0 ? dayNumbers : [0, 1, 2, 3, 4],
      entries: [], // Empty before generation
    };
  }, [
    department, semester, selectedCourses, selectedFaculty,
    numSections, numRooms, courses, faculties, rooms, sections, timeSlots,
  ]);

  // After generation, build the full timetable data
  const generatedTimetableData = useMemo(() => {
    if (!generatedId || phase !== "success" || !result) return null;
    return null; // Will be fetched separately
  }, [generatedId, phase, result]);

  const handleReset = () => {
    setPhase("form");
    setResult(null);
    setGeneratedId(null);
    setSelectedCourses([]);
    setSelectedFaculty([]);
    setDepartment("");
    setSemester("");
    setTimeStart("");
    setTimeEnd("");
    setNumSections(0);
    setNumRooms(0);
  };

  const handleViewTimetable = () => {
    if (generatedId) router.push(`/admin/timetables/${generatedId}`);
  };

  const scoreColor = (s: number) => {
    if (s >= 80) return "text-emerald-600";
    if (s >= 60) return "text-amber-600";
    return "text-red-600";
  };

  // Validation checks
  const validationChecks = useMemo(() => {
    const checks: Array<{ label: string; ok: boolean; detail: string }> = [
      { label: "Courses", ok: selectedCourses.length > 0 || courses.length > 0, detail: `${selectedCourses.length > 0 ? selectedCourses.length : courses.length} course(s) available` },
      { label: "Faculty", ok: selectedFaculty.length > 0 || faculties.length > 0, detail: `${selectedFaculty.length > 0 ? selectedFaculty.length : faculties.length} faculty member(s)` },
      { label: "Rooms", ok: rooms.length > 0, detail: `${rooms.length} room(s) configured` },
      { label: "Sections", ok: sections.length > 0 || numSections > 0, detail: `${sections.length} section(s) defined` },
      { label: "Time Slots", ok: timeSlots.length > 0, detail: `${timeSlots.length} time slot(s) configured` },
    ];
    return checks;
  }, [selectedCourses, selectedFaculty, rooms, sections, timeSlots, numSections, courses, faculties]);

  const allValid = validationChecks.every((c) => c.ok);

  return (
    <AppShell>
      <PageHeader
        title="Generate Timetable"
        description="Configure all options and generate your schedule"
        icon={<Wand2 className="h-5 w-5" />}
      />

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Selection Form */}
        {phase === "form" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6 space-y-6">
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <Filter className="h-5 w-5 text-brand-600" />
              Generation Options
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">1. Department</label>
                <select
                  className="select-field"
                  value={department}
                  onChange={(e) => { setDepartment(e.target.value); setSelectedCourses([]); setSelectedFaculty([]); }}
                >
                  <option value="">— All Departments —</option>
                  {(departments ?? []).map((d: string) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">2. Semester</label>
                <select
                  className="select-field"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                >
                  <option value="">— All Semesters —</option>
                  {(semesters ?? []).map((s: string) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <MultiSelect<{ id: number; name: string }>
                  label="3. Subjects (Courses)"
                  items={filteredCourses.map((c) => ({ id: c.id, name: `${c.code} — ${c.name}` }))}
                  selected={selectedCourses}
                  onChange={setSelectedCourses}
                  placeholder="Select subjects..."
                />
              </div>

              <div>
                <label className="label">4. Subject Period Time</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    className="input-field"
                    value={timeStart}
                    onChange={(e) => setTimeStart(e.target.value)}
                    placeholder="Start"
                  />
                  <input
                    type="time"
                    className="input-field"
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                    placeholder="End"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <MultiSelect<{ id: number; name: string }>
                  label="5. Faculty"
                  items={filteredFaculty.map((f) => ({ id: f.id, name: `${f.name} (${f.department || "—"})` }))}
                  selected={selectedFaculty}
                  onChange={setSelectedFaculty}
                  placeholder="Select faculty members..."
                />
              </div>

              <div>
                <label className="label">6. Number of Sections</label>
                <input
                  type="number"
                  min={0}
                  className="input-field"
                  value={numSections || ""}
                  onChange={(e) => setNumSections(Number(e.target.value) || 0)}
                  placeholder="e.g. 4"
                />
              </div>

              <div>
                <label className="label">7. Number of Required Rooms</label>
                <input
                  type="number"
                  min={0}
                  className="input-field"
                  value={numRooms || ""}
                  onChange={(e) => setNumRooms(Number(e.target.value) || 0)}
                  placeholder="e.g. 3"
                />
              </div>
            </div>

            <div className="border-t border-ink-100 pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-ink-900">Algorithm Settings</h3>
              <div className="flex items-center justify-between p-3 rounded-xl bg-ink-50 border border-ink-100">
                <div>
                  <p className="text-sm font-medium text-ink-900">Optimization</p>
                  <p className="text-xs text-ink-500">Enable constraint-aware scheduling</p>
                </div>
                <button
                  onClick={() => setOptimize(!optimize)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${optimize ? "bg-brand-600" : "bg-ink-300"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${optimize ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <div>
                <label className="label">Max Iterations: {maxIterations}</label>
                <input
                  type="range"
                  min={100}
                  max={5000}
                  step={100}
                  value={maxIterations}
                  onChange={(e) => setMaxIterations(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleValidate}
                disabled={gen.isPending}
                className="btn-secondary flex-1 text-base py-3"
              >
                <Eye className="h-5 w-5" />
                Preview &amp; Validate Configuration
              </button>
              <button
                onClick={handleGenerate}
                disabled={gen.isPending}
                className="btn-primary flex-1 text-base py-3"
              >
                {gen.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    Generate Timetable
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Validating / Preview State */}
        {phase === "validating" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card border-brand-200 bg-brand-50 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-brand-600" />
                <h3 className="font-semibold text-brand-700">Configuration Validation Results</h3>
              </div>
              <button onClick={() => setPhase("form")} className="btn-secondary text-xs">
                Back to Form
              </button>
            </div>
            <div className="space-y-2 text-sm text-brand-700">
              {validationChecks.map((check, i) => (
                <p key={i}>
                  {check.ok ? "✓" : "✗"} {check.label}: {check.detail}
                </p>
              ))}
            </div>
            {allValid && (
              <p className="mt-2 text-emerald-700 font-semibold text-sm">✓ All required data is configured. Review preview template below and click Generate Timetable.</p>
            )}
          </motion.div>
        )}

        {/* Pre-Generation Institutional Timetable Preview (Visible in form & validating states) */}
        {(phase === "form" || phase === "validating") && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-ink-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-brand-600" />
                  Institutional Timetable Template Preview
                </h3>
                <p className="text-xs text-ink-500">
                  Pre-generation template layout showing configured time slots, breaks, and legends for selected subjects/faculty.
                </p>
              </div>
              <span className="badge badge-info">Pre-Generation Preview</span>
            </div>

            <InstitutionalTimetableSheet
              entries={[]}
              timeSlots={previewTimetableData.timeSlots}
              courses={previewTimetableData.courses}
              faculty={previewTimetableData.faculty}
              rooms={previewTimetableData.rooms}
              sections={previewTimetableData.sections}
              title={department ? `DEPARTMENT OF ${department.toUpperCase()}` : "INSTITUTIONAL TIMETABLE TEMPLATE"}
              subtitle={`SEMESTER: ${semester || "ALL"} • PRE-GENERATION PREVIEW`}
              showExportButtons={false}
            />
          </motion.div>
        )}

        {/* Generating State */}
        <AnimatePresence>
          {phase === "generating" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card border-brand-200 bg-brand-50 p-6">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="h-5 w-5 text-brand-600 animate-spin" />
                <h3 className="font-semibold text-brand-700">Scheduling in progress...</h3>
              </div>
              <div className="space-y-2 text-sm text-brand-700">
                <p>✓ Building conflict graph</p>
                <p>✓ Running DSATUR coloring algorithm</p>
                <p>✓ Applying constraint rules</p>
                <p>↻ Validating solution quality</p>
              </div>
            </motion.div>
          )}

          {/* Success State */}
          {phase === "success" && result && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className={`card border-2 ${result.validation.valid ? "border-emerald-200" : "border-amber-200"}`}>
                <div className="flex items-start gap-4">
                  {result.validation.valid ? (
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0 mt-1" />
                  ) : (
                    <AlertTriangle className="h-8 w-8 text-amber-600 shrink-0 mt-1" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-ink-900 mb-1">
                      {result.validation.valid ? "Timetable Generated Successfully" : "Generated with Violations"}
                    </h3>
                    <p className="text-sm text-ink-600">{result.message}</p>
                    <div className="mt-3 flex items-center gap-4 flex-wrap">
                      <div>
                        <p className="text-xs text-ink-500">Assignments</p>
                        <p className="text-xl font-bold text-ink-900">{result.assignments_count}</p>
                      </div>
                      <div className="h-10 border-l border-ink-200" />
                      <div>
                        <p className="text-xs text-ink-500">Quality Score</p>
                        <p className={`text-xl font-bold ${scoreColor(result.validation.score)}`}>
                          {result.validation.score.toFixed(1)}%
                        </p>
                      </div>
                      <div className="h-10 border-l border-ink-200" />
                      <div>
                        <p className="text-xs text-ink-500">Hard Violations</p>
                        <p className="text-xl font-bold text-red-600">{result.validation.hard_violations}</p>
                      </div>
                      <div className="h-10 border-l border-ink-200" />
                      <div>
                        <p className="text-xs text-ink-500">Soft Violations</p>
                        <p className="text-xl font-bold text-amber-600">{result.validation.soft_violations}</p>
                      </div>
                    </div>
                    {result.filter_summary && (
                      <div className="mt-3 p-3 rounded-lg bg-ink-50 border border-ink-100 text-xs text-ink-600">
                        <strong>Filters applied:</strong> Courses: {result.filter_summary.courses_count} | Sections: {result.filter_summary.sections_count} | Faculty: {result.filter_summary.faculty_count} | Rooms: {result.filter_summary.rooms_count} | Time Slots: {result.filter_summary.time_slots_count}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Generated Institutional Timetable */}
              <div className="card p-4 overflow-hidden">
                <InstitutionalTimetableSheet
                  entries={entriesData ?? []}
                  timeSlots={timeSlots}
                  courses={courses}
                  faculty={faculties}
                  rooms={rooms}
                  sections={sections}
                  title="Official Institutional Timetable Schedule"
                  subtitle={department ? `Department: ${department} • Generated Schedule` : "Generated Schedule"}
                  showExportButtons={true}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 flex-wrap">
                <button onClick={handleReset} className="btn-secondary">
                  Generate Again
                </button>
                <button onClick={handleViewTimetable} className="btn-primary">
                  <ArrowRight className="h-4 w-4" /> View Full Timetable
                </button>
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {phase === "error" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              <ErrorState title="Generation Failed" message="An error occurred while generating the timetable." onRetry={() => setPhase("form")} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* PRE-GENERATION PREVIEW */}
        {phase === "form" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink-900 flex items-center gap-2">
                <Eye className="h-5 w-5 text-brand-600" />
                Institutional Timetable Preview
              </h3>
              <span className="text-xs text-ink-500">
                Preview updates as you configure options
              </span>
            </div>

            {/* Validation Summary */}
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <div className="font-semibold text-ink-700 mb-1">Configuration Validation</div>
              <div className="flex flex-wrap gap-2">
                {validationChecks.map((check, i) => (
                  <span
                    key={i}
                    className={`px-2 py-0.5 rounded-full ${check.ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                  >
                    {check.ok ? "✓" : "✗"} {check.label}
                  </span>
                ))}
              </div>
              {!allValid && (
                <p className="mt-1 text-amber-600">Please configure all required fields before generating.</p>
              )}
            </div>

            {/* Preview Table */}
            <div className="overflow-x-auto">
              <InstitutionalTimetableSheet
                entries={[]}
                timeSlots={previewTimetableData.timeSlots}
                courses={previewTimetableData.courses}
                faculty={previewTimetableData.faculty}
                rooms={previewTimetableData.rooms}
                sections={previewTimetableData.sections}
                title="Preview — Institutional Timetable"
                subtitle={department ? `Department: ${department} • Preview` : "Preview — Configure and Generate"}
                showExportButtons={false}
              />
            </div>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}
