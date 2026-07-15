"use client";

import { useEffect, useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/Badge";
import { FormField } from "@/components/FormField";
import { invoiceStatusBadge } from "@/lib/invoices/badges";
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
    <div>
      <div className="flex items-center justify-between">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="ml-auto">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-orange px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            {showForm ? "Cancel" : "New Invoice"}
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mt-3 flex flex-wrap items-end gap-3 rounded-md border border-slate/10 bg-white p-3"
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
            className="rounded-md bg-orange px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create"}
          </button>
        </form>
      )}

      {invoices === null && <p className="mt-3 text-slate/60">Loading invoices...</p>}
      {invoices !== null && invoices.length === 0 && <p className="mt-3 text-slate/60">No invoices yet.</p>}

      {invoices !== null && invoices.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate/10 text-slate/60">
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Due</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const badge = invoiceStatusBadge(invoice.status);
                return (
                  <tr key={invoice.id} className="border-b border-slate/5 last:border-0">
                    <td className="px-4 py-2 text-slate">{invoice.description}</td>
                    <td className="px-4 py-2 text-slate">{money(invoice.amount)}</td>
                    <td className="px-4 py-2">
                      <Badge label={badge.label} tone={badge.tone} />
                    </td>
                    <td className="px-4 py-2 text-slate/70">
                      {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {invoice.status !== "PAID" && (
                        <button
                          onClick={() => handlePay(invoice.id)}
                          disabled={payingId === invoice.id}
                          className="text-sky hover:underline disabled:opacity-50"
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
