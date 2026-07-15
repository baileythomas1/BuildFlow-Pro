import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import type { Prisma } from "@/lib/generated/prisma/client";

type Recipient = { userId: string; email: string };

// In-app (Notification row, requires a User) + email together — the two
// channels PRD 9.8 calls for the same event. Notifying is always a side
// effect of some primary action (assigning a task, a payment landing) —
// a failure here (e.g. a transient DB hiccup on the Notification insert;
// sendEmail already never throws) must never fail that primary action, so
// every error is caught and logged rather than propagated.
export async function notifyUser(
  recipient: Recipient,
  input: { type: string; payload: Record<string, unknown>; subject: string; html: string }
): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId: recipient.userId, type: input.type, payload: input.payload as Prisma.InputJsonObject },
    });
  } catch (error) {
    console.error("Failed to create in-app notification:", error);
  }
  await sendEmail({ to: recipient.email, subject: input.subject, html: input.html });
}

// Email only, for a Client with no portal login yet (Client.userId is
// nullable and there's no invite flow — see PRD 9.6 build notes). There's no
// User to attach an in-app Notification row to, but the office still wants
// the client emailed.
export async function notifyEmailOnly(email: string, input: { subject: string; html: string }): Promise<void> {
  await sendEmail({ to: email, subject: input.subject, html: input.html });
}
