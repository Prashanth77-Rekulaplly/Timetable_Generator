"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFaculty,
  createFaculty,
  updateFaculty,
  deleteFaculty,
} from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Badge } from "@/components/Badge";
import { LoadingState, ErrorState } from "@/components/States";
import { useToast } from "@/components/Toast";
import { Faculty } from "@/lib/types";
import { Users, Plus, Pencil, Trash2, Search, Briefcase } from "lucide-react";

interface FormState {
  name: string;
  department: string;
  email: string;
  is_full_time: boolean;
  max_hours_per_week: number;
}

const emptyForm: FormState = {
  name: "",
  department: "",
  email: "",
  is_full_time: true,
  max_hours_per_week: 20,
};

export default function FacultyPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Faculty | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: faculty, isLoading, error, refetch } = useQuery({
    queryKey: ["faculty"],
    queryFn: () => getFaculty({ limit: 200 }).then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (p: Record<string, unknown>) => createFaculty(p),
    onSuccess: () => {
      toast.success("Faculty member added");
      qc.invalidateQueries({ queryKey: ["faculty"] });
      closeForm();
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => {
      toast.error("Failed to add faculty", e.response?.data?.detail);
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      updateFaculty(id, data),
    onSuccess: () => {
      toast.success("Faculty member updated");
      qc.invalidateQueries({ queryKey: ["faculty"] });
      closeForm();
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => {
      toast.error("Failed to update", e.response?.data?.detail);
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteFaculty(id),
    onSuccess: () => {
      toast.success("Faculty member removed");
      qc.invalidateQueries({ queryKey: ["faculty"] });
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => {
      toast.error("Failed to remove", e.response?.data?.detail);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (f: Faculty) => {
    setEditing(f);
    setForm({
      name: f.name,
      department: f.department ?? "",
      email: f.email ?? "",
      is_full_time: f.is_full_time,
      max_hours_per_week: f.max_hours_per_week,
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
      name: form.name,
      department: form.department || null,
      email: form.email || null,
      is_full_time: form.is_full_time,
      max_hours_per_week: Number(form.max_hours_per_week),
    };
    if (editing) {
      update.mutate({ id: editing.id, data: payload });
    } else {
      create.mutate(payload);
    }
  };

  const filtered = (faculty ?? []).filter((f: Faculty) =>
    [f.name, f.department ?? "", f.email ?? ""].some((v) =>
      v.toLowerCase().includes(search.toLowerCase())
    )
  );

  if (error) {
    return (
      <AppShell>
        <PageHeader title="Faculty" icon={<Users className="h-5 w-5" />} />
        <ErrorState message="Failed to load faculty" onRetry={refetch} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Faculty"
        description="Manage faculty members and their availability"
        icon={<Users className="h-5 w-5" />}
        actions={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" />
            <span>Add Faculty</span>
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-2 bg-white rounded-lg border border-ink-100 px-3 py-2 max-w-md">
        <Search className="h-4 w-4 text-ink-400" />
        <input
          type="text"
          placeholder="Search faculty..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-ink-400"
        />
      </div>

      {isLoading ? (
        <LoadingState message="Loading faculty..." />
      ) : (
        <DataTable<Faculty>
          columns={[
            {
              key: "name",
              header: "Name",
              render: (r: Faculty) => (
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 flex items-center justify-center text-xs font-bold">
                    {r.name[0]}
                  </div>
                  <span className="font-semibold text-ink-900">{r.name}</span>
                </div>
              ),
            },
            {
              key: "department",
              header: "Department",
              render: (r: Faculty) => r.department ?? <span className="text-ink-400">—</span>,
            },
            {
              key: "email",
              header: "Email",
              render: (r: Faculty) => r.email ?? <span className="text-ink-400">—</span>,
            },
            {
              key: "is_full_time",
              header: "Type",
              render: (r: Faculty) => (
                <Badge variant={r.is_full_time ? "info" : "neutral"}>
                  {r.is_full_time ? "Full-time" : "Part-time"}
                </Badge>
              ),
            },
            {
              key: "max_hours_per_week",
              header: "Max Hours",
              render: (r: Faculty) => r.max_hours_per_week,
            },
            {
              key: "actions",
              header: "",
              render: (r: Faculty) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                    className="p-1.5 rounded-md text-ink-500 hover:text-brand-600 hover:bg-brand-50 transition"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Remove ${r.name}?`)) remove.mutate(r.id);
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
          emptyMessage="No faculty members yet."
        />
      )}

      <Modal open={showForm} onClose={closeForm} title={editing ? "Edit Faculty" : "Add Faculty"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Department</label>
              <input className="input-field" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. Computer Science" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select className="select-field" value={form.is_full_time ? "true" : "false"} onChange={(e) => setForm({ ...form, is_full_time: e.target.value === "true" })}>
                <option value="true">Full-time</option>
                <option value="false">Part-time</option>
              </select>
            </div>
            <div>
              <label className="label">Max Hours/Week</label>
              <input type="number" min={1} max={40} className="input-field" value={form.max_hours_per_week} onChange={(e) => setForm({ ...form, max_hours_per_week: +e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-ink-100">
            <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={create.isPending || update.isPending} className="btn-primary">
              {editing ? "Save Changes" : "Add Faculty"}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
