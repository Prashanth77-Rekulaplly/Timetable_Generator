"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "@/components/States";
import { Badge } from "@/components/Badge";
import { getTimetables, validateTimetable } from "@/lib/api";
import { AlertTriangle, AlertCircle, CheckCircle2, ListChecks, BarChart3, X } from "lucide-react";

export default function ConflictsPage() {
  const [selectedTT, setSelectedTT] = useState<number | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<"all" | "hard" | "soft">("all");

  const { data: timetables, isLoading: loadingList } = useQuery({
    queryKey: ["timetables"],
    queryFn: () => getTimetables({ limit: 50 }).then((r) => r.data),
  });

  const { data: validation, isLoading: loadingV } = useQuery({
    queryKey: ["validation", selectedTT],
    queryFn: () => validateTimetable(selectedTT!).then((r) => r.data),
    enabled: selectedTT !== null,
  });

  const hardCount = (validation?.issues || []).filter((i: { severity: string }) => i.severity === "hard" || i.severity === "error").length;
  const softCount = (validation?.issues || []).filter((i: { severity: string }) => i.severity === "soft" || i.severity === "warning").length;

  // Group issues by code
  const byCode: Record<string, number> = {};
  (validation?.issues || []).forEach((i: { code?: string; severity?: string }) => {
    if (!i.code) return;
    byCode[i.code] = (byCode[i.code] || 0) + 1;
  });

  return (
    <AppShell>
      <PageHeader
        title="Conflict Analysis"
        description="Review and analyze constraint violations across timetables"
        icon={<AlertTriangle className="h-5 w-5" />}
        actions={
          <select
            className="select-field max-w-xs"
            value={selectedTT ?? ""}
            onChange={(e) => setSelectedTT(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— Select a timetable —</option>
            {(timetables ?? []).map((t: { id: number; name: string }) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        }
      />

      {!selectedTT ? (
        <EmptyState
          icon={<AlertCircle className="h-7 w-7" />}
          title="Select a timetable"
          description="Choose a generated timetable above to analyze its constraint violations."
        />
      ) : loadingV ? (
        <LoadingState message="Analyzing timetable..." />
      ) : !validation ? (
        <ErrorState message="Could not load validation results" />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Validation Score"
              value={`${Number(validation.score || 0).toFixed(1)}%`}
              icon={<BarChart3 className="h-4 w-4" />}
              variant={Number(validation.score) >= 80 ? "success" : Number(validation.score) >= 60 ? "warning" : "danger"}
            />
            <StatCard
              label="Hard Violations"
              value={hardCount}
              icon={<X className="h-4 w-4" />}
              variant="danger"
            />
            <StatCard
              label="Soft Violations"
              value={softCount}
              icon={<AlertTriangle className="h-4 w-4" />}
              variant="warning"
            />
            <StatCard
              label="Status"
              value={validation.valid ? "Valid" : "Issues"}
              icon={validation.valid ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              variant={validation.valid ? "success" : "danger"}
            />
          </div>

          {Object.keys(byCode).length > 0 && (
            <div className="card mb-6">
              <h3 className="font-semibold text-ink-900 mb-3">Issue Distribution by Code</h3>
              <div className="space-y-2">
                {Object.entries(byCode)
                  .sort(([, a], [, b]) => b - a)
                  .map(([code, count]) => {
                    const max = Math.max(...Object.values(byCode));
                    return (
                      <div key={code}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-ink-700 font-mono">{code}</span>
                          <span className="font-semibold text-ink-900">{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-red-400 to-red-600"
                            style={{ width: `${(count / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="card">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="font-semibold text-ink-900">All Issues</h3>
              <div className="flex items-center gap-1 bg-ink-100 rounded-lg p-1">
                {(["all", "hard", "soft"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterSeverity(f)}
                    className={`px-3 py-1 text-xs font-medium rounded transition ${
                      filterSeverity === f
                        ? "bg-white shadow-sm text-ink-900"
                        : "text-ink-600"
                    }`}
                  >
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {(validation.issues || []).filter((i: { severity: string }) => {
              if (filterSeverity === "all") return true;
              if (filterSeverity === "hard") return i.severity === "hard" || i.severity === "error";
              return i.severity === "soft" || i.severity === "warning";
            }).length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                <p className="text-ink-500">No issues found.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {(validation.issues || [])
                  .filter((i: { severity: string }) => {
                    if (filterSeverity === "all") return true;
                    if (filterSeverity === "hard") return i.severity === "hard" || i.severity === "error";
                    return i.severity === "soft" || i.severity === "warning";
                  })
                  .map((iss: { severity: string; message: string; code?: string; suggestion?: string }, i: number) => {
                    const isHard = iss.severity === "hard" || iss.severity === "error";
                    return (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border ${
                          isHard
                            ? "bg-red-50 border-red-200"
                            : "bg-amber-50 border-amber-200"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {isHard ? (
                            <X className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${isHard ? "text-red-800" : "text-amber-800"}`}>
                              {iss.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              {iss.code && (
                                <Badge variant={isHard ? "danger" : "warning"}>{iss.code}</Badge>
                              )}
                              <Badge variant="neutral">{iss.severity}</Badge>
                            </div>
                            {iss.suggestion && (
                              <p className={`text-xs mt-1.5 ${isHard ? "text-red-600" : "text-amber-600"}`}>
                                💡 {iss.suggestion}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
