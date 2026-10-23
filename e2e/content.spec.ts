import path from "path";
import { expect, test } from "@playwright/test";

const hydrated = (page: import("@playwright/test").Page) => page.waitForSelector("html[data-hydrated]");
const photo = path.join(__dirname, "../prisma/seed-assets/mb-c280-side.jpg");

test.describe("public content pages", () => {
  test("shipping: rate table, expired row, process, charges, FAQ accordion", async ({ page }) => {
    await page.goto("/shipping");
    await expect(page.getByRole("heading", { name: "Ocean freight rates" })).toBeVisible();
    await expect(page.getByRole("row", { name: /Kenya.*Mombasa/ })).toContainText("$2,650");
    const expired = page.getByRole("row", { name: /Philippines/ });
    await expect(expired).toContainText("Expired");
    await expect(expired).toContainText("Ask for latest");
    await expect(page.getByRole("heading", { name: "How shipping works" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Charges explained" })).toBeVisible();
    await hydrated(page);
    const q = page.getByRole("button", { name: "Can I see the goods before they ship?" });
    await q.click();
    await expect(q).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("We send photos and video of the exact units")).toBeVisible();
    expect(await page.locator('script[type="application/ld+json"]').allTextContents()).toEqual(expect.arrayContaining([expect.stringContaining("FAQPage")]));
  });

  test("services, about, privacy, terms, blog render", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByRole("heading", { name: "Used Engines & Gearboxes" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Engine code abbreviations" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "2GR-FE" })).toBeVisible();
    await page.goto("/about");
    await expect(page.getByRole("heading", { name: "Our journey" })).toBeVisible();
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy notice", level: 2 })).toBeVisible();
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: "Terms of use", level: 2 })).toBeVisible();
    await page.goto("/blog");
    await expect(page.getByText("No articles yet")).toBeVisible();
  });

  test("loading gallery shows photos and opens the lightbox with a caption", async ({ page }) => {
    await page.goto("/loading");
    await hydrated(page);
    await expect(page.locator("main ul li")).toHaveCount(2);
    await page.locator("main ul li button").first().click();
    const viewer = page.getByRole("dialog", { name: "Photo viewer" });
    await expect(viewer).toBeVisible();
    await expect(viewer.getByText("Container loading")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();
  });
});

test.describe.serial("contact + newsletter → admin", () => {
  test("contact form validates and sends", async ({ page }) => {
    await page.goto("/contact");
    await hydrated(page);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Please enter your name")).toBeVisible();
    await page.getByLabel("Name *").fill("Amina Yusuf");
    await page.getByLabel("Email *").fill("amina@example.com");
    await page.getByLabel("Subject *").fill("Engine for Prado");
    await page.getByLabel("Message *").fill("Do you have a 1GR-FE engine in stock? Port Dar es Salaam.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("heading", { name: "Message sent" })).toBeVisible();
  });

  test("newsletter signup from the footer", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);
    await page.getByLabel("Stock updates & freight news").fill("buyer@example.com");
    await page.getByRole("button", { name: "Join" }).click();
    await expect(page.getByText("Thanks, you are on the list.")).toBeVisible();
  });

  test.describe("admin side", () => {
    test.use({ storageState: "e2e/.auth.json" });

    test("message is unread, opens, and becomes read", async ({ page }) => {
      await page.goto("/admin/messages");
      await hydrated(page);
      const row = page.getByRole("button", { name: /Engine for Prado/ });
      await expect(row.getByLabel("Unread")).toBeVisible();
      await row.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("1GR-FE engine in stock")).toBeVisible();
      await expect(dialog.getByRole("link", { name: "Reply by email" })).toHaveAttribute("href", /mailto:amina@example.com/);
      await dialog.getByRole("button", { name: "Close" }).click();
      await page.reload();
      await expect(page.getByRole("button", { name: /Engine for Prado/ }).getByLabel("Read")).toBeVisible();
    });

    test("subscriber is listed", async ({ page }) => {
      await page.goto("/admin/messages?tab=subscribers");
      await expect(page.getByText("buyer@example.com")).toBeVisible();
      const csv = await page.request.get("/api/admin/subscribers/export");
      expect(await csv.text()).toContain("buyer@example.com");
    });
  });
});

test.describe.serial("CMS edits go live", () => {
  test.use({ storageState: "e2e/.auth.json" });

  test("edit the home hero headline", async ({ page }) => {
    await page.goto("/admin/content/home");
    await hydrated(page);
    await page.getByLabel("Headline, line 1").fill("Engines you can trust");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved. The website is updated.")).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Engines you can trust");
  });

  test("reset restores the default headline", async ({ page }) => {
    await page.goto("/admin/content/home");
    await hydrated(page);
    await page.getByRole("button", { name: "Reset to defaults" }).click();
    await Promise.all([page.waitForEvent("load"), page.getByRole("dialog").getByRole("button", { name: "Reset" }).click()]);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Used cars, engines");
  });

  test("WhatsApp number and announcement banner apply across the site", async ({ page }) => {
    await page.goto("/admin/content/site");
    await hydrated(page);
    await page.getByLabel("WhatsApp number").fill("+886 912 345 678");
    await page.getByLabel("Show the banner").check();
    await page.getByLabel("Text", { exact: true }).fill("Container to Mombasa leaves 30th");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved. The website is updated.")).toBeVisible();

    await page.goto("/contact");
    await expect(page.getByText("Container to Mombasa leaves 30th")).toBeVisible();
    await expect(page.getByRole("link", { name: "Chat on WhatsApp" })).toHaveAttribute("href", /wa\.me\/886912345678/);
    await expect(page.getByRole("link", { name: "+886912345678" })).toBeVisible();

    // restore defaults for the remaining tests
    await page.goto("/admin/content/site");
    await hydrated(page);
    await page.getByRole("button", { name: "Reset to defaults" }).click();
    await Promise.all([page.waitForEvent("load"), page.getByRole("dialog").getByRole("button", { name: "Reset" }).click()]);
  });

  test("privacy text can be edited", async ({ page }) => {
    await page.goto("/admin/content/legal");
    await hydrated(page);
    const editors = page.locator(".ProseMirror");
    await editors.first().click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Custom privacy text from the owner.");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved. The website is updated.")).toBeVisible();
    await page.goto("/privacy");
    await expect(page.getByText("Custom privacy text from the owner.")).toBeVisible();
  });
});

test.describe.serial("freight rates, gallery, blog", () => {
  test.use({ storageState: "e2e/.auth.json" });

  test("add a freight rate, see it live, and delete it", async ({ page }) => {
    await page.goto("/admin/shipping-rates");
    await hydrated(page);
    await expect(page.getByRole("row", { name: /Philippines/ })).toContainText("Expired");
    await page.getByRole("button", { name: "Add rate" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Destination country").fill("Testland");
    await d.getByLabel("Destination port").fill("Testport");
    await d.getByLabel("Freight (USD)").fill("1234");
    await d.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("row", { name: /Testland/ })).toBeVisible();
    await page.goto("/shipping");
    await expect(page.getByRole("row", { name: /Testland.*Testport/ })).toContainText("$1,234");

    await page.goto("/admin/shipping-rates");
    await hydrated(page);
    await page.getByRole("row", { name: /Testland/ }).getByRole("button", { name: "Delete rate" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("row", { name: /Testland/ })).toHaveCount(0);
  });

  test("a validation error is shown for an incomplete rate", async ({ page }) => {
    await page.goto("/admin/shipping-rates");
    await hydrated(page);
    await page.getByRole("button", { name: "Add rate" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Enter the destination country");
  });

  test("upload a gallery photo with a destination", async ({ page }) => {
    await page.goto("/admin/loading-gallery");
    await hydrated(page);
    await page.getByLabel("Destination").first().fill("Testport, Testland");
    await page.locator('input[type="file"]').setInputFiles(photo);
    await expect(page.getByText("1 photo added to the gallery.")).toBeVisible({ timeout: 20_000 });
    await page.goto("/loading");
    await expect(page.getByRole("link", { name: "Testport, Testland" })).toBeVisible();
    await expect(page.locator("main ul li")).toHaveCount(3);
    await page.getByRole("link", { name: "Testport, Testland" }).click();
    await expect(page.locator("main ul li")).toHaveCount(1);
  });

  test("blog: draft hidden, publish visible, scheduled hidden, delete", async ({ page }) => {
    // publish now
    await page.goto("/admin/blog/new");
    await hydrated(page);
    await page.getByLabel("Title", { exact: true }).fill("How to import a used engine");
    await page.locator(".ProseMirror").click();
    await page.keyboard.type("Start with the engine code, then confirm the VIN and shipping port.");
    await page.getByLabel("Add a tag").fill("engines");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page).toHaveURL(/\/admin\/blog\/(?!new)[a-z0-9]+/, { timeout: 15_000 });

    await page.goto("/blog");
    await expect(page.getByRole("link", { name: /How to import a used engine/ })).toBeVisible();
    await page.goto("/blog/how-to-import-a-used-engine");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("How to import a used engine");
    await expect(page.getByRole("link", { name: "Share on WhatsApp" })).toBeVisible();
    expect((await page.locator('script[type="application/ld+json"]').allTextContents()).join("")).toContain('"@type":"Article"');

    // scheduled post is not public yet
    await page.goto("/admin/blog/new");
    await hydrated(page);
    await page.getByLabel("Title", { exact: true }).fill("Future announcement");
    await page.locator(".ProseMirror").click();
    await page.keyboard.type("This article is scheduled for the far future.");
    await page.getByLabel("Publish date and time").fill("2099-01-01T10:00");
    await page.getByRole("button", { name: "Schedule" }).click();
    await expect(page).toHaveURL(/\/admin\/blog\/(?!new)[a-z0-9]+/, { timeout: 15_000 });
    await page.goto("/blog");
    await expect(page.getByText("Future announcement")).toHaveCount(0);
    expect((await page.goto("/blog/future-announcement"))?.status()).toBe(404);

    // admin list shows both states, then clean up
    await page.goto("/admin/blog");
    await expect(page.getByText(/Scheduled/)).toBeVisible();
    for (const t of ["Future announcement", "How to import a used engine"]) {
      await page.getByRole("button", { name: `Delete ${t}` }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
      await expect(page.getByRole("button", { name: `Delete ${t}` })).toHaveCount(0);
    }
  });
});
