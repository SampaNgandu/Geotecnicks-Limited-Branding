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
      const logo = page.getByRole("img", { name: "Geotecnicks Limited", exact: true }).first();
      await expect(logo).toBeVisible();
      await expect(logo).toHaveAttribute("src", "/assets/logo.jpg");
      await expect(logo).toHaveJSProperty("complete", true);
      expect(await logo.evaluate(node => node.naturalWidth)).toBeGreaterThan(0);
      await expect(page.locator("body")).not.toContainText(/\b(?:construction|environmental)\b/i);
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
  await expect(page.locator("noscript p")).toContainText("email or WhatsApp");
  await page.goto("http://127.0.0.1:8788/projects/");
  await expect(page.locator("[data-project-card]:visible")).toHaveCount(4);
  await context.close();
});

test("project filters work by keyboard, announce the count, and reset", async ({ page }) => {
  await page.goto("/projects/");
  const cards = page.locator("[data-project-card]");
  const count = page.locator("[data-project-count]");
  const all = page.locator('[data-project-filter="all"]');
  await expect(cards).toHaveCount(4);
  await expect(page.locator("[data-project-card]:visible")).toHaveCount(4);
  await expect(all).toHaveAttribute("aria-pressed", "true");
  await expect(count).toHaveAttribute("aria-live", "polite");
  await expect(count).toContainText(/\b4\b/);

  for (const category of ["mining", "geotechnical"]) {
    const filter = page.locator(`[data-project-filter="${category}"]`);
    await filter.focus();
    await page.keyboard.press("Space");
    await expect(filter).toBeFocused();
    await expect(filter).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('[data-project-filter][aria-pressed="true"]')).toHaveCount(1);
    await expect(page.locator(`[data-project-card][data-category="${category}"]:visible`)).toHaveCount(2);
    await expect(page.locator(`[data-project-card]:not([data-category="${category}"]):visible`)).toHaveCount(0);
    await expect(count).toContainText(/\b2\b/);
  }

  await all.click();
  await expect(page.locator("[data-project-card]:visible")).toHaveCount(4);
  await expect(all).toHaveAttribute("aria-pressed", "true");
  await expect(count).toContainText(/\b4\b/);
});

test("a service enquiry link preselects the service and remains editable", async ({ page }) => {
  await page.goto("/services/");
  await page.locator('a[href="/contact/?service=geotechnical"]').first().click();
  await expect(page).toHaveURL(/\/contact\/\?service=geotechnical$/);
  const service = page.getByLabel("Service of interest (required)");
  await expect(service).toHaveValue("geotechnical");
  await service.selectOption("mine-monitoring");
  await expect(service).toHaveValue("mine-monitoring");

  await page.goto("/contact/?service=unknown-service");
  await expect(service).toHaveValue("");
  await expect(page.locator("#enquiry-form")).toBeVisible();
});

test("local search finds services and supports keyboard dismissal", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Search website", exact: true });
  const dialog = page.locator("#search-dialog");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  const input = dialog.getByLabel("Search pages and services", { exact: true });
  await expect(input).toBeFocused();
  await input.fill("photogrammetry");
  const result = dialog.getByRole("link", { name: /photogrammetry/i }).first();
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute("href", /^\/services\/(?:[?#].*)?$/);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);

  await input.fill("no-such-service-xyz");
  await expect(dialog).toContainText("No matching pages or services.");
  await expect(dialog.getByRole("link")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await input.fill("photogrammetry");
  await result.click();
  await expect(page).toHaveURL(/\/services\/(?:[?#].*)?$/);
});

test("a search result on the current page closes search and reveals its section", async ({ page }) => {
  await page.goto("/services/");
  await page.getByRole("button", { name: "Search website", exact: true }).click();
  const dialog = page.locator("#search-dialog");
  await dialog.getByLabel("Search pages and services", { exact: true }).fill("mining services");
  await dialog.getByRole("link", { name: /Mining Services/i }).click();
  await expect(page).toHaveURL(/\/services\/#mining$/);
  await expect(dialog).toBeHidden();
  await expect(page.locator("#mining")).toBeInViewport();
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
