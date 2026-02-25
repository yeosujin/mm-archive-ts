import { supabase } from './supabase';

const BUCKET = 'ask-images';

export async function uploadAskImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  console.log('Storage upload:', { bucket: BUCKET, fileName, type: file.type, size: file.size });

  const { data: uploadData, error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error('Upload error detail:', JSON.stringify(error, null, 2));
    console.error('Error props:', { name: error.name, message: error.message, status: (error as any).statusCode });
    throw error;
  }

  console.log('Upload OK:', uploadData);

  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(fileName);

  return data.publicUrl;
}

export async function uploadAskImages(files: File[]): Promise<string[]> {
  const urls = await Promise.all(files.map(file => uploadAskImage(file)));
  return urls;
}

export async function deleteAskImages(imageUrl: string): Promise<void> {
  const urls = parseImageUrls(imageUrl);
  await Promise.all(urls.map(url => deleteAskImage(url)));
}

export function parseImageUrls(imageUrl: string | undefined | null): string[] {
  if (!imageUrl) return [];
  try {
    const parsed = JSON.parse(imageUrl);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // 기존 단일 URL 호환
  }
  return [imageUrl];
}

export async function deleteAskImage(url: string): Promise<void> {
  const parts = url.split(`/${BUCKET}/`);
  if (parts.length < 2) return;

  const filePath = parts[1];
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([filePath]);

  if (error) console.error('Failed to delete ask image:', error);
}
