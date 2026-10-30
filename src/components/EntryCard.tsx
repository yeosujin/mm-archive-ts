import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { CalendarEntry } from '../lib/calendarDays';

const ENTRY_BADGE: Record<Exclude<CalendarEntry['kind'], 'video'>, string> = {
  moment: '모먼트',
  photo: '사진',
  post: '포스트',
  episode: '에피소드',
};

/** 에피소드 카드 표지: 에피소드 페이지 말풍선을 줄인 캡처 모양. DM은 보낸 멤버 색, 댓글·리스닝 파티는 회색 */
function ChatCapture({ entry }: { entry: Extract<CalendarEntry, { kind: 'episode' }> }) {
  return (
    <span className={`cal-chat cal-chat-${entry.tone}`} aria-hidden>
      <span className="cal-chat-who"><span className="cal-chat-av" />{entry.sender}</span>
      {entry.lines.map((line, i) => (line.type === 'image'
        ? <img key={i} className="cal-chat-img" src={line.content} alt="" loading="lazy" decoding="async" />
        : <span key={i} className="cal-chat-bub">{line.content}</span>))}
    </span>
  );
}

interface Props {
  entry: Exclude<CalendarEntry, { kind: 'video' }>;
  onOpen: () => void;
  /** 제목 대신 보일 내용 (검색어 강조 등) */
  title?: ReactNode;
  /** 제목 아래 줄 (검색: 종류 · 날짜) */
  meta?: ReactNode;
  /** 표지 위 종류 배지. 아래 줄에 종류를 적으면 끈다 */
  badge?: boolean;
}

/** 영상이 아닌 기록 카드. 영상 카드(VideoCard)와 같은 모양. 누르면 그 자리에 상세를 띄운다 (캘린더·검색) */
export default function EntryCard({ entry, onOpen, title, meta, badge = true }: Props) {
  const cover = entry.kind === 'episode' ? null : entry.cover;
  const label = entry.kind === 'photo' && entry.count > 1 ? `사진 ${entry.count}장` : ENTRY_BADGE[entry.kind];
  return (
    <Link
      to={entry.path}
      className="mc-card"
      onClick={(e) => {
        // 새 탭·새 창으로 여는 클릭은 링크(각 페이지) 그대로
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onOpen();
      }}
    >
      <span className="mc-card-thumb">
        {entry.kind === 'episode'
          ? <ChatCapture entry={entry} />
          : cover
            ? <img className="vcover" src={cover} alt="" loading="lazy" decoding="async" />
            : <span className="cal-card-blank">{ENTRY_BADGE[entry.kind]}</span>}
        {/* 에피소드는 캡처 모양이 곧 표시라 배지를 달지 않는다(마지막 말풍선을 가린다) */}
        {cover && badge && <span className="mc-badge">{label}</span>}
      </span>
      <span className="mc-card-title">{title ?? entry.title}</span>
      {meta && <span className="mc-card-date">{meta}</span>}
    </Link>
  );
}
