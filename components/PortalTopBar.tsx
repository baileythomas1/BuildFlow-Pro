"use client";

import { usePortal } from "@/components/PortalProvider";
import { NotificationBell } from "@/components/NotificationBell";
import { spaceGrotesk, ibmPlexMono } from "@/lib/fonts";

export function PortalTopBar({ onLogout }: { onLogout: () => void }) {
  const { overview } = usePortal();

  return (
    <header className="bg-navy px-5 py-[13px]">
      <div className="flex items-center justify-between">
        <span className={`${spaceGrotesk.className} text-[19px] text-white`}>BuildFlow Pro</span>
        <div className="flex items-center gap-3">
          <NotificationBell variant="dark" />
          <button onClick={onLogout} className="text-sm font-medium text-white/70 hover:text-white">
            Log out
          </button>
        </div>
      </div>
      {overview && (
        <h1 className={`${ibmPlexMono.className} mt-1 text-[12px] uppercase tracking-[0.5px] text-white/75`}>
          {overview.project.name} &middot; {overview.project.address}
        </h1>
      )}
    </header>
  );
}
