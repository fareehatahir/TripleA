import { expect, test } from "@playwright/test";

const hydrated = (page: import("@playwright/test").Page) => page.waitForSelector("html[data-hydrated]");

test("security headers are sent on public pages", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("SAMEORIGIN");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["permissions-policy"]).toContain("camera=()");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["content-security-policy"]).toContain("object-src 'none'");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'self'");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("admin and API responses are marked noindex", async ({ request }) => {
  expect((await request.get("/admin/login")).headers()["x-robots-tag"]).toContain("noindex");
  expect((await request.get("/api/search?q=ab")).headers()["x-robots-tag"]).toContain("noindex");
  expect((await request.get("/admin/login")).headers()["cache-control"]).toContain("no-store");
});

test.describe("the Content-Security-Policy does not break the real site", () => {
  for (const path of ["/", "/catalog", "/product/mercedes-benz-e350-coupe", "/contact", "/shipping", "/loading", "/inquiry"]) {
    test(path, async ({ page }) => {
      const violations: string[] = [];
      page.on("console", (m) => /content security policy|refused to/i.test(m.text()) && violations.push(m.text().slice(0, 200)));
      page.on("pageerror", (e) => violations.push(`pageerror: ${e.message}`));
      await page.addInitScript(() => localStorage.setItem("ta-cookie", "essential"));
      await page.goto(path);
      await hydrated(page);
      await page.mouse.wheel(0, 4000); // trigger lazy images, the map iframe and scroll animations
      await page.waitForTimeout(1200);
      expect(violations).toEqual([]);
    });
  }
  test("admin product form (rich-text editor, uploads)", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: "e2e/.auth.json" });
    const page = await ctx.newPage();
    const violations: string[] = [];
    page.on("console", (m) => /content security policy|refused to/i.test(m.text()) && violations.push(m.text().slice(0, 200)));
    page.on("pageerror", (e) => violations.push(`pageerror: ${e.message}`));
    await page.goto("/admin/products/new");
    await hydrated(page);
    await page.locator(".ProseMirror").click();
    await page.keyboard.type("hello");
    await page.waitForTimeout(800);
    expect(violations).toEqual([]);
    await ctx.close();
  });
});

test("login locks out after repeated failures, even for a wrong email", async ({ page }) => {
  const email = "nobody-lockout@example.com";
  const attempt = async () => {
    await page.goto("/admin/login");
    await hydrated(page);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrong-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
  };
  for (let i = 0; i < 8; i++) {
    await attempt();
    await expect(page.locator("form [role=alert]")).toContainText("Incorrect email or password");
  }
  await attempt();
  await expect(page.locator("form [role=alert]")).toContainText("Too many failed attempts");
});

test("unauthenticated visitors cannot reach admin APIs or pages", async ({ request }) => {
  for (const url of ["/api/admin/upload", "/api/admin/import/validate", "/api/admin/products/export", "/api/admin/inquiries/export", "/api/admin/subscribers/export"]) {
    const res = url.includes("import/validate") || url.endsWith("upload") ? await request.post(url, { data: {} }) : await request.get(url);
    expect(res.status(), url).toBe(401);
  }
  const page = await request.get("/admin/settings", { maxRedirects: 0 });
  expect([302, 307]).toContain(page.status());
});
