import "dotenv/config"; // Playwright Test doesn't auto-load .env the way `next dev` does
import type { APIRequestContext } from "@playwright/test";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/client";

// Every company created by this suite is named with this prefix, so cleanup
// can find (and a stray failed run can never be mistaken for) real user data.
export const TEST_PREFIX = "AutoTest-";

export async function signupCompany(
  request: APIRequestContext,
  input: { companyName: string; ownerName: string; ownerEmail: string; password: string }
) {
  const res = await request.post("/api/auth/signup", {
    data: {
      companyName: input.companyName,
      name: input.ownerName,
      email: input.ownerEmail,
      password: input.password,
    },
  });
  if (!res.ok()) {
    throw new Error(`signup failed (${res.status()}): ${await res.text()}`);
  }
  const body = await res.json();
  return {
    accessToken: body.accessToken as string,
    companyId: body.company.id as string,
    userId: body.user.id as string,
  };
}

export async function loginAs(request: APIRequestContext, email: string, password: string) {
  const res = await request.post("/api/auth/login", { data: { email, password } });
  if (!res.ok()) {
    throw new Error(`login failed (${res.status()}): ${await res.text()}`);
  }
  const body = await res.json();
  return body.accessToken as string;
}

export async function createProject(
  request: APIRequestContext,
  accessToken: string,
  input: {
    name: string;
    address: string;
    budget: string;
    clientName: string;
    clientEmail: string;
    startDate?: string;
    targetDate?: string;
  }
) {
  const res = await request.post("/api/projects", {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      name: input.name,
      address: input.address,
      budget: input.budget,
      client: { name: input.clientName, email: input.clientEmail },
      startDate: input.startDate,
      targetDate: input.targetDate,
    },
  });
  if (!res.ok()) {
    throw new Error(`create project failed (${res.status()}): ${await res.text()}`);
  }
  const body = await res.json();
  return { projectId: body.project.id as string, clientId: body.project.client.id as string };
}

// There's no invite-a-homeowner flow yet (Client.userId is nullable and
// nothing sets it from the UI) — this reproduces the manual DB link-up used
// throughout this app's development to test the CLIENT role, standing in for
// that not-yet-built step.
export async function linkClientLogin(clientId: string, loginEmail: string, password: string, name: string) {
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { companyId: client.companyId, email: loginEmail, passwordHash, role: Role.CLIENT, name },
  });
  await prisma.client.update({ where: { id: client.id }, data: { userId: user.id } });
  return user.id;
}

export async function createCompanyUser(
  companyId: string,
  email: string,
  password: string,
  role: Role,
  name: string
) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.create({ data: { companyId, email, passwordHash, role, name } });
}

// Deletes every company (and all dependent rows, in FK-safe order) whose
// name starts with TEST_PREFIX. Safe to call repeatedly / after a failed run.
export async function cleanupTestCompanies() {
  const companies = await prisma.company.findMany({
    where: { name: { startsWith: TEST_PREFIX } },
    select: { id: true },
  });
  const companyIds = companies.map((c) => c.id);
  if (companyIds.length === 0) return;

  const projects = await prisma.project.findMany({
    where: { companyId: { in: companyIds } },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);

  const estimates = await prisma.estimate.findMany({
    where: { projectId: { in: projectIds } },
    select: { id: true },
  });
  const estimateIds = estimates.map((e) => e.id);

  const changeOrders = await prisma.changeOrder.findMany({
    where: { estimateId: { in: estimateIds } },
    select: { id: true },
  });
  const changeOrderIds = changeOrders.map((c) => c.id);

  const files = await prisma.file.findMany({
    where: { projectId: { in: projectIds } },
    select: { storagePath: true },
  });
  if (files.length > 0) {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      apikey: process.env.SUPABASE_SERVICE_KEY!,
    };
    await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/project-files`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ prefixes: files.map((f) => f.storagePath) }),
    }).catch(() => {
      // Best effort — a leftover test object in Storage isn't worth failing cleanup over.
    });
  }

  await prisma.notification.deleteMany({ where: { user: { companyId: { in: companyIds } } } });
  await prisma.projectAssignment.deleteMany({ where: { project: { companyId: { in: companyIds } } } });
  await prisma.changeOrderLineItem.deleteMany({ where: { changeOrderId: { in: changeOrderIds } } });
  await prisma.changeOrder.deleteMany({ where: { id: { in: changeOrderIds } } });
  await prisma.invoice.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.estimateLineItem.deleteMany({ where: { estimateId: { in: estimateIds } } });
  await prisma.estimate.deleteMany({ where: { id: { in: estimateIds } } });
  await prisma.statusComment.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.task.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.file.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.auditLog.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.project.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.client.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.user.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
}

export function uniqueEmail(label: string) {
  return `${label}+${Date.now()}-${Math.floor(Math.random() * 1e6)}@autotest.example.com`;
}
