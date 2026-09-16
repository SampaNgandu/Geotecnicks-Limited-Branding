import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { text as readStream } from "node:stream/consumers";

const repository = "SampaNgandu/Geotecnicks-Limited-Branding";
const branch = "codex/create-static-website-for-geotecnicks-limited";
const fakeToken = "github_pat_OBVIOUSLY_FAKE_OFFLINE_TEST_TOKEN";
const head = "a".repeat(40);
const baseTree = "b".repeat(40);
const newTree = "c".repeat(40);
const newHead = "d".repeat(40);
const changedHead = "e".repeat(40);
const fixture = {};
for (const name of ["services", "projects", "expertise"]) fixture[name] = JSON.parse(await readFile(new URL(`../src/data/${name}.json`, import.meta.url), "utf8"));

async function githubMock(page, options = {}) {
  const calls = [];
  let reads = 0;
  let blobCount = 0;
  await page.route("https://api.github.com/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(`/repos/${repository}/`, "");
    const method = request.method();
    const body = request.postDataJSON();
    calls.push({ path, method, body, headers: request.headers(), query: url.search });
    const respond = (json, status = 200, headers = {}) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(json), headers });
    if (options.unauthorized) return respond({ message: "Bad credentials" }, 401);
    if (options.rateLimited) return respond({ message: "Limit" }, 403, { "x-ratelimit-remaining": "0" });
    if (path === "") return respond({ permissions: { push: !options.readOnly } });
    if (path.startsWith("git/ref/")) {
      reads++;
      if (options.expiredOnSave && reads > 1) return respond({ message: "Bad credentials" }, 401);
      return respond({ object: { sha: options.conflict && reads > 1 ? changedHead : head } });
    }
    if (path.startsWith("contents/src/data/")) {
      const name = path.split("/").at(-1).replace(".json", "");
      return respond({ type: "file", encoding: "base64", content: Buffer.from(JSON.stringify(fixture[name])).toString("base64") });
    }
    if (method === "GET" && path.startsWith("git/commits/")) return respond({ tree: { sha: baseTree } });
    if (path === "git/blobs") { blobCount++; return respond({ sha: String(blobCount).repeat(40) }, 201); }
    if (path === "git/trees") return respond({ sha: newTree }, 201);
    if (path === "git/commits") return respond({ sha: newHead }, 201);
    if (method === "PATCH" && path.startsWith("git/refs/")) return options.refConflict ? respond({ message: "Not fast forward" }, 422) : respond({ object: { sha: newHead } });
    return respond({ message: "Unexpected mock route" }, 500);
  });
  return calls;
}

async function connect(page) {
  await page.goto("/admin/");
  await page.getByLabel("GitHub fine-grained access token").fill(fakeToken);
  await page.getByRole("button", { name: "Connect to edit" }).click();
  await expect(page.locator("#connection-badge")).toHaveText("Connected to GitHub");
  await expect(page.getByLabel("Service 1 title", { exact: true })).toBeEnabled();
}

for (const width of [320, 1280]) {
  test(`admin read-only preview is accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/");
    await expect(page.getByLabel("Service 1 title", { exact: true })).toHaveValue(fixture.services[0].title);
    await expect(page.getByLabel("Service 1 title", { exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Save all changes" })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  });
}

test("admin rejects invalid GitHub tokens without enabling editing", async ({ page }) => {
  await githubMock(page, { unauthorized: true });
  await page.goto("/admin/");
  await page.getByLabel("GitHub fine-grained access token").fill(fakeToken);
  await page.getByRole("button", { name: "Connect to edit" }).click();
  await expect(page.locator("#status")).toContainText("GitHub rejected that token");
  await expect(page.getByLabel("GitHub fine-grained access token")).toHaveValue("");
  await expect(page.getByLabel("Service 1 title", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save all changes" })).toBeDisabled();
});

test("admin limits repository access and explains GitHub rate limits", async ({ page }) => {
  await githubMock(page, { rateLimited: true });
  await page.goto("/admin/");
  await page.getByLabel("GitHub fine-grained access token").fill(fakeToken);
  await page.getByRole("button", { name: "Connect to edit" }).click();
  await expect(page.locator("#status")).toContainText("request limit");
  await expect(page.getByRole("button", { name: "Save all changes" })).toBeDisabled();
});

test("admin refuses an account without repository write access", async ({ page }) => {
  const calls = await githubMock(page, { readOnly: true });
  await page.goto("/admin/");
  await page.getByLabel("GitHub fine-grained access token").fill(fakeToken);
  await page.getByRole("button", { name: "Connect to edit" }).click();
  await expect(page.locator("#status")).toContainText("does not have write access");
  await expect(page.getByLabel("Service 1 title", { exact: true })).toBeDisabled();
  expect(calls).toHaveLength(1);
});

test("admin supports adding and removing entries with clear field labels", async ({ page }) => {
  await githubMock(page);
  await connect(page);
  const index = fixture.services.length + 1;
  await page.getByRole("button", { name: "+ Add a service", exact: true }).click();
  await expect(page.getByLabel(`Service ${index} title`, { exact: true })).toBeFocused();
  await page.getByLabel(`Service ${index} title`, { exact: true }).fill("Core analysis");
  await page.getByLabel(`Service ${index} page anchor`, { exact: true }).fill("core-analysis");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: `Remove service ${index}`, exact: true }).click();
  await expect(page.getByLabel(`Service ${index} title`, { exact: true })).toHaveCount(0);
  await expect(page.locator("#change-indicator")).toHaveText("Up to date");
  await page.locator('[data-section="projects"]').click();
  const projectIndex = fixture.projects.length + 1;
  await page.getByRole("button", { name: "+ Add a project", exact: true }).click();
  await page.getByLabel(`Project ${projectIndex} title`, { exact: true }).fill("New mine assessment");
  await page.getByLabel(`Project ${projectIndex} year`, { exact: true }).fill("2026");
  await page.getByLabel(`Project ${projectIndex} category`, { exact: true }).selectOption("Geotechnical");
  await page.getByLabel(`Project ${projectIndex} scope`, { exact: true }).fill("Ground assessment.");
  await page.getByLabel(`Project ${projectIndex} delivery credit`, { exact: true }).fill("Delivered by Geotecnicks Limited.");
  await page.getByRole("button", { name: "Save all changes" }).click();
  await expect(page.locator("#status")).toContainText("Saved all content to GitHub");
});

test("admin edits all content sections and saves one atomic non-forced commit", async ({ page }) => {
  const calls = await githubMock(page);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await connect(page);
  await page.getByLabel("Service 1 title", { exact: true }).fill("Mine monitoring and mapping");
  await page.locator('[data-section="projects"]').click();
  await page.getByLabel("Project 1 scope", { exact: true }).fill("Updated geological field observations.");
  await page.locator('[data-section="expertise"]').click();
  await page.getByLabel("Expertise areas", { exact: true }).fill(`${fixture.expertise.join("\n")}\nCore logging`);
  await page.getByRole("button", { name: "Save all changes" }).click();
  await expect(page.locator("#status")).toContainText("Saved all content to GitHub");
  await expect(page.locator("#status")).toContainText("does not merge");
  await expect(page.getByRole("button", { name: "Save all changes" })).toBeDisabled();
  const blobs = calls.filter(call => call.path === "git/blobs");
  expect(blobs).toHaveLength(3);
  expect(JSON.parse(blobs[0].body.content)[0].title).toBe("Mine monitoring and mapping");
  expect(JSON.parse(blobs[1].body.content)[0].scope).toBe("Updated geological field observations.");
  expect(JSON.parse(blobs[2].body.content).at(-1)).toBe("Core logging");
  const tree = calls.find(call => call.path === "git/trees");
  expect(tree.body.base_tree).toBe(baseTree);
  expect(tree.body.tree.map(entry => entry.path)).toEqual(["src/data/services.json", "src/data/projects.json", "src/data/expertise.json"]);
  const commit = calls.find(call => call.method === "POST" && call.path === "git/commits");
  expect(commit.body).toEqual({ message: "Update website content from admin", tree: newTree, parents: [head] });
  const refs = calls.filter(call => call.method === "PATCH");
  expect(refs).toHaveLength(1);
  expect(refs[0].path).toBe(`git/refs/heads/${branch}`);
  expect(refs[0].body).toEqual({ sha: newHead, force: false });
  expect(errors).toEqual([]);
  expect(calls.every(call => call.headers.authorization === `Bearer ${fakeToken}`)).toBe(true);
});

test("admin token never enters persistent storage, URLs or page output and is cleared on disconnect", async ({ page }) => {
  const calls = await githubMock(page);
  await connect(page);
  const state = await page.evaluate(() => ({ local: JSON.stringify(localStorage), session: JSON.stringify(sessionStorage), cookies: document.cookie, html: document.documentElement.outerHTML, url: location.href }));
  for (const value of Object.values(state)) expect(value).not.toContain(fakeToken);
  expect(calls.every(call => !`${call.path}${call.query}${JSON.stringify(call.body)}`.includes(fakeToken))).toBe(true);
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(page.getByLabel("GitHub fine-grained access token")).toHaveValue("");
  await expect(page.getByLabel("Service 1 title", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save all changes" })).toBeDisabled();
});

test("admin prevents overwriting concurrent updates before any write", async ({ page }) => {
  const calls = await githubMock(page, { conflict: true });
  await connect(page);
  await page.getByLabel("Service 1 title", { exact: true }).fill("Updated mine monitoring");
  await page.getByRole("button", { name: "Save all changes" }).click();
  await expect(page.locator("#status")).toContainText("Nothing was overwritten");
  await expect(page.getByRole("button", { name: "Save all changes" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Download unsaved draft" })).toBeEnabled();
  expect(calls.filter(call => call.method !== "GET")).toEqual([]);
});

test("admin preserves and exports an unsaved draft after token expiry, and confirms before replacing it", async ({ page }) => {
  await githubMock(page, { expiredOnSave: true });
  await connect(page);
  await page.getByLabel("Service 1 title", { exact: true }).fill("My unsaved mine monitoring title");
  await page.getByRole("button", { name: "Save all changes" }).click();
  await expect(page.locator("#status")).toContainText("GitHub rejected that token");
  await expect(page.getByLabel("Service 1 title", { exact: true })).toHaveValue("My unsaved mine monitoring title");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download unsaved draft" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("geotecnicks-content-draft.json");
  const saved = await readStream(await download.createReadStream());
  const draft = JSON.parse(saved);
  expect(draft.services[0].title).toBe("My unsaved mine monitoring title");
  expect(draft.projects).toEqual(fixture.projects);
  expect(draft.expertise).toEqual(fixture.expertise);
  expect(saved).not.toContain(fakeToken);
  page.once("dialog", async dialog => { expect(dialog.message()).toContain("discards your unsaved draft"); await dialog.dismiss(); });
  await page.getByLabel("GitHub fine-grained access token").fill(fakeToken);
  await page.getByRole("button", { name: "Connect to edit" }).click();
  await expect(page.getByLabel("Service 1 title", { exact: true })).toHaveValue("My unsaved mine monitoring title");
  await expect(page.locator("#connection-badge")).toHaveText("Preview mode");
});

test("admin handles a branch change during the final update without force", async ({ page }) => {
  const calls = await githubMock(page, { refConflict: true });
  await connect(page);
  await page.getByLabel("Service 1 title", { exact: true }).fill("Updated mine monitoring");
  await page.getByRole("button", { name: "Save all changes" }).click();
  await expect(page.locator("#status")).toContainText("could not safely update");
  await expect(page.getByRole("button", { name: "Save all changes" })).toBeDisabled();
  expect(calls.find(call => call.method === "PATCH").body.force).toBe(false);
});

test("admin validates excluded services across sections before writing", async ({ page }) => {
  const calls = await githubMock(page);
  await connect(page);
  await page.getByLabel("Service 1 title", { exact: true }).fill("Construction consultancy");
  await page.locator('[data-section="expertise"]').click();
  await page.getByRole("button", { name: "Save all changes" }).click();
  await expect(page.locator("#status")).toContainText("excluded from this website");
  expect(calls.filter(call => call.method !== "GET")).toEqual([]);
});

test("admin explains the JavaScript requirement without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:8788/admin/");
  await expect(page.locator("noscript")).toContainText("JavaScript is needed");
  await expect(page.locator("noscript a")).toHaveAttribute("href", `https://github.com/${repository}`);
  await expect(page.locator("#connect-form")).toBeHidden();
  await expect(page.locator("#editor-form")).toBeHidden();
  await context.close();
});

