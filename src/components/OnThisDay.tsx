import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { getTodayString, filterOnThisDay } from '../lib/dailyPick';
import type { Video, Moment, Post, Episode, MemberSettings } from '../lib/database';
import OnThisDayVideoGroup from './OnThisDayVideoGroup';
import PostDetailContent from './PostDetailContent';
import EpisodeContentBody from './EpisodeContentBody';
import PlatformIcon from './PlatformIcon';
import { ArrowRightIcon } from './Icons';

type Props = {
  fallback: ReactNode;
};

type YearBundle = {
  year: string;
  yearsAgo: number;
  videos: Video[];
  moments: Moment[];
  posts: Post[];
  episodes: Episode[];
};

// 홈의 "그 해 오늘" 섹션.
// 오늘과 같은 월/일에 과거 등록된 콘텐츠를 연도별로 묶어서 보여줌.
// 과거 콘텐츠가 0개면 fallback (Featured Content)을 그대로 렌더.
export default function OnThisDay({ fallback }: Props) {
  const { videos, moments, posts, episodes, memberSettings } = useData();
  const today = useMemo(() => getTodayString(), []);

  const yearBundles = useMemo<YearBundle[]>(() => {
    const todayYear = Number(today.slice(0, 4));
    const v = filterOnThisDay(videos ?? [], today);
    const m = filterOnThisDay(moments ?? [], today);
    const p = filterOnThisDay(posts ?? [], today);
    const e = filterOnThisDay(episodes ?? [], today);

    const years = new Set<string>();
    v.forEach(x => years.add(x.date.slice(0, 4)));
    m.forEach(x => years.add(x.date.slice(0, 4)));
    p.forEach(x => years.add(x.date.slice(0, 4)));
    e.forEach(x => years.add(x.date.slice(0, 4)));

    return Array.from(years)
      .sort((a, b) => b.localeCompare(a))
      .map(year => ({
        year,
        yearsAgo: todayYear - Number(year),
        videos: v.filter(x => x.date.slice(0, 4) === year),
        moments: m.filter(x => x.date.slice(0, 4) === year),
        posts: p.filter(x => x.date.slice(0, 4) === year),
        episodes: e.filter(x => x.date.slice(0, 4) === year),
      }));
  }, [videos, moments, posts, episodes, today]);

  const fallbackMemberSettings: MemberSettings = { member1_name: '멤버1', member2_name: '멤버2' };

  if (yearBundles.length === 0) {
    return <>{fallback}</>;
  }

  // 영상에 연결된 모먼트 매핑 (해당 영상의 video_id를 가진 모든 모먼트, 과거 전부)
  const momentsByVideoId: Record<string, Moment[]> = {};
  (moments ?? []).forEach(m => {
    if (m.video_id) {
      if (!momentsByVideoId[m.video_id]) momentsByVideoId[m.video_id] = [];
      momentsByVideoId[m.video_id].push(m);
    }
  });

  return (
    <section className="on-this-day">
      <div className="on-this-day-title-row">
        <span className="home-featured-badge">그 해 오늘</span>
        <span className="on-this-day-date-label">{today.slice(5, 7)}월 {today.slice(8, 10)}일</span>
      </div>

      {yearBundles.map(bundle => (
        <div key={bundle.year} className="on-this-day-year">
          <h3 className="on-this-day-year-label">
            {bundle.year}년 <span className="on-this-day-years-ago">({bundle.yearsAgo}년 전)</span>
          </h3>

          {/* 영상 그룹 (영상과 연결 모먼트 스와이프) */}
          {bundle.videos.length > 0 && (
            <OnThisDayVideoGroup
              videos={bundle.videos}
              momentsByVideoId={momentsByVideoId}
            />
          )}

          {/* 이 날짜 모먼트 중 영상과 연결되지 않은 독립 모먼트 */}
          {bundle.moments.filter(m => !m.video_id || !bundle.videos.find(v => v.id === m.video_id)).length > 0 && (
            <div className="on-this-day-standalone-moments">
              {bundle.moments
                .filter(m => !m.video_id || !bundle.videos.find(v => v.id === m.video_id))
                .map(moment => (
                  <div key={moment.id} className="on-this-day-moment-card standalone">
                    <h4 className="on-this-day-moment-title">{moment.title}</h4>
                    {moment.video_id ? (
                      <Link to={`/videos?highlight=${moment.video_id}&moment=${moment.id}`} className="on-this-day-moment-link">
                        모먼트 보러가기 <ArrowRightIcon size={12} />
                      </Link>
                    ) : (
                      <Link to={`/moments?highlight=${moment.id}`} className="on-this-day-moment-link">
                        모먼트 보러가기 <ArrowRightIcon size={12} />
                      </Link>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* 포스트 */}
          {bundle.posts.map(post => (
            <div key={post.id} className="on-this-day-post">
              <div className="on-this-day-post-title-row">
                <PlatformIcon platform={post.platform} size={16} />
                <h4 className="on-this-day-post-title">{post.title || post.platform}</h4>
              </div>
              <PostDetailContent post={post} />
            </div>
          ))}

          {/* 에피소드 */}
          {bundle.episodes.map(episode => (
            <div key={episode.id} className="on-this-day-episode">
              {episode.title && (
                <h4 className="on-this-day-episode-title">{episode.title}</h4>
              )}
              <EpisodeContentBody
                episode={episode}
                videos={videos ?? []}
                moments={moments ?? []}
                posts={posts ?? []}
                memberSettings={memberSettings ?? fallbackMemberSettings}
              />
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
