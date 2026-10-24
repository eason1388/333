import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../reading-terms.js',import.meta.url),'utf8');
const {getReadingTerms,appendReadingTerms}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('financial patterns identify both the star and the exact palace arrangement',()=>{
  const found=getReadingTerms('財居財位。日月夾財。');
  assert.match(found.find(x=>x.term==='財居財位').meaning,/武曲坐財帛宮/);
  const pattern=found.find(x=>x.term==='日月夾財').meaning;
  assert.match(pattern,/天府守未宮財帛宮/);
  assert.match(pattern,/太陽在午、太陰在申/);
  assert.match(pattern,/武曲守命/);
});

test('palace addresses, palace topics and geometric relations stay distinct',()=>{
  const found=getReadingTerms('命宮在子，財帛宮在申；三方四正、對宮、夾命、同宮。');
  for(const term of ['命宮','財帛宮','人事宮與地支宮','三方四正','對宮／沖照','夾宮','同宮／同垣'])assert(found.some(x=>x.term===term),term);
  assert.match(found.find(x=>x.term==='三方四正').meaning,/財在申、官在辰、遷移在午/);
});

test('all twelve life-topic palaces receive an explanation',()=>{
  const found=getReadingTerms('命宮、兄弟宮、夫妻宮、子女宮、財帛宮、疾厄宮、遷移宮、交友宮、官祿宮、田宅宮、福德宮、父母宮');
  for(const term of ['命宮','兄弟宮','夫妻宮','子女宮','財帛宮','疾厄宮','遷移宮','交友／奴僕宮','官祿宮','田宅宮','福德宮','父母宮'])assert(found.some(x=>x.term===term),term);
});

test('simplified source text resolves to the same definitions without duplication',()=>{
  const found=getReadingTerms('日月夹财 日月夾財 财帛宫 文耗居寅卯 辅弼夹帝');
  assert.equal(found.filter(x=>x.term==='日月夾財').length,1);
  assert(found.some(x=>x.term==='財帛宮'));
  assert.match(found.find(x=>x.term==='文耗／眾水朝東').meaning,/文曲.*破軍/);
  assert(found.some(x=>x.term==='輔弼夾帝'));
});

test('vague favorable-position language gets the named star’s actual branch addresses',()=>{
  const found=getReadingTerms('武曲得位，廉贞入庙。');
  assert.match(found.find(x=>x.term==='武曲得位地支（卷三表）').meaning,/廟：辰、戌、丑、未/);
  assert.match(found.find(x=>x.term==='廉貞得位地支（卷三表）').meaning,/廟：寅、申/);
  assert(!getReadingTerms('武曲掌財').some(x=>x.term.includes('得位地支')));
});

test('the star-position entries retain every category and address in the book table',async()=>{
  const book=JSON.parse(await readFile(new URL('../fullbook-units.json',import.meta.url),'utf8'));
  const convert=s=>s.replace(/[贪狠贞军阳阴门机杀庙罗铃无]/g,c=>({'贪':'貪','狠':'狼','贞':'貞','军':'軍','阳':'陽','阴':'陰','门':'門','机':'機','杀':'殺','庙':'廟','罗':'羅','铃':'鈴','无':'無'})[c]);
  const clean=s=>convert(s).replace(/[\s：；、。]/g,'');
  let verified=0;
  for(const volume of book.volumes)for(const section of volume.sections){
    if(section.id!=='v三-20')continue;
    for(const unit of section.units){
      const row=unit.original.trim();
      if(!/^\S+\s+庙[子丑寅卯辰巳午未申酉戌亥]/.test(row))continue;
      const star=convert(row.split(/\s+/)[0]);
      const note=getReadingTerms(`${star}得位`).find(x=>x.term===`${star}得位地支（卷三表）`);
      assert(note,star);
      assert.equal(clean(note.meaning),clean(row.slice(row.indexOf(' '))),star);
      verified++;
    }
  }
  assert.equal(verified,20);
});

test('notes are readable text and do not modify the source passage',()=>{
  class Element{
    constructor(tag){this.tag=tag;this.children=[];this.textContent='';}
    append(...children){this.children.push(...children);}
    setAttribute(name,value){this[name]=value;}
  }
  globalThis.document={createElement:tag=>new Element(tag)};
  try{
    const parent=new Element('div');
    appendReadingTerms(parent,'財居財位');
    assert.equal(parent.children.length,1);
    const section=parent.children[0];
    assert.equal(section['aria-label'],'本段星曜與宮位說明');
    const list=section.children[1];
    assert.equal(list.children[0].tag,'dt');
    assert.equal(list.children[1].tag,'dd');
    assert.match(list.children[1].textContent,/武曲坐財帛宮/);
    appendReadingTerms(parent,'天地玄黃');
    assert.equal(parent.children.length,1);
  }finally{delete globalThis.document;}
});
