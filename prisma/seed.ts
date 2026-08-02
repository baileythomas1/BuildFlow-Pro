import { PrismaClient, Role, ProjectStatus, EstimateStatus, TaskStatus, InvoiceStatus } from "../lib/generated/prisma/client";
import { hashPassword } from "../lib/auth/passwords";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "Demo1234!";

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const company = await prisma.company.create({
    data: { name: "Riverside Construction Co.", plan: "pro" },
  });

  const owner = await prisma.user.create({
    data: { companyId: company.id, email: "owner@demo.buildflowpro.com", passwordHash, role: Role.OWNER, name: "Owner Demo" },
  });
  const admin = await prisma.user.create({
    data: { companyId: company.id, email: "admin@demo.buildflowpro.com", passwordHash, role: Role.ADMIN, name: "Admin Demo" },
  });
  const pm = await prisma.user.create({
    data: { companyId: company.id, email: "pm@demo.buildflowpro.com", passwordHash, role: Role.PM, name: "Project Manager Demo" },
  });
  const employee = await prisma.user.create({
    data: { companyId: company.id, email: "employee@demo.buildflowpro.com", passwordHash, role: Role.EMPLOYEE, name: "Employee Demo", hourlyRate: 45.0 },
  });
  const clientUser = await prisma.user.create({
    data: { companyId: company.id, email: "client@demo.buildflowpro.com", passwordHash, role: Role.CLIENT, name: "Client Demo" },
  });

  const client = await prisma.client.create({
    data: { companyId: company.id, name: "Client Demo", email: "client@demo.buildflowpro.com", userId: clientUser.id },
  });

  const project = await prisma.project.create({
    data: {
      companyId: company.id,
      clientId: client.id,
      name: "123 Riverside Ave Renovation",
      address: "123 Riverside Ave, Ottawa, ON",
      budget: 185000,
      status: ProjectStatus.IN_PROGRESS,
      startDate: new Date("2026-05-01"),
      targetDate: new Date("2026-10-01"),
    },
  });

  await prisma.projectAssignment.createMany({
    data: [
      { projectId: project.id, userId: pm.id },
      { projectId: project.id, userId: employee.id },
    ],
  });

  await prisma.task.createMany({
    data: [
      { projectId: project.id, assigneeId: employee.id, title: "Demo framing inspection", status: TaskStatus.DONE, order: 0 },
      { projectId: project.id, assigneeId: employee.id, title: "Install kitchen cabinets", status: TaskStatus.IN_PROGRESS, order: 1 },
      { projectId: project.id, assigneeId: pm.id, title: "Schedule electrical rough-in", status: TaskStatus.TODO, order: 2 },
    ],
  });

  const estimate = await prisma.estimate.create({
    data: {
      projectId: project.id,
      title: "Kitchen & Bath Renovation Estimate",
      status: EstimateStatus.APPROVED,
      total: 42500,
      approvedAt: new Date("2026-05-10"),
    },
  });

  await prisma.estimateLineItem.createMany({
    data: [
      { estimateId: estimate.id, description: "Cabinetry (materials + install)", quantity: 1, unitCost: 18000, markup: 15 },
      { estimateId: estimate.id, description: "Countertops (quartz)", quantity: 1, unitCost: 7500, markup: 15 },
      { estimateId: estimate.id, description: "Labor (framing/electrical/plumbing)", quantity: 1, unitCost: 12000, markup: 10 },
    ],
  });

  await prisma.invoice.create({
    data: {
      projectId: project.id,
      estimateId: estimate.id,
      amount: 21250,
      status: InvoiceStatus.PAID,
      description: "50% deposit — Kitchen & Bath Renovation",
      dueDate: new Date("2026-05-15"),
    },
  });

  await prisma.statusComment.create({
    data: { projectId: project.id, authorId: pm.id, body: "Framing inspection passed — moving to electrical rough-in next week." },
  });

  console.log("Seed complete. Demo password for all accounts:", DEMO_PASSWORD);
  console.log({ owner: owner.email, admin: admin.email, pm: pm.email, employee: employee.email, client: clientUser.email });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
