"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Shield,
  User,
  Lock,
  Mail,
  UserCircle2,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

import { register as registerUser } from "@/lib/api";

const registerSchema = z
  .object({
    username: z
      .string()
      .min(1, "Username is required")
      .min(3, "Username must be at least 3 characters")
      .max(32, "Username is too long")
      .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscores, dots or dashes"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    full_name: z
      .string()
      .min(1, "Full name is required")
      .min(2, "Full name must be at least 2 characters"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(6, "Password must be at least 6 characters"),
    confirm_password: z
      .string()
      .min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      full_name: "",
      password: "",
      confirm_password: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    setServerSuccess(null);
    setIsSubmitting(true);
    try {
      await registerUser({
        username: values.username,
        email: values.email,
        full_name: values.full_name,
        password: values.password,
      });
      setServerSuccess("Account created successfully. Redirecting to sign in...");
      setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (err: unknown) {
      const data = (
        err as { response?: { data?: { detail?: string | unknown[] } } }
      )?.response?.data;
      let message = "Unable to create account. Please try again.";
      if (typeof data?.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data?.detail) && data.detail.length > 0) {
        const first = data.detail[0] as { msg?: string };
        if (first?.msg) message = first.msg;
      }
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasError = (field: keyof RegisterFormValues) => !!errors[field];

  const inputClasses = (field: keyof RegisterFormValues) =>
    `input-field pl-10 ${
      hasError(field)
        ? "border-red-300 focus:ring-red-400 focus:border-red-400"
        : ""
    }`;

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 via-white to-ink-50 py-12">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-300/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/4 right-1/4 h-72 w-72 rounded-full bg-ink-200/40 blur-3xl" />

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
              Create your account
            </h1>
            <p className="text-sm text-ink-500 mt-1">
              Get started with Schedule Designer in seconds
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

          {/* Server success */}
          {serverSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{serverSuccess}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
                  placeholder="Choose a username"
                  className={inputClasses("username")}
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

            {/* Email */}
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={inputClasses("email")}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Full name */}
            <div>
              <label htmlFor="full_name" className="label">
                Full name
              </label>
              <div className="relative">
                <UserCircle2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input
                  id="full_name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your full name"
                  className={inputClasses("full_name")}
                  {...register("full_name")}
                />
              </div>
              {errors.full_name && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.full_name.message}
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
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  className={inputClasses("password")}
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

            {/* Confirm password */}
            <div>
              <label htmlFor="confirm_password" className="label">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input
                  id="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  className={inputClasses("confirm_password")}
                  {...register("confirm_password")}
                />
              </div>
              {errors.confirm_password && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.confirm_password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-brand-600 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-ink-200" />
            <span className="text-xs uppercase tracking-wider text-ink-400">
              or
            </span>
            <div className="h-px flex-1 bg-ink-200" />
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-ink-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-ink-400">
          © {new Date().getFullYear()} Schedule Designer. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
