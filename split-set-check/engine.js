'use strict';
(function(root){
const LIMITS = Object.freeze({files:2000,groups:100,name:512,path:1024,number:999999999,rows:120,output:200000});
function fail(message){throw new Error(message);}
function metadata(list){
 if(!Number.isInteger(list.length)||list.length>LIMITS.files) fail('파일은 한 번에 2,000개까지 선택하세요. 일부만 검사하지 않았습니다.');
 return Array.from(list,f=>{
  const name=f.name, size=f.size, relative=f.webkitRelativePath||f.relativePath||'';
  if(typeof name!=='string'||!name.length||name.length>LIMITS.name||/[\\/]/.test(name)||typeof relative!=='string'||relative.length>LIMITS.path||!Number.isSafeInteger(size)||size<0) fail('파일 메타데이터 제한을 벗어났습니다. 이름 512자·상대경로 1,024자 이내만 받습니다.');
  if(relative && !relative.endsWith('/'+name)) fail('상대경로와 파일명이 일치하지 않습니다.');
  return Object.freeze({name,size,relativePath:relative,folder:relative?relative.slice(0,-name.length):''});
 });
}
function parse(name){
 let m=/^(.+)\.part(\d+)\.(rar)$/i.exec(name);
 if(m) return {base:m[1],marker:name.slice(m[1].length,name.length-m[2].length-4),extension:name.slice(-4),digits:m[2],format:'RAR part'};
 m=/^(.+)\.(7z|zip)\.(\d+)$/i.exec(name);
 if(m) return {base:m[1],marker:'.',extension:'.'+m[2],digits:m[3],format:m[2].toLowerCase()+' split'};
 return null;
}
function gaps(numbers,end){
 let next=1, missing=0;const ranges=[];
 for(const n of numbers){if(n<1||n>end) continue;if(n>next){ranges.push([next,n-1]);missing+=n-next;}next=n+1;}
 if(next<=end){ranges.push([next,end]);missing+=end-next+1;}return {ranges,missing};
}
function analyze(list,expected={}){
 const files=metadata(list), map=new Map(),unknown=[];
 for(const f of files){
  const p=parse(f.name);if(!p){unknown.push(f);continue;}
  const key=JSON.stringify([f.folder,p.base,p.marker,p.extension]);
  let g=map.get(key);if(!g){if(map.size>=LIMITS.groups) fail('묶음은 한 번에 100개까지입니다. 일부만 검사하지 않았습니다.');g={key,folder:f.folder,base:p.base,pattern:p.format==='RAR part'?p.base+p.marker+'번호'+p.extension:p.base+p.extension+'.번호',format:p.format,entries:[],padding:new Set()};map.set(key,g);}
  const n=p.digits.length<=12?Number(p.digits):NaN;
  const valid=Number.isSafeInteger(n)&&n>=1&&n<=LIMITS.number;
  g.entries.push({...f,digits:p.digits,number:valid?n:null});g.padding.add(p.digits.length);
 }
 const groups=Array.from(map.values(),g=>{
  const raw=Object.prototype.hasOwnProperty.call(expected,g.key)?String(expected[g.key]):'';
  const end=raw===''?null:/^[1-9]\d{0,8}$/.test(raw)?Number(raw):NaN;
  const counts=new Map();for(const e of g.entries)if(e.number!==null)counts.set(e.number,(counts.get(e.number)||0)+1);
  const numbers=[...counts.keys()].sort((a,b)=>a-b),max=numbers.at(-1)||0;
  const missing=gaps(numbers,Number.isNaN(end)?0:end??max);
  const duplicates=numbers.filter(n=>counts.get(n)>1),invalid=g.entries.filter(e=>e.number===null),zero=g.entries.filter(e=>e.size===0),excess=end!==null&&!Number.isNaN(end)?numbers.filter(n=>n>end):[];
  const status=Number.isNaN(end)?'기대 끝번호 입력 오류':missing.missing||duplicates.length||invalid.length||zero.length||excess.length?'확인 필요':end===null?'끝번호 미상':'지정 범위 번호 충족';
  return {...g,padding:[...g.padding],expected:raw,end,max,numbers,missing:missing.ranges,missingCount:missing.missing,duplicates,invalid,zero,excess,status};
 });
 // Exact names/case remain separate; only warn about possible confusion.
 const similar=new Map();for(const g of groups){let k=JSON.stringify([g.folder.toLowerCase(),g.base.toLowerCase(),g.format]);let a=similar.get(k)||[];a.push(g);similar.set(k,a);}
 for(const a of similar.values())for(const g of a)g.caseWarning=a.length>1;
 return {files,groups,unknown};
}
function rangeText(ranges,cap=120){return ranges.length?ranges.slice(0,cap).map(([a,b])=>a===b?String(a):a+'–'+b).join(', ')+(ranges.length>cap?' … ('+ranges.length+'구간, 앞 '+cap+'개 표시)':''):'없음';}
function numberText(numbers){return rangeText(numbers.map(n=>[n,n]));}
function report(result){
 const lines=['빠진 조각 찾기 1.0','파일 내용 읽기 0 · 이름/크기/상대폴더만 검사','내용 손상·복구·추출 성공은 판정하지 않습니다.','선택 '+result.files.length+'개 / 묶음 '+result.groups.length+'개 / 미인식 '+result.unknown.length+'개'];
 for(const g of result.groups){lines.push('',JSON.stringify((g.folder||'(상대폴더 정보 없음) / ')+g.pattern),g.status+' · 기대 끝번호 '+(g.expected||'미상')+' · 관측 최대 '+g.max,'누락 '+g.missingCount+'개: '+rangeText(g.missing),'중복 번호: '+numberText(g.duplicates),'기대 초과: '+numberText(g.excess),'범위 밖 번호 '+g.invalid.length+'개 / 0바이트 '+g.zero.length+'개');if(g.end===null)lines.push('끝번호 미상: 관측 최대까지의 빈 번호만 확인. 마지막 조각 누락 여부는 알 수 없습니다.');if(g.padding.length>1)lines.push('번호 자릿수 혼재: 같은 번호는 중복으로 표시. 묶음 소속은 직접 확인하세요.');if(g.caseWarning)lines.push('대소문자 또는 상대폴더 대소문자가 유사한 별도 묶음이 있습니다. 합치지 않았습니다.');
  for(const e of g.entries.slice(0,LIMITS.rows))lines.push(JSON.stringify(e.relativePath||e.name)+' | 번호 '+(e.number??('범위 밖 '+e.digits))+' | '+e.size+' bytes');if(g.entries.length>LIMITS.rows)lines.push('목록 앞 '+LIMITS.rows+'개 표시 / 전체 '+g.entries.length+'개 검사');
 }
 if(result.unknown.length){lines.push('','미인식/지원하지 않는 이름');for(const f of result.unknown.slice(0,LIMITS.rows))lines.push(JSON.stringify(f.relativePath||f.name)+' | '+f.size+' bytes');if(result.unknown.length>LIMITS.rows)lines.push('앞 '+LIMITS.rows+'개 표시 / 전체 '+result.unknown.length+'개');}
 const out=lines.join('\n');return out.length>LIMITS.output?out.slice(0,LIMITS.output-90)+'\n[출력 상한: 앞부분만 표시. 묶음을 나누어 다시 선택하세요.]':out;
}
const api={LIMITS,metadata,parse,gaps,analyze,rangeText,numberText,report};if(typeof module!=='undefined')module.exports=api;else root.SplitCheck=api;
})(typeof globalThis!=='undefined'?globalThis:this);
