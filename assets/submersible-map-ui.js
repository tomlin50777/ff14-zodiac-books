/* Map-only presentation. Does not mutate progress, ship plans, coordinates or images. */
(function(root){
'use strict';
const palette=['#36e5ff','#ffb347','#d7a0ff','#ff80b5'];
const milestones={deep:{J:'第 2 船位',O:'第 3 船位',T:'第 4 船位',AD:'通往灰海'},ash:{R:'通往翠浪海'},jade:{T:'通往妖歌海'},siren:{T:'通往紫礁海'},lilac:{T:'通往南蒼茫洋'},south:{M:'7.2 終點'}};
function render({fleet,previewRoute=null}){
 const w=fleet.workshop(),ship=w.ships[w.activeVoyageShip],m=fleet.currentMap(),svg=document.querySelector('#route-overlay');
 document.querySelectorAll('[data-node]').forEach(el=>{
  const code=el.dataset.node,node=m.nodes.find(n=>n.code===code),label=milestones[m.id]?.[code];
  if(label){
   el.dataset.milestone=label;el.classList.add('milestone-node');
   if(!el.getAttribute('aria-label').includes(label))el.setAttribute('aria-label',el.getAttribute('aria-label')+'，'+label);
   let short=el.querySelector('.node-milestone-short');
   if(!short){short=document.createElement('span');short.className='node-milestone-short';short.setAttribute('aria-hidden','true');el.append(short);}
   short.textContent=m.id==='deep'&&['J','O','T'].includes(code)?({J:'2船',O:'3船',T:'4船'}[code]):m.id==='south'?'上限':'新圖';
  }
  if(node&&node.rank>ship.rank&&!el.disabled){el.classList.add('rank-short');el.title='需要 Rank '+node.rank+'；目前 '+ship.rank;}
 });
 svg.querySelectorAll('[data-v47-overlay],[data-map-ui]').forEach(el=>el.remove());
 const defs='<defs data-map-ui>'+palette.map((c,i)=>'<marker id="arrow-'+i+'" markerWidth="3" markerHeight="3" refX="2.6" refY="1.5" orient="auto"><path d="M0 0 L3 1.5 L0 3Z" fill="'+c+'"/></marker>').join('')+'<marker id="arrow-preview" markerWidth="3" markerHeight="3" refX="2.6" refY="1.5" orient="auto"><path d="M0 0 L3 1.5 L0 3Z" fill="#e5ad35"/></marker></defs>';
 svg.insertAdjacentHTML('afterbegin',defs);
 svg.querySelectorAll('.ship-path').forEach(el=>{const n=Number([...el.classList].find(c=>/^ship-path-\d$/.test(c))?.split('-').pop())-1;if(n<0||n>3)return;el.style.markerEnd='url(#arrow-'+n+')';el.setAttribute('transform','translate('+[-4,-1,2,5][n]+','+[-4,-1,2,5][n]+')');});
 svg.querySelectorAll('.ship-path').forEach(el=>{const halo=el.cloneNode(false);halo.setAttribute('class','route-path route-halo');halo.setAttribute('data-map-ui','');halo.removeAttribute('style');svg.insertBefore(halo,svg.querySelector('.ship-path'));});
 const path=svg.querySelector('.recommended-path');if(path)path.style.markerEnd='url(#arrow-preview)';
 let index=document.querySelector('#map-layer-index');
 if(!index){index=document.createElement('section');index.id='map-layer-index';index.className='map-layer-index';index.setAttribute('aria-label','海圖里程碑與各船航線');document.querySelector('.map-frame').after(index);}
 index.replaceChildren();
 const marks=document.createElement('div');marks.className='map-milestone-index';
 for(const [code,label] of Object.entries(milestones[m.id]||{})){
  const button=document.createElement('button');button.type='button';button.textContent=code+' · '+label;button.setAttribute('aria-label','在海圖選取 '+code+'，'+label);
  button.addEventListener('click',()=>{const node=document.querySelector('[data-node="'+code+'"]');if(node&&!node.disabled){node.click();document.querySelector('[data-node="'+code+'"]')?.focus();}});marks.append(button);
 }
 if(marks.childElementCount)index.append(marks);
 const routes=document.createElement('ul');routes.className='map-route-index';
 function row(label,nodes,color){const li=document.createElement('li'),name=document.createElement('strong'),sequence=document.createElement('span');li.style.setProperty('--route-color',color);name.textContent=label;sequence.textContent=nodes.map((c,i)=>(i+1)+'. '+c).join(' → ');li.append(name,sequence);routes.append(li);}
 if(previewRoute?.map===m.id&&w.layers.recommended!==false)row('推薦預覽 · '+((previewRoute.shipIndex??w.activeVoyageShip)+1)+' 號艇',previewRoute.nodes,'#e5ad35');
 w.voyages.forEach((v,i)=>{if(v.map===m.id&&v.nodes.length&&w.layers['ship-'+i]!==false)row((i+1)+' 號艇',v.nodes,palette[i]);});
 if(routes.childElementCount)index.append(routes);
 if(marks.childElementCount){const note=document.createElement('p');note.className='map-layer-index-note';note.textContent='金色內框標示里程碑；船位資格與新海域須依遊戲實際探索結果確認。';index.append(note);}
 index.hidden=!index.childElementCount;
}
root.SubMapUI={render};
})(window);
