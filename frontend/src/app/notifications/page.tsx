"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Clock,
  Filter,
  Inbox,
} from "lucide-react";

export default function NotificationsPage() {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useSocket();

  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");

  const filteredNotifications =
    filter === "UNREAD"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-zinc-900 dark:text-white">Notifications</h1>
              <p className="text-xs text-zinc-500">
                Real-time activity updates, assignments, status changes, and mentions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 transition-colors"
            >
              <CheckCheck className="h-4 w-4 text-blue-600" />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <button
          onClick={() => setFilter("ALL")}
          className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
            filter === "ALL"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          All ({notifications.length})
        </button>

        <button
          onClick={() => setFilter("UNREAD")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
            filter === "UNREAD"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                filter === "UNREAD"
                  ? "bg-white text-blue-600"
                  : "bg-red-600 text-white"
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      <div className="rounded-3xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-400 dark:bg-zinc-800">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              {filter === "UNREAD" ? "No unread notifications" : "No notifications yet"}
            </h3>
            <p className="text-xs text-zinc-500">
              When tasks are assigned to you or updated, notifications will show here in real time.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start justify-between gap-4 p-5 transition-colors ${
                notif.isRead
                  ? "opacity-80 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40"
                  : "bg-blue-50/30 hover:bg-blue-50/50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div
                  className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold ${
                    notif.isRead
                      ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                      : "bg-blue-600 text-white shadow-xs"
                  }`}
                >
                  <Bell className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(notif.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {notif.link && (
                  <Link
                    href={notif.link}
                    onClick={() => markNotificationRead(notif.id)}
                    className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-blue-400 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <span>View</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}

                {!notif.isRead && (
                  <button
                    onClick={() => markNotificationRead(notif.id)}
                    className="rounded-xl p-2 text-zinc-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 transition-colors"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
