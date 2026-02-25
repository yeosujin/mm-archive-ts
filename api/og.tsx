import { ImageResponse } from '@vercel/og';
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  let questionText = 'mmemory Q&A';

  if (id) {
    const { data } = await supabase
      .from('asks')
      .select('content')
      .eq('id', id)
      .single();

    if (data?.content) {
      questionText = data.content;
    }
  }

  const fontData = await fetch(
    'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/Pretendard-SemiBold.otf'
  ).then(res => res.arrayBuffer());

  const displayText = questionText.length > 150
    ? questionText.slice(0, 150) + '...'
    : questionText;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
          padding: '60px',
          fontFamily: 'Pretendard',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '40px',
          }}
        >
          <span style={{ fontSize: '24px', color: '#70a4f9', fontWeight: 700 }}>
            mmemory
          </span>
          <span style={{ fontSize: '18px', color: '#6a6a7a' }}>Q&A</span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: '28px',
              color: '#70a4f9',
              fontWeight: 700,
              marginBottom: '20px',
            }}
          >
            Q.
          </span>
          <p
            style={{
              fontSize: displayText.length > 100 ? '32px' : '40px',
              color: '#f0f0f5',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {displayText}
          </p>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Pretendard',
          data: fontData,
          style: 'normal' as const,
          weight: 600,
        },
      ],
    }
  );
}
