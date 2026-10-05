const $=id=>document.getElementById(id);
const ui={stars:$('star-strip'),list:$('entry-list'),count:$('result-count'),search:$('search'),groups:$('group-filter'),heading:$('reader-heading'),counter:$('reader-counter'),source:$('source-line'),passages:$('passages'),pageCount:$('page-count'),scope:$('scope-note'),prev:$('prev-entry'),next:$('next-entry'),toc:$('toc'),scrim:$('mobile-scrim'),dialog:$('help-dialog')};
const savedScale=Number(localStorage.getItem('ziwei-reader-scale'))||1;
const state={data:null,entries:[],visible:[],star:localStorage.getItem('ziwei-reader-star')||'紫微',group:'all',query:'',selected:localStorage.getItem('ziwei-reader-last')||'',scale:Math.min(1.45,Math.max(.9,savedScale))};

function create(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function groupName(group){return group==='dedicated'?'星曜專論':'散見原句';}
function normalize(text){return String(text||'').normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/\s+/g,'');}
function activeEntry(){return state.visible.find(entry=>entry.id===state.selected)||null;}
function closeToc(){ui.toc.classList.remove('is-open');ui.scrim.classList.remove('is-open');ui.scrim.hidden=true;document.body.style.overflow='';}
function openToc(){ui.toc.classList.add('is-open');ui.scrim.hidden=false;ui.scrim.classList.add('is-open');document.body.style.overflow='hidden';ui.search.focus();}
function setScale(value){state.scale=Math.max(.9,Math.min(1.45,Math.round(value*100)/100));document.documentElement.style.setProperty('--scale',state.scale);localStorage.setItem('ziwei-reader-scale',state.scale);}

function renderStars(){
  ui.stars.replaceChildren();
  const all=create('button','',`全部 · ${state.data.total}`);all.type='button';all.setAttribute('aria-current',String(state.star==='all'));all.addEventListener('click',()=>chooseStar('all'));ui.stars.append(all);
  for(const star of state.data.stars){const button=create('button','',`${star.name} · ${star.entries.length}`);button.type='button';button.setAttribute('aria-current',String(state.star===star.name));button.addEventListener('click',()=>chooseStar(star.name));ui.stars.append(button);}
}
function chooseStar(name){state.star=name;localStorage.setItem('ziwei-reader-star',name);updateResults(false);renderStars();closeToc();}
function filtered(){
  const needle=normalize(state.query);
  return state.entries.filter(entry=>(state.star==='all'||entry.star===state.star)&&(state.group==='all'||entry.group===state.group)&&(!needle||entry.searchText.includes(needle)));
}
function updateResults(keepSelection=true){
  state.visible=filtered();
  if(!keepSelection||!state.visible.some(entry=>entry.id===state.selected))state.selected=state.visible[0]?.id||'';
  renderFilters();renderList();renderReader();
}
function renderFilters(){for(const button of ui.groups.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.group===state.group));}
function renderList(){
  const label=state.star==='all'?'十四主星':state.star;
  ui.count.textContent=`${label} · ${state.visible.length} 筆${state.query?'搜尋結果':''}`;
  if(!state.visible.length){ui.list.replaceChildren(create('p','empty-list','找不到符合的原句，請換個詞試試。'));return;}
  const frag=document.createDocumentFragment();
  for(const entry of state.visible){
    const button=create('button','entry-link');button.type='button';button.dataset.id=entry.id;button.setAttribute('aria-current',String(entry.id===state.selected));
    button.append(create('span','entry-kicker',`${entry.star}・${groupName(entry.group)} ${entry.number}`),create('span','entry-preview',entry.original));
    button.addEventListener('click',()=>selectEntry(entry.id,true));frag.append(button);
  }
  ui.list.replaceChildren(frag);
}
function selectEntry(id,moveFocus=false){
  if(!state.visible.some(entry=>entry.id===id))return;
  state.selected=id;localStorage.setItem('ziwei-reader-last',id);
  for(const link of ui.list.querySelectorAll('.entry-link'))link.setAttribute('aria-current',String(link.dataset.id===id));
  renderReader();closeToc();
  if(moveFocus){$('reader').focus({preventScroll:true});window.scrollTo({top:0,behavior:'smooth'});}
}
function renderReader(){
  const entry=activeEntry();
  if(!entry){ui.heading.replaceChildren(create('span','eyebrow','SEARCH'),create('h1','',state.query?'找不到符合的原句':'請從目錄選擇原句'));ui.counter.textContent='';ui.source.textContent='';ui.passages.replaceChildren();ui.pageCount.textContent='';ui.prev.disabled=true;ui.next.disabled=true;ui.scope.textContent=state.data?.scope||'';return;}
  const withinStar=entry.group==='dedicated'?entry.number:state.data.stars.find(s=>s.name===entry.star).dedicated+entry.number;
  ui.heading.replaceChildren(create('span','eyebrow',`${entry.vol} · ${entry.chapter}`),create('h1','',`${entry.star}｜${groupName(entry.group)} ${entry.number}`));
  const position=state.visible.findIndex(e=>e.id===entry.id);
  ui.counter.textContent=`${position+1} / ${state.visible.length}`;
  ui.source.textContent=[entry.subsection,`來源行 ${entry.line}`,`${entry.star}索引第 ${withinStar} 筆`].filter(Boolean).join('　／　');
  const frag=document.createDocumentFragment();
  entry.parts.forEach((part,i)=>{
    const row=create('section','passage');row.setAttribute('aria-label',`第 ${i+1} 段`);
    const quote=create('div','quote-card');quote.append(create('span','part-number',`原文 ${String(i+1).padStart(2,'0')} / ${String(entry.parts.length).padStart(2,'0')}`),create('div','',part.original));
    const explanation=create('div','explain-card');explanation.append(create('h3','','白話翻譯'),create('p','',part.plain),create('h3','','判斷條件與使用方法'),create('p','reading-method',part.read));
    row.append(quote,explanation);frag.append(row);
  });
  ui.passages.replaceChildren(frag);
  ui.pageCount.textContent=`${entry.star} · ${withinStar} / ${state.data.stars.find(s=>s.name===entry.star).entries.length}`;
  ui.prev.disabled=position<=0;ui.next.disabled=position>=state.visible.length-1;
  ui.scope.textContent=state.data.scope;
}
function step(delta){const at=state.visible.findIndex(entry=>entry.id===state.selected);const next=state.visible[at+delta];if(next)selectEntry(next.id,true);}

ui.search.addEventListener('input',event=>{state.query=event.target.value;updateResults(false);});
ui.groups.addEventListener('click',event=>{const button=event.target.closest('button[data-group]');if(!button)return;state.group=button.dataset.group;updateResults(false);});
ui.prev.addEventListener('click',()=>step(-1));ui.next.addEventListener('click',()=>step(1));
$('font-down').addEventListener('click',()=>setScale(state.scale-.1));$('font-up').addEventListener('click',()=>setScale(state.scale+.1));
$('toc-open').addEventListener('click',openToc);$('toc-close').addEventListener('click',closeToc);ui.scrim.addEventListener('click',closeToc);
$('help-open').addEventListener('click',()=>ui.dialog.showModal());$('help-close').addEventListener('click',()=>ui.dialog.close());
ui.dialog.addEventListener('click',event=>{if(event.target===ui.dialog)ui.dialog.close();});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeToc();if(event.target instanceof HTMLInputElement||ui.dialog.open)return;if(event.key==='ArrowLeft')step(-1);if(event.key==='ArrowRight')step(1);});

async function start(){
  setScale(state.scale);
  try{
    const response=await fetch('./content.json',{cache:'no-cache'});if(!response.ok)throw Error(`HTTP ${response.status}`);
    state.data=await response.json();
    if(state.data.total!==1335)throw Error('原句筆數驗證失敗');
    state.entries=state.data.stars.flatMap(star=>star.entries);
    for(const entry of state.entries)entry.searchText=normalize([entry.star,entry.chapter,entry.subsection,entry.original,...entry.parts.flatMap(part=>[part.plain,part.read])].join(' '));
    if(state.star!=='all'&&!state.data.stars.some(star=>star.name===state.star))state.star='紫微';
    renderStars();updateResults(true);
    if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  }catch(error){
    ui.heading.replaceChildren(create('span','eyebrow','LOAD ERROR'),create('h1','','教材暫時無法載入'));
    ui.source.textContent='請重新整理頁面；若仍無法開啟，請確認網路連線。';
    ui.count.textContent='載入失敗';
    ui.passages.replaceChildren();
    console.error(error);
  }
}
start();
