(function (root) {
  'use strict';
  const data = root.SubVoyageData;
  const fields = ['surveillance','retrieval','speed','range','favor'];
  const slotNames = ['船體','船尾','船首','艦橋'];
  const cache = new Map();
  // Elena/Infi original worksheet: all-high breakpoints; means already include double dips.
  const npcEvidence = [{"map":"deep","code":"J","mean":59433.26,"samples":7620636.0,"surveillance":115.0,"retrieval":110.0,"favor":90.0,"meanCell":"E21","sampleCell":"E19","thresholdCells":"AE11/AK11/AN11"},{"map":"deep","code":"M","mean":21866.63,"samples":1297620.0,"surveillance":100.0,"retrieval":130.0,"favor":75.0,"meanCell":"F21","sampleCell":"F19","thresholdCells":"AE14/AK14/AN14"},{"map":"deep","code":"O","mean":59421.09,"samples":7557022.0,"surveillance":115.0,"retrieval":160.0,"favor":90.0,"meanCell":"G21","sampleCell":"G19","thresholdCells":"AE16/AK16/AN16"},{"map":"deep","code":"R","mean":40685.27,"samples":2424230.0,"surveillance":120.0,"retrieval":175.0,"favor":95.0,"meanCell":"H21","sampleCell":"H19","thresholdCells":"AE19/AK19/AN19"},{"map":"deep","code":"Z","mean":51010.15,"samples":2006815.0,"surveillance":140.0,"retrieval":195.0,"favor":110.0,"meanCell":"I21","sampleCell":"I19","thresholdCells":"AE27/AK27/AN27"}];
  const salvage = Object.fromEntries(npcEvidence.map(x=>[x.code,[x.surveillance,x.retrieval,x.favor]]));
  const salvageEvidence = Object.freeze({
    source:'https://docs.google.com/spreadsheets/d/1eiuGRrQTjJ5n4ogybKOBxJRT7EiJLlX93fge-Z8MmD4/edit',
    checked:'2026-11-01',snapshot:'2025-08-31',kind:'community-observation',
    meanSheet:'Farming sectors (Fight Club+Cry',thresholdSheet:'Sectors (detailed)',
    note:'社群成熟資格樣本，NPC飾物毛均值已含二次探索，非保底、非台服實測、未扣成本；僅覆蓋溺沒海 J/M/O/R/Z。'
  });
  function own(object,key) { return object != null && Object.hasOwn(object,key); }
  function effectiveCycle(seconds,cadenceHours=0) {
    if (!Number.isFinite(seconds) || seconds<0) return null;
    const cadence=Number(cadenceHours)*3600;
    return Number.isFinite(cadence)&&cadence>0 ? Math.ceil(seconds/cadence)*cadence : seconds;
  }
  function stats(ship) {
    ship = ship && typeof ship==='object' ? ship : {};
    const rank = Number(ship.rank), bonus = own(data.ranks,rank) ? data.ranks[rank] : null, build = String(ship.build || '');
    const result = {valid:false,errors:[],cost:0,capacity:bonus?.capacity || 0,parts:[]};
    fields.forEach(k => result[k] = bonus?.[k] || 0);
    if (!Number.isInteger(rank) || !bonus) result.errors.push('船隻等級需為 1～130。');
    if (!/^[1-5]{4}$/.test(build)) result.errors.push('零件需四碼，每碼 1～5。');
    if (result.errors.length) return result;
    [...build].forEach((digit,slot) => {
      const modified = ship.modified?.[slot] === true;
      const part = data.parts.find(p => p.type === Number(digit) && p.slot === slot && p.modified === modified);
      if (!part) { result.errors.push(slotNames[slot]+'缺少能力資料。'); return; }
      result.parts.push(part); result.cost += part.cost;
      fields.forEach(k => result[k] += part[k]);
      if (rank < part.rank) result.errors.push(slotNames[slot]+' '+digit+(modified?' 改':'')+' 需要 Rank '+part.rank+'。');
    });
    if (result.cost > result.capacity) result.errors.push('零件容量 '+result.cost+' 超過此等級上限 '+result.capacity+'。');
    if (result.speed <= 0 || result.range <= 0) result.errors.push('速度與航程能力必須大於 0。');
    result.valid = !result.errors.length;
    return result;
  }
  function distance(a,b) { return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]); }
  function leg(a,b,speed) {
    const d = distance(a,b.xyz);
    return {travelRange:Math.floor(d*.035),surveyRange:b.surveyDistance,
      travelSeconds:Math.floor(d*3990/(speed*100)*60),surveySeconds:Math.floor(b.surveyMinutes*7000/(speed*100)*60)};
  }
  function calculate(ship,mapId,codes,opened) {
    ship = ship && typeof ship==='object' ? ship : {};
    const malformed = !Array.isArray(codes) || codes.some(code=>typeof code!=='string');
    codes = malformed ? [] : codes;
    const ability = stats(ship), map = own(data.maps,mapId) ? data.maps[mapId] : null;
    const result = {valid:false,errors:[...ability.errors],ability,map:mapId,nodes:[...codes],range:0,fuel:0,seconds:0,xp:0,legs:[]};
    if (malformed) result.errors.push('航程資料格式錯誤。');
    if (!ship.enabled) result.errors.push('此船尚未啟用。');
    if (!codes.length) { result.errors.push('尚未安排航程。'); return result; }
    if (!map) { result.errors.push('此海域不在 7.2 計算範圍。'); return result; }
    if (codes.length>5) result.errors.push('一趟最多 5 個地點。');
    if (new Set(codes).size!==codes.length) result.errors.push('同一趟不能重複地點。');
    let previous=map.start;
    result.seconds=43200;
    for (const code of codes) {
      const node=map.nodes.find(n=>n.code===code);
      if (!node) { result.errors.push(code+' 不在 7.2 資料中。'); continue; }
      if (ship.rank<node.rank) result.errors.push(code+' 需要 Rank '+node.rank+'。');
      if (opened && !(own(opened,mapId) && own(opened[mapId],code) && opened[mapId][code]===true)) result.errors.push(code+' 尚未登記開啟。');
      const item=leg(previous,node,Math.max(1,ability.speed));
      result.range+=item.travelRange+item.surveyRange;
      result.seconds+=item.travelSeconds+item.surveySeconds;
      result.fuel+=node.fuel; result.xp+=node.xp;
      result.legs.push({code,...item,fuel:node.fuel,xp:node.xp}); previous=node.xyz;
    }
    if (result.range>ability.range) result.errors.push('航程需要 '+result.range+'，超過上限 '+ability.range+'（差 '+(result.range-ability.range)+'）。');
    result.valid=!result.errors.length;
    return result;
  }
  const priorities = {
    unlock:['unlocks','xp','salvagePoints'],level:['xp','unlocks','salvagePoints'],
    gil:['expectedSalvageGil','unlocks','xp'],auto:['priorityVisits','unlocks','xp','salvagePoints'],
    collection:['collectionVisits'],explore:['unlocks','xp']
  };
  const cycle=r=>r.effectiveSeconds||r.seconds;
  const objectiveLabels={unlock:'可爭取發現的不同地點數（非機率）',level:'基礎經驗（不含隨機加成）',gil:'成熟資格 NPC 飾物社群毛均值（已含二次探索）',auto:'主線前置拜訪數，再比較全趟可發現地點與基礎經驗',collection:'合格來源拜訪數（代理指標，非掉率或期望件數）',explore:'同時拜訪所有指定地點，再比較可發現地點數與基礎經驗'};
  const number=(r,k)=>Number.isFinite(r[k])?r[k]:0;
  function efficiencyScore(route,mode) {
    const primary=(priorities[mode]||priorities.unlock)[0];
    return number(route,primary)/cycle(route)*(mode==='level'?3600:86400);
  }
  function compareRoutes(a,b,mode='unlock',strategy='outcome') {
    const order=priorities[mode]||priorities.unlock;
    // With mandatory destinations, time means the actual fastest feasible trip,
    // not the fastest trip among those with the greatest reward. Legacy modes
    // without mandatory stops retain their original ranking semantics.
    if(strategy==='time'&&(mode==='explore'||a.requiredStopCount>0||b.requiredStopCount>0)&&a.seconds!==b.seconds)return a.seconds-b.seconds;
    if(strategy==='efficiency') {
      for(const field of (mode==='auto'?['priorityVisits','unlocks']: [order[0]])){
        const delta=number(b,field)/cycle(b)-number(a,field)/cycle(a);if(Math.abs(delta)>1e-12)return delta;
      }
      if(mode==='collection')return cycle(a)-cycle(b)||a.seconds-b.seconds||a.range-b.range||a.fuel-b.fuel;
      const xpRate=b.xp/cycle(b)-a.xp/cycle(a);if(Math.abs(xpRate)>1e-12)return xpRate;
      return a.seconds-b.seconds||a.range-b.range||a.fuel-b.fuel;
    }
    for(let i=0;i<order.length;i++){
      const delta=number(b,order[i])-number(a,order[i]);if(delta)return delta;
      if(i===0&&mode==='collection')return cycle(a)-cycle(b)||a.seconds-b.seconds||a.range-b.range||a.fuel-b.fuel;
      // v46 semantics: time minimizes sailing time only after equal primary outcome.
      if(i===0&&strategy==='time'&&a.seconds!==b.seconds)return a.seconds-b.seconds;
    }
    return a.seconds-b.seconds||a.range-b.range||a.fuel-b.fuel;
  }
  function validateRequiredStops(value,ship,opened,mapIds) {
    const errors=[],stops=[],seen=new Set(),seas=new Set();
    if(!Array.isArray(value))return {stops,errors:['指定地點格式錯誤：請提供 {map, code} 陣列。']};
    if(value.length>5)errors.push('一趟最多指定 5 個地點；所有指定地點都必須到訪。');
    for(let i=0;i<value.length;i++){
      const stop=value[i];
      if(!stop||typeof stop!=='object'||Array.isArray(stop)||typeof stop.map!=='string'||typeof stop.code!=='string'||!stop.map||!stop.code){errors.push('第 '+(i+1)+' 個指定地點格式錯誤，需有海域 map 與地點 code。');continue;}
      const key=stop.map+':'+stop.code,label=stop.map+' '+stop.code;
      if(seen.has(key)){errors.push('指定地點 '+label+' 重複；同一趟不能重複地點。');continue;}
      seen.add(key);seas.add(stop.map);
      if(!own(data.maps,stop.map)){errors.push('指定海域 '+stop.map+' 不在 '+data.version+' 資料範圍。');continue;}
      const node=data.maps[stop.map].nodes.find(n=>n.code===stop.code);
      if(!node){errors.push('指定地點 '+label+' 不在 '+data.version+' 資料範圍。');continue;}
      if(!mapIds.includes(stop.map))errors.push('指定地點 '+label+' 不在目前選取的海域範圍。');
      if(node.rank>ship.rank)errors.push('指定地點 '+label+' 需要 Rank '+node.rank+'，此船目前 Rank '+ship.rank+'。');
      if(!(own(opened,stop.map)&&own(opened[stop.map],stop.code)&&opened[stop.map][stop.code]===true))errors.push('指定地點 '+label+' 尚未登記開啟；不會自動視為已開圖。');
      stops.push({map:stop.map,code:stop.code});
    }
    if(seas.size>1)errors.push('一趟不能跨海域；請將所有指定地點選在同一海域。');
    return {stops:stops.sort((a,b)=>a.map.localeCompare(b.map)||a.code.localeCompare(b.code)),errors};
  }
  function requiredConstraintDiagnosis(ship,opened,stops,maxSeconds,mode) {
    const mapId=stops[0].map,ability=stats(ship),codes=stops.map(x=>x.code);
    let minRange=Infinity,minSeconds=Infinity,jointlyFeasible=false;
    const walk=(path,rest)=>{
      if(rest.length){rest.forEach((code,i)=>walk([...path,code],rest.filter((_,j)=>j!==i)));return;}
      const route=calculate(ship,mapId,path,opened);
      minRange=Math.min(minRange,route.range);minSeconds=Math.min(minSeconds,route.seconds);
      if(route.range<=ability.range&&route.seconds<=maxSeconds)jointlyFeasible=true;
    };
    walk([],codes);
    // Removing an optional stop cannot increase either total: triangle inequality
    // plus >=1 survey range / second offsets the at-most-one floor difference.
    // Check that data invariant before using required-only minima as lower bounds.
    const monotone=data.maps[mapId].nodes.every(n=>n.surveyDistance>=1&&leg(data.maps[mapId].start,n,ability.speed).surveySeconds>=1);
    const rangeBlocked=monotone&&minRange>ability.range,timeBlocked=monotone&&minSeconds>maxSeconds;
    const reasons=[];
    if(rangeBlocked)reasons.push('所有指定地點至少需要航程 '+minRange+'，超過此船上限 '+ability.range+'（差 '+(minRange-ability.range)+'）。');
    if(timeBlocked)reasons.push('所有指定地點最短航時為 '+minSeconds+' 秒，超過時間上限 '+maxSeconds+' 秒。');
    if(!reasons.length)reasons.push(monotone&&!jointlyFeasible?'航程與時間上限分別可能滿足，但沒有同時符合兩者的指定地點拜訪順序。':'目前航程、時間、最多 5 點'+(mode==='collection'?'與合格收藏來源':'與目標資格')+'的組合限制內，沒有可同時拜訪全部指定地點的航線。');
    return {reason:rangeBlocked&&timeBlocked?'range_and_time':rangeBlocked?'range':timeBlocked?'time':'combined',minimumRequiredRange:minRange,minimumRequiredSeconds:minSeconds,rangeLimit:ability.range,secondsLimit:Number.isFinite(maxSeconds)?maxSeconds:null,requiredOnlyFeasible:jointlyFeasible,errors:reasons};
  }
  async function recommend(ship,opened,targets,options={}) {
    options=options&&typeof options==='object'?options:{};
    const cancelled=()=>typeof options.cancelled==='function'&&options.cancelled();
    const cancelledResult=checked=>({routes:[],alternatives:[],errors:['計算已取消。'],cancelled:true,checked});
    if(cancelled())return cancelledResult(0);
    ship=ship&&typeof ship==='object'?ship:{};opened=opened&&typeof opened==='object'?opened:{};targets=targets&&typeof targets==='object'?targets:{};
    const ability=stats(ship);
    if(!ship.enabled||!ability.valid)return {routes:[],alternatives:[],errors:!ship.enabled?['此船尚未啟用。']:ability.errors,checked:0};
    const requestedMode=options.mode==='item'?'collection':options.mode;
    const mode=own(priorities,requestedMode)?requestedMode:'unlock';
    const hours=Number(options.hours)||0,cadenceHours=Number(options.cadenceHours)||0;
    if(hours<0||!Number.isFinite(hours)||cadenceHours<0||!Number.isFinite(cadenceHours))return {routes:[],alternatives:[],errors:['時間條件必須是有限非負數。'],checked:0};
    const maxSeconds=hours?hours*3600:Infinity,strategy=['outcome','efficiency','time'].includes(options.strategy)?options.strategy:'outcome';
    let mapIds=[...new Set((Array.isArray(options.maps)?options.maps:Object.keys(data.maps)).filter(id=>own(data.maps,id)))];
    const requiredValidation=validateRequiredStops(options.requiredStops===undefined?[]:options.requiredStops,ship,opened,mapIds);
    const requiredStops=requiredValidation.stops,requiredErrors=requiredValidation.errors;
    if(requiredStops.length&&options.maps!==undefined&&(!Array.isArray(options.maps)||options.maps.some(id=>typeof id!=='string'||!own(data.maps,id))))requiredErrors.push('海域範圍格式錯誤：請只選取 '+data.version+' 資料內的海域。');
    if(mode==='explore'&&!requiredStops.length&&!requiredErrors.length)requiredErrors.push('指定點探索需要至少選取 1 個必訪地點。');
    if(requiredErrors.length)return {routes:[],alternatives:[],errors:requiredErrors,checked:0,requiredStops};
    if(requiredStops.length)mapIds=mapIds.filter(id=>id===requiredStops[0].map);
    if(mode==='gil'&&requiredStops.length){
      const evidenceErrors=requiredStops.flatMap(stop=>{
        const e=npcEvidence.find(x=>x.map===stop.map&&x.code===stop.code),label=stop.map+' '+stop.code;
        if(!e)return ['指定地點 '+label+' 沒有已核查的 NPC 飾物收益資料，無法替整趟作完整金額排名；不會略過此必訪點或將未知收益當作 0。請改用指定點探索、開圖或練等目標。'];
        if(ability.surveillance<e.surveillance||ability.retrieval<e.retrieval||ability.favor<e.favor)return ['指定地點 '+label+' 未達 NPC 成熟樣本資格（探查 '+e.surveillance+'／收集 '+e.retrieval+'／恩惠 '+e.favor+'）；該點收益未知，不能套用成熟毛值。請調整配裝或改用指定點探索。'];
        return [];
      });
      if(evidenceErrors.length)return {routes:[],alternatives:[],errors:evidenceErrors,warnings:[salvageEvidence.note],checked:0,requiredStops,diagnostics:{reason:'npc_evidence'}};
    }
    const priorityStops=Array.isArray(options.priorityStops)?options.priorityStops.filter(x=>x&&typeof x.map==='string'&&typeof x.code==='string'):[];
    const sources=Array.isArray(options.collectionSources)?options.collectionSources.filter(x=>x&&typeof x.map==='string'&&typeof x.code==='string'&&x.regionConfirmed===true&&Number.isFinite(x.surveillance)&&x.surveillance>=0&&(x.rank==null||Number.isInteger(x.rank)&&x.rank>=1&&x.rank<=130)):[];
    const limit=Math.max(1,Math.min(6,Number.isInteger(options.limit)?options.limit:3));
    const signature=JSON.stringify([ship,opened,targets,mode,strategy,hours,mapIds,cadenceHours,priorityStops,sources,limit,requiredStops]);
    if(cache.has(signature))return structuredCloneSafe(cache.get(signature));
    let checked=0,attempted=0,top=[];const leaders={outcome:null,efficiency:null,time:null};
    const coverage={npc:[],collection:[],excluded:[]};
    const insert=route=>{
      const old=top.findIndex(x=>x.map===route.map&&x.mask===route.mask);
      if(old>=0){if(compareRoutes(route,top[old],mode,strategy)>=0)return;top.splice(old,1);}
      top.push(route);top.sort((a,b)=>compareRoutes(a,b,mode,strategy));if(top.length>limit)top.pop();
    };
    for(const mapId of mapIds){
      if(cancelled())return cancelledResult(checked);
      const map=data.maps[mapId];
      const known=n=>npcEvidence.find(x=>x.map===mapId&&x.code===n.code);
      const qualifies=n=>{const e=known(n);return e&&ability.surveillance>=e.surveillance&&ability.retrieval>=e.retrieval&&ability.favor>=e.favor;};
      const openNodes=map.nodes.filter(n=>own(opened,mapId)&&own(opened[mapId],n.code)&&opened[mapId][n.code]===true&&n.rank<=ship.rank);
      for(const n of openNodes){const e=known(n);if(e)coverage.npc.push({map:mapId,code:n.code,qualified:Boolean(qualifies(n)),mean:qualifies(n)?e.mean:null,required:{surveillance:e.surveillance,retrieval:e.retrieval,favor:e.favor},samples:e.samples});}
      // NPC optimization is explicitly bounded to evidence-covered mature sources.
      // Other destinations have unknown values; they are not valued at zero.
      const eligible=mode==='gil'?openNodes.filter(qualifies):openNodes,count=eligible.length;
      if(mode==='gil')coverage.excluded.push(...openNodes.filter(n=>!qualifies(n)).map(n=>({map:mapId,code:n.code,reason:known(n)?'未達成熟樣本資格，毛值未知':'未覆蓋此來源的收益資料'})));
      if(!count)continue;
      const requiredMask=eligible.reduce((mask,n,i)=>requiredStops.some(x=>x.map===mapId&&x.code===n.code)?mask|(1<<i):mask,0);
      const earns=eligible.map(n=>qualifies(n)?known(n).mean:null);
      const collects=eligible.map(n=>sources.some(x=>x.map===mapId&&x.code===n.code&&(x.rank==null||ship.rank>=Math.max(n.rank,x.rank))&&ability.surveillance>=x.surveillance&&(x.retrievalThreshold==null||Number.isFinite(x.retrievalThreshold)&&ability.retrieval>=x.retrievalThreshold))?1:0);
      for(let i=0;i<count;i++)if(collects[i])coverage.collection.push({map:mapId,code:eligible[i].code});
      if(mode==='collection'&&!collects.some(Boolean))continue;
      const priority=eligible.map(n=>Number(priorityStops.some(x=>x.map===mapId&&x.code===n.code)));
      const legs=Array.from({length:count+1},(_,i)=>eligible.map(n=>leg(i===count?map.start:eligible[i].xyz,n,ability.speed)));
      const opens=eligible.map(n=>{const list=own(targets,mapId)&&own(targets[mapId],n.code)?targets[mapId][n.code]:[];return [...new Set(Array.isArray(list)?list.filter(x=>typeof x==='string'):[])];});
      const all=opens.flat(),overlaps=new Set(all).size!==all.length;
      // Outcomes depend on the stop set, not order. Only a faster order (or equal
      // time / lower range) can improve ranking, but every feasible order still
      // expands so future range/time tradeoffs are never pruned incorrectly.
      const bestSetOrder=new Map();
      const path=[],next=[0],masks=[0],sums=[{range:0,seconds:43200,xp:0,fuel:0,unlocks:0,salvagePoints:0,knownSalvageGil:0,unknownSalvageStops:0,collectionVisits:0,priorityVisits:0}];let depth=0;
      while(depth>=0){
        if(++attempted%12000===0){if(typeof options.onProgress==='function')options.onProgress(checked);await new Promise(resolve=>setTimeout(resolve,0));if(cancelled())return cancelledResult(checked);}
        const i=next[depth]++;if(i>=count){depth--;path.pop();continue;}if(masks[depth]&(1<<i))continue;
        const mask=masks[depth]|(1<<i);
        let missingMask=requiredMask&~mask,missingRequired=0;
        while(missingMask){missingMask&=missingMask-1;missingRequired++;}
        if(missingRequired>4-depth)continue;
        const step=legs[depth?path[depth-1]:count][i],prior=sums[depth],range=prior.range+step.travelRange+step.surveyRange,seconds=prior.seconds+step.travelSeconds+step.surveySeconds;
        if(range>ability.range||seconds>maxSeconds)continue;
        const xp=prior.xp+eligible[i].xp,fuel=prior.fuel+eligible[i].fuel;
        const gain=overlaps?opens[i].filter(t=>!path.some(j=>opens[j].includes(t))).length:opens[i].length;
        const unlocks=prior.unlocks+gain,salvagePoints=prior.salvagePoints+Number(earns[i]!==null),knownSalvageGil=prior.knownSalvageGil+(earns[i]??0),unknownSalvageStops=prior.unknownSalvageStops+Number(earns[i]===null),collectionVisits=prior.collectionVisits+collects[i],priorityVisits=prior.priorityVisits+priority[i];
        checked++;
        if(!missingRequired){
        const previousOrder=bestSetOrder.get(mask);
        const improvesOrder=!previousOrder||seconds<previousOrder[0]||(seconds===previousOrder[0]&&range<previousOrder[1]);
        if(improvesOrder)bestSetOrder.set(mask,[seconds,range]);
        if(improvesOrder){
        const route={map:mapId,mask,range,seconds,effectiveSeconds:effectiveCycle(seconds,cadenceHours),xp,fuel,unlocks,salvagePoints,knownSalvageGil,unknownSalvageStops,expectedSalvageGil:unknownSalvageStops?null:knownSalvageGil,collectionVisits,priorityVisits,requiredStopCount:requiredStops.length,requiredStops,xpRate:xp/seconds*3600};
        if(mode!=='collection'||collectionVisits>0){
          const qualifiesTop=top.length<limit||compareRoutes(route,top[top.length-1],mode,strategy)<0;
          const improves=Object.keys(leaders).filter(k=>!leaders[k]||compareRoutes(route,leaders[k],mode,k)<0);
          if(qualifiesTop||improves.length){
            route.nodes=[...path,i].map(j=>eligible[j].code);route.targets=[...new Set([...path,i].flatMap(j=>opens[j]))];route.favorReady=salvagePoints;
            route.expectedGil=route.expectedSalvageGil;
            route.salvageCoverage={complete:unknownSalvageStops===0,knownStops:[...path,i].filter(j=>earns[j]!==null).map(j=>eligible[j].code),unknownStops:[...path,i].filter(j=>earns[j]===null).map(j=>eligible[j].code)};
            if(qualifiesTop)insert(route);for(const k of improves)leaders[k]=route;
          }
        }
        }
        }
        if(depth<4){path.push(i);depth++;next[depth]=0;masks[depth]=mask;sums[depth]={range,seconds,xp,fuel,unlocks,salvagePoints,knownSalvageGil,unknownSalvageStops,collectionVisits,priorityVisits};}
      }
    }
    if(cancelled())return cancelledResult(checked);
    const decorate=(r,chosenStrategy)=>({...r,ranking:{mode,strategy:chosenStrategy,objective:objectiveLabels[mode],primary:r[priorities[mode][0]],timeMeaning:requiredStops.length?'滿足全部指定地點後，優先最短實際航時':'同主成果時才優先較短航時',collectionProxy:mode==='collection'},tradeoffs:top[0]?{xp:r.xp-top[0].xp,unlocks:r.unlocks-top[0].unlocks,seconds:r.seconds-top[0].seconds,effectiveSeconds:r.effectiveSeconds-top[0].effectiveSeconds,collectionVisits:r.collectionVisits-top[0].collectionVisits,priorityVisits:r.priorityVisits-top[0].priorityVisits,expectedSalvageGil:r.expectedSalvageGil!==null&&top[0].expectedSalvageGil!==null?r.expectedSalvageGil-top[0].expectedSalvageGil:null}:null,explanation:[objectiveLabels[mode]+'：'+r[priorities[mode][0]],...(requiredStops.length?['全部必訪：'+requiredStops.map(x=>x.code).join('、')+'；不代表保證開圖或掉落']:[]),'可爭取 '+r.unlocks+' 個不同地點；基礎經驗 '+r.xp,'航時 '+r.seconds+' 秒；作息有效週期 '+r.effectiveSeconds+' 秒',mode==='collection'?(requiredStops.length&&chosenStrategy==='time'?'來源訪問數不代表物品掉率；滿足必訪與來源資格後優先最短航時':'來源訪問數不代表物品掉率；同效果優先省時'):mode==='gil'?salvageEvidence.note:'開圖不保證成功；不自動更新遊戲進度']});
    const routes=top.map(r=>decorate(r,strategy)),seen=new Set(routes.map(r=>r.map+':'+r.mask)),alternatives=[];
    for(const [k,r] of Object.entries(leaders))if(r&&!seen.has(r.map+':'+r.mask)){alternatives.push(decorate(r,k));seen.add(r.map+':'+r.mask);}
    const warnings=[];
    if(mode==='gil')warnings.push(salvageEvidence.note+' 無資格或未覆蓋來源不參與金額排名，不表示收益為零。');
    if(mode==='collection')warnings.push('只比較已確認且達探查門檻的來源訪問數；掉率、數量與取得時間期望未知，不能稱為最佳掉率。');
    if(mode==='auto'&&priorityStops.length&&!routes.some(r=>r.priorityVisits))warnings.push(requiredStops.length?'目前限制內無法兼顧主線前置；所有指定地點仍是必訪條件，不會自動改成其他目的地。':'目前沒有可行的主線前置組合，改比較其他可行地點；未假設已開主線。');
    if(!routes.length)warnings.push(mode==='gil'?'目前沒有符合已核查成熟資格的 NPC 航線；可改開圖或練等，不套用成熟毛值。':mode==='collection'?'目前無合格收藏來源路線；可明示改用前置開圖或練等目標。':'目前限制內沒有可行航線，請核對已開圖、等級、配裝與時間上限。');
    const diagnostics=!routes.length&&requiredStops.length?requiredConstraintDiagnosis(ship,opened,requiredStops,maxSeconds,mode):null;
    const result={routes,alternatives,errors:diagnostics?diagnostics.errors:[],warnings,checked,attempted,coverage,objective:objectiveLabels[mode],fallback:(mode==='unlock'||mode==='auto')&&routes.length>0&&routes[0].unlocks===0,mode,strategy,ability,requiredStops,diagnostics};
    if(cache.size>12)cache.clear();cache.set(signature,result);return structuredCloneSafe(result);
  }
  function structuredCloneSafe(value){return JSON.parse(JSON.stringify(value));}
  function optimize(ship,mapId,codes,opened) {
    let best=null;const walk=(path,rest)=>{if(!rest.length){const r=calculate(ship,mapId,path,opened);if(r.valid&&(!best||r.seconds<best.seconds||(r.seconds===best.seconds&&r.range<best.range)))best=r;return;}
      rest.forEach((code,i)=>walk([...path,code],rest.filter((_,j)=>i!==j)));};
    if(Array.isArray(codes)&&codes.length&&codes.length<=5&&new Set(codes).size===codes.length)walk([],codes);
    return best;
  }
  root.SubVoyageEngine={stats,calculate,recommend,optimize,compareRoutes,efficiencyScore,effectiveCycle,data,salvage,salvageEvidence,npcEvidence};
})(typeof window==='undefined'?globalThis:window);
