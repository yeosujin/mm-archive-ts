import { useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

const OPENED_HERE = 'momentViewerOpenedHere';

/**
 * 숏폼 뷰어 열림 상태를 URL 쿼리 `?m=<momentId>`로 둔다 — 휴대폰 뒤로가기가 뷰어를 닫게.
 * 이 페이지에서 연 경우엔 닫을 때 뒤로, `?m=`로 바로 들어온 경우엔 쿼리만 지운다(replace).
 */
export function useViewerParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const momentId = searchParams.get('m');
  const openedHere = (location.state as Record<string, unknown> | null)?.[OPENED_HERE] === true;

  const open = useCallback((id: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('m', id);
      return next;
    }, { state: { [OPENED_HERE]: true } });
  }, [setSearchParams]);

  const close = useCallback(() => {
    if (openedHere) {
      navigate(-1);
      return;
    }
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('m');
      return next;
    }, { replace: true });
  }, [openedHere, navigate, setSearchParams]);

  return { momentId, open, close };
}
