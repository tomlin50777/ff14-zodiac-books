/* v81: one shared action menu, guarded immediate collection/cancellation. */
(function(){
'use strict';
const fleet=window.SubFleet,engine=window.SubVoyageEngine,state=window.SubState;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const menu=document.createElement('div');menu.id='voyage-action-menu';menu.className='voyage-action-menu';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','航次操作');document.body.append(menu);
const dialog=document.createElement('dialog');dialog.id='voyage-action-dialog';dialog.className='fleet-dialog voyage-action-dialog';dialog.setAttribute('aria-labelledby','voyage-dialog-title');
dialog.innerHTML='<header class="dialog-heading"><h2 id="voyage-dialog-title"></h2><button type="button" data-voyage-close aria-label="關閉航次視窗">×</button></header><div class="sailing-panel"><div data-voyage-content></div><p class="sailing-feedback" role="status" aria-live="polite"></p></div>';
document.body.append(dialog);
const host=dialog.querySelector('[data-voyage-content]');
let context=null,trigger=null,mode='';
function selected(){const item=fleet.workshop(),index=item.activeVoyageShip;item.sailings??=[null,null,null,null];return {item,index,ship:item.ships[index],voyage:item.voyages[index],sailing:item.sailings[index]};}
function capture(){const {item,index,ship,voyage,sailing}=selected();return {item,index,sailing,signature:JSON.stringify(sailing),planSignature:JSON.stringify([ship,voyage,item.opened])};}
function matches(expected){const now=capture();return !!expected&&expected.item===now.item&&expected.index===now.index&&expected.sailing===now.sailing&&expected.signature===now.signature&&(now.sailing||expected.planSignature===undefined||expected.planSignature===now.planSignature);}
function stamp(t){return new Date(t).toLocaleString('zh-TW',{timeZoneName:'short'});}
function snapshotRoute(sailing){
 const snapshot=sailing?.snapshot,map=fleet.maps.find(m=>m.id===snapshot?.map),nodes=snapshot?.nodes;
 const recorded=snapshot?.routeRecorded===true||(snapshot?.routeRecorded!==false&&Number.isFinite(sailing?.departAt)&&sailing.departAt>0);
 if(!recorded||!map||map.locked||!Array.isArray(nodes)||!nodes.length||nodes.length>5||new Set(nodes).size!==nodes.length||nodes.some(code=>!map.nodes.some(n=>n.code===code)||(map.future||[]).includes(code)))return null;
 return {map,nodes:[...nodes]};
}
function requiredMissing(ship,voyage){return (ship.requiredStops||[]).filter(stop=>stop.map!==voyage.map||!voyage.nodes.includes(stop.code));}
function requiredMessage(missing){return '本趟指定要探索的地點尚未全部排入航程：'+missing.map(stop=>(fleet.maps.find(m=>m.id===stop.map)?.name||stop.map)+' '+stop.code).join('、')+'。請先調整航程或指定地點。';}
function feedback(text){dialog.querySelector('.sailing-feedback').textContent=text;}
function announce(){document.dispatchEvent(new Event('voyage-ui-change'));}
function closeMenu(restore=false){const previous=trigger;menu.hidden=true;previous?.setAttribute('aria-expanded','false');if(!dialog.open){context=null;trigger=null;mode='';}if(restore&&previous?.isConnected)previous.focus({preventScroll:true});}
function close(restore=true){const previous=trigger;context=null;trigger=null;mode='';menu.hidden=true;previous?.setAttribute('aria-expanded','false');if(dialog.open)dialog.close();host.replaceChildren();feedback('');if(restore&&previous?.isConnected&&!previous.hidden&&!previous.disabled)previous.focus({preventScroll:true});announce();}
function prepare(expected,source){if(expected&&!matches(expected)){close(false);fleet.renderAll();return false;}close(false);context=capture();trigger=source||document.activeElement;return true;}
function placeMenu(){if(menu.hidden)return;const rect=trigger?.getBoundingClientRect(),box=menu.getBoundingClientRect(),gap=8;if(!rect)return;menu.style.left=Math.max(gap,Math.min(rect.right-box.width,innerWidth-box.width-gap))+'px';menu.style.top=Math.max(gap,Math.min(rect.bottom+gap,innerHeight-box.height-gap))+'px';}
function menuIcon(action){
 const paths={correction:'<circle cx="12" cy="12" r="9"></circle><path d="M12 6v6l4 2"></path>',clear:'<path d="m4 13 9-9a2 2 0 0 1 3 0l4 4a2 2 0 0 1 0 3l-9 9H7l-3-4a2 2 0 0 1 0-3Z"></path><path d="m9 8 8 8M11 20h9"></path>',collect:'<path d="M5 13V8h14v5M9 8V4h6v4M3 13l9-3 9 3-3 7H6l-3-7ZM2 21q2-2 4 0t4 0t4 0t4 0t4 0"></path>',cancel:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"></path>'};
 return '<svg class="voyage-menu-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+paths[action]+'</svg>';
}
function openMenu(expected,source){
 if(!menu.hidden&&source===trigger){closeMenu(true);return;}
 if(!prepare(expected,source))return;
 const {sailing,voyage}=selected();mode='menu';
 const choices=sailing?[['correction','修正返航時間'],...(sailing.returnAt>Date.now()?[['collect','提前收船']]:[]),['cancel','取消出航紀錄']]:[['correction','補登返航時間'],['clear','清空路線']];
 menu.innerHTML=choices.map(([action,label])=>'<button type="button" role="menuitem" tabindex="-1" data-voyage-menu="'+action+'" '+(action==='clear'&&!voyage.nodes.length?'disabled':'')+'>'+menuIcon(action)+'<span>'+label+'</span></button>').join('');
 menu.hidden=false;trigger?.setAttribute('aria-expanded','true');placeMenu();announce();menu.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
}
function openDialog(view,expected,source){
 if(!prepare(expected,source))return;
 mode=view;const {item,index,sailing}=selected();
 const title=view==='correction'?(sailing?'修正返航時間':'補登返航時間'):sailing?'本趟航次明細':'本趟計畫明細';
 dialog.querySelector('h2').textContent=item.name+' · '+(index+1)+' 號艇 · '+title;
 feedback('');
 if(view==='correction'){
  host.innerHTML=(sailing?'<p>目前返航時刻：'+esc(stamp(sailing.returnAt))+'</p>':'<p>只補登時間，不會把目前計畫當成出航航線；收船時不推測探索地點。</p>')+'<div class="sailing-time-fields"><label>剩餘小時 <input data-hours type="number" min="0" max="10000" step="1" value="0"></label><label>剩餘分鐘 <input data-minutes type="number" min="0" max="59" step="1" value="0"></label></div><button type="button" data-sailing="remaining">儲存剩餘時間</button><label class="sailing-clock">或直接填返航時刻 <input data-return type="datetime-local"></label><button type="button" data-sailing="clock">儲存返航時刻</button>';
 }else renderDetails();
 dialog.showModal();if(view==='correction')host.querySelector('input')?.focus({preventScroll:true});announce();
}
function renderDetails(){
 const {item,ship,voyage,sailing}=selected(),trusted=snapshotRoute(sailing),snap=sailing?.snapshot;
 const complete=snap&&Number.isInteger(snap.rank)&&snap.rank>=1&&snap.rank<=130&&/^[1-5]{4}$/.test(snap.build)&&Array.isArray(snap.modified)&&snap.modified.length===4&&snap.modified.every(x=>typeof x==='boolean');
 const route=sailing?(trusted?{map:trusted.map.id,nodes:trusted.nodes}:null):voyage,subject=sailing?(complete?{...snap,enabled:true}:null):ship;
 const calc=subject&&route?engine.calculate(subject,route.map,route.nodes,sailing?undefined:item.opened):null,a=subject?engine.stats(subject):null,map=fleet.maps.find(m=>m.id===route?.map);
 const missing=sailing?[]:requiredMissing(ship,voyage);
 host.innerHTML=(sailing?'<p>返航時刻：'+esc(stamp(sailing.returnAt))+'</p><p>'+esc(sailing.source==='estimate'?'依模型估算，以遊戲管制台為準。':'依輸入的返航時間。')+'</p>':'')+'<p><strong>'+(sailing?'本趟出航快照':'目前計畫')+'：</strong>'+esc(route?.nodes.length?(map?.name||route.map)+' · '+route.nodes.join(' → '):sailing?'沒有可信的出航航線；收船時不推測探索地點。':'尚未安排航程')+'</p>'+(calc?.valid?'<div class="voyage-detail-metrics"><span>估算航時 <b>'+Math.floor(calc.seconds/3600)+' 小時 '+Math.floor(calc.seconds%3600/60)+' 分</b></span><span>燃料 <b>'+calc.fuel+' 罐</b></span><span>航距 <b>'+calc.range+'／'+a.range+'</b></span><span>基礎經驗 <b>'+calc.xp.toLocaleString('zh-TW')+'</b></span></div>':'<p>航程數值：—'+(sailing?'（出航快照資料不足）':'')+'</p>')+(missing.length?'<p class="sailing-required-warning">'+esc(requiredMessage(missing))+'</p>':'')+(!sailing&&calc?.errors.length?'<p>'+esc(calc.errors.join(' '))+'</p>':'')+(a?'<details class="voyage-breakdown"><summary>船隻能力與計算明細</summary><p>'+esc(['探查 '+a.surveillance,'收集 '+a.retrieval,'航速 '+a.speed,'航距 '+a.range,'恩惠 '+a.favor].join(' · '))+'</p><p>Rank '+subject.rank+' · 配裝 '+esc([...subject.build].map((d,n)=>d+(subject.modified?.[n]?'+':'')).join(''))+' · 載量 '+a.cost+'／'+a.capacity+'</p><p>時間含固定 12 小時，逐段取整，不額外計最後一站返港；基礎經驗不含隨機加成。燃料與零件耐久請在遊戲核對。</p><p>探查決定掉落層資格，不提高開圖率；收集影響數量檔；航速影響時間；航距限制路線；恩惠達門檻有機會二次探索，不保證觸發。</p></details>':'')+'<p>倒數歸零不會自動收船、升級、登記開圖或探索過。</p>';
}
function render(){if(context&&!matches(context))close(false);}
function completeCollect(draft){
 const {item,index,sailing}=selected();
 if(!draft||!sailing||!matches(draft))return '出航紀錄已變更，請重新核對後確認收船。';
 const route=snapshotRoute(sailing),codes=route?[...route.nodes]:[];
 if(codes.length&&typeof window.SubExplored?.record!=='function')return '探索紀錄功能尚未載入，請重新整理後再確認。';
 if(codes.length)window.SubExplored.record(item,route.map.id,codes);
 item.sailings[index]=null;close(false);fleet.save();fleet.renderAll();document.dispatchEvent(new CustomEvent('voyage-record-ended',{detail:{item,index}}));return '';
}
function collectNow(expected){const {sailing}=selected();if(!sailing||!Number.isFinite(sailing.returnAt)||sailing.returnAt>Date.now())return false;const error=completeCollect(expected);if(error){fleet.notice(error);fleet.renderAll();return false;}fleet.notice('');return true;}
function depart(expected){
 if(!matches(expected)){fleet.renderAll();return false;}
 const {item,index,ship,voyage,sailing}=selected();if(sailing)return false;
 const missing=requiredMissing(ship,voyage),calc=engine.calculate(ship,voyage.map,voyage.nodes,item.opened);
 if(missing.length||!calc.valid){fleet.notice(missing.length?requiredMessage(missing):calc.errors.join(' '));fleet.renderAll();return false;}
 const now=Date.now();item.sailings[index]={returnAt:now+calc.seconds*1000,departAt:now,source:'estimate',snapshot:{rank:ship.rank,build:ship.build,modified:[...(ship.modified||[false,false,false,false])],map:voyage.map,nodes:[...voyage.nodes],routeRecorded:true},recordedAt:now};
 close(false);fleet.notice('');fleet.save();fleet.renderAll();return true;
}
menu.addEventListener('click',event=>{
 const button=event.target.closest('[data-voyage-menu]');if(!button||button.disabled)return;
 const expected=context,source=trigger;if(!matches(expected)){close(false);fleet.renderAll();return;}
 const action=button.dataset.voyageMenu;
 if(action==='clear'){close(false);fleet.clearVoyage?.(expected);source?.focus({preventScroll:true});return;}
 if(action==='collect'){
  const error=completeCollect(expected);if(error){close(false);fleet.notice(error);fleet.renderAll();}else{fleet.notice('');document.querySelector('#map-voyage-primary')?.focus({preventScroll:true});}return;
 }
 if(action==='cancel'){
  const {item,index,sailing}=selected();if(!sailing)return;
  item.sailings[index]=null;close(false);fleet.save();fleet.renderAll();document.dispatchEvent(new CustomEvent('voyage-record-ended',{detail:{item,index}}));document.querySelector('#map-voyage-primary')?.focus({preventScroll:true});return;
 }
 openDialog(action,expected,source);
});
menu.addEventListener('keydown',event=>{
 const buttons=[...menu.querySelectorAll('button:not(:disabled)')],i=buttons.indexOf(document.activeElement);let n;
 if(event.key==='ArrowDown')n=(i+1)%buttons.length;else if(event.key==='ArrowUp')n=(i+buttons.length-1)%buttons.length;else if(event.key==='Home')n=0;else if(event.key==='End')n=buttons.length-1;else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeMenu(true);return;}else if(event.key==='Tab'){closeMenu(true);return;}else return;
 event.preventDefault();buttons[n]?.focus();
});
dialog.addEventListener('click',event=>{
 if(event.target.closest('[data-voyage-close]')){close();return;}
 const button=event.target.closest('[data-sailing]');if(!button)return;
 const action=button.dataset.sailing;
 if(!context||!matches(context)){close(false);fleet.notice('出航紀錄或選船已變更，請重新開啟後核對。');fleet.renderAll();return;}
 const {item,index,ship,sailing}=selected();
 if(mode!=='correction')return;
 const now=Date.now(),returnAt=action==='remaining'?state.remaining(host.querySelector('[data-hours]').value,host.querySelector('[data-minutes]').value,now):action==='clock'?state.localTime(host.querySelector('[data-return]').value):null;
 if(!returnAt){feedback('請輸入有效時間。剩餘時間需大於 0；分鐘為 0～59，返航時刻必須有效。');return;}
 if(!ship.enabled&&!sailing){feedback('請先在船隻設定確認此船已啟用，才可補登航行。');return;}
 item.sailings[index]={returnAt,departAt:sailing?.departAt??null,source:action==='remaining'?'remaining':'clock',snapshot:sailing?.snapshot??null,recordedAt:now};close(false);fleet.save();fleet.renderAll();document.querySelector(returnAt<=now?'#map-voyage-primary':'#map-voyage-status')?.focus({preventScroll:true});
});
dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
dialog.addEventListener('close',()=>{if(!dialog.open&&context&&mode!=='menu')close();});
document.addEventListener('pointerdown',event=>{if(!menu.hidden&&!menu.contains(event.target)&&!trigger?.contains(event.target))closeMenu();});
document.addEventListener('focusin',event=>{if(!menu.hidden&&!menu.contains(event.target)&&event.target!==trigger&&!event.target.contains(menu))closeMenu();});
window.addEventListener('resize',placeMenu);window.addEventListener('scroll',event=>{if(!menu.hidden&&!(event.target instanceof Node&&menu.contains(event.target)))closeMenu();},true);
window.SubLogbook={render,snapshotRoute,collectNow,depart,openMenu,openDetails:(expected,source)=>openDialog('details',expected,source),isOpen:()=>!menu.hidden||dialog.open};
})();
