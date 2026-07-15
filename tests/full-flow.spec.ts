import { test, expect } from "@playwright/test";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/client";
import { TEST_PREFIX, cleanupTestCompanies, uniqueEmail } from "./helpers";

// PRD 18: "The full signup -> project -> estimate approval -> invoice ->
// payment flow works end-to-end against real infrastructure." Driven through
// real browser pages (not just API calls) so it also exercises the UI wiring,
// with a real Stripe test-mode Checkout payment using the standard test card.
//
// There is currently no UI anywhere in the app that calls the
// approve/reject estimate endpoints (grep confirms it) — the client portal
// only ever surfaces a read-only overview, files, invoices, and messages.
// So the estimate-approval step here calls the API directly, the same way a
// real approve action would (e.g. from a future emailed link), rather than
// exercising a UI control that doesn't exist. This is flagged as a finding,
// not silently patched over, since building that UI is a new feature and
// out of scope for this verification-only pass.
//
// Webhook delivery during a headless test run isn't guaranteed (no `stripe
// listen` forwarder is running), so payment sync is verified via the same
// reconciliation cron endpoint PRD 17 designates as the backstop for exactly
// this situation.

test.describe.configure({ mode: "serial" });

const companyName = `${TEST_PREFIX}Full Flow Co`;
const ownerEmail = uniqueEmail("owner-flow");
const ownerPassword = "correcthorse123";
const clientLoginEmail = uniqueEmail("client-flow");
const clientPassword = "correcthorse123";

let projectId: string;
let estimateId: string;
let invoiceId: string;
let clientToken: string;

test.beforeAll(async () => {
  await cleanupTestCompanies();
});

test.afterAll(async () => {
  await cleanupTestCompanies();
});

test("owner signs up and lands on dashboard", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Company name").fill(companyName);
  await page.getByLabel("Your name").fill("Flow Owner");
  await page.getByLabel("Email").fill(ownerEmail);
  await page.getByLabel("Password").fill(ownerPassword);
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page.getByText("Active Projects")).toBeVisible();
});

test("owner creates a project", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ownerEmail);
  await page.getByLabel("Password").fill(ownerPassword);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });

  await page.goto("/projects");
  await page.getByRole("link", { name: /new project/i }).click();
  await page.getByLabel("Project name").fill("Full Flow Remodel");
  await page.getByLabel("Address").fill("42 Flow Ave");
  await page.getByLabel("Budget").fill("20000");
  await page.getByLabel("Client name").fill("Flow Homeowner");
  await page.getByLabel("Client email").fill(clientLoginEmail);
  await page.getByRole("button", { name: /create project/i }).click();
  await page.waitForURL(/\/projects\/[a-f0-9-]{36}$/, { timeout: 15_000 });
  projectId = page.url().split("/projects/")[1];
  expect(projectId).toMatch(/^[a-f0-9-]{36}$/);
});

test("owner builds and sends an estimate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ownerEmail);
  await page.getByLabel("Password").fill(ownerPassword);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });

  await page.goto(`/projects/${projectId}`);
  await page.getByRole("button", { name: "New Estimate" }).click();

  // The estimate title input has no <label> (it's an inline-editable
  // heading), so it's targeted by placeholder rather than getByLabel.
  await page.getByPlaceholder("Untitled Estimate").fill("Full Flow — Phase 1");
  await page.getByPlaceholder("Untitled Estimate").blur();

  const lineForm = page.locator('form:has(input[placeholder="Description"])');
  await lineForm.getByPlaceholder("Description").fill("Labor");
  await lineForm.getByPlaceholder("Qty").fill("1");
  await lineForm.getByPlaceholder("Unit cost").fill("5000");
  await lineForm.getByPlaceholder("Markup %").fill("10");
  await lineForm.getByRole("button", { name: "Add" }).click();

  await expect(page.getByText("$5,500.00")).toBeVisible();

  await page.getByRole("button", { name: /send to client/i }).click();
  await expect(page.getByText("Sent", { exact: true })).toBeVisible();

  const estimate = await prisma.estimate.findFirstOrThrow({ where: { projectId } });
  estimateId = estimate.id;
});

// Reproduces the manual DB link-up used throughout this app's development to
// test the CLIENT role, standing in for the not-yet-built homeowner invite
// flow (Client.userId is nullable and nothing sets it from any UI).
test("homeowner login is linked and approves the estimate", async ({ request }) => {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const passwordHash = await bcrypt.hash(clientPassword, 12);
  const user = await prisma.user.create({
    data: {
      companyId: project.companyId,
      email: clientLoginEmail,
      passwordHash,
      role: Role.CLIENT,
      name: "Flow Homeowner",
    },
  });
  await prisma.client.update({ where: { id: project.clientId }, data: { userId: user.id } });

  const loginRes = await request.post("/api/auth/login", {
    data: { email: clientLoginEmail, password: clientPassword },
  });
  expect(loginRes.ok()).toBeTruthy();
  clientToken = (await loginRes.json()).accessToken;

  // No UI anywhere calls this endpoint (see file header) — calling it
  // directly is the only way to exercise this step today.
  const approveRes = await request.post(`/api/estimates/${estimateId}/approve`, {
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  expect(approveRes.ok()).toBeTruthy();

  const estimate = await prisma.estimate.findUniqueOrThrow({ where: { id: estimateId } });
  expect(estimate.status).toBe("APPROVED");
});

test("owner creates an invoice", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ownerEmail);
  await page.getByLabel("Password").fill(ownerPassword);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });

  await page.goto(`/projects/${projectId}`);
  await page.getByRole("button", { name: "New Invoice" }).click();
  await page.getByLabel("Description").fill("Deposit");
  await page.getByLabel("Amount").fill("1000");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Deposit")).toBeVisible();

  const invoice = await prisma.invoice.findFirstOrThrow({
    where: { projectId, description: "Deposit" },
  });
  invoiceId = invoice.id;
});

test("homeowner pays the invoice via real Stripe Checkout", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(clientLoginEmail);
  await page.getByLabel("Password").fill(clientPassword);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL("**/portal", { timeout: 15_000 });

  await page.goto("/portal/invoices");
  await expect(page.getByText("Deposit")).toBeVisible();
  await page.getByRole("button", { name: /pay now/i }).click();

  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 });
  await page.getByLabel(/email/i).first().fill(clientLoginEmail);
  // Stripe's current hosted Checkout renders the card fields directly in the
  // top-level document, not inside an iframe — confirmed by inspecting the
  // live page (no frame titled "Secure card payment input frame" exists).
  await page.getByPlaceholder("1234 1234 1234 1234").fill("4242424242424242");
  await page.getByPlaceholder("MM / YY").fill("12/34");
  await page.getByPlaceholder("CVC").fill("123");
  const nameField = page.getByLabel(/cardholder name/i);
  if (await nameField.isVisible().catch(() => false)) {
    await nameField.fill("Flow Homeowner");
  }
  await page.getByTestId("hosted-payment-submit-button").click();

  // success_url is the generic home page (`/?payment=success`) — for the
  // CLIENT role that immediately client-side-redirects to /portal.
  await page.waitForURL("**/portal", { timeout: 30_000 });
});

test("reconciliation cron confirms payment status without relying on webhook delivery", async ({ request }) => {
  const cronSecret = process.env.CRON_SECRET;
  test.skip(!cronSecret, "CRON_SECRET not set in .env — cannot call the reconciliation endpoint");

  const res = await request.get("/api/cron/reconcile-invoices", {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  expect(res.ok()).toBeTruthy();

  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  expect(invoice.status).toBe("PAID");
});

test("paid status is visible in both the internal project view and the homeowner portal", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ownerEmail);
  await page.getByLabel("Password").fill(ownerPassword);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await page.goto(`/projects/${projectId}`);
  await expect(page.getByText("Paid", { exact: true })).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(clientLoginEmail);
  await page.getByLabel("Password").fill(clientPassword);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL("**/portal", { timeout: 15_000 });
  await page.goto("/portal/invoices");
  await expect(page.getByText("Paid", { exact: true })).toBeVisible();
});
