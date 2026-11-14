/* v85: blueprint candidate rows; ranking, settings and guarded voyage actions are unchanged. */
(function () {
'use strict';
const F=window.SubFleet,E=window.SubVoyageEngine,C=window.SubCollection,$=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const duration=s=>Number.isFinite(s)?Math.floor(s/3600)+' 小時 '+Math.floor(s%3600/60)+' 分':'—';
const mapName=id=>F.maps.find(m=>m.id===id)?.name||id;
const displayReason=text=>F.maps.reduce((value,map)=>value.replace(new RegExp('\\b'+map.id+'\\b','g'),map.name),String(text));
const fields=['探查','收集','航速','航距','恩惠'],keys=['surveillance','retrieval','speed','range','favor'];
const aliases={'combed-wool-rug':'羊毛地毯','undersea-spoils':'桌上金幣堆','classic-tableware':'餐具組','assorted-candles':'組合蠟燭','ice-box':'冰箱','indoor-marble-fountain':'室內大理石噴泉','ivy-covered-bridge':'常春藤橋','vintage-side-table':'復古邊桌','rustic-log-table':'原木桌','rustic-log-bench':'原木長凳','jellyfish-lamp':'水母燈','merry-mog-bed':'莫古利造型床','mellow-mog-lamp':'莫古利造型燈','wall-climbing-ivy':'攀牆常春藤','flagstone-steps':'石板階梯','emerald-crystal-boule':'綠色水晶裝飾','cerulean-crystal-boule':'藍色水晶裝飾','golden-crystal-boule':'金色水晶裝飾','bag-of-booty':'財寶袋'};
const itemLabel=item=>item?(aliases[item.id]?aliases[item.id]+'｜':'')+item.name:'';
const partNames=['Shark 鯊魚','Unkiu 甲鱟','Whale 鬚鯨','Coelacanth 腔棘魚','Syldra 希爾德拉'];
// Only recommendations remain in the console. Voyage actions live in the chart bar.
const consoleHost=$('.chart-console');
const nodeStaging=document.createElement('div');nodeStaging.id='node-ui-staging';nodeStaging.hidden=true;document.body.append(nodeStaging);
[...consoleHost.children].filter(el=>el.id!=='route-planner-dialog').forEach(el=>nodeStaging.append(el));
const consoleHeading=document.createElement('h2');consoleHeading.className='console-heading';consoleHeading.textContent='系統推薦';consoleHost.prepend(consoleHeading);
// Restore the recommendation's visual scope without bringing back voyage tabs.
const recommendationPane=document.createElement('div');recommendationPane.id='console-next';recommendationPane.className='console-pane';consoleHost.append(recommendationPane);recommendationPane.append($('#route-planner-dialog'));
const collectionReference=document.createElement('div');collectionReference.id='collection-reference';$('#planner-results').after(collectionReference);collectionReference.append($('.collection-provenance'),$('.collection-build-panel'));
const mobileFleet=document.createElement('button');mobileFleet.id='fleet-mobile-toggle';mobileFleet.type='button';mobileFleet.setAttribute('aria-expanded','false');$('#fleet-manager').classList.add('mobile-collapsed');$('#fleet-manager').prepend(mobileFleet);mobileFleet.onclick=()=>{const folded=$('#fleet-manager').classList.toggle('mobile-collapsed');mobileFleet.setAttribute('aria-expanded',String(!folded));};

// Map route toggles and progress disclosure are handled by SubFleet / SubNodeUI.
$('.mobile-next a').onclick=event=>{event.preventDefault();$('#route-planner-dialog').scrollIntoView({behavior:'smooth',block:'start'});};

let lastKey='',preview=null,candidates=[],selectedCandidate=0,candidateKey='',run=0,strategy='outcome',buildSuggestions=[],decision=null,calculationCompleted=false,shipStateKey='';
const shipStatePanel=document.createElement('section');shipStatePanel.id='recommendation-ship-state';shipStatePanel.hidden=true;recommendationPane.prepend(shipStatePanel);
function selectedShipState(now=Date.now()){const {w,i}=sel(),record=w.sailings?.[i];return !record?'ready':record.returnAt<=now?'due':'sailing';}
function currentShipStateKey(){const {w,i}=sel(),now=Date.now();return JSON.stringify([w.id,i,w.ships[i],w.sailings.map(record=>record?[record.returnAt,record.returnAt<=now,record.snapshot]:null)]);}
function upgradePreparation(w,i,status){
 const ship=w.ships[i],rank=Number(ship?.rank),parts=window.SubParts;
 if(!['sailing','due'].includes(status)||!ship?.enabled||!F.isSlotUnlocked(w,i)||!Number.isInteger(rank)||!parts)return null;
 const nextRank=rank+1,target=F.recommendedBuild(nextRank);
 if(target===F.recommendedBuild(rank))return null;
 const current=parts.parse(ship.build);if(!current.valid)return null;
 const changes=parts.slots.flatMap((slot,index)=>{
  // Same-type modified parts already satisfy the type reference; never suggest downgrading them.
  if(current.build[index]===target[index])return [];
  const from=parts.catalog.find(p=>p.id===current.build[index]),to=parts.catalog.find(p=>p.id===target[index]);
  if(!from||!to)return [];
  return [{slot,index,fromCode:current.build[index]+(ship.modified?.[index]?'+':''),toCode:target[index],from:from.local+'級'+slot+(ship.modified?.[index]?'（改型）':''),to:to.local+'級'+slot}];
 });
 if(!changes.length)return null;
 return {rank,nextRank,current:[...current.build].map((part,index)=>part+(ship.modified?.[index]?'+':'')).join(''),target,changes};
}
function renderUpgradePreparation(w,i,status){
 const info=upgradePreparation(w,i,status);if(!info)return '';
 const target=[...info.target].map((digit,index)=>'<span'+(info.changes.some(change=>change.index===index)?' class="changed-part"':'')+'>'+esc(digit)+'</span>').join('');
 return '<section class="upgrade-preparation" aria-label="下一等換裝提醒"><h3>'+(i+1)+' 號艇 · R'+info.nextRank+' 換裝提醒</h3><p class="upgrade-ranks">目前 R'+info.rank+' · '+(status==='due'?'可收船':'航行中')+'</p><div class="upgrade-builds"><div><span>目前配裝</span><strong>'+esc(info.current)+'</strong></div><span aria-hidden="true">→</span><div><span>建議配裝</span><strong>'+target+'</strong></div></div><ul>'+info.changes.map(change=>'<li><strong>'+esc(change.slot)+'</strong><span class="upgrade-change-code">'+esc(change.fromCode)+' → '+esc(change.toCode)+'</span><span class="upgrade-target">'+esc(change.to)+'</span></li>').join('')+'</ul></section>';
}
function renderShipState(){
 const {w,i}=sel(),status=selectedShipState();shipStateKey=currentShipStateKey();
 $('#route-planner-dialog').hidden=status!=='ready';shipStatePanel.hidden=status==='ready';
 if(status==='ready'){shipStatePanel.replaceChildren();return status;}
 showSettings(false);showInfo(false);closeRequired();
 const title=(i+1)+' 號艇'+(status==='due'?'已返航，收船後顯示推薦航線':'航行中');
 let content=status==='due'?'<p class="recommendation-ship-status '+status+'">'+esc(title)+'</p>':'';
 if(status==='sailing'){
  const due=w.sailings.map((record,index)=>({record,index})).filter(x=>x.index!==i&&x.record&&x.record.returnAt<=Date.now());
  content+=due.length?'<div class="recommendation-return-card">'+due.map(({record,index})=>{const route=window.SubLogbook?.snapshotRoute(record);return '<div class="recommendation-return-row"><strong>'+(index+1)+' 號艇可收船</strong><p>'+esc(route?route.nodes.join(' → '):'未記錄航線')+'</p><button type="button" data-switch-returned-ship="'+index+'">切換至 '+(index+1)+' 號艇 →</button></div>';}).join('')+'</div>':'<p class="recommendation-ship-status sailing">'+esc(title)+'</p><p class="recommendation-return-empty">本艇返航後可收船</p>';
 }
 shipStatePanel.innerHTML=content+renderUpgradePreparation(w,i,status);return status;
}
shipStatePanel.onclick=event=>{const button=event.target.closest('[data-switch-returned-ship]');if(!button)return;const {w}=sel(),index=Number(button.dataset.switchReturnedShip);if(!w.sailings?.[index]||w.sailings[index].returnAt>Date.now())return;F.selectShip(w.id,index);};
function refreshShipState(){if(currentShipStateKey()!==shipStateKey)render();}

// v83: compact explanations and shared settings, without changing the ranking inputs.
const infoHost=$('.recommendation-info'),infoToggle=$('#recommendation-info-toggle'),infoPanel=$('#recommendation-info-panel'),settingsToggle=$('#planner-settings-toggle'),settingsPanel=$('#planner-settings');
let infoPinned=false,disclosureContext='';
function showInfo(open,pinned=infoPinned){infoPinned=open&&pinned;infoPanel.hidden=!open;infoToggle.setAttribute('aria-expanded',String(open));}
// Portal the non-modal popup outside the console so overflow/stacking cannot clip it.
// Use the browser top layer when available, with the same fixed-position fallback.
document.body.append(settingsPanel);
const nativeSettingsPopover=typeof settingsPanel.showPopover==='function';
if(nativeSettingsPopover)settingsPanel.setAttribute('popover','manual');
function positionSettings(){
 if(settingsPanel.hidden)return;
 const viewport=window.visualViewport,margin=10,gap=8;
 const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0;
 const width=viewport?.width||document.documentElement.clientWidth||window.innerWidth;
 const height=viewport?.height||document.documentElement.clientHeight||window.innerHeight;
 const anchor=settingsToggle.getBoundingClientRect(),right=left+width-margin,bottom=top+height-margin;
 if(anchor.bottom<top||anchor.top>top+height||anchor.right<left||anchor.left>left+width){showSettings(false);return;}
 const panelWidth=Math.min(360,Math.max(1,width-2*margin));
 settingsPanel.style.width=panelWidth+'px';
 settingsPanel.style.maxHeight=Math.max(1,height-2*margin)+'px';
 const panelHeight=settingsPanel.getBoundingClientRect().height;
 const below=Math.max(0,bottom-anchor.bottom-gap),above=Math.max(0,anchor.top-gap-top-margin);
 const upward=panelHeight>below&&above>below,space=upward?above:below;
 // Very short visual viewports still get a usable, internally scrollable panel.
 const maxHeight=space>=120?space:Math.max(1,height-2*margin);
 settingsPanel.style.maxHeight=maxHeight+'px';
 const visibleHeight=Math.min(panelHeight,maxHeight);
 settingsPanel.style.left=Math.max(left+margin,Math.min(anchor.right-panelWidth,right-panelWidth))+'px';
 settingsPanel.style.top=Math.max(top+margin,Math.min(upward?anchor.top-gap-visibleHeight:anchor.bottom+gap,bottom-visibleHeight))+'px';
}
function showSettings(open,restoreFocus=false){
 if(open){
  showInfo(false);
  settingsPanel.hidden=false;
  if(nativeSettingsPopover&&!settingsPanel.matches(':popover-open'))settingsPanel.showPopover();
  positionSettings();
 }else{
  if(nativeSettingsPopover&&settingsPanel.matches(':popover-open'))settingsPanel.hidePopover();
  settingsPanel.hidden=true;
  if(restoreFocus||settingsPanel.contains(document.activeElement))settingsToggle.focus({preventScroll:true});
 }
 settingsToggle.setAttribute('aria-expanded',String(!settingsPanel.hidden));
}
settingsPanel.querySelector('#planner-settings-close').onclick=()=>showSettings(false,true);
// A portalled non-modal popup keeps a logical keyboard path back to its trigger.
settingsPanel.addEventListener('keydown',event=>{
 if(event.key!=='Tab')return;
 const first=$('#planner-settings-close'),last=$('#compare-routes');
 if(event.shiftKey&&event.target===first){event.preventDefault();showSettings(false,true);}
 else if(!event.shiftKey&&event.target===last){event.preventDefault();showSettings(false);$('[data-planner-strategy="time"]').focus({preventScroll:true});}
});
document.addEventListener('focusin',event=>{
 if(!settingsPanel.hidden&&!settingsPanel.contains(event.target)&&!settingsToggle.contains(event.target)&&!event.target.contains(settingsPanel))showSettings(false);
});
window.addEventListener('resize',positionSettings);
document.addEventListener('scroll',event=>{if(!settingsPanel.contains(event.target))positionSettings();},true);
window.visualViewport?.addEventListener('resize',positionSettings);
window.visualViewport?.addEventListener('scroll',positionSettings);
infoHost.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')showInfo(true);});
infoHost.addEventListener('pointerleave',()=>{if(!infoPinned&&!infoHost.contains(document.activeElement))showInfo(false);});
infoToggle.addEventListener('focus',()=>showInfo(true));
infoHost.addEventListener('focusout',event=>{if(!infoHost.contains(event.relatedTarget)&&!infoPinned)showInfo(false);});
infoToggle.onclick=()=>showInfo(!infoPinned,!infoPinned);
settingsToggle.onclick=()=>{const open=settingsPanel.hidden;showSettings(open);if(open&&!settingsPanel.hidden)$('#planner-cadence').focus({preventScroll:true});};
document.addEventListener('pointerdown',event=>{if(!infoHost.contains(event.target))showInfo(false);if(!settingsPanel.contains(event.target)&&!settingsToggle.contains(event.target))showSettings(false);});
document.addEventListener('keydown',event=>{if(event.key!=='Escape'||(infoPanel.hidden&&settingsPanel.hidden)||document.querySelector('dialog[open]'))return;event.preventDefault();event.stopImmediatePropagation();if(!infoPanel.hidden){infoToggle.focus({preventScroll:true});showInfo(false);}if(!settingsPanel.hidden)showSettings(false,true);},true);

// v58: compact, immediately applied constraints. Saved route requirements are never filtered away.
const requiredHost=document.createElement('section');requiredHost.className='required-stops-panel';requiredHost.setAttribute('aria-label','本趟必去地點');
$('.planner-constraint-grid').prepend(requiredHost);
requiredHost.innerHTML='<details class="required-editor"><summary id="required-summary" aria-controls="required-options"><span class="required-summary-text">選擇必去地點</span><span class="constraint-chevron" aria-hidden="true">⌄</span></summary><div id="required-options" class="required-options"><p class="required-feedback" role="status" aria-live="polite"></p><div class="required-choice-groups"></div></div></details>';
const requiredEditor=requiredHost.querySelector('.required-editor'),requiredSummary=$('#required-summary');
requiredEditor.addEventListener('toggle',()=>{requiredSummary.setAttribute('aria-expanded',String(requiredEditor.open));if(requiredEditor.open)$('#required-options').scrollTop=0;});
function openRequired(){requiredEditor.open=true;requiredSummary.setAttribute('aria-expanded','true');}
function closeRequired(restoreFocus=false){requiredEditor.open=false;requiredSummary.setAttribute('aria-expanded','false');if(restoreFocus)requiredSummary.focus({preventScroll:true});}
requiredHost.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&requiredEditor.open){event.preventDefault();event.stopPropagation();closeRequired(true);return;}
 if(event.target!==requiredSummary)return;
 if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();openRequired();const choices=[...requiredHost.querySelectorAll('input[type="checkbox"]:not(:disabled)')];(event.key==='ArrowUp'?choices.at(-1):choices[0])?.focus({preventScroll:true});}
});
document.addEventListener('pointerdown',event=>{if(requiredEditor.open&&!requiredHost.contains(event.target))closeRequired();});
// A label press first focuses the outer console before activating its checkbox.
// Do not close <details> while that ancestor receives focus: it would hide the
// pressed label during the browser's native pointer/focus processing.
document.addEventListener('focusin',event=>{if(requiredEditor.open&&!requiredHost.contains(event.target)&&!event.target.contains(requiredHost))closeRequired();});
let requiredRenderTimer;
function refreshRequiredPlan(){clearTimeout(requiredRenderTimer);requiredRenderTimer=setTimeout(()=>{requiredRenderTimer=undefined;F.renderMap();},0);}
function removeRequired(map,code,index){const {w,i,ship}=sel();if(sailing(w,i))return;const list=ship.requiredStops||[],matches=stop=>stop?.map===map&&stop.code===code,target=matches(list[index])?index:list.findIndex(matches);if(target<0)return;ship.requiredStops=list.filter((_,n)=>n!==target);requiredHost.querySelector('.required-feedback').textContent='';F.save();refreshRequiredPlan();}
requiredHost.addEventListener('change',event=>{const input=event.target.closest('[data-required-choice]');if(!input)return;if(input.checked)addRequired(input.dataset.map,input.dataset.code);else removeRequired(input.dataset.map,input.dataset.code,Number(input.dataset.requiredIndex));});
function addRequired(map,code){
 const {w,i,ship}=sel(),feedback=requiredHost.querySelector('.required-feedback');const fromMap=window.SubNodeUI?.isOpen()===true;if(fromMap)window.SubNodeUI.close(false);openRequired();if(fromMap){requiredHost.scrollIntoView({behavior:'smooth',block:'center'});requiredSummary.focus({preventScroll:true});}
 const reject=message=>{feedback.textContent=message;renderRequired();$('#required-options').scrollTop=0;return false;};
 if(sailing(w,i))return reject('此船尚未確認收船；先處理目前航次，再調整必去計畫。');
 const list=ship.requiredStops||[],targetMap=F.maps.find(m=>m.id===map),node=targetMap?.nodes.find(n=>n.code===code);
 if(!node)return reject('請先選擇有效地點。');
 if(list.some(x=>x.map===map&&x.code===code))return reject('這個地點已在必去清單。');
 if(map!==w.map||F.nodeState(targetMap,code)!=='opened')return reject('只能加入目前海圖中已開啟的地點；既有必去地點仍保留。');
 if(list.length>=5)return reject('一趟最多 5 個地點，請先移除一站再加入。');
 if(list.some(x=>x.map!==map))return reject('一趟不能跨海域。請另排一趟，或先移除其他海域的必去地點。');
 ship.requiredStops=[...list,{map,code}];if(!list.length&&goalOf(w)==='auto'){ship.plannerGoal=ship.goal='explore';strategy='time';document.querySelectorAll('[data-planner-strategy]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.plannerStrategy===strategy)));}
 feedback.textContent='';F.save();refreshRequiredPlan();return true;
}
let requiredContext='',requiredChoicesKey='';
function renderRequired(){
 const {w,i,ship}=sel(),context=w.id+':'+i,map=F.maps.find(m=>m.id===w.map),list=ship.requiredStops||[];
 if(context!==requiredContext){requiredContext=context;requiredHost.querySelector('.required-feedback').textContent='';closeRequired();}
 const needsSea=list.some(x=>x.map!==w.map)||new Set(list.map(x=>x.map)).size>1;
 requiredHost.querySelector('.required-summary-text').textContent=list.length?'本趟必去: '+list.map(x=>(needsSea?mapName(x.map)+' ':'')+x.code).join(', '):'選擇必去地點';
 requiredSummary.setAttribute('aria-expanded',String(requiredEditor.open));
 const green=(map?.nodes||[]).filter(node=>F.nodeState(map,node.code)==='opened');
 const current=green.map(node=>({map:w.map,code:node.code,index:list.findIndex(x=>x.map===w.map&&x.code===node.code),note:''}));
 // Keep off-map, unopened, invalid and duplicate saved constraints visible and removable.
 const other=list.map((x,n)=>({x,n})).filter(({x,n})=>x.map!==w.map||!green.some(node=>node.code===x.code)||list.findIndex(y=>y.map===x.map&&y.code===x.code)!==n);
 const saved=other.map(({x,n})=>{const m=F.maps.find(item=>item.id===x.map),node=m?.nodes.find(item=>item.code===x.code);return {map:x.map,code:x.code,index:n,note:!node?'地點資料無法辨識':F.nodeState(m,x.code)!=='opened'?'尚未開啟／目前不可用':x.map!==w.map?'非目前海圖':'重複的已存條件'};});
 const choices=[...current,...saved],structureKey=JSON.stringify([w.map,current.map(x=>[x.map,x.code]),saved.map(x=>[x.map,x.code,x.note])]);
 // v59: never replace the checkbox being activated. A selection only changes
 // properties, preserving native checkbox activation and keyboard focus. The
 // full plan/map refresh runs after the current input event has completed.
 if(structureKey!==requiredChoicesKey){
  const active=document.activeElement,focused=requiredHost.contains(active)&&active.matches('[data-required-choice]')?{map:active.dataset.map,code:active.dataset.code,index:active.dataset.requiredIndex}:null;
  const choice=x=>'<label class="required-choice"><input type="checkbox" data-required-choice data-map="'+esc(x.map)+'" data-code="'+esc(x.code)+'"><span>'+esc((x.map!==w.map?mapName(x.map)+' ':'')+x.code)+(x.note?'<small>'+esc(x.note)+'</small>':'')+'</span></label>';
  requiredHost.querySelector('.required-choice-groups').innerHTML='<fieldset class="required-current"><legend>'+esc(mapName(w.map))+' · 已開啟</legend>'+(current.map(choice).join('')||'<p class="required-empty">目前海圖沒有已開啟的地點</p>')+'</fieldset>'+(saved.length?'<fieldset class="required-saved"><legend>其他已選地點</legend>'+saved.map(choice).join('')+'</fieldset>':'');
  requiredChoicesKey=structureKey;
  if(focused){const inputs=[...requiredHost.querySelectorAll('[data-required-choice]')],next=inputs.find((input,n)=>input.dataset.map===focused.map&&input.dataset.code===focused.code&&String(choices[n].index)===focused.index)||inputs.find(input=>input.dataset.map===focused.map&&input.dataset.code===focused.code);(next||requiredSummary).focus({preventScroll:true});}
 }
 requiredHost.querySelectorAll('[data-required-choice]').forEach((input,n)=>{const choice=choices[n],selected=choice.index>=0;input.checked=selected;input.disabled=sailing(w,i);input.dataset.requiredIndex=String(choice.index);input.closest('.required-choice').classList.toggle('is-selected',selected);});
}
// This flag distinguishes untouched default zero from an explicit unlimited selection.
// The persisted numeric plannerHours remains the sole input to route calculation.
const hoursChoiceKey='ff14-submersible-planner-hours-chosen-v58';
let hoursChoices={};try{const saved=JSON.parse(localStorage.getItem(hoursChoiceKey)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))hoursChoices=saved;}catch(_){}
function renderHours(){const {w}=sel(),hours=w.plannerHours??0,chosen=hours>0||hoursChoices[w.id]===true;$('#planner-hours').value=chosen?String(hours):'';$('#planner-hours-summary').textContent=chosen?'單趟時間上限: '+(hours?hours+'小時':'不限'):'選擇單趟時間上限';}

function sel(){const w=F.workshop(),i=w.activeVoyageShip;return {w,i,ship:w.ships[i],voyage:w.voyages[i]};}
function goalOf(w,index=w.activeVoyageShip){return w.ships[index]?.plannerGoal||w.plannerGoal||'auto';}
function targetOf(w,index=w.activeVoyageShip){return w.ships[index]?.collectionTarget||w.collectionTarget||C.items[0].id;}
function key(){const {w,i}=sel();return JSON.stringify([w.id,i,w.ships,w.opened,w.visited,w.slotUnlocked,w.plannerGoal,w.collectionTarget,w.cadenceHours,w.sailings,strategy,$('#planner-hours').value,$('#planner-scope').value,$('#planner-scope').value==='current'?w.map:null]);}
function sailing(w,i){return F.isSailing?.(w,i)===true;}
function emptyAction(){
 const {w,i,ship}=sel(),goal=goalOf(w,i);
 if(!ship.enabled||!E.stats(ship).valid)return ['settings','確認船隻等級與配裝'];
  if(goal==='explore'||ship.requiredStops?.length)return ['required','檢查本趟必去地點'];
 if(goal==='manual')return ['map','在海圖手動選點'];
 const ability=E.stats(ship),unconstrained=goal==='gil'?(E.npcEvidence||[]).some(e=>ability.surveillance>=e.surveillance&&ability.retrieval>=e.retrieval&&ability.favor>=e.favor&&E.calculate(ship,e.map,[e.code],w.opened).valid):goal==='item'?Boolean(decision?.jobs.length):Object.entries(E.data.maps).some(([map,d])=>d.nodes.some(n=>isOpen(w,map,n.code)&&E.calculate(ship,map,[n.code],w.opened).valid));
 if(unconstrained&&(Number($('#planner-hours').value)>0||$('#planner-scope').value==='current'))return ['constraints','檢查航時上限與比較範圍'];
 if(goal==='item'){
  const item=C.items.find(x=>x.id===targetOf(w));
  if(item?.sources.some(x=>x.regionConfirmed===true&&isOpen(w,x.map,x.code)))return ['build','查看收藏門檻與配裝試算'];
 }
 if(goal==='gil'&&(E.npcEvidence||[]).some(x=>isOpen(w,x.map,x.code)))return ['settings','查看性能缺項並設定配裝'];
 return ['progress','核對並補登已開圖進度'];
}
function updateEmptyAction(){const action=emptyAction();$('#open-route-planner').hidden=Boolean(candidates.length)||$('#planner-results').getAttribute('aria-busy')==='true';$('#open-route-planner').textContent=action[1];}
function statsLabel(s){return keys.map((k,i)=>fields[i]+' '+s[k]).join(' · ');}
function getNode(map,code){return F.maps.find(m=>m.id===map)?.nodes.find(n=>n.code===code);}
function isOpen(w,m,c){return w.opened[m]?.[c]===true;}
// Policy selects a goal/frontier, never a final single-stop itinerary.
function frontier(w,map,code){
 const seen=new Set();let n=getNode(map,code);
 while(n&&!isOpen(w,map,n.code)){if(!n.parent||seen.has(map+code))return null;seen.add(map+code);[map,code]=n.parent;n=getNode(map,code);}
 return n?{map,code:n.code}:null;
}
function decide(){
 const {w,i,ship}=sel(),goal=goalOf(w,i),ability=E.stats(ship);
 if(goal==='item'){
  const p=C.plan(targetOf(w),w,i),ready=p.routes.filter(r=>r.shipIndex===i&&r.ready),frontiers=p.routes.filter(r=>r.shipIndex===i&&r.kind==='unlock');
  let jobs=ready.length&&ship.enabled&&!sailing(w,i)&&ability.valid?[{shipIndex:i,mode:'collection',collectionSources:p.item.sources.filter(x=>x.regionConfirmed===true),kind:'collect'}]:[...new Set(frontiers.map(r=>r.shipIndex))].map(j=>({shipIndex:j,mode:'auto',priorityStops:frontiers.filter(r=>r.shipIndex===j).map(r=>({map:r.map,code:r.nodes[0]})),kind:'unlock'}));
  if(ship.requiredStops?.length)jobs=jobs.filter(j=>j.shipIndex===i).flatMap(j=>j.kind==='unlock'?j.priorityStops.map(front=>({...j,requiredStops:[...ship.requiredStops,...(ship.requiredStops.some(x=>x.map===front.map&&x.code===front.code)?[]:[front])]})):[j]);
  return {title:ready.length?'比較可取得收藏的航線':jobs.length?'收藏前置開圖 · 本趟不取得目標':'收藏條件尚未備齊',copy:ready.length?'比較本艇的來源訪問數與作息；掉率未知，不等於保證取得或最高掉率。':jobs.length?'先朝已確認來源的前置探索。'+(strategy==='time'?'省時只保留這個前置成果，再取短航時，可能放棄旁支。':'同趟比較其他可開地點與經驗。')+'這不是目標家具採集。':'請查看各船缺項，或試算配裝。若想先練等，請明確切換目標；不自動替換你的收藏目標。',details:p.blockers,jobs};
 }
 if(!ship.enabled)return {title:'先登記你已經擁有的船',copy:'先確認等級與四部件，並依遊戲補登開圖；不預填進度。',jobs:[]};
 if(sailing(w,i))return {title:'這艘船有尚未收船的航次',copy:'先確認收船或取消誤登，再規劃下一趟；既有航次保持不變。',jobs:[]};
 if(!ability.valid)return {title:'先確認配裝，才有可靠推薦',copy:ability.errors.join(' '),jobs:[]};
 if(goal==='manual')return {title:'依你的節奏，手動規劃',copy:'在海圖選點；同趟最多五站且不能跨海域。',jobs:[]};
 const job={shipIndex:i,mode:goal};
 if(goal==='explore')return {title:'指定地點探索 · 全部必去',copy:'只有包含全部指定地點的航線才會列出。省時選最短航時；成果比較順帶開圖與經驗；效率比較成果與有效收船週期。航線經過附近不算探索。',jobs:ship.requiredStops?.length?[job]:[],details:ship.requiredStops?.length?[]:['請先加入至少一個本趟必去地點。']};
 if(goal==='unlock')return {title:'比較所有可開圖的組合',copy:'計算所有已開、可拜訪航點的 1–5 站順序；可能發現的目標數不是開圖成功率，探查不提高開圖率。',jobs:[job]};
 if(goal==='level')return {title:'比較基礎經驗與收船作息',copy:ship.rank>=130?'已達台服 Rank 130 上限；仍可比較航線基礎經驗，但不能再提升等級，建議改選收藏或 NPC。':'成果看每趟基礎經驗；效率看有效週期。未計隨機加成，不保證升級天數。',jobs:[job]};
 if(goal==='gil')return {title:'比較有成熟樣本支持的 NPC 毛值',copy:'社群毛值，非保底、非淨利。依目前配裝比較有樣本支持的來源。',details:(E.npcEvidence||[]).map(e=>e.code+'（需 R'+(getNode(e.map,e.code)?.rank||'未知')+'，目前 R'+ship.rank+'）：'+(!isOpen(w,e.map,e.code)?'尚未開啟；':'')+'成熟門檻 探查 '+e.surveillance+'／收集 '+e.retrieval+'／恩惠 '+e.favor+'；目前 '+ability.surveillance+'／'+ability.retrieval+'／'+ability.favor+'，缺 '+Math.max(0,e.surveillance-ability.surveillance)+'／'+Math.max(0,e.retrieval-ability.retrieval)+'／'+Math.max(0,e.favor-ability.favor)),jobs:[job]};
 const register=[1,2,3].find(n=>F.isSlotUnlocked(w,n)&&!w.ships[n].enabled);
 if(register!==undefined)return {title:'第 '+(register+1)+' 船位已開，準備登記新船',copy:'船位依探索紀錄或既有登記開放。備齊零件與登記票後，依遊戲實際船隻資料登記；目前船同時比較完整開圖航線。',jobs:[{...job,mode:'unlock'}]};
 const next=[1,2,3].find(n=>!w.ships[n].enabled&&!F.isSlotUnlocked(w,n));
 let target=next!==undefined?['deep',['','J','O','T'][next],'第 '+(next+1)+' 船位']:null;
 if(!target){const entries=[['deep','AD','灰海'],['ash','R','翠浪海'],['jade','T','妖歌海'],['siren','T','紫礁海'],['lilac','T','南蒼茫洋']];target=entries.find((x,n)=>!isOpen(w,F.maps[n+1].id,'A'));}
 if(target){const f=frontier(w,target[0],target[1]),check=f&&E.calculate(ship,f.map,[f.code],w.opened);
  if(check?.valid)return {title:'系統推薦：優先'+target[2],copy:'優先納入 '+mapName(f.map)+' '+f.code+' 前置。'+(strategy==='time'?'省時模式只保留主線前置成果，再取最短；可能放棄旁支。若要保留最多新點，請改選「開船位／開圖」。':strategy==='efficiency'?'效率先比主線前置／有效週期，再比其他新點與經驗；不等於所有開圖總數最大。':'再比較同趟其他新點與經驗；主線不是唯一航點。')+'發現航點不等於取得船位。',jobs:[{...job,mode:'auto',priorityStops:[f]}]};
  return {title:'主線尚不可行 · 明示改比練等',copy:(check?check.errors.join(' '):'尚無已登記前置，請先補登實際已開地點。')+' 下方只比較練等，不代表推進 '+target[2]+'。',jobs:[{...job,mode:'level',kind:'level'}]};
 }
 return {title:'主線已登記，比較其他航線',copy:ship.rank>=130?'已達台服等級上限；下方僅列基礎經驗比較，不會再升級，可改選收藏或 NPC 收入。':'目前沒有待確認的主線；以基礎經驗比較，也可自行改選收藏或 NPC 收入。',jobs:[{...job,mode:'level'}]};
}
function routeCards(routes){
 const {w}=sel();
 if(!routes.length){$('#candidate-calculation-details').innerHTML='';return calculationCompleted?'<p class="empty-state">目前條件下沒有候選航線</p>':'';}
 selectedCandidate=Math.min(selectedCandidate,routes.length-1);
 const n=selectedCandidate,r=routes[n],si=r.shipIndex??w.activeVoyageShip,ship=w.ships[si],calc=E.calculate(ship,r.map,r.nodes,w.opened),cycle=E.effectiveCycle(calc.seconds,w.cadenceHours??24);
 const disabled=si!==w.activeVoyageShip||!calc.valid||sailing(w,si),targets=r.targets||[];
 const context=r.kind==='other-goal'?'主線受限 · 其他目標備案':r.kind==='collect'?'收藏來源':r.kind==='unlock'?'收藏前置 · 不取得目標':r.kind==='level'?'練等路線':'';
 $('#candidate-calculation-details').innerHTML='<p>'+esc(r.reason||'')+'</p>'+(r.ranking?.mode==='collection'?'<p>符合目標來源 '+r.collectionVisits+' 站，掉率未知。</p>':'')+'<p>航距 '+calc.range+'／'+calc.ability.range+' · '+esc(statsLabel(calc.ability))+'。</p><p>航時為公式估算，以遊戲管制台為準。基礎經驗不含隨機加成；開圖與掉落不保證成功。燃料與耐久請在遊戲核對。</p>'+(calc.errors.length?'<p>'+esc(calc.errors.join(' '))+'</p>':'');
 const tabs='<h3 class="candidate-list-heading" id="candidate-list-heading">候選航線</h3><div class="candidate-choices" role="group" aria-labelledby="candidate-list-heading">'+routes.map((route,index)=>'<button type="button" data-candidate="'+index+'" aria-pressed="'+(index===n)+'" aria-controls="selected-candidate" title="'+esc(mapName(route.map)+' · '+route.nodes.join(' → '))+'" aria-label="'+esc(mapName(route.map)+' · '+route.nodes.join(' → '))+'"><span class="candidate-check" aria-hidden="true">'+(index===n?'✓':'')+'</span><span class="candidate-choice-route">'+esc(route.nodes.join(' → '))+'</span></button>').join('')+'</div>';
 return tabs+'<article id="selected-candidate" class="planner-result" aria-label="所選推薦航線"><div class="route-facts"><span>預估航時<b>'+duration(calc.seconds)+'</b></span><span>有效週期<b>'+duration(cycle)+'</b></span></div><dl class="candidate-benefits"><div><dt>燃料</dt><dd>'+calc.fuel+' 罐</dd></div><div><dt>基礎經驗</dt><dd>'+calc.xp.toLocaleString('zh-TW')+'</dd></div><div><dt>可能發現</dt><dd>'+esc(targets.length?targets.join('、'):'無新地點候選')+'</dd></div></dl>'+(r.shipChoices?.length>1?'<label class="field-label candidate-ship-choice">派遣船隻<select data-candidate-ship="'+n+'">'+r.shipChoices.map(j=>'<option value="'+j+'" '+(j===si?'selected':'')+'>'+(j+1)+' 號艇</option>').join('')+'</select></label>':'')+'<div class="candidate-actions"><button type="button" data-preview="'+n+'" '+(disabled?'disabled':'')+'>在海圖預覽</button><button type="button" data-depart="'+n+'" '+(disabled?'disabled':'')+'>以此路線出航</button></div></article>';
}
function renderCollection(){
 const {w}=sel();$('#collection-browser').hidden=goalOf(w)!=='item';$('#collection-reference').hidden=goalOf(w)!=='item';
 const query=$('#collection-search').value.toLowerCase(),kind=$('#collection-kind').value,items=C.items.filter(x=>(kind==='all'||x.kind===kind)&&(itemLabel(x)+' '+x.description+' '+x.dropItem).toLowerCase().includes(query));
 const selected=targetOf(w);
 $('#collection-target').innerHTML='<option value="">選擇收藏目標</option>'+items.map(x=>'<option value="'+esc(x.id)+'">'+esc(itemLabel(x))+'</option>').join('');
 if(items.some(x=>x.id===selected))$('#collection-target').value=selected;
 const item=C.items.find(x=>x.id===selected);$('#collection-results-status').textContent=items.length+' 項符合條件（篩選不更改原目標）；目前目標：'+(itemLabel(item)||'未選擇');
 $('#collection-description').innerHTML=item?'<p><b>'+esc(item.kind==='finished'?'成品直接掉落':'先取得素材，再製作')+'</b><br>'+esc(item.dropItem)+(item.quantity?' × '+item.quantity:'')+' → '+esc(item.name)+'</p><p>'+esc(item.description)+'</p><details><summary>來源、配方與版本</summary><p>'+esc(item.recipe)+'<br>物品初登場：'+esc(item.itemIntroducedPatch||'未核實')+'。掉落來源版本與物品版本分開核對。</p>'+(item.sources||[]).map(src=>'<p><b>'+esc(src.regionConfirmed!==true?'來源版本待確認 · 不列可刷推薦':'7.2 前來源有紀錄／版本相容推論')+'</b><br>'+esc(mapName(src.map)+' '+src.code)+' · R'+src.rank+' · 探查≥'+src.surveillance+'<br>'+esc(src.thresholdNote||'')+(src.historicalEvidence?'<br>至遲 '+esc(src.historicalEvidence.dropKnownByDate)+' 已有掉落記錄；不是首次加入版本。 <a href="'+esc(src.historicalEvidence.sourceURL)+'" target="_blank" rel="noreferrer">歷史證據 ↗</a>':'')+'<br>來源加入版本：'+esc(src.dropAddedPatch||'尚未逐來源核實')+' · <a href="'+esc(src.sourceURL||item.sourceURL)+'" target="_blank" rel="noreferrer">查核來源 ↗</a></p>').join('')+'<a href="'+esc(item.sourceURL)+'" target="_blank" rel="noreferrer">物品／配方來源 ↗</a></details><small>'+esc(C.scope)+'</small>':'<p>找不到相符家具。此處為精選目錄，不表示遊戲沒有此物品。</p>';
}
function renderMilestones(){const {w,i}=sel();mobileFleet.textContent=w.name+' · '+(i+1)+' 號艇　／　管理艦隊 ▾';
 $('#harbor-status').innerHTML='<strong>'+w.ships.filter(x=>x.enabled).length+' <small>/ 4 艘已登記</small></strong><span>資料僅儲存在此瀏覽器</span>';
}
function enhanceMap(){window.SubMapUI?.render({fleet:F,previewRoute:preview?.route||null});}
function fleetStatus(){F.refreshShipStatuses();}

function render(){
 const {w,i,ship}=sel(),status=renderShipState();
 if(status!=='ready'){run++;lastKey='';candidateKey='';calculationCompleted=false;candidates=[];preview=null;$('#planner-results').setAttribute('aria-busy','false');renderMilestones();enhanceMap();fleetStatus();window.SubLogbook?.render();return;}
 const context=w.id+':'+i;if(context!==disclosureContext){disclosureContext=context;showSettings(false);showInfo(false);}renderRequired();renderHours();const k=key();
 if(k!==lastKey){calculationCompleted=false;run++;$('#planner-results').setAttribute('aria-busy','false');preview=null;selectedCandidate=0;candidateKey='';showInfo(false);buildSuggestions=[];$('#collection-build-results').innerHTML='';lastKey=k;$('#planner-mode').value=goalOf(w,i);$('#planner-cadence').value=String(w.cadenceHours??24);renderCollection();decision=decide();candidates=[];$('#next-step-title').textContent=decision.title;$('#mobile-next-title').textContent=goalOf(w,i)==='item'?itemLabel(C.items.find(x=>x.id===targetOf(w))||C.items[0])+' · '+decision.title:decision.title;$('#next-step-copy').textContent=decision.copy;$('#next-step-details').querySelector('summary').textContent=goalOf(w)==='gil'?'收益模型與缺項':'查看各船缺項與來源限制';$('#next-step-details').hidden=!decision.details?.length;$('#next-step-detail-list').innerHTML=(decision.details||[]).map(t=>'<li>'+esc(t)+'</li>').join('');$('#planner-status').textContent='';$('#planner-results').innerHTML=routeCards(candidates);if(decision.jobs.length)compare();}
 $('#planner-ship-summary').textContent=w.name+' · '+(i+1)+' 號艇 · '+(ship.enabled?'Rank '+ship.rank:'尚未登記')+' · '+({outcome:'成果優先',efficiency:'效率優先',time:'省時優先'}[strategy]);
 updateEmptyAction();

 renderMilestones();enhanceMap();fleetStatus();window.SubLogbook?.render();
}
function applyCandidate(n,depart=false){
 const r=candidates[n],{w}=sel();if(!r)return false;
 if(candidateKey!==key()){$('#planner-status').textContent='條件已變更，請等待重新比較。';render();return false;}
 const i=r.shipIndex??w.activeVoyageShip,ship=w.ships[i];
 if(i!==w.activeVoyageShip){F.notice('所選船隻已變更，請重新選擇本艇的推薦航線。');render();return false;}
 if(sailing(w,i)){F.notice('尚未收船，不能取代航次計畫。');return false;}
 const missing=(ship.requiredStops||[]).filter(x=>x.map!==r.map||!r.nodes.includes(x.code));if(missing.length){$('#planner-status').textContent='此候選缺少本趟必去地點，請重新比較。';return false;}
 const calc=E.calculate(ship,r.map,r.nodes,w.opened);if(!calc.valid){$('#planner-status').textContent=calc.errors.join(' ');return false;}
 if(depart&&typeof window.SubLogbook?.depart!=='function'){$('#planner-status').textContent='出航功能尚未載入，請重新整理。';return false;}
 const previous={voyage:w.voyages[i],index:w.activeVoyageShip,map:w.map,node:w.selectedNode};
 w.voyages[i]={map:r.map,nodes:[...r.nodes]};w.activeVoyageShip=i;w.map=r.map;w.selectedNode=r.nodes[0];
 if(depart){
  const sailingRecord=w.sailings?.[i],expected={item:w,index:i,sailing:sailingRecord,signature:JSON.stringify(sailingRecord),planSignature:JSON.stringify([ship,w.voyages[i],w.opened])};
  if(!window.SubLogbook.depart(expected)){w.voyages[i]=previous.voyage;w.activeVoyageShip=previous.index;w.map=previous.map;w.selectedNode=previous.node;F.renderAll();return false;}
  $('#map-voyage-status')?.focus({preventScroll:true});
 }else{
  preview={route:r,index:n,key:key()};F.save();F.renderAll();$('#map-plan-route')?.focus({preventScroll:true});F.notice('');
  if(window.innerWidth<=760)$('.map-viewport').scrollIntoView({behavior:'smooth',block:'start'});
 }
 return true;
}
function previewRoute(n){return applyCandidate(n);}
function allTargets(){const out={};for(const map of F.maps)for(const node of map.nodes){if(F.nodeState(map,node.code)!=='available'||!node.parent)continue;const [m,c]=node.parent;out[m]??={};out[m][c]??=[];out[m][c].push(map.name+' '+node.code);}return out;}
async function compare(){
 const {w}=sel();if(selectedShipState()!=='ready')return;decision=decide();if(!decision.jobs.length)return;
 const token=++run,k=key(),snapshot=structuredClone(w),targets=allTargets(),scope=$('#planner-scope').value==='current'?[w.map]:undefined;
 const stopped=()=>token!==run||key()!==k;
 calculationCompleted=false;candidates=[];selectedCandidate=0;candidateKey='';preview=null;$('#planner-results').setAttribute('aria-busy','true');$('#planner-results').innerHTML='<p class="empty-state">正在完整比較 1–5 站組合與順序…</p>';$('#planner-status').textContent='正在計算；更改目標或船隻會取消舊比較。';
 let checked=0,results=[],warnings=[];
 try{
  await new Promise(resolve=>setTimeout(resolve,0));
  for(const job of decision.jobs){if(stopped())return;
   const result=await E.recommend(snapshot.ships[job.shipIndex],snapshot.opened,targets,{...job,requiredStops:job.requiredStops||snapshot.ships[job.shipIndex].requiredStops||[],strategy,cadenceHours:snapshot.cadenceHours??24,hours:Number($('#planner-hours').value),...(scope?{maps:scope}:{}),cancelled:stopped,onProgress:()=>{if(!stopped())$('#planner-status').textContent='正在比較可行航線…';}});
   if(stopped()||result.cancelled)return;checked+=result.checked||0;warnings.push(...[...(result.errors||[]),...(result.warnings||[])].map(displayReason));
   results.push(...result.routes.filter(r=>job.kind!=='unlock'||r.priorityVisits>0).map(r=>({...r,shipIndex:job.shipIndex,kind:job.kind,reason:job.kind==='unlock'?'收藏前置開圖；本趟不取得目標家具。':result.objective||'',coverage:result.coverage})));
  }
  if(stopped())return;
  const equivalentKey=r=>JSON.stringify([keys.map(k=>E.stats(snapshot.ships[r.shipIndex])[k]),r.map,[...r.nodes].sort(),r.seconds,r.range,r.fuel,r.xp,r.unlocks,r.priorityVisits,r.collectionVisits,r.expectedSalvageGil]);
  const grouped=new Map();for(const r of results){const id=equivalentKey(r),existing=grouped.get(id);if(existing){if(!existing.shipChoices.includes(r.shipIndex))existing.shipChoices.push(r.shipIndex);}else grouped.set(id,{...r,shipChoices:[r.shipIndex]});}
  for(const r of grouped.values())if(r.shipChoices.includes(snapshot.activeVoyageShip))r.shipIndex=snapshot.activeVoyageShip;
  results=[...grouped.values()].sort((a,b)=>E.compareRoutes(a,b,decision.jobs[0].mode,strategy)||a.shipIndex-b.shipIndex);candidates=[];const stopSets=new Set();for(const r of results){const id=r.map+':'+[...r.nodes].sort().join(',');if(!stopSets.has(id)){candidates.push(r);stopSets.add(id);}if(candidates.length===3)break;}
  if(goalOf(w)==='auto'&&candidates.length&&candidates[0].ranking?.mode==='auto'&&!candidates[0].priorityVisits){candidates=candidates.map(r=>({...r,kind:'other-goal'}));$('#next-step-title').textContent='主線受目前限制排除 · 其他目標備案';$('#mobile-next-title').textContent='主線受限 · 其他目標備案';$('#next-step-copy').textContent='下列候選不拜訪指定主線前置，不推進該船位／海域目標；可放寬航時或範圍再比較。';}
  if(goalOf(w)==='item'&&!candidates.length&&decision.jobs.some(j=>j.kind==='unlock')){$('#next-step-title').textContent='目前限制內沒有收藏前置航線';$('#mobile-next-title').textContent='收藏前置受限，請檢查範圍／航時';$('#next-step-copy').textContent='可拜訪的收藏前置被航時或海圖範圍排除；不以無關航點冒充前置進度，請檢查限制。';}
  calculationCompleted=true;candidateKey=k;selectedCandidate=0;$('#planner-results').innerHTML=routeCards(candidates);
  $('#planner-status').textContent='';
  const details=[...(decision.details||[]),...new Set(warnings)];$('#next-step-detail-list').innerHTML=details.map(x=>'<li>'+esc(x)+'</li>').join('');$('#next-step-details').hidden=!details.length;
  if(goalOf(w)==='gil'&&!candidates.length){$('#next-step-title').textContent='目前沒有可估算毛值的 NPC 航線';$('#mobile-next-title').textContent='NPC 成熟樣本條件尚未備齊';$('#next-step-copy').textContent=emptyAction()[0]==='constraints'?'已有成熟資格來源，但本次航時上限或海圖範圍排除了候選。':(E.npcEvidence||[]).some(x=>isOpen(w,x.map,x.code))?'已開來源尚未達成熟樣本性能或拜訪等級；這不代表不能掉落一般飾物。':'尚未登記成熟樣本來源 J／M／O／R／Z；這不代表沒有一般航線。';}
  if(sel().ship.requiredStops?.length&&!candidates.length){$('#next-step-title').textContent='本趟必去條件目前無法完成';$('#mobile-next-title').textContent='指定探索受限 · 查看原因';$('#next-step-copy').textContent=[...new Set(warnings)].join(' ')||'沒有同時滿足指定地點與目前目標的航線，請核對條件；沒有省略任何指定點。';$('#next-step-details').open=true;}
  if(candidates.length&&['auto','unlock'].includes(candidates[0].ranking?.mode)&&candidates[0].unlocks===0)$('#planner-status').textContent+=' 目前沒有可發現新地點的候選，下列僅是經驗比較，不會開圖。';
  updateEmptyAction();F.renderMap();
 }catch(error){if(!stopped()){$('#planner-status').textContent='未能完成計算，沒有修改任何航程。請按重新比較重試。';$('#planner-results').innerHTML='<p class="empty-state">計算失敗，未以單站替代完整結果。</p>';}}
 finally{if(token===run){$('#planner-results').setAttribute('aria-busy','false');updateEmptyAction();}}
}
function openProgressEditor(){window.SubNodeUI?.openManagement({progress:true,trigger:$('#open-route-planner')});}
function openShipSettings(){const {w,i}=sel();F.openShipEditor(w.id,i);}
$('#open-route-planner').onclick=()=>{if(candidates.length){previewRoute(0);return;}const action=emptyAction()[0];if(action==='required'){openRequired();requiredHost.scrollIntoView({behavior:'smooth',block:'center'});requiredSummary.focus({preventScroll:true});}else if(action==='settings'){$('#next-step-details').open=true;openShipSettings();}else if(action==='build'){$('.collection-build-panel').open=true;$('.collection-provenance').open=true;$('#collection-reference').scrollIntoView({behavior:'smooth',block:'start'});}else if(action==='constraints'){if($('#planner-scope').value==='current'){settingsToggle.scrollIntoView({behavior:'smooth',block:'center'});showSettings(true);$('#planner-scope').focus({preventScroll:true});}else{$('#planner-hours').scrollIntoView({behavior:'smooth',block:'center'});$('#planner-hours').focus({preventScroll:true});}}else if(action==='plan')window.SubLogbook?.openDetails(null,$('#open-route-planner'));else if(action==='map')$('.map-viewport').scrollIntoView({behavior:'smooth',block:'start'});else openProgressEditor();};
$('#planner-mode').onchange=()=>{const {w}=sel();w.ships[w.activeVoyageShip].plannerGoal=$('#planner-mode').value;w.ships[w.activeVoyageShip].goal=$('#planner-mode').value;if(goalOf(w)==='explore'){openRequired();strategy='time';document.querySelectorAll('[data-planner-strategy]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.plannerStrategy===strategy)));}if(goalOf(w)==='item'&&!w.ships[w.activeVoyageShip].collectionTarget)w.ships[w.activeVoyageShip].collectionTarget=targetOf(w);F.save();render();F.renderMap();};
$('#planner-cadence').onchange=()=>{sel().w.cadenceHours=Number($('#planner-cadence').value);F.save();render();};
$('#suggest-collection-build').onclick=()=>{const {w,i}=sel();buildSuggestions=C.suggestBuild(targetOf(w),w,i);$('#collection-build-results').innerHTML=buildSuggestions.map((b,n)=>'<article class="build-suggestion"><b>'+esc(b.build.split('').map((d,j)=>d+(b.modified[j]?'+':'')).join(' / '))+'</b><p>'+esc(mapName(b.map)+' '+b.nodes.join(' → '))+' · 估算 '+duration(b.seconds)+'</p><p>'+esc(b.changes.map(c=>c.slotName+' → '+partNames[c.to.type-1]+(c.to.modified?' 改型':' 普通')).join('；'))+'</p><p>'+esc(statsLabel(b.ability))+'</p><small>'+esc(b.reason)+' 零件持有與成本未知。</small><button type="button" data-build-draft="'+n+'">帶入設定草稿（不儲存）</button></article>').join('')||'<p>目前沒有需要或能成立的替換參考。請確認來源版本、開圖、等級；若當前配裝已達標，不需為了數值更高而換件。</p>';};
$('#collection-build-results').onclick=e=>{const b=e.target.closest('[data-build-draft]');if(!b)return;const draft=buildSuggestions[Number(b.dataset.buildDraft)],{w,i}=sel();if(!draft||sailing(w,i))return;F.openShipEditor(w.id,i);$('#ship-build').value=draft.build.split('').map((value,j)=>value+(draft.modified[j]?'+':'')).join('');draft.modified.forEach((m,j)=>$('#ship-modified-'+j).checked=m);$('#ship-build').dispatchEvent(new Event('input',{bubbles:true}));$('#ship-dialog-message').textContent='這是未確認持有的試算配裝；請先確認四部件已備齊，再儲存。取消不改變現有配裝或航程。';};
$('#collection-search').oninput=renderCollection;$('#collection-kind').onchange=renderCollection;
$('#collection-target').onchange=()=>{if(!$('#collection-target').value)return;sel().ship.collectionTarget=$('#collection-target').value;F.save();render();};
$('#compare-routes').onclick=compare;
$('#planner-hours').onchange=()=>{const {w}=sel();w.plannerHours=Number($('#planner-hours').value);hoursChoices[w.id]=true;try{localStorage.setItem(hoursChoiceKey,JSON.stringify(hoursChoices));}catch(_){}F.save();lastKey='';render();};
$('#planner-scope').onchange=()=>{lastKey='';render();};
$('#planner-strategies').onclick=e=>{const b=e.target.closest('[data-planner-strategy]');if(!b)return;strategy=b.dataset.plannerStrategy;document.querySelectorAll('[data-planner-strategy]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();};
$('#planner-results').onchange=e=>{const choice=e.target.closest('[data-candidate-ship]');if(!choice)return;const n=Number(choice.dataset.candidateShip),r=candidates[n],i=Number(choice.value);if(i!==sel().i||!r?.shipChoices?.includes(i))return;r.shipIndex=i;$('#planner-results').innerHTML=routeCards(candidates);$('#planner-results [data-candidate-ship="'+n+'"]')?.focus({preventScroll:true});};
$('#planner-results').onclick=e=>{
 const selected=e.target.closest('[data-candidate]');if(selected){const n=Number(selected.dataset.candidate);if(!candidates[n])return;selectedCandidate=n;$('#planner-results').innerHTML=routeCards(candidates);$('#planner-results [data-candidate="'+n+'"]')?.focus({preventScroll:true});return;}
 const p=e.target.closest('[data-preview]');if(p&&!p.disabled){previewRoute(Number(p.dataset.preview));return;}
 const b=e.target.closest('[data-depart]');if(b&&!b.disabled)applyCandidate(Number(b.dataset.depart),true);
};
setInterval(fleetStatus,30000);
window.SubVoyageUI={render,refreshShipState,addRequired,showReturn:()=>window.SubLogbook?.openDetails(),routeForMap:id=>preview?.key===key()&&preview.route.map===id?preview.route.nodes:[]};
render();
})();
