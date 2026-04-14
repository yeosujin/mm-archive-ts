interface SkeletonProps {
  variant?: 'grid' | 'list' | 'timeline';
  count?: number;
}

export default function Skeleton({ variant = 'list', count = 6 }: SkeletonProps) {
  if (variant === 'grid') {
    return (
      <div className="skeleton-grid" aria-busy="true" aria-label="로딩 중">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-grid-item skeleton-shimmer" />
        ))}
      </div>
    );
  }

  if (variant === 'timeline') {
    return (
      <div className="skeleton-timeline" aria-busy="true" aria-label="로딩 중">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-timeline-row">
            <div className="skeleton-line skeleton-line-date skeleton-shimmer" />
            <div className="skeleton-line skeleton-line-title skeleton-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="skeleton-list" aria-busy="true" aria-label="로딩 중">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-list-item">
          <div className="skeleton-line skeleton-line-title skeleton-shimmer" />
          <div className="skeleton-line skeleton-line-sub skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}
