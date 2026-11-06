import fs from 'node:fs';
import path from 'node:path';
const layouts={kiso:{'index.html':'zh-Hans','en/index.html':'en','ja/index.html':'ja','zh-hant/index.html':'zh-Hant'},JapanUsedCars:{'index.html':'en','ru/index.html':'ru'},translation:{'index.html':'zh-Hans','en/index.html':'en','ja/index.html':'ja','tw/index.html':'zh-Hant','de/index.html':'de','ko/index.html':'ko','th/index.html':'th'}};
const tasks={ 'M1105-01':'highly-skilled-j-find-university-list-2026-10','M1105-02':'okinawa-workplace-communication-scenarios'};
const prefixes={'zh-Hans':'zh-hans','zh-Hant':'zh-hant',ja:'ja',en:'en'};
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function renderNewsCards(root,site){
 if(!Object.hasOwn(layouts,site))throw Error('unknown site');
 // This build helper is not a publication boundary. Reject symlinked inputs
 // nonetheless; the release validator must independently verify the final tree.
 root=path.resolve(root);
 const safePath=relative=>{
  let current=root;
  if(fs.lstatSync(current).isSymbolicLink())throw Error('symlink root');
  for(const part of relative.split('/')){
   current=path.join(current,part);
   if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error('symlink path');
  }
  return current;
 };
 const file=safePath('content/news-cards.json');if(!fs.existsSync(file))return;
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 if(!Array.isArray(data)||data.length>2)throw Error('invalid records');
 const ids=new Set();for(const a of data){
  if(Object.keys(a).sort().join(',')!=='id,locales'||!tasks[a.id]||ids.has(a.id))throw Error('record schema');ids.add(a.id);
  if((site==='kiso'&&a.id!=='M1105-01')||(site!=='kiso'&&a.id!=='M1105-02'))throw Error('wrong article for site');
  if(Object.keys(a.locales).sort().join(',')!==[...new Set(Object.values(layouts[site]))].sort().join(','))throw Error('locale scope');
  for(const [lang,c]of Object.entries(a.locales)){
   if(Object.keys(c).sort().join(',')!=='body,cta,title,url'||Object.values(c).some(v=>typeof v!=='string'||!v.trim()||v.length>1500))throw Error('copy schema');
   const local={"zh-Hans": "https://translation.nice.okinawa/news/okinawa-workplace-communication-scenarios/", "zh-Hant": "https://translation.nice.okinawa/tw/news/okinawa-workplace-communication-scenarios/", "ja": "https://translation.nice.okinawa/ja/news/okinawa-workplace-communication-scenarios/", "en": "https://translation.nice.okinawa/en/news/okinawa-workplace-communication-scenarios/", "de": "https://translation.nice.okinawa/de/news/okinawa-workplace-communication-scenarios/", "ko": "https://translation.nice.okinawa/ko/news/okinawa-workplace-communication-scenarios/", "th": "https://translation.nice.okinawa/th/news/okinawa-workplace-communication-scenarios/"};if(c.url!==local[lang])throw Error('destination scope');
  }
 }
 // Validate every page before writing any; no partial write on a bad anchor.
 const outputs=[];for(const [file,lang]of Object.entries(layouts[site])){
  const p=safePath(file);let html=fs.readFileSync(p,'utf8');
  html=html.replace(/<!-- NEWS-CARDS:START -->[\s\S]*?<!-- NEWS-CARDS:END -->\n/g,'');
  const anchor=site==='kiso'?'<footer id="contact">':'<footer>';
  if(html.split(anchor).length!==2)throw Error('ambiguous/missing insertion anchor');
  const cards=data.map(a=>{const c=a.locales[lang];return `<article class="review-news-card" data-article="${a.id}" data-news-record="${a.id}" lang="${lang}"><h2>${esc(c.title)}</h2><p>${esc(c.body)}</p><a href="${esc(c.url)}">${esc(c.cta)}</a></article>`}).join('\n');
  const localeHook=site==='translation'?(file==='index.html'?'<script type="application/json" id="news-card-locales">'+JSON.stringify(data).replaceAll('<','\\u003c')+'</script>':'')+'<script defer src="/scripts/news-card-locale.js"></script>':'';
  const block='<!-- NEWS-CARDS:START --><style>.review-news-card{box-sizing:border-box;max-width:1000px;margin:24px auto;padding:24px;border:1px solid #cbdad7;border-radius:12px;background:var(--card,#fff);color:var(--ink,#173744);line-height:1.7;overflow-wrap:anywhere}.review-news-card h2{font-size:clamp(20px,3vw,28px);line-height:1.4}.review-news-card a{color:inherit;text-decoration:underline;font-weight:700}</style>'+cards+'<!-- NEWS-CARDS:END -->\n';
  outputs.push([p,html.replace(anchor,block.replace('<!-- NEWS-CARDS:END -->',localeHook+'<!-- NEWS-CARDS:END -->')+anchor)]);
 }
 for(const [p,html]of outputs)fs.writeFileSync(p,html);
}
