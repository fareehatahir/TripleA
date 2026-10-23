import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const hydrated = (page: Page) => page.waitForSelector("html[data-hydrated]");

async function audit(page: Page, path: string) {
  await page.goto(path);
  await hydrated(page);
  await page.waitForTimeout(1200); // let entrance animations finish so colours are final
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(summary, `${path}\n${summary.join("\n")}`).toEqual([]);
}

test.describe("WCAG 2.2 AA: public pages", () => {
  test.use({ viewport: { width: 1280, height: 900 } });
  for (const path of ["/", "/catalog", "/catalog/cars", "/product/mercedes-benz-e350-coupe", "/inquiry", "/shipping", "/services", "/about", "/loading", "/contact", "/blog", "/privacy"]) {
    test(path, async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("ta-cookie", "essential"));
      await audit(page, path);
    });
  }
  test("cookie banner and mobile layout", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await audit(page, "/catalog");
  });
});

const ADMIN = ["/admin", "/admin/products", "/admin/products/new", "/admin/inquiries", "/admin/taxonomy", "/admin/media", "/admin/content", "/admin/content/home", "/admin/shipping-rates", "/admin/loading-gallery", "/admin/messages", "/admin/blog", "/admin/users", "/admin/settings", "/admin/import-export", "/admin/account", "/admin/activity"];

test.describe("WCAG 2.2 AA: admin (light)", () => {
  test.use({ storageState: "e2e/.auth.json", viewport: { width: 1280, height: 900 } });
  for (const path of ADMIN) test(path, async ({ page }) => audit(page, path));
});

test.describe("WCAG 2.2 AA: admin (dark mode)", () => {
  test.use({ storageState: "e2e/.auth.json", viewport: { width: 1280, height: 900 } });
  for (const path of ADMIN) {
    test(path, async ({ page, context }) => {
      await context.addCookies([{ name: "ta-admin-theme", value: "dark", url: "http://localhost:3200" }]);
      await audit(page, path);
    });
  }
});

test("admin login page", async ({ page }) => audit(page, "/admin/login"));
