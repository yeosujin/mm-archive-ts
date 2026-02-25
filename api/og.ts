import type { VercelRequest, VercelResponse } from '@vercel/node';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const ACCENT = '#70a4f9';
const BG = '#0a0a0f';
const BG_CARD = '#1a1a24';
const BORDER = '#2a2a3a';
const TEXT = '#f0f0f5';
const TEXT_MUTED = '#6a6a7a';

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
          background: BG,
          fontFamily: 'Pretendard',
          position: 'relative',
          overflow: 'hidden',
        },
        children: [
          // 배경 글로우 효과
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '-120px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '800px',
                height: '500px',
                background: 'radial-gradient(ellipse at center, rgba(112,164,249,0.12) 0%, transparent 70%)',
              },
            },
          },
          // 하단 글로우
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: '-200px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '600px',
                height: '400px',
                background: 'radial-gradient(ellipse at center, rgba(112,164,249,0.06) 0%, transparent 70%)',
              },
            },
          },
          // 메인 컨텐츠
          isAskPage
            ? // === /ask 페이지 카드 (질문하기 CTA) ===
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '40px',
                    position: 'relative',
                  },
                  children: [
                    // mmemory 로고
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: '42px',
                          fontWeight: 600,
                          color: TEXT,
                          letterSpacing: '-0.04em',
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
                          background: BG_CARD,
                          border: `1px solid ${BORDER}`,
                          borderRadius: '20px',
                          padding: '48px 64px',
                          gap: '16px',
                          minWidth: '500px',
                        },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: {
                                fontSize: '32px',
                                fontWeight: 600,
                                color: TEXT,
                              },
                              children: '궁금한 점을 물어보세요',
                            },
                          },
                          // 구분선
                          {
                            type: 'div',
                            props: {
                              style: {
                                width: '48px',
                                height: '2px',
                                background: ACCENT,
                                borderRadius: '1px',
                                margin: '8px 0',
                              },
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
                    // URL
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: '16px',
                          color: TEXT_MUTED,
                        },
                        children: 'mmemory.cloud/ask',
                      },
                    },
                  ],
                },
              }
            : // === /ask/:id 개별 Q&A 카드 ===
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '36px',
                    position: 'relative',
                    padding: '0 80px',
                    width: '100%',
                  },
                  children: [
                    // mmemory 로고 (작게)
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
                                fontSize: '24px',
                                fontWeight: 600,
                                color: TEXT,
                                letterSpacing: '-0.04em',
                              },
                              children: 'mmemory',
                            },
                          },
                          {
                            type: 'span',
                            props: {
                              style: {
                                fontSize: '16px',
                                color: TEXT_MUTED,
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
                          background: BG_CARD,
                          border: `1px solid ${BORDER}`,
                          borderRadius: '20px',
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
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '20px',
                              },
                              children: [
                                {
                                  type: 'span',
                                  props: {
                                    style: {
                                      fontSize: '26px',
                                      fontWeight: 600,
                                      color: ACCENT,
                                    },
                                    children: 'Q.',
                                  },
                                },
                              ],
                            },
                          },
                          // 질문 텍스트
                          {
                            type: 'div',
                            props: {
                              style: {
                                fontSize: displayText && displayText.length > 80 ? '28px' : '34px',
                                color: TEXT,
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
