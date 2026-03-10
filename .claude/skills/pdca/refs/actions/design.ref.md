# design (Design Phase)

1. **Prerequisite**: Verify `docs/01-plan/features/{feature}.plan.md` exists
   - If missing, tell user: "Plan document not found. Run `/pdca plan {feature}` first."
2. Read Plan document for reference
3. Check if `docs/02-design/features/{feature}.design.md` exists
4. If exists, display and suggest modifications
5. If not, **determine feature scope from Plan document**, then call agent(s):

   **Step A — Primary scope routing:**

   | Scope | Agent(s) | Call method |
   |-------|----------|-------------|
   | Frontend-only | Task(frontend-designer) | single |
   | Backend-only | Task(backend-designer) | single |
   | Full-stack | Task(frontend-designer) + Task(backend-designer) | **parallel** |

   **Step B — System/Infra 조건부 추가 호출:**

   Plan 문서에 아래 키워드가 포함되면 **Task(system-architect)를 Step A와 병렬로 추가** 호출:
   - 인프라: CI/CD, Docker, Kubernetes, cloud, AWS/GCP/Azure, deployment
   - 시스템: microservices, tech stack 선정, database setup, message queue, cache layer
   - 아키텍처 수준 결정: monorepo, 모노리스→MSA 전환, 서비스 분리

   Task(system-architect) 담당 섹션: Section 2(Architecture), Section 7(Security Considerations)

   **예시 조합:**

   | 피처 성격 | 호출 Agent |
   |----------|-----------|
   | UI 컴포넌트만 추가 | Task(frontend-designer) |
   | API + DB 추가 | Task(backend-designer) |
   | UI + API 추가 | Task(frontend-designer) + Task(backend-designer) [병렬] |
   | UI + API + 배포 설계 | Task(frontend-designer) + Task(backend-designer) + Task(system-architect) [병렬] |
   | 인프라 마이그레이션 | Task(system-architect) |

   **Scope 판단 기준** (Plan 문서 내용 기반):
   - Frontend-only: UI/컴포넌트/페이지/훅 중심. "API routes", "DB", "server" 언급 없음
   - Backend-only: API 엔드포인트·데이터 모델·서비스 로직 중심. UI 없음
   - Full-stack: 프론트엔드와 백엔드 모두 포함
   - Infra 추가: 위 중 하나 + 인프라/시스템 수준 결정 포함

   **각 Agent 제공 컨텍스트**:
   - Plan 문서 경로
   - 프로젝트 컨텍스트 (framework, conventions, 기존 컴포넌트 구조)
   - 담당 섹션 명시:
     - frontend-designer → Section 5(UI/UX Design), Section 9(Implementation Guide)
     - backend-designer → Section 3(Data Model), Section 4(API Spec), Section 6(Error Handling)
     - system-architect → Section 2(Architecture), Section 7(Security Considerations)

   - **CRITICAL**: 모든 Agent를 단일 메시지에서 동시에 호출 — 순차 호출 금지

6. Synthesize agent outputs: read [design.template.md](../../templates/design.template.md) and produce `docs/02-design/features/{feature}.design.md`
7. Review and confirm document was created
8. Update `docs/.pdca-status.json`:
   - `phase` = `"design"`, `phaseNumber` = `2`
   - `documents.design` = file path
9. Create Task: `[Design] {feature}` with `addBlockedBy` referencing the Plan task
10. Add to history: `"design_created"`

**Output**: `docs/02-design/features/{feature}.design.md`

> Action completed -> save snapshot. Procedure: see `refs/snapshot.ref.md`.
