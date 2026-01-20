interface Props {
  videoUrl: string;
  className?: string;
}

export default function VideoPlayer({ videoUrl, className = '' }: Props) {
  return (
    <div className={`video-player ${className}`}>
      <video
        controls
        controlsList="nodownload"
        preload="metadata"
        style={{
          width: '100%',
          maxWidth: '800px',
          borderRadius: '8px',
          backgroundColor: '#000',
        }}
      >
        <source src={videoUrl} type="video/mp4" />
        <source src={videoUrl} type="video/webm" />
        <source src={videoUrl} type="video/ogg" />
        브라우저가 비디오 재생을 지원하지 않습니다.
      </video>
    </div>
  );
}
