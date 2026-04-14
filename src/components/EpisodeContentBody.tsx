import { Link } from 'react-router-dom';
import type { Episode, Video, Moment, Post, MemberSettings } from '../lib/database';
import { ArrowRightIcon } from './Icons';
import {
  getMemberName,
  getLinkedContentTitle,
  getContentTypeIcon,
  getLinkedContentPath,
  getTargetMemberName,
  formatTime,
} from '../lib/episodeHelpers';

type Props = {
  episode: Episode;
  videos: Video[];
  moments: Moment[];
  posts: Post[];
  memberSettings: MemberSettings;
};

// Episodes.tsx에서 추출한 DM/Comment/Listening Party 본문 렌더링
// 기존 JSX/클래스명 100% 그대로 유지 (회귀 없음)
export default function EpisodeContentBody({ episode, videos, moments, posts, memberSettings }: Props) {
  const senderName = getMemberName(episode.sender, memberSettings);
  const isComment = episode.episode_type === 'comment';
  const isListeningParty = episode.episode_type === 'listening_party';
  const bubbleClass = episode.sender === 'member2' ? 'dm-bubble-right' : 'dm-bubble-left';

  return (
    <div className="dm-messages">
      {/* 리스닝파티 타입 */}
      {isListeningParty && (
        <div className="lp-content">
          {episode.messages?.map((msg, idx) => (
            <div key={`${msg.time || ''}-${msg.sender_name || ''}-${idx}`} className="lp-message">
              <span className="lp-message-name">{msg.sender_name || '?'}</span>
              {msg.time && (
                <span className="lp-message-time">{formatTime(msg.time)}</span>
              )}
              <p className="lp-message-text">{msg.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* 댓글 타입 */}
      {isComment && (
        <div className="comment-content">
          {episode.linked_content_id && (
            <div className="comment-context">
              <span className="comment-context-icon">
                {getContentTypeIcon(episode.linked_content_type)}
              </span>
              <span className="comment-context-text">
                {getTargetMemberName(episode.sender, memberSettings)}의 "{getLinkedContentTitle(episode, videos, moments, posts)}"
              </span>
              {getLinkedContentPath(episode) && (
                <Link to={getLinkedContentPath(episode)!} className="comment-context-link">
                  <ArrowRightIcon size={14} />
                </Link>
              )}
            </div>
          )}
          {(episode.messages && episode.messages.length > 0)
            ? episode.messages.map((msg, idx) => (
              <div key={`${msg.time || ''}-${msg.content.slice(0, 20)}-${idx}`} className="comment-bubble">
                <div className="comment-bubble-header">
                  <span className="comment-bubble-name">{senderName}</span>
                  {msg.time && (
                    <span className="comment-bubble-time">{formatTime(msg.time)}</span>
                  )}
                </div>
                <p className="comment-bubble-text">{msg.content}</p>
              </div>
            ))
            : (
              <div className="comment-bubble">
                <div className="comment-bubble-header">
                  <span className="comment-bubble-name">{senderName}</span>
                </div>
                <p className="comment-bubble-text">{episode.comment_text}</p>
              </div>
            )
          }
        </div>
      )}

      {/* DM 타입 */}
      {!isComment && !isListeningParty && episode.messages?.map((msg, idx) => {
        const prevMsg = episode.messages?.[idx - 1];
        const nextMsg = episode.messages?.[idx + 1];

        const isSameGroupAsPrev = prevMsg && prevMsg.time === msg.time;
        const isSameGroupAsNext = nextMsg && nextMsg.time === msg.time;

        const isFirstInGroup = !isSameGroupAsPrev;
        const isLastInGroup = !isSameGroupAsNext;

        return (
          <div
            key={`${msg.time || ''}-${msg.type}-${idx}`}
            className="dm-row dm-row-left"
          >
            <div className="dm-bubble-row">
              <div
                className={`dm-bubble ${bubbleClass} ${!isFirstInGroup ? 'dm-bubble-grouped' : ''} ${isLastInGroup ? 'dm-bubble-last' : ''} ${msg.type === 'image' ? 'dm-bubble-image' : ''}`}
              >
                {msg.type === 'text' && (
                  <p className="dm-text">{msg.content}</p>
                )}
                {msg.type === 'image' && (
                  <div className="dm-image">
                    <img src={msg.content} alt="" loading="lazy" />
                  </div>
                )}
              </div>
              {isLastInGroup && msg.time && (
                <span className="dm-time">{msg.time}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
