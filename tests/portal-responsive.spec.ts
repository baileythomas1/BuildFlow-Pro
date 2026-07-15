import { test, expect, devices } from "@playwright/test";
import { TEST_PREFIX, signupCompany, createProject, linkClientLogin, cleanupTestCompanies, uniqueEmail } from "./helpers";

// PRD 18 + PRD 9.6 ("optimize for mobile first; homeowners will check this
// primarily from their phones"): verifies the 4 portal pages render usably
// at phone widths — no horizontal overflow, the bottom tab bar is visible
// and tappable, and each page's core content is visible.

test.describe.configure({ mode: "serial" });

const VIEWPORTS = [
  { name: "iPhone SE", ...devices["iPhone SE"].viewport },
  { name: "iPhone 14", ...devices["iPhone 14"].viewport },
];

let clientLoginEmail: string;
const clientPassword = "correcthorse123";

test.beforeAll(async ({ playwright }) => {
  await cleanupTestCompanies();
  const request = await playwright.request.newContext({ baseURL: "http://localhost:3000" });

  const owner = await signupCompany(request, {
    companyName: `${TEST_PREFIX}Responsive Co`,
    ownerName: "Responsive Owner",
    ownerEmail: uniqueEmail("owner-responsive"),
    password: "correcthorse123",
  });

  clientLoginEmail = uniqueEmail("client-responsive");
  const { projectId, clientId } = await createProject(request, owner.accessToken, {
    name: "Responsive Test Project With A Fairly Long Name",
    address: "99 Mobile Way",
    budget: "15000",
    clientName: "Mobile Homeowner",
    clientEmail: clientLoginEmail,
    targetDate: "2026-10-01",
  });

  await linkClientLogin(clientId, clientLoginEmail, clientPassword, "Mobile Homeowner");

  await request.post(`/api/projects/${projectId}/invoices`, {
    headers: { Authorization: `Bearer ${owner.accessToken}` },
    data: { description: "Responsive test invoice with a longer description to stress layout", amount: "750" },
  });

  const fileForm = { file: { name: "responsive.txt", mimeType: "text/plain", buffer: Buffer.from("x") }, type: "Photo", visibility: "CLIENT" };
  await request.post(`/api/projects/${projectId}/files`, {
    headers: { Authorization: `Bearer ${owner.accessToken}` },
    multipart: fileForm,
  });

  await request.post(`/api/projects/${projectId}/status-comments`, {
    headers: { Authorization: `Bearer ${owner.accessToken}` },
    data: { body: "A status update long enough to wrap onto multiple lines on a narrow phone screen, testing overflow." },
  });

  await request.dispose();
});

test.afterAll(async () => {
  await cleanupTestCompanies();
});

const PORTAL_PAGES = [
  { path: "/portal", heading: /responsive test project/i },
  { path: "/portal/files", heading: "Files" },
  { path: "/portal/invoices", heading: "Invoices" },
  { path: "/portal/messages", heading: "Updates" },
];

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const portalPage of PORTAL_PAGES) {
      test(`${portalPage.path} has no horizontal overflow and shows the tab bar`, async ({ page }) => {
        await page.goto("/login");
        await page.getByLabel("Email").fill(clientLoginEmail);
        await page.getByLabel("Password").fill(clientPassword);
        await page.getByRole("button", { name: /log in/i }).click();
        await page.waitForURL("**/portal", { timeout: 15_000 });

        await page.goto(portalPage.path);
        await page.waitForLoadState("networkidle");

        await expect(page.getByRole("heading", { name: portalPage.heading })).toBeVisible();

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(
          scrollWidth,
          `${portalPage.path} at ${viewport.width}px: scrollWidth ${scrollWidth} exceeds viewport clientWidth ${clientWidth}`
        ).toBeLessThanOrEqual(clientWidth + 1); // +1 for sub-pixel rounding

        const nav = page.locator("nav").last();
        await expect(nav).toBeVisible();
        const navBox = await nav.boundingBox();
        expect(navBox).not.toBeNull();
        if (navBox) {
          expect(navBox.y + navBox.height).toBeLessThanOrEqual(viewport.height + 1);
          expect(navBox.y).toBeGreaterThan(0);
        }

        const navLinks = nav.locator("a, button");
        const count = await navLinks.count();
        expect(count).toBeGreaterThan(0);
        for (let i = 0; i < count; i++) {
          const box = await navLinks.nth(i).boundingBox();
          if (box) {
            expect(box.height, `tab bar item ${i} on ${portalPage.path} is under the 44px WCAG tap-target minimum`).toBeGreaterThanOrEqual(40);
          }
        }
      });
    }

    test(`main desktop NavBar is hidden on /portal routes`, async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email").fill(clientLoginEmail);
      await page.getByLabel("Password").fill(clientPassword);
      await page.getByRole("button", { name: /log in/i }).click();
      await page.waitForURL("**/portal", { timeout: 15_000 });

      // The portal has its own minimal header that also reads "BuildFlow Pro"
      // (app/portal/layout.tsx) as a plain <span> — the desktop NavBar renders
      // it as a link to "/", so that's what distinguishes the two.
      const desktopNavLogoLink = page.getByRole("link", { name: "BuildFlow Pro" });
      await expect(desktopNavLogoLink).toHaveCount(0);
    });
  });
}
