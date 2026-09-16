import test from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPreviewServer } from "./serve.mjs";

test("preview confines requests to its document root", async t => {
  const directory = await mkdtemp(join(tmpdir(), "geotecnicks-preview-"));
  const root = join(directory, "dist");
  await mkdir(root);
  await writeFile(join(root, "index.html"), "public page");
  await writeFile(join(directory, "secret.txt"), "private contents");
  await mkdir(join(directory, "outside"));
  await writeFile(join(directory, "outside", "index.html"), "private contents");
  await symlink(join(directory, "outside"), join(root, "linked"), process.platform === "win32" ? "junction" : "dir");
  const server = createPreviewServer(root);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  const get = (path, method = "GET") => new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port: server.address().port, path, method }, res => {
      let body = "";
      res.on("data", chunk => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on("error", reject);
    req.end();
  });
  assert.equal((await get("/?preview=1")).body, "public page");
  assert.equal((await get("/", "HEAD")).body, "");
  assert.equal((await get("/", "POST")).status, 405);
  assert.equal((await get("/missing")).status, 404);
  assert.equal((await get("/%ZZ")).status, 400);
  for (const path of ["/../secret.txt", "/%2e%2e/secret.txt", "/%2e%2e%2fsecret.txt", "/..%5csecret.txt", "/C:/secret.txt", "/%00", "/linked/", "/linked/index.html"]) {
    const response = await get(path);
    assert.equal(response.status, 403, path);
    assert.ok(!response.body.includes("private contents"), path);
  }
});
