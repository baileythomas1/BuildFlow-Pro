"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Employee, EmployeeRoleValue } from "@/lib/employees/types";

const ROLE_OPTIONS: EmployeeRoleValue[] = ["OWNER", "ADMIN", "PM", "EMPLOYEE", "CLIENT"];

export function EmployeeRow({
  employee,
  isSelf,
  availableProjects,
  accessToken,
  onChanged,
}: {
  employee: Employee;
  isSelf: boolean;
  availableProjects: { id: string; name: string }[];
  accessToken: string | null;
  onChanged: () => void;
}) {
  const [role, setRole] = useState(employee.role);
  const [hourlyRate, setHourlyRate] = useState(employee.hourlyRate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addingProjectId, setAddingProjectId] = useState("");

  const unassignedProjects = availableProjects.filter(
    (p) => !employee.assignedProjects.some((ap) => ap.id === p.id)
  );

  async function handleRoleChange(next: EmployeeRoleValue) {
    setRole(next);
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/api/employees/${employee.id}`, accessToken, {
        method: "PATCH",
        body: JSON.stringify({ role: next }),
      });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
      setRole(employee.role);
    } finally {
      setBusy(false);
    }
  }

  async function handleRateSave() {
    if (hourlyRate === (employee.hourlyRate ?? "")) return;
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/api/employees/${employee.id}`, accessToken, {
        method: "PATCH",
        body: JSON.stringify({ hourlyRate: hourlyRate || null }),
      });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update rate");
      setHourlyRate(employee.hourlyRate ?? "");
    } finally {
      setBusy(false);
    }
  }

  async function handleAssign(projectId: string) {
    if (!projectId) return;
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/api/employees/${employee.id}/assignments`, accessToken, {
        method: "POST",
        body: JSON.stringify({ projectId }),
      });
      setAddingProjectId("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign project");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnassign(projectId: string) {
    setError(null);
    setBusy(true);
    try {
      await apiFetch(`/api/employees/${employee.id}/assignments/${projectId}`, accessToken, {
        method: "DELETE",
      });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unassign project");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-b border-slate/5 align-top last:border-0">
      <td className="px-4 py-3">
        <p className="font-medium text-slate">{employee.name}</p>
        <p className="text-xs text-slate/50">{employee.email}</p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
      <td className="px-4 py-3">
        {isSelf ? (
          <span className="text-slate/60">{role}</span>
        ) : (
          <select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value as EmployeeRoleValue)}
            disabled={busy}
            className="rounded-md border border-slate/20 px-2 py-1 text-sm outline-none focus:border-sky disabled:opacity-50"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}
      </td>
      <td className="px-4 py-3">
        {isSelf ? (
          <span className="text-slate/60">{employee.hourlyRate ? `$${employee.hourlyRate}/hr` : "—"}</span>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-slate/50">$</span>
            <input
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              onBlur={handleRateSave}
              type="number"
              step="0.01"
              placeholder="—"
              className="w-20 rounded-md border border-slate/20 px-2 py-1 text-sm outline-none focus:border-sky"
            />
            <span className="text-slate/50">/hr</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {isSelf ? (
          <span className="text-xs text-slate/50">Manage from the roster as another Owner/Admin</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {employee.assignedProjects.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 rounded-full bg-slate/10 px-2 py-0.5 text-xs text-slate"
              >
                {p.name}
                <button
                  onClick={() => handleUnassign(p.id)}
                  disabled={busy}
                  aria-label={`Remove ${p.name}`}
                  className="text-slate/40 hover:text-red-600 disabled:opacity-50"
                >
                  &times;
                </button>
              </span>
            ))}
            {unassignedProjects.length > 0 && (
              <select
                value={addingProjectId}
                onChange={(e) => handleAssign(e.target.value)}
                disabled={busy}
                className="rounded-md border border-slate/20 px-1.5 py-0.5 text-xs text-slate/60 outline-none focus:border-sky disabled:opacity-50"
              >
                <option value="">+ Assign</option>
                {unassignedProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
