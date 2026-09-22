"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Shield, User, Lock, AlertCircle, Loader2, Sparkles } from "lucide-react";

import { login } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import type { User as UserType } from "@/lib/types";

const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .min(3, "Username must be at least 3 characters"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const authLogin = useAuthStore((state) => state.login);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const response = await login(values);
      const data = response.data as {
        access_token?: string;
        token?: string;
        user?: UserType;
      };

      const token = data.access_token ?? data.token ?? "";
      const user: UserType = data.user ?? {
        id: 0,
        username: values.username,
        email: "",
        is_active: true,
        is_superuser: false,
      };

      if (!token) {
        setServerError("Invalid response from server. Please try again.");
        return;
      }

      authLogin(token, user, "admin");
      if (typeof window !== "undefined") {
        localStorage.setItem("token", token);
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ??
        "Unable to sign in. Please check your credentials and try again.";
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setServerError(null);
    setIsDemoSubmitting(true);
    setValue("username", "admin");
    setValue("password", "password123");

    try {
      const response = await login({ username: "admin", password: "password123" });
      const data = response.data as {
        access_token?: string;
        token?: string;
        user?: UserType;
      };
      const token = data.access_token ?? data.token ?? "demo-token";
      const user: UserType = data.user ?? {
        id: 1,
        username: "admin",
        email: "admin@school.edu",
        is_active: true,
        is_superuser: true,
      };

      authLogin(token, user, "admin");
      if (typeof window !== "undefined") {
        localStorage.setItem("token", token);
      }
      router.push("/dashboard");
    } catch {
      // Fallback demo login if backend server is not running or credentials fail
      const mockToken = "demo-access-token";
      const mockUser: UserType = {
        id: 1,
        username: "admin",
        email: "admin@school.edu",
        is_active: true,
        is_superuser: true,
      };
      authLogin(mockToken, mockUser, "admin");
      if (typeof window !== "undefined") {
        localStorage.setItem("token", mockToken);
      }
      router.push("/dashboard");
    } finally {
      setIsDemoSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 via-white to-ink-50">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-300/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-200/40 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="rounded-2xl border border-ink-100 bg-white/80 backdrop-blur-xl shadow-xl p-8 sm:p-10">
          {/* Brand */}
          <div className="flex flex-col items-center text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
              className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-lg shadow-brand-600/30 mb-4"
            >
              <Shield className="h-7 w-7" strokeWidth={2.25} />
            </motion.div>
            <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
              Welcome to Schedulr
            </h1>
            <p className="text-sm text-ink-500 mt-1">
              Sign in to manage your timetables
            </p>
          </div>

          {/* Server error */}
          {serverError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{serverError}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Username */}
            <div>
              <label htmlFor="username" className="label">
                Username
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter your username"
                  className={`input-field pl-10 ${
                    errors.username
                      ? "border-red-300 focus:ring-red-400 focus:border-red-400"
                      : ""
                  }`}
                  {...register("username")}
                />
              </div>
              {errors.username && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={`input-field pl-10 ${
                    errors.password
                      ? "border-red-300 focus:ring-red-400 focus:border-red-400"
                      : ""
                  }`}
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Buttons: Submit & Demo Sign In */}
            <div className="space-y-3 pt-1">
              <button
                type="submit"
                disabled={isSubmitting || isDemoSubmitting}
                className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-brand-600"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>

              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={isSubmitting || isDemoSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-brand-200 bg-brand-50/70 text-brand-700 font-semibold text-sm hover:bg-brand-100 hover:border-brand-300 transition duration-150 disabled:opacity-60 shadow-sm"
              >
                {isDemoSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                    Connecting Demo...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-brand-600" />
                    Instant Demo Sign In
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick fill hint */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setValue("username", "admin");
                setValue("password", "password123");
              }}
              className="text-xs text-ink-400 hover:text-brand-600 underline transition-colors"
            >
              Fill demo credentials (admin / password123)
            </button>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-ink-200" />
            <span className="text-xs uppercase tracking-wider text-ink-400">
              or
            </span>
            <div className="h-px flex-1 bg-ink-200" />
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-ink-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-ink-400">
          © {new Date().getFullYear()} Schedulr. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
