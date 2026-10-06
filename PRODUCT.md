# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Frontend and backend developers, weighted equally (confirmed 2026-10-03). They have an OpenAPI 3 or Swagger 2 source (a raw JSON/YAML URL, a hosted Swagger UI page, or a file) and want to understand, exercise, and judge that API from one browser tab, with no install and no account.

- Frontend devs: need typed clients, realistic payloads, and a way to hit staging/local APIs without CORS fights; feed exact contracts to AI coding assistants.
- Backend / API owners: need a quality score, design-rule violations, contract drift checks, and generated test matrices.

## Product Purpose

APIForge turns a spec URL into a live workspace: browse and filter operations, run requests (browser, proxy, or auto fallback), validate responses against the schema, score API design 0–100 across seven pillars with an auto-fix preview, and generate TypeScript types, IDE prompts, payloads, and test suites with AI. Success: a developer goes from pasted URL to a validated request or exported tests in minutes.

## Positioning

One free browser tab that does what usually takes Swagger UI + Postman + a linter + a type generator: parse, run, score, fix-preview, and generate, all scoped to the endpoint in front of you. Deterministic scoring (not AI opinion) backs the quality number.

## Operating Context

- Entry: landing page URL field or sample specs (Swagger Petstore, Fake REST API).
- Workspace: sidebar of collections/endpoints, endpoint panel with Run API / TypeScript / AI Prompt tabs, parameters + AI payload rail, quality score modal, floating AI assistant, status footer.
- Roast My API: shareable, witty review of a spec (score, verdict, offences, badge, meme clip). The one loud, viral surface: same system, pushed further with coral Roast Heat, big display type, and a screenshot-ready result card (user decision, 2026-10-06; supersedes the 2026-10-04 'copy only' decision).
- Content: guides, glossary, comparisons, examples, checklists, reference — SEO/AEO-driven reading surfaces.
- Exports: cURL, JS fetch, JSON, Postman collection.

## Capabilities and Constraints

- Next.js 14 App Router, React 18, Zustand, CSS Modules with tokens in `src/styles/variables.css`; copy in `src/locales/en.json`.
- AI via Groq (llama 3.x). Proxy has SSRF protection; localhost/private networks optionally allowed.
- No accounts, no pricing, no team features yet (roadmap only: mock server, Postman sync, diff analyzer, CLI, OAuth flows, team workspaces). Never present roadmap items as shipped.

## Brand Commitments

- Name: APIForge.
- Visual direction (user decision, 2026-10-06; supersedes 2026-10-03): restore the original "Kinetic Terminal" APIForge identity (dark-first tonal surfaces, lavender-to-violet gradient CTA, gradient wordmark, Plus Jakarta Sans + JetBrains Mono uppercase labels, tight radii, engineering grid, coral Roast link) and keep the usability gains of the clean-SaaS pass. Must not read as a generic AI SaaS / Linear / Vercel / Stripe clone.
- Dark theme is the default; light is first-class, not an inversion. Screenshots ship in both themes.
- Logo: the original traced mark (violet gradient rounded triangle with head and braces knocked out), `src/app/icon.svg` / `public/images/logo-mark.svg`.
- Free and open-source (MIT); support via an in-app Support modal.

## Evidence on Hand

- No product screenshots on the landing page (removed 2026-10-07 at the user's request); the hero is text plus the paste field.
- Author: Rishab Bhatt (`public/images/RishabPFP.png`), GitHub/LinkedIn/X links in the footer.
- No testimonials, user counts, customer logos, benchmarks, or uptime figures exist. Do not invent them.

## Product Principles

1. Paste a URL, get value: the first action is always the spec URL field.
2. Show the real tool, not claims about it.
3. Deterministic before generative: scores and validations are rule-based; AI assists.
4. Dense but calm in the workspace; it is a work tool used for long sessions.
5. Honest scope: free, no sign-up, roadmap labeled as roadmap.
