"use client";

import React, { useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import { X } from "lucide-react";

export const Toast: React.FC = () => {
  const { activeToast, dismissToast } = useSocket();

  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        dismissToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeToast, dismissToast]);

  if (!activeToast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border border-blue-200 bg-white p-4 shadow-xl ring-1 ring-black/5 dark:border-blue-900 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-zinc-900 dark:text-white leading-relaxed">
          {activeToast}
        </p>
        <button
          onClick={dismissToast}
          className="rounded p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
