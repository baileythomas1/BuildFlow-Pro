"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/Badge";
import type { FileVisibilityValue, ProjectFile } from "@/lib/files/types";

const VISIBILITY_LABEL: Record<FileVisibilityValue, { label: string; tone: "slate" | "sky" }> = {
  INTERNAL: { label: "Internal", tone: "slate" },
  CLIENT: { label: "Client-visible", tone: "sky" },
};

const TYPE_OPTIONS = ["Contract", "Permit", "Photo", "Other"];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export function FileList({ projectId, accessToken }: { projectId: string; accessToken: string | null }) {
  const [files, setFiles] = useState<ProjectFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [type, setType] = useState(TYPE_OPTIONS[0]);
  const [visibility, setVisibility] = useState<FileVisibilityValue>("INTERNAL");
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  function loadFiles() {
    apiFetch<{ files: ProjectFile[] }>(`/api/projects/${projectId}/files`, accessToken)
      .then((data) => setFiles(data.files))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load files"));
  }

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, accessToken]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      form.append("type", type);
      form.append("visibility", visibility);

      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

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

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <form
        onSubmit={handleUpload}
        className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-slate/10 bg-white p-3"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="file-upload-input" className="text-xs font-medium text-slate/60">
            File
          </label>
          <input
            id="file-upload-input"
            ref={fileInputRef}
            type="file"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate/60">
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-md border border-slate/20 px-2 py-1.5 text-sm text-slate outline-none focus:border-sky"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate/60">
          Visibility
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as FileVisibilityValue)}
            className="rounded-md border border-slate/20 px-2 py-1.5 text-sm text-slate outline-none focus:border-sky"
          >
            <option value="INTERNAL">Internal</option>
            <option value="CLIENT">Client-visible</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={!selectedFile || uploading}
          className="rounded-md bg-orange px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>

      {files === null && <p className="text-slate/60">Loading files...</p>}
      {files !== null && files.length === 0 && <p className="text-slate/60">No files yet.</p>}

      {files !== null && files.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate/10 text-slate/60">
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Uploader</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Visibility</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const v = VISIBILITY_LABEL[file.visibility];
                return (
                  <tr key={file.id} className="border-b border-slate/5 last:border-0">
                    <td className="px-4 py-2 text-slate">{file.type}</td>
                    <td className="px-4 py-2 text-slate/70">{file.uploader.name}</td>
                    <td className="px-4 py-2 text-slate/70">{formatDate(file.createdAt)}</td>
                    <td className="px-4 py-2">
                      <Badge label={v.label} tone={v.tone} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleView(file.id)}
                        disabled={openingId === file.id}
                        className="text-sky hover:underline disabled:opacity-50"
                      >
                        {openingId === file.id ? "Opening..." : "View"}
                      </button>
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
