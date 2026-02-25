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

// 사이트 테마 컬러
const SKY = '#38bdf8';
const PURPLE = '#a78bfa';
const TEXT = '#f0f0f5';
const TEXT_SUB = '#c0c0d0';
const TEXT_MUTED = '#8a8a9a';

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

  // 배경 글로우 orbs (공통)
  const glowOrbs: VNode[] = [
    // 좌상단 스카이블루 글로우
    {
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          top: '-100px',
          left: '-60px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 65%)',
        },
      },
    },
    // 우하단 퍼플 글로우
    {
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          bottom: '-120px',
          right: '-80px',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 65%)',
        },
      },
    },
    // 중앙 은은한 블루
    {
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '700px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(112,164,249,0.06) 0%, transparent 70%)',
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
        gap: '36px',
        position: 'relative',
      },
      children: [
        // mmemory 로고 (스카이블루)
        {
          type: 'div',
          props: {
            style: {
              fontSize: '48px',
              fontWeight: 600,
              color: SKY,
              letterSpacing: '-0.04em',
            },
            children: 'mmemory',
          },
        },
        // 메인 카드 (그라데이션 보더)
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(167,139,250,0.08) 100%)',
              border: '1px solid rgba(56,189,248,0.2)',
              borderRadius: '24px',
              padding: '44px 72px',
              gap: '20px',
            },
            children: [
              // ? 아이콘 원
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(167,139,250,0.2) 100%)',
                    fontSize: '28px',
                    color: SKY,
                    fontWeight: 600,
                  },
                  children: '?',
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '34px',
                    fontWeight: 600,
                    color: TEXT,
                  },
                  children: '궁금한 점을 물어보세요',
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '18px',
                    color: TEXT_MUTED,
                  },
                  children: '익명으로 무엇이든 질문할 수 있어요',
                },
              },
            ],
          },
        },
        // URL 하단
        {
          type: 'div',
          props: {
            style: {
              fontSize: '16px',
              color: TEXT_MUTED,
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
        gap: '32px',
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
              gap: '12px',
            },
            children: [
              {
                type: 'span',
                props: {
                  style: {
                    fontSize: '26px',
                    fontWeight: 600,
                    color: SKY,
                    letterSpacing: '-0.04em',
                  },
                  children: 'mmemory',
                },
              },
              // 구분 도트
              {
                type: 'span',
                props: {
                  style: {
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: PURPLE,
                  },
                },
              },
              {
                type: 'span',
                props: {
                  style: {
                    fontSize: '18px',
                    color: PURPLE,
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
              background: 'linear-gradient(160deg, rgba(56,189,248,0.06) 0%, rgba(167,139,250,0.06) 100%)',
              border: '1px solid rgba(56,189,248,0.15)',
              borderRadius: '24px',
              padding: '48px 56px',
              width: '100%',
              maxWidth: '960px',
            },
            children: [
              // Q. 라벨
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '22px',
                    fontWeight: 600,
                    color: SKY,
                    marginBottom: '16px',
                    letterSpacing: '0.02em',
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
                    color: TEXT_SUB,
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
          background: 'linear-gradient(160deg, #0c0e1a 0%, #0a0f1e 40%, #120e22 100%)',
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
  res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=86400');
  return res.status(200).send(pngBuffer);
}
