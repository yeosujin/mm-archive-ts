---
type: meta
title: "Architecture Index"
created: 2026-07-24
updated: 2026-07-24
tags: [meta, index]
---

# Architecture

코드가 어떻게 배치되고 무엇으로 이루어졌는지. 사용자에게 보이는 콘텐츠 단위는 [[domains/_index|도메인]]을 본다.

| 페이지 | 내용 |
|---|---|
| [[directory-structure]] | 전체 디렉토리 트리, lib 유틸, 캐싱, CSS |
| [[database-layer]] | `src/lib/database/` 12개 모듈과 배럴 |
| [[routing]] | 라우트 트리 (공개 11 + 어드민 8), 404, 어드민 인증 |
| [[data-model]] | `types.ts` 전체 인터페이스 |
| [[serverless]] | Edge Function / Vercel Function 표면, `content_embeddings` 스키마 |
