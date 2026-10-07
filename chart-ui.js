import {parseWenmoText,chartFromIztro,compareCharts,matchEntries} from './chart-match.js';

const $=id=>document.getElementById(id);
const ui={readerTab:$('view-reader'),pureTab:$('view-pure'),explainedTab:$('view-explained'),chartTab:$('view-chart'),astrolabeTab:$('view-astrolabe'),reader:$('reader-workspace'),stars:$('star-strip'),fullbook:$('fullbook-workspace'),chart:$('chart-workspace'),pageTitle:$('chart-page-title'),pageIntro:$('chart-page-intro'),submit:$('chart-submit'),form:$('chart-form'),calendar:$('birth-calendar'),date:$('birth-date'),time:$('birth-time'),gender:$('birth-gender'),leap:$('birth-leap'),leapOption:$('leap-option'),paste:$('wenmo-text'),file:$('wenmo-file'),import:$('wenmo-import'),status:$('chart-status'),result:$('chart-result'),summary:$('chart-summary'),grid:$('chart-grid'),title:$('match-title'),method:$('match-method'),list:$('match-list'),filter:$('match-star-filter'),more:$('match-more')};
let referenceChart=null;
let wenmoChart=null;
let allMatches=[];
let shown=30;
let contentPromise=null;
let libraryPromise=null;

function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function switchView(view){
  const chart=view==='chart'||view==='astrolabe';
  const fullbook=view==='fullbook'||view==='explained';
  ui.chart.hidden=!chart;ui.reader.hidden=view!=='reader';ui.stars.hidden=view!=='reader';ui.fullbook.hidden=!fullbook;
  ui.chartTab.setAttribute('aria-current',view==='chart'?'page':'false');
  ui.astrolabeTab.setAttribute('aria-current',view==='astrolabe'?'page':'false');
  ui.readerTab.setAttribute('aria-current',view==='reader'?'page':'false');
  ui.pureTab.setAttribute('aria-current',view==='fullbook'?'page':'false');
  ui.explainedTab.setAttribute('aria-current',view==='explained'?'page':'false');
  document.body.classList.toggle('chart-mode',chart);
  document.body.classList.toggle('astrolabe-mode',view==='astrolabe');
  document.body.classList.toggle('fullbook-mode',fullbook);
  ui.pageTitle.textContent=view==='astrolabe'?'十二宮方盤':'命盤對照古書原句';
  ui.pageIntro.textContent=view==='astrolabe'?'仿傳統方盤布局，完整列出十二宮、星曜、生年四化、大限與小限。輸入出生資料先看參考盤；若要以文墨天機為準，請貼入它的「AI 描述／文字命盤」。':'輸入出生資料先取得參考盤；若要以文墨天機為準，可貼入它的「AI 描述」文字盤。系統只列出能指明宮位、同宮、地支等具體條件的原句，並交代對上的地方。';
  ui.submit.textContent=view==='astrolabe'?'排出十二宮方盤':'排盤並比對原文';
  ui.import.textContent=view==='astrolabe'?'匯入並顯示方盤':'匯入並核對';
  if(fullbook)window.dispatchEvent(new CustomEvent('fullbook-open',{detail:{mode:view}}));
  window.scrollTo({top:0,behavior:'instant'});
}
ui.readerTab.addEventListener('click',()=>switchView('reader'));
ui.pureTab.addEventListener('click',()=>switchView('fullbook'));
ui.explainedTab.addEventListener('click',()=>switchView('explained'));
ui.chartTab.addEventListener('click',()=>switchView('chart'));
ui.astrolabeTab.addEventListener('click',()=>switchView('astrolabe'));
ui.calendar.addEventListener('change',()=>{
  const lunar=ui.calendar.value==='lunar';
  ui.leapOption.hidden=!lunar;
  $('birth-date-label').textContent=lunar?'農曆年月日':'出生日期';
});
function setStatus(message,error=false){ui.status.textContent=message;ui.status.classList.toggle('error',error);}
function loadContent(){
  if(!contentPromise)contentPromise=fetch('./content.json').then(response=>{if(!response.ok)throw Error('古書原句資料暫時無法載入');return response.json();});
  return contentPromise;
}
function loadLibrary(){
  if(globalThis.iztro)return Promise.resolve(globalThis.iztro);
  if(!libraryPromise)libraryPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='./vendor/iztro-2.6.1.min.js';script.async=true;
    script.onload=()=>globalThis.iztro?resolve(globalThis.iztro):reject(Error('排盤程式未能載入'));
    script.onerror=()=>reject(Error('排盤程式未能載入，請確認網路連線後重試'));
    document.head.append(script);
  });
  return libraryPromise;
}
function timeIndex(value){const hour=Number(value.split(':')[0]);return hour===23?12:Math.floor((hour+1)/2);}
async function calculateBirth(){
  const date=ui.date.value,time=ui.time.value,gender=ui.gender.value;
  if(!date||!time||!gender)throw Error('請填妥出生年月日、時間與性別。');
  const library=await loadLibrary();
  let astrolabe;
  try{
    astrolabe=ui.calendar.value==='lunar'
      ?library.astro.byLunar(date,timeIndex(time),gender,ui.leap.checked,true,'zh-TW')
      :library.astro.bySolar(date,timeIndex(time),gender,true,'zh-TW');
  }catch{throw Error('這組日期無法排盤；請確認國曆／農曆、閏月及日期是否正確。');}
  if(!astrolabe?.palaces || astrolabe.palaces.length!==12)throw Error('排盤結果不完整，請檢查出生資料。');
  const chart=chartFromIztro(astrolabe);chart.birth=`${date} ${time}`;chart.gender=gender;
  return chart;
}
ui.form.addEventListener('submit',async event=>{
  event.preventDefault();setStatus('正在排盤與逐筆核對 1,335 筆索引…');
  try{referenceChart=await calculateBirth();wenmoChart=null;await render();}
  catch(error){setStatus(error.message,true);}
});
ui.file.addEventListener('change',async()=>{
  const file=ui.file.files?.[0];if(!file)return;
  if(file.size>2_000_000){setStatus('文字檔過大；請選擇文墨天機輸出的 .txt 檔。',true);return;}
  ui.paste.value=await file.text();setStatus(`已載入 ${file.name}；按「匯入並核對」開始比對。`);
});
ui.import.addEventListener('click',async()=>{
  setStatus('正在讀取文墨天機十二宮文字盤…');
  try{wenmoChart=parseWenmoText(ui.paste.value);await render();}
  catch(error){setStatus(error.message,true);}
});

function renderSummary(chart,comparison){
  ui.summary.replaceChildren();
  ui.summary.append(el('strong','',chart.verified?'文墨天機原盤・已匯入':'出生資料參考盤・未經文墨核對'));
  ui.summary.append(el('p','',`${chart.birth||'出生時間未列出'}${chart.gender?`・${chart.gender}`:''}${chart.lunar?`　農曆 ${chart.lunar}`:''}`));
  if(comparison){
    ui.summary.append(el('p',comparison.matched===12?'':'compare-warning',`與自動參考盤核對：十二宮宮位與十四主星 ${comparison.matched}/12 宮一致。${comparison.matched===12?'結果仍以匯入的文墨盤為準。':'不一致的宮位仍以文墨盤為準。'}`));
    for(const difference of comparison.differences)ui.summary.append(el('p','compare-warning',difference));
  }
}
function renderGrid(chart){
  const frag=document.createDocumentFragment();
  const positions={巳:[1,1],午:[1,2],未:[1,3],申:[1,4],辰:[2,1],酉:[2,4],卯:[3,1],戌:[3,4],寅:[4,1],丑:[4,2],子:[4,3],亥:[4,4]};
  const majorNames=new Set(['紫微','天機','太陽','武曲','天同','廉貞','天府','太陰','貪狼','巨門','天相','天梁','七殺','破軍']);
  for(const palace of chart.palaces){
    const tile=el('section','palace-tile');
    const [row,col]=positions[palace.branch]||[1,1];tile.style.gridRow=String(row);tile.style.gridColumn=String(col);
    tile.setAttribute('aria-label',`${palace.stem}${palace.branch} ${palace.name}宮`);
    const head=el('h3','palace-head');head.append(el('span','',`${palace.name}宮${palace.body?' · 身宮':''}`),el('b','',`${palace.stem}${palace.branch}`));tile.append(head);
    const main=el('div','palace-stars');
    const majors=palace.stars.filter(s=>majorNames.has(s.name));
    if(!majors.length)main.append(el('span','empty-palace','無十四主星（空宮）'));
    for(const star of majors){
      const line=el('div','star-line');line.append(el('strong','',star.name));
      if(star.brightness)line.append(el('span','star-brightness',star.brightness));
      const mutations=[...new Set([...(star.mutagen?[`生年${star.mutagen}`]:[]),...(star.tags||[]).filter(tag=>/^(生年|[↑↓])[祿權科忌]$/.test(tag))])];
      for(const mutation of mutations)line.append(el('span',`star-mutation mutagen-${mutation.slice(-1)}`,mutation));
      main.append(line);
    }
    tile.append(main);
    const others=palace.stars.filter(s=>!majorNames.has(s.name));
    if(others.length){
      const row=el('div','palace-other');
      for(const star of others){
        const item=el('span','',`${star.name}${star.brightness?` · ${star.brightness}`:''}`);
        row.append(item);
        const mutations=[...new Set([...(star.mutagen?[`生年${star.mutagen}`]:[]),...(star.tags||[]).filter(tag=>/^(生年|[↑↓])[祿權科忌]$/.test(tag))])];
        for(const mutation of mutations)row.append(el('span',`star-mutation mutagen-${mutation.slice(-1)}`,mutation));
      }
      tile.append(row);
    }
    const footer=el('div','palace-footer');
    if(palace.decadal?.length===2)footer.append(el('div','',`大限　${palace.decadal[0]}–${palace.decadal[1]} 歲`));
    if(palace.smallAges?.length)footer.append(el('div','',`小限　${palace.smallAges.join('、')}`));
    if(palace.annualAges?.length)footer.append(el('div','',`流年　${palace.annualAges.join('、')}`));
    if(palace.changsheng)footer.append(el('div','palace-changsheng',`十二長生　${palace.changsheng}`));
    tile.append(footer);
    frag.append(tile);
  }
  const center=el('section','chart-center');center.style.gridRow='2 / 4';center.style.gridColumn='2 / 4';
  center.append(el('div','center-kicker','抱朴隨緣堂 · 紫微斗數'));
  center.append(el('h2','','十二宮命盤'));
  center.append(el('p','center-source',chart.verified?'文墨天機文字盤 · 已匯入':'開源規則參考盤 · 未經文墨核對'));
  const details=el('dl','center-details');
  for(const [label,value] of [['出生',chart.birth],['性別',chart.gender],['農曆',chart.lunar],['五行局',chart.fiveElementsClass],['命主',chart.soul],['身主',chart.bodyStar],['生年干',chart.yearStem]]){
    if(!value)continue;details.append(el('dt','',label),el('dd','',value));
  }
  center.append(details);
  center.append(el('p','center-note',chart.verified?'宮位與星曜依匯入的文墨文字盤顯示；飛化箭頭僅照錄原始標記，不另推算。':'依輸入鐘錶時間試排；閏月、晚子時、真太陽時與文墨設定可能不同，請以文墨原盤核對。'));
  frag.append(center);
  ui.grid.replaceChildren(frag);
}
function renderFilters(){
  const previous=ui.filter.value;
  const stars=[...new Set(allMatches.flatMap(result=>result.indexes))];
  ui.filter.replaceChildren(new Option('全部主星','all'),...stars.map(star=>new Option(star,star)));
  if(stars.includes(previous))ui.filter.value=previous;
}
function buildCard(result){
  const {entry,evidence,indexes}=result;
  const card=el('details','match-card');
  const summary=el('summary','');
  const meta=el('div','match-meta');
  meta.append(el('span','match-tag',evidence[0].type),el('span','',`${entry.vol}・${entry.chapter}・來源行 ${entry.line}`),el('span','',`索引：${indexes.join('、')}`));
  summary.append(meta,el('strong','',evidence.map(item=>item.reason).join('；')),el('span','match-preview',entry.original.slice(0,110)+(entry.original.length>110?'…':'')));
  card.append(summary);
  const detail=el('div','match-detail');
  detail.append(el('h4','','原文'),el('p','',entry.original));
  for(const [index,part] of entry.parts.entries()){
    if(!part.plain&&!part.read)continue;
    detail.append(el('h4','',entry.parts.length>1?`第 ${index+1} 段白話`:'白話翻譯'));
    if(part.plain)detail.append(el('p','',part.plain));
    if(part.read)detail.append(el('p','caution',`判讀提示：${part.read}`));
  }
  detail.append(el('p','caution','此處只核對可讀出的本命結構條件；原句若另有限年、吉凶、職業、疾病等附加條件，仍須逐句人工判讀，不能當成事件已發生。'));
  const open=el('button','','回到電子書看完整原句');open.type='button';
  open.addEventListener('click',()=>{switchView('reader');window.dispatchEvent(new CustomEvent('open-ebook-entry',{detail:{id:entry.id,star:entry.star}}));});
  detail.append(open);card.append(detail);
  return card;
}
function renderList(){
  const selected=ui.filter.value;
  const filtered=allMatches.filter(result=>selected==='all'||result.indexes.includes(selected));
  ui.title.textContent=`局部對上命盤的原句・${filtered.length} 筆`;
  const frag=document.createDocumentFragment();
  for(const result of filtered.slice(0,shown))frag.append(buildCard(result));
  if(!filtered.length)frag.append(el('p','chart-status','目前沒有可依這張本命盤明確核對的原句；請換一顆主星或檢查文墨命盤。'));
  ui.list.replaceChildren(frag);
  ui.more.hidden=shown>=filtered.length;
}
ui.filter.addEventListener('change',()=>{shown=30;renderList();});
ui.more.addEventListener('click',()=>{shown+=30;renderList();});

async function render(){
  const chart=wenmoChart||referenceChart;
  if(!chart)return;
  const data=await loadContent();
  if(data.total!==1335)throw Error('原句資料筆數不符，已停止比對。');
  const matches=matchEntries(chart,data);
  allMatches=matches.results;shown=30;
  renderSummary(chart,wenmoChart?compareCharts(referenceChart,wenmoChart):null);
  renderGrid(chart);renderFilters();renderList();
  ui.method.textContent=`已掃描全部 ${matches.scanned.toLocaleString('zh-TW')} 筆索引，重複收錄的同一原句合併顯示。以下只代表原句中可指出的部分本命結構對上，不代表整句所有前提或吉凶結論成立；泛論、隱含格局及未實作的三方四正／大限流年不列為自動符合。${chart.verified?'目前以匯入的文墨天機盤面為準。':'這是參考盤，請匯入文墨天機原盤再確認。'}`;
  ui.result.hidden=false;
  setStatus(chart.verified?`文墨天機文字盤已辨識十二宮；列出 ${matches.unique} 筆可核對的原句。`:`參考盤已排出；列出 ${matches.unique} 筆候選原句，尚未以文墨天機核對。`);
}
