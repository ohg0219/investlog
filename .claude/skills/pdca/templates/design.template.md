---
template: design
version: 1.2
description: PDCA Design phase document template
variables:
  - feature: Feature name
  - date: Creation date (YYYY-MM-DD)
  - author: Author
  - project: Project name
  - version: Project version
---

# {feature} Design Document

> **Summary**: {One-line description}
>
> **Project**: {project}
> **Version**: {version}
> **Author**: {author}
> **Date**: {date}
> **Status**: Draft
> **Planning Doc**: [{feature}.plan.md](../01-plan/features/{feature}.plan.md)

---

## 1. Overview

### 1.1 Design Goals

{Technical goals this design aims to achieve}

### 1.2 Design Principles

- {Principle 1: e.g., Single Responsibility Principle}
- {Principle 2: e.g., Extensible architecture}

---

## 2. Architecture

### 2.1 Component Diagram

```
+---------------+     +---------------+     +---------------+
|   Client      |---->|   Server      |---->|  Database     |
|  (Browser)    |     |   (API)       |     | (Storage)     |
+---------------+     +---------------+     +---------------+
```

### 2.2 Data Flow

```
User Input -> Validation -> Business Logic -> Data Storage -> Response
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| {Component A} | {Component B} | {Purpose} |

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
interface {Entity} {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Additional fields...
}
```

### 3.2 Entity Relationships

```
[User] 1 ---- N [Post]
   |
   +-- 1 ---- N [Comment]
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/{resource} | List all | Required |
| GET | /api/{resource}/:id | Get detail | Required |
| POST | /api/{resource} | Create | Required |
| PUT | /api/{resource}/:id | Update | Required |
| DELETE | /api/{resource}/:id | Delete | Required |

### 4.2 Detailed Specification

#### `POST /api/{resource}`

**Request:**
```json
{
  "field1": "string",
  "field2": "number"
}
```

**Response (201 Created):**
```json
{
  "id": "string",
  "field1": "string",
  "field2": "number",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Input validation failed
- `401 Unauthorized`: Authentication required
- `409 Conflict`: Duplicate data

---

## 5. UI/UX Design (if applicable)

### 5.1 Screen Layout

```
+------------------------------------+
|  Header                            |
+------------------------------------+
|                                    |
|  Main Content Area                 |
|                                    |
+------------------------------------+
|  Footer                            |
+------------------------------------+
```

### 5.2 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| {ComponentA} | src/components/ | {Role} |

---

## 6. Error Handling

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| 400 | Invalid input | Input error | Re-entry from client |
| 401 | Unauthorized | Auth failure | Redirect to login |
| 404 | Not found | Resource missing | Show 404 page |
| 500 | Internal error | Server error | Log and notify |

---

## 7. Security Considerations

- [ ] Input validation (XSS, SQL Injection prevention)
- [ ] Authentication/Authorization handling
- [ ] Sensitive data encryption
- [ ] HTTPS enforcement

---

## 8. TDD Test Scenarios

### 8.1 Test Strategy

- **Approach**: TDD (Red-Green-Refactor)
- **Scope**: Unit tests for all business logic functions
- **Coverage Target**: 80%+
- **Test Framework**: {프로젝트에 맞는 프레임워크 (Jest/Vitest/pytest 등)}

### 8.2 Test Scenario List

| ID | Target | Description | Input | Expected Output | Priority |
|----|--------|-------------|-------|-----------------|----------|
| TS-01 | {함수/컴포넌트명} | {테스트 설명} | {입력 조건} | {기대 결과} | Critical/High/Medium/Low |
| TS-02 | {함수/컴포넌트명} | {테스트 설명} | {입력 조건} | {기대 결과} | Critical/High/Medium/Low |

### 8.3 Edge Cases

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| EC-01 | {경계 조건 설명} | {기대 동작} |

### 8.4 Test Implementation Order

1. TS-01: {이유 - 핵심 로직이므로 먼저}
2. TS-02: {이유 - TS-01에 의존}

---

## 9. Implementation Guide

### 9.1 File Structure

```
src/
  features/{feature}/
    components/
    hooks/
    api/
    types/
```

### 9.2 Implementation Order

1. [ ] Define data model
2. [ ] Implement API
3. [ ] Implement UI components
4. [ ] Integration and testing

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | {date} | Initial draft | {author} |
