"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { NotificationBell } from "@/components/NotificationBell";
import { spaceGrotesk, ibmPlexMono, inter } from "@/lib/fonts";

// PRD 8: Dashboard is Owner/Admin/PM; Employees is Owner/Admin only.
const DASHBOARD_ROLES = ["OWNER", "ADMIN", "PM"];
const EMPLOYEES_ROLES = ["OWNER", "ADMIN"];

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`${inter.className} flex h-[23px] items-start pb-1 text-sm text-white ${
        active
          ? "border-b-2 border-orange font-medium"
          : "border-b-2 border-transparent font-normal opacity-75 hover:opacity-100"
      }`}
    >
      {label}
    </Link>
  );
}

export function NavBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // The portal has its own minimal mobile header + bottom tab bar
  // (app/portal/layout.tsx) — stacking this desktop-oriented bar on top of
  // it would eat into the limited screen space the persona is on (PRD 9.6:
  // "homeowners will check this primarily from their phones").
  if (!user || pathname.startsWith("/portal")) return null;

  return (
    <header className="flex items-center justify-between bg-navy px-8 py-4">
      <div className="flex items-center gap-10">
        <Link href="/" className={`${spaceGrotesk.className} text-[17px] text-white`}>
          BuildFlow Pro
        </Link>
        <nav className="flex items-start gap-7">
          {DASHBOARD_ROLES.includes(user.role) && (
            <NavLink href="/dashboard" label="Dashboard" active={pathname === "/dashboard"} />
          )}
          {user.role !== "CLIENT" && (
            <NavLink href="/projects" label="Projects" active={pathname.startsWith("/projects")} />
          )}
          {EMPLOYEES_ROLES.includes(user.role) && (
            <NavLink href="/employees" label="Employees" active={pathname.startsWith("/employees")} />
          )}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell variant="dark" />
        <span className={`${ibmPlexMono.className} text-[13px] tracking-[0.65px] text-white/70`}>
          {user.name} · {user.role}
        </span>
        <button
          onClick={() => logout()}
          className="rounded border border-white/30 px-3 py-1.5 text-[13.3px] text-white hover:bg-white/10"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
