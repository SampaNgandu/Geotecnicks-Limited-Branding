import { test, expect } from "@playwright/test";

const visibleCards = page => page.locator("[data-project-card]:visible");

test("project search combines words with the selected category and announces results", async ({ page }) => {
  await page.goto("/projects/");
  const search = page.getByLabel("Search project experience", { exact: true });
  await search.fill("  MINE support  ");
  await expect(visibleCards(page)).toHaveCount(2);
  await expect(page.locator("[data-project-count]")).toHaveText("2 projects");
  await page.locator('[data-project-filter="geotechnical"]').click();
  await expect(visibleCards(page)).toHaveCount(0);
  await expect(page.locator("[data-project-empty]")).toBeVisible();
  await page.locator('[data-project-filter="mining"]').click();
  await expect(visibleCards(page)).toHaveCount(2);
  await search.fill("Luanshya");
  await expect(visibleCards(page)).toHaveCount(1);
  await expect(visibleCards(page).getByRole("heading")).toHaveText("Luanshya Copper Mines");
  await expect(page.locator("[data-project-count]")).toHaveText("1 project");
});

test("empty project results can reset every control and restore keyboard focus", async ({ page }) => {
  await page.goto("/projects/");
  const search = page.getByLabel("Search project experience", { exact: true });
  const sort = page.getByLabel("Sort projects", { exact: true });
  await page.locator('[data-project-filter="mining"]').click();
  await sort.selectOption("oldest");
  await search.fill("unknown assignment xyz");
  await expect(visibleCards(page)).toHaveCount(0);
  await expect(page.locator("[data-project-count]")).toHaveText("0 projects");
  const reset = page.locator("[data-project-reset]");
  await reset.focus();
  await page.keyboard.press("Enter");
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("");
  await expect(sort).toHaveValue("newest");
  await expect(page.locator('[data-project-filter="all"]')).toHaveAttribute("aria-pressed", "true");
  await expect(visibleCards(page)).toHaveCount(4);
  await expect(visibleCards(page).first().getByRole("heading")).toHaveText("Kariba Dam rehabilitation");
  await expect(page.locator("[data-project-empty]")).toBeHidden();
});

test("project sorting keeps search and category selections", async ({ page }) => {
  await page.goto("/projects/");
  const headings = () => visibleCards(page).locator("h3");
  const sort = page.getByLabel("Sort projects", { exact: true });
  await sort.selectOption("oldest");
  await expect(headings()).toHaveText(["Kagem Mine", "Luanshya Copper Mines", "ME Long Teng at Kalumbila", "Kariba Dam rehabilitation"]);
  await sort.selectOption("name");
  await expect(headings()).toHaveText(["Kagem Mine", "Kariba Dam rehabilitation", "Luanshya Copper Mines", "ME Long Teng at Kalumbila"]);
  await page.locator('[data-project-filter="mining"]').click();
  const search = page.getByLabel("Search project experience", { exact: true });
  await search.fill("mine");
  await expect(headings()).toHaveText(["Kagem Mine", "Luanshya Copper Mines"]);
  await sort.selectOption("newest");
  await expect(headings()).toHaveText(["Luanshya Copper Mines", "Kagem Mine"]);
  await expect(search).toHaveValue("mine");
  await expect(page.locator('[data-project-filter="mining"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-project-count]")).toHaveText("2 projects");
});
