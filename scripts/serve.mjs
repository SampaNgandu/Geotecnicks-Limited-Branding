import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
const root = new URL("../dist/", import.meta.url).pathname;
const types = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml"};
createServer(async (req,res) => { try { let path=decodeURIComponent(req.url.split("?")[0]); let file=join(root,path); if ((await stat(file)).isDirectory()) file=join(file,"index.html"); res.writeHead(200,{"content-type":types[extname(file)]||"application/octet-stream"}); res.end(await readFile(file)); } catch { res.writeHead(404); res.end("Not found"); } }).listen(8788,()=>console.log("Preview: http://localhost:8788"));
