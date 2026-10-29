-- 트랜스코딩 전 원본 영상 URL
--
-- scripts/transcode-r2-videos.ts가 변환하면 tweet_url ← 변환본(videos/t/…mp4), original_url ← 원래 tweet_url.
-- original_url이 채워진 행 = 처리 완료(멱등 판정 기준). 원본 객체는 R2에 그대로 남는다.
-- 포스트 영상은 posts.media[] 항목의 original_url 필드로 같은 일을 한다(스키마 변경 없음).
alter table moments add column if not exists original_url text;
