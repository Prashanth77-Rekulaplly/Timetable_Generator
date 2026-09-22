"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Badge } from "@/components/Badge";
import { LoadingState, ErrorState } from "@/components/States";
import { useToast } from "@/components/Toast";
import { Settings, Plus, Pencil, Trash2 } from "lucide-react";

interface Constraint extends Record<string, unknown> {
  id: number;
  name: string;
  description?: string;
  constraint_type: string;
  is_required: boolean;
  priority: number;
}

interface FormState {
  name: string;
  description: string;
  constraint_type: "hard" | "soft";
  is_required: boolean;
  priority: number;
}

const emptyForm: FormState = {
  name: "", description: "", constraint_type: "hard", is_required: false, priority: 0,
};

export default function ConstraintsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<Constraint | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: constraints, isLoading, error, refetch } = useQuery<Constraint[]>({
    queryKey: ["constraints"],
    queryFn: () => api.get("/api/v1/constraints").then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (p: Record<string, unknown>) => api.post("/api/v1/constraints", p),
    onSuccess: () => { toast.success("Constraint added"); qc.invalidateQueries({ queryKey: ["constraints"] }); closeForm(); },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error("Failed", e.response?.data?.detail),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.put(`/api/v1/constraints/${id}`, data),
    onSuccess: () => { toast.success("Constraint updated"); qc.invalidateQueries({ queryKey: ["constraints"] }); closeForm(); },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error("Failed", e.response?.data?.detail),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/constraints/${id}`),
    onSuccess: () => { toast.success("Constraint removed"); qc.invalidateQueries({ queryKey: ["constraints"] }); },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error("Failed", e.response?.data?.detail),
  });

  const openEdit = (c: Constraint) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description ?? "", constraint_type: c.constraint_type as "hard" | "soft", is_required: c.is_required, priority: c.priority });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = { ...form };
    if (editing) update.mutate({ id: editing.id, data: payload });
    else create.mutate(payload);
  };

  if (error) return <AppShell><PageHeader title="Constraints" icon={<Settings className="h-5 w-5" />} /><ErrorState message="Failed to load constraints" onRetry={refetch} /></AppShell>;

  return (
    <AppShell>
      <PageHeader title="Constraints" description="Define and manage scheduling rules" icon={<Settings className="h-5 w-5" />} actions={<button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} className="btn-primary"><Plus className="h-4 w-4" /><span>Add Constraint</span></button>} />
      {isLoading ? <LoadingState message="Loading constraints..." /> : (
        <DataTable<Constraint> columns={[
          { key: "name", header: "Name", render: (r: Constraint) => <span className="font-semibold text-ink-900">{r.name}</span> },
          { key: "description", header: "Description", render: (r: Constraint) => r.description ?? <span className="text-ink-400">—</span> },
          { key: "constraint_type", header: "Type", render: (r: Constraint) => <Badge variant={r.constraint_type === "hard" ? "danger" : "warning"}>{r.constraint_type}</Badge> },
          { key: "priority", header: "Priority", render: (r: Constraint) => r.priority },
          { key: "is_required", header: "Required", render: (r: Constraint) => <Badge variant={r.is_required ? "info" : "neutral"}>{r.is_required ? "Yes" : "No"}</Badge> },
          {
            key: "actions", header: "", render: (r: Constraint) => <div className="flex items-center justify-end gap-1">
              <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1.5 rounded-md text-ink-500 hover:text-brand-600 hover:bg-brand-50 transition"><Pencil className="h-4 w-4" /></button>
              <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${r.name}?`)) remove.mutate(r.id); }} className="p-1.5 rounded-md text-ink-500 hover:text-red-600 hover:bg-red-50 transition"><Trash2 className="h-4 w-4" /></button>
            </div>, className: "text-right w-24"
          },
        ]} data={constraints ?? []} emptyMessage="No constraints defined yet." />
      )}
      <Modal open={showForm} onClose={closeForm} title={editing ? "Edit Constraint" : "Add Constraint"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Name *</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><label className="label">Description</label><textarea className="input-field" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Type</label>
              <select className="select-field" value={form.constraint_type} onChange={(e) => setForm({ ...form, constraint_type: e.target.value as "hard" | "soft" })}>
                <option value="hard">Hard</option><option value="soft">Soft</option>
              </select>
            </div>
            <div><label className="label">Priority</label><input type="number" min={0} max={10} className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: +e.target.value })} /></div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="is_required" checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
              <label htmlFor="is_required" className="text-sm text-ink-700">Required</label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-ink-100">
            <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={create.isPending || update.isPending} className="btn-primary">{editing ? "Save Changes" : "Add Constraint"}</button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
