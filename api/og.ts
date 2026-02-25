import type { VercelRequest, VercelResponse } from '@vercel/node';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.id as string | undefined;

  let questionText = 'mmemory Q&A';

  if (id && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/asks?id=eq.${id}&select=content&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      const rows = await response.json();
      if (rows?.[0]?.content) {
        questionText = rows[0].content;
      }
    } catch {
      // fallback to default text
    }
  }

  const fontData = await fetch(
    'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/Pretendard-SemiBold.otf'
  ).then(r => r.arrayBuffer());

  const displayText = questionText.length > 150
    ? questionText.slice(0, 150) + '...'
    : questionText;

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
          padding: '60px',
          fontFamily: 'Pretendard',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '40px',
              },
              children: [
                {
                  type: 'span',
                  props: {
                    style: { fontSize: '24px', color: '#70a4f9', fontWeight: 700 },
                    children: 'mmemory',
                  },
                },
                {
                  type: 'span',
                  props: {
                    style: { fontSize: '18px', color: '#6a6a7a' },
                    children: 'Q&A',
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                justifyContent: 'center',
              },
              children: [
                {
                  type: 'span',
                  props: {
                    style: {
                      fontSize: '28px',
                      color: '#70a4f9',
                      fontWeight: 700,
                      marginBottom: '20px',
                    },
                    children: 'Q.',
                  },
                },
                {
                  type: 'p',
                  props: {
                    style: {
                      fontSize: displayText.length > 100 ? '32px' : '40px',
                      color: '#f0f0f5',
                      lineHeight: 1.5,
                      margin: 0,
                    },
                    children: displayText,
                  },
                },
              ],
            },
          },
        ],
      },
    } as any,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Pretendard',
          data: Buffer.from(fontData),
          style: 'normal' as const,
          weight: 600,
        },
      ],
    }
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=86400');
  return res.status(200).send(pngBuffer);
}
