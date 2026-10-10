"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import {
  ShieldCheck,
  Briefcase,
  Code2,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Lock,
  Mail,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const { user, login, quickDemoLogin, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoClick = async (role: "ADMIN" | "PM" | "MEMBER" | "VIEWER") => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await quickDemoLogin(role);
      router.push("/dashboard");
    } catch (err: any) {
      setErrorMessage(err.message || "Demo login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6 lg:p-8 bg-zinc-50/60 dark:bg-zinc-950/60">
      <div className="w-full max-w-5xl rounded-3xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* Left Side: 1-Click Role Switcher */}
        <div className="bg-gradient-to-br from-zinc-900 via-slate-900 to-indigo-950 p-8 sm:p-12 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white active:scale-[0.98] transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Overview</span>
              </Link>

              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-md border border-white/10">
                <Sparkles className="h-3 w-3 text-amber-300" />
                NeoStats Hackathon
              </span>
            </div>

            <h1 className="mt-6 text-2xl font-extrabold tracking-tight sm:text-3xl">
              1-Click Demo Evaluation
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Launch into the collaborative workspace with any of the 4 pre-configured roles below:
            </p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDemoClick("ADMIN")}
                className="group flex w-full items-center justify-between rounded-2xl bg-white/10 p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-md active:scale-[0.98] disabled:opacity-50 border border-white/10 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-500/30 p-2 text-blue-300">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-white">System Admin</p>
                    <p className="text-[11px] text-zinc-300">admin@neostats.com • User & project oversight</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDemoClick("PM")}
                className="group flex w-full items-center justify-between rounded-2xl bg-white/10 p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-md active:scale-[0.98] disabled:opacity-50 border border-white/10 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-indigo-500/30 p-2 text-indigo-300">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-white">Project Manager</p>
                    <p className="text-[11px] text-zinc-300">pm@neostats.com • Team roster & task status</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDemoClick("MEMBER")}
                className="group flex w-full items-center justify-between rounded-2xl bg-white/10 p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-md active:scale-[0.98] disabled:opacity-50 border border-white/10 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500/30 p-2 text-emerald-300">
                    <Code2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-white">Team Member</p>
                    <p className="text-[11px] text-zinc-300">member@neostats.com • Update assigned tasks</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDemoClick("VIEWER")}
                className="group flex w-full items-center justify-between rounded-2xl bg-white/10 p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-md active:scale-[0.98] disabled:opacity-50 border border-white/10 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-500/30 p-2 text-amber-300">
                    <Eye className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-white">Viewer</p>
                    <p className="text-[11px] text-zinc-300">viewer@neostats.com • Read-only supervision</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <p className="mt-8 text-xs text-zinc-400">
            Password for all demo accounts:{" "}
            <code className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white border border-white/10">password123</code>
          </p>
        </div>

        {/* Right Side: Standard Login Form */}
        <div className="p-8 sm:p-12 flex flex-col justify-center bg-white dark:bg-zinc-900">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Sign In with Credentials</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Enter your account credentials to access your workspaces.
            </p>
          </div>

          {errorMessage && (
            <div className="mt-6 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50/70 py-2.5 pl-10 pr-4 text-sm text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-zinc-200/80 bg-zinc-50/70 py-2.5 pl-10 pr-10 text-sm text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 active:scale-[0.98] transition-all"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {isSubmitting ? "Authenticating..." : "Sign In to Workspace"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

