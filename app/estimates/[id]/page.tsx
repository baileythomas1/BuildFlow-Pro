"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/use-require-auth";
import { EstimateDetail } from "@/components/EstimateDetail";
import type { EstimateDetail as EstimateDetailType } from "@/lib/estimates/types";

// Mirrors app/projects/[id]/page.tsx's canManage gate: Estimates aren't in
// the Employee nav per PRD 8 IA, and the Client role has its own sanitized
// view at /portal/estimates/[id]. Same caveat as the portal layout's
// CLIENT-only check — this is a client component, so it's a UX redirect
// only; the real boundary is /api/estimates/[id]'s own company/role scoping.
const CAN_MANAGE_ROLES = ["OWNER", "ADMIN", "PM"];

export default function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading: authLoading, accessToken } = useRequireAuth();
  const router = useRouter();

  const [projectId, setProjectId] = useState<string | null>(null);

  const canManage = !!user && CAN_MANAGE_ROLES.includes(user.role);

  useEffect(() => {
    if (!authLoading && user && !canManage) {
      router.replace("/");
    }
  }, [authLoading, user, canManage, router]);

  function backToProject() {
    router.push(projectId ? `/projects/${projectId}#estimates` : "/projects");
  }

  if (authLoading || !user || !canManage) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#F4F7FA]">
        <p className="text-slate/60">Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[#F4F7FA]">
      <div className="mx-auto flex max-w-[1100px] flex-col items-start px-8 pb-24 pt-[35px]">
        <EstimateDetail
          estimateId={id}
          accessToken={accessToken}
          onClose={backToProject}
          onArchived={backToProject}
          onLoaded={(estimate: EstimateDetailType) => setProjectId(estimate.project.id)}
        />
      </div>
    </main>
  );
}
