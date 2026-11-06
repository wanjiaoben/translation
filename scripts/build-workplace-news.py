"""M1105-02 isolated article renderer. Does not run native site generator or publish."""
from pathlib import Path
from html import escape
import json,re,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parent.parent
D=json.loads((ROOT/'content/workplace-news.json').read_text());slug=D['slug'];origin=D['origin'];scope=D['locales']
assert slug=='okinawa-workplace-communication-scenarios' and D['task']=='M1105-02'
assert D['site'] in ['translation','JapanUsedCars'] and origin=='https://'+D['site'].lower()+'.nice.okinawa'
assert set(scope)==set(D['entries'])
names={'zh-Hans':'简体中文','zh-Hant':'繁體中文','en':'English','ja':'日本語','de':'Deutsch','ko':'한국어','th':'ไทย','ru':'Русский'}
urls={l:origin+'/'+pre+'news/'+slug+'/' for l,pre in scope.items()}
base=ROOT/'content/news-sitemap-base.xml'
if not base.exists():base.write_bytes((ROOT/'sitemap.xml').read_bytes())
xml=base.read_text();ET.fromstring(xml)
for l,pre in scope.items():
 assert pre in ['','tw/','en/','ja/','de/','ko/','th/','ru/']
 e=D['entries'][l];home=(ROOT/pre/'index.html').read_text();css='\n'.join(re.findall(r'<style(?:\s[^>]*)?>(.*?)</style>',home,re.S))
 # Strip the independently injected news-card styles so repeated builds have identical output.
 css='\n'.join(re.findall(r'<style(?:\s[^>]*)?>(.*?)</style>',re.sub(r'<!-- NEWS-CARDS:START -->.*?<!-- NEWS-CARDS:END -->\n','',home,flags=re.S),re.S))
 assert not re.search(r'<script|\son\w+\s*=|javascript:',e['body'],re.I),'unexpected active article content'
 nav=''.join('<a href="'+escape(urls[k],quote=True)+'" hreflang="'+k+'"'+(' aria-current="page"' if k==l else '')+'>'+names[k]+'</a>' for k in scope)
 alternates=''.join('<link rel="alternate" hreflang="'+k+'" href="'+v+'">' for k,v in urls.items())
 title=escape(e['title']);description=escape(e['description'],quote=True);brand='冲绳商务翻译' if D['site']=='translation' and l=='zh-Hans' else ('Translation · nice.okinawa' if D['site']=='translation' else 'OKINAWA AUTO')
 schema=json.dumps({'@context':'https://schema.org','@type':'Article','headline':e['title'],'description':e['description'],'inLanguage':l,'datePublished':D['date'],'url':urls[l],'mainEntityOfPage':urls[l],'publisher':{'@type':'Organization','name':brand,'url':origin+'/'}},ensure_ascii=False).replace('<','\\u003c')
 style='body{margin:0}.news-top{position:relative;display:flex;flex-wrap:wrap;gap:16px;align-items:center;padding:20px;max-width:1100px;margin:auto}.news-languages{display:flex;flex-wrap:wrap;gap:12px;position:static}.news-languages a{white-space:nowrap;min-height:44px;display:inline-flex;align-items:center}.news-content{display:block;max-width:960px;margin:0 auto;padding:24px;line-height:1.85;overflow-wrap:anywhere}.news-content h1{font:clamp(28px,5vw,46px)/1.3 Georgia,serif}.news-content:lang(de) h1{hyphens:auto}.news-content h2{font-size:26px}.news-content h3{font-size:21px}.news-content section{padding:24px 0}.news-content .cases{display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))}.news-content .case,.news-content .notice{border:1px solid #cbdad7;border-radius:12px;padding:20px}.news-content .case .num{display:block}.news-content .cta-row{display:flex;flex-wrap:wrap;gap:16px}.news-content a{overflow-wrap:anywhere}.news-content .lead{font-size:18px}.news-content *{max-width:100%}@media(max-width:640px){.news-top{display:block}.news-languages{margin-top:16px}.news-content{padding:18px}}'
 if D['site']=='translation':
  routekeys={'zh-Hans':'zh','zh-Hant':'tw','en':'en','ja':'ja','de':'de','ko':'ko','th':'th'}
  routes={routekeys[k]:urls[k]+'?lang='+routekeys[k] for k in scope}
  nav='<label for="newsLangSel">Language</label><select id="newsLangSel" aria-label="Language">'+''.join('<option value="'+routekeys[k]+'"'+(' selected' if k==l else '')+'>'+names[k]+'</option>' for k in scope)+'</select><noscript>'+nav+'</noscript>'
 else:routes={}
 h='<!doctype html><html lang="'+l+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+' | '+escape(brand)+'</title><meta name="description" content="'+description+'"><link rel="canonical" href="'+urls[l]+'">'+alternates+'<link rel="alternate" hreflang="x-default" href="'+urls[next(iter(scope))]+'"><meta property="og:type" content="article"><meta property="og:title" content="'+title+'"><meta property="og:description" content="'+description+'"><meta property="og:url" content="'+urls[l]+'"><style>'+css+'\n'+style+'</style><script type="application/ld+json">'+schema+'</script></head><body><header class="news-top"><a href="/'+pre+'">'+escape(brand)+'</a><div class="news-languages" aria-label="Languages">'+nav+'</div></header><main class="news-content"><h1>'+title+'</h1><p class="lead">'+description+'</p>'+e['body']+'</main></body></html>'
 if D['site']=='translation':h=h.replace('</body>','<script type="application/json" id="news-language-routes">'+json.dumps(routes).replace('<','\\u003c')+'</script><script defer src="/scripts/news-article-locale.js"></script></body>')
 p=ROOT/pre/'news'/slug/'index.html';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(h)
 assert e['body'] in p.read_text() and urls[l] in p.read_text()
 additions='<url><loc>'+urls[l]+'</loc></url>'
 if '<loc>'+urls[l]+'</loc>' not in xml:xml=xml.replace('</urlset>',additions+'</urlset>')
ET.fromstring(xml);(ROOT/'sitemap.xml').write_text(xml)
print('PASS '+D['site']+' '+str(len(scope))+' full pages, body preserved and same-site SEO')
