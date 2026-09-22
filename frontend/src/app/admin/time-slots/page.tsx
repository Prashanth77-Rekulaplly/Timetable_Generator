"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTimeSlots, createTimeSlot, updateTimeSlot, deleteTimeSlot } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Badge } from "@/components/Badge";
import { LoadingState, ErrorState } from "@/components/States";
import { useToast } from "@/components/Toast";
import { TimeSlot } from "@/lib/types";
import { Clock, Plus, Pencil, Trash2, Coffee } from "lucide-react";
import { dayShort } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface FormState {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
  label: string;
}

const emptyForm: FormState = {
  day_of_week: 0,
  start_time: "09:00",
  end_time: "10:00",
  is_break: false,
  label: "",
};

export default function TimeSlotsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<TimeSlot | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: slots, isLoading, error, refetch } = useQuery({
    queryKey: ["time-slots"],
    queryFn: () => getTimeSlots({ limit: 300 }).then((r) => r.data),
  });

  const create = useMutation({ mutationFn: (p: Record<string, unknown>) => createTimeSlot(p), onSuccess: () => { toast.success("Time slot added"); qc.invalidateQueries({ queryKey: ["time-slots"] }); closeForm(); }, onError: (e: { response?: { data?: { detail?: string } } }) => toast.error("Failed", e.response?.data?.detail) });
  const update = useMutation({ mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => updateTimeSlot(id, data), onSuccess: () => { toast.success("Time slot updated"); qc.invalidateQueries({ queryKey: ["time-slots"] }); closeForm(); }, onError: (e: { response?: { data?: { detail?: string } } }) => toast.error("Failed", e.response?.data?.detail) });
  const remove = useMutation({ mutationFn: (id: number) => deleteTimeSlot(id), onSuccess: () => { toast.success("Time slot removed"); qc.invalidateQueries({ queryKey: ["time-slots"] }); }, onError: (e: { response?: { data?: { detail?: string } } }) => toast.error("Failed", e.response?.data?.detail) });

  const openEdit = (s: TimeSlot) => {
    setEditing(s);
    setForm({ day_of_week: s.day_of_week, start_time: s.start_time?.slice(0, 5) || "09:00", end_time: s.end_time?.slice(0, 5) || "10:00", is_break: s.is_break, label: s.label ?? "" });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      day_of_week: Number(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
      is_break: form.is_break,
      label: form.label || null,
    };
    if (editing) update.mutate({ id: editing.id, data: payload });
    else create.mutate(payload);
  };

  const sorted = [...(slots ?? [])].sort((a: TimeSlot, b: TimeSlot) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
    return String(a.start_time).localeCompare(String(b.start_time));
  });

  if (error) return <AppShell><PageHeader title="Time Slots" icon={<Clock className="h-5 w-5" />} /><ErrorState message="Failed to load time slots" onRetry={refetch} /></AppShell>;

  return (
    <AppShell>
      <PageHeader title="Time Slots" description="Configure the weekly schedule grid" icon={<Clock className="h-5 w-5" />} actions={<button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} className="btn-primary"><Plus className="h-4 w-4" /><span>Add Time Slot</span></button>} />
      {isLoading ? <LoadingState message="Loading time slots..." /> : (
        <DataTable<TimeSlot> columns={[
          { key: "day", header: "Day", render: (r: TimeSlot) => <Badge variant="neutral">{dayShort(r.day_of_week)}</Badge> },
          { key: "start", header: "Start", render: (r: TimeSlot) => <span className="font-mono text-ink-700">{String(r.start_time).slice(0, 5)}</span> },
          { key: "end", header: "End", render: (r: TimeSlot) => <span className="font-mono text-ink-700">{String(r.end_time).slice(0, 5)}</span> },
          { key: "type", header: "Type", render: (r: TimeSlot) => r.is_break ? <Badge variant="warning"><Coffee className="h-3 w-3 mr-1" />Break</Badge> : <Badge variant="info">Class</Badge> },
          { key: "label", header: "Label", render: (r: TimeSlot) => r.label || <span className="text-ink-400">—</span> },
          { key: "actions", header: "", render: (r: TimeSlot) => <div className="flex items-center justify-end gap-1">
            <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1.5 rounded-md text-ink-500 hover:text-brand-600 hover:bg-brand-50 transition"><Pencil className="h-4 w-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete this time slot?`)) remove.mutate(r.id); }} className="p-1.5 rounded-md text-ink-500 hover:text-red-600 hover:bg-red-50 transition"><Trash2 className="h-4 w-4" /></button>
          </div>, className: "text-right w-24" },
        ]} data={sorted} emptyMessage="No time slots yet." />
      )}
      <Modal open={showForm} onClose={closeForm} title={editing ? "Edit Time Slot" : "Add Time Slot"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Day *</label>
              <select className="select-field" value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: +e.target.value })}>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Label</label>
              <input className="input-field" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Period 1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Start Time *</label><input type="time" className="input-field" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required /></div>
            <div><label className="label">End Time *</label><input type="time" className="input-field" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required /></div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_break" checked={form.is_break} onChange={(e) => setForm({ ...form, is_break: e.target.checked })} className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
            <label htmlFor="is_break" className="text-sm text-ink-700">This is a break period (no classes)</label>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-ink-100">
            <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={create.isPending || update.isPending} className="btn-primary">{editing ? "Save Changes" : "Add Time Slot"}</button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
