"use client";
import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

type ToastVariant = "success" | "error" | "info" | "warning";
interface Toast {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
}
interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

let nextId = 1;
const listeners: Array<(t: Toast) => void> = [];

export function toast(t: Omit<Toast, "id">) {
  const item: Toast = { id: nextId++, ...t };
  listeners.forEach((l) => l(item));
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const item: Toast = { id: nextId++, ...t };
    setToasts((prev) => [...prev, item]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== item.id));
    }, 4500);
  }, []);

  const value: ToastContextValue = {
    toast: push,
    success: (title, description) => push({ variant: "success", title, description }),
    error: (title, description) => push({ variant: "error", title, description }),
    info: (title, description) => push({ variant: "info", title, description }),
    warning: (title, description) => push({ variant: "warning", title, description }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-[200] flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-4 shadow-card"
            >
              <div className="mt-0.5 shrink-0">
                {t.variant === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                {t.variant === "error" && <AlertCircle className="h-5 w-5 text-red-600" />}
                {t.variant === "info" && <Info className="h-5 w-5 text-brand-600" />}
                {t.variant === "warning" && <AlertTriangle className="h-5 w-5 text-amber-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-900">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-xs text-ink-600">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="text-ink-400 hover:text-ink-700 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function ToastContainer() {
  return null;
}

// React hook helper: subscribe to imperative toast() calls
export function useImperativeToast() {
  useEffect(() => {
    const handler = (t: Toast) => {
      const ev = new CustomEvent("toast:push", { detail: t });
      window.dispatchEvent(ev);
    };
    listeners.push(handler);
    return () => {
      const i = listeners.indexOf(handler);
      if (i >= 0) listeners.splice(i, 1);
    };
  }, []);
}
