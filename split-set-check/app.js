'use strict';
(()=>{
const E=SplitCheck,$=id=>document.getElementById(id);let files=[],expected=Object.create(null),version=0;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function invalidate(message){version++;$('copy').disabled=true;$('manual').disabled=true;$('output').value='';$('copy-state').textContent='';$('state').textContent=message;}
function reset(message){files=[];expected=Object.create(null);invalidate(message);$('groups').replaceChildren();$('unknown').replaceChildren();}
function render(){
 invalidate('검사 중');$('groups').replaceChildren();$('unknown').replaceChildren();
 try{
 const r=E.analyze(files,expected);$('state').textContent=`${r.files.length}개 선택 · ${r.groups.length}묶음 · 미인식 ${r.unknown.length}개`;
 for(const g of r.groups){
  const card=el('article');card.append(el('p',g.folder||'상대폴더 정보 없음','folder'),el('h3',g.pattern),el('span',g.status,'badge'));
  const label=el('label',undefined,'end'),name=el('span','기대 끝번호 (미상은 빈칸)'),input=el('input');input.type='text';input.inputMode='numeric';input.maxLength=12;input.value=g.expected;input.placeholder='예: 50';input.setAttribute('aria-label',g.pattern+' 기대 끝번호');
  input.addEventListener('input',()=>{expected[g.key]=input.value;invalidate('끝번호 변경 중 · 입력을 마치면 다시 계산합니다.');});
  const commit=()=>{if($('output').value==='')render();};
  input.addEventListener('change',commit);input.addEventListener('blur',commit);
  input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();commit();}});
  input.dataset.key=g.key;label.append(name,input);card.append(label);
  const metrics=el('div',undefined,'metrics');metrics.append(el('p',`관측 최대 ${g.max} · 선택 ${g.entries.length}개`),el('p',`누락 ${g.missingCount}개: ${E.rangeText(g.missing)}`),el('p','중복 번호: '+E.numberText(g.duplicates)),el('p','기대 초과: '+E.numberText(g.excess)),el('p',`범위 밖 번호 ${g.invalid.length}개 · 0바이트 ${g.zero.length}개`));card.append(metrics);
  if(g.end===null)card.append(el('p','끝번호 미상: 관측 최대까지만 비교했습니다. 마지막 조각이 빠졌는지는 알 수 없습니다.','warning'));
  if(Number.isNaN(g.end))card.append(el('p','끝번호는 1–999,999,999 사이 정수로 입력하거나 비워 두세요.','warning'));
  if(g.padding.length>1)card.append(el('p','번호 자릿수 혼재: 01·001은 같은 번호로 비교했습니다. 묶음 소속을 직접 확인하세요.','warning'));
  if(g.caseWarning)card.append(el('p','대소문자가 유사한 별도 묶음이 있습니다. 자동으로 합치지 않았습니다.','warning'));
  const details=el('details',undefined,'list');details.append(el('summary',`번호표 / 원문 파일명 (${g.entries.length}개)`));const list=el('ul');
  for(const f of g.entries.slice(0,E.LIMITS.rows)){const flags=[f.number===null?'범위 밖 '+f.digits:'번호 '+f.number,f.size+' bytes'];if(f.number!==null&&g.duplicates.includes(f.number))flags.push('중복');if(f.number!==null&&g.excess.includes(f.number))flags.push('기대 초과');if(!f.size)flags.push('0바이트');const li=el('li');li.append(el('span',f.relativePath||f.name,'filename'),el('br'),el('small',flags.join(' · ')));list.append(li);}details.append(list);if(g.entries.length>E.LIMITS.rows)details.append(el('p',`앞 ${E.LIMITS.rows}개 표시 / 전체 ${g.entries.length}개 검사`));card.append(details);$('groups').append(card);
 }
 if(r.unknown.length){const box=el('article');box.append(el('h3',`미인식 / 지원하지 않는 이름 ${r.unknown.length}개`));const ul=el('ul');for(const f of r.unknown.slice(0,E.LIMITS.rows))ul.append(el('li',(f.relativePath||f.name)+' · '+f.size+' bytes','filename'));box.append(ul);if(r.unknown.length>E.LIMITS.rows)box.append(el('p','앞 120개 표시 / 전체 미인식 파일을 집계했습니다.'));$('unknown').append(box);}
 $('output').value=E.report(r);const valid=r.files.length>0&&!r.groups.some(g=>Number.isNaN(g.end));$('copy').disabled=!valid;$('manual').disabled=!valid;
 }catch(e){$('state').textContent=e.message;$('groups').replaceChildren();$('unknown').replaceChildren();}
}
function receive(list){reset('파일 메타데이터를 확인합니다.');try{files=E.metadata(list);render();}catch(e){reset(e.message);}}
for(const id of ['files','folder']){const picker=$(id);picker.addEventListener('click',()=>{picker.value='';reset('파일 선택 대기 중 · 취소하면 결과는 비어 있습니다.');});picker.addEventListener('cancel',()=>reset('선택을 취소했습니다. 파일을 다시 선택하세요.'));picker.addEventListener('change',()=>receive(picker.files));}
$('sample').addEventListener('click',()=>{const sample=[];for(let i=1;i<=36;i++)sample.push({name:`여행.part${String(i).padStart(2,'0')}.rar`,size:1024,relativePath:`예시/여행/여행.part${String(i).padStart(2,'0')}.rar`});sample.push({name:'사진.7z.001',size:1024},{name:'사진.7z.003',size:0},{name:'설명.txt',size:24});receive(sample);const r=E.analyze(files);expected[r.groups[0].key]='50';render();$('state').textContent+=' · 합성 예시 (실제 압축본 아님)';});
$('clear').addEventListener('click',()=>{for(const id of ['files','folder'])$(id).value='';reset('비웠습니다. 메모리에 있던 선택 목록과 결과를 지웠습니다.');});
function manual(){if($('manual').disabled)return;$('output').focus();$('output').select();$('copy-state').textContent='결과를 선택했습니다. Ctrl+C 또는 길게 눌러 복사하세요.';}
$('manual').addEventListener('click',manual);
$('copy').addEventListener('click',async()=>{const token=version,text=$('output').value;$('copy-state').textContent='복사 중…';try{if(!navigator.clipboard?.writeText)throw new Error('manual');await navigator.clipboard.writeText(text);if(token===version)$('copy-state').textContent='현재 결과를 복사했습니다.';}catch{if(token===version){manual();$('copy-state').textContent='자동 복사가 허용되지 않았습니다. 선택된 텍스트를 Ctrl+C 또는 길게 눌러 복사하세요.';}}});
})();
