# AI Discovery & Generative Engine Optimization (GEO)

This guide documents how APIForge is optimized for discovery, citation, and indexability by AI search systems (e.g. ChatGPT Search, Perplexity, Claude, Bing AI, Google Gemini).

## 1. Machine-Readable Product Definition

APIForge maintains a canonical product definition across the homepage, metadata, `/about` route, and JSON-LD entities:

> "APIForge is an AI-native API quality, testing, and OpenAPI/Swagger analysis workbench. It allows developers to analyze OpenAPI and Swagger specifications, identify API design issues, calculate 0–100 quality scores, execute live CORS-free tests, and auto-repair broken schemas."

## 2. AI Crawler Access

- `robots.ts` explicitly grants crawling access to `OAI-SearchBot`, `ChatGPT-User`, `Googlebot`, and `Bingbot`.
- Critical content exists in server-rendered HTML rather than hidden behind client-side JavaScript tabs or modals.

## 3. Citation-Friendly Content Structure

Articles and glossary entries are formatted for LLM semantic parsing:
- Explicit H1 -> H2 -> H3 heading hierarchy.
- Direct short definitions preceding detailed explanations.
- Factual side-by-side comparison tables.
- Syntactically valid YAML/JSON code snippets.
- Explicit author and date citations.
