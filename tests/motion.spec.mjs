import { test, expect } from "@playwright/test";

const expectActiveSlide = async (rail, index) => {
  const slides = rail.locator("[data-rail-slide]");
  await expect(slides).toHaveCount(4);
  await expect(rail.locator('[data-rail-slide][aria-hidden="true"]')).toHaveCount(3);
  for (let position = 0; position < 4; position++) {
    const slide = slides.nth(position);
    await expect(slide).toHaveAttribute("role", "group");
    await expect(slide).toHaveAttribute("aria-roledescription", "slide");
    await expect(slide).toHaveAttribute("aria-label", `${position + 1} of 4`);
    await expect(slide).toHaveJSProperty("inert", position !== index);
    if (position === index) {
      await expect(slide).not.toHaveAttribute("aria-hidden", "true");
    } else {
      await expect(slide).toHaveAttribute("aria-hidden", "true");
    }
  }
};

// Autoplay intentionally waits while the visitor is using or pointing at the rail.
const leaveRail = async page => {
  await page.evaluate(() => document.activeElement?.blur());
  await page.mouse.move(-10, -10);
};

for (const route of ["/", "/services/"]) {
  test(`${route}: service slideshow supports manual navigation and excludes inactive links from focus`, async ({ page }) => {
    await page.goto(route);
    const rail = page.locator("[data-service-rail]");
    await expect(rail).toHaveAttribute("data-enhanced", /.*/);
    const previous = rail.getByRole("button", { name: "Previous service", exact: true });
    const next = rail.getByRole("button", { name: "Next service", exact: true });
    await rail.scrollIntoViewIfNeeded();
    await expectActiveSlide(rail, 0);

    await next.focus();
    await page.keyboard.press("Enter");
    await expectActiveSlide(rail, 1);
    await expect(next).toBeFocused();
    await expect(rail.getByRole("button", { name: "Play service slideshow", exact: true })).toBeVisible();

    const inactiveLink = rail.locator("[data-rail-slide]").first().locator("a").first();
    await inactiveLink.evaluate(link => link.focus());
    await expect(inactiveLink).not.toBeFocused();
    await expect(next).toBeFocused();
    const activeLink = rail.locator("[data-rail-slide]").nth(1).locator("a").first();
    await activeLink.focus();
    await expect(activeLink).toBeFocused();

    await previous.click();
    await expectActiveSlide(rail, 0);
    await previous.click();
    await expectActiveSlide(rail, 3);
    await next.click();
    await expectActiveSlide(rail, 0);
  });
}

test("service slideshow can pause automatic advancement and resume deliberately", async ({ page }) => {
  await page.clock.install();
  await page.goto("/services/");
  const rail = page.locator("[data-service-rail]");
  await rail.scrollIntoViewIfNeeded();
  await expect(rail).toBeInViewport({ ratio: 0.15 });
  await leaveRail(page);
  await expectActiveSlide(rail, 0);
  await page.clock.runFor(4700);
  await expectActiveSlide(rail, 1);

  await rail.getByRole("button", { name: "Pause service slideshow", exact: true }).click();
  await leaveRail(page);
  await page.clock.runFor(14000);
  await expectActiveSlide(rail, 1);
  await rail.getByRole("button", { name: "Play service slideshow", exact: true }).click();
  await leaveRail(page);
  await page.clock.runFor(4700);
  await expectActiveSlide(rail, 2);
});

test("focusing slideshow controls keeps autoplay paused after keyboard focus leaves", async ({ page }) => {
  await page.clock.install();
  await page.goto("/services/");
  const rail = page.locator("[data-service-rail]");
  await rail.scrollIntoViewIfNeeded();
  await expectActiveSlide(rail, 0);
  const next = rail.getByRole("button", { name: "Next service", exact: true });
  await next.focus();
  await expect(next).toBeFocused();
  await expect(rail.getByRole("button", { name: "Play service slideshow", exact: true })).toBeVisible();

  await leaveRail(page);
  await page.clock.runFor(14000);
  await expectActiveSlide(rail, 0);
  await expect(rail.getByRole("button", { name: "Play service slideshow", exact: true })).toBeVisible();
});

test("reduced motion keeps the slideshow stationary while manual navigation remains available", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  const rail = page.locator("[data-service-rail]");
  await rail.scrollIntoViewIfNeeded();
  await leaveRail(page);
  await expect(rail.locator("[data-rail-toggle]")).toBeHidden();
  await expectActiveSlide(rail, 0);
  await page.clock.runFor(14000);
  await expectActiveSlide(rail, 0);

  await rail.getByRole("button", { name: "Next service", exact: true }).click();
  await expectActiveSlide(rail, 1);
  await page.clock.runFor(100);
  const duration = await rail.locator("[data-rail-track]").evaluate(track => getComputedStyle(track).transitionDuration);
  expect(parseFloat(duration)).toBeLessThan(0.001);
  expect(await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === "running").length)).toBe(0);
  await leaveRail(page);
  await page.clock.runFor(14000);
  await expectActiveSlide(rail, 1);
});

test("without JavaScript every slideshow service and its links remain available", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
  const page = await context.newPage();
  try {
    for (const route of ["/", "/services/"]) {
      await page.goto(new URL(route, baseURL).href);
      const rail = page.locator("[data-service-rail]");
      await expect(rail.locator("[data-rail-controls]")).toBeHidden();
      await expect(rail.locator("[data-rail-slide]:visible")).toHaveCount(4);
      for (const slide of await rail.locator("[data-rail-slide]").all()) {
        await expect(slide).not.toHaveAttribute("aria-hidden", "true");
        await expect(slide).toHaveJSProperty("inert", false);
        await expect(slide.locator("a").first()).toBeVisible();
      }
    }
  } finally {
    await context.close();
  }
});
