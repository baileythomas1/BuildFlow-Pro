"use client";

import { useEffect, useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/Badge";
import { FormField } from "@/components/FormField";
import { SectionDivider } from "@/components/SectionDivider";
import { invoiceStatusBadge } from "@/lib/invoices/badges";
import { ibmPlexMono, inter } from "@/lib/fonts";
import type { Invoice } from "@/lib/invoices/types";

function money(value: string) {
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export function InvoiceList({ projectId, accessToken }: { projectId: string; accessToken: string | null }) {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    apiFetch<{ invoices: Invoice[] }>(`/api/projects/${projectId}/invoices`, accessToken)
      .then((data) => setInvoices(data.invoices))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load invoices"));
  }

  useEffect(load, [projectId, accessToken]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/api/projects/${projectId}/invoices`, accessToken, {
        method: "POST",
        body: JSON.stringify({ description, amount, dueDate: dueDate || undefined }),
      });
      setDescription("");
      setAmount("");
      setDueDate("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePay(invoiceId: string) {
    setPayingId(invoiceId);
    setError(null);
    try {
      const { url } = await apiFetch<{ url: string }>(`/api/invoices/${invoiceId}/checkout`, accessToken, {
        method: "POST",
      });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setPayingId(null);
    }
  }

  return (
    <div className="flex w-full flex-col items-start gap-4">
      <SectionDivider
        label="Invoices"
        className="pt-7"
        action={{ label: showForm ? "Cancel" : "New Invoice", onClick: () => setShowForm((v) => !v) }}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="flex w-full flex-wrap items-end gap-3 rounded-md border border-[#DCE4EC] bg-white p-3"
        >
          <div className="min-w-[180px] flex-1">
            <FormField label="Description" value={description} onChange={setDescription} required />
          </div>
          <div className="w-32">
            <FormField label="Amount" type="number" value={amount} onChange={setAmount} required />
          </div>
          <div className="w-40">
            <FormField label="Due date" type="date" value={dueDate} onChange={setDueDate} />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex h-10 items-center justify-center rounded bg-orange px-4 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create"}
          </button>
        </form>
      )}

      {invoices === null && <p className="text-slate/60">Loading invoices...</p>}
      {invoices !== null && invoices.length === 0 && <p className="text-slate/60">No invoices yet.</p>}

      {invoices !== null && invoices.length > 0 && (
        <div className="w-full overflow-x-auto rounded-md border border-[#DCE4EC] bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#DCE4EC]">
                <th className={`${inter.className} px-5 pb-[13px] pt-3 text-[11px] font-medium uppercase tracking-[0.44px] text-[#5B6B7F]`}>
                  Description
                </th>
                <th className={`${inter.className} px-5 pb-[13px] pt-3 text-[11px] font-medium uppercase tracking-[0.44px] text-[#5B6B7F]`}>
                  Amount
                </th>
                <th className={`${inter.className} px-5 pb-[13px] pt-3 text-[11px] font-medium uppercase tracking-[0.44px] text-[#5B6B7F]`}>
                  Status
                </th>
                <th className={`${inter.className} px-5 pb-[13px] pt-3 text-[11px] font-medium uppercase tracking-[0.44px] text-[#5B6B7F]`}>
                  Due
                </th>
                <th className="px-5 pb-[13px] pt-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const badge = invoiceStatusBadge(invoice.status);
                return (
                  <tr key={invoice.id} className="border-b border-[#DCE4EC] last:border-0">
                    <td className={`${inter.className} px-5 py-[17px] text-[13px] text-[#1E293B]`}>
                      {invoice.description}
                    </td>
                    <td className={`${ibmPlexMono.className} px-5 py-[16.5px] text-[13px] text-[#1E293B]`}>
                      {money(invoice.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge label={badge.label} tone={badge.tone} />
                    </td>
                    <td className={`${ibmPlexMono.className} px-5 py-[16.5px] text-[13px] text-[#1E293B]`}>
                      {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-[17px] text-right">
                      {invoice.status !== "PAID" && (
                        <button
                          onClick={() => handlePay(invoice.id)}
                          disabled={payingId === invoice.id}
                          className={`${inter.className} text-[12px] font-semibold text-sky hover:underline disabled:opacity-50`}
                        >
                          {payingId === invoice.id ? "Opening..." : "Pay via Stripe"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
