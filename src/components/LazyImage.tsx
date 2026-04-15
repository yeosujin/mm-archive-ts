import { memo, useCallback, useState, type ImgHTMLAttributes } from 'react';

interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
  priority?: boolean;
}

const LazyImage = memo(({
  src,
  alt,
  className = '',
  wrapperClassName = '',
  wrapperStyle,
  priority = false,
  ...rest
}: Props) => {
  const [loaded, setLoaded] = useState(priority);
  const [errored, setErrored] = useState(false);

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
    wrapperClassName,
  ].filter(Boolean).join(' ');

  return (
    <span className={wrapperClasses} style={wrapperStyle}>
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
