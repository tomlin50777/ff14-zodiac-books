(function(){
'use strict';
const fleet=window.SubFleet,engine=window.SubVoyageEngine,state=window.SubState;
const host=document.createElement('section');host.className='sailing-panel';host.setAttribute('aria-label','出航與返航紀錄');
document.querySelector('#voyage-editor').prepend(host);
const dock=document.createElement('section');dock.className='return-dock';dock.setAttribute('aria-label','目前船隻返航狀態');
dock.innerHTML='<div><span class="return-dock-context"></span><label class="return-ship-label">查看船隻<select id="return-ship"></select></label><strong class="return-dock-title"></strong><p class="return-dock-copy"></p></div><button type="button" class="return-dock-action"></button>';
document.querySelector('.chart-toolbar').before(dock);
dock.querySelector('#return-ship').addEventListener('change',e=>{selected().item.activeVoyageShip=Number(e.target.value);fleet.save();fleet.renderAll();});
dock.querySelector('button').addEventListener('click',()=>{if(!window.SubVoyageUI)return;window.SubVoyageUI.showReturn();if(selected().sailing)startCollect();else host.scrollIntoView({block:'center',behavior:'smooth'});});
function renderDock(){
 const {item,index,sailing}=selected(),due=Boolean(sailing&&sailing.returnAt<=Date.now());
 dock.classList.toggle('return-due',due);dock.classList.toggle('return-active',Boolean(sailing));
 dock.querySelector('.return-dock-context').textContent=item.name+' · '+(index+1)+' 號艇';
 const select=dock.querySelector('#return-ship'),options=item.ships.map((ship,i)=>'<option value="'+i+'">'+(i+1)+' 號艇 · '+(item.sailings[i]?(item.sailings[i].returnAt<=Date.now()?'預計已返航':'航行中'):ship.enabled?'尚未出航':'未啟用')+'</option>').join('');if(select.innerHTML!==options)select.innerHTML=options;select.value=String(index);
 dock.querySelector('.return-dock-title').textContent=due?'預計已返航，等待確認收船':sailing?'航行中 · 已登記返航時間':'尚未登記出航';
 dock.querySelector('.return-dock-copy').textContent=sailing?(due?'請先在遊戲收船，再核對本趟探索紀錄。':'預計 '+stamp(sailing.returnAt)+' 返航；若已在遊戲收船，可提前確認。'):'先安排航程並在遊戲出航，再登記時間。';
 dock.querySelector('button').textContent=sailing?'確認收船 →':'查看本趟／登記出航 →';
 dock.querySelector('button').setAttribute('aria-label',item.name+' '+(index+1)+' 號艇，'+(sailing?'確認已在遊戲收船':'查看本趟計畫與出航登記'));
}

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
let activeKey='',armed='',collectionDraft=null;
function selected(){const item=fleet.workshop(),index=item.activeVoyageShip;item.sailings??=[null,null,null,null];return {item,index,ship:item.ships[index],voyage:item.voyages[index],sailing:item.sailings[index]};}
function stamp(t){return new Date(t).toLocaleString('zh-TW',{timeZoneName:'short'});}
function countdown(){renderDock();const {sailing}=selected(),node=host.querySelector('[data-countdown]');if(!node||!sailing)return;const delta=sailing.returnAt-Date.now();node.textContent=delta<=0?'預計已返航 · 等你確認收船':'預計 '+Math.floor(Math.ceil(delta/60000)/60)+' 小時 '+(Math.ceil(delta/60000)%60)+' 分後返航';}
function snapshotRoute(sailing){
 const snapshot=sailing?.snapshot,map=fleet.maps.find(m=>m.id===snapshot?.map),nodes=snapshot?.nodes;
 const recorded=snapshot?.routeRecorded===true||(snapshot?.routeRecorded!==false&&Number.isFinite(sailing?.departAt)&&sailing.departAt>0);
 if(!recorded||!map||map.locked||!Array.isArray(nodes)||!nodes.length||nodes.length>5||new Set(nodes).size!==nodes.length||nodes.some(code=>!map.nodes.some(n=>n.code===code)||(map.future||[]).includes(code)))return null;
 return {map,nodes:[...nodes]};
}
function requiredMissing(ship,voyage){return (ship.requiredStops||[]).filter(stop=>stop.map!==voyage.map||!voyage.nodes.includes(stop.code));}
function requiredMessage(missing){return '本趟指定要探索的地點尚未全部排入航程：'+missing.map(stop=>(fleet.maps.find(m=>m.id===stop.map)?.name||stop.map)+' '+stop.code).join('、')+'。請先調整航程或指定地點。';}
function render(){
 renderDock();const {item,index,ship,voyage,sailing}=selected(),key=item.id+':'+index+':'+JSON.stringify([sailing,ship,voyage,item.opened,item.visited]);
 if(key===activeKey){countdown();return;}activeKey=key;armed='';collectionDraft=null;
 const check=engine.calculate(ship,voyage.map,voyage.nodes,item.opened),route=snapshotRoute(sailing),missing=requiredMissing(ship,voyage);
 const routeText=route?route.map.name+' · '+route.nodes.join(' → '):'未記錄可信的出航航線；收船時不會從目前計畫推測探索地點。';
 host.innerHTML='<h3>'+(sailing?'返航與收船':'出航登記')+'</h3>'+(sailing?'<strong data-countdown></strong><p>返航時刻：'+esc(stamp(sailing.returnAt))+'</p><small>'+esc(sailing.source==='estimate'?'依模型估算；以遊戲確認頁為準。':'依你輸入的返航時間。')+'</small><p>本趟出航快照：'+esc(routeText)+'</p><div class="sailing-actions"><button type="button" data-sailing="collect">確認已在遊戲收船</button><button type="button" data-sailing="cancel">取消這筆出航紀錄</button></div><div data-collect-host></div>':'<p>只記錄你已在遊戲派出的船，不會操作遊戲。</p><button type="button" data-sailing="depart" '+(check.valid&&!missing.length?'':'disabled')+'>我已出航 · 一鍵估算返航</button>'+(!check.valid?'<small>先完成船隻設定與有效航線，或補登遊戲返航時間。</small>':'')+(missing.length?'<p class="sailing-required-warning">'+esc(requiredMessage(missing))+'</p>':''))+
 '<details class="sailing-correction"><summary>'+(sailing?'修正返航時間':'已在外航行？補登返航')+'</summary><p>不需要補填出發時間。時間以 '+esc(timezone)+' 顯示；跨時區仍儲存同一時刻。夏令時間重複時段建議用「剩餘時間」，不存在的時刻將拒絕。</p>'+(!sailing?'<p>只補登時間，不會把目前計畫當成出航航線。收船可不新增探索紀錄。</p>':'')+'<label>剩餘小時 <input data-hours type="number" min="0" max="10000" step="1" value="0"></label><label>剩餘分鐘 <input data-minutes type="number" min="0" max="59" step="1" value="0"></label><button type="button" data-sailing="remaining">儲存剩餘時間</button><label>或直接填返航時刻 <input data-return type="datetime-local"></label><button type="button" data-sailing="clock">儲存返航時刻</button></details><p class="sailing-feedback" role="status"></p><small>倒數歸零不會自動收船、升級、登記開圖或探索過。</small>';
 countdown();
}
function feedback(text){host.querySelector('.sailing-feedback').textContent=text;}
function snapshot(ship,voyage){return {rank:ship.rank,build:ship.build,modified:[...(ship.modified||[false,false,false,false])],map:voyage.map,nodes:[...voyage.nodes],routeRecorded:true};}
function collectPreview(){
 if(!collectionDraft)return;
 const {item,route}=collectionDraft,codes=[...host.querySelectorAll('[data-collect-stop]:checked')].map(input=>input.dataset.collectStop);
 const unknown=route?codes.filter(code=>item.opened[route.map.id]?.[code]!==true):[];
 host.querySelector('.collect-preview').textContent=codes.length?'確認後將把 '+route.map.name+' '+codes.join('、')+' 登記為探索過。'+(unknown.length?'同時把 '+unknown.join('、')+' 登記為已開啟（已發現）。':'')+' 未勾選地點的原有紀錄保持不變。':'只確認收船，不新增或移除任何探索紀錄。';
 host.querySelector('[data-sailing="collect-apply"]').textContent=codes.length?'確認收船，並套用以上紀錄':'確認收船，不新增探索紀錄';
}
function startCollect(){
 const {item,index,voyage,sailing}=selected();if(!sailing)return;
 armed='';const route=snapshotRoute(sailing);collectionDraft={item,index,sailing,route,signature:JSON.stringify(sailing)};
 const differs=route&&(voyage.map!==route.map.id||JSON.stringify(voyage.nodes)!==JSON.stringify(route.nodes));
 host.querySelector('[data-collect-host]').innerHTML='<section class="sailing-collect" aria-label="確認實際探索地點"><h4 tabindex="-1">確認本趟實際探索地點</h4>'+(sailing.returnAt>Date.now()?'<p>尚未到預計返航時刻；只有已在遊戲收船時才確認。</p>':'')+(route?'<p>依出航快照列出 <b>'+esc(route.map.name+' · '+route.nodes.join(' → '))+'</b>。請逐站核對，取消勾選沒有實際探索的地點。</p>'+(differs?'<p>目前計畫與出航快照不同；本次只採出航快照。</p>':'')+'<fieldset class="collect-stop-list"><legend>本趟實際探索（可全部取消勾選）</legend>'+route.nodes.map(code=>'<label><input type="checkbox" data-collect-stop="'+esc(code)+'" checked>'+esc(code)+'</label>').join('')+'</fieldset>':'<p>這筆紀錄沒有可信的出航航線。可確認收船，但不會從目前計畫新增探索紀錄；需要時請在地點側欄手動補登。</p>')+'<p class="collect-preview" role="status"></p><div class="sailing-actions"><button type="button" data-sailing="collect-dismiss">返回，不變更</button><button type="button" data-sailing="collect-apply">確認收船</button></div><p>不會自動登記新發現的其他地點、升級或物品。</p></section>';
 collectPreview();feedback('請核對實際探索地點，再按下方確認；返回不會變更任何紀錄。');const review=host.querySelector('.sailing-collect');review.scrollIntoView({block:'start',behavior:'smooth'});review.querySelector('h4').focus({preventScroll:true});
}
host.addEventListener('change',e=>{if(e.target.matches('[data-collect-stop]'))collectPreview();});
host.addEventListener('click',e=>{
 const button=e.target.closest('[data-sailing]');if(!button||button.disabled)return;
 const action=button.dataset.sailing,{item,index,ship,voyage,sailing}=selected();
 if(action==='collect'){startCollect();return;}
 if(action==='collect-dismiss'){collectionDraft=null;host.querySelector('[data-collect-host]').innerHTML='';feedback('已返回；出航及探索紀錄保持不變。');return;}
 if(action==='collect-apply'){
  const draft=collectionDraft;if(!draft||!sailing)return;
  if(draft.item!==item||draft.index!==index||draft.sailing!==sailing||draft.signature!==JSON.stringify(sailing)){activeKey='';render();feedback('出航紀錄已變更，請重新核對後確認收船。');return;}
  const codes=draft.route?[...host.querySelectorAll('[data-collect-stop]:checked')].map(input=>input.dataset.collectStop).filter(code=>draft.route.nodes.includes(code)):[];
  if(codes.length&&!window.SubExplored){feedback('探索紀錄功能尚未載入，請重新整理後再確認。');return;}
  if(codes.length)window.SubExplored.record(item,draft.route.map.id,codes);
  item.sailings[index]=null;collectionDraft=null;fleet.save();fleet.renderAll();
  feedback(codes.length?'已確認收船，並將 '+draft.route.map.name+' '+codes.join('、')+' 登記為探索過。':'已確認收船；沒有新增或移除探索紀錄。');return;
 }
 if(action==='cancel'){
  if(!sailing)return;
  collectionDraft=null;host.querySelector('[data-collect-host]').innerHTML='';
  if(armed!==action){armed=action;feedback('請再次按「取消這筆出航紀錄」。只移除本機出航紀錄，不會標記探索過，也不會取消遊戲中的航行。');return;}
  item.sailings[index]=null;fleet.save();fleet.renderAll();feedback('已取消本機出航紀錄；探索紀錄及遊戲中的船不受影響。');return;
 }
 armed='';const now=Date.now();let returnAt,source;
 if(action==='depart'){
  if(sailing){feedback('已存在出航紀錄，沒有重複登記。');return;}
  const missing=requiredMissing(ship,voyage);if(missing.length){feedback(requiredMessage(missing));return;}
  const calc=engine.calculate(ship,voyage.map,voyage.nodes,item.opened);if(!calc.valid){feedback(calc.errors.join(' '));return;}
  returnAt=now+calc.seconds*1000;source='estimate';
 }else if(action==='remaining'){
  returnAt=state.remaining(host.querySelector('[data-hours]').value,host.querySelector('[data-minutes]').value,now);source='remaining';
 }else if(action==='clock'){
  returnAt=state.localTime(host.querySelector('[data-return]').value);source='clock';
 }else return;
 if(!returnAt){feedback('請輸入有效時間。剩餘時間需大於 0；分鐘為 0～59，返航時刻不可是夏令時間不存在的時間。');return;}
 if(!ship.enabled&&!sailing){feedback('請先在船隻設定確認此船已啟用，才可補登航行。');return;}
 item.sailings[index]={returnAt,departAt:sailing?.departAt??(action==='depart'?now:null),source,snapshot:sailing?sailing.snapshot??null:action==='depart'?snapshot(ship,voyage):null,recordedAt:now};
 fleet.save();fleet.renderAll();feedback(sailing?'已修正返航時刻；出航快照保持不變。':action==='depart'?'已記錄出航與航線快照。倒數結束仍需你確認收船。':'已補登返航時間，沒有建立航線快照；收船時不會推測探索地點。');
});
window.SubLogbook={render};render();setInterval(countdown,30000);
})();
