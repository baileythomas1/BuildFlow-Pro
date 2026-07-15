"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { NotificationBell } from "@/components/NotificationBell";

// PRD 8: Dashboard is Owner/Admin/PM; Employees is Owner/Admin only.
const DASHBOARD_ROLES = ["OWNER", "ADMIN", "PM"];
const EMPLOYEES_ROLES = ["OWNER", "ADMIN"];

export function NavBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // The portal has its own minimal mobile header + bottom tab bar
  // (app/portal/layout.tsx) — stacking this desktop-oriented bar on top of
  // it would eat into the limited screen space the persona is on (PRD 9.6:
  // "homeowners will check this primarily from their phones").
  if (!user || pathname.startsWith("/portal")) return null;

  return (
    <header className="flex items-center justify-between border-b border-slate/10 bg-white px-6 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-heading text-lg font-semibold text-navy">
          BuildFlow Pro
        </Link>
        {DASHBOARD_ROLES.includes(user.role) && (
          <Link href="/dashboard" className="text-sm font-medium text-slate hover:text-navy">
            Dashboard
          </Link>
        )}
        {user.role !== "CLIENT" && (
          <Link href="/projects" className="text-sm font-medium text-slate hover:text-navy">
            Projects
          </Link>
        )}
        {EMPLOYEES_ROLES.includes(user.role) && (
          <Link href="/employees" className="text-sm font-medium text-slate hover:text-navy">
            Employees
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm">
        <NotificationBell />
        <span className="text-slate/70">
          {user.name} <span className="text-slate/40">&middot;</span> {user.role}
        </span>
        <button
          onClick={() => logout()}
          className="rounded-md border border-slate/20 px-3 py-1.5 font-medium text-slate hover:border-slate/40"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
