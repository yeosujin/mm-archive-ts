import { useEntrySplash } from '../lib/entrySplash';

/** 입장 로고 화면. `.app` 안에 두어 다크/라이트 배경색(--bg-primary)을 그대로 쓴다 */
export default function EntrySplash() {
  const phase = useEntrySplash();
  if (phase === 'off') return null;
  return (
    <div className={phase === 'leaving' ? 'splash is-out' : 'splash'} aria-hidden>
      <span className="splash-mark">mmemory</span>
    </div>
  );
}
