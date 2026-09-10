"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRooms, createRoom, updateRoom, deleteRoom } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Badge } from "@/components/Badge";
import { LoadingState, ErrorState } from "@/components/States";
import { useToast } from "@/components/Toast";
import { Room } from "@/lib/types";
import { DoorOpen, Plus, Pencil, Trash2, Search, Projector, Cpu } from "lucide-react";

interface FormState {
  room_number: string;
  building: string;
  capacity: number;
  has_projector: boolean;
  has_computer: boolean;
  room_type: string;
}

const emptyForm: FormState = {
  room_number: "",
  building: "",
  capacity: 50,
  has_projector: true,
  has_computer: false,
  room_type: "lecture",
};

export default function RoomsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Room | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: rooms, isLoading, error, refetch } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getRooms({ limit: 200 }).then((r) => r.data),
  });

  const create = useMutation({ mutationFn: (p: Record<string, unknown>) => createRoom(p), onSuccess: () => { toast.success("Room added"); qc.invalidateQueries({ queryKey: ["rooms"] }); closeForm(); }, onError: (e: { response?: { data?: { detail?: string } } }) => toast.error("Failed", e.response?.data?.detail) });
  const update = useMutation({ mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => updateRoom(id, data), onSuccess: () => { toast.success("Room updated"); qc.invalidateQueries({ queryKey: ["rooms"] }); closeForm(); }, onError: (e: { response?: { data?: { detail?: string } } }) => toast.error("Failed", e.response?.data?.detail) });
  const remove = useMutation({ mutationFn: (id: number) => deleteRoom(id), onSuccess: () => { toast.success("Room removed"); qc.invalidateQueries({ queryKey: ["rooms"] }); }, onError: (e: { response?: { data?: { detail?: string } } }) => toast.error("Failed", e.response?.data?.detail) });

  const openEdit = (r: Room) => {
    setEditing(r);
    setForm({ room_number: r.room_number, building: r.building ?? "", capacity: r.capacity, has_projector: r.has_projector, has_computer: r.has_computer, room_type: r.room_type || "lecture" });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      room_number: form.room_number, building: form.building || null, capacity: Number(form.capacity), has_projector: form.has_projector, has_computer: form.has_computer, room_type: form.room_type,
    };
    if (editing) update.mutate({ id: editing.id, data: payload });
    else create.mutate(payload);
  };

  const filtered = (rooms ?? []).filter((r: Room) => [r.room_number, r.building ?? "", r.room_type ?? ""].some(v => v.toLowerCase().includes(search.toLowerCase())));

  if (error) return <AppShell><PageHeader title="Rooms" icon={<DoorOpen className="h-5 w-5" />} /><ErrorState message="Failed to load rooms" onRetry={refetch} /></AppShell>;

  return (
    <AppShell>
      <PageHeader title="Rooms" description="Manage physical rooms and their capabilities" icon={<DoorOpen className="h-5 w-5" />} actions={<button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} className="btn-primary"><Plus className="h-4 w-4" /><span>Add Room</span></button>} />
      <div className="mb-4 flex items-center gap-2 bg-white rounded-lg border border-ink-100 px-3 py-2 max-w-md">
        <Search className="h-4 w-4 text-ink-400" />
        <input type="text" placeholder="Search rooms..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent text-sm focus:outline-none" />
      </div>
      {isLoading ? <LoadingState message="Loading rooms..." /> : (
        <DataTable columns={[
          { key: "room_number", header: "Room #", render: (r) => <span className="font-semibold text-ink-900">{r.room_number}</span> },
          { key: "building", header: "Building", render: (r) => r.building ?? <span className="text-ink-400">—</span> },
          { key: "capacity", header: "Capacity", render: (r) => r.capacity },
          { key: "room_type", header: "Type", render: (r) => <Badge variant={r.room_type === "lab" ? "info" : "neutral"} className="capitalize">{r.room_type || "—"}</Badge> },
          { key: "features", header: "Features", render: (r) => <div className="flex items-center gap-2">{r.has_projector && <span className="inline-flex items-center gap-1 text-xs text-ink-600"><Projector className="h-3.5 w-3.5" /> Projector</span>}{r.has_computer && <span className="inline-flex items-center gap-1 text-xs text-ink-600"><Cpu className="h-3.5 w-3.5" /> Computer</span>}{!r.has_projector && !r.has_computer && <span className="text-ink-400 text-xs">—</span>}</div> },
          { key: "actions", header: "", render: (r) => <div className="flex items-center justify-end gap-1">
            <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1.5 rounded-md text-ink-500 hover:text-brand-600 hover:bg-brand-50 transition"><Pencil className="h-4 w-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${r.room_number}?`)) remove.mutate(r.id); }} className="p-1.5 rounded-md text-ink-500 hover:text-red-600 hover:bg-red-50 transition"><Trash2 className="h-4 w-4" /></button>
          </div>, className: "text-right w-24" },
        ]} data={filtered} emptyMessage="No rooms yet." />
      )}
      <Modal open={showForm} onClose={closeForm} title={editing ? "Edit Room" : "Add Room"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Room Number *</label><input className="input-field" value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} required /></div>
            <div><label className="label">Building</label><input className="input-field" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} placeholder="e.g. Main Building" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Capacity</label><input type="number" min={1} className="input-field" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} /></div>
            <div><label className="label">Type</label><select className="select-field" value={form.room_type} onChange={(e) => setForm({ ...form, room_type: e.target.value })}><option value="lecture">Lecture</option><option value="lab">Lab</option><option value="tutorial">Tutorial</option></select></div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-ink-700"><input type="checkbox" checked={form.has_projector} onChange={(e) => setForm({ ...form, has_projector: e.target.checked })} className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />Projector</label>
            <label className="flex items-center gap-2 text-sm text-ink-700"><input type="checkbox" checked={form.has_computer} onChange={(e) => setForm({ ...form, has_computer: e.target.checked })} className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />Computer</label>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-ink-100">
            <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={create.isPending || update.isPending} className="btn-primary">{editing ? "Save Changes" : "Add Room"}</button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
