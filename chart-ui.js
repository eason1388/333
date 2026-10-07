import {parseWenmoText,chartFromIztro,compareCharts,matchEntries} from './chart-match.js';

const $=id=>document.getElementById(id);
const ui={readerTab:$('view-reader'),pureTab:$('view-pure'),explainedTab:$('view-explained'),chartTab:$('view-chart'),reader:$('reader-workspace'),stars:$('star-strip'),fullbook:$('fullbook-workspace'),chart:$('chart-workspace'),form:$('chart-form'),calendar:$('birth-calendar'),date:$('birth-date'),time:$('birth-time'),gender:$('birth-gender'),leap:$('birth-leap'),leapOption:$('leap-option'),paste:$('wenmo-text'),file:$('wenmo-file'),import:$('wenmo-import'),status:$('chart-status'),result:$('chart-result'),summary:$('chart-summary'),grid:$('chart-grid'),title:$('match-title'),method:$('match-method'),list:$('match-list'),filter:$('match-star-filter'),more:$('match-more')};
let referenceChart=null;
let wenmoChart=null;
let allMatches=[];
let shown=30;
let contentPromise=null;
let libraryPromise=null;

function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function switchView(view){
  const chart=view==='chart';
  const fullbook=view==='fullbook'||view==='explained';
  ui.chart.hidden=!chart;ui.reader.hidden=view!=='reader';ui.stars.hidden=view!=='reader';ui.fullbook.hidden=!fullbook;
  ui.chartTab.setAttribute('aria-current',chart?'page':'false');
  ui.readerTab.setAttribute('aria-current',view==='reader'?'page':'false');
  ui.pureTab.setAttribute('aria-current',view==='fullbook'?'page':'false');
  ui.explainedTab.setAttribute('aria-current',view==='explained'?'page':'false');
  document.body.classList.toggle('chart-mode',chart);
  document.body.classList.toggle('fullbook-mode',fullbook);
  if(fullbook)window.dispatchEvent(new CustomEvent('fullbook-open',{detail:{mode:view}}));
  window.scrollTo({top:0,behavior:'instant'});
}
ui.readerTab.addEventListener('click',()=>switchView('reader'));
ui.pureTab.addEventListener('click',()=>switchView('fullbook'));
ui.explainedTab.addEventListener('click',()=>switchView('explained'));
ui.chartTab.addEventListener('click',()=>switchView('chart'));
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
  try{referenceChart=await calculateBirth();await render();}
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
  for(const palace of chart.palaces){
    const tile=el('section','palace-tile');
    const head=el('h3','',`${palace.name}宮`);head.append(el('span','',`${palace.stem}${palace.branch}`));tile.append(head);
    const major=palace.stars.filter(s=>['紫微','天機','太陽','武曲','天同','廉貞','天府','太陰','貪狼','巨門','天相','天梁','七殺','破軍'].includes(s.name));
    tile.append(el('p','',major.length?major.map(s=>`${s.name}${s.mutagen?`化${s.mutagen}`:''}`).join('、'):'空宮'));
    const others=palace.stars.filter(s=>['左輔','右弼','文昌','文曲','祿存','擎羊','陀羅','火星','鈴星','地空','地劫','天馬','天魁','天鉞'].includes(s.name));
    if(others.length)tile.append(el('small','',others.map(s=>s.name).join('、')));
    frag.append(tile);
  }
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
