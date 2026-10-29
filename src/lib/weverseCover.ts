/** 위버스 라이브 주소 → 비교용 키 `{아티스트}/live/{id}`. 라이브가 아니면 null */
export function weverseLiveKey(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/(^|\.)weverse\.io$/.test(u.hostname)) return null;
    const m = u.pathname.match(/^\/([^/]+)\/live\/([^/?#]+)/);
    return m ? `${m[1].toLowerCase()}/live/${m[2]}` : null;
  } catch {
    return null;
  }
}

/**
 * 위버스 라이브 페이지에서 누르는 북마클릿.
 * 사용자가 보고 있는 화면에서 썸네일 주소를 읽어 어드민 표지 화면을 새 탭으로 연다. 서버는 위버스에 요청하지 않는다.
 */
export function buildCoverBookmarklet(adminOrigin: string): string {
  const code = `(()=>{
    const re=/url\\("?(https:\\/\\/video-phinf\\.pstatic\\.net\\/[^")]+)"?\\)/;
    let bg,best=0;
    for(const e of document.querySelectorAll('*')){
      const m=getComputedStyle(e).backgroundImage.match(re);
      if(!m)continue;
      const r=e.getBoundingClientRect(),area=r.width*r.height;
      if(area>best){best=area;bg=m[1];}
    }
    const og=document.querySelector('meta[property="og:image"]')?.content;
    const poster=[...document.querySelectorAll('video[poster]')].map(v=>v.poster).find(p=>p&&!p.startsWith('data:'));
    const src=bg||og||poster;
    if(!src){alert('썸네일을 찾지 못했어요. 광고가 끝나고 영상 화면이 뜬 뒤 다시 눌러 주세요');return;}
    window.open(${JSON.stringify(adminOrigin)}+'/admin/covers?url='+encodeURIComponent(location.href)+'&image='+encodeURIComponent(src),'_blank','noopener');
  })()`;
  return 'javascript:' + encodeURIComponent(code.replace(/\n\s*/g, ''));
}
