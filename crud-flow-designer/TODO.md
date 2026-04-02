# CRUD Flow Designer — TODO & Roadmap

> Last updated: April 1, 2026

---

## ✅ DONE

- [x] Visual flow canvas with 9 node types (drag-and-drop)
- [x] Node property editor (click node → edit all fields)
- [x] Execution engine with live node rings (blue/green/red)
- [x] Expandable execution results with request/response viewer
- [x] Variable extraction from responses (JSONPath)
- [x] Assertions: status_code, jsonpath_exists, jsonpath_equals
- [x] Flow validation before run
- [x] Export / Import / Download JSON flows
- [x] Save / Load multiple flows with localStorage + auto-save
- [x] Flow picker dropdown
- [x] Resizable + collapsible side panels
- [x] Keyboard shortcuts (Ctrl+D duplicate, Delete, Escape)
- [x] Tooltips on toolbar (portal-based)
- [x] Clear results clears node rings
- [x] New Flow / Load Demo / editable flow name
- [x] Delete nodes with Backspace/Delete key
- [x] Duplicate nodes (Ctrl+D + button)
- [x] Node data syncs live to canvas (including duplicates)
- [x] Edge deletion — hover edge to see × delete button
- [x] Right-click context menu on nodes (Edit, Duplicate, Disconnect All, Delete)
- [x] Right-click context menu on edges (Delete Connection)
- [x] Connection validation — no self-loops, no duplicate edges, can't connect into Start node
- [x] Arrow markers on edges showing flow direction
- [x] Custom deletable edge type with hover highlight
- [x] Snap-to-grid (15px) for cleaner layouts
- [x] Blue connection line while dragging new connection
- [x] All node types have execution status indicators (executing/success/error)
- [x] ConditionalNode shows ✓ True / ✗ False output labels
- [x] DelayNode shows human-readable time (1s not 1000ms)
- [x] ScriptNode shows first meaningful line + line count
- [x] HttpRequestNode shows header count, param count, body badges
- [x] AssertionNode shows assertion count badge
- [x] Consistent border colors across all nodes (clsx-based)
- [x] Flow continues on error (doesn't stop at first failure)
- [x] Environment Manager (dev/staging/prod variable switching)
- [x] Query Params Editor (key-value with enable/disable toggles)
- [x] Full JSONPath evaluator (array indexing, brackets, nested)
- [x] Pretty Response Viewer (tabbed Body/Headers/Raw, syntax highlighting, copy, size)
- [x] Per-Request Auth Override (inherit/none/bearer/basic/api-key per HTTP node)
- [x] Code Generation (cURL, Python requests, JS fetch from any executed request)
- [x] Request History (auto-logged to localStorage, expandable modal, copy as cURL)
- [x] Cookie / Session Management (auto-capture Set-Cookie, inject into subsequent requests)
- [x] Response Time Assertions (assert < Xms)
- [x] Regex & Contains & Header Assertions (body contains, body regex, header equals)
- [x] Conditional Node Execution (JSONPath condition → branching with operators)
- [x] Loop Node Execution (iterate arrays, _loopItems/_currentItem variables)
- [x] Script Node Execution (user JS with variables/response/setVariable sandbox)
- [x] Variable Auto-Complete (type {{ → dropdown of env vars, extractors, builtins)
- [x] Per-Node Timeout & Retry (configurable per HTTP request node)
- [x] Form-Data & Multipart Body (JSON, form-urlencoded, form-data, raw, none)
- [x] Undo/Redo on Canvas (Ctrl+Z / Ctrl+Shift+Z, max 50 snapshots, toolbar buttons)
- [x] **Node Refinement (API Tester Focus):**
  - [x] **Start Node** — Global headers (JSON), default timeout, default retries, basic auth UI. Card shows header count, timeout, retry badges.
  - [x] **HTTP Request Node** — Description field. Card shows response status code + response time after execution.
  - [x] **Variable Extractor Node** — Source actually honored (body/headers/status), default value fallback, transform (toString/toNumber/toBoolean/trim). Card shows source badge, default value, transform indicators.
  - [x] **Assertion Node** — New types: jsonpath_not_equals, not_contains, header_exists. Per-assertion pass/fail results (not just first failure). Stop on first failure toggle. All assertion results collected and reported.
  - [x] **Delay Node** — Delay types: fixed, random range (min/max), variable-based. Card shows type badge and range display.
  - [x] **Conditional Node** — Condition sources: status_code, JSONPath, variable. New operators: not_contains, exists, not_exists. Card shows source badge, readable condition summary, which branch was taken after execution.
  - [x] **Loop Node** — Data sources: previous response, inline JSON array, variable. Item variable name configurable. Card shows data source badge, item variable, iteration count.
  - [x] **Script Node** — Description field, console.log/warn/error capture, richer sandbox (JSON, Math, Date, btoa, atob, etc.), available API reference in property editor. Card shows log count after execution.
  - [x] **Parallel Node** — Fail-fast toggle. Card shows fail-fast badge. Execution is pass-through (full parallel requires graph walker refactoring).
  - [x] **Execution Engine** — Global headers/timeout/retries from Start node, auto `_lastStatusCode`/`_lastResponseTime` variables, nested variable substitution (`{{item.id}}`)

---

## 🔴 MUST HAVE — Core Gaps (Unusable without these)

- [x] **Environments & Environment Variables** — Switch between dev/staging/prod with scoped variable sets (`{{baseUrl}}`, `{{apiKey}}`). Environment manager modal with CRUD, active environment selector in toolbar, auto-injected into execution engine.
- [x] **Query Params Editor (Key-Value UI)** — Dedicated key-value editor for `?key=value` params with enable/disable toggles per param. Shows badge on node card. Appended to URL during execution.
- [x] **Form-Data & Multipart Body Support** — Body type selector (JSON, x-www-form-urlencoded, multipart/form-data, raw text/XML, none). Key-value form editor with enable/disable toggles. Content-Type auto-set.
- [x] **Cookie / Session Management** — Auto-capture Set-Cookie from responses, store in cookie jar, inject into subsequent requests. Session-based flows work automatically.
- [x] **Pretty Response Viewer** — Tabbed response viewer with JSON syntax highlighting (keys/strings/numbers/booleans colored), Body/Headers/Raw tabs, status badge, response size, copy-to-clipboard button. Request section also tabbed (Body/Headers).
- [ ] **OAuth 2.0 / JWT Auth Flows** — Support authorization_code, client_credentials, PKCE, and auto-refresh token flows. Current `none|bearer|basic|api-key` won't cover most real APIs.
- [x] **Per-Request Auth Override** — Each HTTP request node can override or inherit auth from Start node. Supports inherit/none/bearer/basic/api-key.
- [x] **Request History** — Every HTTP request auto-logged to localStorage (max 200). Modal with expandable entries, copy as cURL, clear all. Accessible from toolbar.
- [ ] **SSL/TLS Certificate Handling** — Option to disable SSL verification or supply custom CA certs. Can't test internal/self-signed APIs without this.
- [ ] **Proxy Configuration** — Configure HTTP/SOCKS proxy per environment. Many corporate users sit behind proxies.

---

## 🟡 SHOULD HAVE — Competitive Features

- [ ] **Pre-Request & Post-Response Scripts** — Run JavaScript before a request (HMAC signatures, timestamps) and after (chain logic). Script node exists but returns `SKIPPED` — needs wiring.
- [ ] **Data-Driven Testing (CSV/JSON Iteration)** — Run an entire flow N times with different data sets loaded from CSV/JSON files.
- [ ] **JSON Schema Validation Assertion** — Validate response shape against a JSON Schema. Type `schema_valid` exists but engine doesn't implement it.
- [x] **Response Time Assertions** — Assert request completes within X ms. Configurable per-assertion in assertion node.
- [x] **Regex & Contains Assertion Types** — Body contains string, body matches regex, header equals value. All wired into execution engine.
- [x] **Full JSONPath / JSONPath-Plus Support** — Supports `$.items[0].id`, array indexing, bracket notation, nested paths. Replaced naive split('.') evaluator.
- [x] **Per-Node Timeout & Retry** — Configurable timeout (ms) and max retries per HTTP request node. Retries on network errors only with delay between attempts.
- [x] **Code Generation (cURL, Python, JS fetch)** — Generate copy-pasteable code snippets from any executed HTTP request. Available in execution results panel.
- [x] **Variable Auto-Complete** — Type `{{` in path, base URL, body, or token fields to see dropdown of available variables from environments, extractors, and builtins.
- [ ] **Network Console / Log Panel** — Raw HTTP traffic view, redirect chains, timing breakdown (DNS, TCP, TLS, TTFB).
- [ ] **Global / Collection-Level Variables** — Distinguish between global, collection-level, and environment variables with clear precedence.
- [x] **Conditional Node Execution** — Evaluates JSONPath condition against previous response with operators (==, !=, >, <, >=, <=, contains). Stores result in _conditionResult variable.
- [x] **Loop Node Execution** — Iterates over arrays from previous responses. Stores items in _loopItems, _loopCount, _currentItem variables for downstream nodes.
- [x] **Script Node Execution** — Runs user-defined JavaScript with access to variables, response, request, and setVariable() function.

---

## 🟢 NICE TO HAVE — Differentiators (Better than Postman)

- [ ] **OpenAPI / Swagger Import → Auto-Generate Nodes** — Import an OpenAPI spec and auto-generate HTTP request nodes for every endpoint. Ties into backend test generation engine.
- [ ] **Visual Variable Chaining** — Show dotted lines on canvas from extractor node → consumer node showing data flow.
- [ ] **Response Diff (Compare Two Runs)** — Side-by-side comparison of responses from different runs. No major tool does this well.
- [ ] **GraphQL Support** — Dedicated query editor with schema introspection and variable binding.
- [ ] **CLI Runner** — Headless CLI that runs exported flow JSON files and returns exit codes. Enables `npm test` / CI integration without a browser.
- [ ] **JUnit XML / HTML Report Export** — Export execution results for CI pipeline integration.
- [x] **Undo/Redo on Canvas** — Full undo/redo stack (max 50 snapshots). Tracks add/delete/duplicate nodes, add/delete/disconnect edges, drop new nodes, connect. Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y. Toolbar buttons. Resets on flow switch. Layer 1: node positions (drag), edges, add/delete. Layer 2: node data edits (debounced). Context menu delete uses store properly.
- [ ] **Collection Folders** — Organize flows into folders/collections with shared config inheritance. Currently a flat list.
- [ ] **gRPC & WebSocket Nodes** — Protocol-level nodes for gRPC unary/streaming and WebSocket connect/send/receive.
- [ ] **Dark/Light Theme Toggle** — Currently hardcoded dark theme.
- [ ] **Cloud Collaboration** — Real-time shared workspaces with team member roles (viewer/editor/admin), conflict resolution for simultaneous edits, collection sharing, team-level environments.
- [ ] **SSO / SAML Integration** — Enterprise single sign-on for the platform.

---

## ⚠️ Technical Decisions Needed

| Decision | Options | Notes |
|----------|---------|-------|
| **CORS Proxy** | Use .NET backend as relay / Add local proxy agent / Browser extension | Browser axios can't hit most real APIs due to CORS |
| ~~**Conditional/Loop/Script/Parallel**~~ | ~~Wire up execution~~ | ✅ DONE — Conditional (3 sources, branching), Loop (3 data sources), Script (console capture, rich sandbox). Parallel is pass-through. |
| **Storage Strategy** | Keep localStorage / Move to file-system (git-friendly like Bruno) / Use backend DB | localStorage has ~5MB limit |
| **SLM Integration** | Llama 3.1 8B / Phi-3 7B / Mistral 7B | For business rule extraction from PR descriptions (per project spec) |

---

## 📋 Implementation Order (Suggested)

**Phase 1 — Core Request Building:**
1. Environments & Variables
2. Query Params Editor
3. Pretty Response Viewer
4. Form-Data & Multipart Body

**Phase 2 — Auth & Sessions:**
5. OAuth 2.0 / JWT Auth
6. Per-Request Auth Override
7. Cookie / Session Management

**Phase 3 — Advanced Testing:**
8. Full JSONPath library
9. Pre-Request & Post-Response Scripts
10. JSON Schema Validation
11. Response Time Assertions
12. Regex & Contains Assertions

**Phase 4 — Developer Experience:**
13. Request History
14. Code Generation
15. Variable Auto-Complete
16. Undo/Redo

**Phase 5 — Differentiators:**
17. OpenAPI Import
18. CLI Runner
19. JUnit/HTML Reports
20. Visual Variable Chaining

**Phase 6 — Enterprise & Collaboration:**
21. OAuth 2.0 / JWT Auth Flows (authorization_code, client_credentials, PKCE, auto-refresh)
22. SSL/TLS Certificate Handling (disable SSL verify, custom CA certs)
23. Proxy Configuration (HTTP/SOCKS proxy per environment)
24. Cloud Collaboration (real-time shared workspaces, team roles, conflict resolution)
25. Collection Sync (git-backed or cloud-backed, version history)
26. SSO / SAML Integration (enterprise auth for the platform itself)
27. Audit Log (who changed what, when)

