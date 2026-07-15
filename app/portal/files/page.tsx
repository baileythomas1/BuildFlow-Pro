"use client";

import { useEffect, useState } from "react";
import { usePortal } from "@/components/PortalProvider";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api-client";
import type { PortalFile } from "@/lib/portal/types";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function PortalFilesPage() {
  const { accessToken } = useAuth();
  const { projectId, loading: portalLoading } = usePortal();
  const [files, setFiles] = useState<PortalFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    apiFetch<{ files: PortalFile[] }>(`/api/projects/${projectId}/files`, accessToken)
      .then((data) => setFiles(data.files))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load files"));
  }, [projectId, accessToken]);

  async function handleView(fileId: string) {
    setOpeningId(fileId);
    setError(null);
    try {
      const { url } = await apiFetch<{ url: string }>(`/api/files/${fileId}`, accessToken);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open file");
    } finally {
      setOpeningId(null);
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
      <h1 className="text-xl font-semibold text-navy">Files</h1>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {files === null && !error && <p className="mt-3 text-slate/60">Loading files...</p>}
      {files !== null && files.length === 0 && <p className="mt-3 text-slate/60">No files shared yet.</p>}

      {files !== null && files.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between rounded-lg border border-slate/10 bg-white p-3"
            >
              <div>
                <p className="text-sm font-medium text-slate">{file.type}</p>
                <p className="text-xs text-slate/50">
                  {file.uploader.name} &middot; {formatDate(file.createdAt)}
                </p>
              </div>
              <button
                onClick={() => handleView(file.id)}
                disabled={openingId === file.id}
                className="text-sm text-sky hover:underline disabled:opacity-50"
              >
                {openingId === file.id ? "Opening..." : "View"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
