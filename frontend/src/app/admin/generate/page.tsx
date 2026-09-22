"use client";
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, SuccessState, ErrorState } from "@/components/States";
import { useToast } from "@/components/Toast";
import {
  generateTimetable,
  getDepartments,
  getSemesters,
  getCourses,
  getFaculty,
  getRooms,
  getTimeSlots,
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
} from "lucide-react";
import { dayShort, dayName } from "@/lib/utils";

// --- Types ---
interface Course {
  id: number;
  code: string;
  name: string;
  is_lab: boolean;
  faculty?: { name: string; department?: string };
}

interface Section {
  id: number;
  section_number: string;
}

interface Faculty {
  id: number;
  name: string;
  department?: string;
  is_full_time: boolean;
}

interface Room {
  id: number;
  room_number: string;
  building?: string;
  capacity: number;
  room_type: string;
}

interface TimeSlot {
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

  // Phase
  type Phase = "form" | "generating" | "success" | "error" | "preview";
  const [phase, setPhase] = useState<Phase>("form");
  const [result, setResult] = useState<GenResult | null>(null);
  const [generatedId, setGeneratedId] = useState<number | null>(null);

  // Fetch lookup data
  const { data: departments, isLoading: loadingDepts } = useQuery({
    queryKey: ["departments"],
    queryFn: () => getDepartments().then((r) => r.data),
  });
  const { data: semesters } = useQuery({
    queryKey: ["semesters"],
    queryFn: () => getSemesters().then((r) => r.data),
  });
  const { data: coursesData, isLoading: loadingCourses } = useQuery({
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

  const courses: Course[] = Array.isArray(coursesData) ? coursesData : [];
  const faculties: Faculty[] = Array.isArray(facultyData) ? facultyData : [];
  const rooms: Room[] = Array.isArray(roomsData) ? roomsData : [];
  const timeSlots: TimeSlot[] = Array.isArray(timeSlotsData) ? timeSlotsData : [];

  // Filtered courses by department + semester
  const filteredCourses = courses.filter((c) => {
    if (department && c.faculty?.department && !c.faculty.department.toLowerCase().includes(department.toLowerCase())) return false;
    return true;
  });

  // Filtered faculty by department
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

  // Preview timetable data
  const { data: entriesData, isLoading: loadingEntries } = useQuery({
    queryKey: ["timetable-entries", generatedId],
    queryFn: () => getTimetableEntries(generatedId!).then((r) => r.data),
    enabled: !!generatedId && phase === "success",
  });

  const { data: timetableData } = useQuery({
    queryKey: ["timetable", generatedId],
    queryFn: () => getTimetable(generatedId!).then((r) => r.data),
    enabled: !!generatedId && phase === "success",
  });

  // Build subject-grid for 6-day preview
  const entries: Array<{
    id: number; course_id: number; section_id: number; room_id: number;
    time_slot_id: number; faculty_id: number; entry_type: string;
    course?: Course; section?: Section; room?: Room; faculty?: Faculty; time_slot?: TimeSlot;
  }> = entriesData ?? [];

  // Get unique subjects (courses) from entries
  const subjectMap = new Map<number, Course>();
  entries.forEach((e) => {
    if (e.course && !subjectMap.has(e.course.id)) {
      subjectMap.set(e.course.id, e.course);
    }
  });
  const subjects = Array.from(subjectMap.values());

  // Build grid: subjects × days → time range
  const gridData: Record<string, Record<string, string>> = {};
  entries.forEach((e) => {
    const ts = e.time_slot;
    if (!ts) return;
    const dayKey = DAYS[ts.day_of_week];
    const subjKey = String(e.course_id);
    if (!gridData[subjKey]) gridData[subjKey] = {};
    const existing = gridData[subjKey][dayKey] || "";
    const timeStr = `${String(ts.start_time).slice(0, 5)}-${String(ts.end_time).slice(0, 5)}`;
    gridData[subjKey][dayKey] = existing ? `${existing}, ${timeStr}` : timeStr;
  });

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
              {/* 1. Department */}
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

              {/* 2. Semester */}
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

              {/* 3. Subjects (Courses) */}
              <div className="md:col-span-2">
                <MultiSelect<{ id: number; name: string }>
                  label="3. Subjects (Courses)"
                  items={filteredCourses.map((c) => ({ id: c.id, name: `${c.code} — ${c.name}` }))}
                  selected={selectedCourses}
                  onChange={setSelectedCourses}
                  placeholder="Select subjects..."
                />
              </div>

              {/* 4. Period Time */}
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

              {/* 5. Faculty */}
              <div className="md:col-span-2">
                <MultiSelect<{ id: number; name: string }>
                  label="5. Faculty"
                  items={filteredFaculty.map((f) => ({ id: f.id, name: `${f.name} (${f.department || "—"})` }))}
                  selected={selectedFaculty}
                  onChange={setSelectedFaculty}
                  placeholder="Select faculty members..."
                />
              </div>

              {/* 6. Number of Sections */}
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

              {/* 7. Number of Rooms */}
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

            {/* Algorithm Settings */}
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

            <button
              onClick={handleGenerate}
              disabled={gen.isPending}
              className="btn-primary w-full text-base py-3"
            >
              {gen.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Timetable...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Generate Timetable
                </>
              )}
            </button>
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
              {/* Result Card */}
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
                        {result.filter_summary.department && <><br/>Department: {String(result.filter_summary.department)}</>}
                        {result.filter_summary.semester && <><br/>Semester: {String(result.filter_summary.semester)}</>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 6-Day Timetable Preview */}
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
                  <h3 className="font-semibold text-ink-900">6-Day Schedule Preview — Subjects × Days</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPhase("preview")} className="btn-secondary text-sm">
                      <Layers className="h-4 w-4" /> View Grid
                    </button>
                    <button onClick={handleViewTimetable} className="btn-primary text-sm">
                      <ArrowRight className="h-4 w-4" /> Full View
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto p-4">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 text-left text-ink-500 font-medium border-b border-ink-100 sticky left-0 bg-white min-w-[140px]">Subject</th>
                        {DAYS_SHORT.map((d) => (
                          <th key={d} className="p-2 text-ink-700 font-semibold border-b border-ink-100 min-w-[110px] text-center">
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-ink-500">No subjects scheduled yet.</td>
                        </tr>
                      ) : (
                        subjects.map((subj) => (
                          <tr key={subj.id} className="border-b border-ink-50">
                            <td className="p-2 font-semibold text-ink-900 sticky left-0 bg-white border-r border-ink-100">
                              <div className="flex items-center gap-2">
                                <span className={`inline-block h-2 w-2 rounded-full ${subj.is_lab ? "bg-purple-500" : "bg-brand-500"}`} />
                                {subj.code}
                              </div>
                              <p className="text-[10px] font-normal text-ink-500">{subj.name}</p>
                            </td>
                            {DAYS.map((day) => {
                              const val = gridData[String(subj.id)]?.[day] || "";
                              return (
                                <td key={day} className="p-1.5 text-center">
                                  {val ? (
                                    <div className="rounded-md px-2 py-1 text-[10px] bg-brand-50 border border-brand-100 text-brand-800">
                                      {val}
                                    </div>
                                  ) : (
                                    <div className="h-8 rounded-md border border-dashed border-ink-100" />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
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

          {phase === "error" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              <ErrorState title="Generation Failed" message="An error occurred while generating the timetable." onRetry={() => setPhase("form")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
