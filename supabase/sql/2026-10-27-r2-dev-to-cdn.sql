-- r2.dev 공개 주소를 cdn.mmemory.cloud로 통일 (같은 버킷, 키 경로 그대로)
--
-- r2.dev 주소는 Cloudflare 캐시를 타지 않는다. 호스트만 바꾸면 같은 객체가 cdn 캐시를 탄다.
-- jsonb 컬럼은 텍스트로 바꿔 치환한다 — 중첩 위치(media[].url/thumbnail, messages[].content)를 한 번에 처리한다.
-- 여러 번 실행해도 결과가 같다.

begin;

update moments set
  tweet_url = replace(tweet_url, 'https://pub-e283cbe5050744f68f0725eaa678e156.r2.dev', 'https://cdn.mmemory.cloud'),
  thumbnail_url = replace(thumbnail_url, 'https://pub-e283cbe5050744f68f0725eaa678e156.r2.dev', 'https://cdn.mmemory.cloud')
where tweet_url like '%r2.dev%' or thumbnail_url like '%r2.dev%';

update photos set
  image_url = replace(image_url, 'https://pub-e283cbe5050744f68f0725eaa678e156.r2.dev', 'https://cdn.mmemory.cloud'),
  thumbnail_url = replace(thumbnail_url, 'https://pub-e283cbe5050744f68f0725eaa678e156.r2.dev', 'https://cdn.mmemory.cloud')
where image_url like '%r2.dev%' or thumbnail_url like '%r2.dev%';

update posts set
  media = replace(media::text, 'https://pub-e283cbe5050744f68f0725eaa678e156.r2.dev', 'https://cdn.mmemory.cloud')::jsonb
where media::text like '%r2.dev%';

update episodes set
  messages = replace(messages::text, 'https://pub-e283cbe5050744f68f0725eaa678e156.r2.dev', 'https://cdn.mmemory.cloud')::jsonb
where messages::text like '%r2.dev%';

update episodes set
  tweet_images = replace(tweet_images::text, 'https://pub-e283cbe5050744f68f0725eaa678e156.r2.dev', 'https://cdn.mmemory.cloud')::jsonb
where tweet_images::text like '%r2.dev%';

-- 확인: 전부 0이어야 한다
select
  (select count(*) from moments  where tweet_url like '%r2.dev%' or thumbnail_url like '%r2.dev%') as moments_left,
  (select count(*) from photos   where image_url like '%r2.dev%' or thumbnail_url like '%r2.dev%') as photos_left,
  (select count(*) from posts    where media::text like '%r2.dev%') as posts_left,
  (select count(*) from episodes where messages::text like '%r2.dev%' or tweet_images::text like '%r2.dev%') as episodes_left;

commit;
