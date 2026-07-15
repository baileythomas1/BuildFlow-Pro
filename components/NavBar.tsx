"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export function NavBar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="flex items-center justify-between border-b border-slate/10 bg-white px-6 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-heading text-lg font-semibold text-navy">
          BuildFlow Pro
        </Link>
        <Link href="/projects" className="text-sm font-medium text-slate hover:text-navy">
          Projects
        </Link>
      </div>
      <div className="flex items-center gap-4 text-sm">
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
