import { prisma } from "@/lib/prisma";
import { notifyUser, notifyEmailOnly } from "@/lib/notifications/notify";
import { Role } from "@/lib/generated/prisma/client";

function wrap(bodyHtml: string): string {
  return `<div style="font-family: Arial, sans-serif; color: #1E293B; max-width: 480px; margin: 0 auto;">
    <h2 style="color: #16324F; margin-bottom: 4px;">BuildFlow Pro</h2>
    ${bodyHtml}
  </div>`;
}

// PRD 9.8: "task assigned"
export async function notifyTaskAssigned(params: {
  assignee: { id: string; email: string; name: string };
  taskTitle: string;
  taskId: string;
  projectId: string;
  projectName: string;
}) {
  const { assignee, taskTitle, taskId, projectId, projectName } = params;
  await notifyUser(
    { userId: assignee.id, email: assignee.email },
    {
      type: "task_assigned",
      payload: { taskId, taskTitle, projectId, projectName },
      subject: `New task assigned: ${taskTitle}`,
      html: wrap(
        `<p>Hi ${assignee.name},</p><p>You've been assigned a new task on <strong>${projectName}</strong>:</p><p style="font-size:16px;"><strong>${taskTitle}</strong></p>`
      ),
    }
  );
}

// PRD 9.8: "invoice sent" — our Invoice model has no separate draft/sent
// step, so creation is the "sent" moment. Client.userId is nullable (no
// invite flow exists yet — see PRD 9.6 build notes), so this always emails
// Client.email directly and only adds an in-app Notification if they have a
// portal login to attach it to.
export async function notifyInvoiceSent(params: {
  invoiceId: string;
  description: string;
  amount: string;
  projectName: string;
  companyName: string;
  client: { userId: string | null; email: string; name: string };
}) {
  const { invoiceId, description, amount, projectName, companyName, client } = params;
  const subject = `New invoice from ${companyName}: ${description}`;
  const html = wrap(
    `<p>Hi ${client.name},</p><p>A new invoice has been issued for <strong>${projectName}</strong>:</p><p style="font-size:16px;"><strong>${description}</strong> — $${Number(amount).toLocaleString()}</p>`
  );

  if (client.userId) {
    await notifyUser(
      { userId: client.userId, email: client.email },
      { type: "invoice_sent", payload: { invoiceId, description, amount }, subject, html }
    );
  } else {
    await notifyEmailOnly(client.email, { subject, html });
  }
}

// PRD 9.8: "invoice paid" — notifies the paying client (a receipt) and
// every Owner in the company (revenue awareness). PRD doesn't name a
// specific recipient for this event, so both directions are covered.
export async function notifyInvoicePaid(params: {
  invoiceId: string;
  description: string;
  amount: string;
  projectId: string;
  projectName: string;
  client: { userId: string | null; email: string; name: string };
  companyId: string;
}) {
  const { invoiceId, description, amount, projectId, projectName, client, companyId } = params;
  const payload = { invoiceId, description, amount, projectId };

  const clientSubject = `Payment received: ${description}`;
  const clientHtml = wrap(
    `<p>Hi ${client.name},</p><p>Thanks — we've received your payment for <strong>${description}</strong> ($${Number(amount).toLocaleString()}) on ${projectName}.</p>`
  );
  if (client.userId) {
    await notifyUser(
      { userId: client.userId, email: client.email },
      { type: "invoice_paid", payload, subject: clientSubject, html: clientHtml }
    );
  } else {
    await notifyEmailOnly(client.email, { subject: clientSubject, html: clientHtml });
  }

  const owners = await prisma.user.findMany({
    where: { companyId, role: Role.OWNER },
    select: { id: true, email: true, name: true },
  });
  const ownerSubject = `Payment received on ${projectName}`;
  for (const owner of owners) {
    const ownerHtml = wrap(
      `<p>Hi ${owner.name},</p><p><strong>${description}</strong> ($${Number(amount).toLocaleString()}) on <strong>${projectName}</strong> has been paid.</p>`
    );
    await notifyUser(
      { userId: owner.id, email: owner.email },
      { type: "invoice_paid", payload, subject: ownerSubject, html: ownerHtml }
    );
  }
}

// PRD 9.8: "estimate approved/rejected" — notifies internal staff (Owner/
// Admin/PM, the roles with Estimates access per PRD 8). The client took the
// action themselves, so they don't need telling about their own click.
export async function notifyEstimateDecision(params: {
  estimateId: string;
  estimateTitle: string | null;
  status: "APPROVED" | "REJECTED";
  projectId: string;
  projectName: string;
  companyId: string;
}) {
  const { estimateId, estimateTitle, status, projectId, projectName, companyId } = params;
  const label = estimateTitle ?? "Untitled Estimate";
  const decision = status === "APPROVED" ? "approved" : "rejected";
  const payload = { estimateId, status, projectId };

  const staff = await prisma.user.findMany({
    where: { companyId, role: { in: [Role.OWNER, Role.ADMIN, Role.PM] } },
    select: { id: true, email: true, name: true },
  });

  for (const person of staff) {
    await notifyUser(
      { userId: person.id, email: person.email },
      {
        type: `estimate_${decision}`,
        payload,
        subject: `Estimate ${decision}: ${label}`,
        html: wrap(
          `<p>Hi ${person.name},</p><p>The homeowner has ${decision} the estimate <strong>${label}</strong> on <strong>${projectName}</strong>.</p>`
        ),
      }
    );
  }
}
