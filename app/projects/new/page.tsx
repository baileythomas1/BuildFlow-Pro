"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/use-require-auth";
import { apiFetch } from "@/lib/api-client";
import { FormField } from "@/components/FormField";
import type { Project, ProjectClient } from "@/lib/projects/types";

const CAN_MANAGE_ROLES = ["OWNER", "ADMIN", "PM"];
const NEW_CLIENT_VALUE = "__new__";

export default function NewProjectPage() {
  const { user, loading: authLoading, accessToken } = useRequireAuth();
  const router = useRouter();

  const [clients, setClients] = useState<ProjectClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(NEW_CLIENT_VALUE);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canManage = !!user && CAN_MANAGE_ROLES.includes(user.role);

  useEffect(() => {
    if (!canManage) return;
    apiFetch<{ clients: ProjectClient[] }>("/api/clients", accessToken)
      .then((data) => setClients(data.clients))
      .catch(() => {
        // Non-fatal: the form still works via "add a new client".
      });
  }, [canManage, accessToken]);

  if (authLoading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center bg-off-white">
        <p className="text-slate/60">Loading...</p>
      </main>
    );
  }

  if (!canManage) {
    return (
      <main className="flex flex-1 items-center justify-center bg-off-white px-4 text-center">
        <p className="text-slate/70">You don&apos;t have permission to create projects.</p>
      </main>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        address,
        budget,
        startDate: startDate || undefined,
        targetDate: targetDate || undefined,
      };
      if (selectedClientId === NEW_CLIENT_VALUE) {
        payload.client = { name: clientName, email: clientEmail };
      } else {
        payload.clientId = selectedClientId;
      }

      const { project } = await apiFetch<{ project: Project }>("/api/projects", accessToken, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-off-white px-4 py-16">
      <div className="w-full max-w-lg rounded-lg border border-slate/10 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-navy">New Project</h1>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <FormField label="Project name" value={name} onChange={setName} required />
          <FormField label="Address" value={address} onChange={setAddress} required />
          <FormField label="Budget" type="number" value={budget} onChange={setBudget} required />

          <div className="flex gap-4">
            <div className="flex-1">
              <FormField label="Start date" type="date" value={startDate} onChange={setStartDate} />
            </div>
            <div className="flex-1">
              <FormField
                label="Target completion date"
                type="date"
                value={targetDate}
                onChange={setTargetDate}
              />
            </div>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate">
            Client
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="rounded-md border border-slate/20 px-3 py-2 text-base font-normal text-slate outline-none focus:border-sky focus:ring-1 focus:ring-sky"
            >
              <option value={NEW_CLIENT_VALUE}>+ Add a new client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </label>

          {selectedClientId === NEW_CLIENT_VALUE && (
            <>
              <FormField label="Client name" value={clientName} onChange={setClientName} required />
              <FormField
                label="Client email"
                type="email"
                value={clientEmail}
                onChange={setClientEmail}
                required
              />
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-md bg-orange px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create project"}
          </button>
        </form>
      </div>
    </main>
  );
}
