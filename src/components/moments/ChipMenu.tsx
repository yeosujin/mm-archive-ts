import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const EDGE = 8;

interface ChipMenuProps<T extends string | number> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** 버튼 안 내용 */
  children: ReactNode;
  /** 목록의 접근성 이름 */
  label: string;
  /** 버튼 내용 대신 읽힐 이름 (없으면 버튼 내용) */
  buttonLabel?: string;
  className?: string;
}

/**
 * 칩 모양 버튼 + 선택 메뉴.
 * 칩이 가로 스크롤 영역(overflow) 안에 있어도 잘리지 않게 목록을 `position: fixed`로 띄우고,
 * 버튼 위치에서 좌표를 잡는다. 스크롤·리사이즈하면 위치가 어긋나므로 닫는다.
 * iOS Safari는 스크롤 영역 안의 fixed 요소도 잘라 버리므로, 목록은 `.app`으로 포털한다
 * (body가 아니라 `.app` — 다크 테마 변수가 `.app.dark`에 있다).
 */
export default function ChipMenu<T extends string | number>({
  options,
  value,
  onChange,
  children,
  label,
  buttonLabel,
  className = '',
}: ChipMenuProps<T>) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const open = portalTarget !== null;
  const setOpen = (next: boolean) =>
    setPortalTarget(next ? (buttonRef.current?.closest('.app') ?? document.body) : null);

  // 열릴 때 버튼 아래에 두고, 화면 양 끝을 넘지 않게 좌우를 맞춘다
  useLayoutEffect(() => {
    const button = buttonRef.current;
    const list = listRef.current;
    if (!open || !button || !list) return;
    const rect = button.getBoundingClientRect();
    const maxLeft = window.innerWidth - list.offsetWidth - EDGE;
    list.style.top = `${rect.bottom + 4}px`;
    list.style.left = `${Math.max(EDGE, Math.min(rect.left, maxLeft))}px`;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const inside = (target: EventTarget | null) =>
      target instanceof Node && (buttonRef.current?.contains(target) || listRef.current?.contains(target));
    const onPointerDown = (e: PointerEvent) => {
      if (!inside(e.target)) close();
    };
    const onScroll = (e: Event) => {
      if (!inside(e.target)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      close();
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    // capture: 칩 줄 같은 안쪽 스크롤도 잡는다
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`mc-chip ${className}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={buttonLabel}
        onClick={() => setOpen(!open)}
      >
        {children} <span aria-hidden="true">▾</span>
      </button>
      {portalTarget && createPortal(
        <ul ref={listRef} className="mc-menu-list" aria-label={label}>
          {options.map(o => (
            <li key={o.value}>
              <button
                type="button"
                aria-current={o.value === value ? 'true' : undefined}
                className={`mc-menu-opt${o.value === value ? ' active' : ''}`}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
                {o.value === value && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
        </ul>,
        portalTarget,
      )}
    </>
  );
}
