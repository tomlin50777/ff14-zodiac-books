/* Read-only onboarding: never calls voyage writers or changes fleet selection. */
(function () {
'use strict';
const $=s=>document.querySelector(s), key='ff14-submersible-tour-v1';
const anchor=$('#map-help');if(!anchor)return;
const replay=document.createElement('button');replay.id='sub-tour-replay';replay.type='button';replay.textContent='？';replay.title='新手導覽';replay.setAttribute('aria-label','重新查看新手導覽');anchor.after(replay);
const tour=document.createElement('dialog');tour.id='sub-tour';tour.setAttribute('aria-labelledby','sub-tour-title');tour.setAttribute('aria-describedby','sub-tour-copy');
tour.innerHTML='<div class="sub-tour-shade" aria-hidden="true"></div><section class="sub-tour-card"><header><span id="sub-tour-count"></span><button type="button" data-tour="skip">跳過</button></header><div aria-live="polite" aria-atomic="true"><h2 id="sub-tour-title"></h2><div id="sub-tour-copy"></div></div><footer><button type="button" data-tour="back">上一步</button><button type="button" data-tour="next">下一步</button></footer></section>';
document.body.append(tour);
const card=tour.querySelector('.sub-tour-card'),shade=tour.querySelector('.sub-tour-shade'),back=tour.querySelector('[data-tour="back"]'),next=tour.querySelector('[data-tour="next"]');
const steps=[
 {target:'#fleet-manager',title:'先選工房',copy:'左側切換工房，各工房分開記錄船隻與海域進度。'},
 {target:'#voyage-ship-tabs',title:'選船，再設定',copy:'點船卡選擇要操作的船；齒輪可設定這艘船的等級、零件與目標。'},
 {target:'.map-canvas',title:'在海圖規劃航程',copy:'上方切換海域，點航點加入或移出目前船的航程。地點進度可用滑鼠移入或觸控長按查看。'},
 {target:'.planner-purpose',fallback:'.chart-console',title:'目的：這趟想做什麼？',copy:'先選練等、開圖或其他目的，再比較路線。練等看基礎經驗，開圖看可爭取發現的地點；不代表保證取得。',unavailable:'這艘船目前不顯示推薦表單，收船後即可使用。'},
 {target:'#planner-constraints',fallback:'.chart-console',title:'先訂這趟的條件',copy:'必去地點可多選；時間上限限制單趟航時。條件太嚴格時可能沒有可行路線。',unavailable:'推薦表單會在船可派遣時顯示。'},
 {target:'#planner-strategies',fallback:'.chart-console',title:'成果、效率、省時怎麼選？',modes:true,unavailable:'船可派遣時，可在這裡切換三種推薦方式。'},
 {target:'#planner-settings-toggle',fallback:'.chart-console',title:'效率要配合你的收船作息',copy:'齒輪可設定多久收一次船。若每天收一次，20 與 23 小時的航程都可能等到同一次上線才收，不一定越短就越划算。',unavailable:'船可派遣時，齒輪會出現在效率優先旁。'},
 {target:'#map-route-summary',title:'選好路線，再出航',copy:'中央「出航」送出目前手動航程；右側「以此路線出航」採用選中的推薦。返航後從中央按「收船」。導覽不會替你執行這些操作。'}
];
let index=0,returnFocus=null,scrolls=[],raf=0;
function visible(el){return !!el&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';}
function resolve(step){const el=$(step.target);return visible(el)?{el,missing:false}:{el:$(step.fallback||'#chart-room'),missing:true};}
function place(){
 if(!tour.open)return;const {el}=resolve(steps[index]);if(!el)return;
 const r=el.getBoundingClientRect(),gap=12,w=innerWidth,h=innerHeight;
 const x=Math.max(6,r.left-5),y=Math.max(6,r.top-5),right=Math.min(w-6,r.right+5),bottom=Math.min(h-6,r.bottom+5);
 Object.assign(shade.style,{left:x+'px',top:y+'px',width:Math.max(0,right-x)+'px',height:Math.max(0,bottom-y)+'px'});
 const cr=card.getBoundingClientRect();let left,top;
 if(w-right>=cr.width+gap*2){left=right+gap;top=y;}
 else if(x>=cr.width+gap*2){left=x-cr.width-gap;top=y;}
 else {left=(w-cr.width)/2;top=bottom+gap+cr.height<=h-gap?bottom+gap:y-gap-cr.height>=gap?y-gap-cr.height:h-cr.height-gap;}
 Object.assign(card.style,{left:Math.max(gap,Math.min(left,w-cr.width-gap))+'px',top:Math.max(gap,Math.min(top,h-cr.height-gap))+'px'});
}
function schedule(){cancelAnimationFrame(raf);raf=requestAnimationFrame(place);}
function render(){
 const step=steps[index],resolved=resolve(step);$('#sub-tour-count').textContent=(index+1)+' / '+steps.length;$('#sub-tour-title').textContent=step.title;
 const body=$('#sub-tour-copy');body.replaceChildren();
 if(step.modes){for(const [name,text] of [['成果優先','每趟盡量取得較多成果，但可能需要較長航行時間。'],['效率優先','考慮成果與收船作息，讓時間和成果取得平衡，不一定單趟最多。'],['省時優先','兼顧主要目標，優先縮短航行時間，可能少拿額外成果。']]){const p=document.createElement('p'),b=document.createElement('strong');b.textContent=name;p.append(b,document.createTextNode(text));body.append(p);}}
 else {const p=document.createElement('p');p.textContent=step.copy;body.append(p);}
 if(resolved.missing&&step.unavailable){const p=document.createElement('p');p.className='sub-tour-note';p.textContent=step.unavailable;body.append(p);}
 back.disabled=index===0;next.textContent=index===steps.length-1?'完成':'下一步';
 resolved.el?.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});schedule();
}
function start(){
 if(tour.open||document.querySelector('dialog[open]'))return;
 returnFocus=document.activeElement;scrolls=[...document.querySelectorAll('body *')].filter(el=>el.scrollHeight>el.clientHeight||el.scrollWidth>el.clientWidth).map(el=>[el,el.scrollTop,el.scrollLeft]);scrolls.push([document.scrollingElement,scrollY,scrollX]);
 index=0;tour.showModal();render();next.focus({preventScroll:true});
}
function finish(){try{localStorage.setItem(key,'seen');}catch(_){}tour.close();cancelAnimationFrame(raf);for(const [el,top,left] of scrolls){el.scrollTop=top;el.scrollLeft=left;}if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});}
tour.addEventListener('cancel',event=>{event.preventDefault();finish();});
tour.addEventListener('click',event=>{const action=event.target.closest('[data-tour]')?.dataset.tour;if(action==='skip')finish();else if(action==='back'&&index>0){index--;render();}else if(action==='next'){if(index===steps.length-1)finish();else{index++;render();}}});
tour.addEventListener('keydown',event=>{if(event.key==='Tab'){const controls=[...tour.querySelectorAll('button:not(:disabled)')];const current=controls.indexOf(document.activeElement);if(current===-1||(!event.shiftKey&&current===controls.length-1)||(event.shiftKey&&current===0)){event.preventDefault();(event.shiftKey?controls[controls.length-1]:controls[0])?.focus();}return;}if(event.key==='ArrowRight'){event.preventDefault();next.click();}if(event.key==='ArrowLeft'&&index>0){event.preventDefault();back.click();}});
replay.addEventListener('click',start);window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);
let seen=false;try{seen=localStorage.getItem(key)==='seen';}catch(_){}
if(!seen)window.addEventListener('load',()=>requestAnimationFrame(()=>requestAnimationFrame(start)),{once:true});
})();
