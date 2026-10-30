/** 두 멤버 색 점이 서로 돌며 가까워졌다 멀어지는 로딩 표시 */
export default function DuoLoader({ label = '불러오는 중' }: { label?: string }) {
  return (
    <span className="duo-loader" role="status" aria-label={label}>
      <i />
      <i />
    </span>
  );
}
