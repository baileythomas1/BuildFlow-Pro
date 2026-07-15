import type { ProjectHealth } from "@/lib/projects/health";

export type ProjectStatusValue = "PLANNING" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETE";

export type ProjectClient = {
  id: string;
  name: string;
  email: string;
};

export type Project = {
  id: string;
  name: string;
  address: string;
  budget: string;
  status: ProjectStatusValue;
  startDate: string | null;
  targetDate: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  client: ProjectClient;
  health: ProjectHealth;
};
