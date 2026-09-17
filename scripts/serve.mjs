import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = fileURLToPath(new URL("../dist/", import.meta.url));
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png" };
const inside = (root, file) => {
  const path = relative(root, file);
  return path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
};

export function createPreviewServer(directory = defaultRoot) {
  return createServer(async (req, res) => {
    const reply = (status, message) => {
      res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
      res.end(req.method === "HEAD" ? undefined : message);
    };
    if (!["GET", "HEAD"].includes(req.method)) {
      res.setHeader("Allow", "GET, HEAD");
      return reply(405, "Method not allowed");
    }
    let path;
    try { path = decodeURIComponent((req.url || "/").split("?")[0]); }
    catch { return reply(400, "Invalid path"); }
    // Reject both URL and Windows traversal forms before filesystem access.
    if (!path.startsWith("/") || /[\\\x00-\x1f:]/.test(path) ||
        path.split("/").some(segment => segment === "." || segment === "..")) {
      return reply(403, "Forbidden");
    }
    try {
      const root = await realpath(directory);
      let file = resolve(root, "." + path);
      if (!inside(root, file)) return reply(403, "Forbidden");
      file = await realpath(file);
      if (!inside(root, file)) return reply(403, "Forbidden");
      if ((await stat(file)).isDirectory()) file = await realpath(resolve(file, "index.html"));
      if (!inside(root, file)) return reply(403, "Forbidden");
      const content = await readFile(file);
      res.writeHead(200, {
        "content-type": types[extname(file)] || "application/octet-stream",
        "x-content-type-options": "nosniff",
      });
      res.end(req.method === "HEAD" ? undefined : content);
    } catch { reply(404, "Not found"); }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createPreviewServer().listen(8788, "127.0.0.1", () => console.log("Preview: http://127.0.0.1:8788"));
}
