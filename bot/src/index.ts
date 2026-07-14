import { config } from './config.js';
import { getTodayString, toYYMMDD } from './dates.js';
import { loadOnThisDayContent } from './onThisDay.js';
import { buildThreads, summarize } from './threadPlan.js';

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run'); // Supabase 조회 + 계획 출력, 실제 게시는 안 함

async function main() {
  const today = getTodayString(config.dateOverride);
  console.log(`📅 오늘(KST): ${today}${config.dateOverride ? ' (DATE override)' : ''}`);

  const content = await loadOnThisDayContent(today);
  console.log(
    `📦 그 해 오늘 콘텐츠 — 모먼트 그룹 ${content.momentGroups.length} · 사진 ${content.photos.length} · 포스트 ${content.posts.length}`,
  );

  const threads = buildThreads(content, {
    r2PublicUrl: config.r2PublicUrl,
    yymmdd: toYYMMDD(today),
  });

  console.log('\n=== 게시 계획 ===');
  console.log(summarize(threads));
  console.log('=================\n');

  if (threads.length === 0) {
    console.log('올릴 콘텐츠가 없어 종료합니다.'); // "없으면 안 올림"
    return;
  }

  if (DRY_RUN) {
    console.log('🧪 dry-run: 실제 게시는 하지 않았습니다.');
    return;
  }

  // 실제 게시는 여기서만 X 클라이언트를 로드 (계획 단계에서 토큰 불필요)
  const { publishThreads } = await import('./xClient.js');
  await publishThreads(threads);
  console.log('✅ 완료');
}

main().catch((err) => {
  console.error('✖ 실행 실패:', err);
  process.exit(1);
});
