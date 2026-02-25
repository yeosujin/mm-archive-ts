import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

const CRAWLER_AGENTS = [
  'twitterbot',
  'facebookexternalhit',
  'linkedinbot',
  'slackbot',
  'discordbot',
  'kakaotalk-scrap',
];

function isCrawler(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_AGENTS.some(bot => ua.includes(bot));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const userAgent = req.headers['user-agent'];

  if (!isCrawler(userAgent)) {
    // 일반 사용자: SPA index.html 제공
    try {
      const indexPath = join(process.cwd(), 'dist', 'index.html');
      const html = readFileSync(indexPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch {
      return res.redirect(302, `/`);
    }
  }

  // 크롤러: OG 메타태그 HTML 반환
  const { data: ask } = await supabase
    .from('asks')
    .select('*')
    .eq('id', id)
    .single();

  if (!ask) {
    return res.status(404).send('Not found');
  }

  const siteUrl = `https://${req.headers.host}`;
  const ogImageUrl = `${siteUrl}/api/og?id=${id}&v=2`;
  const title = 'Q&A - mmemory';
  const description = escapeHtml(
    ask.content.length > 100 ? ask.content.slice(0, 100) + '...' : ask.content
  );

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:url" content="${siteUrl}/ask/${id}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImageUrl}" />
</head>
<body><p>${description}</p></body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');
  return res.status(200).send(html);
}
