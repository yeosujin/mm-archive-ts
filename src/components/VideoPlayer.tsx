import { memo } from 'react';

interface Props {
  videoUrl: string;
  className?: string;
}

const VideoPlayer = memo(({ videoUrl, className = '' }: Props) => {
  return (
    <div className={`video-player ${className}`}>
      <video
        controls
        playsInline
        webkit-playsinline="true"
        controlsList="nodownload"
        preload="auto"
        style={{
          width: '100%',
          maxWidth: '800px',
          borderRadius: '8px',
          backgroundColor: '#000',
        }}
      >
        <source src={`${videoUrl}#t=1.0`} type="video/mp4" />
        <source src={`${videoUrl}#t=1.0`} type="video/webm" />
        <source src={`${videoUrl}#t=1.0`} type="video/ogg" />
        브라우저가 비디오 재생을 지원하지 않습니다.
      </video>
    </div>
  );
});

export default VideoPlayer;
