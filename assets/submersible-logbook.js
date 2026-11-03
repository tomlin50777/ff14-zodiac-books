(function(){
'use strict';
const fleet=window.SubFleet,engine=window.SubVoyageEngine,state=window.SubState;
const host=document.createElement('section');host.className='sailing-panel';host.setAttribute('aria-label','出航與返航紀錄');
document.querySelector('#voyage-editor').append(host);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
let activeKey='',armed='',message='';
function selected(){const item=fleet.workshop(),index=item.activeVoyageShip;item.sailings??=[null,null,null,null];return {item,index,ship:item.ships[index],voyage:item.voyages[index],sailing:item.sailings[index]};}
function stamp(t){return new Date(t).toLocaleString('zh-TW',{timeZoneName:'short'});}
function countdown(){const {sailing}=selected(),node=host.querySelector('[data-countdown]');if(!node||!sailing)return;const delta=sailing.returnAt-Date.now();node.textContent=delta<=0?'預計已返航 · 等你確認收船':'預計 '+Math.floor(Math.ceil(delta/60000)/60)+' 小時 '+(Math.ceil(delta/60000)%60)+' 分後返航';}
function render(){
 const {item,index,ship,voyage,sailing}=selected(),key=item.id+':'+index+':'+JSON.stringify([sailing,ship,voyage,item.opened]);
 if(key===activeKey){countdown();return;}activeKey=key;armed='';message='';
 const check=engine.calculate(ship,voyage.map,voyage.nodes,item.opened);
 host.innerHTML='<h3>出航日誌</h3>'+(sailing?'<strong data-countdown></strong><p>返航時刻：'+esc(stamp(sailing.returnAt))+'</p><small>'+esc(sailing.source==='estimate'?'依模型估算；以遊戲確認頁為準。':'依你輸入的返航時間。')+'</small><p>本趟快照：'+esc(sailing.snapshot?.nodes?.join?.(' → ')||'未記錄航線')+'</p><div class="sailing-actions"><button type="button" data-sailing="collect">確認已在遊戲收船</button><button type="button" data-sailing="cancel">取消這筆出航紀錄</button></div>':'<p>只記錄你已在遊戲派出的船，不會操作遊戲。</p><button type="button" data-sailing="depart" '+(check.valid?'':'disabled')+'>我已出航 · 一鍵估算返航</button>'+(!check.valid?'<small>先完成船隻設定與有效航線，或補登遊戲返航時間。</small>':''))+
 '<details class="sailing-correction"><summary>'+(sailing?'修正返航時間':'已在外航行？補登返航')+'</summary><p>不需要補填出發時間。時間以 '+esc(timezone)+' 顯示；跨時區仍儲存同一時刻。夏令時間重複時段建議用「剩餘時間」，不存在的時刻將拒絕。</p><label>剩餘小時 <input data-hours type="number" min="0" max="10000" step="1" value="0"></label><label>剩餘分鐘 <input data-minutes type="number" min="0" max="59" step="1" value="0"></label><button type="button" data-sailing="remaining">儲存剩餘時間</button><label>或直接填返航時刻 <input data-return type="datetime-local"></label><button type="button" data-sailing="clock">儲存返航時刻</button></details><p class="sailing-feedback" role="status"></p><small>倒數歸零不會自動收船、升級或登記開圖。</small>';
 countdown();
}
function feedback(text){message=text;host.querySelector('.sailing-feedback').textContent=text;}
function snapshot(ship,voyage){return {rank:ship.rank,build:ship.build,modified:[...(ship.modified||[false,false,false,false])],map:voyage.map,nodes:[...voyage.nodes]};}
host.addEventListener('click',e=>{
 const button=e.target.closest('[data-sailing]');if(!button)return;
 const action=button.dataset.sailing,{item,index,ship,voyage,sailing}=selected();
 if(action==='cancel'||action==='collect'){
  if(!sailing)return;
  if(armed!==action){armed=action;feedback(action==='collect'?'請再次按「確認已在遊戲收船」。只清除此紀錄；等級、開圖與物品請依實際結果更新。':'請再次按「取消這筆出航紀錄」。不會取消遊戲中的航行。');return;}
  item.sailings[index]=null;fleet.save();fleet.renderAll();feedback(action==='collect'?'已確認收船；請依遊戲結果更新等級與開圖。':'已取消本機紀錄，遊戲中的船不受影響。');return;
 }
 const now=Date.now();let returnAt,source;
 if(action==='depart'){
  if(sailing){feedback('已存在出航紀錄，沒有重複登記。');return;}
  const calc=engine.calculate(ship,voyage.map,voyage.nodes,item.opened);if(!calc.valid){feedback(calc.errors.join(' '));return;}
  returnAt=now+calc.seconds*1000;source='estimate';
 }else if(action==='remaining'){
  returnAt=state.remaining(host.querySelector('[data-hours]').value,host.querySelector('[data-minutes]').value,now);source='remaining';
 }else if(action==='clock'){
  returnAt=state.localTime(host.querySelector('[data-return]').value);source='clock';
 }
 if(!returnAt){feedback('請輸入有效時間。剩餘時間需大於 0；分鐘為 0～59，返航時刻不可是夏令時間不存在的時間。');return;}
 if(!ship.enabled){feedback('請先在船隻設定確認此船已啟用，才可補登航行。');return;}
 item.sailings[index]={returnAt,departAt:sailing?.departAt??(action==='depart'?now:null),source,snapshot:sailing?.snapshot||snapshot(ship,voyage),recordedAt:now};
 fleet.save();fleet.renderAll();feedback(sailing?'已修正返航時刻；出航快照保持不變。':'已記錄出航。倒數結束仍需你確認收船。');
});
window.SubLogbook={render};render();setInterval(countdown,30000);
})();
