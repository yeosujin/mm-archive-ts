import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

export default function ErrorFallback() {
  const error = useRouteError();

  // 배포 후 청크 로드 실패 감지
  const isChunkError =
    error instanceof Error &&
    (error.message.includes('Failed to fetch dynamically imported module') ||
     error.message.includes('Importing a module script failed') ||
     error.name === 'ChunkLoadError');

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="error-fallback">
      <div className="error-fallback-content">
        {isChunkError ? (
          <>
            <p className="error-fallback-icon">✨</p>
            <h2>새 버전이 배포되었어요</h2>
            <p>페이지를 새로고침하면 최신 버전으로 이용할 수 있어요.</p>
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
        <button className="error-fallback-btn" onClick={handleReload}>
          새로고침
        </button>
      </div>
    </div>
  );
}
