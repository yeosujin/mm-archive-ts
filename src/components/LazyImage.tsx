import { memo, useState, type ImgHTMLAttributes } from 'react';

interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
}

const LazyImage = memo(({ src, alt, className = '', wrapperClassName = '', wrapperStyle, ...rest }: Props) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <span className={`lazy-image ${loaded ? 'is-loaded' : ''} ${errored ? 'is-errored' : ''} ${wrapperClassName}`} style={wrapperStyle}>
      <img
        {...rest}
        src={src}
        alt={alt}
        loading={rest.loading ?? 'lazy'}
        decoding={rest.decoding ?? 'async'}
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
