import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'fs';
import { join } from 'path';

const CRAWLER_AGENTS = [
  'twitterbot',
  'facebookexternalhit',
  'linkedinbot',
  'slackbot',
  'discordbot',
];

function isCrawler(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_AGENTS.some(bot => ua.includes(bot));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userAgent = req.headers['user-agent'];

  if (!isCrawler(userAgent)) {
    try {
      const indexPath = join(process.cwd(), 'dist', 'index.html');
      const html = readFileSync(indexPath, 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch {
      return res.redirect(302, `/`);
    }
  }

  const siteUrl = `https://${req.headers.host}`;
  const ogImageUrl = `${siteUrl}/api/og?v=2`;

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>Ask - mmemory</title>
  <meta property="og:title" content="Ask - mmemory" />
  <meta property="og:description" content="궁금한 점을 물어보세요" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:url" content="${siteUrl}/ask" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Ask - mmemory" />
  <meta name="twitter:description" content="궁금한 점을 물어보세요" />
  <meta name="twitter:image" content="${ogImageUrl}" />
</head>
<body><p>궁금한 점을 물어보세요</p></body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'public, s-maxage=600');
  return res.status(200).send(html);
}
