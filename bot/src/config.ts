import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`✖ 환경변수 ${name} 이(가) 필요합니다. bot/.env 를 확인하세요.`);
    process.exit(1);
  }
  return v;
}

// Supabase/R2 는 계획 단계에서 필요 → 즉시 검증.
export const config = {
  supabase: {
    url: required('SUPABASE_URL'),
    key: required('SUPABASE_KEY'),
  },
  r2PublicUrl: required('R2_PUBLIC_URL').replace(/\/$/, ''),
  // 테스트용 날짜 강제 지정 (YYYY-MM-DD). 없으면 오늘(KST).
  dateOverride: process.env.DATE,
};

// X 자격증명은 실제 게시할 때만 검증 (dry-run/plan-only 에선 불필요).
export function loadXConfig() {
  return {
    appKey: required('X_API_KEY'),
    appSecret: required('X_API_SECRET'),
    accessToken: required('X_ACCESS_TOKEN'),
    accessSecret: required('X_ACCESS_SECRET'),
  };
}
