const textRoot=document.getElementById('fullbook-text');
const linksRoot=document.getElementById('fullbook-links');
const toc=document.getElementById('fullbook-toc');
let loading=null;

function node(tag,className,text){
  const element=document.createElement(tag);
  if(className)element.className=className;
  if(text!==undefined)element.textContent=text;
  return element;
}
function render(data){
  if(data.volumes?.length!==3||data.volumes.some(volume=>!volume.sections?.length))throw Error('古籍卷次資料不完整');
  const book=document.createDocumentFragment();
  const links=document.createDocumentFragment();
  for(const [volumeIndex,volume] of data.volumes.entries()){
    const volumeNode=node('section','fullbook-volume');
    volumeNode.id=`fullbook-volume-${volumeIndex+1}`;
    const volumeHeader=node('div','fullbook-volume-header');
    volumeHeader.append(node('span','fullbook-volume-kicker',`第 ${volumeIndex+1} 卷 / 共三卷`),node('h2','',volume.name));
    const source=node('a','fullbook-source','查看底本 · 維基文庫');
    source.href=volume.source;source.target='_blank';source.rel='noopener noreferrer';
    volumeHeader.append(source);volumeNode.append(volumeHeader);
    const volumeLink=node('a','fullbook-volume-link',volume.name);volumeLink.href=`#${volumeNode.id}`;links.append(volumeLink);
    for(const section of volume.sections){
      const sectionNode=node('section',`fullbook-section ${section.level}`);
      sectionNode.id=section.id;
      sectionNode.append(node(section.level==='chapter'?'h3':'h4','',section.title));
      for(const block of section.blocks){
        const content=node(block.type==='diagram'?'pre':'p',block.type==='diagram'?'fullbook-diagram':'fullbook-paragraph',block.text);
        sectionNode.append(content);
      }
      volumeNode.append(sectionNode);
      const link=node('a',section.level==='subchapter'?'fullbook-sub-link':'fullbook-chapter-link',section.title);
      link.href=`#${section.id}`;links.append(link);
    }
    book.append(volumeNode);
  }
  linksRoot.replaceChildren(links);
  textRoot.replaceChildren(book);
  toc.open=window.matchMedia('(min-width: 800px)').matches;
}
toc.addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#"]');
  if(link&&window.matchMedia('(max-width: 799px)').matches)toc.open=false;
});
window.addEventListener('fullbook-open',()=>{
  if(loading)return;
  loading=fetch('./fullbook.json',{cache:'no-cache'})
    .then(response=>{if(!response.ok)throw Error(`HTTP ${response.status}`);return response.json();})
    .then(render)
    .catch(error=>{textRoot.textContent='古籍全文暫時無法載入，請重新整理後再試。';console.error(error);loading=null;});
});
