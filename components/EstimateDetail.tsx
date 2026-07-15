"use client";

import { useEffect, useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/Badge";
import { estimateStatusBadge } from "@/lib/estimates/badges";
import type { EstimateDetail as EstimateDetailType } from "@/lib/estimates/types";

function isEditable(status: string) {
  return status === "DRAFT" || status === "SENT";
}

function money(value: string | number) {
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function lineTotal(quantity: string, unitCost: string, markup: string) {
  return Number(quantity) * Number(unitCost) * (1 + Number(markup) / 100);
}

// Shared by the header row, every line-item row, and the add-line form so
// all three line up on the same column boundaries by construction, instead
// of a <table> (auto-sized to its own rows) sitting above a separately
// flex-sized input row that happened to drift out of alignment with it.
const LINE_ITEM_GRID = "grid grid-cols-[minmax(0,1fr)_72px_104px_92px_112px_88px] gap-3 items-center";

export function EstimateDetail({
  estimateId,
  accessToken,
  onClose,
  onArchived,
}: {
  estimateId: string;
  accessToken: string | null;
  onClose: () => void;
  onArchived: () => void;
}) {
  const [estimate, setEstimate] = useState<EstimateDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [titleInput, setTitleInput] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [markup, setMarkup] = useState("0");

  const [coDescription, setCoDescription] = useState("");
  const [coLineItems, setCoLineItems] = useState([{ description: "", quantity: "1", unitCost: "", markup: "0" }]);

  function load() {
    apiFetch<{ estimate: EstimateDetailType }>(`/api/estimates/${estimateId}`, accessToken)
      .then((data) => {
        setEstimate(data.estimate);
        setTitleInput(data.estimate.title ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load estimate"));
  }

  useEffect(load, [estimateId, accessToken]);

  async function handleAddLineItem(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/api/estimates/${estimateId}/line-items`, accessToken, {
        method: "POST",
        body: JSON.stringify({ description, quantity, unitCost, markup }),
      });
      setDescription("");
      setQuantity("1");
      setUnitCost("");
      setMarkup("0");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add line item");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteLineItem(lineItemId: string) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/estimates/${estimateId}/line-items/${lineItemId}`, accessToken, {
        method: "DELETE",
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove line item");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveTitle() {
    if (!estimate) return;
    const trimmed = titleInput.trim();
    if (trimmed === (estimate.title ?? "")) return;
    setError(null);
    try {
      await apiFetch(`/api/estimates/${estimateId}`, accessToken, {
        method: "PATCH",
        body: JSON.stringify({ title: trimmed || null }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save title");
    }
  }

  async function handleToggleSend() {
    if (!estimate) return;
    const nextStatus = estimate.status === "DRAFT" ? "SENT" : "DRAFT";
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/estimates/${estimateId}`, accessToken, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    if (!window.confirm("Archive this estimate?")) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/estimates/${estimateId}`, accessToken, { method: "DELETE" });
      onArchived();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive estimate");
      setBusy(false);
    }
  }

  async function handleDownloadPdf() {
    setError(null);
    try {
      const res = await fetch(`/api/estimates/${estimateId}/pdf`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download PDF");
    }
  }

  function updateCoLineItem(index: number, field: string, value: string) {
    setCoLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  async function handleCreateChangeOrder(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/api/estimates/${estimateId}/change-orders`, accessToken, {
        method: "POST",
        body: JSON.stringify({ description: coDescription, lineItems: coLineItems }),
      });
      setCoDescription("");
      setCoLineItems([{ description: "", quantity: "1", unitCost: "", markup: "0" }]);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create change order");
    } finally {
      setBusy(false);
    }
  }

  if (!estimate) {
    return <p className="text-slate/60">Loading estimate...</p>;
  }

  const badge = estimateStatusBadge(estimate.status);
  const editable = isEditable(estimate.status) && !estimate.archivedAt;

  const previewTotal =
    unitCost && quantity ? money(lineTotal(quantity, unitCost, markup)) : "";

  return (
    <div className="rounded-lg border border-slate/10 bg-white p-5">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="text-sm text-sky hover:underline">
          &larr; Back to Estimates
        </button>
        <div className="flex items-center gap-2">
          <Badge label={badge.label} tone={badge.tone} />
          <button onClick={handleDownloadPdf} className="text-sm text-sky hover:underline">
            Download PDF
          </button>
        </div>
      </div>

      <div className="mt-3">
        {editable ? (
          <input
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleSaveTitle}
            placeholder="Untitled Estimate"
            className="-mx-1 w-full rounded-md px-1 text-xl font-semibold text-navy outline-none placeholder:text-slate/30 focus:ring-1 focus:ring-sky"
          />
        ) : (
          <h2 className="text-xl font-semibold text-navy">{estimate.title || "Untitled Estimate"}</h2>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {estimate.archivedAt && (
        <p className="mt-3 rounded-md bg-slate/5 px-3 py-2 text-sm text-slate/70">Archived</p>
      )}

      <div className="mt-4">
        <div className={`${LINE_ITEM_GRID} border-b border-slate/10 pb-2 text-sm text-slate/60`}>
          <span className="font-medium">Description</span>
          <span className="font-medium">Qty</span>
          <span className="font-medium">Unit Cost</span>
          <span className="font-medium">Markup %</span>
          <span className="font-medium">Line Total</span>
          <span />
        </div>

        {estimate.lineItems.map((item) => (
          <div key={item.id} className={`${LINE_ITEM_GRID} border-b border-slate/5 py-2 text-sm`}>
            <span className="text-slate">{item.description}</span>
            <span className="text-slate">{item.quantity}</span>
            <span className="text-slate">{money(item.unitCost)}</span>
            <span className="text-slate">{item.markup}%</span>
            <span className="text-slate">{money(lineTotal(item.quantity, item.unitCost, item.markup))}</span>
            {editable ? (
              <button
                onClick={() => handleDeleteLineItem(item.id)}
                disabled={busy}
                className="justify-self-end text-red-600 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-right text-base font-semibold text-navy">Total: {money(estimate.total)}</p>

      {editable && (
        <form onSubmit={handleAddLineItem} className={`${LINE_ITEM_GRID} mt-4 border-t border-slate/10 pt-4`}>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            required
            className="w-full rounded-md border border-slate/20 px-2 py-1.5 text-sm outline-none focus:border-sky"
          />
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Qty"
            type="number"
            step="0.01"
            required
            className="w-full rounded-md border border-slate/20 px-2 py-1.5 text-sm outline-none focus:border-sky"
          />
          <input
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder="Unit cost"
            type="number"
            step="0.01"
            required
            className="w-full rounded-md border border-slate/20 px-2 py-1.5 text-sm outline-none focus:border-sky"
          />
          <input
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            placeholder="Markup %"
            type="number"
            step="0.01"
            required
            className="w-full rounded-md border border-slate/20 px-2 py-1.5 text-sm outline-none focus:border-sky"
          />
          <span className="text-sm text-slate/50">{previewTotal}</span>
          <button
            type="submit"
            disabled={busy}
            className="justify-self-end rounded-md bg-orange px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      )}

      {!estimate.archivedAt && (estimate.status === "DRAFT" || estimate.status === "SENT") && (
        <div className="mt-4 flex gap-3 border-t border-slate/10 pt-4">
          <button
            onClick={handleToggleSend}
            disabled={busy}
            className="rounded-md bg-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {estimate.status === "DRAFT" ? "Send to Client" : "Move Back to Draft"}
          </button>
          <button
            onClick={handleArchive}
            disabled={busy}
            className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:border-red-400 disabled:opacity-50"
          >
            Archive
          </button>
        </div>
      )}

      {estimate.status === "APPROVED" && (
        <div className="mt-6 border-t border-slate/10 pt-4">
          <h3 className="text-sm font-semibold text-navy">Change Orders</h3>
          <p className="mt-1 text-xs text-slate/60">
            This estimate is locked. Any change is recorded here as a new, immutable Change Order.
          </p>

          {estimate.changeOrders.length === 0 && (
            <p className="mt-3 text-sm text-slate/60">No change orders yet.</p>
          )}

          {estimate.changeOrders.map((co) => (
            <div key={co.id} className="mt-3 rounded-md border border-slate/10 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate">{co.description}</span>
                <span className="font-semibold text-navy">{money(co.total)}</span>
              </div>
              <p className="mt-1 text-xs text-slate/50">
                By {co.createdBy.name} on {new Date(co.createdAt).toLocaleDateString()}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate/70">
                {co.lineItems.map((li) => (
                  <li key={li.id}>
                    {li.description} — {li.quantity} &times; {money(li.unitCost)} (+{li.markup}%) ={" "}
                    {money(lineTotal(li.quantity, li.unitCost, li.markup))}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <form onSubmit={handleCreateChangeOrder} className="mt-4 rounded-md border border-slate/10 p-3">
            <p className="text-xs font-medium text-slate/60">New change order</p>
            <input
              value={coDescription}
              onChange={(e) => setCoDescription(e.target.value)}
              placeholder="Reason for the change"
              required
              className="mt-2 w-full rounded-md border border-slate/20 px-2 py-1.5 text-sm outline-none focus:border-sky"
            />
            {coLineItems.map((item, index) => (
              <div key={index} className="mt-2 flex flex-wrap gap-2">
                <input
                  value={item.description}
                  onChange={(e) => updateCoLineItem(index, "description", e.target.value)}
                  placeholder="Description"
                  required
                  className="min-w-[140px] flex-1 rounded-md border border-slate/20 px-2 py-1.5 text-sm outline-none focus:border-sky"
                />
                <input
                  value={item.quantity}
                  onChange={(e) => updateCoLineItem(index, "quantity", e.target.value)}
                  type="number"
                  step="0.01"
                  required
                  className="w-16 rounded-md border border-slate/20 px-2 py-1.5 text-sm outline-none focus:border-sky"
                />
                <input
                  value={item.unitCost}
                  onChange={(e) => updateCoLineItem(index, "unitCost", e.target.value)}
                  placeholder="Unit cost"
                  type="number"
                  step="0.01"
                  required
                  className="w-24 rounded-md border border-slate/20 px-2 py-1.5 text-sm outline-none focus:border-sky"
                />
                <input
                  value={item.markup}
                  onChange={(e) => updateCoLineItem(index, "markup", e.target.value)}
                  placeholder="Markup %"
                  type="number"
                  step="0.01"
                  required
                  className="w-20 rounded-md border border-slate/20 px-2 py-1.5 text-sm outline-none focus:border-sky"
                />
              </div>
            ))}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setCoLineItems((prev) => [...prev, { description: "", quantity: "1", unitCost: "", markup: "0" }])
                }
                className="text-xs text-sky hover:underline"
              >
                + Add another line
              </button>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="mt-3 rounded-md bg-orange px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Create Change Order
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
