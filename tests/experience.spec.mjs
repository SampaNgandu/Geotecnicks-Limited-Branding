import { test, expect } from "@playwright/test";

test("service explorer supports keyboard tabs and keeps every service available without JavaScript", async ({ page, browser }) => {
  await page.goto("/");
  const explorer = page.locator("[data-service-explorer]");
  const tablist = explorer.getByRole("tablist", { name: "Explore our services" });
  const tabs = tablist.getByRole("tab");
  const panels = explorer.locator("[data-service-panel]");
  await expect(tablist).toHaveAttribute("aria-orientation", "vertical");
  await expect(tabs).toHaveCount(4);
  await expect(panels).toHaveCount(4);
  await expect(tabs.first()).toHaveAttribute("data-service-tab", "mine-monitoring");

  const expectActiveTab = async index => {
    const selected = tabs.nth(index);
    await expect(selected).toHaveAttribute("aria-selected", "true");
    await expect(selected).toHaveAttribute("tabindex", "0");
    await expect(tablist.locator('[aria-selected="true"]')).toHaveCount(1);
    await expect(tablist.locator('[tabindex="0"]')).toHaveCount(1);
    await expect(explorer.locator("[data-service-panel]:visible")).toHaveCount(1);
    const panelId = await selected.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    const panel = explorer.locator(`[id="${panelId}"]`);
    await expect(panel).toHaveAttribute("role", "tabpanel");
    await expect(panel).toHaveAttribute("aria-labelledby", await selected.getAttribute("id"));
    await expect(panel).toBeVisible();
    const slug = await selected.getAttribute("data-service-tab");
    await expect(panel.locator(`a[href="/contact/?service=${slug}"]`)).toHaveCount(1);
  };

  await expectActiveTab(0);
  await tabs.first().focus();
  for (const [key, index] of [["ArrowDown", 1], ["End", 3], ["Home", 0], ["ArrowUp", 3]]) {
    await page.keyboard.press(key);
    await expect(tabs.nth(index)).toBeFocused();
    await expectActiveTab(index);
  }

  const context = await browser.newContext({ javaScriptEnabled: false });
  const noScriptPage = await context.newPage();
  try {
    await noScriptPage.goto(new URL("/", page.url()).href);
    const staticExplorer = noScriptPage.locator("[data-service-explorer]");
    await expect(staticExplorer.locator('[role="tablist"]')).toBeHidden();
    await expect(staticExplorer.locator("[data-service-panel]:visible")).toHaveCount(4);
    await expect(staticExplorer.locator('[data-service-panel] a[href^="/contact/?service="]:visible')).toHaveCount(4);
  } finally {
    await context.close();
  }
});

test("enquiry preparation updates required-field progress, service guidance and its live preview", async ({ page }) => {
  await page.goto("/contact/?service=geotechnical");
  const form = page.locator("#enquiry-form");
  const progress = page.locator("#brief-progress");
  const progressText = page.locator("[data-brief-progress-text]");
  const service = form.locator('[name="service"]');
  const guidance = page.locator("[data-service-guidance]");
  await expect(form.locator("[data-enquiry-tools]")).toBeVisible();
  await expect(service).toHaveValue("geotechnical");
  await expect(progress).toHaveAttribute("max", "4");
  await expect(progress).toHaveJSProperty("value", 1);
  await expect(progressText).toHaveText("1 of 4 required fields complete");
  await expect(guidance).not.toHaveText("");
  const initialGuidance = await guidance.textContent();

  await form.locator('[name="name"]').fill("Project Contact");
  await form.locator('[name="company"]').fill("Example Company");
  await form.locator('[name="email"]').fill("invalid-email");
  await expect(progress).toHaveJSProperty("value", 2);
  await form.locator('[name="email"]').fill("contact@example.com");
  await form.locator('[name="details"]').fill("Please discuss monitoring scope & timing.");
  await form.locator('[name="location"]').fill("Zambia");
  await expect(progress).toHaveJSProperty("value", 4);
  await expect(progressText).toHaveText("4 of 4 required fields complete");
  await service.selectOption("mining");
  await expect(guidance).not.toHaveText(initialGuidance);

  await form.locator(".brief-preview summary").click();
  const preview = form.getByLabel("Enquiry preview", { exact: true });
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute("readonly", "");
  const previewText = await preview.inputValue();
  for (const value of ["Project Contact", "Example Company", "contact@example.com", "Please discuss monitoring scope & timing.", "Zambia"]) {
    expect(previewText).toContain(value);
  }
  expect(previewText).toContain(await service.locator("option:checked").textContent());
  await form.locator('[name="details"]').fill("");
  await expect(progressText).toHaveText("3 of 4 required fields complete");
  await expect(preview).not.toHaveValue(/Please discuss monitoring scope/);
  await expect(page).toHaveURL(/\/contact\/\?service=geotechnical$/);
});

test("copy enquiry validates required fields and reports clipboard failure accurately", async ({ page }) => {
  await page.addInitScript(() => {
    window.enquiryCopyAttempts = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async text => {
          window.enquiryCopyAttempts.push(text);
          throw new DOMException("Clipboard permission denied", "NotAllowedError");
        },
      },
    });
  });
  await page.goto("/contact/");
  const form = page.locator("#enquiry-form");
  const copy = form.getByRole("button", { name: "Copy enquiry", exact: true });
  const name = form.locator('[name="name"]');
  await copy.click();
  await expect(name).toBeFocused();
  expect(await page.evaluate(() => window.enquiryCopyAttempts)).toEqual([]);

  await name.fill("Project Contact");
  await form.locator('[name="email"]').fill("contact@example.com");
  await form.locator('[name="service"]').selectOption("mine-monitoring");
  await form.locator('[name="details"]').fill("Discuss a site monitoring brief.");
  await copy.click();
  const status = form.locator("[data-copy-status]");
  await expect(status).toHaveAttribute("role", "status");
  await expect(status).toHaveText("Copy was unavailable. Select the preview text and copy it manually.");
  await expect(status).not.toContainText(/copied/i);
  expect(await page.evaluate(() => window.enquiryCopyAttempts)).toEqual([await form.locator("[data-enquiry-preview]").inputValue()]);
  await expect(page).toHaveURL(/\/contact\/$/);
});
