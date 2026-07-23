"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/Badge";
import { ibmPlexMono, inter } from "@/lib/fonts";
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
    <div className="w-full">
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <form
        onSubmit={handleUpload}
        className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-[#DCE4EC] bg-white p-3"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="file-upload-input" className={`${inter.className} text-xs font-medium text-[#5B6B7F]`}>
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
        <label className={`${inter.className} flex flex-col gap-1 text-xs font-medium text-[#5B6B7F]`}>
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded border border-[#DCE4EC] px-2 py-1.5 text-sm text-slate outline-none focus:border-sky"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className={`${inter.className} flex flex-col gap-1 text-xs font-medium text-[#5B6B7F]`}>
          Visibility
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as FileVisibilityValue)}
            className="rounded border border-[#DCE4EC] px-2 py-1.5 text-sm text-slate outline-none focus:border-sky"
          >
            <option value="INTERNAL">Internal</option>
            <option value="CLIENT">Client-visible</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={!selectedFile || uploading}
          className="flex h-[35px] items-center justify-center rounded bg-orange px-4 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>

      {files === null && <p className="text-slate/60">Loading files...</p>}
      {files !== null && files.length === 0 && <p className="text-slate/60">No files yet.</p>}

      {files !== null && files.length > 0 && (
        <div className="w-full overflow-x-auto rounded-md border border-[#DCE4EC] bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#DCE4EC]">
                <th className={`${inter.className} px-5 pb-[13px] pt-3 text-[11px] font-medium uppercase tracking-[0.44px] text-[#5B6B7F]`}>
                  Type
                </th>
                <th className={`${inter.className} px-5 pb-[13px] pt-3 text-[11px] font-medium uppercase tracking-[0.44px] text-[#5B6B7F]`}>
                  Uploader
                </th>
                <th className={`${inter.className} px-5 pb-[13px] pt-3 text-[11px] font-medium uppercase tracking-[0.44px] text-[#5B6B7F]`}>
                  Date
                </th>
                <th className={`${inter.className} px-5 pb-[13px] pt-3 text-[11px] font-medium uppercase tracking-[0.44px] text-[#5B6B7F]`}>
                  Visibility
                </th>
                <th className="px-5 pb-[13px] pt-3"></th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const v = VISIBILITY_LABEL[file.visibility];
                return (
                  <tr key={file.id} className="border-b border-[#DCE4EC] last:border-0">
                    <td className={`${inter.className} px-5 py-[17px] text-[13px] text-[#1E293B]`}>{file.type}</td>
                    <td className={`${inter.className} px-5 py-[17px] text-[13px] text-[#1E293B]`}>
                      {file.uploader.name}
                    </td>
                    <td className={`${ibmPlexMono.className} px-5 py-[16.5px] text-[13px] text-[#1E293B]`}>
                      {formatDate(file.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge label={v.label} tone={v.tone} />
                    </td>
                    <td className="px-5 py-[17px] text-right">
                      <button
                        onClick={() => handleView(file.id)}
                        disabled={openingId === file.id}
                        className={`${inter.className} text-[12px] font-semibold text-sky hover:underline disabled:opacity-50`}
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
