/* v57: map-local actions. Existing controls are moved, never cloned or rebound. */
(function () {
'use strict';
const F=window.SubFleet,$=s=>document.querySelector(s);
const inspector=$('.node-inspector');
if(!F||!inspector)return;
const popup=document.createElement('section');popup.id='node-popover';popup.className='node-popover';popup.hidden=true;popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','false');popup.setAttribute('aria-labelledby','node-title');
const header=document.createElement('header');header.className='node-popover-heading';
const context=document.createElement('span');context.className='node-popover-context';
const closeButton=document.createElement('button');closeButton.type='button';closeButton.className='node-popover-close';closeButton.textContent='×';closeButton.setAttribute('aria-label','關閉地點操作');header.append(context,closeButton);popup.append(header,inspector);document.body.append(popup);
inspector.open=true;inspector.querySelector(':scope > summary').hidden=true;
const oldHint=inspector.querySelector(':scope > span');if(oldHint)oldHint.hidden=true;
const status=document.createElement('p');status.id='node-popup-status';status.className='node-popup-status';$('#node-title').after(status);
const recordHost=document.createElement('div');recordHost.className='node-record-controls';
const correction=document.createElement('details');correction.className='node-record-correction';const correctionSummary=document.createElement('summary');correctionSummary.textContent='更正紀錄';correction.append(correctionSummary);
const registerOperation=$('#node-register').closest('.node-operation'),exploredOperation=$('#node-explored')?.closest('.node-operation');
const routeOperation=$('#node-action').closest('.node-operation');routeOperation.before(recordHost,correction);recordHost.append(registerOperation);if(exploredOperation){recordHost.append(exploredOperation);const note=exploredOperation.querySelector('small');if(note)note.textContent='尚無探索紀錄，不代表從未到訪。';}
const shipLabel=document.createElement('label');shipLabel.className='node-target-label';shipLabel.textContent='安排給哪艘船';const shipSelect=document.createElement('select');shipSelect.id='node-target-ship';shipLabel.append(shipSelect);routeOperation.querySelector('h4').after(shipLabel);
const shipIdentity=document.createElement('p');shipIdentity.className='node-selected-ship';shipSelect.parentElement.after(shipIdentity);
const planning=document.createElement('details');planning.className='node-planning-details';const planningSummary=document.createElement('summary');planningSummary.textContent='計算規劃選項';planning.append(planningSummary);if($('#node-required')){planning.append($('#node-required'));routeOperation.append(planning);}
const toolbar=document.createElement('div');toolbar.className='map-utility-toolbar';toolbar.setAttribute('aria-label','海圖工具');
function toolButton(text,id){const b=document.createElement('button');b.type='button';b.id=id;b.textContent=text;toolbar.append(b);return b;}
const managementButton=toolButton('進度管理','map-progress-management'),helpButton=toolButton('圖例／說明','map-help');$('.map-frame').before(toolbar);
function makeDialog(id,title){const d=document.createElement('dialog');d.id=id;d.className='fleet-dialog node-utility-dialog';d.setAttribute('aria-labelledby',id+'-title');const h=document.createElement('header');h.className='node-utility-heading';const t=document.createElement('h2');t.id=id+'-title';t.textContent=title;const b=document.createElement('button');b.type='button';b.textContent='×';b.setAttribute('aria-label','關閉'+title);b.onclick=()=>d.close();h.append(t,b);d.append(h);document.body.append(d);d.addEventListener('click',event=>{if(event.target!==d)return;const r=d.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)d.close();});return d;}
const management=makeDialog('map-progress-dialog','進度管理'),help=makeDialog('map-help-dialog','圖例／說明');
const managementContext=document.createElement('p');managementContext.className='node-utility-context';management.append(managementContext);
const managementNote=document.createElement('p');managementNote.textContent='開啟登記與探索紀錄由此工房共用。尚無探索紀錄，不代表從未到訪。';management.append(managementNote);
for(const selector of ['#progress-editor','#explored-batch','.chart-actions']){const el=$(selector);if(el)management.append(el);}
const managementFeedback=document.createElement('p');managementFeedback.className='node-management-feedback';managementFeedback.setAttribute('role','status');management.append(managementFeedback);
for(const selector of ['.chart-legend-panel','.route-guide','.command-section','.chart-reference']){const el=$(selector);if(el){help.append(el);if(selector==='.chart-legend-panel')el.open=true;}}
let openedContext=null,utilityContext=null,utilityReturn=null,lastVisited=null,lastNodeKey=null;
function current(){const item=F.workshop(),map=F.currentMap();return {item,map,code:item.selectedNode,node:map.nodes.find(n=>n.code===item.selectedNode)};}
function same(a,b){return a&&a.item===b.item&&a.map.id===b.map.id;}
function nodeButton(code){return [...document.querySelectorAll('#map-hotspots [data-node]')].find(b=>b.dataset.node===code);}
function close(restoreFocus=true){if(popup.hidden)return;const previous=openedContext;popup.hidden=true;openedContext=null;if(restoreFocus&&previous&&same(previous,current()))nodeButton(previous.code)?.focus({preventScroll:true});}
function place(){if(popup.hidden||!openedContext)return;if(matchMedia('(max-width: 760px)').matches){popup.style.left='';popup.style.top='';return;}const anchor=nodeButton(openedContext.code)||$('.map-frame'),r=anchor.getBoundingClientRect(),p=popup.getBoundingClientRect(),gap=12;let left=r.right+gap;if(left+p.width>innerWidth-gap)left=r.left-p.width-gap;left=Math.max(gap,Math.min(left,innerWidth-p.width-gap));const top=Math.max(gap,Math.min(r.top-24,innerHeight-p.height-gap));popup.style.left=left+'px';popup.style.top=top+'px';}
function render(){const now=current();if(openedContext&&!same(openedContext,now)){close(false);}if(utilityContext&&!same(utilityContext,now)){management.close();help.close();utilityContext=null;}
managementContext.textContent=now.item.name+' · '+now.map.name;managementFeedback.textContent=$('#map-feedback').textContent;
if(popup.hidden)return;if(!now.node){close(false);return;}const nodeKey=now.item.id+':'+now.map.id+':'+now.code;if(lastNodeKey!==nodeKey){lastNodeKey=nodeKey;lastVisited=null;correction.open=false;planning.open=false;popup.scrollTop=0;}openedContext=now;
F.renderInspector?.();
context.textContent=now.item.name+' · 進度由工房共用';const visited=now.item.visited?.[now.map.id]?.[now.code]===true,opened=F.isOpened(now.map.id,now.code),locked=F.nodeState(now.map,now.code)==='locked';
status.textContent=locked?'版本尚未開放':visited?'探索過 · 已開啟（已發現）':opened?'已開啟（已發現） · 尚無探索紀錄':'尚未登記開啟 · 尚無探索紀錄';status.classList.toggle('is-explored',visited);$('#node-copy').hidden=opened;
const previousFocus=document.activeElement;const registerHost=visited||opened?correction:recordHost,exploredHost=opened&&!visited?recordHost:correction;if(registerOperation.parentElement!==registerHost)registerHost.append(registerOperation);if(exploredOperation&&exploredOperation.parentElement!==exploredHost)exploredHost.append(exploredOperation);recordHost.hidden=!recordHost.childElementCount;correction.hidden=false;correctionSummary.textContent=opened?'更正紀錄':'其他登記／補登探索';if(lastVisited!==visited)correction.open=false;lastVisited=visited;if(!correction.open&&previousFocus!==correctionSummary&&correction.contains(previousFocus))correctionSummary.focus({preventScroll:true});
shipSelect.replaceChildren(...now.item.ships.map((ship,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=(i+1)+' 號艇 · '+(F.isSailing(now.item,i)?'出航中，須先收船':!ship.enabled?'未啟用':'Rank '+ship.rank+' · '+(now.item.voyages[i].nodes.length?'已排 '+now.item.voyages[i].nodes.length+' 站':'尚無航程'));return o;}));shipSelect.value=String(now.item.activeVoyageShip);
shipIdentity.textContent='目前安排：'+now.item.name+' · '+(now.item.activeVoyageShip+1)+' 號艇';
if(F.isSailing(now.item,now.item.activeVoyageShip)){$('#node-action').disabled=true;$('#node-voyage-help').textContent='此船仍有出航紀錄。請先確認收船或取消紀錄，再修改航線。';if($('#node-required'))$('#node-required').disabled=true;}
place();}
function show(){const now=current();if(!now.node)return;if(management.open)management.close();if(help.open)help.close();const changed=!openedContext||!same(openedContext,now)||openedContext.code!==now.code;openedContext=now;popup.hidden=false;inspector.open=true;if(changed){lastVisited=null;correction.open=false;planning.open=false;popup.scrollTop=0;}render();closeButton.focus({preventScroll:true});}
function openUtility(dialog,trigger){close(false);if(management.open)management.close();if(help.open)help.close();utilityContext=current();utilityReturn=trigger||document.activeElement;render();dialog.showModal();}
function openManagement(options={}){openUtility(management,options.trigger||managementButton);if(options.progress){$('#progress-editor').open=true;$('#route-progress-select').focus({preventScroll:true});}}
for(const dialog of [management,help])dialog.addEventListener('close',()=>{if(dialog.open)return;if(!management.open&&!help.open){utilityContext=null;if(utilityReturn?.isConnected)utilityReturn.focus({preventScroll:true});}});
shipSelect.addEventListener('change',()=>{const now=current(),index=Number(shipSelect.value);if(!Number.isInteger(index)||index<0||index>=now.item.ships.length)return;now.item.activeVoyageShip=index;F.save();F.renderAll();});
closeButton.onclick=()=>close();managementButton.onclick=()=>openManagement();helpButton.onclick=()=>openUtility(help,helpButton);
document.addEventListener('pointerdown',event=>{if(popup.hidden||document.querySelector('dialog[open]')||popup.contains(event.target)||event.target.closest('#map-hotspots [data-node]')||event.target.closest('dialog'))return;close();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!popup.hidden&&!document.querySelector('dialog[open]')){event.preventDefault();close();}});
window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
window.SubNodeUI={show,close,render,isOpen:()=>!popup.hidden,openManagement};
render();
})();
