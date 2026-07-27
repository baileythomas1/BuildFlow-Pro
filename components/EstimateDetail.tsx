"use client";

import { useEffect, useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/Badge";
import { estimateStatusBadge } from "@/lib/estimates/badges";
import { spaceGrotesk, ibmPlexMono, inter } from "@/lib/fonts";
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
const LINE_ITEM_GRID = "grid grid-cols-[minmax(0,1fr)_70px_100px_100px_120px_88px] gap-4 items-center";

const INPUT_CLASS = `${inter.className} h-8 w-full rounded border border-[#DCE4EC] bg-white px-3 text-[13px] text-[#1E293B] outline-none placeholder:text-[#5B6B7F] focus:border-sky`;

export function EstimateDetail({
  estimateId,
  accessToken,
  onClose,
  onArchived,
  onLoaded,
}: {
  estimateId: string;
  accessToken: string | null;
  onClose: () => void;
  onArchived: () => void;
  onLoaded?: (estimate: EstimateDetailType) => void;
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
        onLoaded?.(data.estimate);
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
    <div className="mx-auto flex w-full max-w-[820px] flex-col items-start">
      <button onClick={onClose} className={`${inter.className} text-[13px] text-sky hover:underline`}>
        &larr; Back to Estimates
      </button>

      <div className="mt-[17px] flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {editable ? (
            <input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleSaveTitle}
              placeholder="Untitled Estimate"
              className={`${spaceGrotesk.className} -mx-1 rounded px-1 text-[28px] text-navy outline-none placeholder:text-navy/30 focus:ring-1 focus:ring-sky`}
            />
          ) : (
            <h2 className={`${spaceGrotesk.className} text-[28px] text-navy`}>
              {estimate.title || "Untitled Estimate"}
            </h2>
          )}
          <Badge label={badge.label} tone={badge.tone} />
        </div>
        <button
          onClick={handleDownloadPdf}
          className={`${inter.className} shrink-0 text-[13px] text-sky hover:underline`}
        >
          Download PDF
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {estimate.archivedAt && (
        <p className={`${inter.className} mt-3 rounded-md bg-[#F4F7FA] px-3 py-2 text-sm text-[#5B6B7F]`}>
          Archived
        </p>
      )}

      <div className="mt-[17px] w-full rounded-md border border-[#DCE4EC] bg-white px-6 py-8">
        <div className={`${LINE_ITEM_GRID} ${inter.className} border-b border-[#DCE4EC] pb-3 text-[13px] font-medium text-[#5B6B7F]`}>
          <span>Description</span>
          <span>Qty</span>
          <span>Unit Cost</span>
          <span>Markup %</span>
          <span>Line Total</span>
          <span />
        </div>

        {estimate.lineItems.map((item) => (
          <div key={item.id} className={`${LINE_ITEM_GRID} border-b border-[#DCE4EC] py-3`}>
            <span className={`${inter.className} text-sm text-[#1E293B]`}>{item.description}</span>
            <span className={`${ibmPlexMono.className} text-[13px] text-[#1E293B]`}>{item.quantity}</span>
            <span className={`${ibmPlexMono.className} text-[13px] text-[#1E293B]`}>{money(item.unitCost)}</span>
            <span className={`${ibmPlexMono.className} text-[13px] text-[#1E293B]`}>{item.markup}%</span>
            <span className={`${ibmPlexMono.className} text-[13px] text-[#1E293B]`}>
              {money(lineTotal(item.quantity, item.unitCost, item.markup))}
            </span>
            {editable ? (
              <button
                onClick={() => handleDeleteLineItem(item.id)}
                disabled={busy}
                className={`${inter.className} justify-self-end text-[13px] text-[#B54A3A] hover:underline disabled:opacity-50`}
              >
                Remove
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}

        <p className={`${inter.className} pt-4 text-right text-base text-navy`}>
          Total:{" "}
          <span className={`${ibmPlexMono.className} font-medium`}>{money(estimate.total)}</span>
        </p>

        {editable && (
          <form onSubmit={handleAddLineItem} className={`${LINE_ITEM_GRID} mt-4 border-t border-[#DCE4EC] pt-4`}>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              required
              className={INPUT_CLASS}
            />
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Qty"
              type="number"
              step="0.01"
              required
              className={INPUT_CLASS}
            />
            <input
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="Unit cost"
              type="number"
              step="0.01"
              required
              className={INPUT_CLASS}
            />
            <input
              value={markup}
              onChange={(e) => setMarkup(e.target.value)}
              placeholder="Markup %"
              type="number"
              step="0.01"
              required
              className={INPUT_CLASS}
            />
            <span className={`${ibmPlexMono.className} text-[13px] text-[#5B6B7F]`}>{previewTotal}</span>
            <button
              type="submit"
              disabled={busy}
              className={`${inter.className} flex h-8 items-center justify-center rounded bg-orange text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-50`}
            >
              Add
            </button>
          </form>
        )}
      </div>

      {!estimate.archivedAt && (estimate.status === "DRAFT" || estimate.status === "SENT") && (
        <div className="mt-[17px] flex items-center gap-2.5">
          <button
            onClick={handleToggleSend}
            disabled={busy}
            className={`${inter.className} flex h-[35px] items-center justify-center rounded bg-orange px-4 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-50`}
          >
            {estimate.status === "DRAFT" ? "Send to Client" : "Move Back to Draft"}
          </button>
          <button
            onClick={handleArchive}
            disabled={busy}
            className={`${inter.className} flex h-[35px] items-center justify-center rounded border border-[#B54A3A] bg-white px-4 text-[13px] font-bold text-[#B54A3A] hover:bg-[#B54A3A]/5 disabled:opacity-50`}
          >
            Archive
          </button>
        </div>
      )}

      {estimate.status === "APPROVED" && (
        <div className="mt-6 w-full border-t border-[#DCE4EC] pt-4">
          <h3 className={`${spaceGrotesk.className} text-base text-navy`}>Change Orders</h3>
          <p className={`${inter.className} mt-1 text-xs text-[#5B6B7F]`}>
            This estimate is locked. Any change is recorded here as a new, immutable Change Order.
          </p>

          {estimate.changeOrders.length === 0 && (
            <p className={`${inter.className} mt-3 text-sm text-[#5B6B7F]`}>No change orders yet.</p>
          )}

          {estimate.changeOrders.map((co) => (
            <div key={co.id} className="mt-3 rounded-md border border-[#DCE4EC] p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className={`${inter.className} font-medium text-[#1E293B]`}>{co.description}</span>
                <span className={`${ibmPlexMono.className} font-medium text-navy`}>{money(co.total)}</span>
              </div>
              <p className={`${inter.className} mt-1 text-xs text-[#5B6B7F]`}>
                By {co.createdBy.name} on {new Date(co.createdAt).toLocaleDateString()}
              </p>
              <ul className={`${inter.className} mt-2 space-y-1 text-xs text-[#5B6B7F]`}>
                {co.lineItems.map((li) => (
                  <li key={li.id}>
                    {li.description} — {li.quantity} &times; {money(li.unitCost)} (+{li.markup}%) ={" "}
                    {money(lineTotal(li.quantity, li.unitCost, li.markup))}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <form onSubmit={handleCreateChangeOrder} className="mt-4 rounded-md border border-[#DCE4EC] p-3">
            <p className={`${inter.className} text-xs font-medium text-[#5B6B7F]`}>New change order</p>
            <input
              value={coDescription}
              onChange={(e) => setCoDescription(e.target.value)}
              placeholder="Reason for the change"
              required
              className={`${INPUT_CLASS} mt-2`}
            />
            {coLineItems.map((item, index) => (
              <div key={index} className="mt-2 flex flex-wrap gap-2">
                <input
                  value={item.description}
                  onChange={(e) => updateCoLineItem(index, "description", e.target.value)}
                  placeholder="Description"
                  required
                  className={`${INPUT_CLASS} min-w-[140px] flex-1`}
                />
                <input
                  value={item.quantity}
                  onChange={(e) => updateCoLineItem(index, "quantity", e.target.value)}
                  type="number"
                  step="0.01"
                  required
                  className={`${INPUT_CLASS} w-16`}
                />
                <input
                  value={item.unitCost}
                  onChange={(e) => updateCoLineItem(index, "unitCost", e.target.value)}
                  placeholder="Unit cost"
                  type="number"
                  step="0.01"
                  required
                  className={`${INPUT_CLASS} w-24`}
                />
                <input
                  value={item.markup}
                  onChange={(e) => updateCoLineItem(index, "markup", e.target.value)}
                  placeholder="Markup %"
                  type="number"
                  step="0.01"
                  required
                  className={`${INPUT_CLASS} w-20`}
                />
              </div>
            ))}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setCoLineItems((prev) => [...prev, { description: "", quantity: "1", unitCost: "", markup: "0" }])
                }
                className={`${inter.className} text-xs text-sky hover:underline`}
              >
                + Add another line
              </button>
            </div>
            <button
              type="submit"
              disabled={busy}
              className={`${inter.className} mt-3 flex h-8 items-center justify-center rounded bg-orange px-4 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-50`}
            >
              Create Change Order
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
