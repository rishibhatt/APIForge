# Product Marketing Context

**Document version:** v1.0.0
**Last updated:** 2026-10-08

## Product Overview
- **One-liner:** The zero-install, intelligent browser workspace that turns OpenAPI and Swagger specs into interactive playgrounds, TypeScript clients, and audited REST architectures.
- **What it does:** APIForge takes any OpenAPI 3.0 or Swagger 2.0 URL (raw JSON/YAML, hosted Swagger UI, or file) and instantly provides an interactive playground to test requests with CORS-safe proxy fallback, validate responses against schemas in real time, deterministically score API design (0–100 across 7 pillars), and generate TypeScript types, IDE prompts (Cursor/Claude/Copilot), and test suites with AI.
- **Product category:** Developer Tools / API Development & Contract Testing Environment / OpenAPI Studio.
- **Product type:** Web-based developer tool & playground (Next.js 14, client-first, SSRF-protected proxy).
- **Business model:** 100% Free and Open Source (MIT); no signup or credit card required.

## Target Audience
- **Target audience:** Frontend developers, backend engineers, API architects, and full-stack developers.
- **Target company type:** Startups, indie hackers, developer tooling teams, and engineering agencies working with RESTful APIs and OpenAPI contracts.
- **Primary use cases:**
  1. *Frontend dev:* Needing typed TypeScript models, realistic mock payloads, and hitting staging/local APIs without CORS errors or Postman setup.
  2. *Backend dev / API owner:* Auditing contract quality, finding design rule violations, verifying response schemas against contract drift, and generating test cases.
  3. *AI-assisted coders:* Feeding exact OpenAPI endpoint schemas and contracts directly into Cursor, Antigravity, or Claude prompts.
- **Jobs to be done:**
  - "I have an OpenAPI/Swagger URL and I need to test an endpoint right now without downloading Postman or fighting CORS."
  - "I need clean TypeScript interfaces and Zod schemas for my frontend without writing them by hand."
  - "I want to score my API design objectively and catch missing status codes or naming inconsistencies before shipping."
  - "I want a quick, brutal review or badge for my API quality to share with my team or on GitHub ('Roast My API')."

## Problems & Pain Points
- **Postman Bloat:** Heavy desktop client, forced cloud login, paid tier restrictions, slow startup.
- **Swagger UI Limitations:** Read-only feeling, rigid UI, frequent CORS blocking, lack of TypeScript generation, no real-time response schema validation.
- **CORS Roadblocks:** Frontend developers testing third-party or staging APIs get blocked in the browser.
- **Contract Drift:** Backend changes responses but forgets to update docs, breaking frontend production builds silently.
- **Manual Boilerplate:** Hours spent hand-typing TypeScript interfaces and test cases for dozens of endpoints.

## Competitive Landscape
- **Direct alternatives:**
  - *Swagger UI / Swagger Editor:* Standard but clunky, static, easily blocked by CORS, no code generation or scoring.
  - *Postman / Insomnia:* Powerful but heavy, requires installation, aggressive monetization, forced cloud sync.
  - *Hoppscotch:* Lightweight web client, but lacks deep OpenAPI schema validation, quality scoring, and AI prompting.
- **APIForge Differentiators:**
  1. **Zero-install & Instant:** Paste URL -> interactive workspace in 2 seconds.
  2. **Smart Fallback Proxy:** Automatically falls back to SSRF-guarded server proxy if browser CORS fails.
  3. **Deterministic 7-Pillar Scoring:** Rule-based 0–100 quality score (not arbitrary LLM hallucination).
  4. **AI Prompt & Code Forge:** Exports tailored Cursor/Claude prompts, TypeScript types, and test matrices.
  5. **Virality Built-In:** "Roast My API" shareable reports and badges for developer social engagement.

## Brand Voice & Tone
- **Voice:** Direct, technical, developer-native, pragmatic, no corporate buzzwords or AI hype.
- **Aesthetic:** "Kinetic Terminal" — dark-first, clean monospace typography, lavender/violet accents, coral accents for Roast, fast and snappy.

## Goals & Conversion Metrics
- **Primary goal:** High-volume developer adoption, GitHub stars, organic backlinks, and repeat browser bookmark usage.
- **Key conversion action:** Pasting an OpenAPI/Swagger URL and executing a live request or generating TypeScript types.
