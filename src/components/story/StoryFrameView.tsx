import { useLayoutEffect, useRef, useState } from 'react';
import type { Episode, MemberSettings, Post } from '../../lib/database/types';
import type { StoryFrame } from '../../lib/onThisDayStory';
import { detectPlatformName, getPlatformName } from '../../lib/platformUtils';
import VideoCover from '../moments/VideoCover';

interface Props {
  frame: StoryFrame;
  memberSettings: MemberSettings | null;
  /** 영상 프레임(모먼트·영상 포스트)의 video. 재생·진행은 뷰어가 맡는다 */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** 에피소드 채팅 스크롤 영역. 진행에 맞춰 뷰어가 내린다 */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onVideoEnded: () => void;
  onVideoError: () => void;
  onVideoWaiting: () => void;
  onVideoPlaying: () => void;
  /** 사진 프레임 이미지가 뜨거나 실패했을 때 (스피너 끄기) */
  onImageDone: () => void;
  onMore: () => void;
}

const EPISODE_LABEL: Record<Episode['episode_type'], string> = {
  dm: 'DM',
  comment: '댓글',
  listening_party: '리스닝 파티',
};

/** 원문 칩 문구. 플랫폼을 모르면 그냥 "원문 보기" */
function sourceLabel(post: Post): string {
  const name = post.platform === 'other' ? detectPlatformName(post.url) : getPlatformName(post.platform);
  return name ? `${name} 에서 보기 ↗` : '원문 보기 ↗';
}

function Backdrop({ src }: { src?: string }) {
  return src ? <div className="st-bg" style={{ backgroundImage: `url("${src}")` }} /> : null;
}

// 포스트 하단(미디어 있음) 또는 가운데(본문만) 캡션: 원문 칩 + 본문 말줄임 + 더보기
function PostCaption({ post, center, onMore }: { post: Post; center: boolean; onMore: () => void }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [clamped, setClamped] = useState(false);
  const text = post.content?.trim() || post.title;

  // 말줄임이 실제로 생겼을 때만 더보기
  useLayoutEffect(() => {
    const el = textRef.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  return (
    <div className={center ? 'st-text' : 'st-cap'}>
      <a className="st-src" href={post.url} target="_blank" rel="noopener noreferrer">{sourceLabel(post)}</a>
      {text && <p ref={textRef} className="st-clamp">{text}</p>}
      {clamped && <button type="button" className="st-more" onClick={onMore}>더보기</button>}
    </div>
  );
}

function EpisodeChat({ episode, memberSettings, scrollRef }: { episode: Episode; memberSettings: MemberSettings | null; scrollRef: Props['scrollRef'] }) {
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

/** 스토리 프레임 한 장. 키를 바꿔 새로 그리므로 프레임마다 영상 요소도 새로 만들어진다 */
export default function StoryFrameView({
  frame, memberSettings, videoRef, scrollRef, onVideoEnded, onVideoError, onVideoWaiting, onVideoPlaying, onImageDone, onMore,
}: Props) {
  const video = (src: string, poster?: string) => (
    <video
      ref={videoRef}
      className="st-media"
      src={src}
      poster={poster}
      playsInline
      preload="auto"
      onEnded={onVideoEnded}
      onError={onVideoError}
      onWaiting={onVideoWaiting}
      onPlaying={onVideoPlaying}
    />
  );

  switch (frame.kind) {
    case 'moment': {
      const thumb = frame.moment.thumbnail_url;
      return <><Backdrop src={thumb} />{video(frame.moment.tweet_url, thumb)}</>;
    }
    case 'video': {
      const v = frame.video;
      return (
        <>
          <Backdrop src={v.thumbnail_url} />
          <div className="st-vcard">
            <div className="st-vcard-cover"><VideoCover video={v} moments={[]} eager /></div>
            <p className="st-vcard-title">{v.title}</p>
            <a className="st-go" href={v.url} target="_blank" rel="noopener noreferrer">보러가기 →</a>
          </div>
        </>
      );
    }
    case 'photo': {
      const p = frame.photo;
      return (
        <>
          <Backdrop src={p.thumbnail_url || p.image_url} />
          <img className="st-media" src={p.image_url} alt="" onLoad={onImageDone} onError={onImageDone} />
          <div className="st-cap"><p className="st-cap-title">{frame.title}</p></div>
        </>
      );
    }
    case 'post': {
      const m = frame.media;
      if (!m) return <PostCaption post={frame.post} center onMore={onMore} />;
      return (
        <>
          <Backdrop src={m.thumbnail || (m.type === 'image' ? m.url : undefined)} />
          {m.type === 'video' ? video(m.url, m.thumbnail) : <img className="st-media" src={m.url} alt="" onLoad={onImageDone} onError={onImageDone} />}
          <PostCaption post={frame.post} center={false} onMore={onMore} />
        </>
      );
    }
    case 'episode':
      return <EpisodeChat episode={frame.episode} memberSettings={memberSettings} scrollRef={scrollRef} />;
  }
}
