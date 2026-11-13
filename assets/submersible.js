(function () {
  const key = window.SubState.KEY;
  const legacyKey = "ff14-submersible-fleet-v2";
  const parts = { "1": "鯊魚", "2": "甲鱟", "3": "鬚鯨", "4": "腔棘魚", "5": "希爾德拉" };
  const goals = { auto: "系統推薦", manual: "手動", unlock: "開圖", level: "練等", gil: "NPC收入", item: "家具收藏" };
  const colors = { blue: "#3268a8", green: "#4f8564", purple: "#7755a0", red: "#9a4c59", gold: "#ad7c2d" };
  const calculator = window.SubVoyageEngine;
  const px = (code, x, y) => ({ code, x, y });
  const maps = [
    { id: "deep", name: "溺沒海", range: "Rank 1～50", image: "assets/submersible/maps/deep-sea.png", size: [820,801], route: ["B","E","J","N","O","S","T","Y","Z","AA","AB","AD"], nodes: [
      px("A",528,707),px("B",472,598),px("C",607,560),px("D",332,687),px("E",536,492),px("F",694,684),px("G",226,609),px("H",111,677),px("I",319,531),px("J",733,483),px("K",429,445),px("L",226,457),px("M",89,506),px("N",654,444),px("O",517,396),px("P",234,281),px("Q",102,288),px("R",140,428),px("S",274,190),px("T",111,156),px("U",388,258),px("V",459,176),px("W",581,301),px("X",733,268),px("Y",191,75),px("Z",354,92),px("AA",674,175),px("AB",615,74),px("AC",731,88),px("AD",497,82)
    ]},
    { id: "ash", name: "灰海", range: "Rank 50～70", image: "assets/submersible/maps/sea-of-ash.png", size: [605,600], route: ["A","B","C","F","G","H","K","L","P","R"], nodes: [
      px("A",176,454),px("B",94,506),px("C",175,346),px("D",273,420),px("E",363,467),px("F",128,253),px("G",222,285),px("H",207,201),px("I",310,365),px("J",289,263),px("K",72,173),px("L",273,133),px("M",499,350),px("N",520,274),px("O",469,415),px("P",353,127),px("Q",443,529),px("R",486,77),px("S",413,176),px("T",106,91)
    ]},
    { id: "jade", name: "翠浪海", range: "Rank 70～90", image: "assets/submersible/maps/sea-of-jade.png", size: [600,599], route: ["A","C","E","G","J","M","R","T"], nodes: [
      px("A",123,278),px("B",148,424),px("C",163,174),px("D",63,118),px("E",285,65),px("F",136,66),px("G",408,152),px("H",412,55),px("I",500.5,113.5),px("J",431,239),px("K",518,56),px("L",533,183),px("M",399.5,385.5),px("N",378,482),px("O",562,115),px("P",290,536),px("Q",533,273),px("R",441,463),px("S",511,371),px("T",502,532)
    ]},
    { id: "siren", name: "妖歌海", range: "Rank 90～105", image: "assets/submersible/maps/sirensong-sea.png", size: [597,600], route: ["A","B","F","J","L","P","T"], nodes: [
      px("A",126,452),px("B",261,424),px("C",204,312),px("D",272,154),px("E",368,337),px("F",407,393),px("G",44,247),px("H",209,78),px("I",345.5,112.5),px("J",448,335),px("K",482,258),px("L",371,487),px("M",81,80),px("N",325,41),px("O",534.5,230.5),px("P",296,541),px("Q",528,74),px("R",407,179),px("S",551,393),px("T",428,537)
    ]},
    { id: "lilac", name: "紫礁海", range: "Rank 105～120", image: "assets/submersible/maps/lilac-sea.png", size: [600,600], route: ["A","B","F","J","L","Q","T"], nodes: [
      px("A",111,528),px("B",120,441),px("C",296,462),px("D",59,320),px("E",322,550),px("F",218,333),px("G",440,492),px("H",533,551),px("I",111,252),px("J",317,286),px("K",394,423),px("L",332,200),px("M",480,365),px("N",417,157),px("O",439,281),px("P",42,77),px("Q",208,204),px("R",542,221),px("S",478,45),px("T",295,57)
    ]},
    { id: "south", name: "南蒼茫洋", range: "Rank 120～130（7.2）", image: "assets/submersible/maps/south-indigo.png", size: [600,600], route: ["A","B","F","I","M"], future: ["N","O","P","Q","R","S","T"], nodes: [
      px("A",495,107),px("B",405,245),px("C",370,119),px("D",538,297),px("E",272,57),px("F",288,263),px("G",227,155),px("H",182,226),px("I",300,372),px("J",65,67),px("K",60,191),px("L",426,462),px("M",200,403),px("N",130,395),px("O",541,546),px("P",60,308),px("Q",282,492),px("R",126,466),px("S",306,553),px("T",60,547)
    ]},
    { id: "north", name: "北洋", range: "台服 7.2 尚未開放", image: "assets/submersible/maps/northern-empty.png", size: [600,600], route: [], locked: true, nodes: [] }
  ];


  // Unlock prerequisites and minimum visit ranks; sources linked in the page.
  // Recommended routes below are hints only, never availability rules.
  const unlockData = {
    deep: { parents: "- - A B B C D G E E I H H J N K P L O S S U N W T Y Z AA AA AB".split(" "), ranks: [1,1,4,4,7,7,10,14,17,20,20,24,27,27,30,30,34,37,37,40,40,44,44,47,47,50,50,50,50,50] },
    ash: { entry: ["deep","AD"], parents: "- A B C D C F G G I H K I J N L E P N K".split(" "), ranks: [50,50,54,54,57,57,60,60,60,60,60,63,63,65,65,65,66,67,69,70] },
    jade: { entry: ["ash","R"], parents: "- A A C C D E E G G I I J M L N L M Q R".split(" "), ranks: [70,70,70,72,72,73,74,75,75,75,76,78,80,81,83,85,87,88,89,90] },
    siren: { entry: ["jade","T"], parents: "- A A C B B C D H F J J H I K L N O O P".split(" "), ranks: [90,90,90,91,92,93,95,96,96,97,98,99,100,101,101,102,103,104,105,105] },
    lilac: { entry: ["siren","T"], parents: "- A A B C B C G D F G J K L M I L O N Q".split(" "), ranks: [105,105,105,106,107,108,110,111,112,113,114,115,115,116,117,118,119,119,120,120] },
    south: { entry: ["lilac","T"], parents: "- A A B C B C G F G H I I M L N L N Q R".split(" "), ranks: [120,120,120,121,122,123,125,126,127,128,129,130,130,131,132,133,134,134,135,135] }
  };
  maps.forEach(map => {
    const data = unlockData[map.id];
    if (!data) return;
    map.nodes.forEach((node, index) => {
      node.rank = data.ranks[index];
      node.parent = data.parents[index] === "-" ? (index === 0 && data.entry ? data.entry : null) : [map.id, data.parents[index]];
    });
  });

  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const freshVoyages = () => Array.from({ length: 4 }, () => ({ map: "", nodes: [] }));
  const freshLayers = () => ({ recommended: true, "ship-0": true, "ship-1": true, "ship-2": true, "ship-3": true });
  function defaultShips() {
    return [
      { enabled: false, rank: 1, build: "1111", goal: "auto", plannerGoal: "auto" },
      { enabled: false, rank: 1, build: "1111", goal: "auto", plannerGoal: "auto" },
      { enabled: false, rank: 1, build: "1111", goal: "auto", plannerGoal: "auto" },
      { enabled: false, rank: 1, build: "1111", goal: "auto", plannerGoal: "auto" }
    ];
  }
  function newWorkshop(index, source) {
    const base = {
      id: index === 1 ? "workshop-1" : "workshop-" + Date.now().toString(36) + "-" + index,
      name: index === 1 ? "主工房" : "工房 " + index,
      note: "",
      color: ["blue","green","purple","red","gold"][(index - 1) % 5],
      flagship: 0, ships: defaultShips(), map: "deep", opened: {}, visited: {}, selectedNode: "",
      activeVoyageShip: 0, voyages: freshVoyages(), sailings: [null,null,null,null], layers: freshLayers()
    };
    if (!source) return base;
    return window.SubState.sanitize(source,index,maps);
  }
  function defaultState() { const first = newWorkshop(1); return { selectedId: first.id, workshops: [first] }; }
  let storage;
  try { storage=window.localStorage; } catch (_) { storage={getItem(){throw Error('unavailable');},setItem(){throw Error('unavailable');}}; }
  const loaded = window.SubState.load(storage,maps,defaultState);
  const state = loaded.state;
  let deleteArmedId = "";
  let storageWarning = loaded.warning;
  function showStorageWarning() {
    let banner=document.getElementById('storage-status');
    if(!banner){banner=document.createElement('p');banner.id='storage-status';banner.setAttribute('role','status');document.querySelector('.voyage-main').prepend(banner);}
    banner.textContent=storageWarning;banner.hidden=!storageWarning;
  }
  function save() { try { storage.setItem(key, JSON.stringify(state)); } catch (error) { storageWarning='無法儲存：瀏覽器儲存空間不足或被停用。請匯出備份；重新載入會失去這次變更。'; } showStorageWarning(); }
  function isSailing(item=workshop(),index=item.activeVoyageShip){return Boolean(item.sailings?.[index]);}
  function canEditVoyage(){if(!isSailing())return true;notice('此船仍有出航紀錄。請先確認收船或取消紀錄，再修改航線。');return false;}
  function workshop() { return state.workshops.find(item => item.id === state.selectedId) || state.workshops[0]; }
  // Slot eligibility is derived from explicit visits, never merely discovered nodes.
  // Do not write inferred grants back: correcting a visit must remain reversible.
  function isSlotUnlocked(item,index) {
    if (!item || !Number.isInteger(index) || index < 0 || index > 3) return false;
    return index === 0 || item.slotUnlocked?.[index] === true || item.ships[index]?.enabled === true || item.visited?.deep?.[['','J','O','T'][index]] === true;
  }
  function shipSlotLabel(item,index) {
    if (item.ships[index].enabled) return 'R' + item.ships[index].rank + ' · ' + escapeHtml(item.ships[index].build);
    return isSlotUnlocked(item,index) ? '船位已開 · 待登記船隻' : '待探索 ' + ['','J','O','T'][index] + ' 開船位';
  }
  function colorOf(item) { return colors[item.color] || colors.blue; }
  function clampRank(value) { return Math.max(1, Math.min(130, parseInt(value, 10) || 1)); }
  function cleanBuild(value) { return String(value || "").replace(/[^1-5]/g, "").slice(0, 4).padEnd(4, "1"); }
  function recommendedBuild(rank) { if (rank >= 85) return "3124"; if (rank >= 50) return "1123"; if (rank >= 25) return "3113"; if (rank >= 15) return "1121"; return "1111"; }
  function milestone(rank) {
    if (rank < 7) return ["Rank 7", "繼續跑溺沒海 B，準備前往 E"];
    if (rank < 20) return ["Rank 20", "探索 J，解鎖第 2 艘潛水艇"];
    if (rank < 30) return ["Rank 30", "探索 O，解鎖第 3 艘潛水艇"];
    if (rank < 40) return ["Rank 40", "探索 T，解鎖第 4 艘潛水艇"];
    if (rank < 50) return ["Rank 50", "沿主線抵達 AD，開啟灰海"];
    if (rank < 67) return ["Rank 67", "灰海 R 是前往翠浪海的關鍵"];
    if (rank < 90) return ["Rank 90", "翠浪海 T 開啟妖歌海"];
    if (rank < 105) return ["Rank 105", "妖歌海 T 開啟紫礁海"];
    if (rank < 120) return ["Rank 120", "紫礁海 T 開啟南蒼茫洋"];
    if (rank < 130) return ["Rank 130", "台服 7.2 最後可探索南蒼茫洋 M"];
    return ["7.2 已達上限", "南蒼茫洋 N～T 與北洋需等待後續版本"];
  }
  function shipAdvice(ship) {
    if (!ship.enabled) return "尚未啟用；先完成對應欄位解鎖";
    if (ship.goal === "gil") return "使用「計算推薦」比較目前配裝可走的售店候選路線";
    if (ship.goal === "level") return "使用「計算推薦」比較目前配裝的基礎經驗／小時";
    if (ship.goal === "item") return "先決定目標素材，再依航程與探查門檻配船";
    return milestone(ship.rank)[1];
  }
  function validateFlagship(item) {
    if (!item.ships[item.flagship] || !item.ships[item.flagship].enabled) {
      const first = item.ships.findIndex(ship => ship.enabled);
      item.flagship = first >= 0 ? first : 0;
    }
  }
  function workshopStats(item) {
    validateFlagship(item);
    const active = item.ships.filter(ship => ship.enabled);
    const highest = active.length ? Math.max(...active.map(ship => ship.rank)) : 0;
    const opened = Object.values(item.opened || {}).reduce((sum, group) => sum + Object.values(group || {}).filter(Boolean).length, 0);
    return { active: active.length, highest, opened, next: !active.length ? ["尚未登記", "先確認已擁有的船隻、等級與配裝"] : active.length < 4 ? ["船位養成", "在航海圖查看 J／O／T 船位前置；發現地點不等於取得船位"] : ["分工規劃", "依已開地點與實際配裝，選擇開圖、NPC 飾物或家具收藏"] };
  }


  // v85: compact session-only navigation; saved fleet data is untouched.
  const collapsedWorkshops = new Set(state.workshops.map(item => item.id));
  let editorWorkshopId = "", editorShipIndex = 0, creatingWorkshop = false;
  let returnFocus = null;
  const shipPartsEditor = window.SubParts.createEditor(document, updateShipDraft);
  // Presentation-only state: a return estimate never collects a ship for the user.
  function shipStatus(item, index, now = Date.now()) {
    const ship = item.ships[index], sailing = item.sailings?.[index];
    if (sailing) return sailing.returnAt <= now
      ? { kind: "due", label: "可收船", detail: "預計已返航，仍需在遊戲收船後確認紀錄。" }
      : { kind: "sailing", label: "航行中", detail: "預計返航：" + new Date(sailing.returnAt).toLocaleString("zh-TW") };
    if (ship.enabled) return { kind: "ready", label: "可派遣", detail: "尚無出航紀錄；出航前仍需核對配裝、航線、燃料與耐久。" };
    return isSlotUnlocked(item,index)
      ? { kind: "empty", label: "待登記", detail: "船位已開，請依遊戲實況在船隻設定登記。" }
      : { kind: "locked", label: "未開啟", detail: shipSlotLabel(item,index) };
  }
  function statusTag(item,index) {
    const status=shipStatus(item,index);
    return '<small class="ship-status status-' + status.kind + '" data-ship-status="' + index + '" data-owner="' + escapeHtml(item.id) + '" title="' + escapeHtml(status.detail) + '">' + status.label + '</small>';
  }
  // Show one actionable workshop status, with no claim for incomplete fleets.
  function workshopStatus(item, now = Date.now()) {
    const statuses=item.ships.map((ship,index)=>shipStatus(item,index,now).kind);
    const status=statuses.includes('due') ? {kind:'due',label:'可收船'}
      : statuses.includes('ready') ? {kind:'ready',label:'有船可派遣'}
      : statuses.length===4 && statuses.every(kind=>kind==='sailing') ? {kind:'sailing',label:'皆在航行中'} : null;
    return status ? '<span class="status-'+status.kind+'">'+status.label+'</span>' : '';
  }
  function workshopStatusTag(item) {
    return '<small class="workshop-status" data-workshop-status="'+escapeHtml(item.id)+'" aria-label="工房船隻狀態">'+workshopStatus(item)+'</small>';
  }
  function shipTime(item,index,now = Date.now()) {
    const sailing=item.sailings?.[index];
    if(!sailing)return {label:'未出航',detail:'尚無出航時間紀錄。'};
    const detail='預計返航：'+new Date(sailing.returnAt).toLocaleString('zh-TW');
    if(sailing.returnAt<=now)return {label:'已到時',detail:detail+'；仍需確認收船。'};
    const minutes=Math.ceil((sailing.returnAt-now)/60000),hours=Math.floor(minutes/60),rest=minutes%60;
    return {label:'剩 '+(hours?hours+'時':'')+rest+'分',detail};
  }
  function shipTimeTag(item,index) {
    const time=shipTime(item,index);
    return '<span class="deck-time"><span class="deck-return" data-ship-time="'+index+'" data-owner="'+escapeHtml(item.id)+'" title="'+escapeHtml(time.detail)+'">時間：'+time.label+'</span>'+statusTag(item,index)+'</span>';
  }
  function refreshShipStatuses() {
    const now=Date.now();
    document.querySelectorAll('[data-ship-status]').forEach(tag=>{
      const item=state.workshops.find(w=>w.id===tag.dataset.owner),index=Number(tag.dataset.shipStatus);
      if(!item||!item.ships[index])return;
      const status=shipStatus(item,index,now);
      tag.className='ship-status status-'+status.kind;tag.textContent=status.label;tag.title=status.detail;
    });
    document.querySelectorAll('[data-workshop-status]').forEach(tag=>{
      const item=state.workshops.find(w=>w.id===tag.dataset.workshopStatus);
      if(item)tag.innerHTML=workshopStatus(item,now);
    });
    document.querySelectorAll('[data-ship-time]').forEach(tag=>{
      const item=state.workshops.find(w=>w.id===tag.dataset.owner),index=Number(tag.dataset.shipTime);
      if(!item||!item.ships[index])return;
      const time=shipTime(item,index,now);tag.textContent='時間：'+time.label;tag.title=time.detail;
    });
  }
  // Use the same saved plan as the map overlay and active-route controls.
  // Actual departure snapshots remain separate in the existing logbook.
  function displayedRoute(item,index) {
    return item.voyages[index]?.nodes.length ? item.voyages[index] : null;
  }
  function shipRouteLabel(item,index) {
    const route=displayedRoute(item,index);
    return route ? '計畫：'+(maps.find(map=>map.id===route.map)?.name||route.map)+' · '+route.nodes.join(' → ') : '計畫：尚未安排航程';
  }
  function shipBuildLabel(ship) {
    return ship.enabled ? [...ship.build].map((part,index)=>part+(ship.modified?.[index]?'+':'')).join('') : '配裝待登記';
  }
  function renderShipDeck() {
    const item=workshop();
    $('#selected-workshop-name').textContent=item.name;
    $('#voyage-ship-tabs').innerHTML=item.ships.map((ship,index)=>{
      const active=item.activeVoyageShip===index,route=shipRouteLabel(item,index),time=shipTime(item,index);
      const detailId='deck-ship-detail-'+index;
      const detail=route+'；'+time.detail+(item.flagship===index&&ship.enabled?'；工房旗艦':'');
      return '<div class="deck-ship'+(active?' selected':'')+'"><button type="button" class="deck-select" data-voyage-ship="'+index+'" aria-pressed="'+active+'" aria-describedby="'+detailId+'" title="'+escapeHtml(detail)+'"><span class="deck-ship-title"><b>'+(index+1)+' 號艇</b>'+(ship.enabled?'<small>R'+ship.rank+'</small>':'')+'</span><span class="deck-ship-summary">'+(ship.enabled?'<span class="deck-build" title="'+escapeHtml(shipBuildLabel(ship))+'">'+escapeHtml(shipBuildLabel(ship))+'</span><span class="deck-summary-dot" aria-hidden="true">·</span>':'')+statusTag(item,index)+'</span></button><span class="deck-accessible-detail" id="'+detailId+'">'+escapeHtml(route)+'；<span data-ship-time="'+index+'" data-owner="'+escapeHtml(item.id)+'" title="'+escapeHtml(time.detail)+'">時間：'+escapeHtml(time.label)+'</span>'+(item.flagship===index&&ship.enabled?'；工房旗艦':'')+'</span><button type="button" class="deck-settings" data-edit-ship="'+index+'" data-owner="'+escapeHtml(item.id)+'" aria-label="設定 '+escapeHtml(item.name)+' '+(index+1)+' 號艇" title="船隻設定">⚙</button></div>';
    }).join('');
  }
  let visibleFleetContext = "";
  function renderWorkshopNav() {
    const contextKey=state.selectedId+":"+workshop().activeVoyageShip;
    const contextChanged=contextKey!==visibleFleetContext;
    $("#workshop-tree").innerHTML = '<ul class="workshop-tree-list">' + state.workshops.map((item,workshopIndex) => {
      const collapsed = collapsedWorkshops.has(item.id);
      const active = item.id === state.selectedId;
      return '<li class="workshop-tree-branch' + (active ? ' current' : '') + '" style="--workshop-color:' + colorOf(item) + '"><div class="workshop-tree-row"><button class="tree-disclosure" type="button" data-toggle-workshop="' + escapeHtml(item.id) + '" aria-controls="workshop-ships-'+workshopIndex+'" aria-expanded="' + !collapsed + '" aria-label="' + (collapsed ? '展開 ' : '收合 ') + escapeHtml(item.name) + '">' + (collapsed ? '▸' : '▾') + '</button><button class="tree-workshop" type="button" data-select-workshop="' + escapeHtml(item.id) + '"' + (active ? ' aria-current="true"' : '') + ' title="' + escapeHtml(item.name + (item.note ? '\n' + item.note : '')) + '"><span class="tree-workshop-name">' + escapeHtml(item.name) + '</span>' + workshopStatusTag(item) + '</button><button class="workshop-settings" type="button" data-edit-workshop="'+escapeHtml(item.id)+'" aria-label="設定 '+escapeHtml(item.name)+'" title="工房設定">⚙</button></div><ul class="tree-ships" id="workshop-ships-'+workshopIndex+'"' + (collapsed ? ' hidden' : '') + '>' + item.ships.map((ship,index) => '<li><button type="button" class="tree-ship-select ' + (isSlotUnlocked(item,index) ? 'ship-slot-open' : 'ship-slot-pending') + '" data-slot-open="' + isSlotUnlocked(item,index) + '" data-select-ship="' + index + '" data-owner="' + escapeHtml(item.id) + '"' + (active && item.activeVoyageShip === index ? ' aria-current="true"' : '') + '><span class="compact-ship-heading"><b>' + (index + 1) + ' 號艇</b><small>' + (ship.enabled?'R'+ship.rank:'—') + '</small></span>'+statusTag(item,index)+'</button></li>').join('') + '</ul></li>';
    }).join('') + '</ul>';
    const allCollapsed=state.workshops.every(item=>collapsedWorkshops.has(item.id));
    $('#toggle-all-workshops').textContent=allCollapsed?'全部展開':'全部收合';
    $('#toggle-all-workshops').setAttribute('aria-expanded',String(!allCollapsed));
    if(contextChanged){
      visibleFleetContext=contextKey;
      // Fleet-status badges are appended later in the same render cycle.
      // Measure the final layout on the next frame, not the intermediate tree.
      const reveal=()=>{
        if(state.selectedId+":"+workshop().activeVoyageShip!==contextKey)return;
        const currentShip=$("#workshop-tree").querySelector('[data-select-ship][aria-current="true"]');
        const target=currentShip&&!currentShip.closest('[hidden]') ? currentShip : $("#workshop-tree").querySelector('[data-select-workshop][aria-current="true"]');
        if(target)for(const host of [$("#workshop-tree"),$("#fleet-manager")]){
          if(host.scrollHeight<=host.clientHeight||!/(auto|scroll)/.test(getComputedStyle(host).overflowY))continue;
          const box=host.getBoundingClientRect(),rect=target.getBoundingClientRect(),top=Math.max(0,box.top),bottom=Math.min(window.innerHeight,box.bottom);
          if(bottom<=top)break;
          if(rect.top<top+8)host.scrollTop+=rect.top-top-8;
          else if(rect.bottom>bottom-8)host.scrollTop+=rect.bottom-bottom+8;
          break;
        }
      };
      if(window.requestAnimationFrame)window.requestAnimationFrame(reveal);else setTimeout(reveal,0);
    }
  }
  function renderOverview() {
    $("#workshop-overview-grid").innerHTML = state.workshops.map(item => {
      const stats = workshopStats(item);
      return '<article class="workshop-overview-card" style="--workshop-color:' + colorOf(item) + '"><div class="overview-card-head"><div><h4>' + escapeHtml(item.name) + '</h4>' + (item.note ? '<p>' + escapeHtml(item.note) + '</p>' : '') + '</div><button type="button" data-open-workshop="' + escapeHtml(item.id) + '">進入工房 →</button></div><div class="overview-card-stats"><div><span>已啟用</span><b>' + stats.active + '／4</b></div><div><span>最高等級</span><b>' + (stats.highest ? "Rank " + stats.highest : "—") + '</b></div><div><span>已開節點</span><b>' + stats.opened + '</b></div></div><div class="overview-ships">' + item.ships.map((ship, i) => '<div class="overview-ship ' + (ship.enabled ? "" : "disabled") + '"><b>' + (i + 1) + ' 號艇</b><small>' + (ship.enabled ? "R" + ship.rank + " · " + escapeHtml(ship.build) : "未啟用") + '</small></div>').join("") + '</div><div class="overview-next"><b>目前重點：</b>' + escapeHtml(stats.next[1]) + '</div></article>';
    }).join("");
  }

  function renderFleet() {
    const item = workshop(); validateFlagship(item);
    renderCommand(); renderWorkshopNav(); save();
  }
  function renderAll() {
    if (state.selectedId === "overview") state.selectedId = state.workshops[0].id;
    renderFleet(); renderTabs(); renderMap(); save();
  }
  function selectWorkshop(id) {
    if (!state.workshops.some(item => item.id === id)) return;
    state.selectedId = id; notice(""); renderAll();
  }
  function selectShip(id,index) {
    const item=state.workshops.find(w=>w.id===id);
    if(!item||!Number.isInteger(index)||!item.ships[index])return;
    state.selectedId=id;item.activeVoyageShip=index;
    const route=displayedRoute(item,index);
    if(route&&maps.some(map=>map.id===route.map))item.map=route.map;
    item.selectedNode="";notice("");renderAll();
  }
  function showDialog(id, focusTarget) {
    returnFocus = focusTarget; $("#"+id).showModal();
  }
  function closeDialog(id) { $("#"+id).close(); }
  ["workshop-dialog","ship-dialog","overview-dialog"].forEach(id => {
    $("#"+id).addEventListener("close", () => {
      if (returnFocus) {
        const focus = document.querySelector(returnFocus) || $("#add-workshop");
        if (focus && focus.focus) focus.focus();
      }
    });
  });
  document.querySelectorAll("[data-close-dialog]").forEach(button => button.addEventListener("click", () => closeDialog(button.dataset.closeDialog)));
  function openWorkshopEditor(id, create) {
    creatingWorkshop = Boolean(create); editorWorkshopId = id || ""; deleteArmedId = "";
    const item = create ? newWorkshop(state.workshops.length + 1) : state.workshops.find(w => w.id === id);
    if (!item) return;
    if (!create) selectWorkshop(id);
    $("#workshop-dialog-title").textContent = create ? "新增工房" : item.name + " · 工房設定";
    $("#workshop-name").value = item.name; $("#workshop-note").value = item.note; $("#workshop-color").value = item.color;
    $("#delete-workshop").hidden = create; $("#delete-workshop").disabled = state.workshops.length <= 1;
    $("#delete-workshop").textContent = "刪除工房";
    $("#workshop-dialog-message").textContent = "儲存後才會更新；取消或 Esc 不會儲存修改。";
    showDialog("workshop-dialog",create ? "#add-workshop" : '[data-edit-workshop="' + id + '"]');
  }
  function openShipEditor(id,index) {
    const item = state.workshops.find(w => w.id === id);
    if (!item || !item.ships[index]) return;
    editorWorkshopId = id; editorShipIndex = index;
    const ship = item.ships[index];
    $("#ship-dialog-title").textContent = item.name + " · " + (index + 1) + " 號艇";
    $("#ship-enabled").checked = ship.enabled; $("#ship-rank").value = ship.rank;
    $("#ship-build").value = ship.build; $("#ship-goal").value = ship.plannerGoal || ship.goal || "auto";
    for(let i=0;i<4;i++)$("#ship-modified-"+i).checked=ship.modified?.[i]===true;
    $("#ship-flagship").checked = item.flagship === index && ship.enabled;
    $("#ship-dialog-message").textContent = "儲存後才會更新設定；取消不影響既有開圖與航程。";
    shipPartsEditor.reset();
    updateShipDraft();
    showDialog("ship-dialog",'[data-owner="' + id + '"][data-edit-ship="' + index + '"]');
  }
  function updateShipDraft() {
    const enabled = $("#ship-enabled").checked;
    $("#ship-flagship").disabled = !enabled;
    if (!enabled) $("#ship-flagship").checked = false;
    const reference = recommendedBuild(clampRank($("#ship-rank").value));
    $("#ship-recommend").textContent = "試填未改參考 " + reference + " / " + window.SubParts.parse(reference).letters + "（待儲存）";
    const draft = shipPartsEditor.syncFromInput();
    if (!draft.valid) { $("#ship-stats-preview").textContent = "請先完成上方四個部位，才能預覽能力。"; return; }
    const ability=calculator.stats({rank:Number($("#ship-rank").value),build:draft.build,modified:Array.from({length:4},(_,i)=>$("#ship-modified-"+i).checked)});
    $("#ship-stats-preview").textContent=ability.valid ? "探查 "+ability.surveillance+" · 收集 "+ability.retrieval+" · 速度 "+ability.speed+" · 航程 "+ability.range+" · 運氣 "+ability.favor+"｜容量 "+ability.cost+"／"+ability.capacity : ability.errors.join(" ");
  }
  $("#workshop-tree").addEventListener("click", event => {
    const toggle = event.target.closest("[data-toggle-workshop]");
    if (toggle) {
      const id = toggle.dataset.toggleWorkshop;
      if (collapsedWorkshops.has(id)) collapsedWorkshops.delete(id); else collapsedWorkshops.add(id);
      renderWorkshopNav();
      const target = document.querySelector('[data-toggle-workshop="' + id + '"]');
      if (target && target.focus) target.focus();
      return;
    }
    const ship = event.target.closest("[data-select-ship]");
    if (ship) {
      const id=ship.dataset.owner,index=Number(ship.dataset.selectShip);
      selectShip(id,index);
      $('#workshop-tree').querySelector('[data-owner="'+id+'"][data-select-ship="'+index+'"]').focus({preventScroll:true});
      return;
    }
    const settings=event.target.closest("[data-edit-workshop]");
    if(settings){openWorkshopEditor(settings.dataset.editWorkshop,false);return;}
    const group=event.target.closest("[data-select-workshop]");
    if(group){
      const id=group.dataset.selectWorkshop;selectWorkshop(id);
      $('#workshop-tree').querySelector('[data-select-workshop="'+id+'"]').focus({preventScroll:true});
    }
  });
  $('#toggle-all-workshops').addEventListener('click',()=>{
    if(state.workshops.every(item=>collapsedWorkshops.has(item.id)))collapsedWorkshops.clear();
    else state.workshops.forEach(item=>collapsedWorkshops.add(item.id));
    renderWorkshopNav();
  });
  $("#add-workshop").addEventListener("click",()=>openWorkshopEditor("",true));
  $("#show-overview").addEventListener("click",()=>{ renderOverview();showDialog("overview-dialog","#show-overview"); });
  $("#workshop-overview-grid").addEventListener("click",event=>{
    const button=event.target.closest("[data-open-workshop]");if(!button)return;
    closeDialog("overview-dialog");selectWorkshop(button.dataset.openWorkshop);
  });
  $("#workshop-form").addEventListener("submit",event=>{
    event.preventDefault();
    const name = $("#workshop-name").value.trim();
    if (!name) { $("#workshop-dialog-message").textContent = "請填寫工房名稱。"; return; }
    let item = creatingWorkshop ? newWorkshop(state.workshops.length+1) : state.workshops.find(w=>w.id===editorWorkshopId);
    if (!item) return;
    item.name=name;item.note=$("#workshop-note").value.trim();item.color=$("#workshop-color").value;
    if(creatingWorkshop)state.workshops.push(item);
    state.selectedId=item.id;if(creatingWorkshop)collapsedWorkshops.add(item.id);
    renderAll();closeDialog("workshop-dialog");
  });
  $("#delete-workshop").addEventListener("click",()=>{
    if (creatingWorkshop || state.workshops.length<=1) return;
    if (deleteArmedId!==editorWorkshopId) {
      deleteArmedId=editorWorkshopId;$("#delete-workshop").textContent="再次點擊確認刪除";
      $("#workshop-dialog-message").textContent="將刪除此工房、四艘船與開圖航程資料。若不刪除，請按取消。";return;
    }
    state.workshops=state.workshops.filter(w=>w.id!==editorWorkshopId);
    state.selectedId=state.workshops[0].id;deleteArmedId="";renderAll();closeDialog("workshop-dialog");
  });
  $("#ship-enabled").addEventListener("change",updateShipDraft);
  $("#ship-rank").addEventListener("input",updateShipDraft);
  $("#ship-build").addEventListener("input",updateShipDraft);
  for(let i=0;i<4;i++)$("#ship-modified-"+i).addEventListener("change",()=>{shipPartsEditor.modifiedChanged();updateShipDraft();});
  $("#ship-recommend").addEventListener("click",()=>{ $("#ship-build").value=recommendedBuild(clampRank($("#ship-rank").value)); for(let i=0;i<4;i++)$("#ship-modified-"+i).checked=false; updateShipDraft(); });
  $("#ship-form").addEventListener("submit",event=>{
    event.preventDefault();const item=state.workshops.find(w=>w.id===editorWorkshopId);if(!item)return;
    const rank=Number($("#ship-rank").value),draft=shipPartsEditor.syncFromInput(),build=draft.build;
    if(!Number.isInteger(rank)||rank<1||rank>130){
      $("#ship-dialog-message").textContent="等級需為 1～130 的整數。";return;
    }
    if(!draft.valid){$("#ship-dialog-message").textContent=draft.error;return;}
    const modified=Array.from({length:4},(_,i)=>$("#ship-modified-"+i).checked);
    const ability=calculator.stats({rank,build,modified});
    if($("#ship-enabled").checked&&!ability.valid){$("#ship-dialog-message").textContent=ability.errors.join(" ");return;}
    const ship=item.ships[editorShipIndex];ship.enabled=$("#ship-enabled").checked;ship.modified=modified;
    ship.rank=rank;ship.build=build;ship.goal=$("#ship-goal").value;ship.plannerGoal=ship.goal;
    if(ship.enabled&&$("#ship-flagship").checked)item.flagship=editorShipIndex;
    else if(item.flagship===editorShipIndex) {
      const other=item.ships.findIndex((s,i)=>s.enabled&&i!==editorShipIndex);
      if(other>=0)item.flagship=other;
    }
    state.selectedId=item.id;item.activeVoyageShip=editorShipIndex;
    validateFlagship(item);selectShip(item.id,editorShipIndex);closeDialog("ship-dialog");
  });
  function renderCommand() {
    const item = workshop(); const ship = item.ships[item.flagship]; const rec = recommendedBuild(ship.rank); const mark = milestone(ship.rank);
    let copy = "配置使用台服數字寫法；四碼依序為船體、船尾、船首、艦橋。";
    if (ship.rank <= 3 && ship.goal === "unlock") copy = "3 級時 C、D 即使顯示在遊戲內，也可能因最低等級不足而無法選取；這不是故障。";
    if (ship.goal === "gil" && ship.rank < 85) copy = "前期先開齊四艘並保持出航。太早換收益配置，通常只會拖慢整體成長。";
    $("#command-ship").textContent = item.name + " · " + (item.flagship + 1) + " 號艇 · Rank " + ship.rank; $("#command-action").textContent = shipAdvice(ship); $("#command-copy").textContent = copy; $("#command-build").textContent = rec; $("#command-build-copy").textContent = Object.keys(parts).map(number => number + "=" + parts[number]).join(" · "); $("#command-target").textContent = mark[0]; $("#command-target-copy").textContent = mark[1];
  }
  $("#apply-build").addEventListener("click", () => { const item = workshop();openShipEditor(item.id,item.flagship);$("#ship-build").value=recommendedBuild(item.ships[item.flagship].rank);for(let i=0;i<4;i++)$("#ship-modified-"+i).checked=false;updateShipDraft(); });

  const mapTabs = $("#map-tabs"); const mapImage = $("#sea-map-image"); const hotspotHost = $("#map-hotspots"); const routeOverlay = $("#route-overlay");
  function currentMap() { const item = workshop(); return maps.find(map => map.id === item.map) || maps[0]; }
  function isOpened(mapId, code) { const opened = workshop().opened; return Boolean(opened[mapId] && opened[mapId][code]); }
  function nextRouteNode(map) { return map.route.find(code => !isOpened(map.id, code)) || ""; }
  function nodeState(map, code) {
    if (map.locked || (map.future || []).includes(code)) return "locked";
    if (isOpened(map.id, code)) return "opened";
    const node = nodeByCode(map, code);
    return node && node.parent && isOpened(node.parent[0], node.parent[1]) ? "available" : "unopened";
  }
  function nodeByCode(map, code) { return map.nodes.find(node => node.code === code); }
  function renderTabs() { const item = workshop(); mapTabs.innerHTML = maps.map(map => '<button type="button" role="tab" data-map="' + map.id + '" aria-selected="' + (item.map === map.id) + '" class="' + (map.locked ? "locked" : "") + '">' + map.name + '</button>').join(""); }
  mapTabs.addEventListener("click", event => { const button = event.target.closest("[data-map]"); if (!button) return; const item = workshop(); item.map = button.dataset.map; item.selectedNode = ""; notice(""); renderTabs(); renderMap(); save(); });

  function renderLegend() {
    const item = workshop();
    document.querySelectorAll("[data-layer-toggle]").forEach(button => { const shown = item.layers[button.dataset.layerToggle] !== false; button.setAttribute("aria-pressed", String(shown)); });
    item.ships.forEach((ship, index) => { const label = $("#legend-ship-" + (index + 1)); label.textContent = ship.enabled ? "目前航程" : "尚未啟用"; label.closest("button").classList.toggle("dormant", !ship.enabled); });
  }
  document.querySelector(".status-legend").addEventListener("click", event => { const button = event.target.closest("[data-layer-toggle]"); if (!button) return; const item = workshop(); const layer = button.dataset.layerToggle; item.layers[layer] = item.layers[layer] === false; renderMap(); save(); });
  function routePoints(map, codes) { return codes.map(code => nodeByCode(map, code)).filter(Boolean).map(node => node.x + "," + node.y).join(" "); }
  function renderOverlay(map) {
    const item = workshop(); const [width, height] = map.size;
    routeOverlay.setAttribute("viewBox", "0 0 " + width + " " + height); routeOverlay.setAttribute("preserveAspectRatio", "none");
    const lines = [];
    const recommended=window.SubVoyageUI?.routeForMap(map.id)||[];
    if (item.layers.recommended !== false && recommended.length > 1) lines.push('<polyline class="route-path recommended-path" points="' + routePoints(map, recommended) + '"></polyline>');
    item.voyages.forEach((voyage, index) => { if (item.layers["ship-" + index] === false || voyage.map !== map.id || voyage.nodes.length < 2) return; lines.push('<polyline class="route-path ship-path ship-path-' + (index + 1) + '" points="' + routePoints(map, voyage.nodes) + '"></polyline>'); });
    routeOverlay.innerHTML = lines.join("");
  }
  function voyageBadges(mapId, code) {
    const item = workshop();
    return item.voyages.map((voyage, index) => voyage.map === mapId && voyage.nodes.includes(code) && item.layers["ship-" + index] !== false ? '<i class="node-ship-badge ship-badge-' + (index + 1) + '">' + (index + 1) + '</i>' : "").join("");
  }
  function renderMap() {
    const item = workshop(); const map = currentMap(); const [width, height] = map.size; const next = nextRouteNode(map);
    mapImage.src = map.image; mapImage.alt = map.name + "航海圖"; mapImage.parentElement.style.aspectRatio = width + " / " + height; mapImage.parentElement.style.setProperty("--map-aspect", String(width / height)); $("#map-version-lock").hidden = !map.locked;
    hotspotHost.innerHTML = map.nodes.map(node => {
      const stateName = nodeState(map, node.code); const selected = node.code === item.selectedNode; const recommended = item.layers.recommended !== false && (window.SubVoyageUI?.routeForMap(map.id)||[]).includes(node.code);
      const disabled = stateName === "locked";
      const label = stateName === "opened" ? "已開啟" : stateName === "available" ? "可開啟" : stateName === "unopened" ? "尚未登記" : "版本尚未開放";
      const action = "已開啟地點按 Enter 或空白鍵加入／移除航程；按向下鍵開啟進度登記";
      return '<button type="button" class="map-node ' + stateName + (selected ? " selected" : "") + (recommended ? " recommended" : "") + '" data-node="' + node.code + '" style="left:' + (node.x / width * 100).toFixed(3) + '%;top:' + (node.y / height * 100).toFixed(3) + '%" aria-label="' + map.name + " " + node.code + "，" + label + "，" + action + '"' + (disabled ? " disabled" : "") + '><span class="node-code">' + node.code + '</span><span class="node-ship-badges">' + voyageBadges(map.id, node.code) + '</span></button>';
    }).join("");
    const availableNodes = map.nodes.filter(node => !(map.future || []).includes(node.code)); const done = availableNodes.filter(node => isOpened(map.id, node.code)).length;
    $("#map-name").textContent = map.name; $("#map-count").textContent = done + "／" + availableNodes.length; $("#map-range").textContent = map.range; $("#map-progress").style.width = availableNodes.length ? (done / availableNodes.length * 100) + "%" : "0%";
    $("#route-chips").innerHTML = map.route.map(code => '<span class="route-chip ' + (isOpened(map.id, code) ? "done" : code === next ? "next" : "") + '">' + code + '</span>').join("");
    const available = map.nodes.filter(node => nodeState(map, node.code) === "available").map(node => node.code);
    $("#available-summary").textContent = available.length ? "目前可爭取開啟：" + available.join("、") + "（點選查看前置節點）" : "目前沒有可爭取開啟的節點；請先補登遊戲中已發現的地點。";
    $("#route-next").textContent = map.locked ? "等待台服後續版本開放。" : next ? "推薦主線下一站：" + next + "；僅供參考，不限制其他航程。" : "本海圖的 7.2 主線已完成。";
    renderOverlay(map); renderLegend(); renderVoyageEditor(); renderInspector(); renderWorkshopNav(); window.SubVoyageUI?.render(); window.SubLogbook?.render(); window.SubExplored?.render(); window.SubNodeUI?.render();
  }

  let mapNotice = "";
  let mapNoticeTimer;
  let resetMapArmed = "";
  function notice(message) {
    clearTimeout(mapNoticeTimer);
    mapNotice = message;
    const feedback = $("#map-feedback");
    feedback.textContent = message;
    feedback.hidden = !message;
    if (message) mapNoticeTimer = setTimeout(() => notice(""), 3000);
  }
  hotspotHost.addEventListener("click", event => {
    const node = event.target.closest("[data-node]");
    if (!node || node.disabled) return;
    workshop().selectedNode = node.dataset.node;
    window.SubNodeUI?.close(false);
    if (nodeState(currentMap(), node.dataset.node) === "opened") toggleVoyageNode();
    else window.SubNodeUI?.show({focus:true});
  });
  function renderVoyageEditor() {
    const item = workshop(); const index = item.activeVoyageShip; const voyage = item.voyages[index];
    renderShipDeck();
    const map = currentMap(); const select = $("#route-progress-select");
    const previous = select.value;
    select.innerHTML = map.nodes.filter(node => nodeState(map, node.code) !== "locked").map(node => '<option value="' + node.code + '">' + node.code + '</option>').join("");
    select.value = nodeByCode(map, previous) ? previous : (map.nodes[0]?.code || "");
    select.disabled = !map.nodes.length || map.locked; $("#complete-route").disabled = select.disabled;
    $("#map-feedback").textContent = mapNotice;
    $("#map-feedback").hidden = !mapNotice;
  }
  $("#voyage-ship-tabs").addEventListener("click", event => {
    const settings=event.target.closest('[data-edit-ship]');
    if(settings){openShipEditor(settings.dataset.owner,Number(settings.dataset.editShip));return;}
    const button=event.target.closest('[data-voyage-ship]');if(!button)return;
    const index=Number(button.dataset.voyageShip);selectShip(workshop().id,index);
    $('#voyage-ship-tabs').querySelector('[data-voyage-ship="'+index+'"]').focus({preventScroll:true});
  });
  function clearVoyage(expected) {
    const item=workshop(),index=item.activeVoyageShip;
    if(!expected||expected.item!==item||expected.index!==index||expected.sailing!==item.sailings[index]||expected.planSignature!==JSON.stringify([item.ships[index],item.voyages[index],item.opened]))return false;
    if(!canEditVoyage())return false;
    item.voyages[index]={map:"",nodes:[]};notice("");renderMap();save();return true;
  }
  function toggleProgressNode(code) {
    const item = workshop(); const map = currentMap(); const node = nodeByCode(map, code);
    if (!node || nodeState(map, code) === "locked") return;
    if (isOpened(map.id, code) && window.SubExplored) { window.SubExplored.removeOpened(map.id, [code]); return; }
    if (isOpened(map.id, code) && item.visited?.[map.id]?.[code]) { notice("探索紀錄功能尚未載入，請重新整理後再取消開啟登記，避免遺失探索紀錄。"); return; }
    item.opened[map.id] = item.opened[map.id] || {};
    item.opened[map.id][code] = !isOpened(map.id, code);
    notice(isOpened(map.id, code) ? "" : "開啟登記已取消；既有航程保留，請核對。");
    renderMap(); save();
  }
  // Compare permutations of the selected set only; never infer prerequisite stops.
  function optimizeCurrentVoyage() {
    const item=workshop(),index=item.activeVoyageShip,voyage=item.voyages[index];
    if(isSailing(item,index)||!voyage.nodes.length)return "";
    const best=calculator.optimize(item.ships[index],voyage.map,voyage.nodes,item.opened);
    if(best){voyage.nodes=[...best.nodes];return "";}
    return "其餘站點已保留；目前條件無可行順序，請核對航程。";
  }
  function voyageAction() {
    const item=workshop(),map=currentMap(),node=nodeByCode(map,item.selectedNode);
    if(!node)return {disabled:true,label:"請先選擇節點",reason:""};
    if(isSailing())return {disabled:true,label:"出航中，航線唯讀",reason:"請先確認收船或取消出航紀錄。"};
    const status=nodeState(map,node.code);
    if(status!=="opened")return {disabled:true,label:status==="locked"?"此節點尚未開放":"尚未登記開啟",reason:status==="locked"?"台服 7.2 版本限制。":"請依遊戲實況登記已開啟；不會自動加入前置地點。"};
    const ship=item.ships[item.activeVoyageShip],voyage=item.voyages[item.activeVoyageShip];
    const base={targetMap:map,targetNode:node};
    if(voyage.map===map.id&&voyage.nodes.includes(node.code))return {...base,disabled:false,remove:true,label:"從航程移除 "+node.code,reason:"移除後重排其餘站點。"};
    let reason="";
    if(!ship.enabled)reason="請先啟用 "+(item.activeVoyageShip+1)+" 號艇。";
    else if(ship.rank<node.rank)reason="前往 "+node.code+" 需要 Rank "+node.rank+"；此艇目前 Rank "+ship.rank+"。";
    else if(voyage.nodes.length&&voyage.map!==map.id)reason="這艘船已有其他海域航程；請先清除原航程，再安排新海域。";
    else if(voyage.nodes.length>=5)reason="航程最多 5 站，請先移除一站。";
    if(reason)return {...base,disabled:true,label:"無法加入 "+node.code,reason};
    const codes=[...voyage.nodes,node.code],best=calculator.optimize(ship,map.id,codes,item.opened);
    if(!best){const check=calculator.calculate(ship,map.id,codes,item.opened);return {...base,disabled:true,label:"無法加入 "+node.code,reason:check.errors.join(" ")+" 已比較所有順序，仍無可行航線。"};}
    return {...base,disabled:false,label:"加入 "+node.code,reorderedNodes:best.nodes,reason:"加入後依最短航時排序，最多 5 站。"};
  }
  function toggleVoyageNode() {
    const plan=voyageAction();
    if(plan.disabled){notice(plan.reason||plan.label);window.SubNodeUI?.render();return false;}
    const item=workshop(),voyage=item.voyages[item.activeVoyageShip],code=plan.targetNode.code;
    if(plan.remove){voyage.nodes=voyage.nodes.filter(c=>c!==code);notice(optimizeCurrentVoyage());}
    else {voyage.map=plan.targetMap.id;voyage.nodes=[...plan.reorderedNodes];notice("");}
    renderMap();save();
    // Rendering replaces node buttons; preserve keyboard position after a toggle.
    hotspotHost.querySelector('[data-node="'+code+'"]')?.focus({preventScroll:true});
    return true;
  }
  function renderInspector() {
    const item = workshop(); const map = currentMap(); const node = nodeByCode(map, item.selectedNode);
    const register = $("#node-register"); const action = $("#node-action");
    if (!node) {
      $("#node-title").textContent = "請先點選海圖節點";
      $("#node-copy").textContent = "點選只查看，不會變更資料。登記與航程操作都在這裡。";
      register.disabled = true; register.textContent = "登記為已開啟";
    } else {
      const status = nodeState(map, node.code);
      const parentMap = node.parent && maps.find(m => m.id === node.parent[0]);
      const parentLabel = node.parent ? parentMap.name + " " + node.parent[1] : "";
      $("#node-title").textContent = map.name + " " + node.code + " · Rank " + node.rank;
      $("#node-copy").textContent = status === "opened" ? "已開啟（已發現）。可安排直接前往此節點；探索紀錄另行登記。" : status === "available" ? "＋ 可開啟：尚未發現。前往 " + parentLabel + " 探索，爭取發現此地點。" : status === "locked" ? "台服 7.2 尚未開放。" : parentLabel ? "未開啟；前置節點 " + parentLabel + " 尚未登記。若遊戲已發現此地點，可直接補登。" : "初始地點；請依遊戲內進度登記。";
      register.disabled = status === "locked";
      register.textContent = status === "opened" ? "取消 " + node.code + " 的開啟登記" : "我已在遊戲發現 " + node.code + "，登記已開啟";
    }
    const plan = voyageAction();
    action.disabled = plan.disabled; action.textContent = plan.label;
    $("#node-voyage-help").textContent = plan.reason;
  }
  $("#node-register").addEventListener("click", () => toggleProgressNode(workshop().selectedNode));
  $("#node-action").addEventListener("click", toggleVoyageNode);
  $("#reset-map").addEventListener("click", () => {
    if (window.SubExplored) { window.SubExplored.resetMap(workshop().map); return; }
    if (Object.values(workshop().visited?.[workshop().map] || {}).some(Boolean)) { notice("探索紀錄功能尚未載入，請重新整理後再清除，避免遺失探索紀錄。"); return; }
    const item = workshop(); const id = item.id + ":" + item.map;
    if (resetMapArmed !== id) { resetMapArmed = id; $("#reset-map").textContent = "再次點擊確認清除本海圖登記"; return; }
    item.opened[item.map] = {}; item.selectedNode = ""; resetMapArmed = "";
    $("#reset-map").textContent = "清除本海圖的開圖登記";
    notice(""); renderMap(); save();
  });
  $("#complete-route").addEventListener("click", () => {
    const item = workshop(); let map = currentMap(); let node = nodeByCode(map, $("#route-progress-select").value);
    if (!node || nodeState(map, node.code) === "locked") return;
    const endpoint = map.name + " " + node.code; const seen = new Set();
    while (node && !seen.has(map.id + ":" + node.code)) {
      seen.add(map.id + ":" + node.code);
      item.opened[map.id] = item.opened[map.id] || {}; item.opened[map.id][node.code] = true;
      if (!node.parent) break;
      map = maps.find(m => m.id === node.parent[0]); node = nodeByCode(map, node.parent[1]);
    }
    notice(""); renderMap(); save();
  });

  const backupButton=document.createElement('button');backupButton.type='button';backupButton.id='export-local-backup';backupButton.className='tree-overview';backupButton.textContent='匯出本機備份';
  $('#workshop-actions').append(backupButton);
  backupButton.addEventListener('click',()=>{
    const preserved={};
    for(const original of [window.SubState.OLD,window.SubState.LEGACY,key+'-original-'+window.SubState.OLD,key+'-original-'+window.SubState.LEGACY,key+'-damaged-'+key]){try{const raw=storage.getItem(original);if(raw)preserved[original]=raw;}catch(_){}}
    const blob=new Blob([JSON.stringify({format:'ff14-submersible-backup-v47',exportedAt:new Date().toISOString(),...state,preserved},null,2)],{type:'application/json'});
    const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download='ff14-submersible-backup-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  window.SubFleet={state,maps,isSailing,isSlotUnlocked,refreshShipStatuses,workshop,currentMap,isOpened,nodeState,renderMap,renderAll,save,notice,openShipEditor,voyageAction,renderInspector,canEditVoyage,toggleVoyageNode,optimizeCurrentVoyage,clearVoyage};
  renderAll();
})();
