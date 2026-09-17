# Geotecnicks Limited website

A dependency-light static website for Geotecnicks Limited. A small Node.js build script turns centralized content and shared components into the six public routes in `dist/`; the generated site has no runtime framework or third-party dependencies.

## Brand and content

The site uses the supplied Geotecnicks logo and its orange, green and black palette. The public offering covers mine monitoring/mapping/photogrammetry, geotechnical services, mining services and general supply. Construction and environmental consultancy are excluded from the public copy, project selection, service options and search.

The layout takes inspiration from the project-led presentation and service discovery on Arup's website, while using original Geotecnicks layouts, copy and assets. Features include local page/service search, a keyboard-accessible service explorer, project search/category filters/date or name sorting, native expandable service details, and service enquiry links that preselect the relevant option. The enquiry builder shows valid required-field progress, a live email preview and a copy option with a manual fallback. Enhanced controls appear only when their JavaScript behavior is available; all service and project content remains readable without JavaScript.

`src/assets/logo.jpg` is the user-supplied logo, copied without alteration. `src/assets/mining-landscape.jpg` is an AI-generated illustrative landscape; it does not depict a named company assignment. Project cards use decorative graphics rather than attributed project photographs.

Motion takes inspiration from the sliding service strip and scroll entrances on [Stormwater Services Australia](https://stormwaterservices.au/our-services/). The original Geotecnicks service showcase includes previous/next and pause/play controls. It pauses while hovered, off screen or in a background tab. Keyboard focus and manual navigation stop automatic playback until it is explicitly resumed. Manual slide changes announce the selected service. Reduced-motion preferences disable automatic playback and decorative movement; all services remain visible when JavaScript is unavailable. Scroll entrances use short, one-time transforms without hiding text, and the hero image settles after a single gentle zoom.

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

This rebuilds the site, validates the content schema, checks route markup, navigation, metadata and contact fields, and runs regression tests for preview path traversal and enquiry-email generation.

For rendered layout, keyboard behavior, no-JavaScript fallback and automated accessibility checks:

```bash
npm ci
npx playwright install chromium
npm run test:browser
```

GitHub Actions runs both suites on pull requests. The browser suite uses axe on all six routes at 320px and 1280px, checks horizontal overflow, and exercises keyboard navigation and reduced motion. Automated checks supplement a manual screen-reader review; they do not certify accessibility compliance. To use an installed Edge browser, set `PLAYWRIGHT_CHANNEL=msedge` in your shell.

## Content studio

Open `/admin/` to preview and manage services, project experience and expertise. The editor initially displays a read-only copy of the content included in the build. The source of truth is `src/data/services.json`, `projects.json` and `expertise.json`; changes are validated during the build and before saving in the editor.

To edit, connect in the admin page with a GitHub fine-grained personal access token scoped only to this repository, with **Contents: read and write** permission and a short expiry. The GitHub account must already have write access; organization rules and branch protection still apply. Follow the [official token guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens). Enter the token only in the admin page, never in source code or a chat message.

The token stays in page memory, is sent only to GitHub's API, and is cleared on disconnect or when leaving the page. It is not stored in cookies, local storage or session storage. The admin page uses a restrictive content security policy and no third-party scripts. Serve production over HTTPS.

Saving commits all three content files atomically to the configured branch, preserving the other repository files. The editor checks for concurrent changes and never force-pushes. If another update lands, copy any unsaved text you need and reload the latest content. Reloading or disconnecting asks before discarding edits.

The default destination is `SampaNgandu/Geotecnicks-Limited-Branding`, branch `codex/create-static-website-for-geotecnicks-limited`. Set `CONTENT_BRANCH` at build time if a different existing branch should receive edits after the website is released. The generated `/admin/config.json` contains only the repository and branch, never a credential.

A successful save creates a GitHub commit; it does not merge the pull request, rebuild this local preview or publish the website. A connected hosting build must rebuild the selected branch for saved content to appear publicly. Admin browser tests mock GitHub responses to exercise authentication failures, edits, atomic saves and conflicting updates without changing a real repository.

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
