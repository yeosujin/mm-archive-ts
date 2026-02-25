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
    fetch('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/Pretendard-SemiBold.otf').then(r => r.arrayBuffer()),
    fetch('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/Pretendard-Regular.otf').then(r => r.arrayBuffer()),
  ]);

  const isAskPage = !questionText;

  let displayText: string | null = null;
  if (questionText && questionText.length > 120) {
    displayText = questionText.slice(0, 120) + '...';
  } else if (questionText) {
    displayText = questionText;
  }

  // 배경 글로우 orbs
  const glowOrbs: VNode[] = [
    // 좌상단 블루 글로우
    {
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          top: '-80px',
          left: '-100px',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.35) 0%, transparent 60%)',
        },
      },
    },
    // 우하단 퍼플 글로우
    {
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          bottom: '-100px',
          right: '-80px',
          width: '650px',
          height: '650px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.3) 0%, transparent 60%)',
        },
      },
    },
    // 중앙 소프트 글로우
    {
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(112,164,249,0.12) 0%, transparent 65%)',
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
        gap: '32px',
        position: 'relative',
      },
      children: [
        // mmemory 로고 (홈 타이틀 그라데이션)
        {
          type: 'div',
          props: {
            style: {
              fontSize: '52px',
              fontWeight: 600,
              letterSpacing: '-0.04em',
              background: 'linear-gradient(135deg, #38bdf8 0%, #a78bfa 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            },
            children: 'mmemory',
          },
        },
        // 카드
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.85)',
              borderRadius: '28px',
              padding: '48px 80px',
              gap: '20px',
              boxShadow: '0 8px 40px rgba(56,189,248,0.15), 0 2px 12px rgba(0,0,0,0.06)',
            },
            children: [
              // ? 아이콘
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #38bdf8 0%, #a78bfa 100%)',
                    fontSize: '32px',
                    color: '#ffffff',
                    fontWeight: 600,
                  },
                  children: '?',
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '36px',
                    fontWeight: 600,
                    color: '#1a1a2e',
                  },
                  children: '궁금한 점을 물어보세요',
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '19px',
                    color: '#6b7280',
                  },
                  children: '익명으로 무엇이든 질문할 수 있어요',
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
              fontSize: '16px',
              color: '#6b7280',
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
        gap: '28px',
        position: 'relative',
        padding: '0 80px',
        width: '100%',
      },
      children: [
        // mmemory Q&A 로고
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            },
            children: [
              {
                type: 'span',
                props: {
                  style: {
                    fontSize: '26px',
                    fontWeight: 600,
                    letterSpacing: '-0.04em',
                    background: 'linear-gradient(135deg, #38bdf8 0%, #a78bfa 100%)',
                    backgroundClip: 'text',
                    color: 'transparent',
                  },
                  children: 'mmemory',
                },
              },
              {
                type: 'span',
                props: {
                  style: {
                    fontSize: '18px',
                    color: '#8b5cf6',
                    fontWeight: 400,
                  },
                  children: 'Q&A',
                },
              },
            ],
          },
        },
        // Q&A 카드
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(255,255,255,0.85)',
              borderRadius: '24px',
              padding: '44px 56px',
              width: '100%',
              maxWidth: '960px',
              boxShadow: '0 8px 40px rgba(56,189,248,0.12), 0 2px 12px rgba(0,0,0,0.05)',
            },
            children: [
              // Q. 라벨
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '22px',
                    fontWeight: 600,
                    color: '#3b82f6',
                    marginBottom: '14px',
                  },
                  children: 'Q.',
                },
              },
              // 질문 텍스트
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: displayText && displayText.length > 80 ? '28px' : '34px',
                    color: '#1a1a2e',
                    lineHeight: 1.6,
                    fontWeight: 400,
                  },
                  children: displayText,
                },
              },
            ],
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
          fontFamily: 'Pretendard',
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
          name: 'Pretendard',
          data: Buffer.from(fontSemiBold),
          style: 'normal' as const,
          weight: 600,
        },
        {
          name: 'Pretendard',
          data: Buffer.from(fontRegular),
          style: 'normal' as const,
          weight: 400,
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
  res.setHeader('Cache-Control', 'public, s-maxage=3600, max-age=3600');
  return res.status(200).send(pngBuffer);
}
