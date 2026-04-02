# 🔧 REFACTORING BACKLOG

**Created:** 2026-03-02  
**Updated:** 2026-03-02  
**Status:** Functional — needs cleanup before SLM integration  
**Priority Order:** Backend cleanup → Frontend cleanup → SLM integration  

---

## 📋 EXECUTION ORDER

### Sprint 1: Backend Cleanup
1. Extract services from TestSuitesController (970+ lines → split into TestGenerationService, TestExecutionService, ReportService)
2. Fix endpoint count not populating on collections
3. Add proper EF Core migrations
4. Add unit tests for MutationEngine, ValidPayloadBuilder, TestAssembler
5. Make test execution async (return run ID immediately, poll for status)
6. Reduce default timeout from 30s → 10s

### Sprint 2: Frontend Cleanup
7. Fix "+ Generate Test Suite" button (add project selector)
8. Replace all `alert()` with Material snackbar
9. Add loading skeleton states
10. Consolidate `.btn` styles into global SCSS
11. Add proper error handling + user-friendly messages
12. Remove unused imports/methods
13. Improve responsive design

### Sprint 3: SLM Integration
14. Install Ollama + Llama 3.1 8B (or Phi-3.5 Mini)
15. Enable SLM config, test rule extraction end-to-end
16. Fine-tune prompt template based on real results
17. Add SLM health check indicator in UI

---

## 🔴 HIGH PRIORITY (Functional Issues)

- [ ] **"+ Generate Test Suite" button** — needs project selector dropdown when multiple projects exist (currently navigates without knowing which project)
- [ ] **"0 endpoints" shown on collection cards** — `endpointCount` not being populated when generating from OpenAPI; needs to update `ApiCollection.EndpointCount` after generation
- [ ] **Test execution timeout** — 29 P0 tests against Petstore runs synchronously with 30s timeout each; consider async execution with polling or reduce default timeout to 10s
- [ ] **Error handling on all pages** — API errors should show user-friendly messages, not just silently fail

---

## 🟡 MEDIUM PRIORITY (UI/UX Polish)

- [ ] **Loading skeleton states** — replace "Loading..." text with skeleton loaders on dashboard, test list, run list
- [ ] **Empty states** — better empty state graphics/messaging on all pages
- [ ] **Test case list page** — add search/filter bar styling, improve table layout for mobile
- [ ] **Test run detail page** — improve evidence viewer (syntax highlight JSON), add collapsible sections
- [ ] **Coverage bar legend** — make legend items clickable to filter
- [ ] **Dashboard project cards** — add last run status, last run date, trend indicator
- [ ] **Form validation** — add proper form validation to generator options, execute form, SLM input
- [ ] **Toast notifications** — replace `alert()` calls with Material snackbar notifications
- [ ] **Responsive design** — test and fix layout on tablet/mobile

---

## 🟢 LOW PRIORITY (Code Quality)

- [ ] **Remove unused `ActivatedRoute`** from dashboard component (no longer needed)
- [ ] **Remove unused `Project` model** references
- [ ] **Consolidate button styles** — many components define `.btn` locally; move to shared global styles
- [ ] **Extract shared interfaces** — coverage stats, test case summary used across multiple components
- [ ] **Lazy load coverage data** — dashboard makes N+1 API calls (1 per project + 1 per collection); consider a batch endpoint
- [ ] **Type safety** — some components use `any` types; add proper interfaces
- [ ] **Backend: Extract services** — TestSuitesController is 970+ lines; extract into service classes
- [ ] **Backend: Add unit tests** — MutationEngine, ValidPayloadBuilder, TestAssembler, ReportGenerator
- [ ] **Backend: EF Core migrations** — currently relying on EnsureCreated; need proper migration files

---

## 🔵 FUTURE FEATURES (Not in v1 scope)

- [ ] SLM integration (after cleanup — Llama 3.1 8B or Phi-3.5 Mini via Ollama)
- [ ] Bruno import parser
- [ ] Postman collection import
- [ ] Dark mode
- [ ] Test case editing in UI (currently view-only with limited edit)
- [ ] Diff view between test runs
- [ ] Webhook notifications on test completion
- [ ] Scheduled test execution
- [ ] Team collaboration features (comments, assignments on failing tests)

