import { expect, test } from "@playwright/test";

// React has hydrated (see HydrationMarker), so clicks and typing will register
const settled = (page: import("@playwright/test").Page) => page.waitForSelector("html[data-hydrated]");

test.describe("catalog", () => {
  test("lists published products and hides drafts", async ({ page }) => {
    await page.goto("/catalog");
    await expect(page.getByRole("heading", { name: "Catalog", level: 1 })).toBeVisible();
    await expect(page.locator("main article")).toHaveCount(5);
    await expect(page.getByText("Mercedes-Benz C280 Sedan").first()).toBeVisible();
  });

  test("filters by make from the sidebar and updates the URL", async ({ page }) => {
    await page.goto("/catalog");
    await settled(page);
    await page.getByRole("radio", { name: /^Mercedes-Benz/ }).click();
    await expect(page).toHaveURL(/make=mercedes-benz/);
    await expect(page.locator("main article")).toHaveCount(4);
    await expect(page.getByText("BMW X5 Engine")).toHaveCount(0);
  });

  test("category and make paths are clean URLs with breadcrumbs", async ({ page }) => {
    await page.goto("/catalog/engines/bmw");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Engines · BMW");
    await expect(page.locator("main article")).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Engines");
    expect(await page.locator('script[type="application/ld+json"]').allTextContents()).toEqual(expect.arrayContaining([expect.stringContaining("BreadcrumbList")]));
  });

  test("unknown category is a 404", async ({ page }) => {
    const res = await page.goto("/catalog/spaceships");
    expect(res?.status()).toBe(404);
  });

  test("search shows instant suggestions", async ({ page }) => {
    await page.goto("/catalog");
    await settled(page);
    await page.getByRole("searchbox", { name: "Search catalog" }).first().fill("C280");
    await expect(page.getByRole("listbox", { name: "Suggestions" }).getByText("Mercedes-Benz C280 Sedan")).toBeVisible();
  });

  test("text search and in-stock filter narrow the results", async ({ page }) => {
    await page.goto("/catalog?q=door");
    await expect(page.locator("main article")).toHaveCount(1);
    await page.goto("/catalog?q=zzzznothing");
    await expect(page.getByText("Nothing matches those filters")).toBeVisible();
  });

  test("quick view opens and closes with Escape", async ({ page }) => {
    await page.goto("/catalog");
    await settled(page);
    await page.getByRole("button", { name: /Quick view Mercedes-Benz C280/ }).click();
    const dialog = page.getByRole("dialog", { name: /Quick view/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Price on request")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test.describe("product page", () => {
  test("shows specs, price on request, structured data and WhatsApp", async ({ page }) => {
    await page.goto("/product/mercedes-benz-e350-coupe");
    await expect(page.getByRole("heading", { name: "Mercedes-Benz E350 Coupe", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Specifications" })).toBeVisible();
    await expect(page.getByText("3,500 cc")).toBeVisible();
    await expect(page.getByText("Price on request").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Chat on WhatsApp/ }).first()).toHaveAttribute("href", /^https:\/\/wa\.me\//);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("");
    expect(ld).toContain('"@type":"Product"');
    expect(ld).toContain("CAR-0002");
    await expect(page).toHaveTitle(/E350 Coupe/);
  });

  test("gallery thumbnails switch photos and the lightbox opens", async ({ page }) => {
    await page.goto("/product/mercedes-benz-e350-coupe");
    await settled(page);
    await page.getByRole("button", { name: "Show photo 2" }).click();
    await expect(page.getByRole("button", { name: "Show photo 2" })).toHaveAttribute("aria-current", "true");
    await page.getByRole("button", { name: "Open full-screen viewer" }).click();
    const viewer = page.getByRole("dialog", { name: "Photo viewer" });
    await expect(viewer).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(viewer.getByText("3 / 3")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();
  });

  test("unknown product is a 404", async ({ page }) => {
    expect((await page.goto("/product/does-not-exist"))?.status()).toBe(404);
  });
});

test.describe("SEO", () => {
  test("robots.txt hides admin and sitemap lists products", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/product/mercedes-benz-c280-sedan");
    expect(sitemap).toContain("/catalog/engines/bmw");
  });
});

test.describe.serial("inquiry journey", () => {
  let reference = "";

  test("validation errors are shown on an empty form", async ({ page }) => {
    await page.goto("/inquiry");
    await settled(page);
    await page.getByRole("button", { name: "Send inquiry", exact: true }).click();
    await expect(page.getByText("Please enter your name")).toBeVisible();
    await expect(page.getByText("Choose your country")).toBeVisible();
    await expect(page.getByText("Please accept the privacy notice")).toBeVisible();
  });

  test("buyer adds a product and sends an inquiry", async ({ page }) => {
    await page.goto("/product/mercedes-benz-c280-sedan");
    await settled(page);
    const panel = page.locator("aside");
    await panel.getByLabel("Quantity", { exact: true }).fill("5");
    await expect(panel.getByLabel("Quantity", { exact: true })).toHaveValue("1"); // capped at the 1 unit in stock
    await panel.getByLabel("Message (optional)").fill("Need RHD, port Mombasa");
    await panel.getByRole("button", { name: "Send inquiry" }).click();
    await expect(page).toHaveURL(/\/inquiry/);
    await expect(page.getByRole("link", { name: "Mercedes-Benz C280 Sedan" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Quantity of Mercedes-Benz C280 Sedan" })).toHaveValue("1");
    await expect(page.getByRole("textbox", { name: "Note for Mercedes-Benz C280 Sedan" })).toHaveValue("Need RHD, port Mombasa");

    await page.getByLabel("Full name *").fill("Samuel Kamau");
    await page.getByLabel("Company").fill("Kamau Motors");
    await page.getByLabel("Country *").selectOption({ label: "🇰🇪  Kenya" });
    await page.getByLabel("Phone / WhatsApp *").fill("+254 700 123 456");
    await page.getByLabel("Email *").fill("samuel@example.com");
    await page.getByLabel("Destination port").fill("Mombasa");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Send inquiry", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Inquiry sent" })).toBeVisible({ timeout: 15_000 });
    const text = await page.getByText(/Your reference is/).innerText();
    reference = text.match(/TA-\d{6}-[0-9A-F]{6}/)![0];
    await expect(page.getByRole("link", { name: /send via WhatsApp/i })).toHaveAttribute("href", /wa\.me/);

    // the list is emptied after sending
    await page.goto("/inquiry");
    await expect(page.getByText("Your list is empty")).toBeVisible();
  });

  test("a bot that fills the hidden field gets no inquiry saved", async ({ page }) => {
    await page.goto("/inquiry");
    await settled(page);
    await page.getByLabel("Full name *").fill("Spam Bot");
    await page.getByLabel("Country *").selectOption({ label: "🇰🇪  Kenya" });
    await page.getByLabel("Phone / WhatsApp *").fill("+1 555 000 1111");
    await page.getByLabel("Email *").fill("bot@example.com");
    await page.getByLabel("Message").fill("buy cheap pills");
    await page.getByRole("checkbox").check();
    await page.locator('form[aria-label="Contact details"] input[name="website"]').evaluate((el: HTMLInputElement) => {
      // Use the native setter so React's value tracker notices the change, like a real autofill bot would trigger.
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, "http://spam.example");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.getByRole("button", { name: "Send inquiry", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Inquiry sent" })).toBeVisible();
  });

  test("admin sees the inquiry, works it, and replies", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: "e2e/.auth.json" });
    const page = await ctx.newPage();
    await page.goto("/admin/inquiries");
    await expect(page.getByText("Spam Bot")).toHaveCount(0); // honeypot submission was dropped
    await page.getByRole("link", { name: reference }).click();

    await expect(page.getByRole("heading", { name: reference })).toBeVisible();
    await expect(page.getByText("Samuel Kamau")).toBeVisible();
    await expect(page.getByText("Mercedes-Benz C280 Sedan")).toBeVisible();
    await expect(page.getByText("Need RHD, port Mombasa")).toBeVisible();
    await settled(page);

    await page.getByLabel("Status").selectOption("QUOTED");
    await expect(page.getByText("Status updated.")).toBeVisible();

    await page.getByLabel("Internal notes").fill("Quoted FOB, waiting on payment");
    await page.getByRole("button", { name: "Save notes" }).click();
    await expect(page.getByText("Notes saved.")).toBeVisible();

    await page.getByLabel("Message", { exact: true }).fill("Hello Samuel, the C280 is available. Quote attached.");
    await page.getByRole("button", { name: "Send email" }).click();
    await expect(page.getByText("Email sent.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Emails sent" })).toBeVisible();

    // CSV export is available and safe
    const csv = await page.request.get("/api/admin/inquiries/export");
    expect(csv.status()).toBe(200);
    const body = await csv.text();
    expect(body).toContain(reference);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    await ctx.close();
  });

  test("export requires login", async ({ request }) => {
    expect((await request.get("/api/admin/inquiries/export")).status()).toBe(401);
  });
});
