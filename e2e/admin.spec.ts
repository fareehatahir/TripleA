import path from "path";
import { expect, test, type Page } from "@playwright/test";
import { TEST_ENV } from "../playwright.config";

const photo = path.join(__dirname, "../prisma/seed-assets/mb-c280-side.jpg");

async function submitLogin(page: Page, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(TEST_ENV.ADMIN_EMAIL);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

const signedIn = { storageState: "e2e/.auth.json" };

test("admin area requires login", async ({ page }) => {
  await page.goto("/admin/products");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("login rejects a wrong password and accepts the right one", async ({ page }) => {
  await submitLogin(page, "definitely-wrong");
  await expect(page.locator("form [role=alert]")).toContainText("Incorrect email or password");
  await submitLogin(page, TEST_ENV.ADMIN_PASSWORD);
  await page.waitForURL("**/admin");
  await expect(page.getByRole("heading", { name: /Hello, E2E/ })).toBeVisible();
  await expect(page.getByText("Total products")).toBeVisible();
});

test.describe.serial("catalog management", () => {
  test.use(signedIn);
  test("add a model in Taxonomy", async ({ page }) => {
    await page.goto("/admin/taxonomy");
    await page.getByRole("tab", { name: "Makes & models" }).click();
    await page.getByRole("button", { name: /Toyota & Lexus/, expanded: false }).click();
    await page.getByRole("button", { name: /Add model to Toyota & Lexus/ }).click();
    await page.getByLabel("Name", { exact: true }).fill("Hilux");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Hilux", { exact: false }).first()).toBeVisible();
  });

  test("create a product with a photo, then see it in the list", async ({ page }) => {
    await page.goto("/admin/products/new");
    await page.getByLabel("Title", { exact: true }).fill("E2E Toyota Hilux 2.4D");
    await expect(page.getByLabel("URL name (slug)")).toHaveValue("e2e-toyota-hilux-2-4d");
    await page.getByLabel("SKU / code").fill("E2E-001");
    await page.getByLabel("Category").selectOption({ label: "Cars" });
    await page.getByLabel("Make", { exact: true }).selectOption({ label: "Toyota & Lexus" });
    await page.getByLabel("Model", { exact: true }).selectOption({ label: "Hilux" });
    await page.locator('input[type="file"]').setInputFiles(photo);
    await expect(page.getByRole("img", { name: "Photo 1" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Cover", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page).toHaveURL(/\/admin\/products\/(?!new)[a-z0-9]+/, { timeout: 15_000 });
    await expect(page.getByText("Saved.")).toBeVisible();

    await page.goto("/admin/products?q=E2E-001");
    const row = page.getByRole("row", { name: /E2E Toyota Hilux/ });
    await expect(row).toBeVisible();
    await expect(row.getByText("Published")).toBeVisible();
    await expect(row.locator("img")).toBeVisible(); // thumbnail served from /uploads
  });

  test("duplicate SKU is rejected with a clear message", async ({ page }) => {
    await page.goto("/admin/products/new");
    await page.getByLabel("Title", { exact: true }).fill("E2E Another");
    await page.getByLabel("SKU / code").fill("E2E-001");
    await page.getByLabel("Category").selectOption({ label: "Engines" });
    await page.getByRole("button", { name: "Save as draft" }).click();
    await expect(page.locator("form [role=alert]").first()).toContainText("already uses this SKU");
  });

  test("bulk unpublish then delete with confirmation", async ({ page }) => {
    await page.goto("/admin/products?q=E2E-001");
    await page.getByRole("checkbox", { name: /Select E2E Toyota/ }).check();
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByText("1 product updated.")).toBeVisible();
    await page.getByRole("checkbox", { name: /Select E2E Toyota/ }).check();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("No products match your filters")).toBeVisible();
  });

  test("uploaded image appears in the media library and is served as WebP", async ({ page, request }) => {
    await page.goto("/admin/media");
    const img = page.locator("ul img").first();
    await expect(img).toBeVisible();
    const src = await img.getAttribute("src");
    const res = await request.get(src!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/webp");
  });
});

test.describe("upload endpoint", () => {
  test.use(signedIn);
  test("rejects non-images and anonymous callers", async ({ page, playwright, baseURL }) => {
    const anonCtx = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
    const anon = await anonCtx.post("/api/admin/upload", { multipart: { files: { name: "a.jpg", mimeType: "image/jpeg", buffer: Buffer.from("x") } } });
    expect(anon.status()).toBe(401);
    const bad = await page.request.post("/api/admin/upload", { multipart: { files: { name: "evil.jpg", mimeType: "image/jpeg", buffer: Buffer.from("<script>alert(1)</script>") } } });
    expect(bad.status()).toBe(422);
    expect((await bad.json()).errors[0]).toContain("not a readable image");
  });
});
