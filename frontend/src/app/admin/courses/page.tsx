"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getFaculty,
} from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Badge, StatusBadge } from "@/components/Badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/States";
import { useToast } from "@/components/Toast";
import { Course } from "@/lib/types";
import { BookOpen, Plus, Pencil, Trash2, Search } from "lucide-react";

interface FormState {
  code: string;
  name: string;
  description: string;
  credits: number;
  faculty_id: string;
  is_lab: boolean;
  default_periods_per_week: number;
  min_periods: number;
}

const emptyForm: FormState = {
  code: "",
  name: "",
  description: "",
  credits: 3,
  faculty_id: "",
  is_lab: false,
  default_periods_per_week: 3,
  min_periods: 1,
};

export default function CoursesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Course | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: courses, isLoading, error, refetch } = useQuery({
    queryKey: ["courses"],
    queryFn: () => getCourses({ limit: 200 }).then((r) => r.data),
  });

  const { data: faculty } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => getFaculty({ limit: 200 }).then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createCourse(payload),
    onSuccess: () => {
      toast.success("Course created");
      qc.invalidateQueries({ queryKey: ["courses"] });
      closeForm();
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => {
      toast.error("Failed to create", e.response?.data?.detail);
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      updateCourse(id, data),
    onSuccess: () => {
      toast.success("Course updated");
      qc.invalidateQueries({ queryKey: ["courses"] });
      closeForm();
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => {
      toast.error("Failed to update", e.response?.data?.detail);
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteCourse(id),
    onSuccess: () => {
      toast.success("Course deleted");
      qc.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => {
      toast.error("Failed to delete", e.response?.data?.detail);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({
      code: c.code,
      name: c.name,
      description: c.description ?? "",
      credits: c.credits,
      faculty_id: c.faculty_id ? String(c.faculty_id) : "",
      is_lab: c.is_lab,
      default_periods_per_week: c.default_periods_per_week,
      min_periods: c.min_periods,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      code: form.code,
      name: form.name,
      description: form.description || null,
      credits: Number(form.credits),
      is_lab: form.is_lab,
      default_periods_per_week: Number(form.default_periods_per_week),
      min_periods: Number(form.min_periods),
    };
    if (form.faculty_id) payload.faculty_id = Number(form.faculty_id);
    if (editing) {
      update.mutate({ id: editing.id, data: payload });
    } else {
      create.mutate(payload);
    }
  };

  const filtered = (courses ?? []).filter((c: Course) =>
    [c.code, c.name, c.description ?? ""].some((v) =>
      v.toLowerCase().includes(search.toLowerCase())
    )
  );

  if (error) {
    return (
      <AppShell>
        <PageHeader title="Courses" icon={<BookOpen className="h-5 w-5" />} />
        <ErrorState message="Failed to load courses" onRetry={refetch} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Courses"
        description="Manage courses and their teaching assignments"
        icon={<BookOpen className="h-5 w-5" />}
        actions={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" />
            <span>Add Course</span>
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-2 bg-white rounded-lg border border-ink-100 px-3 py-2 max-w-md">
        <Search className="h-4 w-4 text-ink-400" />
        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-ink-400"
        />
      </div>

      {isLoading ? (
        <LoadingState message="Loading courses..." />
      ) : (
        <DataTable<Course>
          columns={[
            { key: "code", header: "Code", render: (r: Course) => <span className="font-semibold text-ink-900">{String(r.code)}</span> },
            { key: "name", header: "Name" },
            {
              key: "credits",
              header: "Credits",
              render: (r: Course) => <span className="text-ink-600">{r.credits}</span>,
            },
            {
              key: "is_lab",
              header: "Type",
              render: (r: Course) => (
                <Badge variant={r.is_lab ? "info" : "neutral"}>
                  {r.is_lab ? "Lab" : "Lecture"}
                </Badge>
              ),
            },
            {
              key: "faculty",
              header: "Faculty",
              render: (r: Course) =>
                r.faculty ? r.faculty.name : <span className="text-ink-400">—</span>,
            },
            {
              key: "default_periods_per_week",
              header: "Periods/wk",
              render: (r: Course) => r.default_periods_per_week,
            },
            {
              key: "actions",
              header: "",
              render: (r) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(r);
                    }}
                    className="p-1.5 rounded-md text-ink-500 hover:text-brand-600 hover:bg-brand-50 transition"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete ${r.code}?`)) remove.mutate(r.id);
                    }}
                    className="p-1.5 rounded-md text-ink-500 hover:text-red-600 hover:bg-red-50 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ),
              className: "text-right w-24",
            },
          ]}
          data={filtered}
          emptyMessage="No courses yet. Click 'Add Course' to create one."
        />
      )}

      <Modal
        open={showForm}
        onClose={closeForm}
        title={editing ? "Edit Course" : "Add Course"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Code *</label>
              <input
                className="input-field"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
                maxLength={20}
              />
            </div>
            <div>
              <label className="label">Credits</label>
              <input
                type="number"
                min={0}
                className="input-field"
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: +e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Name *</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input-field"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Faculty</label>
              <select
                className="select-field"
                value={form.faculty_id}
                onChange={(e) => setForm({ ...form, faculty_id: e.target.value })}
              >
                <option value="">— None —</option>
                {(faculty ?? []).map((f: { id: number; name: string }) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select
                className="select-field"
                value={form.is_lab ? "true" : "false"}
                onChange={(e) => setForm({ ...form, is_lab: e.target.value === "true" })}
              >
                <option value="false">Lecture</option>
                <option value="true">Lab</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Periods / week</label>
              <input
                type="number"
                min={1}
                max={10}
                className="input-field"
                value={form.default_periods_per_week}
                onChange={(e) =>
                  setForm({ ...form, default_periods_per_week: +e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Min periods</label>
              <input
                type="number"
                min={0}
                max={10}
                className="input-field"
                value={form.min_periods}
                onChange={(e) => setForm({ ...form, min_periods: +e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-ink-100">
            <button type="button" onClick={closeForm} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending || update.isPending}
              className="btn-primary"
            >
              {editing ? "Save Changes" : "Create Course"}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
