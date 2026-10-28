/**
 * 영상 저장. 휴대폰은 공유 시트(사진 앱에 저장 가능), PC는 파일 다운로드, 실패하면 새 탭으로 연다.
 * 사용자가 공유 시트를 닫으면(AbortError) 조용히 끝낸다.
 */
export async function shareOrDownloadVideo(videoUrl: string): Promise<void> {
  try {
    const res = await fetch(videoUrl);
    const blob = await res.blob();
    const fileName = videoUrl.split('/').pop()?.split('?')[0] || 'video.mp4';
    const file = new File([blob], fileName, { type: blob.type });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return;
    window.open(videoUrl, '_blank');
  }
}
