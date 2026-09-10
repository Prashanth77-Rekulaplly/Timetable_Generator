"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSections, createSection, updateSection, deleteSection,
  getCourses,
} from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Badge } from "@/components/Badge";
import { LoadingState, ErrorState } from "@/components/States";
import { useToast } from "@/components/Toast";
import { Section } from "@/lib/types";
import { Layers, Plus, Pencil, Trash2, Search } from "lucide-react";

interface FormState {
  course_id: string;
  section_number: string;
  capacity: number;
  current_enrollment: number;
  periods_per_week: number;
  requires_lab: boolean;
}

const emptyForm: FormState = {
  course_id: "",
  section_number: "",
  capacity: 30,
  current_enrollment: 0,
  periods_per_week: 3,
  requires_lab: false,
};

export default function SectionsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Section | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: sections, isLoading, error, refetch } = useQuery({
    queryKey: ["sections"],
    queryFn: () => getSections({ limit: 200 }).then((r) => r.data),
  });
  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: () => getCourses({ limit: 200 }).then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (p: Record<string, unknown>) => createSection(p),
    onSuccess: () => { toast.success("Section created"); qc.invalidateQueries({ queryKey: ["sections"] }); closeForm(); },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error("Failed", e.response?.data?.detail),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => updateSection(id, data),
    onSuccess: () => { toast.success("Section updated"); qc.invalidateQueries({ queryKey: ["sections"] }); closeForm(); },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error("Failed", e.response?.data?.detail),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteSection(id),
    onSuccess: () => { toast.success("Section deleted"); qc.invalidateQueries({ queryKey: ["sections"] }); },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error("Failed", e.response?.data?.detail),
  });

  const openEdit = (s: Section) => {
    setEditing(s);
    setForm({ course_id: String(s.course_id), section_number: s.section_number, capacity: s.capacity, current_enrollment: s.current_enrollment, periods_per_week: s.periods_per_week, requires_lab: s.requires_lab });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      course_id: Number(form.course_id),
      section_number: form.section_number,
      capacity: Number(form.capacity),
      current_enrollment: Number(form.current_enrollment),
      periods_per_week: Number(form.periods_per_week),
      requires_lab: form.requires_lab,
    };
    if (editing) update.mutate({ id: editing.id, data: payload });
    else create.mutate(payload);
  };

  const filtered = (sections ?? []).filter((s: Section) =>
    [s.section_number, s.course?.code ?? "", s.course?.name ?? ""].some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  if (error) return <AppShell><PageHeader title="Sections" icon={<Layers className="h-5 w-5" />} /><ErrorState message="Failed to load sections" onRetry={refetch} /></AppShell>;

  return (
    <AppShell>
      <PageHeader title="Sections" description="Manage course sections and enrollment" icon={<Layers className="h-5 w-5" />} actions={<button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} className="btn-primary"><Plus className="h-4 w-4" /><span>Add Section</span></button>} />
      <div className="mb-4 flex items-center gap-2 bg-white rounded-lg border border-ink-100 px-3 py-2 max-w-md">
        <Search className="h-4 w-4 text-ink-400" />
        <input type="text" placeholder="Search sections..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm focus:outline-none" />
      </div>
      {isLoading ? <LoadingState message="Loading sections..." /> : (
        <DataTable columns={[
          { key: "section_number", header: "Section", render: (r) => <span className="font-semibold text-ink-900">{r.section_number}</span> },
          { key: "course", header: "Course", render: (r) => r.course ? <span>{r.course.code} — {r.course.name}</span> : <span className="text-ink-400">—</span> },
          { key: "capacity", header: "Capacity", render: (r) => <span>{r.current_enrollment} / {r.capacity}</span> },
          { key: "periods_per_week", header: "Periods/wk", render: (r) => r.periods_per_week },
          { key: "requires_lab", header: "Lab?", render: (r) => <Badge variant={r.requires_lab ? "info" : "neutral"}>{r.requires_lab ? "Yes" : "No"}</Badge> },
          { key: "actions", header: "", render: (r) => <div className="flex items-center justify-end gap-1">
            <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1.5 rounded-md text-ink-500 hover:text-brand-600 hover:bg-brand-50 transition"><Pencil className="h-4 w-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${r.section_number}?`)) remove.mutate(r.id); }} className="p-1.5 rounded-md text-ink-500 hover:text-red-600 hover:bg-red-50 transition"><Trash2 className="h-4 w-4" /></button>
          </div>, className: "text-right w-24" },
        ]} data={filtered} emptyMessage="No sections yet." />
      )}
      <Modal open={showForm} onClose={closeForm} title={editing ? "Edit Section" : "Add Section"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Course *</label>
              <select className="select-field" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} required>
                <option value="">— Select —</option>
                {(courses ?? []).map((c: { id: number; code: string; name: string }) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Section Number *</label>
              <input className="input-field" value={form.section_number} onChange={(e) => setForm({ ...form, section_number: e.target.value })} placeholder="e.g. Sec-A1" required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">Capacity</label><input type="number" min={1} className="input-field" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} /></div>
            <div><label className="label">Enrollment</label><input type="number" min={0} className="input-field" value={form.current_enrollment} onChange={(e) => setForm({ ...form, current_enrollment: +e.target.value })} /></div>
            <div><label className="label">Periods/wk</label><input type="number" min={1} max={10} className="input-field" value={form.periods_per_week} onChange={(e) => setForm({ ...form, periods_per_week: +e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="requires_lab" checked={form.requires_lab} onChange={(e) => setForm({ ...form, requires_lab: e.target.checked })} className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
            <label htmlFor="requires_lab" className="text-sm text-ink-700">Requires Lab</label>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-ink-100">
            <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={create.isPending || update.isPending} className="btn-primary">{editing ? "Save Changes" : "Add Section"}</button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
