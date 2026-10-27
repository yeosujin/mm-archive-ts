import { isR2Url } from '../dailyTweet/normalize';

export type Encoder = 'videotoolbox' | 'libx264';

export const TRANSCODED_PREFIX = 'videos/t/';

/** 원본 키 → 변환본 키. 원본은 덮어쓰지 않는다(CDN 캐시 무효화가 필요 없도록) */
export function transcodedKey(originalKey: string): string {
  const base = originalKey.slice(originalKey.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '');
  return `${TRANSCODED_PREFIX}${base}.mp4`;
}

export function thumbKey(videoKey: string): string {
  return videoKey.replace(/\.[^.]+$/, '_thumb.jpg');
}

/** 긴 변 1280 이하, 30fps 이하, 약 2.5Mbps, AAC 128k, faststart */
export function buildTranscodeArgs(input: string, output: string, encoder: Encoder): string[] {
  const video = encoder === 'videotoolbox'
    ? ['-c:v', 'h264_videotoolbox', '-b:v', '2500k', '-maxrate', '2500k', '-bufsize', '5000k', '-profile:v', 'high', '-allow_sw', '1']
    : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-maxrate', '2500k', '-bufsize', '5000k', '-profile:v', 'high'];
  return [
    '-y', '-i', input,
    '-map', '0:v:0', '-map', '0:a:0?',
    '-vf', "scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
    '-fpsmax', '30',
    ...video,
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-map_metadata', '-1',
    '-movflags', '+faststart',
    output,
  ];
}

/** seek 기본 0.5초. 0.5초보다 짧은 클립은 '0'으로 다시 시도한다 */
export function buildThumbArgs(input: string, output: string, seek = '0.5'): string[] {
  return ['-y', '-ss', seek, '-i', input, '-frames:v', '1', '-vf', "scale=w='min(640,iw)':h=-2", '-q:v', '3', output];
}

/** mov는 컨테이너 통일을 위해 항상 변환본. mp4는 변환본이 더 작을 때만 */
export function decideResult(originalKey: string, originalSize: number, outputSize: number): 'use-transcoded' | 'keep-original' {
  if (!originalKey.toLowerCase().endsWith('.mp4')) return 'use-transcoded';
  return outputSize < originalSize ? 'use-transcoded' : 'keep-original';
}

interface MediaLike {
  type: 'image' | 'video';
  url: string;
  original_url?: string;
}

export function pendingPostVideoIndexes(media: MediaLike[] | null | undefined, r2PublicUrl: string): number[] {
  return (media ?? []).flatMap((m, i) =>
    m.type === 'video' && !m.original_url && isR2Url(m.url, r2PublicUrl) ? [i] : []
  );
}
