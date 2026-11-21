/* Map-only presentation. Does not mutate progress, ship plans, coordinates or images. */
(function(root){
'use strict';
const rankTitles=new WeakMap();
// One clock for the currently rendered workshop; never stores or collects voyages.
let countdownTimer=null,countdownRows=[],countdownFleet=null,countdownStateKey='';
function countdownText(returnAt,now){
 if(!Number.isFinite(returnAt)||returnAt<=0)return '—';
 const seconds=Math.max(0,Math.ceil((returnAt-now)/1000));
 if(!seconds)return '可收船';
 return [Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
}
function updateCountdowns(){
 const now=Date.now();
 for(const row of countdownRows){
  const sailing=row.workshop.sailings?.[row.index];
  const text=sailing?countdownText(sailing.returnAt,now):(row.workshop.ships[row.index]?.enabled===false?'未開啟':'可派遣');
  if(row.element.textContent!==text){
   row.element.textContent=text;
  }
  row.element.hidden=false;
  row.element.classList.toggle('status-ready',text==='可派遣');
  row.element.classList.toggle('status-due',text==='可收船');
 }
 // All sailings in this workshop count, even off-map or hidden route layers.
 const workshop=countdownFleet?.workshop();
 const signature=workshop?JSON.stringify([workshop.id,workshop.sailings.map(record=>record?[record.returnAt,record.returnAt<=now]:null)]):'';
 if(signature!==countdownStateKey){countdownStateKey=signature;countdownFleet?.refreshShipStatuses();root.SubNodeUI?.render();root.SubVoyageUI?.refreshShipState();}
}
function stopClock(){if(countdownTimer!==null){clearInterval(countdownTimer);countdownTimer=null;}}
function startClock(){stopClock();updateCountdowns();if(countdownTimer===null&&countdownFleet?.workshop()?.sailings?.some(Boolean))countdownTimer=setInterval(updateCountdowns,1000);}
root.addEventListener('pagehide',stopClock);
root.addEventListener('pageshow',startClock);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopClock();else startClock();});
const palette=['#36e5ff','#ffb347','#d7a0ff','#ff80b5'];
const milestones={deep:{J:'第 2 船位',O:'第 3 船位',T:'第 4 船位',AD:'通往灰海'},ash:{R:'通往翠浪海'},jade:{T:'通往妖歌海'},siren:{T:'通往紫礁海'},lilac:{T:'通往南蒼茫洋'},south:{T:'7.3 主線終點'}};
const kindOf=(map,code)=>map==='deep'&&['J','O','T'].includes(code)?'slot':map==='south'?'endpoint':'gateway';
function progress(fleet,item,map,code){
 if(item.visited?.[map]?.[code]===true)return {symbol:'✓',label:'探索過'};
 const state=fleet.nodeState(fleet.maps.find(m=>m.id===map),code);
 return state==='opened'?{symbol:'●',label:'已開啟'}:state==='available'?{symbol:'＋',label:'可開啟'}:state==='locked'?{symbol:'×',label:'版本未開放'}:{symbol:'○',label:'未登記開啟'};
}
function render({fleet,previewRoute=null}){
 const w=fleet.workshop(),ship=w.ships[w.activeVoyageShip],m=fleet.currentMap(),svg=document.querySelector('#route-overlay');
 const voyage=w.voyages[w.activeVoyageShip];
 const plannedNodes=new Set(voyage?.map===m.id&&w.layers['ship-'+w.activeVoyageShip]!==false?voyage.nodes:[]);
 document.querySelectorAll('#map-hotspots [data-node]').forEach(el=>{
  const code=el.dataset.node,node=m.nodes.find(n=>n.code===code),label=milestones[m.id]?.[code];
  if(label){
   el.dataset.milestone=label;el.dataset.milestoneKind=kindOf(m.id,code);el.classList.add('milestone-node');
   if(!el.getAttribute('aria-label').includes(label))el.setAttribute('aria-label',el.getAttribute('aria-label')+'，'+label);
   let short=el.querySelector('.node-milestone-short');
   if(!short){short=document.createElement('span');short.className='node-milestone-short';short.setAttribute('aria-hidden','true');el.append(short);}
   short.textContent=m.id==='deep'&&['J','O','T'].includes(code)?({J:'2船',O:'3船',T:'4船'}[code]):m.id==='south'?'終點':'新圖';
   el.querySelector('.node-progress-badge')?.remove();
   const status=progress(fleet,w,m.id,code);
   if(status.symbol!=='✓'&&status.symbol!=='●'){const badge=document.createElement('span');badge.className='node-progress-badge';const glyph=status.symbol==='＋'?'<path d="M10 5.5v9M5.5 10h9"/>':status.symbol==='×'?'<path d="m6.5 6.5 7 7m0-7-7 7"/>':'<circle class="badge-glyph-ring" cx="10" cy="10" r="3.5"/>';badge.innerHTML='<svg viewBox="0 0 20 20" focusable="false" aria-hidden="true"><circle cx="10" cy="10" r="9"/>'+glyph+'</svg>';badge.title=status.label;badge.setAttribute('aria-hidden','true');el.append(badge);}
  }
  // Presentation is rebuilt for the current boat, including on repeated renders.
  el.classList.remove('rank-short','rank-required');
  el.querySelectorAll('.node-rank-badge').forEach(badge=>badge.remove());
  const previous=rankTitles.get(el);
  if(previous&&el.getAttribute('title')===previous.applied){
   if(previous.original===null)el.removeAttribute('title');else el.setAttribute('title',previous.original);
  }
  rankTitles.delete(el);
  el.classList.toggle('current-voyage-node',plannedNodes.has(code)&&!el.disabled);
  if(node&&node.rank>ship.rank&&!el.disabled){
   el.classList.add('rank-required');
   const original=el.getAttribute('title'),required='需要 Rank '+node.rank+'；目前 '+ship.rank;
   const applied=original?original+'；'+required:required;
   rankTitles.set(el,{original,applied});el.title=applied;
   const badge=document.createElement('span');badge.className='node-rank-badge';badge.setAttribute('aria-hidden','true');
   badge.innerHTML='<svg viewBox="0 0 12 14" focusable="false" aria-hidden="true"><path d="M3 6V4a3 3 0 0 1 6 0v2"/><rect x="1.5" y="6" width="9" height="7" rx="1.5"/><path class="rank-keyhole" d="M6 8.5v2"/></svg><span>R'+node.rank+'</span>';
   el.append(badge);
  }
 });
 svg.querySelectorAll('[data-v47-overlay],[data-map-ui]').forEach(el=>el.remove());
 const defs='<defs data-map-ui>'+palette.map((c,i)=>'<marker id="arrow-'+i+'" markerWidth="3" markerHeight="3" refX="2.6" refY="1.5" orient="auto"><path d="M0 0 L3 1.5 L0 3Z" fill="'+c+'"/></marker>').join('')+'<marker id="arrow-preview" markerWidth="3" markerHeight="3" refX="2.6" refY="1.5" orient="auto"><path d="M0 0 L3 1.5 L0 3Z" fill="#e5ad35"/></marker></defs>';
 svg.insertAdjacentHTML('afterbegin',defs);
 svg.querySelectorAll('.ship-path').forEach(el=>{const n=Number([...el.classList].find(c=>/^ship-path-\d$/.test(c))?.split('-').pop())-1;if(n<0||n>3)return;el.style.markerEnd='url(#arrow-'+n+')';el.setAttribute('transform','translate('+[-4,-1,2,5][n]+','+[-4,-1,2,5][n]+')');});
 svg.querySelectorAll('.ship-path').forEach(el=>{const halo=el.cloneNode(false);halo.setAttribute('class','route-path route-halo');halo.setAttribute('data-map-ui','');halo.removeAttribute('style');svg.insertBefore(halo,svg.querySelector('.ship-path'));});
 const path=svg.querySelector('.recommended-path');if(path)path.style.markerEnd='url(#arrow-preview)';
 let index=document.querySelector('#map-layer-index');
 if(!index){index=document.createElement('section');index.id='map-layer-index';index.className='map-layer-index';index.setAttribute('aria-label','海圖里程碑與各船航線');document.querySelector('.map-frame').after(index);}
 index.replaceChildren();document.querySelector('#map-milestone-help')?.replaceChildren();
 const marks=document.createElement('div');marks.className='map-milestone-index';
 for(const [code,label] of Object.entries(milestones[m.id]||{})){
  const status=progress(fleet,w,m.id,code),button=document.createElement('button');button.type='button';button.dataset.milestoneKind=kindOf(m.id,code);button.dataset.nodeState=fleet.nodeState(m,code);button.textContent=code+' · '+label+' '+status.symbol;button.setAttribute('aria-label','在海圖選取 '+code+'，'+label+'，'+status.label);button.title=status.label;
  button.addEventListener('click',()=>{const node=document.querySelector('[data-node="'+code+'"]');if(node&&!node.disabled){fleet.workshop().selectedNode=code;window.SubNodeUI?.show({focus:true});}});marks.append(button);
 }
 if(marks.childElementCount){
  const legend=document.createElement('p');legend.className='map-milestone-legend';
  legend.innerHTML='<span><i data-milestone-kind="slot" aria-hidden="true"></i>未開 · 紅色 J／O／T 船位</span><span><i data-milestone-kind="gateway" aria-hidden="true"></i>未開 · 青色新圖地點</span>'+(m.id==='south'?'<span><i data-milestone-kind="endpoint" aria-hidden="true"></i>未開 · 金色 7.3 主線終點</span>':'');
  const help=document.querySelector('#map-milestone-help');if(help)help.replaceChildren(legend);
  index.append(marks);
 }
 countdownRows=[];countdownFleet=fleet;
 const routes=document.createElement('ul');routes.className='map-route-index';
 function row(label,nodes,color,shipIndex=null,planOnly=false){const li=document.createElement('li'),name=document.createElement('strong'),sequence=document.createElement('span');li.style.setProperty('--route-color',color);name.textContent=label;sequence.textContent=(planOnly?'計畫：':'')+nodes.join(' → ');li.title=label+(shipIndex!==null?'計畫：':'：')+nodes.map((c,i)=>(i+1)+'. '+c).join(' → ');li.append(name,sequence);if(shipIndex!==null){const time=document.createElement('span');time.className='map-ship-countdown';time.setAttribute('aria-label',label+'船況或返航倒數');li.append(time);countdownRows.push({element:time,workshop:w,index:shipIndex});}routes.append(li);}
 if(previewRoute?.map===m.id&&w.layers.recommended!==false)row('推薦預覽 · '+((previewRoute.shipIndex??w.activeVoyageShip)+1)+' 號艇',previewRoute.nodes,'#e5ad35');
 w.voyages.forEach((v,i)=>{if(v.map!==m.id||!v.nodes.length||w.layers['ship-'+i]===false)return;const sailing=w.sailings?.[i],recorded=sailing?root.SubLogbook?.snapshotRoute(sailing):null;const planOnly=!!sailing&&(!recorded||recorded.map.id!==v.map||recorded.nodes.join('|')!==v.nodes.join('|'));row((i+1)+' 號艇',v.nodes,palette[i],i,planOnly);});
 if(routes.childElementCount)index.append(routes);
 index.hidden=!index.childElementCount;
 startClock();
}
root.SubMapUI={render};
})(window);
