const SIMPLIFIED = {'宫':'宮','阴':'陰','阳':'陽','机':'機','贞':'貞','贪':'貪','门':'門','军':'軍','杀':'殺','迁':'遷','财':'財','仆':'僕','禄':'祿','权':'權','会':'會','对':'對','马':'馬','铃':'鈴','罗':'羅','辅':'輔','弼':'弼','钺':'鉞','庙':'廟','岁':'歲','儿':'兒','书':'書','台':'臺','宫':'宮','临':'臨','夹':'夾','见':'見','冲':'沖','怀':'懷','身':'身'};
const clean = text => String(text ?? '').normalize('NFKC').replace(/[\u4e00-\u9fff]/g, char => SIMPLIFIED[char] || char).replace(/\s+/g, '');
const PALACES = ['命','兄弟','夫妻','子女','財帛','疾厄','遷移','交友','官祿','田宅','福德','父母'];
const MAJORS = ['紫微','天機','太陽','武曲','天同','廉貞','天府','太陰','貪狼','巨門','天相','天梁','七殺','破軍'];
const OTHER_STARS = ['左輔','右弼','文昌','文曲','祿存','擎羊','陀羅','火星','鈴星','地空','地劫','天馬','天魁','天鉞'];
const STARS = [...MAJORS, ...OTHER_STARS];
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

function palaceName(value){
  const name=clean(value).replace(/宮$/,'');
  return ['僕役','奴僕'].includes(name)?'交友':name==='身命'?'命':name;
}
function starName(value){return clean(value).replace(/星$/,'');}
function parseStarField(value){
  if(!value || clean(value)==='無')return [];
  return value.split(/[，,]/).map(part=>{
    const name=starName(part.split('[')[0]);
    const tags=[...part.matchAll(/\[([^\]]+)\]/g)].map(match=>clean(match[1]));
    return {name,brightness:tags.find(tag=>/^(廟|旺|得|利|平|陷|不)$/.test(tag))||'',mutagen:tags.find(tag=>/^生年[祿權科忌]$/.test(tag))?.slice(-1)||'',tags};
  }).filter(star=>star.name);
}
export function parseWenmoText(text){
  text=String(text||'').replace(/\r\n?|\n/g,'\n');
  if(text.length>2_000_000)throw Error('貼上的文字過長，請改用文墨天機原始 AI 描述文字。');
  const begin=text.indexOf('├命盤十二宮');
  const end=text.indexOf('├大限流年信息',begin+1);
  if(begin<0 || end<0)throw Error('找不到「命盤十二宮」與「大限流年信息」兩個區段；請貼上文墨天機的完整 AI 描述文字。');
  const palaces=[];
  let current=null;
  for(const line of text.slice(begin,end).split(/\r?\n/)){
    const heading=line.match(/[├└]([^\[\r\n]+?)宮\[([甲乙丙丁戊己庚辛壬癸])([子丑寅卯辰巳午未申酉戌亥])\]/);
    if(heading){
      const name=palaceName(heading[1]);
      if(!PALACES.includes(name))continue;
      current={name,stem:heading[2],branch:heading[3],body:line.includes('[身宮]'),stars:[],decadal:null,smallAges:[],annualAges:[],changsheng:''};
      palaces.push(current);
      continue;
    }
    if(!current)continue;
    const field=line.match(/[├└](主星|輔星|小星)\s*[:：]\s*(.*)/);
    if(field)current.stars.push(...parseStarField(field[2]));
    const decade=line.match(/[├└]大限\s*[:：]\s*(\d+)\s*[~～－-]\s*(\d+)/);
    if(decade)current.decadal=[Number(decade[1]),Number(decade[2])];
    const ages=line.match(/[├└](小限|流年)\s*[:：]\s*([\d,，、\s]+)/);
    if(ages)current[ages[1]==='小限'?'smallAges':'annualAges']=ages[2].split(/[,，、\s]+/).map(Number).filter(Number.isFinite);
    const changsheng=line.match(/[├└]十二長生\s*[:：]\s*([^\s│]+)/);
    if(changsheng)current.changsheng=clean(changsheng[1]);
  }
  const names=new Set(palaces.map(p=>p.name));
  if(palaces.length!==12 || names.size!==12 || palaces.some(p=>!p.stars.length))throw Error('文字盤沒有完整辨識出十二宮星曜；請確認貼入的是完整原文，而不是截斷的畫面文字。');
  const birth=text.match(/鐘錶時間\s*[:：]\s*([^\r\n]+)/)?.[1]?.trim()||'';
  const lunar=text.match(/農曆時間\s*[:：]\s*([^\r\n]+)/)?.[1]?.trim()||'';
  const gender=text.match(/性[别別]\s*[:：]\s*([男女])/)?.[1]||'';
  const yearStem=lunar.match(/^([甲乙丙丁戊己庚辛壬癸])/)?.[1]||text.match(/節氣四柱\s*[:：]\s*([甲乙丙丁戊己庚辛壬癸])/)?.[1]||'';
  const fiveElementsClass=text.match(/五行局數\s*[:：]\s*([^\r\n]+)/)?.[1]?.trim()||'';
  const soul=text.match(/命主\s*[:：]\s*([^;；\s\r\n]+)/)?.[1]||'';
  const bodyStar=text.match(/身主\s*[:：]\s*([^;；\s\r\n]+)/)?.[1]||'';
  const fourTable={};const conflictingStems=new Set();let flowStem='';
  for(const line of text.slice(end).split('\n')){
    const year=line.match(/\d{4}年\[([甲乙丙丁戊己庚辛壬癸])[子丑寅卯辰巳午未申酉戌亥]\]/);
    if(year)flowStem=year[1];
    const flow=line.match(/流年四化\s*[:：]\s*([^\n]+)/);
    if(!flow||!flowStem)continue;
    const entries=flow[1].split(/[,，、]/).map(part=>clean(part).replace(/[│└├─]/g,'').match(/^([\u4e00-\u9fff]{2,3})([祿權科忌])$/));
    if(entries.length!==4||entries.some((entry,index)=>!entry||entry[2]!=='祿權科忌'[index]))continue;
    const stars=entries.map(entry=>entry[1]);
    if(conflictingStems.has(flowStem))continue;
    if(fourTable[flowStem]&&fourTable[flowStem].join(',')!==stars.join(',')){delete fourTable[flowStem];conflictingStems.add(flowStem);}
    else if(!fourTable[flowStem])fourTable[flowStem]=stars;
  }
  return {source:'wenmo',verified:true,birth,lunar,gender,yearStem,fiveElementsClass,soul,bodyStar,fourTable,palaces};
}
export function chartFromIztro(astrolabe){
  const palaces=astrolabe.palaces.map(p=>({
    name:palaceName(p.name),stem:clean(p.heavenlyStem),branch:clean(p.earthlyBranch),body:!!p.isBodyPalace,
    decadal:p.decadal?.range||null,smallAges:p.ages||[],annualAges:[],changsheng:clean(p.changsheng12),
    stars:[...p.majorStars,...p.minorStars,...p.adjectiveStars].map(s=>({name:starName(s.name),brightness:clean(s.brightness),mutagen:clean(s.mutagen),tags:[]}))
  }));
  return {source:'reference',verified:false,birth:astrolabe.solarDate,lunar:astrolabe.lunarDate,gender:'',yearStem:clean(astrolabe.chineseDate).slice(0,1),fiveElementsClass:clean(astrolabe.fiveElementsClass),soul:clean(astrolabe.soul),bodyStar:clean(astrolabe.body),palaces};
}
export function compareCharts(reference,wenmo){
  if(!reference || !wenmo)return null;
  const differences=[];
  for(const real of wenmo.palaces){
    const draft=reference.palaces.find(p=>p.name===real.name);
    const major=palace=>palace.stars.filter(s=>MAJORS.includes(s.name)).map(s=>s.name).sort().join('、');
    if(!draft || draft.branch!==real.branch || major(draft)!==major(real))differences.push(`${real.name}宮：文墨 ${real.branch}・${major(real)||'空宮'}；參考 ${draft?.branch||'未排出'}・${draft?major(draft)||'空宮':'—'}`);
  }
  return {matched:12-differences.length,differences};
}

function placeOf(chart,name){return chart.palaces.find(p=>p.stars.some(s=>s.name===name));}
function starIn(palace,name){return palace?.stars.find(s=>s.name===name);}
function starTokens(text){
  const names=new Set(STARS.filter(name=>text.includes(name)));
  if(text.includes('輔弼')||text.includes('左右')){names.add('左輔');names.add('右弼');}
  if(text.includes('昌曲')){names.add('文昌');names.add('文曲');}
  if(text.includes('紫府')){names.add('紫微');names.add('天府');}
  if(text.includes('日月')){names.add('太陽');names.add('太陰');}
  if(text.includes('羊陀')){names.add('擎羊');names.add('陀羅');}
  if(text.includes('火鈴')){names.add('火星');names.add('鈴星');}
  if(text.includes('空劫')){names.add('地空');names.add('地劫');}
  return [...names];
}
function matchClause(chart,entry,clause){
  const quote=clean(clause);
  const anchor=starName(entry.star);
  const base=placeOf(chart,anchor);
  if(!base || (entry.group==='scattered' && !quote.includes(anchor) && !starTokens(quote).includes(anchor)))return [];
  const original=clean(entry.original);
  const stemCondition=original.match(/([甲乙丙丁戊己庚辛壬癸]{1,4})(?:年)?生人|([甲乙丙丁戊己庚辛壬癸])人/);
  if(stemCondition && ![...(stemCondition[1]||stemCondition[2])].includes(chart.yearStem))return [];
  if(/女命|女人/.test(quote) && chart.gender==='男' && !/男命|男人/.test(quote))return [];
  if(/男命|男人/.test(quote) && chart.gender==='女' && !/女命|女人/.test(quote))return [];
  if(/無(?:諸)?殺|不見(?:惡|煞|殺)/.test(quote) && base.stars.some(s=>['擎羊','陀羅','火星','鈴星','地空','地劫'].includes(s.name)))return [];
  const evidence=[];
  const placement=quote.match(/(?:在|居|守|臨|坐|入|落)(命|兄弟|夫妻|子女|財帛|疾厄|遷移|交友|僕役|奴僕|官祿|田宅|福德|父母)(?:宮|位)?/);
  if(placement && quote[placement.index-1]!=='不'){
    const target=palaceName(placement[1]);
    const nearby=starTokens(quote.slice(Math.max(0,placement.index-8),placement.index));
    if(base.name===target && nearby.every(name=>placeOf(chart,name)?.name===target))evidence.push({type:'宮位',reason:`${anchor}在${target}宮（${base.branch}宮），對上原文的宮位條件`});
  }
  const palaceFirst=quote.match(new RegExp(`(命|兄弟|夫妻|子女|財帛|疾厄|遷移|交友|僕役|奴僕|官祿|田宅|福德|父母)宮?(?:有|見|遇|逢|坐|守|臨)${anchor}`));
  if(palaceFirst && base.name===palaceName(palaceFirst[1]))evidence.push({type:'宮位',reason:`${base.name}宮有${anchor}（${base.branch}宮）`});
  const branch=quote.match(/([子丑寅卯辰巳午未申酉戌亥])(?:宮|位)(?:入廟|得地|廟|旺|陷)?/);
  const allBranches=quote.match(/[子丑寅卯辰巳午未申酉戌亥](?:宮|位)/g)||[];
  if(branch && allBranches.length===1 && base.branch===branch[1]){
    const bright=branch[0].includes('廟')?'廟':branch[0].includes('旺')?'旺':branch[0].includes('陷')?'陷':'';
    if(!bright || starIn(base,anchor)?.brightness===bright)evidence.push({type:'地支',reason:`${anchor}落${base.branch}宮${bright?`且為${bright}`:''}`});
  }
  const branchChoice=quote.match(/(?:在|居|守|坐|臨)([子丑寅卯辰巳午未申酉戌亥]{2,4})(?:宮|位)?(?:入廟|廟|旺|陷)?/);
  if(branchChoice && !/(?:命|身命)(?:坐|居|在|守|臨)[子丑寅卯辰巳午未申酉戌亥]/.test(quote) && [...branchChoice[1]].includes(base.branch)){
    const bright=branchChoice[0].includes('廟')?'廟':branchChoice[0].includes('旺')?'旺':branchChoice[0].includes('陷')?'陷':'';
    if(!bright || starIn(base,anchor)?.brightness===bright)evidence.push({type:'地支',reason:`${anchor}落${base.branch}宮，符合原文所列${branchChoice[1]}的地支條件`});
  }
  const same=quote.match(/(?:同宮|同垣|同度|同位|同行|同居|同鄉)/);
  if(same && !/(?:無|不見|未見|不逢).{0,12}(?:同宮|同垣|同度|同位|同行|同居|同鄉)/.test(quote)){
    const near=quote.slice(Math.max(0,same.index-18),same.index);
    const names=starTokens(near);
    if(entry.group==='dedicated' && !names.includes(anchor))names.push(anchor);
    if(names.includes(anchor) && names.length>=2 && names.every(name=>placeOf(chart,name)?.branch===base.branch)){
      evidence.push({type:'同宮',reason:`${names.join('、')}同在${base.name}宮（${base.branch}宮）`});
    }
  }
  const mutagen=quote.match(new RegExp(`${anchor}(?:星)?(?:生年)?化([祿權科忌])`));
  if(mutagen && starIn(base,anchor)?.mutagen===mutagen[1])evidence.push({type:'生年四化',reason:`${anchor}生年化${mutagen[1]}，落${base.name}宮`});
  return evidence;
}
export function matchEntries(chart,data){
  const found=new Map();
  let scanned=0;
  for(const star of data.stars)for(const entry of star.entries){
    scanned++;
    const evidence=entry.original.split(/[。；;，,]/).flatMap(clause=>matchClause(chart,entry,clause));
    if(!evidence.length)continue;
    const key=[entry.vol,entry.chapter,entry.line,clean(entry.original)].join('|');
    if(!found.has(key))found.set(key,{entry,entriesByStar:{},indexes:new Set(),evidence:[]});
    const record=found.get(key);record.indexes.add(entry.star);record.entriesByStar[entry.star]=entry;
    for(const item of evidence)if(!record.evidence.some(existing=>existing.reason===item.reason))record.evidence.push(item);
  }
  const results=[...found.values()].map(record=>({...record,indexes:[...record.indexes]}));
  results.sort((a,b)=>b.evidence.length-a.evidence.length || a.entry.line-b.entry.line);
  return {scanned,unique:results.length,results};
}
