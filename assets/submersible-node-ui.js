/* v86: reference layout; all progress and voyage writers remain unchanged. */
(function () {
'use strict';
const F=window.SubFleet,E=window.SubVoyageEngine,$=s=>document.querySelector(s);
const inspector=$('.node-inspector');if(!F||!inspector)return;
const popup=document.createElement('section');popup.id='node-popover';popup.className='node-popover';popup.hidden=true;popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','false');popup.setAttribute('aria-labelledby','node-title');
const header=document.createElement('header');header.className='node-popover-heading';
const context=document.createElement('span');context.className='node-popover-context';
const closeButton=document.createElement('button');closeButton.type='button';closeButton.className='node-popover-close';closeButton.textContent='×';closeButton.setAttribute('aria-label','關閉地點進度');header.append(context,closeButton);popup.append(header,inspector);document.body.append(popup);
inspector.open=true;inspector.querySelector(':scope > summary').hidden=true;
const oldHint=inspector.querySelector(':scope > span');if(oldHint)oldHint.hidden=true;
const checks=document.createElement('div');checks.className='node-progress-checks';
checks.innerHTML='<label><input type="checkbox" id="node-opened-check">已開啟</label><label><input type="checkbox" id="node-explored-check">已探索</label>';
$('#node-copy').after(checks);
const required=$('#node-required');if(required){required.textContent='設為本趟必去';inspector.append(required);}
// Keep the original handlers as the only writers of discovery / visit records.
for(const op of inspector.querySelectorAll('.node-operation'))op.hidden=true;
const toolbar=document.createElement('div');toolbar.className='map-utility-toolbar';toolbar.setAttribute('aria-label','航程與海圖工具');
const routeSummary=document.createElement('section');routeSummary.id='map-route-summary';routeSummary.className='map-route-summary';routeSummary.setAttribute('aria-label','目前選船航程');
routeSummary.innerHTML='<div class="map-route-heading"><div><strong id="map-plan-ship"></strong><span id="map-plan-sea"></span></div><button id="map-plan-route" type="button" aria-haspopup="dialog" aria-controls="voyage-action-dialog"></button></div><div id="map-plan-metrics"></div><div class="map-voyage-action"><span id="map-voyage-status" tabindex="0" role="status" aria-describedby="map-voyage-return" hidden></span><button id="map-voyage-primary" type="button"></button><button id="map-voyage-more" type="button" aria-label="更多航次操作" aria-haspopup="menu" aria-controls="voyage-action-menu" aria-expanded="false">⋯</button></div>';
const summaryColumn=document.createElement('div');summaryColumn.className='map-summary-column';
const validation=document.createElement('div');validation.id='map-plan-validation';validation.setAttribute('role','tooltip');validation.hidden=true;
const issueHeading=document.createElement('strong');issueHeading.textContent='目前問題';
const issueList=document.createElement('ul');validation.append(issueHeading,issueList);document.body.append(validation);
const returnTooltip=document.createElement('div');returnTooltip.id='map-voyage-tooltip';returnTooltip.className='map-voyage-tooltip';returnTooltip.setAttribute('role','tooltip');returnTooltip.hidden=true;
const returnTime=document.createElement('time');returnTime.id='map-voyage-return';returnTooltip.append(returnTime);document.body.append(returnTooltip);
function toolButton(text,id){const b=document.createElement('button');b.type='button';b.id=id;b.textContent=text;toolbar.append(b);return b;}
const issueButton=toolButton('','map-issues');issueButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 10.5v6M12 7.5v.1"/></svg>';issueButton.setAttribute('aria-label','查看目前問題');issueButton.setAttribute('aria-controls','map-plan-validation');issueButton.setAttribute('aria-describedby','map-plan-validation');issueButton.setAttribute('aria-expanded','false');
const managementButton=toolButton('進度管理','map-progress-management'),helpButton=toolButton('圖例','map-help');const chartHeader=document.createElement('div');chartHeader.className='map-chart-header';const tabs=$('#map-tabs');tabs.before(chartHeader);chartHeader.append(tabs,toolbar);$('.map-side-info').prepend(summaryColumn);summaryColumn.append(routeSummary);
const feedback=$('#map-feedback');feedback.classList.add('map-route-feedback');feedback.hidden=!feedback.textContent;feedback.setAttribute('aria-atomic','true');$('.map-frame').append(feedback);
let issueHover=false,issueFocus=false,issuePinned=false,issueDismissed=false,issueCloseTimer,issueContext=null;
function placeIssues(){
 if(validation.hidden)return;
 const anchor=issueButton.getBoundingClientRect(),tip=validation.getBoundingClientRect(),gap=8;
 const left=Math.max(gap,Math.min(anchor.right-tip.width,innerWidth-tip.width-gap));
 const below=anchor.bottom+gap,top=below+tip.height<=innerHeight-gap?below:Math.max(gap,anchor.top-tip.height-gap);
 validation.style.left=left+'px';validation.style.top=top+'px';
}
function updateIssueVisibility(){validation.hidden=issueDismissed||!(issueHover||issueFocus||issuePinned);issueButton.setAttribute('aria-expanded',String(!validation.hidden));placeIssues();}
function hideIssues(){clearTimeout(issueCloseTimer);issueHover=false;issueFocus=false;issuePinned=false;issueDismissed=true;updateIssueVisibility();}
function renderIssues(item,index,issues){
 if(issueContext&&(issueContext.item!==item||issueContext.index!==index||issueContext.map!==item.map))hideIssues();
 issueContext={item,index,map:item.map};
 const current=[...new Set(issues.filter(Boolean))];issueList.replaceChildren();
 for(const text of current.length?current:['目前沒有待處理問題。']){const row=document.createElement('li');row.textContent=text;issueList.append(row);}
 issueList.classList.toggle('no-issues',!current.length);issueButton.dataset.hasIssues=String(!!current.length);issueButton.setAttribute('aria-label',current.length?'查看目前問題，共 '+current.length+' 項':'查看目前問題，目前沒有待處理問題');placeIssues();
}
issueButton.addEventListener('pointerenter',event=>{if(event.pointerType==='touch')return;clearTimeout(issueCloseTimer);issueHover=true;issueDismissed=false;updateIssueVisibility();});
issueButton.addEventListener('pointerleave',event=>{if(event.pointerType==='touch')return;issueCloseTimer=setTimeout(()=>{issueHover=false;updateIssueVisibility();},120);});
issueButton.addEventListener('focus',()=>{issueFocus=true;issueDismissed=false;updateIssueVisibility();});
issueButton.addEventListener('blur',()=>{issueFocus=false;updateIssueVisibility();});
issueButton.addEventListener('click',()=>{if(issuePinned){hideIssues();return;}issuePinned=true;issueDismissed=false;updateIssueVisibility();});
issueButton.addEventListener('keydown',event=>{if(event.key==='Escape'&&!validation.hidden){event.preventDefault();event.stopPropagation();hideIssues();}});
validation.addEventListener('pointerenter',()=>{clearTimeout(issueCloseTimer);issueHover=true;updateIssueVisibility();});
validation.addEventListener('pointerleave',()=>{issueHover=false;updateIssueVisibility();});
document.addEventListener('pointerdown',event=>{if(!issueButton.contains(event.target)&&!validation.contains(event.target))hideIssues();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!validation.hidden){event.preventDefault();hideIssues();}});
document.addEventListener('focusin',event=>{if(event.target!==issueButton&&!validation.contains(event.target))hideIssues();});
window.addEventListener('resize',placeIssues);window.addEventListener('scroll',event=>{if(!(event.target instanceof Node)||!validation.contains(event.target))hideIssues();},true);
// v86: the voyage summary lives in the information rail; its two-row layout
// is controlled by CSS without changing route or voyage data.
const summaryMapImage=$('#sea-map-image'),summaryViewport=$('.map-viewport'),seaSelector=$('#map-tabs');
let summaryAlignmentPending=false;
function alignSummaryToColumn(){
 const width=summaryColumn.getBoundingClientRect().width;
 if(!Number.isFinite(width)||width<=0)return false;
 const previousCompact=routeSummary.dataset.compact;
 routeSummary.style.removeProperty('width');routeSummary.style.removeProperty('margin-left');
 seaSelector.style.removeProperty('--sea-selector-top');
 const viewportWidth=document.documentElement.clientWidth||window.innerWidth;
 routeSummary.dataset.compact=viewportWidth<=1150&&width<640?'true':'false';
 return previousCompact!==routeSummary.dataset.compact;
}
function queueSummaryAlignment(){
 if(summaryAlignmentPending)return;
 summaryAlignmentPending=true;
 requestAnimationFrame(()=>{summaryAlignmentPending=false;alignSummaryToColumn();});
}
if(typeof ResizeObserver==='function'){
 const summaryObserver=new ResizeObserver(queueSummaryAlignment);
 for(const element of [summaryColumn,summaryViewport,routeSummary])summaryObserver.observe(element);
}
summaryMapImage.addEventListener('load',queueSummaryAlignment);
window.addEventListener('resize',queueSummaryAlignment);
if(document.fonts?.ready)document.fonts.ready.then(queueSummaryAlignment);
queueSummaryAlignment();

function makeDialog(id,title){const d=document.createElement('dialog');d.id=id;d.className='fleet-dialog node-utility-dialog';d.setAttribute('aria-labelledby',id+'-title');const h=document.createElement('header');h.className='node-utility-heading';const t=document.createElement('h2');t.id=id+'-title';t.textContent=title;const b=document.createElement('button');b.type='button';b.textContent='×';b.setAttribute('aria-label','關閉'+title);b.onclick=()=>d.close();h.append(t,b);d.append(h);document.body.append(d);d.addEventListener('click',event=>{if(event.target!==d)return;const r=d.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)d.close();});return d;}
const management=makeDialog('map-progress-dialog','進度管理'),help=makeDialog('map-help-dialog','圖例／說明');
const managementContext=document.createElement('p');managementContext.className='node-utility-context';management.append(managementContext);
const chooser=document.createElement('div');chooser.className='node-progress-chooser';chooser.innerHTML='<label>地點 <select id="node-progress-select" aria-label="選擇進度登記地點"></select></label><button type="button" id="node-progress-open">查看登記</button>';management.append(chooser);
for(const selector of ['#progress-editor','#explored-batch','.chart-actions']){const el=$(selector);if(el)management.append(el);}
const managementFeedback=document.createElement('p');managementFeedback.className='node-management-feedback';managementFeedback.setAttribute('role','status');management.append(managementFeedback);
// Detailed chart context remains available in the existing help dialog.
for(const selector of ['.map-context-details','.map-key']){const element=$(selector);if(element)help.append(element);}
const milestoneLegend=document.createElement('div');milestoneLegend.id='map-milestone-help';help.append(milestoneLegend);
const helpNote=document.createElement('p');helpNote.textContent='點已開啟地點加入／移除目前選船航程，增減後依最短航時排序。滑鼠停留或觸控長按可登記進度；鍵盤以 Enter／空白鍵選航點，向下鍵開啟進度，Escape 關閉。';help.append(helpNote);
const incomeNote=document.createElement('p');incomeNote.textContent='NPC 毛收入：'+E.salvageEvidence.note+' 任一站缺少合格樣本時，整趟顯示「—」。';help.append(incomeNote);
for(const selector of ['.chart-legend-panel','.route-guide','.command-section','.chart-reference']){const el=$(selector);if(el){help.append(el);if(selector==='.chart-legend-panel')el.open=true;}}
let openedContext=null,utilityContext=null,utilityReturn=null,hoverTimer,closeTimer,press=null,suppressClick=null;
const current=()=>{const item=F.workshop(),map=F.currentMap();return {item,map,code:item.selectedNode,node:map.nodes.find(n=>n.code===item.selectedNode)};};
const same=(a,b)=>a&&b&&a.item===b.item&&a.map.id===b.map.id&&a.shipIndex===b.shipIndex;
const snapshot=()=>({...current(),shipIndex:F.workshop().activeVoyageShip});
const nodeButton=code=>[...document.querySelectorAll('#map-hotspots [data-node]')].find(b=>b.dataset.node===code);
function clearTimers(){clearTimeout(hoverTimer);clearTimeout(closeTimer);}
function close(restoreFocus=true){clearTimers();if(popup.hidden)return;const previous=openedContext;popup.hidden=true;openedContext=null;if(restoreFocus&&same(previous,snapshot()))nodeButton(previous.code)?.focus({preventScroll:true});}
function place(){if(popup.hidden||!openedContext)return;if(matchMedia('(max-width: 760px)').matches){popup.style.left='';popup.style.top='';return;}const anchor=nodeButton(openedContext.code)||$('.map-frame'),r=anchor.getBoundingClientRect(),p=popup.getBoundingClientRect(),gap=10;let left=r.right+gap;if(left+p.width>innerWidth-gap)left=r.left-p.width-gap;popup.style.left=Math.max(gap,Math.min(left,innerWidth-p.width-gap))+'px';popup.style.top=Math.max(gap,Math.min(r.top-12,innerHeight-p.height-gap))+'px';}
// Keep return details outside the header flow and the right sidebar.
const returnStatus=$('#map-voyage-status');
let returnHover=false,returnFocus=false,returnDismissed=false,returnCloseTimer;
function placeReturnTooltip(){
 if(returnTooltip.hidden)return;
 const anchor=returnStatus.getBoundingClientRect(),tip=returnTooltip.getBoundingClientRect(),gap=8;
 const left=Math.max(gap,Math.min(anchor.right-tip.width,innerWidth-tip.width-gap));
 const below=anchor.bottom+gap,top=below+tip.height<=innerHeight-gap?below:Math.max(gap,anchor.top-tip.height-gap);
 returnTooltip.style.left=left+'px';returnTooltip.style.top=top+'px';
}
function hideReturnTooltip(){clearTimeout(returnCloseTimer);returnHover=false;returnFocus=false;returnDismissed=false;returnTooltip.hidden=true;}
function updateReturnTooltip(){
 const item=F.workshop(),index=item.activeVoyageShip,sailing=F.isSailing(item,index)?item.sailings[index]:null;
 const valid=summaryContext&&summaryContext.item===item&&summaryContext.index===index&&summaryContext.sailing===sailing&&sailing&&sailing.returnAt>Date.now();
 returnTooltip.hidden=!valid||returnDismissed||!(returnHover||returnFocus)||window.SubLogbook?.isOpen();
 placeReturnTooltip();
}
returnStatus.addEventListener('pointerenter',event=>{if(event.pointerType==='touch')return;clearTimeout(returnCloseTimer);returnHover=true;returnDismissed=false;updateReturnTooltip();});
returnStatus.addEventListener('pointerleave',event=>{if(event.pointerType==='touch')return;returnCloseTimer=setTimeout(()=>{returnHover=false;updateReturnTooltip();},120);});
returnStatus.addEventListener('focus',()=>{returnFocus=true;returnDismissed=false;updateReturnTooltip();});
returnStatus.addEventListener('blur',()=>{returnFocus=false;updateReturnTooltip();});
returnStatus.addEventListener('click',()=>{returnFocus=true;returnDismissed=false;updateReturnTooltip();});
document.addEventListener('voyage-ui-change',hideReturnTooltip);
returnTooltip.addEventListener('pointerenter',()=>{clearTimeout(returnCloseTimer);returnHover=true;updateReturnTooltip();});
returnTooltip.addEventListener('pointerleave',()=>{returnHover=false;updateReturnTooltip();});
document.addEventListener('pointerdown',event=>{if(!returnStatus.contains(event.target)&&!returnTooltip.contains(event.target))hideReturnTooltip();});
returnStatus.addEventListener('keydown',event=>{if(event.key==='Escape'&&!returnTooltip.hidden){event.preventDefault();event.stopPropagation();hideReturnTooltip();returnDismissed=true;}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!returnTooltip.hidden){hideReturnTooltip();returnDismissed=true;}});
window.addEventListener('resize',placeReturnTooltip);
window.addEventListener('scroll',()=>{if(!returnTooltip.hidden)hideReturnTooltip();},true);
// Only complete departure data may be used for historical estimates. Never borrow
// the current ship, current plan, current discovery state, or a guessed build.
let summaryContext=null,lastCollection=null;
document.addEventListener('voyage-record-ended',event=>{lastCollection={item:event.detail.item,index:event.detail.index,at:Date.now()};});
function renderSummary(){
 const item=F.workshop(),index=item.activeVoyageShip,ship=item.ships[index],sailing=F.isSailing(item,index)?item.sailings[index]:null;
 const due=!!sailing&&sailing.returnAt<=Date.now();
 const recorded=sailing?window.SubLogbook?.snapshotRoute(sailing):null,departure=sailing?.snapshot;
 const route=sailing?(recorded?{map:recorded.map.id,nodes:recorded.nodes}:null):item.voyages[index];
 const complete=departure&&Number.isInteger(departure.rank)&&departure.rank>=1&&departure.rank<=130&&/^[1-5]{4}$/.test(departure.build)&&Array.isArray(departure.modified)&&departure.modified.length===4&&departure.modified.every(x=>typeof x==='boolean');
 const calc=route&&(!sailing||complete)?E.calculate(sailing?{enabled:true,rank:departure.rank,build:departure.build,modified:departure.modified}:ship,route.map,route.nodes,sailing?undefined:item.opened):null;
 const valid=calc?.valid===true,map=F.maps.find(m=>m.id===route?.map);
 $('#map-plan-ship').textContent=(index+1)+' 號艇';
 $('#map-plan-sea').textContent=!due&&route?.nodes.length?' · '+(map?.name||route.map):'';
 $('#map-plan-route').textContent=due?'已返航':route?.nodes.length?route.nodes.join('→'):sailing?'—':'尚未安排航程';
 $('#map-plan-route').title=sailing?(route?'本趟出航快照：'+map.name+' '+route.nodes.join(' → '):'沒有可信的出航航線快照；不以目前計畫推測。'):route?.nodes.length?(map?.name||route.map)+' '+route.nodes.join(' → '):$('#map-plan-route').textContent;
 routeSummary.dataset.source=sailing?'snapshot':'plan';
 const time=valid&&!due?Math.floor(calc.seconds/3600)+'時'+Math.floor(calc.seconds%3600/60)+'分':'—',metrics=$('#map-plan-metrics');metrics.replaceChildren();
 for(const [key,label,value] of [['time','時間',time],['fuel','燃料',valid&&!due?calc.fuel+' 罐':'—'],['range','航距',valid&&!due?calc.range+'／'+calc.ability.range:'—']]){
  const span=document.createElement('span'),name=document.createElement('small'),number=document.createElement('b');span.dataset.metric=key;name.textContent=label;number.textContent=value;span.append(name,number);
  const note=key==='time'?'依'+(sailing?'出航快照':'目前計畫')+'估算的全趟航時，以遊戲管制台為準。':'依'+(sailing?'出航快照':'目前計畫')+'估算。';
  span.title=note;span.setAttribute('aria-label',label+' '+value+'。'+note);metrics.append(span);
 }
 const missing=sailing?[]:(ship.requiredStops||[]).filter(stop=>stop.map!==route.map||!route.nodes.includes(stop.code));
 const missingWarning=missing.length?'尚缺必去：'+missing.map(x=>(F.maps.find(m=>m.id===x.map)?.name||x.map)+' '+x.code).join('、'):'';
 const issues=sailing?[]:[...(route.nodes.length&&!valid?calc?.errors||[]:[]),missingWarning];
 const warning=issues.filter(Boolean).join(' ');
 renderIssues(item,index,issues);
 const primary=$('#map-voyage-primary'),status=$('#map-voyage-status'),returnTime=$('#map-voyage-return');
 const contextChanged=!summaryContext||summaryContext.item!==item||summaryContext.index!==index||summaryContext.sailing!==sailing;
 if(contextChanged||!sailing||due)hideReturnTooltip();
 summaryContext={item,index,sailing,signature:JSON.stringify(sailing),planSignature:JSON.stringify([ship,item.voyages[index],item.opened])};routeSummary.dataset.state=sailing?(due?'due':'sailing'):'ready';
 primary.hidden=!!sailing&&!due;primary.disabled=sailing?!window.SubLogbook?.collectNow:!valid||missing.length>0||!window.SubLogbook?.depart;primary.textContent=sailing?'收船':'出航';primary.dataset.action=sailing?'collect':'depart';
 primary.setAttribute('aria-label',sailing?'登記 '+(index+1)+' 號艇已在遊戲收船':'登記 '+(index+1)+' 號艇已在遊戲出航');primary.title=sailing?(recorded?'直接完成網站內收船登記，並依本趟出航快照登記探索過；不會操作遊戲。':'直接完成網站內收船登記；沒有可信出航快照，不新增探索紀錄，也不會操作遊戲。'):warning||(!valid?'先完成船隻設定與有效航線。':'只登記已在遊戲出航的紀錄，並估算返航時間。');
 status.hidden=!sailing||due;status.textContent=sailing&&!due?'航行中':'';
 $('#map-voyage-more').hidden=false;$('#map-voyage-more').disabled=!window.SubLogbook?.openMenu;
 $('#map-plan-route').setAttribute('aria-label',(sailing?'查看本趟航次明細：':'查看本趟計畫明細：')+$('#map-plan-route').textContent);
 returnTime.hidden=!sailing;if(sailing){returnTime.dateTime=new Date(sailing.returnAt).toISOString();returnTime.textContent='預計返航 '+new Date(sailing.returnAt).toLocaleString('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});returnTime.title=new Date(sailing.returnAt).toLocaleString('zh-TW',{timeZoneName:'short'});returnTime.setAttribute('aria-label','預計返航 '+returnTime.title);}else{returnTime.textContent='';returnTime.removeAttribute('datetime');returnTime.removeAttribute('title');returnTime.removeAttribute('aria-label');}
 if(!returnTooltip.hidden)placeReturnTooltip();
 queueSummaryAlignment();
}
$('#map-voyage-primary').addEventListener('click',event=>{
 const previous=summaryContext,item=F.workshop(),index=item.activeVoyageShip,sailing=F.isSailing(item,index)?item.sailings[index]:null;
 if(!previous||previous.item!==item||previous.index!==index||previous.sailing!==sailing||previous.signature!==JSON.stringify(sailing)){renderSummary();return;}
 // A double tap/click must not turn a completed return into a new departure.
 if(event.detail>1||lastCollection?.item===item&&lastCollection.index===index&&Date.now()-lastCollection.at<600)return;
 if(sailing&&sailing.returnAt>Date.now()){renderSummary();return;}
 const action=sailing?'collect':'depart';renderSummary();if($('#map-voyage-primary').disabled)return;
 if(action==='collect'){
  if(window.SubLogbook.collectNow(previous))lastCollection={item,index,at:Date.now()};
  return;
 }
 if(!window.SubLogbook?.depart){F.notice('出航紀錄功能尚未載入，請重新整理後再操作。');return;}
 window.SubLogbook.depart(previous);
 if(action==='depart'&&F.isSailing(item,index))$('#map-voyage-status').focus({preventScroll:true});
});
$('#map-voyage-more').addEventListener('click',()=>window.SubLogbook?.openMenu(summaryContext,$('#map-voyage-more')));
$('#map-plan-route').addEventListener('click',()=>window.SubLogbook?.openDetails(summaryContext,$('#map-plan-route')));
for(const button of [$('#map-voyage-more')])button.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();hideReturnTooltip();window.SubLogbook?.openMenu(summaryContext,button);}});
setInterval(renderSummary,30000);

function render(){
 const now=snapshot();if(press&&!same(press.context,now)){blockPress();press=null;}if(openedContext&&!same(openedContext,now))close(false);
 if(utilityContext&&!same(utilityContext,now)){management.close();help.close();utilityContext=null;}
 renderSummary();managementContext.textContent=now.item.name+' · '+now.map.name;managementFeedback.textContent=feedback.textContent;
 const select=$('#node-progress-select'),selected=select.value;
 select.replaceChildren(...now.map.nodes.filter(n=>F.nodeState(now.map,n.code)!=='locked').map(n=>{const option=document.createElement('option');option.value=n.code;option.textContent=n.code;return option;}));if([...select.options].some(o=>o.value===selected))select.value=selected;
 select.disabled=!select.options.length;$('#node-progress-open').disabled=select.disabled;
 if(popup.hidden)return;
 if(!now.node||F.nodeState(now.map,now.code)==='locked'){close(false);return;}
 openedContext=now;F.renderInspector();window.SubExplored?.render();
 context.textContent=now.item.name+' · 工房進度';
 $('#node-copy').hidden=F.isOpened(now.map.id,now.code);
 $('#node-opened-check').checked=F.isOpened(now.map.id,now.code);
 $('#node-explored-check').checked=now.item.visited?.[now.map.id]?.[now.code]===true;
 if(required){required.disabled=F.isSailing(now.item,now.shipIndex)||!F.isOpened(now.map.id,now.code);required.title=required.disabled?'需已開啟地點且船隻未出航':'加入目前選船的推薦必去條件';}
 place();
}
function show(options={}){const now=snapshot();if(!now.node||F.nodeState(now.map,now.code)==='locked')return;clearTimers();if(management.open)management.close();if(help.open)help.close();openedContext=now;popup.hidden=false;inspector.open=true;render();if(options.focus!==false)$('#node-opened-check').focus({preventScroll:true});}
function showCode(code,focus){const item=F.workshop();item.selectedNode=code;show({focus});}
function openUtility(dialog,trigger){close(false);if(management.open)management.close();if(help.open)help.close();utilityContext=snapshot();utilityReturn=trigger||document.activeElement;render();dialog.showModal();}
function openManagement(options={}){openUtility(management,options.trigger||managementButton);if(options.progress){$('#progress-editor').open=true;$('#route-progress-select').focus({preventScroll:true});}}
for(const dialog of [management,help])dialog.addEventListener('close',()=>{if(dialog.open)return;if(!management.open&&!help.open){utilityContext=null;if(utilityReturn?.isConnected)utilityReturn.focus({preventScroll:true});}});
$('#node-progress-open').onclick=()=>{const code=$('#node-progress-select').value;management.close();showCode(code,true);};
$('#node-opened-check').onchange=()=>{$('#node-register').click();render();};
$('#node-explored-check').onchange=()=>{$('#node-explored').click();render();};
closeButton.onclick=()=>close();managementButton.onclick=()=>openManagement();helpButton.onclick=()=>openUtility(help,helpButton);
function scheduleClose(){clearTimeout(closeTimer);closeTimer=setTimeout(()=>{if(!popup.contains(document.activeElement)&&!document.querySelector('dialog[open]'))close(false);},180);}
const host=$('#map-hotspots');
host.addEventListener('pointerover',event=>{if(event.pointerType!=='mouse'||press)return;const node=event.target.closest('[data-node]:not(:disabled)');if(!node||node.contains(event.relatedTarget))return;clearTimers();const expected=snapshot();hoverTimer=setTimeout(()=>{if(node.isConnected&&same(expected,snapshot())&&!document.querySelector('dialog[open]'))showCode(node.dataset.node,false);},220);});
host.addEventListener('pointerout',event=>{const node=event.target.closest('[data-node]');if(!node||node.contains(event.relatedTarget))return;clearTimeout(hoverTimer);if(!popup.contains(event.relatedTarget))scheduleClose();});
popup.addEventListener('pointerenter',()=>clearTimeout(closeTimer));popup.addEventListener('pointerleave',scheduleClose);
host.addEventListener('keydown',event=>{const node=event.target.closest('[data-node]:not(:disabled)');if(!node)return;suppressClick=null;if(event.key==='ArrowDown'||event.key==='F2'||(event.key==='F10'&&event.shiftKey)){event.preventDefault();showCode(node.dataset.node,true);}});
function blockPress(){if(!press)return;clearTimeout(press.timer);suppressClick={code:press.code,until:Date.now()+1500};press.cancelled=true;}
host.addEventListener('pointerdown',event=>{
 clearTimers();const node=event.target.closest('[data-node]:not(:disabled)');if(!node)return;
 if(press){blockPress();press=null;return;}suppressClick=null;
 if(event.pointerType!=='touch'&&event.pointerType!=='pen')return;
 if(event.isPrimary===false)return;
 const expected=snapshot();press={context:expected,id:event.pointerId,code:node.dataset.node,x:event.clientX,y:event.clientY,cancelled:false};
 const active=press;active.timer=setTimeout(()=>{if(press!==active||active.cancelled||!same(expected,snapshot()))return;blockPress();showCode(active.code,true);},500);
});
document.addEventListener('pointermove',event=>{if(press&&event.pointerId===press.id&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>10)blockPress();});
document.addEventListener('pointerup',event=>{if(press&&event.pointerId===press.id){clearTimeout(press.timer);if(press.cancelled)suppressClick={code:press.code,until:Date.now()+1500};press=null;}});
document.addEventListener('pointercancel',()=>{blockPress();press=null;});
host.addEventListener('click',event=>{clearTimers();const node=event.target.closest('[data-node]');if(node&&suppressClick?.code===node.dataset.node&&Date.now()<=suppressClick.until){event.preventDefault();event.stopImmediatePropagation();suppressClick=null;}},true);
host.addEventListener('contextmenu',event=>{if(press?.cancelled||suppressClick){event.preventDefault();}});
document.addEventListener('pointerdown',event=>{if(popup.hidden||document.querySelector('dialog[open]')||popup.contains(event.target)||event.target.closest('#map-hotspots [data-node]')||event.target.closest('dialog'))return;close(false);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!popup.hidden&&!document.querySelector('dialog[open]')){event.preventDefault();close();}});
document.addEventListener('focusin',event=>{if(!popup.hidden&&!popup.contains(event.target)&&!event.target.contains(popup)&&!event.target.closest('#map-hotspots [data-node],dialog'))scheduleClose();});
window.addEventListener('resize',place);window.addEventListener('scroll',event=>{if(event.target instanceof Node&&popup.contains(event.target))return;blockPress();clearTimeout(hoverTimer);if(!popup.contains(document.activeElement))close(false);else place();},true);
window.SubNodeUI={show,close,render,isOpen:()=>!popup.hidden,openManagement};render();
})();
