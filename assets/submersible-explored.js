/* Explicit, workshop-wide exploration records. Discovery and sailing timers never infer visits. */
(function () {
'use strict';
const F=window.SubFleet;
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mapById=id=>F.maps.find(map=>map.id===id);
const eligible=map=>map&&!map.locked?map.nodes.filter(node=>!(map.future||[]).includes(node.code)):[];
const isVisited=(item,map,code)=>item.visited?.[map]?.[code]===true;
const isOpened=(item,map,code)=>item.opened?.[map]?.[code]===true;
function validCodes(mapId,codes){const allowed=new Set(eligible(mapById(mapId)).map(node=>node.code));return [...new Set(codes)].filter(code=>allowed.has(code));}
function record(item,mapId,codes){
 const selected=validCodes(mapId,codes);if(!selected.length)return [];
 item.visited??={};item.visited[mapId]??={};item.opened[mapId]??={};
 for(const code of selected){item.visited[mapId][code]=true;item.opened[mapId][code]=true;}
 return selected;
}
function forget(item,mapId,codes){for(const code of validCodes(mapId,codes))if(item.visited?.[mapId])delete item.visited[mapId][code];}
const inspector=document.querySelector('.node-inspector');
const controls=document.createElement('div');controls.className='node-operation explored-operation';
controls.innerHTML='<h4>探索紀錄 · 此工房共用</h4><p id="node-explored-status"></p><button type="button" id="node-explored" disabled>登記為探索過</button><button type="button" id="explored-batch">批次補登／移除探索紀錄</button><small>已開啟代表已發現；沒有探索紀錄，不代表從未到訪。</small>';
inspector.querySelector('.node-operation').after(controls);
const required=document.createElement('button');required.type='button';required.id='node-required';required.textContent='本趟要探索這裡';
const routeOperation=document.querySelector('#node-action').parentElement;routeOperation.append(required);
const summary=document.createElement('p');summary.id='map-explored-summary';summary.className='explored-summary';document.querySelector('#map-range').after(summary);
const openedLegend=document.querySelector('.legend-node.opened');if(openedLegend)openedLegend.textContent='●';
const legend=document.createElement('div');legend.className='legend-item';legend.innerHTML='<i class="legend-node explored">✓</i><span><b>探索過</b><small>已確認實際探索</small></span>';document.querySelector('.status-legend').append(legend);
const dialog=document.createElement('dialog');dialog.id='explored-dialog';dialog.className='fleet-dialog explored-dialog';dialog.setAttribute('aria-labelledby','explored-dialog-title');document.body.append(dialog);
let draft=null,restoreFocus=null;
function finish(text){F.save();F.notice(text);F.renderAll();}
function signature(item,mapId){return JSON.stringify([item.opened[mapId],item.visited?.[mapId]]);}
function close(){dialog.close();draft=null;}
dialog.addEventListener('close',()=>{if(dialog.open)return;draft=null;if(restoreFocus?.isConnected)restoreFocus.focus();});
function show(item,map,title,body,apply,kind,codes=[]){
 restoreFocus=document.activeElement;
 draft={item,map,kind,codes:[...codes],signature:signature(item,map.id)};
 dialog.innerHTML='<h2 id="explored-dialog-title">'+esc(title)+'</h2><p class="explored-dialog-context">'+esc(item.name+' · '+map.name)+'</p>'+body+'<p class="explored-dialog-error" role="status"></p><div class="explored-dialog-actions"><button type="button" data-explored-dialog="cancel">取消</button><button type="button" class="primary-action" data-explored-dialog="apply">'+esc(apply)+'</button></div>';
 dialog.showModal();
}
function addSingle(mapId,code){
 const item=F.workshop(),map=mapById(mapId);if(!validCodes(mapId,[code]).length)return;
 if(isOpened(item,mapId,code)){record(item,mapId,[code]);finish(map.name+' '+code+' 已登記為探索過；此紀錄由工房所有船共用。');return;}
 show(item,map,'確認補登探索紀錄','<p>你將把 <b>'+esc(code)+'</b> 登記為「探索過」，並同時登記這個地點為「已開啟（已發現）」。</p><p>只更新 '+esc(code)+'，不補登前置鏈或其他地點。</p>','確認探索過，並登記已開啟','add',[code]);
}
function openBatch(){
 const item=F.workshop(),map=F.currentMap(),nodes=eligible(map);if(!nodes.length)return;
 show(item,map,'批次探索紀錄','<p>只調整本海圖勾選的地點；先看預覽，再按套用。</p><fieldset class="explored-modes"><legend>要做的變更</legend><label><input type="radio" name="explored-mode" value="add" checked> 登記為探索過</label><label><input type="radio" name="explored-mode" value="remove"> 移除探索紀錄</label></fieldset><div class="explored-selection-actions"><button type="button" data-explored-dialog="all">全選本海圖</button><button type="button" data-explored-dialog="none">取消全選</button></div><fieldset class="explored-grid"><legend>選擇地點（不含版本未開放地點）</legend>'+nodes.map(node=>'<label><input type="checkbox" data-explored-code="'+esc(node.code)+'"><span><b>'+esc(node.code)+'</b><small>'+esc(isVisited(item,map.id,node.code)?'探索過':isOpened(item,map.id,node.code)?'已開啟 · 尚無探索紀錄':'未登記開啟 · 尚無探索紀錄')+'</small></span></label>').join('')+'</fieldset><div id="explored-preview" class="explored-preview" role="status"></div>','套用以上變更','batch');
 preview();
}
function batchSelection(){return [...dialog.querySelectorAll('[data-explored-code]:checked')].map(input=>input.dataset.exploredCode);}
function preview(){
 if(!draft||draft.kind!=='batch')return;
 const {item,map}=draft,codes=batchSelection(),remove=dialog.querySelector('[name="explored-mode"]:checked').value==='remove';
 draft.codes=codes;draft.remove=remove;draft.signature=signature(item,map.id);
 const changes=codes.filter(code=>remove?isVisited(item,map.id,code):!isVisited(item,map.id,code));
 const discovered=remove?[]:codes.filter(code=>!isOpened(item,map.id,code));
 const message=!codes.length?'尚未選取地點。':remove?'將移除探索紀錄 '+changes.length+' 筆：'+(changes.join('、')||'無')+'。所有開啟登記保持不變。':'將新增探索紀錄 '+changes.length+' 筆：'+(changes.join('、')||'無')+'。'+(discovered.length?'同時把 '+discovered.join('、')+' 登記為已開啟（已發現）。':'開啟登記不需變更。')+' 只更新勾選地點，不補登前置鏈。';
 dialog.querySelector('#explored-preview').textContent=message;
 const apply=dialog.querySelector('[data-explored-dialog="apply"]');apply.disabled=!changes.length&&!discovered.length;apply.textContent=discovered.length?'確認探索過並登記已開啟':'套用以上變更';
}
function removeOpened(mapId,codes){
 const item=F.workshop(),map=mapById(mapId),selected=validCodes(mapId,codes).filter(code=>isOpened(item,mapId,code));if(!selected.length)return;
 const visits=selected.filter(code=>isVisited(item,mapId,code));
 show(item,map,'取消開啟登記','<p>將取消 <b>'+esc(selected.join('、'))+'</b> 的開啟登記。</p><p>'+(visits.length?'為避免「探索過但未開啟」的矛盾，也會一併移除 '+esc(visits.join('、'))+' 的探索紀錄。若要保留探索紀錄，請按取消。':'這些地點尚無探索紀錄。')+'</p><p>其他地點、船隻與航程保持不變。</p>',visits.length?'確認取消開啟及探索紀錄':'確認取消開啟登記','remove-opened',selected);
}
function resetMap(mapId){
 const item=F.workshop(),map=mapById(mapId);if(!map)return;
 const opened=Object.values(item.opened[mapId]||{}).filter(Boolean).length,visited=Object.values(item.visited?.[mapId]||{}).filter(Boolean).length;
 show(item,map,'清除本海圖登記','<p>將清除 '+esc(map.name)+' 的 <b>'+opened+' 筆開啟登記</b>及 <b>'+visited+' 筆探索紀錄</b>。</p><p>探索紀錄也會清除，避免留下「探索過但未開啟」的矛盾。其他海圖、船隻與航程保持不變。</p>','確認清除開啟與探索紀錄','reset');
}
dialog.addEventListener('change',preview);
dialog.addEventListener('click',event=>{
 const button=event.target.closest('[data-explored-dialog]');if(!button||!draft)return;
 const action=button.dataset.exploredDialog;if(action==='cancel'){close();return;}
 if(action==='all'||action==='none'){dialog.querySelectorAll('[data-explored-code]').forEach(input=>input.checked=action==='all');preview();return;}
 if(action!=='apply'||button.disabled)return;
 const {item,map,kind,codes}=draft;
 if(!F.state.workshops.includes(item)){close();return;}
 if(draft.signature!==signature(item,map.id)){
  if(kind==='batch')preview();else if(kind==='reset'){close();resetMap(map.id);return;}else if(kind==='remove-opened'){close();removeOpened(map.id,codes);return;}else draft.signature=signature(item,map.id);
  dialog.querySelector('.explored-dialog-error').textContent='登記內容剛有變更，請重新核對後再確認。';return;
 }
 let text='';
 if(kind==='add'||(kind==='batch'&&!draft.remove)){record(item,map.id,codes);text='已登記探索過：'+map.name+' '+codes.join('、')+'；只更新選取地點。';}
 if(kind==='batch'&&draft.remove){forget(item,map.id,codes);text='已移除選取地點的探索紀錄；開啟登記保持不變。';}
 if(kind==='remove-opened'){for(const code of codes)delete item.opened[map.id][code];forget(item,map.id,codes);text='已取消 '+map.name+' '+codes.join('、')+' 的開啟及相關探索紀錄；既有航程保留，請核對。';}
 if(kind==='reset'){item.opened[map.id]={};item.visited??={};item.visited[map.id]={};item.selectedNode='';text='已清除 '+map.name+' 的開啟與探索紀錄；其他海圖、船隻與航程保持不變。';}
 close();finish(text);
});
document.querySelector('#node-explored').addEventListener('click',()=>{
 const item=F.workshop(),map=F.currentMap(),code=item.selectedNode;if(!validCodes(map.id,[code]).length)return;
 if(isVisited(item,map.id,code)){forget(item,map.id,[code]);finish(map.name+' '+code+' 的探索紀錄已移除；開啟登記保持不變。');}else addSingle(map.id,code);
});
document.querySelector('#explored-batch').addEventListener('click',openBatch);
required.addEventListener('click',()=>{const item=F.workshop(),map=F.currentMap();if(validCodes(map.id,[item.selectedNode]).length)window.SubVoyageUI?.addRequired(map.id,item.selectedNode);});
function render(){
 const item=F.workshop(),map=F.currentMap(),nodes=eligible(map),code=item.selectedNode,node=nodes.find(n=>n.code===code);
 const explored=nodes.filter(n=>isVisited(item,map.id,n.code)).length,opened=nodes.filter(n=>isOpened(item,map.id,n.code)).length;
 document.querySelector('#map-count').textContent='已開啟 '+opened+'／'+nodes.length;
 summary.textContent=nodes.length?'探索過 '+explored+'／'+nodes.length+' · 尚無探索紀錄 '+(nodes.length-explored)+' 處':'本海圖尚未開放';
 document.querySelector('#node-explored-status').textContent=node?(isVisited(item,map.id,code)?'探索過：已確認實際到訪。':'尚無探索紀錄。可依遊戲紀錄手動補登。'):'選擇地點以查看探索紀錄。';
 const toggle=document.querySelector('#node-explored');toggle.disabled=!node;toggle.textContent=node?(isVisited(item,map.id,code)?'移除 '+code+' 的探索紀錄':'我已探索 '+code+'，登記為探索過'):'登記為探索過';
 required.disabled=!node;document.querySelector('#explored-batch').disabled=!nodes.length;
 document.querySelectorAll('#map-hotspots [data-node]').forEach(button=>{
  const visited=isVisited(item,map.id,button.dataset.node);button.classList.toggle('explored',visited);
  button.querySelector('.node-explored-badge')?.remove();
  if(visited){const badge=document.createElement('span');badge.className='node-explored-badge';badge.textContent='✓';badge.setAttribute('aria-hidden','true');button.append(badge);}
  const original=button.getAttribute('aria-label').replace(/，(?:探索過|尚無探索紀錄)$/,'');button.setAttribute('aria-label',original+'，'+(visited?'探索過':'尚無探索紀錄'));
 });
}
window.SubExplored={render,isVisited,record,removeOpened,resetMap};render();
})();
