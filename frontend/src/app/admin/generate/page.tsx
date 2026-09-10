"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { LoadingState, SuccessState, ErrorState } from "@/components/States";
import { useToast } from "@/components/Toast";
import { generateTimetable } from "@/lib/api";
import { Wand2, CheckCircle2, AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type GenerationPhase = "idle" | "generating" | "success" | "error";

interface GenResult {
  timetable_id: number;
  success: boolean;
  message: string;
  assignments_count: number;
  validation: {
    score: number;
    hard_violations: number;
    soft_violations: number;
    valid: boolean;
  };
}

export default function GeneratePage() {
  const router = useRouter();
  const toast = useToast();
  const [phase, setPhase] = useState<GenerationPhase>("idle");
  const [result, setResult] = useState<GenResult | null>(null);
  const [optimize, setOptimize] = useState(true);
  const [maxIterations, setMaxIterations] = useState(1000);

  const gen = useMutation({
    mutationFn: () =>
      generateTimetable({
        name: "Generated Timetable",
        optimize,
        max_iterations: maxIterations,
      }),
    onSuccess: (res) => {
      const data = res.data as GenResult;
      setResult(data);
      setPhase("success");
      if (data.success) {
        toast.success("Timetable generated successfully!");
      } else {
        toast.warning("Timetable generated with violations");
      }
    },
    onError: (e: unknown) => {
      setPhase("error");
      toast.error("Generation failed");
    },
  });

  const handleGenerate = () => {
    setPhase("generating");
    setResult(null);
    gen.mutate();
  };

  const scoreColor = (s: number) => {
    if (s >= 80) return "text-emerald-600";
    if (s >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const scoreBg = (s: number) => {
    if (s >= 80) return "bg-emerald-50 border-emerald-200 text-emerald-700";
    if (s >= 60) return "bg-amber-50 border-amber-200 text-amber-700";
    return "bg-red-50 border-red-200 text-red-700";
  };

  return (
    <AppShell>
      <PageHeader
        title="Generate Timetable"
        description="Run the scheduling algorithm to generate a new timetable"
        icon={<Wand2 className="h-5 w-5" />}
      />

      <div className="max-w-2xl mx-auto">
        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow">
              <Wand2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink-900">Algorithm Settings</h2>
              <p className="text-sm text-ink-500">Configure generation parameters</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-ink-50 border border-ink-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-ink-900">Optimization</h3>
                  <p className="text-xs text-ink-500">Enable constraint-aware scheduling</p>
                </div>
                <button
                  onClick={() => setOptimize(!optimize)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${optimize ? "bg-brand-600" : "bg-ink-300"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${optimize ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <p className="text-xs text-ink-600">
                When enabled, the algorithm will attempt to minimize soft constraint violations
                and maximize overall schedule quality.
              </p>
            </div>

            <div>
              <label className="label">Max Iterations</label>
              <input
                type="range"
                min={100}
                max={5000}
                step={100}
                value={maxIterations}
                onChange={(e) => setMaxIterations(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-ink-500 mt-1">
                <span>Faster (100)</span>
                <span className="font-semibold text-brand-600">{maxIterations} iterations</span>
                <span>Thorough (5000)</span>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={phase === "generating"}
              className="btn-primary w-full text-base py-3"
            >
              {phase === "generating" ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Timetable...
                </>
              ) : (
                <>
                  <Wand2 className="h-5 w-5" />
                  Generate Timetable
                </>
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {phase === "generating" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6"
            >
              <div className="card border-brand-200 bg-brand-50">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="h-5 w-5 text-brand-600 animate-spin" />
                  <h3 className="font-semibold text-brand-700">Scheduling in progress...</h3>
                </div>
                <div className="space-y-2 text-sm text-brand-700">
                  <p>✓ Building conflict graph</p>
                  <p>✓ Running graph coloring algorithm</p>
                  <p>✓ Applying constraint rules</p>
                  <p>↻ Validating solution quality</p>
                </div>
              </div>
            </motion.div>
          )}

          {phase === "success" && result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 space-y-4"
            >
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
                    <div className="mt-3 flex items-center gap-4">
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
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/admin/timetables/${result.timetable_id}`)}
                  className="btn-primary"
                >
                  <ArrowRight className="h-4 w-4" />
                  View Generated Timetable
                </button>
                <button
                  onClick={() => router.push(`/admin/timetables`)}
                  className="btn-secondary"
                >
                  View All Timetables
                </button>
                <button
                  onClick={() => {
                    setPhase("idle");
                    setResult(null);
                  }}
                  className="btn-secondary"
                >
                  Generate Again
                </button>
              </div>
            </motion.div>
          )}

          {phase === "error" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              <ErrorState title="Generation Failed" message="An error occurred while generating the timetable." onRetry={() => setPhase("idle")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
