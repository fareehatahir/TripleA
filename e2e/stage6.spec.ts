import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { expect, test, type Page } from "@playwright/test";
import { totpAt } from "../lib/totp";

const hydrated = (page: Page) => page.waitForSelector("html[data-hydrated]");
const seed = (f: string) => fs.readFileSync(path.join(__dirname, "../prisma/seed-assets", f));
const csvFile = (name: string, content: string) => ({ name, mimeType: "text/csv", buffer: Buffer.from(content) });
const IMPORT_INPUT = 'input[accept=".csv,.xlsx"]';

test.describe.serial("bulk import & export", () => {
  test.use({ storageState: "e2e/.auth.json" });

  const FIRST = [
    "SKU,Title,Category,Make,Model,Year from,Engine code,Displacement (cc),Fuel,Stock,Price,Show price (yes/no),Status,Description,Extra specs (Name: Value | Name: Value)",
    'E2E-IMP-1,Toyota 2GR-FE Engine,Engines,Toyota,Camry,2012,2GR-FE,"3,456",Gasoline,4,,no,draft,"Tested engine\n\nLow mileage","Weight: 185 kg | Compatible with: Camry"',
    "E2E-IMP-2,Zotye Test Part,Parts,Zotye,Z100,,,,,,,,,,",
    "E2E-IMP-3,Bad Category Item,Spaceships,,,,,,,,,,,,",
    "E2E-IMP-1,Duplicate Row,Engines,,,,,,,,,,,,",
    "CAR-0001,Existing Car,Cars,,,,,,,,,,,,",
  ].join("\n");

  test("column matching, validation preview, then import", async ({ page }) => {
    await page.goto("/admin/import-export");
    await hydrated(page);
    await page.locator(IMPORT_INPUT).setInputFiles(csvFile("products.csv", FIRST));
    await expect(page.getByText("5 rows found")).toBeVisible();
    // headers from the template were matched automatically
    await expect(page.getByLabel("Column for SKU / code")).toHaveValue("SKU");
    await expect(page.getByLabel("Column for Displacement (cc)")).toHaveValue("Displacement (cc)");
    await page.getByRole("button", { name: "Check my data" }).click();

    const summary = page.locator("ul.grid li");
    await expect(summary.filter({ hasText: "Will create" })).toContainText("2");
    await expect(summary.filter({ hasText: "Skipped" })).toContainText("1");
    await expect(summary.filter({ hasText: "Error" })).toContainText("2");
    await expect(page.getByText(/Unknown category “Spaceships”/)).toBeVisible();
    await expect(page.getByText(/Duplicate SKU: also on row 1/)).toBeVisible();
    await expect(page.getByText(/SKU already exists/)).toBeVisible();
    await expect(page.getByText(/New make “Zotye” will be added/)).toBeVisible();

    await page.getByRole("button", { name: "Import 2 products" }).click();
    await expect(page.getByText("Import finished")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("2 created, 0 updated, 1 skipped, 2 with errors.")).toBeVisible();
  });

  test("imported products are correct (fuzzy make, number and enum cleaning, specs, draft)", async ({ page }) => {
    await page.goto("/admin/products?q=E2E-IMP");
    const row = page.getByRole("row", { name: /E2E-IMP-1/ });
    await expect(row).toContainText("Toyota & Lexus"); // "Toyota" matched the existing make
    await expect(row).toContainText("Draft");
    await expect(page.getByRole("row", { name: /E2E-IMP-2/ })).toContainText("Zotye");
    await expect(page.getByRole("row", { name: /E2E-IMP-3/ })).toHaveCount(0);

    await row.getByRole("link", { name: /Edit/ }).click();
    await hydrated(page);
    await expect(page.getByLabel("Displacement (cc)")).toHaveValue("3456");
    await expect(page.getByLabel("Fuel")).toHaveValue("PETROL");
    await expect(page.getByLabel("Model", { exact: true })).not.toHaveValue("");
    await expect(page.locator(".ProseMirror")).toContainText("Low mileage");
    await expect(page.getByLabel("Spec name 1")).toHaveValue("Weight");
    await expect(page.getByLabel("Spec value 2")).toHaveValue("Camry");
  });

  test("update mode changes only filled columns and never erases data", async ({ page }) => {
    await page.goto("/admin/import-export");
    await hydrated(page);
    await page.locator(IMPORT_INPUT).setInputFiles(csvFile("update.csv", "SKU,Title,Category,Stock,Price,Show price (yes/no)\nE2E-IMP-1,Toyota 2GR-FE Engine,Engines,9,1500,yes"));
    await page.getByLabel(/Update products that already exist/).check();
    await page.getByRole("button", { name: "Check my data" }).click();
    await expect(page.locator("ul.grid li").filter({ hasText: "Will update" })).toContainText("1");
    await page.getByRole("button", { name: "Import 1 product" }).click();
    await expect(page.getByText("0 created, 1 updated")).toBeVisible({ timeout: 30_000 });

    await page.goto("/admin/products?q=E2E-IMP-1");
    await page.getByRole("link", { name: /Edit/ }).first().click();
    await hydrated(page);
    await expect(page.getByLabel("Quantity in stock")).toHaveValue("9");
    await expect(page.getByLabel(/^Price/)).toHaveValue("1500");
    await expect(page.getByLabel("Displacement (cc)")).toHaveValue("3456"); // untouched
    await expect(page.locator(".ProseMirror")).toContainText("Low mileage"); // untouched
  });

  test("a file with no usable header fails clearly, and bad file types are refused", async ({ page }) => {
    await page.goto("/admin/import-export");
    await hydrated(page);
    await page.locator(IMPORT_INPUT).setInputFiles(csvFile("empty.csv", ""));
    await expect(page.getByRole("alert").filter({ hasText: /empty/i })).toBeVisible();
    const res = await page.request.post("/api/admin/import/parse", { multipart: { file: { name: "evil.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") } } });
    expect(res.status()).toBe(422);
  });

  test("photo ZIP attaches photos by SKU and reports unmatched files", async ({ page }) => {
    const zip = new JSZip();
    zip.file("E2E-IMP-1.jpg", seed("mb-c280-rear.jpg"));
    zip.file("E2E-IMP-1_2.jpg", seed("mb-e350-rear.jpg"));
    zip.file("not-a-sku.jpg", seed("mb-e350-interior.jpg"));
    zip.file("notes.txt", "ignore me");
    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    await page.goto("/admin/import-export");
    await hydrated(page);
    await page.locator('input[accept=".zip,application/zip"]').setInputFiles({ name: "photos.zip", mimeType: "application/zip", buffer });
    await expect(page.getByText("2 photos added to 1 product")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("did not match any SKU")).toBeVisible();
    await expect(page.getByText("not-a-sku.jpg")).toBeVisible();

    await page.goto("/admin/products?q=E2E-IMP-1");
    await page.getByRole("link", { name: /Edit/ }).first().click();
    await hydrated(page);
    await expect(page.getByRole("img", { name: /^Photo \d/ })).toHaveCount(2);
    await expect(page.getByText("Cover", { exact: true })).toBeVisible();

    // uploading the same ZIP again adds nothing new
    await page.goto("/admin/import-export");
    await hydrated(page);
    await page.locator('input[accept=".zip,application/zip"]').setInputFiles({ name: "photos.zip", mimeType: "application/zip", buffer });
    await expect(page.getByText("0 photos added")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("2 were already attached")).toBeVisible();
  });

  test("template and exports download in CSV and Excel", async ({ page }) => {
    const tpl = await page.request.get("/api/admin/import/template?format=csv");
    expect(tpl.headers()["content-disposition"]).toContain("product-import-template.csv");
    expect(await tpl.text()).toContain("Displacement (cc)");

    const csv = await page.request.get("/api/admin/products/export?format=csv");
    const body = await csv.text();
    expect(body).toContain("E2E-IMP-1");
    expect(body).toContain("Toyota & Lexus");
    expect(body).toContain("Tested engine"); // description exported as plain text

    const xlsx = await page.request.get("/api/admin/products/export?format=xlsx");
    expect(xlsx.headers()["content-type"]).toContain("spreadsheetml");
    expect((await xlsx.body()).subarray(0, 2).toString()).toBe("PK"); // a real zip container

    const anon = await page.context().browser()!.newContext({ storageState: { cookies: [], origins: [] } });
    expect((await anon.request.get("/api/admin/products/export")).status()).toBe(401);
    await anon.close();
  });
});

test.describe.serial("settings, brand colour, maintenance", () => {
  test.use({ storageState: "e2e/.auth.json" });

  test("changing the brand colour retints the public site", async ({ page }) => {
    await page.goto("/admin/settings");
    await hydrated(page);
    await page.getByLabel("Brand colour", { exact: true }).fill("#0055AA");
    await page.getByRole("button", { name: "Save" }).first().click();
    await expect(page.getByText("Settings saved.").first()).toBeVisible();
    await page.goto("/");
    await hydrated(page);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--brand-rgb").trim())).toBe("0 85 170");
    const bg = await page.getByRole("button", { name: /Inquiry list/ }).first().evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe("rgb(0, 85, 170)");
    // invalid colour is rejected
    await page.goto("/admin/settings");
    await hydrated(page);
    await page.getByLabel("Brand colour", { exact: true }).fill("blue");
    await page.getByRole("button", { name: "Save" }).first().click();
    await expect(page.getByRole("alert").filter({ hasText: /hex colour/ })).toBeVisible();
    // restore
    await page.getByLabel("Brand colour", { exact: true }).fill("#C8102E");
    await page.getByRole("button", { name: "Save" }).first().click();
    await expect(page.getByText("Settings saved.").first()).toBeVisible();
  });

  test("notification recipients validate and a test email can be sent", async ({ page }) => {
    await page.goto("/admin/settings");
    await hydrated(page);
    await page.getByLabel("Email addresses (one per line)").fill("not-an-email");
    await page.getByRole("button", { name: "Save" }).nth(1).click();
    await expect(page.getByRole("alert").filter({ hasText: /valid email/ })).toBeVisible();
    await page.getByLabel("Email addresses (one per line)").fill("sales@example.com\nowner@example.com");
    await page.getByRole("button", { name: "Save" }).nth(1).click();
    await expect(page.getByText("Settings saved.").first()).toBeVisible();
    await page.getByLabel(/Send a test email/).fill("me@example.com");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText("Test email sent.")).toBeVisible();
  });

  test("maintenance mode shows visitors a notice but not signed-in admins", async ({ page, browser }) => {
    await page.goto("/admin/settings");
    await hydrated(page);
    await page.getByLabel("Turn maintenance mode on").check();
    await page.getByRole("button", { name: "Save" }).last().click();
    await expect(page.getByText("Settings saved.").first()).toBeVisible();

    const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } }); // explicit: contexts otherwise inherit the signed-in session
    const vp = await visitor.newPage();
    await vp.goto("/catalog");
    await expect(vp.getByRole("heading", { name: "Back soon" })).toBeVisible();
    await expect(vp.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await visitor.close();

    await page.goto("/catalog");
    await expect(page.getByRole("heading", { name: "Catalog", level: 1 })).toBeVisible();
    await expect(page.getByText(/Maintenance mode is ON/)).toBeVisible();

    await page.goto("/admin/settings");
    await hydrated(page);
    await page.getByLabel("Turn maintenance mode on").uncheck();
    await page.getByRole("button", { name: "Save" }).last().click();
    await expect(page.getByText("Settings saved.").first()).toBeVisible();
  });
});

test.describe("roles", () => {
  test("an editor cannot see or open Settings or Users", async ({ page }) => {
    await page.goto("/admin/login");
    await hydrated(page);
    await page.getByLabel("Email").fill("e2e-editor@tripleaint.tw");
    await page.getByLabel("Password").fill("E2e-Editor-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/admin");
    await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Users & roles" })).toHaveCount(0);
    await page.goto("/admin/settings");
    await expect(page).toHaveURL(/denied=1/);
    const r = await page.request.post("/api/admin/import/validate", { data: { rows: [], mapping: {}, options: { updateExisting: false, createMissingTaxonomy: false, defaultStatus: "DRAFT" } } });
    expect(r.status()).toBe(200); // editors may import products
  });
});

test.describe("analytics privacy", () => {
  test.use({ storageState: "e2e/.auth.json" });

  test("counts real visits only; skips bots and Do-Not-Track", async ({ page, playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
    for (let i = 0; i < 3; i++) expect((await anon.post("/api/track", { data: { path: "/e2e-human-path?utm=x#y" } })).status()).toBe(204);
    await anon.post("/api/track", { data: { path: "/e2e-bot-path" }, headers: { "User-Agent": "Googlebot/2.1" } });
    await anon.post("/api/track", { data: { path: "/e2e-dnt-path" }, headers: { DNT: "1" } });
    await anon.post("/api/track", { data: { path: "/admin/secret" } });
    await anon.dispose();

    await page.goto("/admin");
    const top = page.getByRole("heading", { name: "Top pages, last 30 days" }).locator("..");
    await expect(top).toContainText("/e2e-human-path");
    await expect(top).not.toContainText("utm");
    await expect(top).not.toContainText("e2e-bot-path");
    await expect(top).not.toContainText("e2e-dnt-path");
    await expect(top).not.toContainText("/admin/secret");
  });
});

test.describe.serial("two-factor authentication", () => {
  const email = "e2e-editor@tripleaint.tw";
  let password = "E2e-Editor-123";
  let secret = "";
  let backup: string[] = [];

  async function signIn(page: Page, code?: string, pw = password) {
    await page.goto("/admin/login");
    await hydrated(page);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(pw);
    await page.getByRole("button", { name: "Sign in" }).click();
    if (code !== undefined) {
      await page.getByLabel("Authentication code").fill(code);
      await page.getByRole("button", { name: "Verify and sign in" }).click();
    }
  }

  test("set up with a QR code and receive backup codes", async ({ page }) => {
    await signIn(page);
    await page.waitForURL("**/admin");
    await page.goto("/admin/account");
    await hydrated(page);
    await page.getByRole("button", { name: "Set up" }).click();
    await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible();
    secret = (await page.locator("code").first().innerText()).trim();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);

    await page.getByLabel("6-digit code").fill("000000");
    await page.getByRole("button", { name: "Turn on" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /not right/ })).toBeVisible();

    await page.getByLabel("6-digit code").fill(totpAt(secret));
    await page.getByRole("button", { name: "Turn on" }).click();
    await expect(page.getByText("They will not be shown again.")).toBeVisible();
    backup = (await page.locator("ul.font-mono li").allInnerTexts()).map((s) => s.trim());
    expect(backup).toHaveLength(10);
    expect(backup[0]).toMatch(/^[0-9a-f]{4}-[0-9a-f]{4}$/);
    await page.getByRole("button", { name: "I have saved them" }).click();
    await expect(page.getByText("9 backup codes left").or(page.getByText("10 backup codes left"))).toBeVisible();
  });

  test("sign-in now needs the code: wrong code fails, correct code works", async ({ page }) => {
    await signIn(page, "123456");
    await expect(page.getByRole("alert").filter({ hasText: /not valid/ })).toBeVisible();
    await page.getByLabel("Authentication code").fill(totpAt(secret, Date.now() - 30_000)); // previous step: valid within drift, not used yet
    await page.getByRole("button", { name: "Verify and sign in" }).click();
    await page.waitForURL("**/admin");
    await expect(page.getByRole("heading", { name: /Hello, E2E/ })).toBeVisible();
  });

  test("the credentials endpoint cannot bypass 2FA", async ({ playwright, baseURL }) => {
    const ctx = await playwright.request.newContext({ baseURL });
    const { csrfToken } = await (await ctx.get("/api/auth/csrf")).json();
    await ctx.post("/api/auth/callback/credentials", { form: { csrfToken, email, password, json: "true" } });
    expect(await (await ctx.get("/api/auth/session")).json()).toBeNull();
    await ctx.dispose();
  });

  test("a backup code signs in once and then stops working", async ({ page, browser }) => {
    await signIn(page, backup[0]);
    await page.waitForURL("**/admin");
    const second = await browser.newContext();
    const p2 = await second.newPage();
    await signIn(p2, backup[0]);
    await expect(p2.getByRole("alert").filter({ hasText: /not valid/ })).toBeVisible();
    await second.close();
  });

  test("an admin can see the 2FA badge and reset it for a locked-out colleague", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: "e2e/.auth.json" });
    const page = await ctx.newPage();
    await page.goto("/admin/users");
    await hydrated(page);
    const row = page.getByRole("row", { name: /e2e-editor/ });
    await expect(row.getByText("2FA", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: /Reset 2FA/ }).click();
    await expect(page.getByRole("row", { name: /e2e-editor/ }).getByText("2FA", { exact: true })).toHaveCount(0);
    await ctx.close();
  });

  test("password change needs the current password, then the new one works", async ({ page }) => {
    await signIn(page); // 2FA was reset, so password alone works
    await page.waitForURL("**/admin");
    await page.goto("/admin/account");
    await hydrated(page);
    const form = page.getByRole("heading", { name: "Change password" }).locator("..");
    await form.getByLabel("Current password").fill("wrong-password-1");
    await form.getByLabel("New password", { exact: true }).fill("Brand-New-Pass-99");
    await form.getByLabel("Repeat new password").fill("Brand-New-Pass-99");
    await form.getByRole("button", { name: "Change password" }).click();
    await expect(form.getByRole("alert")).toContainText("not correct");

    await form.getByLabel("Current password").fill(password);
    await form.getByRole("button", { name: "Change password" }).click();
    await expect(form.getByRole("status")).toContainText("Password changed.");
    password = "Brand-New-Pass-99";

    const fresh = await page.context().browser()!.newContext();
    const p2 = await fresh.newPage();
    await signIn(p2);
    await p2.waitForURL("**/admin");
    await fresh.close();
  });
});
