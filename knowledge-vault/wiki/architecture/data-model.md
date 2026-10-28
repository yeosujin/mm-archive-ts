---
type: architecture
status: stable
tags: [architecture, data-model]
created: 2026-07-24
updated: 2026-10-28
---

# 데이터 모델

`src/lib/database/types.ts` 원문 기준. 이 파일이 타입의 단일 출처다.

```typescript
interface Video {
  id: string; title: string; url: string; date: string;
  icon?: string;          // Weverse 멤버 아이콘 🤍💙🩵🖤
  icon_text?: string;     // 🖤일 때 구체적 멤버명
  thumbnail_url?: string;
  channel_name?: string;  // YouTube 채널명 (타 채널 필터용)
  platform_name?: string; // 기타 플랫폼일 때 표시명
}

interface Moment {
  id: string; title: string; tweet_url: string; date: string;
  video_id?: string; position?: number; thumbnail_url?: string;
}

interface PostMedia {
  type: 'image' | 'video'; url: string;
  thumbnail?: string; thumb_hash?: string;
}

interface Post {
  id: string; title: string; url: string;
  platform: 'twitter' | 'instagram' | 'weverse' | 'other';
  date: string; writer?: string; content?: string; media?: PostMedia[];
}

interface Episode {
  id: string; title?: string; date: string;
  episode_type: 'dm' | 'comment' | 'listening_party';
  sender?: 'member1' | 'member2';
  platform?: 'weverse' | 'melon' | 'spotify' | 'apple_music';
  messages?: { type: 'text' | 'image'; content: string; time: string; sender_name?: string }[];
  linked_content_type?: 'video' | 'moment' | 'post';
  linked_content_id?: string;
  comment_text?: string;
}

interface Photo {
  id: string; title: string; date: string; tags: string[];
  image_url: string; thumbnail_url?: string; thumb_hash?: string;
}

interface Ask {
  id: string; content: string; image_url?: string; answer?: string;
  status: 'pending' | 'answered'; created_at: string; answered_at?: string;
}

interface Activity { id: string; name: string; created_at?: string }

interface MemberSettings { member1_name: string; member2_name: string }
```

## 코드에서 빠진 테이블 (2.0.0)

도서관(`articles` 테이블)과 홈 메인 걸기(`featured_content` 테이블), `settings.articles_visible` 컬럼은 2.0.0에서 앱 코드·타입만 지웠다. **DB에는 그대로 남아 있다**(데이터 보존). 관련 Supabase edge function·임베딩도 손대지 않았다 → [[articles]]

## 임베딩 테이블

`content_embeddings` — 위 인터페이스에는 없고 DB에만 있다.

`id`, `content_type`, `content_id`, `text`, `embedding vector(768)`, `updated_at`

→ [[embedding-semantic-search]]

## 관찰

- **`created_at`을 가진 것은 `Ask`와 `Activity`뿐이다.** 나머지의 `date`는 콘텐츠 원본 날짜다 → [[content-date-semantics]]
- 참조 무결성이 타입 레벨에서 강제되지 않는다. `Moment.video_id`, `Episode.linked_content_id`는 모두 문자열이고 대상이 삭제돼도 남는다
- `Post.media`와 `Photo`가 `thumb_hash`를 갖지만 `Video`는 갖지 않는다 — 영상은 `thumbnail_url`만 쓴다

## 관련
- [[database-layer]] · [[content-date-semantics]] · [[embedding-semantic-search]]
