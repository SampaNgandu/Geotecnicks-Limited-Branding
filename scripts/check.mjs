import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
execFileSync(process.execPath,[fileURLToPath(new URL("build.mjs",import.meta.url))],{stdio:"inherit"});
const routes=["","about/","services/","projects/","expertise/","contact/"];
const failures=[];
for(const route of routes){const name=`/${route}`;const html=await readFile(new URL(`../dist/${route}index.html`,import.meta.url),"utf8");const count=(re)=>(html.match(re)||[]).length;
  if(count(/<h1/g)!==1) failures.push(`${name}: expected one h1`);
  for(const token of ['<main id="main"','<nav id="site-nav"','class="skip"','<meta name="description"','property="og:title"','name="twitter:card"']) if(!html.includes(token)) failures.push(`${name}: missing ${token}`);
  if(!/<footer(?:\s|>)/.test(html)) failures.push(`${name}: missing footer`);
  if(!/<img\b(?=[^>]*\bsrc="\/assets\/logo\.jpg")(?=[^>]*\balt="Geotecnicks Limited")[^>]*>/.test(html)) failures.push(`${name}: missing supplied company logo and accessible name`);
  if(/\b(?:construction|environmental)\b/i.test(html)) failures.push(`${name}: excluded service area remains in public content`);
  for(const [href,label] of [["/","Home"],["/about/","About Us"],["/services/","Services"],["/projects/","Project Experience"],["/expertise/","Our Expertise"],["/contact/","Contact"]]) if(!html.includes(`href="${href}"`)||!html.includes(label)) failures.push(`${name}: missing navigation ${label}`);
}
const all=await Promise.all(routes.map(r=>readFile(new URL(`../dist/${r}index.html`,import.meta.url),"utf8"))).then(xs=>xs.join("\n"));
for(const href of ["mailto:geotecnicks.limited@gmail.com","tel:+260964370473","https://wa.me/260964370473"]) if(!all.includes(href)) failures.push(`missing contact link ${href}`);
const contact=await readFile(new URL("../dist/contact/index.html",import.meta.url),"utf8");
for(const field of ["name","company","email","telephone","service","location","details"]) if(!contact.includes(`name="${field}"`)) failures.push(`contact: missing ${field} field`);
const css=await readFile(new URL("../dist/assets/site.css",import.meta.url),"utf8"); const js=await readFile(new URL("../dist/assets/site.js",import.meta.url),"utf8");
for(const token of [":focus-visible","prefers-reduced-motion"]) if(!css.includes(token)) failures.push(`CSS missing ${token}`);
if(!/@media[^{}]*\(\s*max-width\s*:\s*\d+(?:\.\d+)?(?:px|rem|em)\s*\)/.test(css)) failures.push("CSS missing a responsive breakpoint");
for(const token of ['aria-expanded','event.key === "Escape"']) if(!js.includes(token)) failures.push(`mobile navigation missing ${token}`);
try { if(!(await readFile(new URL("../dist/assets/logo.jpg",import.meta.url))).length) failures.push("Supplied company logo is empty"); }
catch { failures.push("Supplied company logo was not included in the build"); }
if(failures.length){console.error(failures.join("\n"));process.exit(1)} console.log("Static inspection passed for 6 routes, navigation, metadata, headings, contact fields/links, focus, responsive and reduced-motion rules.");

// Verify production metadata independently of the caller's environment.
const buildPath = fileURLToPath(new URL("build.mjs", import.meta.url));
try {
  execFileSync(process.execPath, [buildPath], { env: { ...process.env, SITE_URL: "https://www.example.com/" }, stdio: "inherit" });
  for (const route of routes) {
    const html = await readFile(new URL(`../dist/${route}index.html`, import.meta.url), "utf8");
    if (!html.includes(`<link rel="canonical" href="https://www.example.com/${route}">`)) throw new Error(`Missing canonical for /${route}`);
  }
  let rejected = false;
  try {
    execFileSync(process.execPath, [buildPath], { env: { ...process.env, SITE_URL: "https://www.example.com/unexpected-path" }, stdio: "ignore" });
  } catch (error) { if (error.status !== 1) throw error; rejected = true; }
  if (!rejected) throw new Error("Invalid SITE_URL was accepted");
} finally {
  execFileSync(process.execPath, [buildPath], { stdio: "inherit" });
}
console.log("Canonical metadata and SITE_URL validation passed.");
