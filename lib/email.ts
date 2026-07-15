import { Resend } from "resend";

// Resend's shared test domain — works without a custom domain verified,
// though (per Resend's sandbox rules) it can only deliver to the email
// address on the Resend account until a domain is verified. Override via
// RESEND_FROM_EMAIL once a real sending domain is set up.
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "BuildFlow Pro <onboarding@resend.dev>";

let client: Resend | null = null;
function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

// Notification emails are a side effect of the primary action (assigning a
// task, approving an estimate, etc.) — a Resend outage or missing API key
// should never fail that action, so every error is caught and logged here.
export async function sendEmail(input: { to: string; subject: string; html: string }): Promise<void> {
  const resend = getClient();
  if (!resend) {
    console.warn("RESEND_API_KEY not configured — skipping email:", input.subject, "to", input.to);
    return;
  }
  try {
    await resend.emails.send({ from: FROM_ADDRESS, to: input.to, subject: input.subject, html: input.html });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}
