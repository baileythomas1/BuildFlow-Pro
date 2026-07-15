"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/use-require-auth";
import { apiFetch } from "@/lib/api-client";
import { EmployeeRow } from "@/components/EmployeeRow";
import type { Employee } from "@/lib/employees/types";
import type { Project } from "@/lib/projects/types";

const CAN_VIEW_ROLES = ["OWNER", "ADMIN"];

export default function EmployeesPage() {
  const { user, loading: authLoading, accessToken } = useRequireAuth();
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canView = !!user && CAN_VIEW_ROLES.includes(user.role);

  function load() {
    apiFetch<{ employees: Employee[] }>("/api/employees", accessToken)
      .then((data) => setEmployees(data.employees))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load employees"));
  }

  useEffect(() => {
    if (!canView) return;
    load();
    apiFetch<{ projects: Project[] }>("/api/projects", accessToken)
      .then((data) => setProjects(data.projects))
      .catch(() => {
        // Non-fatal: the "+ Assign" picker just stays empty.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, accessToken]);

  if (authLoading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center bg-off-white">
        <p className="text-slate/60">Loading...</p>
      </main>
    );
  }

  if (!canView) {
    return (
      <main className="flex flex-1 items-center justify-center bg-off-white px-4 text-center">
        <p className="text-slate/70">You don&apos;t have permission to view the roster.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-off-white px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold text-navy">Employees</h1>
        <p className="mt-1 text-sm text-slate/60">
          Roster only — clock-in/out, PTO, and productivity reporting are Phase 2.
        </p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {employees === null && !error && <p className="mt-6 text-slate/60">Loading roster...</p>}

        {employees !== null && (
          <div className="mt-6 overflow-x-auto rounded-lg border border-slate/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate/10 text-slate/60">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Hourly Rate</th>
                  <th className="px-4 py-2 font-medium">Assigned Projects</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <EmployeeRow
                    key={employee.id}
                    employee={employee}
                    isSelf={employee.id === user.id}
                    availableProjects={projects}
                    accessToken={accessToken}
                    onChanged={load}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
