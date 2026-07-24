---
type: meta
title: "Patterns Index"
created: 2026-07-24
updated: 2026-07-24
tags: [meta, index]
---

# Patterns

재사용 가능한 코드 해법. 강제 규칙은 [[convention/_index|컨벤션]], 결정 경위는 [[decisions/_index|결정]]에 있다.

| 페이지 | enforcement | 내용 |
|---|---|---|
| [[r2-media-pipeline]] | must | 업로드 → 썸네일 → ThumbHash → EXIF 제거 한 흐름 |
| [[embedding-semantic-search]] | should | 임베딩 색인/검색과 임계값 필터 |
| [[og-image-generation]] | should | satori → resvg PNG, Twemoji 치환 |
| [[scheduled-job-drift-compensation]] | should | 일찍 트리거하고 스크립트가 대기 |
| [[domain-per-file-db-layer]] | should | 도메인별 DB 모듈 + 배럴 |
