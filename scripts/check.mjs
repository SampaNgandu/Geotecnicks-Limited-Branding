import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
execFileSync(process.execPath,[new URL("build.mjs",import.meta.url).pathname],{stdio:"inherit"});
const routes=["","about/","services/","projects/","expertise/","contact/"];
const failures=[];
for(const route of routes){const name=`/${route}`;const html=await readFile(new URL(`../dist/${route}index.html`,import.meta.url),"utf8");const count=(re)=>(html.match(re)||[]).length;
  if(count(/<h1/g)!==1) failures.push(`${name}: expected one h1`);
  for(const token of ['<main id="main">','<nav id="site-nav"','<footer>','class="skip"','<meta name="description"','property="og:title"','name="twitter:card"']) if(!html.includes(token)) failures.push(`${name}: missing ${token}`);
  for(const [href,label] of [["/","Home"],["/about/","About Us"],["/services/","Services"],["/projects/","Project Experience"],["/expertise/","Our Expertise"],["/contact/","Contact"]]) if(!html.includes(`href="${href}"`)||!html.includes(label)) failures.push(`${name}: missing navigation ${label}`);
}
const all=await Promise.all(routes.map(r=>readFile(new URL(`../dist/${r}index.html`,import.meta.url),"utf8"))).then(xs=>xs.join("\n"));
for(const href of ["mailto:geotecnicks.limited@gmail.com","tel:+260964370473","https://wa.me/260964370473"]) if(!all.includes(href)) failures.push(`missing contact link ${href}`);
const contact=await readFile(new URL("../dist/contact/index.html",import.meta.url),"utf8");
for(const field of ["name","company","email","telephone","service","location","details"]) if(!contact.includes(`name="${field}"`)) failures.push(`contact: missing ${field} field`);
const css=await readFile(new URL("../dist/assets/site.css",import.meta.url),"utf8"); const js=await readFile(new URL("../dist/assets/site.js",import.meta.url),"utf8");
for(const token of [":focus-visible","prefers-reduced-motion","@media(max-width:800px)"]) if(!css.includes(token)) failures.push(`CSS missing ${token}`);
for(const token of ['aria-expanded','event.key === "Escape"']) if(!js.includes(token)) failures.push(`mobile navigation missing ${token}`);
if(failures.length){console.error(failures.join("\n"));process.exit(1)} console.log("Static inspection passed for 6 routes, navigation, metadata, headings, contact fields/links, focus, responsive and reduced-motion rules.");
