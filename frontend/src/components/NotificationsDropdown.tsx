"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useSocket } from "../context/SocketContext";

export const NotificationsDropdown: React.FC = () => {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-xl p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white active:scale-[0.98] transition-all"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-900 tabular-nums">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-2xl z-50 dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 px-1 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm text-zinc-900 dark:text-white">Notifications</h4>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 tabular-nums border border-blue-200/60 dark:border-blue-900/60">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 active:scale-[0.98] transition-all"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="mt-2 max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                <Bell className="mx-auto h-5 w-5 mb-1.5 opacity-40" />
                All caught up! No notifications.
              </div>
            ) : (
              notifications.slice(0, 15).map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors ${
                    notif.isRead
                      ? "opacity-75 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      : "bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white leading-snug">
                      {notif.title}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="mt-1 block text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {notif.link && (
                      <Link
                        href={notif.link}
                        onClick={() => {
                          markNotificationRead(notif.id);
                          setIsOpen(false);
                        }}
                        className="rounded-lg p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-800 active:scale-[0.98] transition-all"
                        title="Open task"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {!notif.isRead && (
                      <button
                        onClick={() => markNotificationRead(notif.id)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-zinc-800 active:scale-[0.98] transition-all"
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 block py-1 active:scale-[0.98] transition-all"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
