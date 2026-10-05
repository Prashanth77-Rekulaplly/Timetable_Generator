"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import { Sidebar, MobileNav } from "./Sidebar";
import { BrandLogo, BrandLogoIcon } from "./BrandLogo";
import { motion } from "framer-motion";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated()) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated()) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gradient-to-br from-ink-50 via-white to-brand-50/30">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <div className="relative">
            <div className="absolute -inset-2 rounded-2xl bg-brand-500/20 blur-lg animate-pulse" />
            <BrandLogoIcon size="lg" className="relative shadow-lg" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-ink-900 tracking-tight">
              Schedule Designer
            </h2>
            <div className="flex items-center justify-center gap-2 text-xs text-ink-500">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
              <span>Loading workspace...</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-ink-50">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-ink-100 sticky top-0 z-30 shadow-xs">
          <BrandLogo href="/dashboard" size="xs" subtitle={false} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-700 bg-brand-50 border border-brand-200/60 px-2 py-0.5 rounded-full">
            Timetable AI
          </span>
        </header>

        <main className="flex-1 min-w-0 pb-16 md:pb-0">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
