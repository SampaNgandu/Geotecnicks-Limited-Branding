import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = ["/", "/about/", "/services/", "/projects/", "/expertise/", "/contact/"];
for (const width of [320, 1280]) {
  for (const route of routes) {
    test(`${route} at ${width}px: accessible and no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(route);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator('[aria-current="page"]')).toHaveAttribute("href", route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(results.violations).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}

test("keyboard skip link and mobile menu", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const menu = page.getByRole("button", { name: "Toggle navigation" });
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(page.locator('#site-nav a').first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(page.locator("#site-nav")).toBeHidden();
});

test("without JavaScript navigation and direct contact remain usable", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:8788/contact/");
  await expect(page.locator("#site-nav")).toBeVisible();
  await expect(page.locator("#enquiry-form")).toBeHidden();
  await expect(page.locator('address a[href^="mailto:"]')).toBeVisible();
  await expect(page.locator("noscript")).toContainText("email or WhatsApp");
  await context.close();
});

test("enquiry validates required fields without a network submission", async ({ page }) => {
  await page.goto("/contact/");
  const form = page.locator("#enquiry-form");
  await expect(form).toBeVisible();
  await page.getByRole("button", { name: "Continue to email" }).click();
  await expect(page.getByLabel("Full name (required)")).toBeFocused();
  await page.getByLabel("Full name (required)").fill("Test Person");
  await page.getByLabel("Email address (required)").fill("person@example.com");
  await page.getByLabel("Service of interest (required)").selectOption({ label: "Geotechnical Services" });
  await page.getByLabel("Enquiry details (required)").fill("Site enquiry & details");
  expect(await form.evaluate(node => node.checkValidity())).toBe(true);
  // The mailto submit handler is exercised separately without launching an email client.
});

test("reduced motion disables smooth scrolling and transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
  expect(await page.locator(".button").first().evaluate(node => parseFloat(getComputedStyle(node).transitionDuration))).toBeLessThan(0.001);
});
