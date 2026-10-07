import {parseWenmoText,chartFromIztro,compareCharts,matchEntries} from './chart-match.js';
import {palaceFlights} from './palace-flight.js';

const $=id=>document.getElementById(id);
const ui={readerTab:$('view-reader'),pureTab:$('view-pure'),explainedTab:$('view-explained'),chartTab:$('view-chart'),astrolabeTab:$('view-astrolabe'),reader:$('reader-workspace'),stars:$('star-strip'),fullbook:$('fullbook-workspace'),chart:$('chart-workspace'),pageTitle:$('chart-page-title'),pageIntro:$('chart-page-intro'),submit:$('chart-submit'),form:$('chart-form'),calendar:$('birth-calendar'),date:$('birth-date'),time:$('birth-time'),gender:$('birth-gender'),leap:$('birth-leap'),leapOption:$('leap-option'),paste:$('wenmo-text'),file:$('wenmo-file'),import:$('wenmo-import'),status:$('chart-status'),result:$('chart-result'),summary:$('chart-summary'),grid:$('chart-grid'),flightHeading:$('flight-heading'),flightRule:$('flight-rule'),flightBasis:$('flight-basis'),flightResults:$('flight-results'),title:$('match-title'),method:$('match-method'),list:$('match-list'),filter:$('match-star-filter'),more:$('match-more')};
ui.wenmoPanel=$('wenmo-panel');ui.wenmoToggle=$('wenmo-toggle');
let referenceChart=null;
let wenmoChart=null;
let allMatches=[];
let shown=30;
let contentPromise=null;
let libraryPromise=null;
let activeChart=null;
let selectedBranch='';
let currentFlights=[];
let boardMode=matchMedia('(max-width: 700px)').matches?'fit':'zoom';
let boardScale=1;

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
  requestAnimationFrame(updateBoardMode);
  window.scrollTo({top:0,behavior:'instant'});
}
ui.readerTab.addEventListener('click',()=>switchView('reader'));
ui.pureTab.addEventListener('click',()=>switchView('fullbook'));
ui.explainedTab.addEventListener('click',()=>switchView('explained'));
ui.chartTab.addEventListener('click',()=>switchView('chart'));
ui.astrolabeTab.addEventListener('click',()=>switchView('astrolabe'));
ui.wenmoToggle.addEventListener('click',()=>{
  const open=ui.wenmoPanel.classList.toggle('is-open');
  ui.wenmoToggle.setAttribute('aria-expanded',open?'true':'false');
  ui.wenmoToggle.textContent=open?'收起匯入':'展開匯入';
});
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
  try{wenmoChart=parseWenmoText(ui.paste.value);await render();ui.wenmoPanel.classList.remove('is-open');ui.wenmoToggle.setAttribute('aria-expanded','false');ui.wenmoToggle.textContent='展開匯入';}
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
function selectPalace(chart,branch){
  const source=chart.palaces.find(palace=>palace.branch===branch);
  if(!source)return;
  selectedBranch=branch;
  currentFlights=palaceFlights(chart,source);
  ui.flightHeading.textContent=`${source.name}宮（${source.stem}${source.branch}）宮干四化`;
  const fromImport=chart.verified&&chart.fourTable?.[source.stem]?.length===4;
  ui.flightRule.textContent=fromImport?'依匯入的文墨四化資料':'依全書通行四化表';
  ui.flightBasis.textContent=fromImport?`化星依文墨文字盤所列的${source.stem}干「流年四化」對應表；落宮依匯入的十二宮星曜定位。此處是宮干飛化，不是生年四化。`:'此處的宮干飛化依預設四化表與目前盤面星曜定位，與固定的生年四化不同。若文墨天機另選四化表且匯出文字未列明，結果須以文墨設定核對。';
  const rows=document.createDocumentFragment();
  const centerRows=document.createDocumentFragment();
  centerRows.append(el('strong','',`${source.name}宮 ${source.stem}干飛化`));
  for(const flight of currentFlights){
    const destination=flight.target?`${flight.target.name}宮（${flight.target.stem}${flight.target.branch}）`:'盤內未列此星';
    const line=el('div',`flight-item fly-${flight.type}`);
    line.append(el('b','flight-type',`化${flight.type}`),el('span','flight-star',flight.star),el('span','flight-direction','→'),el('strong','flight-destination',destination));
    if(flight.self)line.append(el('em','flight-self','自化'));
    if(!flight.target)line.classList.add('flight-missing');
    rows.append(line);
    centerRows.append(el('div',`center-flight-row fly-${flight.type}`,`化${flight.type} ${flight.star} → ${flight.target?`${flight.target.name}宮${flight.self?'（自化）':''}`:'未定位'}`));
  }
  ui.flightResults.replaceChildren(rows);
  $('center-flight')?.replaceChildren(centerRows);
  for(const tile of ui.grid.querySelectorAll('.palace-tile')){
    const isSource=tile.dataset.branch===branch;
    tile.classList.toggle('palace-selected',isSource);
    tile.setAttribute('aria-pressed',isSource?'true':'false');
    tile.classList.toggle('palace-target',currentFlights.some(flight=>flight.target?.branch===tile.dataset.branch));
    for(const node of tile.querySelectorAll('[data-star]')){
      const flight=currentFlights.find(item=>item.target?.branch===tile.dataset.branch&&item.star===node.dataset.star);
      node.classList.toggle('flight-star-selected',!!flight);
      node.dataset.flightType=flight?.type||'';
    }
  }
  requestAnimationFrame(drawFlightLines);
}
function drawFlightLines(){
  const svg=ui.grid.querySelector('.fly-lines');
  const source=ui.grid.querySelector('.palace-selected');
  if(!svg||!source)return;
  const ns='http://www.w3.org/2000/svg';
  const colors={祿:'#b67a19',權:'#c53b39',科:'#13848f',忌:'#7949a3'};
  const make=(tag,attributes={})=>{const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));return node;};
  const width=ui.grid.clientWidth,height=ui.grid.clientHeight;
  if(!width||!height)return;
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  const defs=make('defs');
  for(const [type,color] of Object.entries(colors)){
    const marker=make('marker',{id:`fly-arrow-${type}`,markerWidth:8,markerHeight:8,refX:7,refY:4,orient:'auto',markerUnits:'strokeWidth'});
    marker.append(make('path',{d:'M 0 0 L 8 4 L 0 8 z',fill:color}));defs.append(marker);
  }
  const artwork=document.createDocumentFragment();artwork.append(defs);
  const board=ui.grid.getBoundingClientRect();
  const scale=document.body.classList.contains('astrolabe-mode')?boardScale:1;
  const rectOf=node=>{const r=node.getBoundingClientRect();return {cx:(r.left-board.left+r.width/2)/scale,cy:(r.top-board.top+r.height/2)/scale,w:r.width/scale,h:r.height/scale};};
  const a=rectOf(source);
  for(const [index,flight] of currentFlights.entries()){
    if(!flight.target||flight.self)continue;
    const target=[...ui.grid.querySelectorAll('.palace-tile')].find(tile=>tile.dataset.branch===flight.target.branch);
    if(!target)continue;
    const b=rectOf(target),dx=b.cx-a.cx,dy=b.cy-a.cy,length=Math.hypot(dx,dy)||1;
    const sourceScale=Math.min((a.w/2-13)/(Math.abs(dx)||Infinity),(a.h/2-13)/(Math.abs(dy)||Infinity));
    const targetScale=Math.min((b.w/2-13)/(Math.abs(dx)||Infinity),(b.h/2-13)/(Math.abs(dy)||Infinity));
    const x1=a.cx+dx*sourceScale,y1=a.cy+dy*sourceScale,x2=b.cx-dx*targetScale,y2=b.cy-dy*targetScale;
    const offset=(index-1.5)*16;
    const mx=(x1+x2)/2-dy/length*offset,my=(y1+y2)/2+dx/length*offset;
    artwork.append(make('path',{d:`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`,fill:'none',stroke:colors[flight.type],'stroke-width':2.6,'stroke-dasharray':'7 5','stroke-linecap':'round','marker-end':`url(#fly-arrow-${flight.type})`}));
  }
  svg.replaceChildren(artwork);
}
function updateBoardMode(){
  const scroller=$('chart-board-scroll');
  const board=ui.grid;
  const fit=document.body.classList.contains('astrolabe-mode')&&boardMode==='fit'&&activeChart&&scroller.clientWidth>0;
  board.style.transform='';scroller.style.height='';scroller.classList.toggle('board-fit',!!fit);
  boardScale=fit?Math.min(1,scroller.clientWidth/(board.scrollWidth||980)):1;
  if(fit){board.style.transform=`scale(${boardScale})`;scroller.style.height=`${Math.ceil(board.scrollHeight*boardScale)+2}px`;}
  $('board-fit').setAttribute('aria-pressed',boardMode==='fit'?'true':'false');
  $('board-zoom').setAttribute('aria-pressed',boardMode==='zoom'?'true':'false');
  document.querySelector('.chart-scroll-hint').textContent=boardMode==='fit'?'整盤總覽可看全局；點「放大閱讀」後可滑動查看星曜，點宮位看宮干四化。':'放大閱讀可左右滑動方盤；點「整盤總覽」可看完整十二宮。';
  requestAnimationFrame(drawFlightLines);
}
$('board-fit').addEventListener('click',()=>{boardMode='fit';updateBoardMode();});
$('board-zoom').addEventListener('click',()=>{boardMode='zoom';updateBoardMode();});
window.addEventListener('resize',()=>{if(activeChart)updateBoardMode();});
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(activeChart)requestAnimationFrame(drawFlightLines);}).observe(ui.grid);
function renderTimeline(chart){
  const timeline=$('chart-timeline'),decadeItems=$('decade-items'),yearItems=$('year-items');
  const decades=(chart.decades||[]).filter(d=>d.ageRange?.length===2);
  timeline.hidden=!decades.length;
  if(!decades.length)return;
  const buttons=[];
  const renderYears=decade=>{
    for(const button of buttons)button.setAttribute('aria-pressed',button.dataset.index===String(decade.index)?'true':'false');
    const years=document.createDocumentFragment();
    for(const item of decade.years||[]){
      const button=el('button','timeline-year',`${item.year}年 · ${item.age}歲`);
      button.type='button';button.title=item.stemBranch||'';
      button.addEventListener('click',()=>{
        for(const child of yearItems.children)child.setAttribute('aria-pressed','false');
        button.setAttribute('aria-pressed','true');
        const branch=item.palaceBranch;
        if(chart.palaces.some(p=>p.branch===branch))selectPalace(chart,branch);
      });years.append(button);
    }
    if(!decade.years?.length)years.append(el('span','timeline-unavailable','此文字盤未列逐年資料'));
    yearItems.replaceChildren(years);
  };
  const fragment=document.createDocumentFragment();
  for(const decade of decades){
    const button=el('button','timeline-decade',`${decade.ageRange[0]}–${decade.ageRange[1]}歲`);
    button.type='button';button.dataset.index=String(decade.index);button.title=`${decade.stemBranch||''} ${decade.yearRange?.join('–')||''}`;
    button.addEventListener('click',()=>{renderYears(decade);const branch=decade.branch||decade.stemBranch?.slice(-1);if(chart.palaces.some(p=>p.branch===branch))selectPalace(chart,branch);});
    buttons.push(button);fragment.append(button);
  }
  decadeItems.replaceChildren(fragment);renderYears(decades[0]);
  $('timeline-note').textContent=`${chart.verified?'大限與流年依匯入的文墨文字盤；點年份可選該年命宮':'大限與流年依開源參考規則；點年份只查看年份'}，不是事件預測。流月、流日與流時未計算。`;
}
function renderGrid(chart){
  const frag=document.createDocumentFragment();
  const positions={巳:[1,1],午:[1,2],未:[1,3],申:[1,4],辰:[2,1],酉:[2,4],卯:[3,1],戌:[3,4],寅:[4,1],丑:[4,2],子:[4,3],亥:[4,4]};
  const majorNames=new Set(['紫微','天機','太陽','武曲','天同','廉貞','天府','太陰','貪狼','巨門','天相','天梁','七殺','破軍']);
  for(const palace of chart.palaces){
    const tile=el('section','palace-tile');
    const [row,col]=positions[palace.branch]||[1,1];tile.style.gridRow=String(row);tile.style.gridColumn=String(col);
    tile.dataset.branch=palace.branch;
    tile.tabIndex=0;tile.setAttribute('role','button');tile.setAttribute('aria-pressed','false');
    tile.setAttribute('aria-label',`${palace.stem}${palace.branch} ${palace.name}宮，點選查看宮干四化`);
    tile.addEventListener('click',()=>selectPalace(chart,palace.branch));
    tile.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectPalace(chart,palace.branch);}});
    const head=el('h3','palace-head');head.append(el('span','',`${palace.name}宮${palace.body?' · 身宮':''}`),el('b','',`${palace.stem}${palace.branch}`));tile.append(head);
    const main=el('div','palace-stars');
    const majors=palace.stars.filter(s=>majorNames.has(s.name));
    if(!majors.length)main.append(el('span','empty-palace','無十四主星（空宮）'));
    for(const star of majors){
      const line=el('div','star-line');line.dataset.star=star.name;line.append(el('strong','',star.name));
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
        const item=el('span','',`${star.name}${star.brightness?` · ${star.brightness}`:''}`);item.dataset.star=star.name;
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
  for(const [label,value] of [['出生',chart.birth],['真太陽時',chart.trueSolarTime],['性別',chart.gender],['農曆',chart.lunar],['五行局',chart.fiveElementsClass],['命主',chart.soul],['身主',chart.bodyStar],['生年干',chart.yearStem]]){
    if(!value)continue;details.append(el('dt','',label),el('dd','',value));
  }
  center.append(details);
  if(chart.pillars){
    const pillars=el('div','center-pillars');pillars.append(el('small','','節氣四柱'));
    for(const pair of chart.pillars.trim().split(/\s+/).filter(part=>/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(part)))pillars.append(el('b','',pair));
    center.append(pillars);
  }
  const centerFlight=el('div','center-flight');centerFlight.id='center-flight';center.append(centerFlight);
  center.append(el('p','center-note',chart.verified?'宮位星曜依匯入文字盤；點宮位查看宮干飛化。':'開源規則參考盤；請與文墨原盤核對設定。'));
  frag.append(center);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('fly-lines');svg.setAttribute('aria-hidden','true');frag.append(svg);
  ui.grid.replaceChildren(frag);
  activeChart=chart;
  selectedBranch=chart.palaces.find(p=>p.name==='命')?.branch||chart.palaces[0]?.branch||'';
  selectPalace(chart,selectedBranch);
  renderTimeline(chart);
  requestAnimationFrame(updateBoardMode);
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
