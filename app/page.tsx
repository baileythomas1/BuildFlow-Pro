"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function Home() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-off-white">
        <p className="text-slate/60">Loading...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-off-white px-4 text-center">
        <h1 className="text-4xl font-semibold text-navy">BuildFlow Pro</h1>
        <p className="max-w-md text-slate/70">
          Project management and client communication for residential construction companies.
        </p>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-md border border-slate/20 px-5 py-2 font-medium text-slate hover:border-slate/40"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-orange px-5 py-2 font-medium text-white hover:opacity-90"
          >
            Sign up
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-off-white px-4 text-center">
      <h1 className="text-3xl font-semibold text-navy">Welcome, {user.name}</h1>
      <p className="text-slate/70">
        Role: <span className="font-medium text-slate">{user.role}</span>
      </p>
      <button
        onClick={() => logout()}
        className="mt-2 rounded-md border border-slate/20 px-5 py-2 font-medium text-slate hover:border-slate/40"
      >
        Log out
      </button>
    </main>
  );
}
