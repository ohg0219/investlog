---
name: content-lint
description: "MDX 콘텐츠 파일의 frontmatter 완전성, 섹션 구조, 코드 블록 언어 지정, 내부 링크 유효성을 자동 검사한다"
argument-hint: "[path] [--fix-hints] [--role developer|planner]"
user-invocable: true
allowed-tools: Read, Glob, Grep
---

$ARGUMENTS

# Content Lint

MDX 가이드 파일의 품질 기준 준수 여부를 자동 점검하는 도구입니다.
frontmatter 필드 누락, 코드 블록 언어 미지정, 내부 링크 깨짐 등을 탐지하여
Error 0건 통과 기준을 기준으로 결과를 출력합니다.

## Process

### 1. Arguments 파싱

`$ARGUMENTS`를 분석하여 다음 옵션을 추출한다:

- **path**: 검사할 경로 (생략 시 `content/` 전체 대상)
  - 예: `content/guides/`, `content/guides/developer/claude-code-intro.mdx`
- **--fix-hints**: 각 이슈에 수정 힌트 포함
- **--role developer|planner**: 특정 role의 가이드만 필터링

### 2. 대상 파일 탐색

Glob으로 대상 경로에서 `.mdx` 파일을 찾는다.
`--role` 옵션이 있으면 해당 role 서브디렉토리만 탐색.

### 3. 검사 항목 (7개)

| ID  | 심각도  | 검사 내용 |
|-----|---------|----------|
| C01 | Error   | 필수 frontmatter 필드 누락 (`title`, `description`, `role`, `difficulty`, `tags`, `publishedAt`) |
| C02 | Error   | `role` 필드 값이 `developer`, `planner`, 또는 `all`이 아님 |
| C03 | Error   | 코드 블록 언어 지정 누락 (``` ` ``` ` ` ``` ` ``` 만 있고 언어 없음) |
| C04 | Error   | 내부 링크 경로 깨짐 (`/guides/...` 링크 대상 파일 없음) |
| C05 | Warning | 본문에 h1(`#`) 중복 — frontmatter title과 별도 h1 존재 |
| C06 | Warning | 제목 계층 건너뜀 (h2 없이 h3 등장 등) |
| C07 | Warning | 빈 섹션 존재 — 제목 뒤 내용 없이 다음 제목이 바로 등장 |

**통과 기준**: Error 0건

### 4. frontmatter 파싱

각 MDX 파일을 Read하여 YAML frontmatter를 파싱한다:
- `---` 구분자 사이의 내용을 frontmatter로 인식
- 필수 필드 존재 여부 및 값 유효성 확인

### 5. 점수 계산

100점 기준 감점:
- Error 1건당: -15점
- Warning 1건당: -5점

**등급**:
- **PASS**: Error = 0 (점수 무관)
- **WARN**: Error = 0이지만 Warning 존재
- **FAIL**: Error ≥ 1

### 6. 결과 출력

아래 Output 형식에 따라 출력한다.

## Output

```
Content Lint 결과
=================
검사 경로: {path}
파일 수: {N}개
통과: {PASS|FAIL}
이슈: Error {n}건 | Warning {n}건

파일별 결과
-----------

### {파일경로} — {PASS|WARN|FAIL}
| ID  | 심각도  | 내용 | 위치 | 수정 힌트 (--fix-hints 시) |
|-----|---------|------|------|--------------------------|
| C01 | Error   | `tags` 필드 누락 | frontmatter | tags: ["claude-code"] 추가 |
| C03 | Error   | 코드 블록 언어 없음 | L42 | ```tsx 또는 ```bash 지정 |

전체 요약
---------
PASS: {n}개 파일
FAIL: {n}개 파일

Error 목록:
  [{파일}] C01: {필드명} 필드 누락
  [{파일}] C03: L{줄}: 코드 블록 언어 미지정

Warning 목록:
  [{파일}] C06: L{줄}: h2 없이 h3 등장
```

## Error Cases

- **경로가 존재하지 않는 경우**: `오류: '{path}' 경로를 찾을 수 없습니다.` 출력 후 종료
- **MDX 파일이 없는 경우**: `'{path}'에서 검사할 MDX 파일을 찾지 못했습니다.` 출력
- **이슈가 0건인 경우**: 모든 파일 PASS 표기 후 종료
