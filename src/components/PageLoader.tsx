/** 페이지 전환 로딩. 두 멤버 색 점이 서로 돌며 가까워졌다 멀어진다 */
export default function PageLoader() {
  return (
    <div className="page-loader">
      <span className="duo-loader" role="status" aria-label="불러오는 중">
        <i />
        <i />
      </span>
    </div>
  );
}
