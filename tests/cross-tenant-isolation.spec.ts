import { test, expect, APIRequestContext } from "@playwright/test";
import {
  TEST_PREFIX,
  signupCompany,
  loginAs,
  createProject,
  linkClientLogin,
  createCompanyUser,
  cleanupTestCompanies,
  uniqueEmail,
} from "./helpers";
import { Role } from "@/lib/generated/prisma/client";

// PRD 18 acceptance criteria: "Every cross-tenant data-access attempt is
// denied server-side, verified by tests, not just manual QA." This exercises
// every API route that touches a company-scoped resource: Company A owns a
// full set of real data (project, task, file, estimate + line items +
// change order, invoice, status comment, employee + assignment); Company B's
// tokens (owner and homeowner) then attempt to reach every one of those
// resources by ID and must always be denied (404, or 403 where the role
// itself is disallowed before ownership is even checked).

test.describe.configure({ mode: "serial" });

let a: {
  ownerToken: string;
  companyId: string;
  projectId: string;
  clientId: string;
  taskId: string;
  fileId: string;
  estimateId: string;
  estimateSentId: string;
  lineItemId: string;
  changeOrderId: string;
  invoiceId: string;
  statusCommentId: string;
  employeeId: string;
  notificationId: string;
  clientToken: string;
};
let bOwnerToken: string;
let bClientToken: string;

test.beforeAll(async ({ playwright }) => {
  await cleanupTestCompanies();
  const request = await playwright.request.newContext({ baseURL: "http://localhost:3000" });

  // --- Company A: a full set of real resources ---
  const ownerEmail = uniqueEmail("owner-a");
  const owner = await signupCompany(request, {
    companyName: `${TEST_PREFIX}Isolation Co A`,
    ownerName: "Owner A",
    ownerEmail,
    password: "correcthorse123",
  });

  const clientEmail = uniqueEmail("client-a");
  const { projectId, clientId } = await createProject(request, owner.accessToken, {
    name: "Isolation Project A",
    address: "1 Isolation St",
    budget: "10000",
    clientName: "Client A",
    clientEmail,
    targetDate: "2026-09-01",
  });

  const clientLoginEmail = uniqueEmail("client-login-a");
  await linkClientLogin(clientId, clientLoginEmail, "correcthorse123", "Client A");
  const clientToken = await loginAs(request, clientLoginEmail, "correcthorse123");

  const empEmail = uniqueEmail("employee-a");
  const employee = await createCompanyUser(owner.companyId, empEmail, "correcthorse123", Role.EMPLOYEE, "Employee A");

  const taskRes = await request.post(`/api/projects/${projectId}/tasks`, {
    headers: { Authorization: `Bearer ${owner.accessToken}` },
    data: { title: "Isolation task", assigneeId: employee.id },
  });
  const taskId = (await taskRes.json()).task.id;

  const fileForm = new FormData();
  fileForm.append("file", new Blob(["isolation test content"], { type: "text/plain" }), "isolation.txt");
  fileForm.append("type", "Contract");
  fileForm.append("visibility", "INTERNAL");
  const fileRes = await request.post(`/api/projects/${projectId}/files`, {
    headers: { Authorization: `Bearer ${owner.accessToken}` },
    multipart: { file: { name: "isolation.txt", mimeType: "text/plain", buffer: Buffer.from("isolation test content") }, type: "Contract", visibility: "INTERNAL" },
  });
  const fileId = (await fileRes.json()).file.id;

  const estimateRes = await request.post(`/api/projects/${projectId}/estimates`, {
    headers: { Authorization: `Bearer ${owner.accessToken}` },
    data: { title: "Isolation Estimate", lineItems: [{ description: "Item", quantity: "1", unitCost: "1000", markup: "10" }] },
  });
  const estimateBody = await estimateRes.json();
  const estimateId = estimateBody.estimate.id;
  const lineItemId = estimateBody.estimate.lineItems[0].id;

  await request.patch(`/api/estimates/${estimateId}`, {
    headers: { Authorization: `Bearer ${owner.accessToken}` },
    data: { status: "SENT" },
  });
  await request.post(`/api/estimates/${estimateId}/approve`, {
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  const changeOrderRes = await request.post(`/api/estimates/${estimateId}/change-orders`, {
    headers: { Authorization: `Bearer ${owner.accessToken}` },
    data: { description: "Extra scope", lineItems: [{ description: "Add-on", quantity: "1", unitCost: "200", markup: "0" }] },
  });
  const changeOrderId = (await changeOrderRes.json()).changeOrder.id;

  // A second estimate, left at SENT, for testing line-item mutation routes
  // (an APPROVED estimate would reject those as immutable, not as cross-tenant).
  const estimate2Res = await request.post(`/api/projects/${projectId}/estimates`, {
    headers: { Authorization: `Bearer ${owner.accessToken}` },
    data: { lineItems: [] },
  });
  const estimateSentId = (await estimate2Res.json()).estimate.id;
  await request.patch(`/api/estimates/${estimateSentId}`, {
    headers: { Authorization: `Bearer ${owner.accessToken}` },
    data: { status: "SENT" },
  });

  const invoiceRes = await request.post(`/api/projects/${projectId}/invoices`, {
    headers: { Authorization: `Bearer ${owner.accessToken}` },
    data: { description: "Deposit", amount: "500" },
  });
  const invoiceId = (await invoiceRes.json()).invoice.id;

  const commentRes = await request.post(`/api/projects/${projectId}/status-comments`, {
    headers: { Authorization: `Bearer ${owner.accessToken}` },
    data: { body: "Isolation test comment" },
  });
  const statusCommentId = (await commentRes.json()).comment.id;

  const notifRes = await request.get(`/api/notifications`, {
    headers: { Authorization: `Bearer ${owner.accessToken}` },
  });
  const notifications = (await notifRes.json()).notifications;
  const notificationId = notifications[0]?.id ?? "";

  a = {
    ownerToken: owner.accessToken,
    companyId: owner.companyId,
    projectId,
    clientId,
    taskId,
    fileId,
    estimateId,
    estimateSentId,
    lineItemId,
    changeOrderId,
    invoiceId,
    statusCommentId,
    employeeId: employee.id,
    notificationId,
    clientToken,
  };

  // --- Company B: the attacker ---
  const bOwnerEmail = uniqueEmail("owner-b");
  const bOwner = await signupCompany(request, {
    companyName: `${TEST_PREFIX}Isolation Co B`,
    ownerName: "Owner B",
    ownerEmail: bOwnerEmail,
    password: "correcthorse123",
  });
  bOwnerToken = bOwner.accessToken;

  const bClientEmail = uniqueEmail("client-b");
  const bProject = await createProject(request, bOwnerToken, {
    name: "Isolation Project B",
    address: "1 Other St",
    budget: "5000",
    clientName: "Client B",
    clientEmail: bClientEmail,
  });
  const bClientLoginEmail = uniqueEmail("client-login-b");
  await linkClientLogin(bProject.clientId, bClientLoginEmail, "correcthorse123", "Client B");
  bClientToken = await loginAs(request, bClientLoginEmail, "correcthorse123");

  await request.dispose();
});

test.afterAll(async () => {
  await cleanupTestCompanies();
});

async function expectDenied(
  request: APIRequestContext,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  url: string,
  token: string,
  data?: unknown
) {
  const res = await request.fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  expect([403, 404], `${method} ${url} returned ${res.status()} — expected 403 or 404`).toContain(res.status());
}

test("company B owner cannot reach any of company A's project-scoped resources", async ({ request }) => {
  await expectDenied(request, "GET", `/api/projects/${a.projectId}`, bOwnerToken);
  await expectDenied(request, "PATCH", `/api/projects/${a.projectId}`, bOwnerToken, { name: "hijacked" });
  await expectDenied(request, "DELETE", `/api/projects/${a.projectId}`, bOwnerToken);

  await expectDenied(request, "GET", `/api/projects/${a.projectId}/tasks`, bOwnerToken);
  await expectDenied(request, "POST", `/api/projects/${a.projectId}/tasks`, bOwnerToken, { title: "hijack" });
  await expectDenied(request, "PATCH", `/api/tasks/${a.taskId}`, bOwnerToken, { title: "hijack" });
  await expectDenied(request, "DELETE", `/api/tasks/${a.taskId}`, bOwnerToken);

  await expectDenied(request, "GET", `/api/projects/${a.projectId}/files`, bOwnerToken);
  await expectDenied(request, "GET", `/api/files/${a.fileId}`, bOwnerToken);

  await expectDenied(request, "GET", `/api/projects/${a.projectId}/estimates`, bOwnerToken);
  await expectDenied(request, "POST", `/api/projects/${a.projectId}/estimates`, bOwnerToken, { lineItems: [] });
  await expectDenied(request, "GET", `/api/estimates/${a.estimateId}`, bOwnerToken);
  await expectDenied(request, "PATCH", `/api/estimates/${a.estimateSentId}`, bOwnerToken, { status: "DRAFT" });
  await expectDenied(request, "DELETE", `/api/estimates/${a.estimateId}`, bOwnerToken);
  await expectDenied(request, "GET", `/api/estimates/${a.estimateId}/pdf`, bOwnerToken);
  await expectDenied(request, "GET", `/api/estimates/${a.estimateId}/change-orders`, bOwnerToken);
  await expectDenied(request, "POST", `/api/estimates/${a.estimateId}/change-orders`, bOwnerToken, {
    description: "hijack",
    lineItems: [{ description: "x", quantity: "1", unitCost: "1", markup: "0" }],
  });
  await expectDenied(request, "POST", `/api/estimates/${a.estimateSentId}/line-items`, bOwnerToken, {
    description: "hijack",
    quantity: "1",
    unitCost: "1",
    markup: "0",
  });
  await expectDenied(
    request,
    "PATCH",
    `/api/estimates/${a.estimateSentId}/line-items/${a.lineItemId}`,
    bOwnerToken,
    { description: "hijack", quantity: "1", unitCost: "1", markup: "0" }
  );
  await expectDenied(request, "DELETE", `/api/estimates/${a.estimateSentId}/line-items/${a.lineItemId}`, bOwnerToken);

  await expectDenied(request, "GET", `/api/projects/${a.projectId}/invoices`, bOwnerToken);
  await expectDenied(request, "POST", `/api/projects/${a.projectId}/invoices`, bOwnerToken, {
    description: "hijack",
    amount: "1",
  });
  await expectDenied(request, "GET", `/api/invoices/${a.invoiceId}`, bOwnerToken);
  await expectDenied(request, "DELETE", `/api/invoices/${a.invoiceId}`, bOwnerToken);
  await expectDenied(request, "POST", `/api/invoices/${a.invoiceId}/checkout`, bOwnerToken);

  await expectDenied(request, "GET", `/api/projects/${a.projectId}/status-comments`, bOwnerToken);
  await expectDenied(request, "POST", `/api/projects/${a.projectId}/status-comments`, bOwnerToken, {
    body: "hijack",
  });

  await expectDenied(request, "PATCH", `/api/employees/${a.employeeId}`, bOwnerToken, { role: "ADMIN" });
  await expectDenied(request, "POST", `/api/employees/${a.employeeId}/assignments`, bOwnerToken, {
    projectId: a.projectId,
  });
  await expectDenied(request, "DELETE", `/api/employees/${a.employeeId}/assignments/${a.projectId}`, bOwnerToken);
});

test("company B's client cannot approve/reject or checkout company A's records", async ({ request }) => {
  await expectDenied(request, "POST", `/api/estimates/${a.estimateSentId}/approve`, bClientToken);
  await expectDenied(request, "POST", `/api/estimates/${a.estimateSentId}/reject`, bClientToken);
  await expectDenied(request, "POST", `/api/invoices/${a.invoiceId}/checkout`, bClientToken);
  await expectDenied(request, "GET", `/api/projects/${a.projectId}/files`, bClientToken);
  await expectDenied(request, "GET", `/api/projects/${a.projectId}/invoices`, bClientToken);
});

test("company B's client resolves to their own project via the portal, never company A's", async ({ request }) => {
  const res = await request.get("/api/portal/overview", { headers: { Authorization: `Bearer ${bClientToken}` } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.project.name).toBe("Isolation Project B");
  expect(body.project.id).not.toBe(a.projectId);
});

test("company B cannot read or mark company A's notification", async ({ request }) => {
  test.skip(!a.notificationId, "no notification was generated in setup to test against");
  await expectDenied(request, "PATCH", `/api/notifications/${a.notificationId}/read`, bOwnerToken);
});

test("company B's list endpoints never include company A's data", async ({ request }) => {
  const [projects, clients, employees, users, dashboard] = await Promise.all([
    request.get("/api/projects", { headers: { Authorization: `Bearer ${bOwnerToken}` } }).then((r) => r.json()),
    request.get("/api/clients", { headers: { Authorization: `Bearer ${bOwnerToken}` } }).then((r) => r.json()),
    request.get("/api/employees", { headers: { Authorization: `Bearer ${bOwnerToken}` } }).then((r) => r.json()),
    request.get("/api/users", { headers: { Authorization: `Bearer ${bOwnerToken}` } }).then((r) => r.json()),
    request.get("/api/dashboard", { headers: { Authorization: `Bearer ${bOwnerToken}` } }).then((r) => r.json()),
  ]);

  expect(projects.projects.some((p: { id: string }) => p.id === a.projectId)).toBe(false);
  expect(clients.clients.some((c: { id: string }) => c.id === a.clientId)).toBe(false);
  expect(employees.employees.some((e: { id: string }) => e.id === a.employeeId)).toBe(false);
  expect(users.users.some((u: { id: string }) => u.id === a.employeeId)).toBe(false);
  expect(dashboard.activeProjectCount).toBe(1); // only Company B's own project
});
