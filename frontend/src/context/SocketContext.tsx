"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { NotificationItem } from "../types";
import { api } from "../lib/api";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  reconnectCount: number;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  notifications: NotificationItem[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  activeToast: string | null;
  dismissToast: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:5000";

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get<{ data: NotificationItem[]; unreadCount: number }>("/notifications");
      setNotifications(res.data || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket = io(WS_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("[Socket.IO] Connected to real-time gateway:", newSocket.id);
      setIsConnected(true);
      setReconnectCount((c) => c + 1);
      fetchNotifications();
    });

    newSocket.on("disconnect", () => {
      console.log("[Socket.IO] Disconnected from gateway");
      setIsConnected(false);
    });

    newSocket.on("notification:new", (notif: NotificationItem) => {
      console.log("[Socket.IO] Received new notification:", notif);
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      setActiveToast(`🔔 ${notif.title}: ${notif.message}`);
    });

    setSocket(newSocket);
    fetchNotifications();

    return () => {
      newSocket.disconnect();
    };
  }, [token, fetchNotifications]);

  const joinProject = useCallback(
    (projectId: string) => {
      if (socket && isConnected) {
        socket.emit("project:join", { projectId }, (res: any) => {
          if (!res?.success) {
            console.warn(`Failed to join project room ${projectId}:`, res?.error);
          }
        });
      }
    },
    [socket, isConnected]
  );

  const leaveProject = useCallback(
    (projectId: string) => {
      if (socket && isConnected) {
        socket.emit("project:leave", { projectId });
        socket.emit("leave:project", projectId);
      }
    },
    [socket, isConnected]
  );

  const markNotificationRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  const dismissToast = () => setActiveToast(null);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        reconnectCount,
        joinProject,
        leaveProject,
        notifications,
        unreadCount,
        refreshNotifications: fetchNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        activeToast,
        dismissToast,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
