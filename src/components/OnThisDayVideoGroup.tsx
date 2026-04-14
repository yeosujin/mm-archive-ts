import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import type { Video, Moment } from '../lib/database';
import VideoEmbed from './VideoEmbed';
import { ArrowRightIcon } from './Icons';

type Props = Readonly<{
  videos: Video[];
  momentsByVideoId: Record<string, Moment[]>;
}>;

type FlatItem =
  | { kind: 'moment'; videoIndex: number; moment: Moment }
  | { kind: 'placeholder'; videoIndex: number; videoId: string };

// 영상 헤더 가로 스크롤 + 모먼트 가로 스크롤이 양방향 동기화.
// 모먼트를 끝까지 넘기면 자동으로 다음 영상의 모먼트로 이어진다.
export default function OnThisDayVideoGroup({ videos, momentsByVideoId }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const momentsScrollRef = useRef<HTMLDivElement>(null);
  const programmaticScrollRef = useRef(false);

  // 영상이 여러 개일 때 모든 모먼트를 플랫 리스트로 (없는 영상엔 placeholder)
  const flatItems = useMemo<FlatItem[]>(() => {
    const result: FlatItem[] = [];
    videos.forEach((v, i) => {
      const ms = momentsByVideoId[v.id] || [];
      if (ms.length === 0) {
        result.push({ kind: 'placeholder', videoIndex: i, videoId: v.id });
      } else {
        ms.forEach(m => result.push({ kind: 'moment', videoIndex: i, moment: m }));
      }
    });
    return result;
  }, [videos, momentsByVideoId]);

  // 각 영상의 첫 flatItem 인덱스
  const firstFlatIndexByVideo = useMemo(() => {
    const map: number[] = [];
    videos.forEach((_, i) => {
      const idx = flatItems.findIndex(item => item.videoIndex === i);
      map.push(idx);
    });
    return map;
  }, [flatItems, videos]);

  // 프로그래매틱 스크롤 후 플래그 해제
  const clearProgrammaticFlagSoon = () => {
    setTimeout(() => { programmaticScrollRef.current = false; }, 350);
  };

  const scrollHeaderTo = useCallback((index: number) => {
    const el = headerScrollRef.current;
    if (!el) return;
    const itemWidth = el.clientWidth;
    programmaticScrollRef.current = true;
    el.scrollTo({ left: itemWidth * index, behavior: 'smooth' });
    clearProgrammaticFlagSoon();
  }, []);

  const scrollMomentsToVideo = useCallback((index: number) => {
    const el = momentsScrollRef.current;
    if (!el) return;
    const flatIdx = firstFlatIndexByVideo[index];
    if (flatIdx == null || flatIdx < 0) return;
    const child = el.children[flatIdx] as HTMLElement | undefined;
    if (!child) return;
    programmaticScrollRef.current = true;
    el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior: 'smooth' });
    clearProgrammaticFlagSoon();
  }, [firstFlatIndexByVideo]);

  const goToVideo = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= videos.length) return;
    setCurrentIndex(newIndex);
    scrollHeaderTo(newIndex);
    scrollMomentsToVideo(newIndex);
  }, [videos.length, scrollHeaderTo, scrollMomentsToVideo]);

  // 마운트 시 첫 영상으로 초기 위치
  useEffect(() => {
    setCurrentIndex(0);
  }, [videos]);

  if (videos.length === 0) return null;

  const currentVideo = videos[currentIndex];
  const hasMultipleVideos = videos.length > 1;

  // 헤더 스크롤 → currentIndex 갱신
  const handleHeaderScroll = () => {
    if (programmaticScrollRef.current) return;
    const el = headerScrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== currentIndex && idx >= 0 && idx < videos.length) {
      setCurrentIndex(idx);
      scrollMomentsToVideo(idx);
    }
  };

  // 모먼트 스크롤 → 가장 가까운 카드의 videoIndex로 currentIndex 갱신
  const handleMomentsScroll = () => {
    if (programmaticScrollRef.current) return;
    const el = momentsScrollRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let nearestIdx = 0;
    let nearestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const childCenter = c.offsetLeft - el.offsetLeft + c.offsetWidth / 2;
      const dist = Math.abs(childCenter - center);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    });
    const newVideoIdx = flatItems[nearestIdx]?.videoIndex ?? 0;
    if (newVideoIdx !== currentIndex) {
      setCurrentIndex(newVideoIdx);
      scrollHeaderTo(newVideoIdx);
    }
  };

  return (
    <div className="on-this-day-video-group">
      <div className="on-this-day-video-header-wrap">
        <div
          className="on-this-day-header-scroll"
          ref={headerScrollRef}
          onScroll={handleHeaderScroll}
        >
          {videos.map(video => (
            <div key={video.id} className="on-this-day-header-slide">
              <div className="on-this-day-video-header">
                <span className="on-this-day-video-title">{video.title}</span>
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="on-this-day-video-btn"
                >
                  보러가기 <ArrowRightIcon size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {hasMultipleVideos && (
        <div className="on-this-day-dots">
          {videos.map((v, i) => (
            <button
              key={v.id}
              className={`on-this-day-dot ${i === currentIndex ? 'active' : ''}`}
              onClick={() => goToVideo(i)}
              aria-label={`영상 ${i + 1}`}
            />
          ))}
        </div>
      )}

      {flatItems.length > 0 && (
        <div
          className="on-this-day-moments-scroll"
          ref={momentsScrollRef}
          onScroll={handleMomentsScroll}
        >
          {flatItems.map((item, i) => {
            if (item.kind === 'moment') {
              return (
                <div key={`m-${item.moment.id}`} className="on-this-day-moment-card">
                  <VideoEmbed
                    url={item.moment.tweet_url}
                    title={item.moment.title}
                    thumbnailUrl={item.moment.thumbnail_url}
                  />
                </div>
              );
            }
            return (
              <div key={`p-${item.videoId}-${i}`} className="on-this-day-moment-card on-this-day-moment-empty">
                <p>이 영상엔 모먼트가 없어요</p>
                <span className="on-this-day-moment-empty-sub">{currentVideo.id === item.videoId ? '↑ 영상 보러가기' : ''}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
