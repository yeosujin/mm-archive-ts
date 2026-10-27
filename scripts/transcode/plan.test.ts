import { describe, it, expect } from 'vitest';
import {
  transcodedKey,
  thumbKey,
  buildTranscodeArgs,
  buildThumbArgs,
  decideResult,
  pendingPostVideoIndexes,
} from './plan';

const R2 = 'https://cdn.mmemory.cloud';

describe('transcodedKey', () => {
  it('videos/ 아래 원본을 videos/t/ 아래 mp4로', () => {
    expect(transcodedKey('videos/1700-ab12-clip.MOV')).toBe('videos/t/1700-ab12-clip.mp4');
  });
  it('mp4도 같은 규칙', () => {
    expect(transcodedKey('videos/1700-ab12-clip.mp4')).toBe('videos/t/1700-ab12-clip.mp4');
  });
  it('하위 폴더가 있어도 basename만 쓴다', () => {
    expect(transcodedKey('videos/x/y/a.b.mov')).toBe('videos/t/a.b.mp4');
  });
});

describe('thumbKey', () => {
  it('변환본 키 옆에 _thumb.jpg', () => {
    expect(thumbKey('videos/t/1700-ab12-clip.mp4')).toBe('videos/t/1700-ab12-clip_thumb.jpg');
  });
});

describe('buildTranscodeArgs', () => {
  it('공통 규격: 1280 상한, 30fps 상한, AAC 128k, faststart', () => {
    const args = buildTranscodeArgs('in.mov', 'out.mp4', 'libx264');
    const s = args.join(' ');
    expect(args[args.length - 1]).toBe('out.mp4');
    expect(s).toContain('-i in.mov');
    expect(s).toContain("scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2");
    expect(s).toContain('-fpsmax 30');
    expect(s).toContain('-c:a aac -b:a 128k');
    expect(s).toContain('-movflags +faststart');
    expect(s).toContain('-pix_fmt yuv420p');
    expect(s).toContain('-maxrate 2500k');
  });
  it('libx264는 crf, videotoolbox는 비트레이트 지정', () => {
    expect(buildTranscodeArgs('i', 'o', 'libx264').join(' ')).toContain('-c:v libx264 -preset veryfast -crf 23');
    expect(buildTranscodeArgs('i', 'o', 'videotoolbox').join(' ')).toContain('-c:v h264_videotoolbox -b:v 2500k');
  });
});

describe('buildThumbArgs', () => {
  it('0.5초 지점 1프레임, 폭 640 상한 jpg', () => {
    expect(buildThumbArgs('in.mp4', 'out.jpg')).toEqual([
      '-y', '-ss', '0.5', '-i', 'in.mp4', '-frames:v', '1',
      '-vf', "scale=w='min(640,iw)':h=-2", '-q:v', '3', 'out.jpg',
    ]);
  });
  it('seek를 지정하면 그 지점을 쓴다 (짧은 클립 폴백)', () => {
    expect(buildThumbArgs('i', 'o', '0').slice(0, 3)).toEqual(['-y', '-ss', '0']);
  });
});

describe('decideResult', () => {
  it('mov 원본은 크기와 상관없이 변환본을 쓴다 (컨테이너 통일)', () => {
    expect(decideResult('videos/a.mov', 1000, 2000)).toBe('use-transcoded');
  });
  it('mp4 원본보다 변환본이 작으면 변환본', () => {
    expect(decideResult('videos/a.mp4', 2000, 1000)).toBe('use-transcoded');
  });
  it('mp4 원본보다 변환본이 크거나 같으면 원본 유지', () => {
    expect(decideResult('videos/a.mp4', 1000, 1000)).toBe('keep-original');
  });
});

describe('pendingPostVideoIndexes', () => {
  it('R2 영상 중 original_url이 없는 것만', () => {
    const media = [
      { type: 'image' as const, url: `${R2}/videos/a.jpg` },
      { type: 'video' as const, url: `${R2}/videos/b.mp4` },
      { type: 'video' as const, url: `${R2}/videos/t/c.mp4`, original_url: `${R2}/videos/c.mov` },
      { type: 'video' as const, url: 'https://video.twimg.com/x.mp4' },
    ];
    expect(pendingPostVideoIndexes(media, R2)).toEqual([1]);
  });
  it('media가 없으면 빈 배열', () => {
    expect(pendingPostVideoIndexes(undefined, R2)).toEqual([]);
  });
});
