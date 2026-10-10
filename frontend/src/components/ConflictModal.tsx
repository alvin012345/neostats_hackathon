"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowRight, X, GitCompare } from "lucide-react";
import { Task } from "../types";

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverTask: Task | null;
  attemptedData: {
    title?: string;
    description?: string | null;
    status?: string;
    priority?: string;
  };
  onReloadLatest: () => void;
  onForceOverwrite: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  onClose,
  serverTask,
  attemptedData,
  onReloadLatest,
  onForceOverwrite,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !serverTask) return null;

  const isTitleDiff = attemptedData.title !== undefined && attemptedData.title !== serverTask.title;
  const isStatusDiff = attemptedData.status !== undefined && attemptedData.status !== serverTask.status;
  const isPriorityDiff = attemptedData.priority !== undefined && attemptedData.priority !== serverTask.priority;
  const isDescDiff =
    attemptedData.description !== undefined && attemptedData.description !== (serverTask.description || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-2xl border border-amber-200/80 dark:border-amber-900/40">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
            <div className="rounded-2xl bg-amber-100 dark:bg-amber-950/50 p-3">
              <AlertTriangle className="h-6 w-6 text-amber-700 dark:text-amber-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Concurrent Update Conflict (HTTP 409)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Another collaborator committed modifications while you were editing this task.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 active:scale-[0.98] transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Side-by-side comparison */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Server Version */}
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-4 space-y-2">
            <div className="flex items-center justify-between font-semibold text-emerald-700 dark:text-emerald-300 border-b border-emerald-200/60 dark:border-emerald-900/40 pb-2">
              <span>Latest Server Version</span>
              <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-emerald-800 dark:text-emerald-200">
                v{serverTask.version}
              </span>
            </div>
            <div className="space-y-1.5 text-zinc-700 dark:text-zinc-300">
              <div className={isTitleDiff ? "rounded bg-amber-100/70 dark:bg-amber-950/40 p-1 font-semibold" : ""}>
                <span className="text-zinc-400 dark:text-zinc-500">Title:</span>{" "}
                <span className="font-semibold text-zinc-900 dark:text-white">{serverTask.title}</span>
              </div>
              <div className={isStatusDiff ? "rounded bg-amber-100/70 dark:bg-amber-950/40 p-1 font-semibold" : ""}>
                <span className="text-zinc-400 dark:text-zinc-500">Status:</span>{" "}
                <span className="font-medium">{serverTask.status}</span>
              </div>
              <div className={isPriorityDiff ? "rounded bg-amber-100/70 dark:bg-amber-950/40 p-1 font-semibold" : ""}>
                <span className="text-zinc-400 dark:text-zinc-500">Priority:</span>{" "}
                <span className="font-medium">{serverTask.priority}</span>
              </div>
              {serverTask.description && (
                <div className={`truncate ${isDescDiff ? "rounded bg-amber-100/70 dark:bg-amber-950/40 p-1" : ""}`}>
                  <span className="text-zinc-400 dark:text-zinc-500">Desc:</span> {serverTask.description}
                </div>
              )}
            </div>
          </div>

          {/* Attempted Version */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20 p-4 space-y-2">
            <div className="flex items-center justify-between font-semibold text-amber-700 dark:text-amber-300 border-b border-amber-200/60 dark:border-amber-900/40 pb-2">
              <span>Your Unsaved Changes</span>
              <span className="rounded bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-amber-800 dark:text-amber-200">
                Stale v{serverTask.version - 1 > 0 ? serverTask.version - 1 : 1}
              </span>
            </div>
            <div className="space-y-1.5 text-zinc-700 dark:text-zinc-300">
              <div className={isTitleDiff ? "rounded bg-amber-200/80 dark:bg-amber-900/60 p-1 font-semibold" : ""}>
                <span className="text-zinc-400 dark:text-zinc-500">Title:</span>{" "}
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {attemptedData.title || serverTask.title}
                </span>
              </div>
              <div className={isStatusDiff ? "rounded bg-amber-200/80 dark:bg-amber-900/60 p-1 font-semibold" : ""}>
                <span className="text-zinc-400 dark:text-zinc-500">Status:</span>{" "}
                <span className="font-medium">{attemptedData.status || serverTask.status}</span>
              </div>
              <div className={isPriorityDiff ? "rounded bg-amber-200/80 dark:bg-amber-900/60 p-1 font-semibold" : ""}>
                <span className="text-zinc-400 dark:text-zinc-500">Priority:</span>{" "}
                <span className="font-medium">{attemptedData.priority || serverTask.priority}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Resolution Buttons */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 active:scale-[0.98] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onReloadLatest}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Discard &amp; Reload</span>
          </button>
          <button
            onClick={onForceOverwrite}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 active:scale-[0.98] transition-all"
          >
            <ArrowRight className="h-4 w-4" />
            <span>Overwrite</span>
          </button>
        </div>
      </div>
    </div>
  );
};
