"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/use-require-auth";
import { PortalProvider } from "@/components/PortalProvider";
import { PortalNav } from "@/components/PortalNav";
import { NotificationBell } from "@/components/NotificationBell";

// CLIENT-only: any other authenticated role gets bounced to "/". There's no
// server-side check possible here (it's a client component), but every
// portal API call is independently role- and ownership-scoped, so this is
// purely a UX redirect, not the security boundary.
export default function PortalLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useRequireAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && user.role !== "CLIENT") {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== "CLIENT") {
    return (
      <main className="flex flex-1 items-center justify-center bg-off-white">
        <p className="text-slate/60">Loading...</p>
      </main>
    );
  }

  return (
    <PortalProvider>
      <div className="flex flex-1 flex-col bg-off-white">
        <header className="flex items-center justify-between border-b border-slate/10 bg-white px-4 py-3">
          <span className="font-heading text-base font-semibold text-navy">BuildFlow Pro</span>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button onClick={() => logout()} className="text-sm font-medium text-slate/60 hover:text-slate">
              Log out
            </button>
          </div>
        </header>
        <div className="mx-auto w-full max-w-md flex-1 pb-20">{children}</div>
        <PortalNav />
      </div>
    </PortalProvider>
  );
}
