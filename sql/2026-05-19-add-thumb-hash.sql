-- Photos 테이블에 thumb_hash 컬럼 추가
-- ThumbHash 인코딩된 base64 문자열 (~25바이트, blur placeholder용)
alter table photos add column if not exists thumb_hash text;

-- posts.media (jsonb)에는 별도 컬럼 없이 각 PostMedia 객체에 thumb_hash 필드를 추가합니다.
-- 신규 업로드는 자동으로 채워지고, 기존 데이터는 scripts/backfill-thumb-hash.ts로 백필합니다.
