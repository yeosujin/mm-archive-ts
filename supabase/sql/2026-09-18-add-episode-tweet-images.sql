-- 에피소드에 X(트위터) 봇 전용 이미지 첨부
--
-- 공개 페이지(/episodes)에는 렌더링하지 않는다. 오직 scripts/dailyTweet 봇이
-- "그 해 오늘" 게시를 만들 때만 읽는다. 에피소드 본문(messages)의 image 메시지와는
-- 별개다 — 본문 이미지는 사이트에 보이고, 이 컬럼은 보이지 않는다.
--
-- string[] (R2 공개 URL). 트윗 1개에 미디어가 4개까지 들어가므로 어드민에서 4장까지 받는다.
alter table episodes add column if not exists tweet_images jsonb default '[]'::jsonb;
