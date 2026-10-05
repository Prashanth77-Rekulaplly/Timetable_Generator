"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Calendar, Layers, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { BrandLogoIcon } from "@/components/BrandLogo";

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [progress, setProgress] = useState(15);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Smooth progress simulation for launch
    const timer1 = setTimeout(() => setProgress(60), 300);
    const timer2 = setTimeout(() => {
      setProgress(100);
      setReady(true);
    }, 700);

    const redirectTimer = setTimeout(() => {
      if (isAuthenticated()) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }, 1400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(redirectTimer);
    };
  }, [router, isAuthenticated]);

  const targetPath = isAuthenticated() ? "/dashboard" : "/login";

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#070c1e] text-white selection:bg-brand-500 selection:text-white">
      {/* Deep Rich Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#050914] via-[#0c142e] to-[#080d22] pointer-events-none" />

      {/* Background Animated Vibrant Glow Orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[34rem] w-[34rem] rounded-full bg-cyan-500/20 blur-[130px] animate-pulse-slow" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[34rem] w-[34rem] rounded-full bg-purple-600/30 blur-[130px] animate-pulse-slow" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/20 blur-[110px]" />

      {/* High Contrast Subtle Grid Background Pattern */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.12]" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #93c5fd 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      <main className="relative z-10 flex flex-col items-center text-center px-6 max-w-xl mx-auto">
        {/* Animated Brand Logo Icon with Vibrant Glow */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-6"
        >
          {/* Logo Glow Ring */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 opacity-60 blur-xl animate-pulse" />
          
          <div className="relative">
            <BrandLogoIcon size="xl" className="shadow-2xl shadow-indigo-500/50 border-white/30" />
          </div>
        </motion.div>

        {/* Title: Schedule Designer with High-Contrast Bright Colors */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="space-y-3.5"
        >
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 backdrop-blur-md text-xs font-semibold text-cyan-200 shadow-lg shadow-cyan-950/50 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-400 fill-amber-400 animate-pulse" />
            <span className="tracking-wide">Automated Timetable Generation</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white drop-shadow-[0_2px_14px_rgba(255,255,255,0.25)]">
            Schedule{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 drop-shadow-[0_2px_18px_rgba(56,189,248,0.45)]">
              Designer
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-100 max-w-lg mx-auto font-medium leading-relaxed drop-shadow-sm">
            Intelligent graph coloring algorithm engine for conflict-free institutional timetables.
          </p>
        </motion.div>

        {/* Feature Pills with Vibrant Alternative Colors */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-2.5 mt-7"
        >
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-sky-950/70 border border-sky-400/40 text-xs font-medium text-sky-200 shadow-md shadow-sky-950/40">
            <Calendar className="h-3.5 w-3.5 text-sky-400" />
            Smart Periods
          </span>
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-purple-950/70 border border-purple-400/40 text-xs font-medium text-purple-200 shadow-md shadow-purple-950/40">
            <Layers className="h-3.5 w-3.5 text-purple-400" />
            Multi-Section Matrix
          </span>
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-400/40 text-xs font-medium text-emerald-200 shadow-md shadow-emerald-950/40">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Zero Hard Conflicts
          </span>
        </motion.div>

        {/* Progress Bar & Status with High Contrast */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="w-full max-w-xs mt-10 space-y-3"
        >
          <div className="relative h-2.5 w-full bg-slate-900/90 border border-slate-700/80 rounded-full overflow-hidden shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 rounded-full shadow-[0_0_14px_rgba(56,189,248,0.7)]"
              style={{ width: `${progress}%` }}
              transition={{ ease: "easeInOut", duration: 0.3 }}
            />
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="flex items-center gap-2 text-slate-200 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
              </span>
              Initializing engine...
            </span>
            <span className="font-mono font-bold text-cyan-300">{progress}%</span>
          </div>
        </motion.div>

        {/* High Contrast Primary Action Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: ready ? 1 : 0.85 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-8"
        >
          <Link
            href={targetPath}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-500 hover:via-indigo-500 hover:to-purple-500 active:scale-[0.98] border border-blue-400/40 text-white font-semibold text-sm sm:text-base transition-all duration-200 shadow-xl shadow-indigo-600/30 hover:shadow-cyan-500/25 group"
          >
            <span>Launch Schedule Designer</span>
            <ArrowRight className="h-4 w-4 text-cyan-200 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </main>

      {/* Footer Branding */}
      <footer className="absolute bottom-6 left-0 right-0 text-center text-xs font-medium text-slate-400/90 tracking-wide">
        © {new Date().getFullYear()} Schedule Designer. All rights reserved.
      </footer>
    </div>
  );
}
