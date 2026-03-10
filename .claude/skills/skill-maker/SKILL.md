---
name: skill-maker
description: Skill/Agent 마크다운 파일을 생성하는 도구. 자율적으로 또는 수동으로 전문 도구를 생성합니다.
allowed-tools: Read, Write, Glob, Grep, Task
user-invocable: true
argument-hint: "[skill|agent|auto|list] <name> <purpose>"
---

$ARGUMENTS

# Skill Maker

전문화된 Skill 또는 Agent 마크다운 파일을 생성하는 도구.
사용자가 직접 `/skill-maker` 명령으로 호출하여 수동으로 Skill/Agent를 생성할 수 있다.

## Arguments

| Command | Description | Example |
|---------|-------------|---------|
| `skill <name> <purpose>` | Skill 수동 생성 | `/skill-maker skill db-migrate DB 마이그레이션 관리` |
| `agent <name> <purpose>` | Agent 수동 생성 | `/skill-maker agent api-tester API 엔드포인트 테스트` |
| `auto <purpose>` | Skill vs Agent 자율 판별 후 생성 | `/skill-maker auto 코드 리뷰 자동화` |
| `list` | 기존 Skill/Agent 목록 출력 | `/skill-maker list` |

## Process

### 1. Arguments 파싱

`$ARGUMENTS`에서 명령어를 추출한다:

- 첫 번째 단어: `skill` | `agent` | `auto` | `list`
- 두 번째 단어 (skill/agent): `name` (kebab-case)
- 나머지: `purpose`

인자가 없거나 파싱 불가 시:
```
사용법: /skill-maker [skill|agent|auto|list] <name> <purpose>

예시:
  /skill-maker skill db-migrate DB 마이그레이션 관리 도구
  /skill-maker agent api-tester API 엔드포인트 테스트 전문가
  /skill-maker auto 코드 리뷰 자동화
  /skill-maker list
```

### 2. list 명령어

기존 Skill/Agent 목록을 출력한다:

1. `Glob(".claude/skills/*/SKILL.md")` 로 모든 Skill 파일 수집
2. `Glob(".claude/agents/*/AGENT.md")` 로 모든 Agent 파일 수집
3. 각 파일의 frontmatter에서 `name`과 `description` 추출
4. 출력:

```
Skill/Agent 목록
──────────────────────────────────────

Skills:
  - commit: 세션 중 변경사항에 대해 표준화된 git commit 생성
  - pdca: Manage PDCA cycle
  - skill-maker: Skill/Agent 마크다운 파일을 생성하는 도구

Agents:
  - code-analyzer: 코드 품질, 보안, 성능 이슈를 분석하는 Agent
  - gap-detector: Design 문서와 구현 코드 간의 Gap을 검출
  - skill-maker: 전문화된 Skill/Agent 마크다운 파일을 자율적으로 생성
  ...

총 {N}개 Skills, {M}개 Agents
```

### 3. skill/agent 명령어

지정된 타입으로 직접 생성한다.

1. **이름 검증**: kebab-case 확인. 위반 시 자동 변환 (공백→하이픈, 대문자→소문자)
2. **충돌 확인**: 해당 경로에 파일이 이미 존재하는지 Glob으로 확인
3. **skill-maker Agent 호출**:
   ```
   Task(subagent_type="skill-maker") 로 Agent에 위임:
     - type: "skill" 또는 "agent"
     - name: 파싱된 이름
     - purpose: 파싱된 목적 설명
   ```
4. **결과 출력**: Agent가 반환한 결과를 정리하여 표시

### 4. auto 명령어

Skill vs Agent를 자율 판별 후 생성한다.

1. `purpose`에서 적합한 이름을 자동 추출 (kebab-case 변환)
2. **skill-maker Agent 호출**:
   ```
   Task(subagent_type="skill-maker") 로 Agent에 위임:
     - type: "auto"
     - name: 자동 추출된 이름
     - purpose: 전달된 목적 설명
   ```
3. **결과 출력**: Agent가 판별한 타입과 생성 결과를 표시

### 5. 결과 출력 형식

생성 완료 시:

```
──────────────────────────────────────
Skill/Agent 생성 완료
──────────────────────────────────────
Type: {Skill|Agent}
Name: {name}
Path: {.claude/skills/{name}/SKILL.md 또는 .claude/agents/{name}/AGENT.md}
Purpose: {purpose}
Tools: {부여된 도구 목록}
──────────────────────────────────────
즉시 사용 가능:
  - Skill: /skill-maker 로 호출
  - Agent: Task(subagent_type="{name}") 으로 호출
──────────────────────────────────────
```

## Error Cases

| Error | Message | Action |
|-------|---------|--------|
| 이름 충돌 | "이미 존재하는 이름입니다: {name}" | 기존 파일 경로 표시, 생성 중단 |
| 인자 부족 | "name과 purpose를 모두 지정해주세요" | 사용법 안내 출력 |
| 잘못된 이름 | "이름을 kebab-case로 자동 변환합니다: {original} → {converted}" | 자동 변환 후 진행 |
