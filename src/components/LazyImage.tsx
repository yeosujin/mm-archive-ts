import { memo, useCallback, useMemo, useState, type ImgHTMLAttributes } from 'react';
import { thumbHashToUrl } from '../lib/thumbHash';

interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
  priority?: boolean;
  thumbHash?: string | null;
}

const LazyImage = memo(({
  src,
  alt,
  className = '',
  wrapperClassName = '',
  wrapperStyle,
  priority = false,
  thumbHash,
  ...rest
}: Props) => {
  const [loaded, setLoaded] = useState(priority);
  const [errored, setErrored] = useState(false);

  const placeholderUrl = useMemo(() => thumbHashToUrl(thumbHash), [thumbHash]);

  const handleImgRef = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  const wrapperClasses = [
    'lazy-image',
    loaded ? 'is-loaded' : '',
    errored ? 'is-errored' : '',
    priority ? 'is-priority' : '',
    placeholderUrl ? 'has-thumbhash' : '',
    wrapperClassName,
  ].filter(Boolean).join(' ');

  const mergedWrapperStyle: React.CSSProperties = {
    ...wrapperStyle,
    ...(placeholderUrl ? {
      backgroundImage: `url(${placeholderUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    } : null),
  };

  return (
    <span className={wrapperClasses} style={mergedWrapperStyle}>
      <img
        {...rest}
        ref={handleImgRef}
        src={src}
        alt={alt}
        loading={priority ? 'eager' : (rest.loading ?? 'lazy')}
        decoding={rest.decoding ?? 'async'}
        fetchPriority={priority ? 'high' : rest.fetchPriority}
        className={`lazy-image-img ${className}`}
        onLoad={(e) => {
          setLoaded(true);
          rest.onLoad?.(e);
        }}
        onError={(e) => {
          setErrored(true);
          rest.onError?.(e);
        }}
      />
    </span>
  );
});

export default LazyImage;
