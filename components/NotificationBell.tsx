"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api-client";
import { formatNotification } from "@/lib/notifications/format";
import type { NotificationItem } from "@/lib/notifications/types";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotificationBell({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { accessToken } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  function load() {
    apiFetch<{ notifications: NotificationItem[]; unreadCount: number }>("/api/notifications", accessToken)
      .then((data) => {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      })
      .catch(() => {
        // Non-fatal: the bell just stays at its last known state.
      });
  }

  useEffect(load, [accessToken]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpen() {
    setOpen((v) => !v);
  }

  async function handleMarkRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await apiFetch(`/api/notifications/${id}/read`, accessToken, { method: "PATCH" });
    } catch {
      load(); // reconcile with the server if the optimistic update was wrong
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className={`relative rounded-md p-1.5 ${
          variant === "dark" ? "text-white/70 hover:text-white" : "text-slate/60 hover:text-slate"
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-slate/10 bg-white shadow-lg">
          <div className="border-b border-slate/10 px-4 py-2 text-sm font-semibold text-navy">Notifications</div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate/50">No notifications yet.</p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleMarkRead(n.id)}
                className={`block w-full border-b border-slate/5 px-4 py-3 text-left text-sm last:border-0 hover:bg-off-white ${
                  n.readAt ? "text-slate/60" : "font-medium text-slate"
                }`}
              >
                <p>{formatNotification(n)}</p>
                <p className="mt-1 text-xs text-slate/40">{formatDateTime(n.createdAt)}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
