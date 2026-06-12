import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const indexPath = path.join(root, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');

const configStart = html.indexOf('const CH =');
const configEnd = html.indexOf('/* ====== 渲染 ====== */');
if (configStart < 0 || configEnd < 0) throw new Error('Could not locate i18n config');
const configSource = html.slice(configStart, configEnd);

const context = {};
vm.createContext(context);
vm.runInContext(
  configSource +
    '\nglobalThis.__CH=CH;globalThis.__ROUTE=ROUTE;globalThis.__I18N=I18N;globalThis.__LANG_URLS=LANG_URLS;',
  context
);

const CH = context.__CH;
const ROUTE = context.__ROUTE;
const I18N = context.__I18N;
const LANG_URLS = context.__LANG_URLS;
const langs = ['tw', 'ja', 'en', 'de', 'ko', 'th'];
const allLangs = ['zh', ...langs];
const origin = 'https://translation.nice.okinawa';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function urlFor(lang) {
  return origin + (LANG_URLS[lang] || '/');
}

function hreflangLinks() {
  const codes = {
    zh: 'zh-CN',
    tw: 'zh-TW',
    ja: 'ja',
    en: 'en',
    de: 'de',
    ko: 'ko',
    th: 'th',
  };
  return [
    ...allLangs.map((lang) => `<link rel="alternate" hreflang="${codes[lang]}" href="${urlFor(lang)}">`),
    `<link rel="alternate" hreflang="x-default" href="${urlFor('zh')}">`,
  ].join('\n');
}

function replaceMeta(page, selector, value) {
  const escaped = esc(value);
  const re = new RegExp(`(<meta ${selector} content=")[^"]*(">)`);
  return page.replace(re, `$1${escaped}$2`);
}

function renderPage(lang) {
  const t = I18N[lang];
  let page = html;
  page = page.replace(/<html lang="[^"]*">/, `<html lang="${esc(t.html_lang)}" data-static-lang="${lang}">`);
  page = page.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(t.meta_t)}</title>`);
  page = replaceMeta(page, 'name="description"', t.meta_d);
  page = replaceMeta(page, 'property="og:site_name"', t.ft_brand || t.brand);
  page = replaceMeta(page, 'property="og:title"', t.meta_t);
  page = replaceMeta(page, 'property="og:description"', t.meta_d);
  page = replaceMeta(page, 'name="twitter:title"', t.meta_t);
  page = replaceMeta(page, 'name="twitter:description"', t.meta_d);
  page = page.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${urlFor(lang)}">`);
  page = page.replace(
    /<link rel="alternate" hreflang="zh-CN"[\s\S]*?<link rel="alternate" hreflang="x-default" href="[^"]*">/,
    hreflangLinks()
  );

  page = page.replace(/<([a-z0-9]+)([^>]*data-i18n="([^"]+)"[^>]*)>[\s\S]*?<\/\1>/gi, (m, tag, attrs, key) => {
    if (t[key] === undefined) return m;
    return `<${tag}${attrs}>${esc(t[key])}</${tag}>`;
  });
  page = page.replace(/<([a-z0-9]+)([^>]*data-i18n-html="([^"]+)"[^>]*)>[\s\S]*?<\/\1>/gi, (m, tag, attrs, key) => {
    if (t[key] === undefined) return m;
    return `<${tag}${attrs}>${t[key]}</${tag}>`;
  });

  page = page.replace(/<div class="case-grid" id="caseGrid">[\s\S]*?<\/div>\n<\/section>/, () => {
    const cases = t.cases
      .map((c) => `<div class="case"><h3><em>${esc(c.e)}</em>${esc(c.t)}</h3><p>${c.b}</p><p class="who">${esc(c.w)}</p></div>`)
      .join('');
    return `<div class="case-grid" id="caseGrid">${cases}</div>\n</section>`;
  });
  page = page.replace(/<div class="pro-grid" id="proGrid">[\s\S]*?<\/div>\n    <div class="note-box"/, () => {
    const pros = t.pros
      .map((p) => `<div class="pro"><span class="chip ls">${esc(p.g)}</span><h3>${esc(p.t)}</h3><p class="pro-en ls">${esc(p.e)}</p><ul>${p.l.map((li) => `<li>${esc(li)}</li>`).join('')}</ul></div>`)
      .join('');
    return `<div class="pro-grid" id="proGrid">${pros}</div>\n    <div class="note-box"`;
  });
  page = page.replace(/<tbody id="priceBody">[\s\S]*?<\/tbody>/, () => {
    const rows = t.price
      .map((r) => `<tr><td class="item">${esc(r.i)}</td><td class="p">${esc(r.p)}</td><td class="d">${esc(r.d)}</td></tr>`)
      .join('');
    return `<tbody id="priceBody">${rows}</tbody>`;
  });
  page = page.replace(/<div class="flow" id="flowGrid">[\s\S]*?<\/div>\n  <\/div>\n<\/section>\n\n<section id="examples">/, () => {
    const flow = t.flow.map((s) => `<div class="step"><h3>${esc(s.t)}</h3><p>${esc(s.b)}</p></div>`).join('');
    return `<div class="flow" id="flowGrid">${flow}</div>\n  </div>\n</section>\n\n<section id="examples">`;
  });
  page = page.replace(/<div id="faqList">[\s\S]*?<\/div>\n  <\/div>\n<\/section>\n\n<section id="contact"/, () => {
    const faq = t.faq.map((f) => `<details><summary>${esc(f.q)}</summary><div class="ans">${esc(f.a)}</div></details>`).join('');
    return `<div id="faqList">${faq}</div>\n  </div>\n</section>\n\n<section id="contact"`;
  });
  page = page.replace(/<div class="eg-grid" id="egGrid">[\s\S]*?<\/div>\n  <\/div>\n<\/section>\n\n<section id="about"/, () => {
    const eg = t.eg
      .map((c) => `<div class="eg"><span class="chip ls">${esc(c.g)}</span><h3>${esc(c.t)}</h3><p class="lbl ls">${esc(t.eg_lbl.bg)}</p><p>${esc(c.bg)}</p><p class="lbl ls">${esc(t.eg_lbl.doing)}</p><p>${esc(c.doing)}</p><p class="lbl ls">${esc(t.eg_lbl.rs)}</p><p>${esc(c.rs)}</p></div>`)
      .join('');
    return `<div class="eg-grid" id="egGrid">${eg}</div>\n  </div>\n</section>\n\n<section id="about"`;
  });
  page = page.replace(/<div class="contact-grid" id="contactGrid">[\s\S]*?<\/div>\n  <\/div>\n<\/section>/, () => {
    const cards = (ROUTE[lang] || ROUTE.zh)
      .map((key) => {
        const c = CH[key];
        return `<a class="contact-card" href="${c.href}"><div class="ch">${esc(c.label)}</div><div class="id">${esc(c.id)}</div><div class="for">${esc(t.ct_for[key] || '')}</div></a>`;
      })
      .join('');
    return `<div class="contact-grid" id="contactGrid">${cards}</div>\n  </div>\n</section>`;
  });
  page = page.replace(/<div class="fab" id="fab"><\/div>/, () => {
    const panel = ['wechat', 'whatsapp', 'mail']
      .map((key) => {
        const c = CH[key];
        return `<a href="${c.href}"><strong>${esc(c.label)}</strong><small>${esc(c.id)}</small></a>`;
      })
      .join('');
    return `<div class="fab" id="fab"><details><summary aria-label="${esc(t.fab.main)}"><span class="ico">💬</span><span class="txt">${esc(t.fab.main)}</span></summary><div class="fab-panel">${panel}</div></details></div>`;
  });

  return page;
}

for (const lang of langs) {
  const dir = path.join(root, lang);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), renderPage(lang));
}

const sitemapUrl = (lang) => `  <url>\n    <loc>${urlFor(lang)}</loc>\n${allLangs
  .map((l) => `    <xhtml:link rel="alternate" hreflang="${{ zh: 'zh-CN', tw: 'zh-TW', ja: 'ja', en: 'en', de: 'de', ko: 'ko', th: 'th' }[l]}" href="${urlFor(l)}"/>`)
  .join('\n')}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor('zh')}"/>\n  </url>`;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${allLangs.map(sitemapUrl).join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap);

console.log(`Generated ${langs.length} localized directories and sitemap.xml`);
