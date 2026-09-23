"use client";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { LoadingState, ErrorState } from "@/components/States";
import { getAnalytics } from "@/lib/api";
import { LineChart, Users, Building2, Clock, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AnalyticsPage() {
  const { data: analytics, isLoading, error, refetch } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => (await getAnalytics()).data,
  });

  if (error) {
    return (
      <AppShell>
        <PageHeader title="Analytics" icon={<LineChart className="h-5 w-5" />} />
        <ErrorState message="Failed to load analytics data" onRetry={refetch} />
      </AppShell>
    );
  }

  const facUtil = analytics?.faculty_utilization || {};
  const roomUtil = analytics?.room_utilization || {};
  const slotUtil = analytics?.time_slot_utilization || {};

  const avgFac = calcAvg(facUtil);
  const avgRoom = calcAvg(roomUtil);
  const avgSlot = calcAvg(slotUtil);

  return (
    <AppShell>
      <PageHeader
        title="Analytics & Utilization"
        description="Monitor system workload distribution and resource utilization"
        icon={<LineChart className="h-5 w-5" />}
      />

      {isLoading ? (
        <LoadingState message="Loading analytics..." />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard label="Total Entries" value={analytics?.total_entries ?? 0} icon={<CheckCircle2 className="h-5 w-5" />} variant="info" />
            <StatCard label="Faculty Utilization" value={`${avgFac}%`} icon={<Users className="h-5 w-5" />} variant="success" />
            <StatCard label="Room Utilization" value={`${avgRoom}%`} icon={<Building2 className="h-5 w-5" />} variant="warning" />
            <StatCard label="Time Slot Load" value={`${avgSlot}%`} icon={<Clock className="h-5 w-5" />} variant="default" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <UtilizationCard title="Faculty Workload" data={facUtil} icon={<Users className="h-4 w-4 text-brand-600" />} />
            <UtilizationCard title="Room Occupancy" data={roomUtil} icon={<Building2 className="h-4 w-4 text-emerald-600" />} />
            <UtilizationCard title="Time Slot Distribution" data={slotUtil} icon={<Clock className="h-4 w-4 text-purple-600" />} />
          </div>
        </div>
      )}
    </AppShell>
  );
}

function calcAvg(rec: Record<string, number>): number {
  const vals = Object.values(rec);
  if (!vals.length) return 0;
  return Math.round(vals.reduce((a, b) => a + (Number(b) || 0), 0) / vals.length);
}

function UtilizationCard({ title, data, icon }: { title: string; data: Record<string, number>; icon: React.ReactNode }) {
  const entries = Object.entries(data);
  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2 border-b border-ink-100 pb-3">
        {icon}
        <h3 className="font-semibold text-ink-900 text-sm">{title}</h3>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-ink-400 py-4 text-center">No data available yet.</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {entries.map(([key, val]) => {
            const pct = Math.min(100, Math.max(0, Math.round(Number(val) || 0)));
            return (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-ink-700 font-medium truncate max-w-[160px]">{key}</span>
                  <span className="text-ink-500 font-semibold">{pct}%</span>
                </div>
                <div className="h-2 w-full bg-ink-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} className="h-full bg-brand-500 rounded-full" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
