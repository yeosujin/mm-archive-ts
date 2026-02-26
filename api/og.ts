import type { VercelRequest, VercelResponse } from '@vercel/node';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// satori virtual DOM node
type VNode = {
  type: string;
  props: {
    style?: Record<string, string | number | undefined>;
    children?: string | null | VNode | (string | null | VNode)[];
    [key: string]: unknown;
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.id as string | undefined;

  let questionText: string | null = null;

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
      // fallback
    }
  }

  const [fontSemiBold, fontRegular] = await Promise.all([
    fetch('https://cdn.jsdelivr.net/gh/sun-typeface/SUIT/fonts/static/woff2/SUIT-SemiBold.woff2').then(r => r.arrayBuffer()),
    fetch('https://cdn.jsdelivr.net/gh/sun-typeface/SUIT/fonts/static/woff2/SUIT-Regular.woff2').then(r => r.arrayBuffer()),
  ]);

  const isAskPage = !questionText;

  let displayText: string | null = null;
  if (questionText && questionText.length > 120) {
    displayText = questionText.slice(0, 120) + '...';
  } else if (questionText) {
    displayText = questionText;
  }

  // 배경 글로우 orbs (넓고 은은하게)
  const glowOrbs: VNode[] = [
    // 좌상단 블루 글로우
    {
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          top: '-250px',
          left: '-300px',
          width: '900px',
          height: '900px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, rgba(56,189,248,0.06) 40%, transparent 70%)',
        },
      },
    },
    // 우하단 퍼플 글로우
    {
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          bottom: '-280px',
          right: '-250px',
          width: '950px',
          height: '950px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.16) 0%, rgba(167,139,250,0.05) 40%, transparent 70%)',
        },
      },
    },
  ];

  const askPageContent: VNode = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        position: 'relative',
      },
      children: [
        // 말풍선 아이콘 (SVG)
        {
          type: 'svg',
          props: {
            width: '560',
            height: '460',
            viewBox: '0 -30 280 270',
            style: {
              filter: 'drop-shadow(0 8px 24px rgba(56,189,248,0.15))',
            },
            children: [
              // 말풍선 몸체 + 꼬리
              {
                type: 'path',
                props: {
                  d: 'M40 0 h200 a40 40 0 0 1 40 40 v100 a40 40 0 0 1 -40 40 h-140 l-30 40 l-10 -40 h-20 a40 40 0 0 1 -40 -40 v-100 a40 40 0 0 1 40 -40z',
                  fill: 'rgba(255,255,255,0.92)',
                },
              },
              // 점 1 (블루)
              {
                type: 'circle',
                props: {
                  cx: '100',
                  cy: '90',
                  r: '14',
                  fill: '#60bcf7',
                },
              },
              // 점 2 (인디고)
              {
                type: 'circle',
                props: {
                  cx: '140',
                  cy: '90',
                  r: '14',
                  fill: '#918cf8',
                },
              },
              // 점 3 (퍼플)
              {
                type: 'circle',
                props: {
                  cx: '180',
                  cy: '90',
                  r: '14',
                  fill: '#b78bfa',
                },
              },
            ],
          },
        },
        // URL
        {
          type: 'div',
          props: {
            style: {
              fontSize: '18px',
              color: '#9ca3af',
              letterSpacing: '0.02em',
            },
            children: 'mmemory.cloud/ask',
          },
        },
      ],
    },
  };

  const questionContent: VNode = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        position: 'relative',
        width: '100%',
        height: '100%',
        padding: '50px 80px',
      },
      children: [
        // Q&A 카드 (고정 크기, 페일 컬러)
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(255,255,255,0.9)',
              borderRadius: '28px',
              padding: '52px 60px',
              width: '1040px',
              height: '470px',
              boxShadow: '0 4px 32px rgba(56,189,248,0.08), 0 1px 8px rgba(0,0,0,0.03)',
            },
            children: [
              // Q. 라벨
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '35px',
                    fontWeight: 600,
                    color: '#818cf8',
                    marginBottom: '20px',
                  },
                  children: 'Q.',
                },
              },
              // 질문 텍스트
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: displayText && displayText.length > 80 ? '40px' : '48px',
                    color: '#1e1b3a',
                    lineHeight: 1.55,
                    fontWeight: 400,
                  },
                  children: displayText,
                },
              },
            ],
          },
        },
        // URL 워터마크
        {
          type: 'div',
          props: {
            style: {
              fontSize: '17px',
              color: '#b4b4c0',
              letterSpacing: '0.02em',
            },
            children: 'mmemory.cloud/ask',
          },
        },
      ],
    },
  };

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #e0f4ff 0%, #ede9fe 50%, #fce7f3 100%)',
          fontFamily: 'SUIT',
          position: 'relative',
          overflow: 'hidden',
        },
        children: [
          ...glowOrbs,
          isAskPage ? askPageContent : questionContent,
        ],
      },
    } as Parameters<typeof satori>[0],
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'SUIT',
          data: Buffer.from(fontSemiBold),
          style: 'normal' as const,
          weight: 600,
        },
        {
          name: 'SUIT',
          data: Buffer.from(fontRegular),
          style: 'normal' as const,
          weight: 400,
        },
      ],
      // Twemoji fallback
      loadAdditionalAsset: async (code, segment) => {
        if (code === 'emoji') {
          const codePoint = segment.codePointAt(0)?.toString(16);
          const res = await fetch(`https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${codePoint}.svg`);
          if (res.ok) {
            return `data:image/svg+xml,${encodeURIComponent(await res.text())}`;
          }
        }
        return '';
      },
    }
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, max-age=3600');
  return res.status(200).send(pngBuffer);
}
