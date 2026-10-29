import { useRef, useState } from 'react';
import { uploadPhotoToR2 } from '../lib/r2Upload';

/** 트윗 1개에 들어가는 미디어 상한(X API)과 같다. 넘겨봐야 게시되지 않는다. */
export const MAX_TWEET_IMAGES = 4;

interface Props {
  urls: string[];
  onChange: (urls: string[]) => void;
  onError?: (message: string) => void;
}

/**
 * X 봇 전용 이미지 첨부 필드 (어드민에서만 쓴다).
 *
 * 여기 올린 이미지는 공개 페이지에 렌더링되지 않고, scripts/dailyTweet 봇이
 * "그 해 오늘" 게시를 만들 때만 읽는다. 순서가 곧 트윗 안 미디어 순서라
 * 좌우 이동 버튼을 둔다.
 */
export default function AdminTweetImages({ urls, onChange, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const remaining = MAX_TWEET_IMAGES - urls.length;

  const handleFiles = async (fileList: FileList) => {
    if (remaining <= 0) {
      onError?.(`이미지는 최대 ${MAX_TWEET_IMAGES}장까지 첨부할 수 있어요.`);
      return;
    }
    const files = [...fileList].slice(0, remaining);
    if (files.length < fileList.length) {
      onError?.(`이미지는 최대 ${MAX_TWEET_IMAGES}장까지라 앞의 ${files.length}장만 올려요.`);
    }

    setUploading(true);
    setProgress(0);
    try {
      const uploaded: string[] = [];
      for (const [i, file] of files.entries()) {
        // 여러 장이면 개별 진행률을 전체 기준으로 환산해 보여준다
        const url = await uploadPhotoToR2(file, p =>
          setProgress(Math.round(((i + p / 100) / files.length) * 100)),
        );
        uploaded.push(url);
      }
      onChange([...urls, ...uploaded]);
    } catch (error) {
      console.error('Tweet image upload error:', error);
      onError?.('첨부 이미지 업로드 중 오류가 발생했어요.');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= urls.length) return;
    const next = [...urls];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="form-group">
      <label>첨부 이미지 (선택)</label>
      <span className="form-hint">
        사이트에는 안 보이고 &quot;그 해 오늘&quot; 자동 트윗에만 올라가요. 최대 {MAX_TWEET_IMAGES}장,
        왼쪽부터 순서대로 실려요. DM 본문에 넣은 사진은 이 뒤에 이어서 올라가고,
        여기가 비어 있으면 그 에피소드는 트윗하지 않아요.
      </span>

      <div className="tweet-image-list">
        {urls.map((url, index) => (
          <div key={url} className="tweet-image-item">
            <img src={url} alt="" className="tweet-image-thumb" loading="lazy" />
            <div className="tweet-image-actions">
              <button
                type="button"
                className="tweet-image-move"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="앞으로"
              >
                ◀
              </button>
              <button
                type="button"
                className="tweet-image-move"
                onClick={() => move(index, 1)}
                disabled={index === urls.length - 1}
                aria-label="뒤로"
              >
                ▶
              </button>
              <button
                type="button"
                className="tweet-image-remove"
                onClick={() => onChange(urls.filter((_, i) => i !== index))}
                aria-label="삭제"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files?.length) handleFiles(e.target.files);
        }}
      />
      <button
        type="button"
        className="photo-select-btn"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || remaining <= 0}
      >
        {uploading
          ? `업로드 중... ${progress}%`
          : remaining <= 0
            ? `이미지 ${MAX_TWEET_IMAGES}장 (가득 참)`
            : `🐦 첨부 이미지 추가 (${urls.length}/${MAX_TWEET_IMAGES})`}
      </button>
      {uploading && (
        <div className="photo-progress-bar">
          <div className="photo-progress" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
