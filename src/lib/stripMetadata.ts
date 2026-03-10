import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const SITE_URL = 'https://mmemory.cloud';

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();
  await ffmpeg.load();
  return ffmpeg;
}

/**
 * 영상 파일에서 메타데이터를 제거하고 사이트 URL을 comment로 추가
 * FFmpeg WASM 사용 (재인코딩 없이 -c copy)
 */
export async function stripVideoMetadata(file: File): Promise<File> {
  const ff = await getFFmpeg();

  const inputName = 'input' + getExtension(file.name);
  const outputName = 'output' + getExtension(file.name);

  await ff.writeFile(inputName, await fetchFile(file));

  await ff.exec([
    '-i', inputName,
    '-map_metadata', '-1',
    '-metadata', `comment=${SITE_URL}`,
    '-c', 'copy',
    outputName,
  ]);

  const data = await ff.readFile(outputName) as Uint8Array;

  // 임시 파일 정리
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  const blob = new Blob([new Uint8Array(data)], { type: file.type });
  return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx) : '.mp4';
}
