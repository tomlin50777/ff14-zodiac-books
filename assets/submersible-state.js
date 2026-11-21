/* Local-only state. v46 source keys are never overwritten. */
(function(root){
'use strict';
const maxRank=root.SubVoyageData.rankCap;
const KEY='ff14-submersible-workshops-v47', OLD='ff14-submersible-workshops-v3', LEGACY='ff14-submersible-fleet-v2';
const object=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
const str=(x,f='',n=80)=>typeof x==='string'?x.slice(0,n):f;
const int=(x,min,max,f)=>Number.isInteger(Number(x))&&Number(x)>=min&&Number(x)<=max?Number(x):f;
function sanitize(source,index,maps){
 const s=object(source), id=/^[a-zA-Z0-9_-]{1,100}$/.test(s.id||'')?s.id:'workshop-'+index;
 const out={id,name:str(s.name,index===1?'主工房':'工房 '+index,24),note:str(s.note,'',40),color:['blue','green','purple','red','gold'].includes(s.color)?s.color:'blue',flagship:int(s.flagship,0,3,0),activeVoyageShip:int(s.activeVoyageShip,0,3,0),map:maps.some(m=>m.id===s.map)?s.map:'deep',selectedNode:str(s.selectedNode,'',3),opened:{},visited:{},layers:{},ships:[],voyages:[],sailings:[]};
 out.slotUnlocked=[true,...[1,2,3].map(i=>s.slotUnlocked?.[i]===true)];out.plannerGoal=['auto','unlock','level','gil','item','manual','explore'].includes(s.plannerGoal)?s.plannerGoal:'auto';out.collectionTarget=str(s.collectionTarget,'',100);out.cadenceHours=int(s.cadenceHours??24,0,168,24);out.plannerHours=[0,24,36,48,72].includes(Number(s.plannerHours))?Number(s.plannerHours):0;
 for(const m of maps){out.opened[m.id]={};for(const n of m.nodes)if(object(object(s.opened)[m.id])[n.code]===true)out.opened[m.id][n.code]=true;}
 for(const m of maps){out.visited[m.id]={};for(const n of m.nodes)if(object(object(s.visited)[m.id])[n.code]===true&&out.opened[m.id][n.code]===true)out.visited[m.id][n.code]=true;}
 for(const k of ['recommended','ship-0','ship-1','ship-2','ship-3'])out.layers[k]=object(s.layers)[k]!==false;
 for(let i=0;i<4;i++){
  const p=object(Array.isArray(s.ships)?s.ships[i]:null);
  const plannerPreference=p.plannerGoal??s.plannerGoal??(['auto','unlock','level','gil','item','manual','explore'].includes(p.goal)?p.goal:'auto');
  out.ships.push({requiredStops:Array.isArray(p.requiredStops)?p.requiredStops.filter(x=>x&&typeof x.map==='string'&&typeof x.code==='string').map(x=>({map:str(x.map,'',20),code:str(x.code,'',3)})):[],collectionTarget:str(p.collectionTarget??s.collectionTarget,'',100),plannerGoal:['auto','unlock','level','gil','item','manual','explore'].includes(plannerPreference)?plannerPreference:'auto',enabled:p.enabled===true,rank:int(p.rank,1,maxRank,null),build:/^[1-5]{4}$/.test(p.build||'')?p.build:'',goal:['auto','unlock','level','gil','item','manual','explore'].includes(plannerPreference)?plannerPreference:'auto',modified:Array.from({length:4},(_,j)=>p.modified?.[j]===true)});
  const v=object(Array.isArray(s.voyages)?s.voyages[i]:null),map=maps.find(m=>m.id===v.map);
  out.voyages.push({map:map?.id||'',nodes:map&&Array.isArray(v.nodes)?[...new Set(v.nodes.filter(c=>map.nodes.some(n=>n.code===c)))].slice(0,5):[]});
  const t=object(Array.isArray(s.sailings)?s.sailings[i]:null);
  out.sailings.push(Number.isFinite(t.returnAt)&&t.returnAt>0&&t.returnAt<8640000000000000?{returnAt:t.returnAt,departAt:Number.isFinite(t.departAt)?t.departAt:null,source:['estimate','remaining','clock'].includes(t.source)?t.source:'clock',snapshot:t.snapshot==null?null:{routeRecorded:object(t.snapshot).routeRecorded===true||(object(t.snapshot).routeRecorded!==false&&Number.isFinite(t.departAt)&&t.departAt>0),rank:int(object(t.snapshot).rank,1,maxRank,null),build:/^[1-5]{4}$/.test(object(t.snapshot).build||'')?object(t.snapshot).build:'',modified:Array.isArray(object(t.snapshot).modified)&&object(t.snapshot).modified.length===4&&object(t.snapshot).modified.every(x=>typeof x==='boolean')?[...object(t.snapshot).modified]:null,map:str(object(t.snapshot).map,'',20),nodes:Array.isArray(object(t.snapshot).nodes)?object(t.snapshot).nodes.filter(n=>typeof n==='string'&&/^[A-Z]{1,2}$/.test(n)).slice(0,5):[]},recordedAt:Number.isFinite(t.recordedAt)?t.recordedAt:null}:null);
 }
 return out;
}
function load(storage,maps,fresh){
 let warning='';
 for(const k of [KEY,OLD,LEGACY]){
  let raw;try{raw=storage.getItem(k);}catch(e){return {state:fresh(),warning:'瀏覽器不允許本機儲存；目前變更只保留到關閉頁面。'};}
  if(!raw)continue;
  try{
   const parsed=JSON.parse(raw), list=k===LEGACY?(Array.isArray(parsed?.ships)?[parsed]:null):parsed?.workshops;
   if(!Array.isArray(list)||!list.length)throw Error('shape');
   const workshops=list.map((s,i)=>sanitize(s,i+1,maps));
   const ids=new Set();workshops.forEach((w,i)=>{if(ids.has(w.id))w.id='recovered-'+i;ids.add(w.id);});
   if(k!==KEY){try{if(!storage.getItem(KEY+'-original-'+k))storage.setItem(KEY+'-original-'+k,raw);}catch(e){warning='舊版仍原樣保留，但備份空間不足；請先匯出備份。';}}
   return {state:{selectedId:workshops.some(w=>w.id===parsed.selectedId)?parsed.selectedId:workshops[0].id,workshops},warning:warning||(k!==KEY?'已從舊版移入；舊版原始資料保留不變。':'')};
  }catch(e){warning='偵測到損壞的儲存內容，原始內容已保留；請匯出備份後檢查。';try{if(!storage.getItem(KEY+'-damaged-'+k))storage.setItem(KEY+'-damaged-'+k,raw);}catch(_){} }
 }
 return {state:fresh(),warning};
}
function remaining(h,m,now=Date.now()){h=Number(h);m=Number(m);if(!Number.isInteger(h)||h<0||h>10000||!Number.isInteger(m)||m<0||m>59||h*60+m<=0)return null;return now+(h*60+m)*60000;}
function localTime(value){if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value))return null;const d=new Date(value);if(!Number.isFinite(+d))return null;const pad=n=>String(n).padStart(2,'0');const back=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());return back===value?+d:null;}
const api={KEY,OLD,LEGACY,sanitize,load,remaining,localTime};root.SubState=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
