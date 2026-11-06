/* Static locale route stays authoritative, matching translation's localized pages.
   Storage denial must never prevent an explicit language choice. */
(()=>{const selector=document.getElementById('newsLangSel');if(!selector)return;
const node=document.getElementById('news-language-routes');if(!node)return;
const routes=JSON.parse(node.textContent);
selector.addEventListener('change',()=>{const lang=selector.value;
if(!Object.hasOwn(routes,lang))return;
try{localStorage.setItem('translation_okinawa_lang',lang)}catch(e){}
location.assign(routes[lang]);});})();
