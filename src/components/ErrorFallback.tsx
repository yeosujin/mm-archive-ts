import { useEffect } from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

// 같은 세션에서 자동 복구를 한 번만 시도하기 위한 플래그 (무한 새로고침 방지)
const RECOVERY_FLAG = 'mm:chunk-recovery';

/**
 * 배포 후 청크 로드 실패인지 판정한다.
 *
 * 브라우저마다 문구가 달라서 크롬 문구만 보면 iOS 사파리에서 놓친다.
 * 사파리는 모듈 로드가 실패해도 그냥 `TypeError: Load failed`를 던져서,
 * 2026-09-18 장애 때 "새 버전이 배포되었어요" 대신 일반 에러 화면이 떴다.
 */
function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'ChunkLoadError') return true;
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|load failed|failed to fetch|unable to preload/i
    .test(error.message);
}

/**
 * 서비스워커와 캐시를 모두 버리고 새로 받는다.
 * 낡은 셸이 사라진 청크를 계속 요청하는 상태는 단순 새로고침으로는 안 풀린다.
 */
async function hardReload(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in globalThis) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch {
    // 캐시 정리에 실패해도 새로고침은 시도한다
  }
  globalThis.location.reload();
}

export default function ErrorFallback() {
  const error = useRouteError();
  const isChunkError = isChunkLoadError(error);

  // 청크 로드 실패는 사용자가 할 수 있는 게 없으므로 한 번은 자동으로 복구한다.
  useEffect(() => {
    if (!isChunkError) return;
    let alreadyTried = false;
    try {
      alreadyTried = sessionStorage.getItem(RECOVERY_FLAG) === '1';
      sessionStorage.setItem(RECOVERY_FLAG, '1');
    } catch {
      // 프라이빗 모드 등에서 sessionStorage가 막히면 자동 복구를 건너뛴다
      return;
    }
    if (!alreadyTried) hardReload();
  }, [isChunkError]);

  return (
    <div className="error-fallback">
      <div className="error-fallback-content">
        {isChunkError ? (
          <>
            <p className="error-fallback-icon">✨</p>
            <h2>새 버전이 배포되었어요</h2>
            <p>최신 버전을 불러오는 중이에요. 잠시 후에도 이 화면이면 아래 버튼을 눌러주세요.</p>
          </>
        ) : isRouteErrorResponse(error) && error.status === 404 ? (
          <>
            <p className="error-fallback-icon">🔍</p>
            <h2>페이지를 찾을 수 없어요</h2>
            <p>주소를 다시 확인해주세요.</p>
          </>
        ) : (
          <>
            <p className="error-fallback-icon">⚠️</p>
            <h2>문제가 발생했어요</h2>
            <p>새로고침하면 대부분 해결돼요.</p>
          </>
        )}
        <button className="error-fallback-btn" onClick={() => void hardReload()}>
          새로고침
        </button>
      </div>
    </div>
  );
}
