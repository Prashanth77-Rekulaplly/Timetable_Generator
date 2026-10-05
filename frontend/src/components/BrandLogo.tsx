"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  showText?: boolean;
  subtitle?: string | boolean;
  href?: string;
  className?: string;
  animate?: boolean;
}

export function BrandLogoIcon({
  size = "md",
  className,
  animate = false,
}: {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  animate?: boolean;
}) {
  const sizeMap = {
    xs: { box: "w-6 h-6", svg: 24 },
    sm: { box: "w-8 h-8", svg: 32 },
    md: { box: "w-10 h-10", svg: 40 },
    lg: { box: "w-14 h-14", svg: 56 },
    xl: { box: "w-20 h-20", svg: 80 },
    "2xl": { box: "w-28 h-28", svg: 112 },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const iconContent = (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden flex items-center justify-center shrink-0",
        "bg-gradient-to-br from-brand-500 via-indigo-600 to-purple-600",
        "shadow-lg shadow-brand-500/25 border border-white/20",
        currentSize.box,
        className
      )}
    >
      {/* Ambient background glow inside logo */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/25 pointer-events-none" />

      {/* SVG Icon Graphic */}
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[72%] h-[72%] text-white drop-shadow-sm"
      >
        {/* Calendar / Timetable frame */}
        <rect
          x="6"
          y="10"
          width="36"
          height="32"
          rx="6"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="rgba(255, 255, 255, 0.08)"
        />

        {/* Top Header line */}
        <path
          d="M6 18H42"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Calendar binders / time hooks */}
        <path
          d="M14 6V11"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M34 6V11"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Schedule grid cells / designer slots */}
        {/* Row 1 */}
        <rect
          x="11"
          y="22"
          width="10"
          height="6"
          rx="2"
          fill="currentColor"
          fillOpacity="0.95"
        />
        <rect
          x="24"
          y="22"
          width="13"
          height="6"
          rx="2"
          fill="currentColor"
          fillOpacity="0.4"
        />

        {/* Row 2 */}
        <rect
          x="11"
          y="31"
          width="14"
          height="6"
          rx="2"
          fill="currentColor"
          fillOpacity="0.4"
        />
        <rect
          x="28"
          y="31"
          width="9"
          height="6"
          rx="2"
          fill="currentColor"
          fillOpacity="0.95"
        />

        {/* Sparkling Designer Node (Top Right Spark) */}
        <circle cx="36" cy="14" r="1.5" fill="#fde047" />
        <path
          d="M36 10L36.8 12.8L39.5 13.5L36.8 14.2L36 17L35.2 14.2L32.5 13.5L35.2 12.8L36 10Z"
          fill="#fde047"
          fillOpacity="0.9"
        />
      </svg>
    </div>
  );

  if (animate) {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        {iconContent}
      </motion.div>
    );
  }

  return iconContent;
}

export function BrandLogo({
  size = "md",
  showText = true,
  subtitle = "Timetable AI",
  href,
  className,
  animate = false,
}: BrandLogoProps) {
  const textSizeMap = {
    xs: { title: "text-xs font-bold", sub: "text-[9px]" },
    sm: { title: "text-sm font-bold", sub: "text-[10px]" },
    md: { title: "text-base font-bold", sub: "text-[11px]" },
    lg: { title: "text-xl font-extrabold", sub: "text-xs" },
    xl: { title: "text-2xl font-black", sub: "text-sm" },
    "2xl": { title: "text-3xl font-black", sub: "text-base" },
  };

  const textStyle = textSizeMap[size] || textSizeMap.md;

  const content = (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <BrandLogoIcon size={size} animate={animate} />
      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "tracking-tight text-ink-900 leading-tight bg-clip-text",
                textStyle.title
              )}
            >
              Schedule Designer
            </span>
          </div>
          {subtitle && typeof subtitle === "string" && (
            <span
              className={cn(
                "uppercase tracking-wider font-semibold text-brand-600",
                textStyle.sub
              )}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
