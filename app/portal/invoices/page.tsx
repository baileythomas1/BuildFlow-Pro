"use client";

import { useEffect, useState } from "react";
import { usePortal } from "@/components/PortalProvider";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/Badge";
import { invoiceStatusBadge } from "@/lib/invoices/badges";
import type { PortalInvoice } from "@/lib/portal/types";

function money(value: string) {
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function PortalInvoicesPage() {
  const { accessToken } = useAuth();
  const { projectId, loading: portalLoading } = usePortal();
  const [invoices, setInvoices] = useState<PortalInvoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    apiFetch<{ invoices: PortalInvoice[] }>(`/api/projects/${projectId}/invoices`, accessToken)
      .then((data) => setInvoices(data.invoices))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load invoices"));
  }, [projectId, accessToken]);

  // Full-page navigation, not a new tab — on mobile, jumping straight to
  // Stripe's hosted page (which redirects back to us on success/cancel) is
  // the natural pattern; a popup tab is a desktop habit that doesn't fit.
  async function handlePay(invoiceId: string) {
    setPayingId(invoiceId);
    setError(null);
    try {
      const { url } = await apiFetch<{ url: string }>(`/api/invoices/${invoiceId}/checkout`, accessToken, {
        method: "POST",
      });
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
      setPayingId(null);
    }
  }

  if (portalLoading) {
    return (
      <main className="px-4 py-6">
        <p className="text-slate/60">Loading...</p>
      </main>
    );
  }

  return (
    <main className="px-4 py-6">
      <h1 className="text-xl font-semibold text-navy">Invoices</h1>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {invoices === null && !error && <p className="mt-3 text-slate/60">Loading invoices...</p>}
      {invoices !== null && invoices.length === 0 && (
        <p className="mt-3 text-slate/60">No invoices yet.</p>
      )}

      {invoices !== null && invoices.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {invoices.map((invoice) => {
            const badge = invoiceStatusBadge(invoice.status);
            return (
              <li key={invoice.id} className="rounded-lg border border-slate/10 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate">{invoice.description}</p>
                    <p className="mt-1 text-xs text-slate/50">Due {formatDate(invoice.dueDate)}</p>
                  </div>
                  <Badge label={badge.label} tone={badge.tone} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-semibold text-navy">{money(invoice.amount)}</span>
                  {invoice.status !== "PAID" && (
                    <button
                      onClick={() => handlePay(invoice.id)}
                      disabled={payingId === invoice.id}
                      className="rounded-md bg-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {payingId === invoice.id ? "Opening..." : "Pay Now"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
