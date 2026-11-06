/* Engineering candidate: trusted, build-validated data only. No HTML insertion. */
(()=>{
 // Explicit Chinese selection must outrank the root page's remembered locale.
 document.addEventListener('change',event=>{
  if(event.target?.id==='langSel'&&event.target.value==='zh'&&location.pathname!=='/'){
   event.stopImmediatePropagation();location.href='/?lang=zh';
  }
 },true);
 const node=document.getElementById('news-card-locales');
 if(!node)return;
 const records=JSON.parse(node.textContent);
 function sync(){
  const current=document.documentElement.lang;
  const lang=({'zh-CN':'zh-Hans','zh-TW':'zh-Hant'})[current]||current;
  for(const record of records){
   const card=document.querySelector(`[data-news-record="${record.id}"]`);
   const copy=Object.hasOwn(record.locales,lang)?record.locales[lang]:null;
   if(!card)continue;
   card.hidden=!copy;
   if(!copy)continue;
   card.lang=lang;
   card.querySelector('h2').textContent=copy.title;
   card.querySelector('p').textContent=copy.body;
   const link=card.querySelector('a');
   link.textContent=copy.cta;link.setAttribute('href',copy.url);
  }
 }
 new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 sync();
})();
