# do (Do Phase)

1. **Prerequisite**: Verify Design document exists
2. Read Design document:
   - Extract implementation order (Section 9)
   - Identify implementation scope: **frontend-only / backend-only / full-stack**
   - Check for Section 8 "TDD Test Scenarios"
3. **Route to agent(s)** based on Design scope:

   | Scope | Agent(s) | Call method |
   |-------|----------|-------------|
   | Frontend-only (UI, components, hooks, pages, styles) | Task(frontend-developer) | single |
   | Backend-only (API routes, services, DB, server logic) | Task(backend-developer) | single |
   | Full-stack (both) | Task(frontend-developer) + Task(backend-developer) | **parallel** |
   | Content-audit (감사/팩트체크/UX 감사) | Task(content-specialist) | single |
   | Content-write (신규 가이드 작성) | Task(technical-writer) | single |
   | Content-full (감사 후 개선) | Task(content-specialist) → Task(technical-writer) | **sequential** |

   - **Full-stack parallel**: Launch both in a single response — provide each agent only its relevant Design sections
   - **Content-full sequential**: Pass content-specialist's full report as context when calling technical-writer

   **Feature → Scope 매핑**:
   - `content-factcheck` → Content-audit
   - `ux-content-audit` → Content-audit
   - `content-new-guides` → Content-write
   - `content-depth` → Content-full (감사 후 심화 작성)

4. Agent call context to provide:
   - Design document path
   - Project context (framework, conventions)
   - TDD enabled flag (from step 2)
   - **If TDD**: Agent follows Red-Green-Refactor cycle based on TS-xx scenarios from Design Section 8
   - **If not TDD**: Agent implements based on Design Section 9 implementation order
5. Review implementation results
6. Update status: `phase` = `"do"`, `phaseNumber` = `3`, `tdd.enabled` flag (if TDD detected)
7. Create Task: `[Do] {feature}` with `addBlockedBy` referencing Design task
8. Add to history: `"do_started"`

**Output**: Implemented source code files

> Action completed -> save snapshot. Procedure: see `refs/snapshot.ref.md`.
