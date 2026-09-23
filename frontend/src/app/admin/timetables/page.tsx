"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getTimetables, deleteTimetable, finalizeTimetable } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/Badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/States";
import { useToast } from "@/components/Toast";
import { Timetable } from "@/lib/types";
import { Calendar, Trash2, Eye, CheckCircle, Wand2, Search } from "lucide-react";
import { motion } from "framer-motion";

export default function TimetablesPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState("");

  const { data: timetables, isLoading, error, refetch } = useQuery({
    queryKey: ["timetables"],
    queryFn: () => getTimetables({ limit: 50 }).then((r) => r.data),
  });

  const finalize = useMutation({
    mutationFn: (id: number) => finalizeTimetable(id),
    onSuccess: () => {
      toast.success("Timetable finalized");
      qc.invalidateQueries({ queryKey: ["timetables"] });
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => {
      toast.error("Failed to finalize", e.response?.data?.detail);
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteTimetable(id),
    onSuccess: () => {
      toast.success("Timetable deleted");
      qc.invalidateQueries({ queryKey: ["timetables"] });
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => {
      toast.error("Failed to delete", e.response?.data?.detail);
    },
  });

  const filtered = (timetables ?? []).filter((t: Timetable) =>
    t.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (error) {
    return (
      <AppShell>
        <PageHeader title="Timetables" icon={<Calendar className="h-5 w-5" />} />
        <ErrorState message="Failed to load timetables" onRetry={refetch} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Timetables"
        description="Manage generated timetables"
        icon={<Calendar className="h-5 w-5" />}
        actions={
          <button onClick={() => router.push("/admin/generate")} className="btn-primary">
            <Wand2 className="h-4 w-4" />
            <span>Generate New</span>
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-2 bg-white rounded-lg border border-ink-100 px-3 py-2 max-w-md">
        <Search className="h-4 w-4 text-ink-400" />
        <input
          type="text"
          placeholder="Search timetables..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm focus:outline-none"
        />
      </div>

      {isLoading ? (
        <LoadingState message="Loading timetables..." />
      ) : !filtered.length ? (
        <EmptyState
          icon={<Calendar className="h-7 w-7" />}
          title="No timetables yet"
          description="Generate your first timetable to get started"
          action={
            <button onClick={() => router.push("/admin/generate")} className="btn-primary mt-2">
              <Wand2 className="h-4 w-4" />
              Generate Timetable
            </button>
          }
        />
      ) : (
        <DataTable<Timetable>
          columns={[
            {
              key: "name",
              header: "Name",
              render: (r: Timetable) => (
                <span className="font-semibold text-ink-900">{r.name}</span>
              ),
            },
            {
              key: "version",
              header: "Ver.",
              render: (r: Timetable) => (
                <Badge variant="neutral">v{r.version}</Badge>
              ),
            },
            {
              key: "is_finalized",
              header: "Status",
              render: (r: Timetable) => (
                <Badge variant={r.is_finalized ? "success" : "warning"} dot>
                  {r.is_finalized ? "Finalized" : "Draft"}
                </Badge>
              ),
            },
            {
              key: "generated_at",
              header: "Generated",
              render: (r: Timetable) => (
                <span className="text-ink-600">
                  {r.generated_at
                    ? new Date(r.generated_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </span>
              ),
            },
            {
              key: "metadata",
              header: "Metadata",
              render: (r: Timetable) => {
                try {
                  const m = r.metadata_json ? JSON.parse(r.metadata_json) : null;
                  if (!m) return <span className="text-ink-400">—</span>;
                  return (
                    <div className="flex items-center gap-2">
                      {m.score != null && (
                        <Badge variant={m.score >= 80 ? "success" : m.score >= 60 ? "warning" : "danger"}>
                          {Number(m.score).toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  );
                } catch {
                  return <span className="text-ink-400">—</span>;
                }
              },
            },
            {
              key: "actions",
              header: "",
              render: (r: Timetable) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/admin/timetables/${r.id}`);
                    }}
                    className="p-1.5 rounded-md text-ink-500 hover:text-brand-600 hover:bg-brand-50 transition"
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {!r.is_finalized && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        finalize.mutate(r.id);
                      }}
                      className="p-1.5 rounded-md text-ink-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                      title="Finalize"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${r.name}"? This cannot be undone.`))
                        remove.mutate(r.id);
                    }}
                    className="p-1.5 rounded-md text-ink-500 hover:text-red-600 hover:bg-red-50 transition"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ),
              className: "text-right w-32",
            },
          ]}
          data={filtered}
          onRowClick={(r: Timetable) => router.push(`/admin/timetables/${r.id}`)}
          emptyMessage="No timetables found."
        />
      )}
    </AppShell>
  );
}
