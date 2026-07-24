---
type: meta
title: "작성 컨벤션"
created: 2026-07-24
updated: 2026-07-24
tags: [meta, conventions]
---

# 작성 컨벤션

이 vault의 노트를 쓰거나 고칠 때 따르는 규칙. **구조·운영 규칙의 SSOT는 이 문서다.**

## Frontmatter (필수)

모든 노트는 최소 `type`, `status`, `created`, `updated`, `tags`를 가진다.

예외 — `type: meta`와 인덱스 페이지(`index`, `log`, `hot`, `overview`, `_index`, 본 문서)는 `status` 면제. 자동 갱신되는 인프라라 성숙도 라이프사이클이 없다. `created`/`updated`는 유지한다.

`status` 값:

| 값 | 뜻 |
|---|---|
| `stub` | 제목만 있고 내용이 비었음 |
| `developing` | 작성 중, 사실 검증 미완 |
| `stable` | 코드와 대조 완료 |
| `superseded` | 대체됨. 본문 최상단에 대체 페이지 링크 |

## type 판별

폴더는 `type`을 미러한다. type은 **주제가 아니라 intent와 수명**으로 고른다. 위에서부터 first-match-wins.

1. 코드 규칙·경계를 **강제**하나? → **convention** (`convention/`)
2. 대안을 기각하고 왜 이렇게 정했는지 기록? → **decision** (`decisions/`)
3. 재사용 가능한 코드 해법? → **pattern** (`patterns/`)
4. 툴체인·배포·스크립트 셋업 산출물? → **tooling** (`tooling/`)
5. 코드 전체의 구조·배치·모델? → **architecture** (`architecture/`)
6. 앱의 콘텐츠 도메인 사실? → **domain** (`domains/`)
7. 용어·개념 정의? → **concept** (`concepts/`)
8. 외부 서비스·의존 대상? → **entity** (`entities/`)

겹치기 쉬운 쌍:

| 애매 쌍 | 판별 신호 |
|---|---|
| pattern ↔ convention | 어기면 깨지거나 막히면 convention, "이렇게 하면 좋다"면 pattern |
| decision ↔ 나머지 | 기각한 대안이 있으면 decision 우선 |
| domain ↔ architecture | 사용자에게 보이는 콘텐츠 종류면 domain, 코드 배치면 architecture |
| tooling ↔ entity | 우리가 설정한 산출물이면 tooling, 외부 서비스 자체면 entity |

## enforcement (convention 전용은 아님)

바인딩 강도를 `enforcement: must | should | may`로 단다. convention뿐 아니라 pattern·tooling도 필요하면 단다.

- `must` — 어기면 배포가 깨지거나 보안 사고. 예외 없음
- `should` — 벗어나려면 이유를 남긴다
- `may` — 권장

## 링크

- 위키링크로 잇는다. 예: [[supabase-key-boundary]]. 파일명은 kebab-case, vault 전체에서 고유하게
- `_index.md`만 폴더마다 있어 이름이 겹친다. 링크할 때 폴더를 붙인다 — [[domains/_index]]
- 각 폴더의 `_index.md`가 그 폴더의 카탈로그다. 페이지를 추가하면 `_index.md`와 `index.md` 둘 다 갱신한다

## 절대 규칙

- `.raw/` 원본은 **수정 금지**. 단 secret·PII가 리터럴로 박혀 있으면 마스킹만 예외
- `log.md`는 append-only, 새 항목은 **최상단**
- `index.md`는 페이지 추가·삭제마다 갱신
- **코드와 문서가 어긋나면 코드가 정답이다.** 문서를 고친다

## 이 vault에서 안 하는 것

one-fe의 `knowledge-vault`를 참고했지만 다음은 의도적으로 뺐다. 1인 사이드 프로젝트 규모에 비해 유지 비용이 크기 때문이다.

- retrieve 파이프라인 (BM25 인덱스, 임베딩, rerank) — Python 환경과 API 쿼터가 필요
- `.claude/hooks/` 자동화, path-scoped rules
- `screens/`, `verdicts/`, `api/`, `issues/`, `process/`, `archive/` 카테고리

필요해지면 그때 추가한다. 미리 만들어 두지 않는다.
