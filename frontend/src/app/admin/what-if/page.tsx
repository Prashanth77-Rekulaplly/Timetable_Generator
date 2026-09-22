"use client";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Beaker, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function WhatIfPage() {
  const router = useRouter();
  const [facultyCount, setFacultyCount] = useState(14);
  const [roomCount, setRoomCount] = useState(10);
  const [maxHours, setMaxHours] = useState(20);
  const [simulatedScore, setSimulatedScore] = useState<number | null>(null);

  const runSimulation = () => {
    // Basic scenario quality estimator based on faculty-to-room ratio
    const ratio = roomCount / Math.max(1, facultyCount);
    const score = Math.min(98, Math.max(45, Math.round(75 + ratio * 15 - (maxHours > 25 ? 10 : 0))));
    setSimulatedScore(score);
  };

  return (
    <AppShell>
      <PageHeader
        title="What-If Scenario Simulation"
        description="Simulate timetable generation parameters to evaluate resource feasibility"
        icon={<Beaker className="h-5 w-5" />}
      />

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="card space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Beaker className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink-900">Scenario Configuration</h2>
              <p className="text-xs text-ink-500">Test resource changes before actual generation</p>
            </div>
          </div>

          <div>
            <label className="label">Simulated Available Rooms: {roomCount}</label>
            <input type="range" min={5} max={30} value={roomCount} onChange={(e) => setRoomCount(+e.target.value)} className="w-full" />
          </div>

          <div>
            <label className="label">Active Faculty Members: {facultyCount}</label>
            <input type="range" min={5} max={40} value={facultyCount} onChange={(e) => setFacultyCount(+e.target.value)} className="w-full" />
          </div>

          <div>
            <label className="label">Max Weekly Hours Per Faculty: {maxHours} hrs</label>
            <input type="range" min={10} max={35} value={maxHours} onChange={(e) => setMaxHours(+e.target.value)} className="w-full" />
          </div>

          <button onClick={runSimulation} className="btn-primary w-full py-2.5">
            <Sparkles className="h-4 w-4" />
            Run What-If Simulation
          </button>
        </div>

        {simulatedScore !== null && (
          <div className="card border-brand-200 bg-brand-50/50 space-y-3">
            <div className="flex items-center gap-2 text-brand-700 font-bold">
              <CheckCircle2 className="h-5 w-5 text-brand-600" />
              <span>Simulation Result</span>
            </div>
            <p className="text-sm text-ink-700">
              Estimated Schedule Feasibility Score: <strong className="text-brand-700 text-lg">{simulatedScore}%</strong>
            </p>
            <div className="pt-2 flex gap-3">
              <button onClick={() => router.push("/admin/generate")} className="btn-primary">
                Proceed to Generate
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
