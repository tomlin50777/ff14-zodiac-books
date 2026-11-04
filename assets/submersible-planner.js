/* v47: non-modal decision support; previews never imply game progress. */
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
// Context panes replace the long right-hand column; the chart never becomes a modal.
const consoleHost=$('.chart-console');
const paneSpecs=[['next','系統推薦'],['plan','本趟／收船']];
const tabbar=document.createElement('div');tabbar.className='console-tabs';tabbar.setAttribute('role','tablist');tabbar.setAttribute('aria-label','航海操作');
const panes=Object.fromEntries(paneSpecs.map(([id,label])=>{const pane=document.createElement('div');pane.id='console-'+id;pane.className='console-pane';pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby','console-tab-'+id);consoleHost.append(pane);return [id,pane];}));
const nodeStaging=document.createElement('div');nodeStaging.id='node-ui-staging';nodeStaging.hidden=true;document.body.append(nodeStaging);
[...consoleHost.children].filter(el=>!el.classList.contains('console-pane')).forEach(el=>{const pane=el.id==='route-planner-dialog'?'next':el.id==='voyage-editor'?'plan':'node';(panes[pane]||nodeStaging).append(el);});
tabbar.innerHTML=paneSpecs.map(([id,label])=>'<button id="console-tab-'+id+'" type="button" role="tab" data-console="'+id+'" aria-controls="console-'+id+'">'+label+'</button>').join('');consoleHost.prepend(tabbar);
function switchConsole(id){for(const [name,pane] of Object.entries(panes)){pane.hidden=name!==id;const tab=$('#console-tab-'+name);tab.setAttribute('aria-selected',String(name===id));tab.tabIndex=name===id?0:-1;}}
tabbar.addEventListener('click',event=>{const b=event.target.closest('[data-console]');if(b)switchConsole(b.dataset.console);});
tabbar.addEventListener('keydown',event=>{const ids=paneSpecs.map(s=>s[0]),i=ids.indexOf(event.target.dataset.console);if(i<0)return;let n;if(event.key==='ArrowRight')n=(i+1)%ids.length;else if(event.key==='ArrowLeft')n=(i+ids.length-1)%ids.length;else if(event.key==='Home')n=0;else if(event.key==='End')n=ids.length-1;else return;event.preventDefault();switchConsole(ids[n]);$('#console-tab-'+ids[n]).focus();});
switchConsole('next');
const collectionReference=document.createElement('div');collectionReference.id='collection-reference';$('#planner-results').after(collectionReference);collectionReference.append($('.collection-provenance'),$('.collection-build-panel'));
const mobileFleet=document.createElement('button');mobileFleet.id='fleet-mobile-toggle';mobileFleet.type='button';mobileFleet.setAttribute('aria-expanded','false');$('#fleet-manager').classList.add('mobile-collapsed');$('#fleet-manager').prepend(mobileFleet);mobileFleet.onclick=()=>{const folded=$('#fleet-manager').classList.toggle('mobile-collapsed');mobileFleet.setAttribute('aria-expanded',String(!folded));};
const milestoneGroup=document.createElement('div');milestoneGroup.className='milestones-group mobile-folded';const milestoneToggle=document.createElement('button');milestoneToggle.type='button';milestoneToggle.className='milestones-toggle';milestoneToggle.setAttribute('aria-expanded','false');$('#slot-milestones').before(milestoneGroup);milestoneGroup.append(milestoneToggle,$('#slot-milestones'));milestoneToggle.onclick=()=>{const folded=milestoneGroup.classList.toggle('mobile-folded');milestoneToggle.setAttribute('aria-expanded',String(!folded));};

$('#map-hotspots').addEventListener('click',event=>{if(event.target.closest('[data-node]:not(:disabled)'))window.SubNodeUI?.show();});
$('.mobile-next a').onclick=event=>{event.preventDefault();switchConsole('next');$('#route-planner-dialog').scrollIntoView({behavior:'smooth',block:'start'});};
$('#focus-voyage-plan').onclick=()=>{switchConsole('plan');consoleHost.scrollIntoView({behavior:'smooth',block:'nearest'});};

let lastKey='',preview=null,candidates=[],run=0,strategy='outcome',armed='',buildSuggestions=[],decision=null;

const requiredHost=document.createElement('section');requiredHost.className='required-stops-panel';requiredHost.setAttribute('aria-label','本趟必去地點');
$('#planner-mode').closest('label').after(requiredHost);
requiredHost.innerHTML='<details class="required-editor"><summary><strong>本趟必去</strong><span class="required-count">選填 · 未指定</span><span class="required-edit-label">指定地點</span></summary><div class="required-picker"><label>海域<select id="required-map"></select></label><label>地點<select id="required-node"></select></label><button type="button" id="required-add">加入必去</button></div><p class="required-help">最多 5 站，必須同趟全部到訪。只安排計畫，不會登記探索過。</p></details><div class="required-chips"></div><p class="required-feedback" role="status"></p>';
const requiredEditor=requiredHost.querySelector('.required-editor');
$('#required-map').innerHTML=F.maps.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.name)+'</option>').join('');
function requiredNodes(){const map=F.maps.find(m=>m.id===$('#required-map').value);$('#required-node').innerHTML=(map?.nodes||[]).map(n=>'<option value="'+esc(n.code)+'">'+esc(n.code)+' · R'+n.rank+'</option>').join('');$('#required-add').disabled=!(map?.nodes.length);}
$('#required-map').onchange=requiredNodes;requiredNodes();
$('#required-add').onclick=()=>addRequired($('#required-map').value,$('#required-node').value);
requiredHost.onclick=e=>{const b=e.target.closest('[data-remove-required]');if(!b)return;const {ship}=sel();ship.requiredStops=(ship.requiredStops||[]).filter((_,i)=>i!==Number(b.dataset.removeRequired));requiredHost.querySelector('.required-feedback').textContent='';F.save();render();F.renderMap();};
function addRequired(map,code){
 const {w,i,ship}=sel(),feedback=requiredHost.querySelector('.required-feedback');const fromMap=window.SubNodeUI?.isOpen()===true;if(fromMap)window.SubNodeUI.close(false);switchConsole('next');requiredEditor.open=true;if(fromMap){requiredHost.scrollIntoView({behavior:'smooth',block:'center'});requiredEditor.querySelector('summary').focus({preventScroll:true});}
 if(sailing(w,i)){feedback.textContent='此船尚未確認收船；先處理目前航次，再調整必去計畫。';return;}
 const list=ship.requiredStops||[];
 if(!F.maps.some(m=>m.id===map&&m.nodes.some(n=>n.code===code))){feedback.textContent='請先選擇有效地點。';return;}
 if(list.some(x=>x.map===map&&x.code===code)){feedback.textContent='這個地點已在必去清單。';return;}
 if(list.length>=5){feedback.textContent='一趟最多 5 個地點，請先移除一站再加入。';return;}
 if(list.some(x=>x.map!==map)){feedback.textContent='一趟不能跨海域。請另排一趟，或先移除其他海域的必去地點。';return;}
 ship.requiredStops=[...list,{map,code}];if(!list.length&&goalOf(w)==='auto'){ship.plannerGoal=ship.goal='explore';strategy='time';document.querySelectorAll('[data-planner-strategy]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.plannerStrategy===strategy)));}
 feedback.textContent='已加入 '+mapName(map)+' '+code+'；接著檢查是否能同趟完成。';F.save();render();F.renderMap();
}
let requiredContext='';
function renderRequired(){const {w,i,ship}=sel();const context=w.id+':'+i;if(context!==requiredContext){requiredContext=context;requiredHost.querySelector('.required-feedback').textContent='';requiredEditor.open=goalOf(w,i)==='explore'&&!(ship.requiredStops||[]).length;}const list=ship.requiredStops||[];requiredHost.querySelector('.required-count').textContent=list.length?list.length+' 站 · 全部必去':'選填 · 未指定';requiredHost.querySelector('.required-edit-label').textContent=list.length?'編輯':'指定地點';requiredHost.querySelector('.required-chips').innerHTML=list.length?list.map((x,n)=>'<span>'+esc(mapName(x.map)+' '+x.code)+'<button type="button" data-remove-required="'+n+'" aria-label="移除必去 '+esc(mapName(x.map)+' '+x.code)+'" '+(sailing(w,i)?'disabled':'')+'>×</button></span>').join(''):'';$('#required-add').disabled=sailing(w,i)||!$('#required-node').value;}

function sel(){const w=F.workshop(),i=w.activeVoyageShip;return {w,i,ship:w.ships[i],voyage:w.voyages[i]};}
function goalOf(w,index=w.activeVoyageShip){return w.ships[index]?.plannerGoal||w.plannerGoal||'auto';}
function targetOf(w,index=w.activeVoyageShip){return w.ships[index]?.collectionTarget||w.collectionTarget||C.items[0].id;}
function key(){const {w,i}=sel();return JSON.stringify([w.id,i,w.ships,w.opened,w.slotUnlocked,w.plannerGoal,w.collectionTarget,w.cadenceHours,w.sailings,strategy,$('#planner-hours').value,$('#planner-scope').value,$('#planner-scope').value==='current'?w.map:null]);}
function sailing(w,i){return F.isSailing?.(w,i)===true;}
function emptyAction(){
 const {w,i,ship}=sel(),goal=goalOf(w,i);
 if(!ship.enabled||!E.stats(ship).valid)return ['settings','確認船隻等級與配裝'];
 if(sailing(w,i)&&goal!=='item')return ['plan','查看航次／確認收船'];
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
  const p=C.plan(targetOf(w),w,i),ready=p.routes.filter(r=>r.ready),frontiers=p.routes.filter(r=>r.kind==='unlock');
  let jobs=ready.length?w.ships.flatMap((s,j)=>s.enabled&&!sailing(w,j)&&E.stats(s).valid?[{shipIndex:j,mode:'collection',collectionSources:p.item.sources.filter(x=>x.regionConfirmed===true),kind:'collect'}]:[]):[...new Set(frontiers.map(r=>r.shipIndex))].map(j=>({shipIndex:j,mode:'auto',priorityStops:frontiers.filter(r=>r.shipIndex===j).map(r=>({map:r.map,code:r.nodes[0]})),kind:'unlock'}));
  if(ship.requiredStops?.length)jobs=jobs.filter(j=>j.shipIndex===i).flatMap(j=>j.kind==='unlock'?j.priorityStops.map(front=>({...j,requiredStops:[...ship.requiredStops,...(ship.requiredStops.some(x=>x.map===front.map&&x.code===front.code)?[]:[front])]})):[j]);
  return {title:ready.length?'比較可取得收藏的航線':jobs.length?'收藏前置開圖 · 本趟不取得目標':'收藏條件尚未備齊',copy:ready.length?'各船獨立比較來源訪問數與作息，非全艦隊資源最佳化；掉率未知，不等於保證取得或最高掉率。':jobs.length?'先朝已確認來源的前置探索。'+(strategy==='time'?'省時只保留這個前置成果，再取短航時，可能放棄旁支。':'同趟比較其他可開地點與經驗。')+'這不是目標家具採集。':'請查看各船缺項，或試算配裝。若想先練等，請明確切換目標；不自動替換你的收藏目標。',details:p.blockers,jobs};
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
 const register=[1,2,3].find(n=>w.slotUnlocked?.[n]&&!w.ships[n].enabled);
 if(register!==undefined)return {title:'第 '+(register+1)+' 船位已確認，準備登記新船',copy:'備齊零件與登記票後到遊戲登記；目前船同時比較完整開圖航線。',jobs:[{...job,mode:'unlock'}]};
 const next=[1,2,3].find(n=>!w.ships[n].enabled&&!w.slotUnlocked?.[n]);
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
 const cards=routes.map((r,n)=>{const si=r.shipIndex??w.activeVoyageShip,ship=w.ships[si],calc=E.calculate(ship,r.map,r.nodes,w.opened),cycle=E.effectiveCycle(calc.seconds,w.cadenceHours??24),other=n===0?routes[1]:routes[0];
  const signed=v=>(v>=0?'+':'')+Math.round(v).toLocaleString('zh-TW');
  const objectiveDelta=other?(r.ranking?.mode==='gil'?signed(r.expectedSalvageGil-other.expectedSalvageGil)+' Gil 社群毛值':r.ranking?.mode==='collection'?signed(r.collectionVisits-other.collectionVisits)+' 個合格來源':signed(r.unlocks-other.unlocks)+' 個新地點／'+signed(r.xp-other.xp)+' 基礎經驗'):'';
  const delta=other?'相較'+(n===0?'下一候選':'首選')+'：'+objectiveDelta+'／航時 '+(r.seconds-other.seconds>=0?'+':'−')+duration(Math.abs(r.seconds-other.seconds))+'。':'';
  return '<article class="planner-result'+(preview?.index===n?' previewing':'')+'"><div class="planner-result-heading"><span>'+esc(r.kind==='other-goal'?'主線受限 · 其他目標備案':r.kind==='collect'?'收藏來源':r.kind==='unlock'?'收藏前置 · 不取得目標':r.kind==='level'?(goalOf(w)==='item'?'練等備案 · 不採集目標家具':'練等路線'):'可行計畫')+'</span><b>'+esc((r.alternative?'策略取捨 · '+({outcome:'成果',efficiency:'效率',time:'省時'}[r.ranking?.strategy])+' · ':'')+mapName(r.map))+' · '+(si+1)+' 號艇</b></div><h3>'+esc(r.nodes.join(' → '))+'</h3><p class="route-outcomes">'+esc(r.ranking?.mode==='gil'?'社群毛值約 '+Math.round(r.expectedSalvageGil).toLocaleString('zh-TW')+' Gil／趟（非保底）':r.ranking?.mode==='collection'?'符合目標來源 '+r.collectionVisits+' 站（掉率未知）':r.ranking?.mode==='level'?'基礎經驗 '+calc.xp.toLocaleString('zh-TW'):r.unlocks?'可能發現 '+r.unlocks+' 處：'+r.targets.join('、'):'無新地點候選 · 僅經驗 '+calc.xp.toLocaleString('zh-TW'))+'</p>'+(strategy==='efficiency'?'<p class="route-efficiency">'+esc(({level:'基礎經驗／有效小時：',gil:'社群毛 Gil／有效 24 小時：',collection:'合格來源／有效 24 小時：',explore:'順帶開圖機會／有效 24 小時：',auto:'主線前置／有效 24 小時：',unlock:'新地點機會／有效 24 小時：'}[r.ranking?.mode]||'效率：')+E.efficiencyScore(r,r.ranking?.mode).toLocaleString('zh-TW',{maximumFractionDigits:2}))+'</p>':'')+(delta?'<p class="route-tradeoff">'+esc(delta)+'</p>':'')+'<div class="route-facts"><span>估算航時<b>'+duration(calc.seconds)+'</b></span><span>有效週期<b>'+duration(cycle)+'</b></span><span>燃料<b>'+calc.fuel+' 罐</b></span></div>'+(r.shipChoices?.length>1?'<label class="field-label">同航線與數值，可派哪艘<select data-candidate-ship="'+n+'">'+r.shipChoices.map(j=>'<option value="'+j+'" '+(j===si?'selected':'')+'>'+(j+1)+' 號艇</option>').join('')+'</select></label>':'')+'<div class="candidate-actions"><button type="button" data-preview="'+n+'">'+(preview?.index===n?'正在海圖預覽':'在海圖預覽')+'</button><button type="button" data-apply="'+n+'" '+(!calc.valid||sailing(w,si)?'disabled':'')+'>套用至 '+(si+1)+' 號艇</button></div><details><summary>條件與計算明細</summary><p>'+esc(r.reason||'')+'</p>'+((r.explanation||[]).map(x=>'<p>'+esc(x)+'</p>').join(''))+'<p>航距 '+calc.range+'／'+calc.ability.range+' · 基礎經驗 '+calc.xp.toLocaleString('zh-TW')+'。'+esc(statsLabel(calc.ability))+'。航時為公式估算，以遊戲管制台為準。'+esc(calc.errors.join(' '))+'</p></details></article>';
 });return cards.length?cards[0]+(cards.length>1?'<details class="alternative-routes"><summary>另外 '+(cards.length-1)+' 個可行選擇</summary>'+cards.slice(1).join('')+'</details>':''):(goalOf(w)==='gil'?'<p class="empty-state">目前沒有可估算毛值的 NPC 航線。不代表沒有一般航線；可自行切換開圖、練等或手動規劃。</p>':'<p class="empty-state">此目標目前沒有符合條件的候選。依上方缺項補齊資料；不假設配裝或開圖進度。</p>');
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
function renderMilestones(){const {w,i}=sel();milestoneToggle.textContent='船位進度 · '+w.ships.filter(s=>s.enabled).length+'／4 艘已登記 ▾';mobileFleet.textContent=w.name+' · '+(i+1)+' 號艇　／　管理艦隊 ▾';$('#slot-milestones').innerHTML=[['J',20,3],['O',30,5],['T',40,7]].map(([code,rank,tickets],n)=>'<button type="button" class="milestone-card" data-slot-target="'+(n+1)+'"><span>0'+(n+2)+' / 船位</span><strong>'+code+' · Rank '+rank+'</strong><small>'+esc(w.ships[n+1].enabled?'已登記此船':w.slotUnlocked?.[n+1]?'已確認資格，待登記':isOpen(w,'deep',code)?'航點已發現，船位待確認':'沿前置探索，爭取發現')+'</small><span class="milestone-foot">'+tickets+' 張登記票 · 點選定位</span></button>').join('')+'<details class="slot-confirm"><summary>確認船位資格</summary><p>只勾選你已在遊戲確認可登記的船位，不會自動啟用船隻。</p>'+[1,2,3].map(n=>'<label><input type="checkbox" data-slot-confirm="'+n+'" '+(w.slotUnlocked?.[n]?'checked':'')+'>第 '+(n+1)+' 船位已取得</label>').join('')+'</details>';
 $('#harbor-status').innerHTML='<strong>'+w.ships.filter(x=>x.enabled).length+' <small>/ 4 艘已登記</small></strong><span>資料僅儲存在此瀏覽器</span>';
}
function enhanceMap(){window.SubMapUI?.render({fleet:F,previewRoute:preview?.route||null});}
function fleetStatus(){
 document.querySelectorAll('[data-edit-ship]').forEach(button=>{const w=F.state.workshops.find(x=>x.id===button.dataset.owner),i=Number(button.dataset.editShip);if(!w)return;let tag=button.querySelector('.fleet-status');if(!tag){tag=document.createElement('small');tag.className='fleet-status';button.querySelector('span:last-of-type').append(tag);}const sail=w.sailings?.[i];tag.textContent=sail?(sail.returnAt<=Date.now()?'預計已返航 · 待確認':'航行中 · '+new Date(sail.returnAt).toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})):w.ships[i].enabled?'待派遣':'未登記';tag.classList.toggle('return-due',Boolean(sail&&sail.returnAt<=Date.now()));});
}
function metrics(){const {w,i,ship,voyage}=sel(),a=E.stats(ship),calc=E.calculate(ship,voyage.map,voyage.nodes,w.opened);$('#voyage-metrics').innerHTML=voyage.nodes.length?'<div><small>估算航時</small><b>'+duration(calc.seconds)+'</b></div><div><small>燃料／航距</small><b>'+calc.fuel+' 罐 · '+calc.range+'/'+a.range+'</b></div>':'';
 $('#optimize-voyage').disabled=voyage.nodes.length<2||sailing(w,i);
 $('#voyage-breakdown').innerHTML='<p>目前配裝 · '+esc(statsLabel(a))+'<br>載量 '+a.cost+'／'+a.capacity+'</p><ol>'+[...ship.build].map((d,n)=>'<li>'+['船體','船尾','船首','艦橋'][n]+'：'+esc(partNames[Number(d)-1])+(ship.modified?.[n]?' · Modified 改型':' · 普通')+'</li>').join('')+'</ol><p>'+esc(a.errors.join(' '))+'</p><p>探查決定掉落層資格，不提高開圖率；收集影響數量檔；航速影響時間；航距限制路線；恩惠達門檻有機會二次探索，不保證觸發。</p><p>時間含固定 12 小時，逐段取整，不額外計最後一站返港。基礎經驗不含隨機加成。燃料／耐久未連接遊戲，請自行核對。</p>';
 $('#voyage-route-list').querySelector('.route-reorder')?.remove();
 if(voyage.nodes.length>1)$('#voyage-route-list').insertAdjacentHTML('beforeend','<div class="route-reorder">'+voyage.nodes.map((code,n)=>'<span>'+esc(code)+'<button type="button" data-move-stop="'+n+'" '+(n===0||sailing(w,i)?'disabled':'')+' aria-label="將 '+esc(code)+' 往前一站">←</button></span>').join('')+'</div>');
}
function render(){
 const {w,i,ship}=sel();renderRequired();$('#planner-hours').value=String(w.plannerHours??0);const k=key();
 if(k!==lastKey){run++;$('#planner-results').setAttribute('aria-busy','false');preview=null;armed='';buildSuggestions=[];$('#collection-build-results').innerHTML='';lastKey=k;$('#planner-mode').value=goalOf(w,i);$('#planner-cadence').value=String(w.cadenceHours??24);renderCollection();decision=decide();candidates=[];$('#next-step-title').textContent=decision.title;$('#mobile-next-title').textContent=goalOf(w,i)==='item'?itemLabel(C.items.find(x=>x.id===targetOf(w))||C.items[0])+' · '+decision.title:decision.title;$('#next-step-copy').textContent=decision.copy;$('#next-step-details').querySelector('summary').textContent=goalOf(w)==='gil'?'收益模型與缺項':'查看各船缺項與來源限制';$('#next-step-details').hidden=!decision.details?.length;$('#next-step-detail-list').innerHTML=(decision.details||[]).map(t=>'<li>'+esc(t)+'</li>').join('');$('#planner-status').textContent='';$('#planner-results').innerHTML=routeCards(candidates);if(decision.jobs.length)compare();}
 $('#planner-ship-summary').textContent=w.name+' · '+(i+1)+' 號艇 · '+(ship.enabled?'Rank '+ship.rank:'尚未登記')+' · '+({outcome:'成果優先',efficiency:'效率優先',time:'省時優先'}[strategy]);
 updateEmptyAction();
 $('#planner-strategy-help').textContent={outcome:'主目標每趟成果優先；同分再比較其他成果與航時。',efficiency:'以你設定的收船間隔比較有效週期，而非假設不停收船。',time:'先比主目標成果，同成果時選航時較短。'}[strategy];
 if(ship.requiredStops?.length&&strategy==='time')$('#planner-strategy-help').textContent='先滿足全部必去地點，再比較最短航時；不會為湊站數而繞路。';
 metrics();renderMilestones();enhanceMap();fleetStatus();window.SubLogbook?.render();
}
function previewRoute(n){const route=candidates[n];if(!route)return;preview={route,index:n,key:key()};const {w}=sel();w.map=route.map;w.selectedNode=route.nodes[0];$('#planner-results').innerHTML=routeCards(candidates);F.renderAll();if(window.innerWidth<=760)$('.map-viewport').scrollIntoView({behavior:'smooth',block:'start'});$('#planner-status').innerHTML='海圖金色線為預覽，圖下航線清單標示站序。原有各船航線仍保留；按套用才更改計畫。 <button type="button" id="cancel-preview">結束預覽</button>';$('#cancel-preview').onclick=()=>{preview=null;$('#planner-results').innerHTML=routeCards(candidates);F.renderMap();$('#planner-status').textContent='預覽已結束，原計畫保持不變。';};}
function allTargets(){const out={};for(const map of F.maps)for(const node of map.nodes){if(F.nodeState(map,node.code)!=='available'||!node.parent)continue;const [m,c]=node.parent;out[m]??={};out[m][c]??=[];out[m][c].push(map.name+' '+node.code);}return out;}
async function compare(){
 const {w}=sel();decision=decide();if(!decision.jobs.length)return;
 const token=++run,k=key(),snapshot=structuredClone(w),targets=allTargets(),scope=$('#planner-scope').value==='current'?[w.map]:undefined;
 const stopped=()=>token!==run||key()!==k;
 candidates=[];preview=null;armed='';$('#planner-results').setAttribute('aria-busy','true');$('#planner-results').innerHTML='<p class="empty-state">正在完整比較 1–5 站組合與順序…</p>';$('#planner-status').textContent='正在計算；更改目標或船隻會取消舊比較。';
 let checked=0,results=[],alternatives=[],warnings=[];
 try{
  await new Promise(resolve=>setTimeout(resolve,0));
  for(const job of decision.jobs){if(stopped())return;
   const result=await E.recommend(snapshot.ships[job.shipIndex],snapshot.opened,targets,{...job,requiredStops:job.requiredStops||snapshot.ships[job.shipIndex].requiredStops||[],strategy,cadenceHours:snapshot.cadenceHours??24,hours:Number($('#planner-hours').value),...(scope?{maps:scope}:{}),cancelled:stopped,onProgress:n=>{if(!stopped())$('#planner-status').textContent='已比較 '+(checked+n).toLocaleString()+' 條可行順序…';}});
   if(stopped()||result.cancelled)return;checked+=result.checked||0;warnings.push(...[...(result.errors||[]),...(result.warnings||[])].map(displayReason));
   results.push(...result.routes.filter(r=>job.kind!=='unlock'||r.priorityVisits>0).map(r=>({...r,shipIndex:job.shipIndex,kind:job.kind,reason:job.kind==='unlock'?'收藏前置開圖；本趟不取得目標家具。':result.objective||'',coverage:result.coverage})));
   alternatives.push(...(result.alternatives||[]).filter(r=>job.kind!=='unlock'||r.priorityVisits>0).map(r=>({...r,shipIndex:job.shipIndex,kind:job.kind,alternative:true,reason:'切換策略的取捨參考；'+(job.kind==='unlock'?'本趟只開收藏前置，不取得家具。':result.objective||'')})));
  }
  if(stopped())return;
  const equivalentKey=r=>JSON.stringify([keys.map(k=>E.stats(snapshot.ships[r.shipIndex])[k]),r.map,[...r.nodes].sort(),r.seconds,r.range,r.fuel,r.xp,r.unlocks,r.priorityVisits,r.collectionVisits,r.expectedSalvageGil]);
  const grouped=new Map();for(const r of results){const id=equivalentKey(r),existing=grouped.get(id);if(existing){if(!existing.shipChoices.includes(r.shipIndex))existing.shipChoices.push(r.shipIndex);}else grouped.set(id,{...r,shipChoices:[r.shipIndex]});}
  for(const r of grouped.values())if(r.shipChoices.includes(snapshot.activeVoyageShip))r.shipIndex=snapshot.activeVoyageShip;
  results=[...grouped.values()].sort((a,b)=>E.compareRoutes(a,b,decision.jobs[0].mode,strategy)||a.shipIndex-b.shipIndex);candidates=[];const stopSets=new Set();for(const r of results){const id=r.map+':'+[...r.nodes].sort().join(',');if(!stopSets.has(id)){candidates.push(r);stopSets.add(id);}if(candidates.length===3)break;}
  for(const r of alternatives){const existing=candidates.find(x=>equivalentKey(x)===equivalentKey(r));if(existing){if(!existing.shipChoices.includes(r.shipIndex))existing.shipChoices.push(r.shipIndex);continue;}if(candidates.length<6)candidates.push({...r,shipChoices:[r.shipIndex]});}
  if(goalOf(w)==='auto'&&candidates.length&&candidates[0].ranking?.mode==='auto'&&!candidates[0].priorityVisits){candidates=candidates.map(r=>({...r,kind:'other-goal'}));$('#next-step-title').textContent='主線受目前限制排除 · 其他目標備案';$('#mobile-next-title').textContent='主線受限 · 其他目標備案';$('#next-step-copy').textContent='下列候選不拜訪指定主線前置，不推進該船位／海域目標；可放寬航時或範圍再比較。';}
  if(goalOf(w)==='item'&&!candidates.length&&decision.jobs.some(j=>j.kind==='unlock')){$('#next-step-title').textContent='目前限制內沒有收藏前置航線';$('#mobile-next-title').textContent='收藏前置受限，請檢查範圍／航時';$('#next-step-copy').textContent='可拜訪的收藏前置被航時或海圖範圍排除；不以無關航點冒充前置進度，請檢查限制。';}
  $('#planner-results').innerHTML=routeCards(candidates);
  $('#planner-status').textContent=(goalOf(w)==='gil'?'本次 NPC 成熟樣本範圍：'+checked.toLocaleString()+' 條合格順序 · ':'已比較 '+checked.toLocaleString()+' 條可行順序 · ')+(scope?'目前海圖':'全部已開海域')+' · 航時上限 '+($('#planner-hours').value==='0'?'不限':$('#planner-hours').value+' 小時')+' · 收船間隔 '+((snapshot.cadenceHours??24)?'每 '+(snapshot.cadenceHours??24)+' 小時':'返航即收')+'。';
  const details=[...(decision.details||[]),...new Set(warnings)];$('#next-step-detail-list').innerHTML=details.map(x=>'<li>'+esc(x)+'</li>').join('');$('#next-step-details').hidden=!details.length;
  if(goalOf(w)==='gil'&&!candidates.length){$('#next-step-title').textContent='目前沒有可估算毛值的 NPC 航線';$('#mobile-next-title').textContent='NPC 成熟樣本條件尚未備齊';$('#next-step-copy').textContent=emptyAction()[0]==='constraints'?'已有成熟資格來源，但本次航時上限或海圖範圍排除了候選。':(E.npcEvidence||[]).some(x=>isOpen(w,x.map,x.code))?'已開來源尚未達成熟樣本性能或拜訪等級；這不代表不能掉落一般飾物。':'尚未登記成熟樣本來源 J／M／O／R／Z；這不代表沒有一般航線。';}
  if(sel().ship.requiredStops?.length&&!candidates.length){$('#next-step-title').textContent='本趟必去條件目前無法完成';$('#mobile-next-title').textContent='指定探索受限 · 查看原因';$('#next-step-copy').textContent=[...new Set(warnings)].join(' ')||'沒有同時滿足指定地點與目前目標的航線，請核對條件；沒有省略任何指定點。';$('#next-step-details').open=true;}
  if(candidates.length&&['auto','unlock'].includes(candidates[0].ranking?.mode)&&candidates[0].unlocks===0)$('#planner-status').textContent+=' 目前沒有可發現新地點的候選，下列僅是經驗比較，不會開圖。';
  updateEmptyAction();F.renderMap();
 }catch(error){if(!stopped()){$('#planner-status').textContent='未能完成計算，沒有修改任何航程。請按重新比較重試。';$('#planner-results').innerHTML='<p class="empty-state">計算失敗，未以單站替代完整結果。</p>';}}
 finally{if(token===run){$('#planner-results').setAttribute('aria-busy','false');updateEmptyAction();}}
}
$('#open-progress-editor').onclick=()=>window.SubNodeUI?.openManagement({progress:true,trigger:$('#open-progress-editor')});
$('#setup-selected-ship').onclick=()=>{const {w,i}=sel();F.openShipEditor(w.id,i);};
$('#open-route-planner').onclick=()=>{if(candidates.length){previewRoute(0);return;}const action=emptyAction()[0];if(action==='required'){requiredEditor.open=true;requiredHost.scrollIntoView({behavior:'smooth',block:'center'});$('#required-map').focus({preventScroll:true});}else if(action==='settings'){$('#next-step-details').open=true;$('#setup-selected-ship').click();}else if(action==='build'){$('.collection-build-panel').open=true;$('.collection-provenance').open=true;$('#collection-reference').scrollIntoView({behavior:'smooth',block:'start'});}else if(action==='constraints'){if($('#planner-scope').value==='current')$('.advanced-planner').open=true;$('#planner-hours').scrollIntoView({behavior:'smooth',block:'center'});$('#planner-hours').focus({preventScroll:true});}else if(action==='plan')switchConsole('plan');else if(action==='map')$('.map-viewport').scrollIntoView({behavior:'smooth',block:'start'});else $('#open-progress-editor').click();};
$('#planner-mode').onchange=()=>{const {w}=sel();w.ships[w.activeVoyageShip].plannerGoal=$('#planner-mode').value;w.ships[w.activeVoyageShip].goal=$('#planner-mode').value;if(goalOf(w)==='explore'){requiredEditor.open=true;strategy='time';document.querySelectorAll('[data-planner-strategy]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.plannerStrategy===strategy)));}if(goalOf(w)==='item'&&!w.ships[w.activeVoyageShip].collectionTarget)w.ships[w.activeVoyageShip].collectionTarget=targetOf(w);F.save();render();F.renderMap();};
$('#planner-cadence').onchange=()=>{sel().w.cadenceHours=Number($('#planner-cadence').value);F.save();render();};
$('#suggest-collection-build').onclick=()=>{const {w,i}=sel();buildSuggestions=C.suggestBuild(targetOf(w),w,i);$('#collection-build-results').innerHTML=buildSuggestions.map((b,n)=>'<article class="build-suggestion"><b>'+esc(b.build.split('').map((d,j)=>d+(b.modified[j]?'+':'')).join(' / '))+'</b><p>'+esc(mapName(b.map)+' '+b.nodes.join(' → '))+' · 估算 '+duration(b.seconds)+'</p><p>'+esc(b.changes.map(c=>c.slotName+' → '+partNames[c.to.type-1]+(c.to.modified?' 改型':' 普通')).join('；'))+'</p><p>'+esc(statsLabel(b.ability))+'</p><small>'+esc(b.reason)+' 零件持有與成本未知。</small><button type="button" data-build-draft="'+n+'">帶入設定草稿（不儲存）</button></article>').join('')||'<p>目前沒有需要或能成立的替換參考。請確認來源版本、開圖、等級；若當前配裝已達標，不需為了數值更高而換件。</p>';};
$('#collection-build-results').onclick=e=>{const b=e.target.closest('[data-build-draft]');if(!b)return;const draft=buildSuggestions[Number(b.dataset.buildDraft)],{w,i}=sel();if(!draft||sailing(w,i))return;F.openShipEditor(w.id,i);$('#ship-build').value=draft.build;draft.modified.forEach((m,j)=>$('#ship-modified-'+j).checked=m);$('#ship-build').dispatchEvent(new Event('input',{bubbles:true}));$('#ship-dialog-message').textContent='這是未確認持有的試算配裝；請先確認四部件已備齊，再儲存。取消不改變現有配裝或航程。';};
$('#collection-search').oninput=renderCollection;$('#collection-kind').onchange=renderCollection;
$('#collection-target').onchange=()=>{if(!$('#collection-target').value)return;sel().ship.collectionTarget=$('#collection-target').value;F.save();render();};
$('#compare-routes').onclick=compare;
$('#planner-hours').onchange=()=>{sel().w.plannerHours=Number($('#planner-hours').value);F.save();lastKey='';render();};
$('#planner-scope').onchange=()=>{lastKey='';render();};
$('#planner-strategies').onclick=e=>{const b=e.target.closest('[data-planner-strategy]');if(!b)return;strategy=b.dataset.plannerStrategy;document.querySelectorAll('[data-planner-strategy]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();};
$('#planner-results').onchange=e=>{const choice=e.target.closest('[data-candidate-ship]');if(!choice)return;const n=Number(choice.dataset.candidateShip),r=candidates[n],i=Number(choice.value);if(!r?.shipChoices?.includes(i))return;r.shipIndex=i;armed='';$('#planner-results').innerHTML=routeCards(candidates);$('#planner-results [data-candidate-ship="'+n+'"]')?.focus({preventScroll:true});if(preview?.index===n){preview.route=r;F.renderMap();}};
$('#planner-results').onclick=e=>{
 const p=e.target.closest('[data-preview]');if(p){previewRoute(Number(p.dataset.preview));return;}
 const b=e.target.closest('[data-apply]');if(!b)return;const n=Number(b.dataset.apply),r=candidates[n];if(!r)return;
 const {w}=sel(),i=r.shipIndex??w.activeVoyageShip,v=w.voyages[i];if(sailing(w,i)){F.notice('尚未收船，不能取代航次計畫。');return;}
 const missing=(w.ships[i].requiredStops||[]).filter(x=>x.map!==r.map||!r.nodes.includes(x.code));if(missing.length){$('#planner-status').textContent='此候選缺少本趟必去地點，請重新比較。';return;}
 const calc=E.calculate(w.ships[i],r.map,r.nodes,w.opened);if(!calc.valid){$('#planner-status').textContent=calc.errors.join(' ');return;}
 const signature=w.id+':'+i+':'+r.map+':'+r.nodes.join(',');
 if(v.nodes.length&&(v.map!==r.map||v.nodes.join(',')!==r.nodes.join(','))&&armed!==signature){armed=signature;b.textContent='確認取代此船計畫';$('#planner-status').innerHTML='僅取代 '+(i+1)+' 號艇未出航的計畫，不變更其他船。<button type="button" id="cancel-apply">取消取代</button>';$('#cancel-apply').onclick=()=>{armed='';$('#planner-status').textContent='已取消，原計畫未變。';$('#planner-results').innerHTML=routeCards(candidates);};return;}
 w.voyages[i]={map:r.map,nodes:[...r.nodes]};w.activeVoyageShip=i;w.map=r.map;w.selectedNode=r.nodes[0];armed='';F.save();F.renderAll();switchConsole('plan');F.notice('已套用 '+(i+1)+' 號艇計畫；尚未記錄出航，也未變更開圖。');
};
$('#optimize-voyage').onclick=()=>{const {w,i,ship,voyage}=sel();if(sailing(w,i))return;const best=E.optimize(ship,voyage.map,voyage.nodes,w.opened);if(!best){F.notice('沒有符合目前資料的可行順序。');return;}w.voyages[i]={map:voyage.map,nodes:[...best.nodes]};F.renderAll();F.notice('已重排 '+best.nodes.join(' → ')+'；未變更開圖與配裝。');};
$('#voyage-route-list').addEventListener('click',e=>{const b=e.target.closest('[data-move-stop]');if(!b)return;const {w,i,voyage}=sel(),n=Number(b.dataset.moveStop);if(n<1||sailing(w,i))return;const nodes=[...voyage.nodes];[nodes[n-1],nodes[n]]=[nodes[n],nodes[n-1]];const calc=E.calculate(w.ships[i],voyage.map,nodes,w.opened);if(!calc.valid){F.notice(calc.errors.join(' '));return;}voyage.nodes=nodes;F.renderAll();});
$('#slot-milestones').addEventListener('click',e=>{const b=e.target.closest('[data-slot-target]');if(!b)return;const {w}=sel();w.map='deep';w.selectedNode=['','J','O','T'][Number(b.dataset.slotTarget)];F.renderAll();window.SubNodeUI?.show();});
$('#slot-milestones').addEventListener('change',e=>{if(!e.target.matches('[data-slot-confirm]'))return;const {w}=sel();w.slotUnlocked??=[true,false,false,false];w.slotUnlocked[Number(e.target.dataset.slotConfirm)]=e.target.checked;F.save();render();});
setInterval(fleetStatus,30000);
window.SubVoyageUI={render,addRequired,showReturn:()=>switchConsole('plan'),routeForMap:id=>preview?.key===key()&&preview.route.map===id?preview.route.nodes:[]};
render();
})();
