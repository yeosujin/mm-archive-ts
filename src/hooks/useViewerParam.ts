import { useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

/**
 * 뷰어 열림 상태를 URL 쿼리 `?<key>=<값>`으로 둔다 — 휴대폰 뒤로가기가 뷰어를 닫게.
 * 이 페이지에서 연 경우엔 닫을 때 뒤로, `?<key>=`로 바로 들어온 경우엔 쿼리만 지운다(replace).
 * "여기서 열었음" 표시는 history state에 키별로 둔다.
 */
export function useViewerParam(key = 'm') {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const value = searchParams.get(key);
  const openedHereFlag = `viewerOpenedHere:${key}`;
  const openedHere = (location.state as Record<string, unknown> | null)?.[openedHereFlag] === true;

  const open = useCallback((next: string) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set(key, next);
      return params;
    }, { state: { [openedHereFlag]: true } });
  }, [key, openedHereFlag, setSearchParams]);

  const close = useCallback(() => {
    if (openedHere) {
      navigate(-1);
      return;
    }
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.delete(key);
      return params;
    }, { replace: true });
  }, [key, openedHere, navigate, setSearchParams]);

  return { value, open, close };
}
