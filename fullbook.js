const textRoot=document.getElementById('fullbook-text');
const linksRoot=document.getElementById('fullbook-links');
const toc=document.getElementById('fullbook-toc');
const kicker=document.getElementById('fullbook-kicker');
const heading=document.getElementById('fullbook-heading');
const intro=document.getElementById('fullbook-intro');
let originalPromise=null;
let explainedPromise=null;
let requestedMode='fullbook';
function readingEdition(sectionId,text){
  if(sectionId!=='v一-19')return text;
  return text.replaceAll('，欺瞞天地','').replaceAll('，交人初善終惡','');
}

async function fetchJson(url){
  const response=await fetch(url,{cache:'no-cache'});
  if(!response.ok)throw Error(`${url}: HTTP ${response.status}`);
  return response.json();
}
function verifyExplained(data,translation){
  if(data.sourceDigest!==translation.sourceDigest)throw Error('白話資料與原文版本不符');
  const units=data.volumes.flatMap(volume=>volume.sections.flatMap(section=>section.units));
  const missing=units.filter(unit=>!translation.entries?.[unit.id]?.plain?.trim());
  if(missing.length)throw Error(`尚有 ${missing.length} 段原文未接白話`);
}

function node(tag,className,text){
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(text!==undefined)element.textContent=text;
  return element;
}
function render(data,mode='fullbook',translation=null,originalData=data){
  if(data.volumes?.length!==3||data.volumes.some(volume=>!volume.sections?.length))throw Error('古籍卷次資料不完整');
  const explained=mode==='explained';
  const book=document.createDocumentFragment();
  const links=document.createDocumentFragment();
  for(const [volumeIndex,volume] of data.volumes.entries()){
    const volumeNode=node('section','fullbook-volume');
    volumeNode.id=`fullbook-volume-${volumeIndex+1}`;
    const volumeHeader=node('div','fullbook-volume-header');
    volumeHeader.append(node('span','fullbook-volume-kicker',`第 ${volumeIndex+1} 卷 / 共三卷`),node('h2','',volume.name));
    const source=node('a','fullbook-source','查看底本 · 維基文庫');
    source.href=originalData.volumes[volumeIndex].source;source.target='_blank';source.rel='noopener noreferrer';
    volumeHeader.append(source);volumeNode.append(volumeHeader);
    const volumeLink=node('a','fullbook-volume-link',volume.name);volumeLink.href=`#${volumeNode.id}`;links.append(volumeLink);
    for(const section of volume.sections){
      const sectionNode=node('section',`fullbook-section ${section.level}`);
      sectionNode.id=section.id;
      sectionNode.append(node(section.level==='chapter'?'h3':'h4','',section.title));
      if(explained){
        for(const unit of section.units){
          const pair=node('div','fullbook-pair');
          pair.append(node('div','fullbook-pair-label','古籍原文'));
          pair.append(node(unit.type==='diagram'?'pre':'p',unit.type==='diagram'?'fullbook-diagram':'fullbook-paragraph',readingEdition(section.id,unit.original)));
          pair.append(node('div','fullbook-pair-label explanation-label','詳細白話'));
          pair.append(node('p','fullbook-explanation',translation.entries[unit.id].plain));
          sectionNode.append(pair);
        }
      }else{
        for(const block of section.blocks){
          const content=node(block.type==='diagram'?'pre':'p',block.type==='diagram'?'fullbook-diagram':'fullbook-paragraph',readingEdition(section.id,block.text));
          sectionNode.append(content);
        }
      }
      volumeNode.append(sectionNode);
      const link=node('a',section.level==='subchapter'?'fullbook-sub-link':'fullbook-chapter-link',section.title);
      link.href=`#${section.id}`;links.append(link);
    }
    book.append(volumeNode);
  }
  linksRoot.replaceChildren(links);
  textRoot.replaceChildren(book);
  kicker.textContent=explained?'ORIGINAL & EXPLANATION · THREE VOLUMES':'ORIGINAL TEXT · THREE VOLUMES';
  heading.textContent=explained?'《紫微斗數全書》逐段白話':'《紫微斗數全書》原文';
  intro.textContent=explained?'卷一至卷三依原書次序閱讀，每段原文後接白話。巨門篇有兩處依讀者要求刪節；需核對無刪原文，請點各卷的維基文庫底本。':'卷一至卷三依篇章次序閱讀，不按主星拆句。巨門篇有兩處依讀者要求刪節；需核對無刪原文，請點各卷的維基文庫底本。';
  toc.open=window.matchMedia('(min-width: 800px)').matches;
}
toc.addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#"]');
  if(link&&window.matchMedia('(max-width: 799px)').matches)toc.open=false;
});
window.addEventListener('fullbook-open',async event=>{
  requestedMode=event.detail?.mode==='explained'?'explained':'fullbook';
  const mode=requestedMode;
  textRoot.textContent=mode==='explained'?'正在載入原文與逐段白話…':'正在載入卷一至卷三原文…';
  try{
    if(!originalPromise)originalPromise=fetchJson('./fullbook.json');
    if(mode==='explained'){
      if(!explainedPromise)explainedPromise=Promise.all([fetchJson('./fullbook-units.json'),fetchJson('./fullbook-explanations.json')]);
      const [originalData,[data,translation]]=await Promise.all([originalPromise,explainedPromise]);
      verifyExplained(data,translation);
      if(requestedMode===mode)render(data,mode,translation,originalData);
    }else{
      const data=await originalPromise;
      if(requestedMode===mode)render(data);
    }
  }catch(error){
    if(requestedMode===mode)textRoot.textContent=mode==='explained'?'逐段白話尚未備妥，請先閱讀「古籍全文」。':'古籍全文暫時無法載入，請重新整理後再試。';
    console.error(error);
    if(mode==='explained')explainedPromise=null;
    else originalPromise=null;
  }
});
