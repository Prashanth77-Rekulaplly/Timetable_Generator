"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Layers,
  DoorOpen,
  Clock,
  Wand2,
  Calendar,
  AlertTriangle,
  LineChart,
  Beaker,
  GraduationCap,
  Settings,
  LogOut,
  Shield,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: Array<"admin" | "faculty" | "student">;
}

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" />, roles: ["admin"] },
  { label: "My Timetable", href: "/faculty", icon: <Calendar className="h-5 w-5" />, roles: ["faculty"] },
  { label: "My Schedule", href: "/student", icon: <GraduationCap className="h-5 w-5" />, roles: ["student"] },
  { label: "Courses", href: "/admin/courses", icon: <BookOpen className="h-5 w-5" />, roles: ["admin"] },
  { label: "Faculty", href: "/admin/faculty", icon: <Users className="h-5 w-5" />, roles: ["admin"] },
  { label: "Sections", href: "/admin/sections", icon: <Layers className="h-5 w-5" />, roles: ["admin"] },
  { label: "Rooms", href: "/admin/rooms", icon: <DoorOpen className="h-5 w-5" />, roles: ["admin"] },
  { label: "Time Slots", href: "/admin/time-slots", icon: <Clock className="h-5 w-5" />, roles: ["admin"] },
  { label: "Constraints", href: "/admin/constraints", icon: <Settings className="h-5 w-5" />, roles: ["admin"] },
  { label: "Generate", href: "/admin/generate", icon: <Wand2 className="h-5 w-5" />, roles: ["admin"] },
  { label: "Timetables", href: "/admin/timetables", icon: <Calendar className="h-5 w-5" />, roles: ["admin"] },
  { label: "Conflicts", href: "/admin/conflicts", icon: <AlertTriangle className="h-5 w-5" />, roles: ["admin"] },
  { label: "Analytics", href: "/admin/analytics", icon: <LineChart className="h-5 w-5" />, roles: ["admin"] },
  { label: "What-If", href: "/admin/what-if", icon: <Beaker className="h-5 w-5" />, roles: ["admin"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const items = NAV.filter((n) => n.roles.includes(role));

  const onLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-white border-r border-ink-100 h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-ink-100">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-ink-900 leading-tight">Schedule Designer</p>
            <p className="text-[10px] uppercase tracking-wider text-ink-500 font-medium">Timetable AI</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("sidebar-link", active && "active")}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {active && (
                <motion.span
                  layoutId="active-pill"
                  className="h-1.5 w-1.5 rounded-full bg-brand-600"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink-100 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 flex items-center justify-center font-semibold text-sm">
            {user?.full_name?.[0] || user?.username?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink-900 truncate">
              {user?.full_name || user?.username}
            </p>
            <p className="text-xs text-ink-500 capitalize">{role}</p>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="text-ink-400 hover:text-red-600 transition p-1.5 rounded-md hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);
  const items = NAV.filter((n) => n.roles.includes(role)).slice(0, 5);
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-ink-100 flex items-stretch">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition",
              active ? "text-brand-600" : "text-ink-500 hover:text-brand-600"
            )}
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
