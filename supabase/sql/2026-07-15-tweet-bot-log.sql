-- 봇 중복 게시 방지 로그. run_date(YYYY-MM-DD)를 PK로 하여
-- 같은 날 재실행 시 스킵. 내년 같은 MM-DD는 다른 키라 정상 게시된다.
create table if not exists public.tweet_bot_log (
  run_date    date primary key,
  posted_at   timestamptz not null default now(),
  tweet_count integer not null default 0
);
