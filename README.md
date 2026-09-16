# Geotecnicks Limited website

A dependency-light static website for Geotecnicks Limited. A small Node.js build script turns centralized content and shared components into the six public routes in `dist/`; the generated site has no runtime framework or third-party dependencies.

## Local preview

Node.js 18 or newer is recommended.

```bash
npm run build
npm run preview
```

Then open <http://localhost:8788>. Content editors can update services and projects in `src/data/` without changing layouts.

## Checks

```bash
npm test
```

This rebuilds the site and inspects all routes, shared navigation, headings, metadata, form fields, image alternatives, and contact links.

## Cloudflare Pages

Create a Pages project from this repository using:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |
| Node version | 18 or newer |

No environment variables are required. Set the production domain with `SITE_URL=https://example.com npm run build` so canonical and social metadata use the final host. The build intentionally omits canonical URLs until that domain is known. Do not deploy before completing `PUBLICATION-CHECKLIST.md`.

The contact form opens a pre-addressed email in the visitor's email application; it never claims submission. Replace this fallback only after an approved form endpoint and delivery destination are configured.
