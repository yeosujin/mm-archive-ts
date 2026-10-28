import { CloseIcon, SearchIcon } from './Icons';

type SortOrder = 'newest' | 'oldest';

/** 칩 줄의 정렬 토글 — 누를 때마다 최신순 ↔ 오래된순 */
export function SortChip({ value, onChange }: { value: SortOrder; onChange: (value: SortOrder) => void }) {
  const newest = value === 'newest';
  return (
    <button type="button" className="mc-chip mc-sort" onClick={() => onChange(newest ? 'oldest' : 'newest')}>
      {newest ? '최신순 ↓' : '오래된순 ↑'}
    </button>
  );
}

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** 있으면 접을 수 있는 검색창 — 열릴 때 포커스, ✕로 비우고 닫기, 빈 채로 포커스가 빠지면 닫기 */
  onClose?: () => void;
}

/** 칩 줄 안의 얇은 검색창 */
export function SearchField({ value, onChange, placeholder, onClose }: SearchFieldProps) {
  return (
    <div className="mc-search">
      <SearchIcon size={14} />
      <input
        type="text"
        className="mc-search-input"
        aria-label="검색"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={!!onClose}
        onBlur={() => {
          if (onClose && !value) onClose();
        }}
      />
      {onClose && (
        <button
          type="button"
          className="mc-icon-btn"
          aria-label="검색 닫기"
          onClick={() => {
            onChange('');
            onClose();
          }}
        >
          <CloseIcon size={14} />
        </button>
      )}
    </div>
  );
}
