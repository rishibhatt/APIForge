# ⚡ APIForge

> **The Intelligent API Workspace, Contract Testing Studio & Quality Scoring Engine.**  
> Transform static OpenAPI and Swagger specifications into interactive playgrounds, strongly-typed codebases, AI-generated test matrices, and audited REST architectures.

---

## 🌟 What is APIForge?

**APIForge** is a modern, developer-first API workbench designed to bridge the gap between API specifications and actual application development. Rather than treating OpenAPI/Swagger docs as static reference sheets or wrestling with fragmented tools for testing, mocking, and type generation, APIForge provides a unified, AI-augmented workspace right in your browser.

Point APIForge to any **OpenAPI 3.0** or **Swagger 2.0** URL (including hosted Swagger UI pages, raw JSON/YAML, or local file uploads) to instantly parse, test, audit, generate code, and validate responses against your API contract.

---

## 🚀 Key Features

### 1. 🔍 Instant Multi-Format Spec Ingestion
- **URL & Swagger UI Scraper**: Load specs directly from raw JSON/YAML URLs, live Swagger UI URLs, or local JSON/YAML file uploads.
- **Hierarchical Tag & Collection Explorer**: Group, search, and filter hundreds of endpoints by tags, HTTP methods, and URL patterns.
- **Spec Overview & Metadata**: Inspect server targets, versioning, duplicate route detection, and security schemes in one centralized view.

### 2. 📊 Deterministic API Quality Score & Auto-Fix Engine
- **Standards-Based Auditing**: Rates your API architecture on a 0–100 quality scale based on REST best practices, Microsoft REST API Guidelines, Google API Design Guide, and OpenAPI standards.
- **7-Pillar Breakdown**: In-depth analysis across *Naming Conventions*, *HTTP Semantics*, *Structure*, *Consistency*, *Versioning*, *Status & Error Coverage*, and *Documentation*.
- **Interactive Auto-Fix Preview**: Side-by-side visual diff of original vs. REST-aligned routes with exportable transformations.

### 3. ⚡ Code, Type & Prompt Forge (Groq LLM Powered)
- **TypeScript Generation**: Stream production-ready TypeScript client types, interfaces, request shapes, and response models for any endpoint, collection, or full API.
- **IDE Meta-Prompts**: Generate tailored context prompts for **Cursor**, **Antigravity**, **GitHub Copilot**, or **Claude** to accelerate feature implementation.
- **Natural Language Payload Generator**: Describe the payload you need in plain English (e.g., *"Valid user registration with special characters in name and an expired invite token"*), and get valid JSON conforming to the schema.

### 4. 🧪 Live API Execution Studio & Smart Proxy
- **Triple Execution Modes**:
  - **Auto Mode**: Tries direct browser execution first; automatically falls back to the server gateway if CORS or network policies block the request.
  - **Browser Mode**: Direct client-side fetch for zero-latency same-origin calls.
  - **APIForge Proxy Mode**: Server-side execution gateway bypassing browser CORS restrictions.
- **Localhost & Private Network Support**: Seamlessly test local development backends (`localhost:3000`, `127.0.0.1:8000`, `192.168.x.x`, ngrok tunnels) with built-in SSRF protection guarding sensitive cloud metadata endpoints.
- **Flexible Auth Management**: Global workspace Bearer tokens, per-request Bearer/Basic Auth, and custom Header/Query API Keys.

### 5. 🛡️ Runtime Schema Validation & Contract Drift Detection
- **Schema-vs-Response Verification**: Validates live HTTP responses against OpenAPI `responses` schemas in real time.
- **Issue Diagnostics**: Identifies type mismatches, missing required properties, unlisted status codes, and unexpected payload properties.
- **AI Diagnostics**: Explains contract discrepancies in clear language and suggests actionable fixes.

### 6. 📋 AI Test Suite Matrix & Multi-Format Exporter
- **Automated Scenario Generation**: Generates comprehensive test matrices categorized into **Valid / Happy Path**, **Invalid / Client Error**, and **Edge Case / Boundary** scenarios.
- **Live Test Runner**: Execute test cases directly against your live API and verify expectations against real HTTP status codes.
- **Multi-Format Export**: One-click export of generated tests to **cURL**, **JavaScript Fetch**, **JSON**, and **Postman Collections**.

### 7. 🤖 Context-Aware Workspace AI Assistant
- Embedded floating AI assistant pinned to the active endpoint, schema, and parameters.
- Ask questions, generate integration snippets, troubleshoot error responses, and draft documentation with zero context-switching.

---

## 💡 Problems APIForge Solves

### 🎨 For Frontend Developers

| Challenge | How APIForge Solves It |
| :--- | :--- |
| **Manual TypeScript Typings** | Automatically generates clean, strongly typed TypeScript interfaces directly from OpenAPI component schemas. |
| **CORS Roadblocks During Testing** | Built-in smart fallback proxy allows executing requests against staging or external APIs without requiring local CORS bypasses or browser extensions. |
| **Waiting for Backend Mock Data** | Generates realistic, schema-valid JSON request/response payloads in seconds via natural language prompts. |
| **Feeding Context to AI Coding Assistants** | Generates tailored meta-prompts containing exact endpoint contracts, parameters, and types ready to paste into Cursor or Copilot. |

### ⚙️ For Backend & API Developers

| Challenge | How APIForge Solves It |
| :--- | :--- |
| **Contract Drift & Schema Regressions** | Validates runtime server responses against the published OpenAPI spec, catching missing keys or altered types before deployment. |
| **Inconsistent API Design** | Quality scoring engine identifies non-standard HTTP methods, poor path naming (`camelCase` vs `kebab-case`), missing error responses, and semantic violations. |
| **Time-Consuming Test Case Writing** | Instantly creates full test matrices covering boundary values, authentication failures, and validation errors. |
| **Sharing Specs & Postman Collections** | Exports executable cURL, JavaScript, and Postman collections directly from any parsed OpenAPI source. |

---

## 🏗️ Architecture & Tech Stack

- **Framework**: [Next.js 14 (App Router)](https://nextjs.org/)
- **UI & State**: React 18, [Zustand](https://github.com/pmndrs/zustand)
- **Styling**: Modular Vanilla CSS & Design Tokens (Rich Dark/Light Mode, Glassmorphism, Micro-animations)
- **AI & LLM Engine**: [Vercel AI SDK](https://sdk.vercel.ai/) with [Groq Cloud](https://groq.com/) (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`)
- **Parsers & Validation**: `@apidevtools/swagger-parser`, `js-yaml`
- **Security & Networking**: Multi-tier SSRF guard, IPv4/IPv6 CIDR validation, header sanitization, rate-limiting, and manual redirect validation

---

## 🚦 Getting Started

### Prerequisites
- **Node.js** (v18.18+ or v20+)
- **npm** / **yarn** / **pnpm**
- **Groq API Key** (Free tier available at [console.groq.com](https://console.groq.com))

### 1. Clone & Install

```bash
git clone https://github.com/rishibhatt/APIForge.git
cd APIForge
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Groq API Key for AI features (TypeScript generation, payloads, test cases, chat assistant)
GROQ_API_KEY=your_groq_api_key_here

# Optional: AI model customization (defaults to llama-3.3-70b-versatile)
# GROQ_MODEL=llama-3.3-70b-versatile

# Optional: Security & Proxy configuration
# ALLOW_PRIVATE_NETWORK=true
# ALLOW_LOOPBACK=true
# STRICT_SSRF=false
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗺️ Roadmap & Pending Features

We are actively working on expanding APIForge. Here are the planned capabilities and upcoming milestones:

### 🔄 In Progress / Planned Next
- [ ] **Virtual Mock Server & Dynamic Mocking**:
  - Run dynamic, stateful mock servers generated on-the-fly from OpenAPI schemas without running a live backend.
- [ ] **Bi-Directional Postman & Insomnia Sync**:
  - Full import/export of Postman collections, environments, and variables with bi-directional syncing.
- [ ] **Breaking Change & Version Diff Analyzer**:
  - Upload or compare two versions of a specification (e.g., `v1.0.0` vs `v1.1.0`) and receive a classified breaking change report.
- [ ] **Automated CI/CD Test Runner CLI**:
  - Headless CLI (`apiforge test`) to execute generated contract test matrices inside GitHub Actions, GitLab CI, or Jenkins pipelines.
- [ ] **Multi-Spec Microservices Workspace**:
  - Aggregate and manage multiple microservice specs into a single unified API catalog.
- [ ] **OAuth2 & OpenID Connect Flow Runner**:
  - Integrated OAuth2 authorization code, client credentials, and PKCE authentication flows with automated token refreshes.
- [ ] **Frontier AI Model Support**:
  - Integration options for Claude 3.5 Sonnet, GPT-4o, and DeepSeek R1 for advanced multi-file reasoning over massive enterprise specs.
- [ ] **Real-time Team Workspaces**:
  - Collaborative cloud workspaces with shared collections, saved environments, and history logs.

---

## 🧪 Testing & Quality Assurance

Run the security and validation test suites:

```bash
npx tsx --test src/lib/security/__tests__/security.test.ts
```

Check TypeScript types and linting:

```bash
npx tsc --noEmit
npm run lint
```

---

## 🤝 Contributing

Contributions, feature suggestions, and pull requests are warmly welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**.

---

## ☕ Support the Project

APIForge is free and open-source. You can support continued development and help fund frontier AI model tokens through the built-in **Support** modal in the application or by starring the repository ⭐!
