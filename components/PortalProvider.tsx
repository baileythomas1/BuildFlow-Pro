"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/AuthProvider";
import type { PortalOverview } from "@/lib/portal/types";

type PortalContextValue = {
  projectId: string | null;
  overview: PortalOverview | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

const PortalContext = createContext<PortalContextValue | null>(null);

// Fetches /api/portal/overview once and shares the result (notably
// project.id) across every portal sub-page, so Files/Invoices/Messages
// don't each have to re-resolve which project belongs to this homeowner.
export function PortalProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const [overview, setOverview] = useState<PortalOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // loading starts true (initial state) and only ever goes false once the
  // first fetch settles; reload() re-fetches in place without re-showing a
  // spinner, same as every other list component in this app.
  const load = useCallback(() => {
    apiFetch<PortalOverview>("/api/portal/overview", accessToken)
      .then((data) => {
        setOverview(data);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load your project"))
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(load, [load]);

  return (
    <PortalContext.Provider
      value={{ projectId: overview?.project.id ?? null, overview, loading, error, reload: load }}
    >
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal must be used within a PortalProvider");
  return ctx;
}
