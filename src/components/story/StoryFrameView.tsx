import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import type { Episode, MemberSettings, Post } from '../../lib/database/types';
import type { StoryFrame } from '../../lib/onThisDayStory';
import { EPISODE_LABEL, frameCaption, postBody } from '../../lib/onThisDayStory';
import { detectPlatformName, getPlatformName } from '../../lib/platformUtils';
import VideoCover from '../moments/VideoCover';

/**
 * 프레임 미디어가 어디까지 준비됐나. poster: 썸네일(흐린 배경·영상 포스터)이 떴다,
 * full: 영상 첫 장면이나 원본 사진이 떴다(사진은 실패도 여기), error: 영상을 못 연다
 */
export type FrameReady = 'poster' | 'full' | 'error';

interface Props {
  frame: StoryFrame;
  memberSettings: MemberSettings | null;
  /** 지금 보고 있는 프레임. 아니면(다음 프레임 미리 준비·앞 프레임 남겨 두기) 재생·진행 연결 없이 음소거로 둔다 */
  active: boolean;
  /** 영상 프레임(모먼트·영상 포스트)의 video. 재생·진행은 뷰어가 맡는다 */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** 에피소드 채팅 스크롤 영역. 진행에 맞춰 뷰어가 내린다 */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onVideoEnded: () => void;
  onVideoError: () => void;
  onVideoWaiting: () => void;
  onVideoPlaying: () => void;
  /** 미디어 준비 단계가 올라갈 때마다. 프레임이 내려가면 null */
  onReady: (key: string, ready: FrameReady | null) => void;
  onMore: () => void;
}

/** 원문 칩 문구. 플랫폼을 모르면 그냥 "원문 보기" */
function sourceLabel(post: Post): string {
  const name = post.platform === 'other' ? detectPlatformName(post.url) : getPlatformName(post.platform);
  return name ? `${name} 에서 보기 ↗` : '원문 보기 ↗';
}

/** 흐린 배경 (썸네일). 뜨면 onLoad — 원본·영상보다 먼저 떠 검은 화면 대신 보인다 */
function Backdrop({ src, onLoad }: { src?: string; onLoad?: () => void }) {
  return src ? <img className="st-bg" src={src} alt="" draggable={false} onLoad={onLoad} /> : null;
}

/** 원본 사진. 흐린 배경 위로 다 받은 뒤 살짝 페이드인 */
function FadeImage({ src, onDone }: { src: string; onDone: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const done = (ok: boolean) => { setLoaded(ok); onDone(); };
  return (
    <img
      className={loaded ? 'st-media st-fade is-on' : 'st-media st-fade'}
      src={src}
      alt=""
      onLoad={() => done(true)}
      onError={() => done(false)}
    />
  );
}

// 본문 말줄임 + 더보기 (말줄임이 실제로 생겼을 때만)
function ClampText({ text, onMore }: { text: string; onMore: () => void }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [clamped, setClamped] = useState(false);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  if (!text) return null;
  return (
    <>
      <p ref={textRef} className="st-clamp">{text}</p>
      {clamped && <button type="button" className="st-more" onClick={onMore}>더보기</button>}
    </>
  );
}

const SourceChip = ({ post }: { post: Post }) => (
  <a className="st-src" href={post.url} target="_blank" rel="noopener noreferrer">{sourceLabel(post)}</a>
);

/**
 * 모든 프레임 아래: 제목 + 날짜. 미디어 있는 포스트는 한 덩어리로 원문 칩 · 제목 · 날짜 · 본문(제목 줄 뺀 것) · 더보기.
 * 글자는 탭이 그대로 지나가 다음 장으로 넘어가고, 칩·더보기(a·button)만 제스처에서 빠진다
 */
function BottomCaption({ frame, onMore }: { frame: StoryFrame; onMore: () => void }) {
  const { title, date } = frameCaption(frame);
  const post = frame.kind === 'post' && frame.media ? frame.post : null;
  // 모먼트는 오른쪽 아래 저장 버튼 자리를 비운다
  return (
    <div className={frame.kind === 'moment' ? 'st-cap has-side' : 'st-cap'}>
      {post && <SourceChip post={post} />}
      {title && <p className="st-cap-title">{title}</p>}
      {date && <p className="st-cap-date">{date}</p>}
      {post && <ClampText text={postBody(post)} onMore={onMore} />}
    </div>
  );
}

function EpisodeChat({ episode, memberSettings, scrollRef }: { episode: Episode; memberSettings: MemberSettings | null; scrollRef?: Props['scrollRef'] }) {
  const name = memberSettings
    ? (episode.sender === 'member2' ? memberSettings.member2_name : memberSettings.member1_name)
    : '';
  const isParty = episode.episode_type === 'listening_party';
  const messages = episode.messages?.length
    ? episode.messages
    : episode.comment_text ? [{ type: 'text' as const, content: episode.comment_text, time: '' }] : [];

  return (
    <div className="st-chat" ref={scrollRef}>
      <div className="st-chat-who">
        <span className="st-chat-av" aria-hidden />
        <div>
          {name && <b>{name}</b>}
          <span className="st-chat-meta">{EPISODE_LABEL[episode.episode_type]}{episode.title ? ` · ${episode.title}` : ''}</span>
        </div>
      </div>
      {messages.map((msg, i) => (
        <div key={i} className="st-msg">
          {isParty && msg.sender_name && <span className="st-msg-name">{msg.sender_name}</span>}
          {msg.type === 'image'
            ? <img className="st-msg-img" src={msg.content} alt="" />
            : <span className="st-bub">{msg.content}</span>}
        </div>
      ))}
    </div>
  );
}

/** 프레임 본문 (미디어·카드·채팅) */
function FrameBody({
  frame, memberSettings, active, videoRef, scrollRef, onVideoEnded, onVideoError, onVideoWaiting, onVideoPlaying, onReady, onMore,
}: Props) {
  const report = (ready: FrameReady) => () => onReady(frame.key, ready);
  const onPoster = report('poster');
  const onFull = report('full');
  // 포스터(썸네일)를 먼저 보이고 받는 동안 그대로. 미리 준비 중일 땐 음소거로 첫 장면까지 받아 둔다
  const video = (src: string, poster?: string) => (
    <video
      ref={active ? videoRef : undefined}
      className="st-media"
      src={src}
      poster={poster}
      playsInline
      muted={!active}
      preload="auto"
      onLoadedData={onFull}
      onEnded={active ? onVideoEnded : undefined}
      onError={() => { onReady(frame.key, 'error'); if (active) onVideoError(); }}
      onWaiting={active ? onVideoWaiting : undefined}
      onPlaying={active ? onVideoPlaying : undefined}
    />
  );

  switch (frame.kind) {
    case 'moment': {
      const thumb = frame.moment.thumbnail_url;
      return <><Backdrop src={thumb} onLoad={onPoster} />{video(frame.moment.tweet_url, thumb)}</>;
    }
    case 'video': {
      const v = frame.video;
      return (
        <>
          <Backdrop src={v.thumbnail_url} />
          <div className="st-vcard">
            <div className="st-vcard-cover"><VideoCover video={v} moments={[]} eager /></div>
            <a className="st-go" href={v.url} target="_blank" rel="noopener noreferrer">보러가기 →</a>
          </div>
        </>
      );
    }
    case 'photo': {
      const p = frame.photo;
      return (
        <>
          <Backdrop src={p.thumbnail_url || p.image_url} onLoad={onPoster} />
          <FadeImage src={p.image_url} onDone={onFull} />
        </>
      );
    }
    case 'post': {
      const m = frame.media;
      // 본문만 있는 포스트: 본문 전체를 가운데 크게 (제목·날짜는 아래 캡션)
      if (!m) {
        return (
          <div className="st-text">
            <SourceChip post={frame.post} />
            <ClampText text={frame.post.content?.trim() || frame.post.title} onMore={onMore} />
          </div>
        );
      }
      return (
        <>
          <Backdrop src={m.thumbnail || (m.type === 'image' ? m.url : undefined)} onLoad={onPoster} />
          {m.type === 'video' ? video(m.url, m.thumbnail) : <FadeImage src={m.url} onDone={onFull} />}
        </>
      );
    }
    case 'episode':
      return <EpisodeChat episode={frame.episode} memberSettings={memberSettings} scrollRef={active ? scrollRef : undefined} />;
  }
}

/**
 * 스토리 프레임 한 장 + 아래 제목·날짜. 뷰어가 프레임 키로 그려, 미리 준비하던 다음 프레임이
 * 지금 프레임이 될 때 영상·사진 요소를 그대로 이어 쓴다
 */
export default function StoryFrameView(props: Props) {
  const forget = useEffectEvent(() => props.onReady(props.frame.key, null));
  useEffect(() => () => forget(), []);
  return (
    <>
      <FrameBody {...props} />
      <BottomCaption frame={props.frame} onMore={props.onMore} />
    </>
  );
}
