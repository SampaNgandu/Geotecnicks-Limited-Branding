# Geotecnicks Limited website

A dependency-light static website for Geotecnicks Limited. A small Node.js build script turns centralized content and shared components into the six public routes in `dist/`; the generated site has no runtime framework or third-party dependencies.

## Local preview

Use Node.js 22 or newer.

```bash
npm run build
npm run preview
```

Then open <http://127.0.0.1:8788>. The preview server binds only to this computer and confines requests to `dist/`, including symbolic-link targets. Content editors can update services and projects in `src/data/` without changing layouts.

## Checks

```bash
npm test
```

This rebuilds the site, checks route markup, navigation, metadata and contact fields, and runs regression tests for preview path traversal and enquiry-email generation.

For rendered layout, keyboard behavior, no-JavaScript fallback and automated accessibility checks:

```bash
npm ci
npx playwright install chromium
npm run test:browser
```

GitHub Actions runs both suites on pull requests. The browser suite uses axe on all six routes at 320px and 1280px, checks horizontal overflow, and exercises keyboard navigation and reduced motion. Automated checks supplement a manual screen-reader review; they do not certify accessibility compliance. To use an installed Edge browser, set `PLAYWRIGHT_CHANNEL=msedge` in your shell.

## Cloudflare Pages

Create a Pages project from this repository using:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |
| Node version | 22 or newer |

For local preview, no environment variables are required. Set `SITE_URL` to the approved production origin (for example, `https://example.com`) in Cloudflare Pages environment settings before publishing. The build rejects paths, credentials, queries and fragments in this setting and omits canonical URLs when it is unset. Do not deploy before completing `PUBLICATION-CHECKLIST.md`.

The contact form opens a pre-addressed email in the visitor's email application; it never claims submission. Replace this fallback only after an approved form endpoint and delivery destination are configured.

When JavaScript is unavailable, the primary navigation remains visible and direct contact links replace the form. The form is enabled only once its submit handler is installed, preventing the browser from putting enquiry details in a GET request to the website.
