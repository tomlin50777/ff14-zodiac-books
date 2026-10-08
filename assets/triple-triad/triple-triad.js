(() => {
  "use strict";

  const $ = s => document.querySelector(s);
  const POSITIONS = [1,2,3,4,5,6,7,8,9];
  const CARDS = {
    bomb:{name:"爆彈怪",short:"爆彈",sides:[3,4,3,3]},
    sabotender:{name:"仙人刺",short:"仙人刺",sides:[4,3,3,3]},
    dodo:{name:"渡渡鳥",short:"渡渡鳥",sides:[4,3,3,4]},
    coeurl:{name:"長鬚豹",short:"長鬚豹",sides:[2,5,2,5]},
    mandragora:{name:"曼德拉草",short:"曼德拉",sides:[4,2,5,3]},
    godbert:{name:"戈德伯特・曼德維爾",short:"曼德維爾",sides:[6,6,5,6]},
    bahamut:{name:"巴哈姆特",short:"巴哈",sides:[9,5,9,6]},
    urianger:{name:"于里昂熱",short:"于里昂熱",sides:[8,1,4,7]},
    hildibrand:{name:"希爾迪布蘭德＆納修",short:"調查員",sides:[1,8,10,8]},
    titan:{name:"泰坦",short:"泰坦",sides:[1,7,7,6]},
    gilgamesh:{name:"吉爾伽美什＆恩奇都",short:"吉爾伽美什",sides:[8,3,7,3]},
    yshtola:{name:"雅・修特拉",short:"雅修特拉",sides:[7,8,1,4]}
  };
  const PLAYER_DECK=["mandragora","coeurl","bomb","sabotender","dodo"];
  const NPC_POOL=["godbert","yshtola","urianger","gilgamesh","bahamut","hildibrand","titan"];

  // 55-row guide reconstructed from the saved strategy table. Ranges are 1-based and inclusive.
  const GUIDE=Array.from({length:55},(_,i)=>({id:i+1}));
  const put=(key,a,b,card,pos)=>{for(let i=a-1;i<b;i++)GUIDE[i][key]={card,pos}};
  put("p1",1,55,"bomb",1);
  put("o1",1,34,"godbert",4); put("o1",35,55,"godbert",2);
  put("p2",1,34,"sabotender",7); put("p2",35,55,"sabotender",8);
  put("o2",1,7,"yshtola",8); put("o2",8,13,"yshtola",9); put("o2",14,14,"urianger",8); put("o2",15,23,"urianger",9); put("o2",24,30,"gilgamesh",8); put("o2",31,34,"gilgamesh",9); put("o2",35,38,"yshtola",7); put("o2",39,40,"yshtola",9); put("o2",41,46,"urianger",6); put("o2",47,55,"urianger",9);
  put("p3",1,7,"dodo",5); put("p3",8,13,"mandragora",8); put("p3",14,14,"dodo",3); put("p3",15,23,"dodo",2); put("p3",24,26,"dodo",9); put("p3",27,30,"coeurl",9); put("p3",31,34,"dodo",2); put("p3",35,40,"mandragora",5); put("p3",41,46,"coeurl",7); put("p3",47,51,"dodo",3); put("p3",52,55,"mandragora",5);
  put("o3",1,1,"bahamut",2); put("o3",2,2,"bahamut",6); put("o3",3,3,"hildibrand",2); put("o3",4,4,"hildibrand",6); put("o3",5,6,"gilgamesh",6); put("o3",7,7,"gilgamesh",9); put("o3",8,8,"hildibrand",2); put("o3",9,9,"bahamut",5); put("o3",10,12,"bahamut",6); put("o3",13,14,"hildibrand",2); put("o3",15,17,"bahamut",3); put("o3",18,19,"bahamut",8); put("o3",20,22,"hildibrand",3); put("o3",23,23,"hildibrand",5); put("o3",24,24,"bahamut",5); put("o3",25,25,"bahamut",6); put("o3",26,27,"urianger",6); put("o3",28,28,"bahamut",5); put("o3",29,30,"bahamut",6); put("o3",31,32,"urianger",8); put("o3",33,34,"bahamut",8); put("o3",35,36,"bahamut",6); put("o3",37,38,"urianger",9); put("o3",39,39,"urianger",6); put("o3",40,40,"bahamut",6); put("o3",41,41,"bahamut",3); put("o3",42,43,"titan",4); put("o3",44,48,"hildibrand",4); put("o3",49,50,"bahamut",7); put("o3",51,52,"gilgamesh",6); put("o3",53,54,"bahamut",6); put("o3",55,55,"bahamut",7);
  const p4=[
    [1,1,"coeurl",6],[2,2,"mandragora",2],[3,3,"coeurl",6],[4,4,"mandragora",9],[5,5,"coeurl",3],[6,6,"coeurl",2],[7,7,"mandragora",6],[8,8,"coeurl",5],
    [10,13,"coeurl",5],[14,14,"mandragora",9],[15,17,"mandragora",8],[18,20,"coeurl",5],[21,22,"mandragora",8],[23,23,"coeurl",8],[24,24,"mandragora",6],[25,25,"coeurl",5],[26,27,"mandragora",5],[28,28,"mandragora",6],[29,30,"mandragora",5],[31,34,"coeurl",5],
    [35,35,"coeurl",3],[36,36,"mandragora",3],[37,37,"dodo",4],[38,38,"coeurl",3],[40,40,"coeurl",3],[41,48,"mandragora",5],[49,49,"coeurl",4],[50,50,"mandragora",5],[51,51,"coeurl",4],[52,52,"dodo",4],[53,53,"coeurl",8],[54,54,"dodo",4],[55,55,"mandragora",6]
  ]; p4.forEach(x=>put("p4",...x));
  const o4=[
    [1,3,"urianger",3],[4,5,"bahamut",2],[6,6,"bahamut",3],[7,7,"urianger",3],[8,8,"bahamut",6],
    [10,10,"urianger",2],[11,11,"titan",2],[12,12,"hildibrand",2],[13,13,"titan",5],[14,14,"titan",6],[15,15,"bahamut",5],[16,16,"titan",5],[17,17,"titan",6],[18,18,"hildibrand",3],[19,19,"hildibrand",6],[20,20,"bahamut",5],[21,21,"titan",5],[22,22,"titan",6],[23,23,"bahamut",3],[24,24,"titan",3],[25,26,"titan",2],[27,28,"titan",3],[29,29,"titan",2],[30,30,"titan",3],[31,31,"bahamut",3],[32,32,"urianger",6],[33,33,"bahamut",3],[34,34,"urianger",6],
    [35,35,"urianger",4],[36,36,"urianger",9],[37,37,"gilgamesh",6],[38,38,"bahamut",6],[40,40,"gilgamesh",7],[41,41,"bahamut",3],[42,42,"bahamut",9],[43,43,"yshtola",9],[44,44,"bahamut",3],[45,45,"bahamut",9],[46,46,"yshtola",9],[47,47,"gilgamesh",6],[48,48,"urianger",7],[49,49,"hildibrand",6],[50,50,"titan",6],[51,51,"bahamut",3],[52,52,"yshtola",7],[53,53,"bahamut",3],[54,54,"yshtola",7],[55,55,"titan",5]
  ]; o4.forEach(x=>put("o4",...x));
  const p5=[
    [1,1,"mandragora",9],[2,2,"coeurl",9],[3,3,"mandragora",9],[4,5,"coeurl",3],[6,6,"coeurl",2],[7,7,"coeurl",6],[8,8,"dodo",3],
    [10,13,"dodo",3],[14,14,"coeurl",5],[15,16,"coeurl",6],[17,17,"coeurl",5],[18,18,"coeurl",6],[19,19,"mandragora",3],[20,21,"coeurl",6],[22,22,"coeurl",5],[23,23,"mandragora",6],[24,24,"mandragora",2],[25,25,"mandragora",3],[26,26,"dodo",3],[27,28,"dodo",2],[29,29,"dodo",3],[30,30,"dodo",2],[31,31,"mandragora",6],[32,32,"mandragora",3],[33,33,"mandragora",6],[34,34,"mandragora",3],
    [35,35,"mandragora",9],[36,36,"mandragora",4],[37,38,"coeurl",3],[40,40,"dodo",4],[41,41,"dodo",9],[42,43,"dodo",3],[44,44,"mandragora",9],[45,45,"mandragora",3],[46,46,"dodo",3],[47,47,"coeurl",5],[48,48,"coeurl",6],[49,49,"mandragora",5],[50,50,"mandragora",4],[51,51,"coeurl",7],[52,52,"coeurl",3],[53,53,"coeurl",7],[54,54,"coeurl",3],[55,55,"mandragora",4]
  ]; p5.forEach(x=>put("p5",...x));

  // Exact row data extracted from the saved 55-scenario table. Empty cells and question marks use live calculation.
  const GUIDE_DATA=[["bomb@1","godbert@4","sabotender@7","yshtola@8","dodo@5","bahamut@2","coeurl@6","urianger@3","mandragora@9"],["bomb@1","godbert@4","sabotender@7","yshtola@8","dodo@5","bahamut@6","mandragora@2","urianger@3","coeurl@9"],["bomb@1","godbert@4","sabotender@7","yshtola@8","dodo@5","hildibrand@2","coeurl@6","urianger@3","mandragora@9"],["bomb@1","godbert@4","sabotender@7","yshtola@8","dodo@5","hildibrand@6","mandragora@9","bahamut@2","coeurl@3"],["bomb@1","godbert@4","sabotender@7","yshtola@8","dodo@5","gilgamesh@6","mandragora@9","bahamut@2","coeurl@3"],["bomb@1","godbert@4","sabotender@7","yshtola@8","dodo@5","gilgamesh@6","mandragora@9","bahamut@3","coeurl@2"],["bomb@1","godbert@4","sabotender@7","yshtola@8","dodo@5","gilgamesh@9","mandragora@2","urianger@3","coeurl@6"],["bomb@1","godbert@4","sabotender@7","yshtola@9","mandragora@8","hildibrand@2","coeurl@5","bahamut@6","dodo@3"],["bomb@1","godbert@4","sabotender@7","yshtola@9","mandragora@8","bahamut@5",null,null,null],["bomb@1","godbert@4","sabotender@7","yshtola@9","mandragora@8","bahamut@6","coeurl@5","urianger@2","dodo@3"],["bomb@1","godbert@4","sabotender@7","yshtola@9","mandragora@8","bahamut@6","coeurl@5","titan@2","dodo@3"],["bomb@1","godbert@4","sabotender@7","yshtola@9","mandragora@8","bahamut@6","coeurl@5","hildibrand@2","dodo@3"],["bomb@1","godbert@4","sabotender@7","urianger@8","dodo@3","hildibrand@2","mandragora@9","titan@5",null],["bomb@1","godbert@4","sabotender@7","urianger@8","dodo@3","hildibrand@2","mandragora@9","titan@6","coeurl@5"],["bomb@1","godbert@4","sabotender@7","urianger@9","dodo@2","bahamut@3","mandragora@8","bahamut@5","coeurl@6"],["bomb@1","godbert@4","sabotender@7","urianger@9","dodo@2","bahamut@3","mandragora@8","titan@5","coeurl@6"],["bomb@1","godbert@4","sabotender@7","urianger@9","dodo@2","bahamut@3","mandragora@8","titan@6","coeurl@5"],["bomb@1","godbert@4","sabotender@7","urianger@9","dodo@2","bahamut@8","coeurl@5","hildibrand@3","mandragora@6"],["bomb@1","godbert@4","sabotender@7","urianger@9","dodo@2","bahamut@8","coeurl@5","hildibrand@6","mandragora@3"],["bomb@1","godbert@4","sabotender@7","urianger@9","dodo@2","hildibrand@3","mandragora@8","bahamut@5","coeurl@6"],["bomb@1","godbert@4","sabotender@7","urianger@9","dodo@2","hildibrand@3","mandragora@8","titan@5","coeurl@6"],["bomb@1","godbert@4","sabotender@7","urianger@9","dodo@2","hildibrand@3","mandragora@8","titan@6","coeurl@5"],["bomb@1","godbert@4","sabotender@7","urianger@9","dodo@2","hildibrand@5","coeurl@8","bahamut@3","mandragora@6"],["bomb@1","godbert@4","sabotender@7","gilgamesh@8","dodo@9","bahamut@5","mandragora@6","titan@3","coeurl@2"],["bomb@1","godbert@4","sabotender@7","gilgamesh@8","dodo@9","bahamut@6","coeurl@5","titan@2","mandragora@3"],["bomb@1","godbert@4","sabotender@7","gilgamesh@8","coeurl@9","urianger@6","mandragora@5","titan@2","dodo@3"],["bomb@1","godbert@4","sabotender@7","gilgamesh@8","coeurl@9","urianger@6","mandragora@5","titan@3","dodo@2"],["bomb@1","godbert@4","sabotender@7","gilgamesh@8","coeurl@9","bahamut@5","mandragora@6","titan@3","dodo@2"],["bomb@1","godbert@4","sabotender@7","gilgamesh@8","coeurl@9","bahamut@6","mandragora@5","titan@2","dodo@3"],["bomb@1","godbert@4","sabotender@7","gilgamesh@8","coeurl@9","bahamut@6","mandragora@5","titan@3","dodo@2"],["bomb@1","godbert@4","sabotender@7","gilgamesh@9","dodo@2","urianger@8","coeurl@5","bahamut@3","mandragora@6"],["bomb@1","godbert@4","sabotender@7","gilgamesh@9","dodo@2","urianger@8","coeurl@5","urianger@6","mandragora@3"],["bomb@1","godbert@4","sabotender@7","gilgamesh@9","dodo@2","bahamut@8","coeurl@5","bahamut@3","mandragora@6"],["bomb@1","godbert@4","sabotender@7","gilgamesh@9","dodo@2","bahamut@8","coeurl@5","urianger@6","mandragora@3"],["bomb@1","godbert@2","sabotender@8","yshtola@7","mandragora@5","bahamut@6","coeurl@3","urianger@4","dodo@9"],["bomb@1","godbert@2","sabotender@8","yshtola@7","mandragora@5","bahamut@6","coeurl@3","urianger@9","dodo@4"],["bomb@1","godbert@2","sabotender@8","yshtola@7","mandragora@5","urianger@9","dodo@4","gilgamesh@6","coeurl@3"],["bomb@1","godbert@2","sabotender@8","yshtola@7","mandragora@5","urianger@9","dodo@4","bahamut@6","coeurl@3"],["bomb@1","godbert@2","sabotender@8","yshtola@9","mandragora@5","urianger@6",null,null,null],["bomb@1","godbert@2","sabotender@8","yshtola@9","mandragora@5","bahamut@6","coeurl@3","gilgamesh@7","dodo@4"],["bomb@1","godbert@2","sabotender@8","urianger@6","coeurl@7","titan@4","mandragora@5","bahamut@3","dodo@9"],["bomb@1","godbert@2","sabotender@8","urianger@6","coeurl@7","titan@4","mandragora@5","bahamut@9","dodo@3"],["bomb@1","godbert@2","sabotender@8","urianger@6","coeurl@7","titan@4","mandragora@5","yshtola@9","dodo@3"],["bomb@1","godbert@2","sabotender@8","urianger@6","coeurl@7","hildibrand@4","mandragora@5","bahamut@3","dodo@9"],["bomb@1","godbert@2","sabotender@8","urianger@6","coeurl@7","hildibrand@4","mandragora@5","bahamut@9","dodo@3"],["bomb@1","godbert@2","sabotender@8","urianger@6","coeurl@7","hildibrand@4","mandragora@5","yshtola@9","dodo@3"],["bomb@1","godbert@2","sabotender@8","urianger@9","dodo@3","hildibrand@4","mandragora@5","gilgamesh@6","coeurl@5"],["bomb@1","godbert@2","sabotender@8","urianger@9","dodo@3","hildibrand@4","mandragora@5","any@7","coeurl@6"],["bomb@1","godbert@2","sabotender@8","urianger@9","dodo@3","bahamut@7","coeurl@4","hildibrand@6","mandragora@5"],["bomb@1","godbert@2","sabotender@8","urianger@9","dodo@3","bahamut@7","mandragora@5","titan@6","coeurl@4"],["bomb@1","godbert@2","sabotender@8","urianger@9","mandragora@5","gilgamesh@6","dodo@4","bahamut@3","coeurl@7"],["bomb@1","godbert@2","sabotender@8","urianger@9","mandragora@5","gilgamesh@6","dodo@4","yshtola@7","coeurl@3"],["bomb@1","godbert@2","sabotender@8","urianger@9","mandragora@5","bahamut@6","dodo@4","bahamut@3","coeurl@7"],["bomb@1","godbert@2","sabotender@8","urianger@9","mandragora@5","bahamut@6","dodo@4","yshtola@7","coeurl@3"],["bomb@1","godbert@2","sabotender@8","gilgamesh@9","dodo@3","bahamut@7","mandragora@6","titan@5","coeurl@4"]];
  const GUIDE_KEYS=["p1","o1","p2","o2","p3","o3","p4","o4","p5"];
  GUIDE.forEach((row,i)=>{
    GUIDE_KEYS.forEach(key=>delete row[key]);
    GUIDE_DATA[i].forEach((value,j)=>{
      if(!value)return;
      const [card,pos]=value.split("@");
      row[GUIDE_KEYS[j]]={card,pos:+pos};
    });
  });
  // 原攻略表中以紅色標出的 4 條敗局；保留用來辨識 NPC 路線，但絕不拿來決定攻略方出牌。
  const LOSING_GUIDE_ROWS=new Set([9,13,37,39]);
  const safeGuideRows=rows=>rows.filter(row=>!LOSING_GUIDE_ROWS.has(row.id));

  const posToCoord=pos=>[Math.floor((pos-1)/3),(pos-1)%3];
  const coordToPos=(r,c)=>r*3+c+1;
  const DIRS=[[-1,0,0,2],[0,1,1,3],[1,0,2,0],[0,-1,3,1]];
  let state;
  let selected=null;
  let stats=JSON.parse(localStorage.getItem("ff14-tt-coach-stats-v2")||'{"win":0,"draw":0,"lose":0}');

  function cardMarkup(id,owner="blue"){
    const c=CARDS[id],v=n=>n===10?"A":n;
    return `<div class="triad-card ${owner}" data-card="${id}"><img class="card-art" src="assets/triple-triad/card-art/${id}.png" alt="" draggable="false"><span class="card-value top">${v(c.sides[0])}</span><span class="card-value right">${v(c.sides[1])}</span><span class="card-value bottom">${v(c.sides[2])}</span><span class="card-value left">${v(c.sides[3])}</span><span class="card-name">${c.short}</span></div>`;
  }

  function makeNpcHand(row){
    const hand=[row.o1,row.o2,row.o3,row.o4].filter(x=>x&&x.card!=="any").map(x=>x.card);
    const rest=NPC_POOL.filter(x=>!hand.includes(x));
    while(hand.length<5&&rest.length)hand.push(rest.splice(Math.floor(Math.random()*rest.length),1)[0]);
    while(hand.length<5)hand.push(NPC_POOL[Math.floor(Math.random()*NPC_POOL.length)]);
    return hand.slice(0,5);
  }

  function buildState(computerFirst=null){
    const redHand=[...NPC_POOL];
    return{board:new Map(),hands:{blue:[...PLAYER_DECK],red:[...redHand]},initialHands:{blue:[...PLAYER_DECK],red:[...redHand]},turn:computerFirst===null?null:(computerFirst?"blue":"red"),guide:computerFirst===true,candidates:[...GUIDE],history:[],over:false,started:computerFirst!==null,move:0,lastComputerMove:null};
  }

  function prepareGame(){
    state=buildState(null);
    selected=null;
    $("#matchMode").textContent="請選擇誰先攻";
    $("#branchLabel").textContent="55 種局面中已排除 4 條紅色敗局";
    $("#resultBanner").className="result-banner";
    $("#resultBanner").textContent="";
    $("#matchLog").innerHTML="";
    render();
  }

  function newGame(computerFirst){
    state=buildState(computerFirst);
    selected=null;
    $("#matchMode").textContent=computerFirst?"攻略方先攻 · 55 局面攻略":"NPC 先攻 · 即時計算";
    $("#branchLabel").textContent=computerFirst?"使用 51 條安全分支；紅色敗局不採用":"先手攻略不適用，電腦改用即時計算";
    $("#resultBanner").className="result-banner";
    $("#resultBanner").textContent="";
    $("#matchLog").innerHTML="";
    log(`新對局開始：${computerFirst?"攻略電腦":"你操作的 NPC"}先攻。`);
    render();
    if(state.turn==="blue")setTimeout(aiTurn,600);
  }

  function getNeighbor(board,pos,dir){
    const [r,c]=posToCoord(pos),[dr,dc]=DIRS[dir],nr=r+dr,nc=c+dc;
    if(nr<0||nr>2||nc<0||nc>2)return null;
    const np=coordToPos(nr,nc);return board.has(np)?{pos:np,item:board.get(np)}:null;
  }

  function resolve(board,pos,owner){
    const placed=board.get(pos),card=CARDS[placed.card],flipped=[],plusFlips=[];
    const adjacent=[];
    for(let d=0;d<4;d++){
      const n=getNeighbor(board,pos,d);if(!n)continue;
      adjacent.push({dir:d,...n,sum:card.sides[DIRS[d][2]]+CARDS[n.item.card].sides[DIRS[d][3]]});
    }
    const groups={};adjacent.forEach(x=>(groups[x.sum]??=[]).push(x));
    Object.values(groups).filter(g=>g.length>=2).flat().forEach(x=>{
      if(x.item.owner!==owner){x.item.owner=owner;flipped.push(x.pos);plusFlips.push(x.pos)}
    });
    adjacent.forEach(x=>{
      if(x.item.owner!==owner&&card.sides[DIRS[x.dir][2]]>CARDS[x.item.card].sides[DIRS[x.dir][3]]){x.item.owner=owner;flipped.push(x.pos)}
    });
    const queue=[...plusFlips],seen=new Set(queue);
    while(queue.length){
      const from=queue.shift(),source=board.get(from),sc=CARDS[source.card];
      for(let d=0;d<4;d++){
        const n=getNeighbor(board,from,d);if(!n||n.item.owner===owner)continue;
        if(sc.sides[DIRS[d][2]]>CARDS[n.item.card].sides[DIRS[d][3]]){
          n.item.owner=owner;flipped.push(n.pos);if(!seen.has(n.pos)){seen.add(n.pos);queue.push(n.pos)}
        }
      }
    }
    return{flipped:[...new Set(flipped)],plus:plusFlips.length>=1,combo:flipped.length>plusFlips.length};
  }

  function place(owner,card,pos,source="manual"){
    if(!state.started||state.over||state.turn!==owner||state.board.has(pos))return false;
    const hand=state.hands[owner],idx=hand.indexOf(card);if(idx<0)return false;
    if(owner==="blue")hand.splice(idx,1);
    state.board.set(pos,{card,owner});
    const result=resolve(state.board,pos,owner);state.move++;
    state.history.push({owner,card,pos});
    updateCandidates(owner,card,pos);
    if(owner==="blue")state.lastComputerMove={card,pos,guided:source==="guide",source};
    log(`${owner==="blue"?"攻略電腦":"你（NPC）"}：${CARDS[card].short} → ${pos}${result.plus?"，發動加算":""}${result.combo?"＋連攜":""}${result.flipped.length?`，翻 ${result.flipped.length} 張`:""}`);
    if(state.board.size===9){finish();return true}
    state.turn=owner==="blue"?"red":"blue";selected=null;render();
    return true;
  }

  function updateCandidates(owner,card,pos){
    if(!state.guide)return;
    const count=state.history.filter(x=>x.owner===owner).length,key=(owner==="blue"?"p":"o")+count;
    state.candidates=state.candidates.filter(row=>row[key]&&(row[key].card===card||row[key].card==="any")&&row[key].pos===pos);
  }

  function cloneBoard(board){return new Map([...board].map(([k,v])=>[k,{...v}]))}
  function legalMoves(owner){
    const cells=POSITIONS.filter(p=>!state.board.has(p)),moves=[];
    state.hands[owner].forEach(card=>cells.forEach(pos=>moves.push({card,pos})));
    return moves;
  }
  function scoreMoveFrom(sourceBoard,owner,move){
    const board=cloneBoard(sourceBoard);board.set(move.pos,{card:move.card,owner});
    const r=resolve(board,move.pos,owner);let mine=0,theirs=0;
    board.forEach(x=>x.owner===owner?mine++:theirs++);
    const [row,col]=posToCoord(move.pos),edge=(row===0||row===2?1:0)+(col===0||col===2?1:0);
    let exposure=0;const c=CARDS[move.card];
    if(row===0)exposure+=c.sides[0];if(row===2)exposure+=c.sides[2];if(col===0)exposure+=c.sides[3];if(col===2)exposure+=c.sides[1];
    const terminal=board.size===9?(mine-theirs)*500:0;
    return{board,score:(mine-theirs)*18+r.flipped.length*32+(r.plus?90:0)+(r.combo?50:0)+edge*4+exposure*.35+terminal};
  }
  function bestMove(owner){
    const foe=owner==="blue"?"red":"blue";
    return legalMoves(owner).map(move=>{
      const first=scoreMoveFrom(state.board,owner,move);
      const empty=POSITIONS.filter(pos=>!first.board.has(pos));
      let strongestReply=0;
      if(empty.length){
        strongestReply=Math.max(...state.hands[foe].flatMap(card=>empty.map(pos=>scoreMoveFrom(first.board,foe,{card,pos}).score)));
      }
      return{move,score:first.score-strongestReply*.72};
    }).sort((a,b)=>b.score-a.score)[0]?.move||null;
  }

  function guideMove(){
    if(!state.guide||!state.candidates.length)return null;
    const count=state.history.filter(x=>x.owner==="blue").length+1,key="p"+count;
    const options=safeGuideRows(state.candidates).map(row=>row[key]).filter(move=>move&&state.hands.blue.includes(move.card)&&!state.board.has(move.pos));
    if(!options.length)return null;
    const frequency=new Map();
    options.forEach(move=>{const k=`${move.card}@${move.pos}`;frequency.set(k,(frequency.get(k)||0)+1)});
    const chosen=[...frequency.entries()].sort((a,b)=>b[1]-a[1])[0][0];
    const [card,pos]=chosen.split("@");
    return{card,pos:+pos,guided:true};
  }

  function aiTurn(){
    if(!state.started||state.over||state.turn!=="blue")return;
    const avoidingLoss=state.guide&&state.candidates.length>0&&safeGuideRows(state.candidates).length===0;
    let move=guideMove(),source="guide";
    if(!move){move=bestMove("blue");source=avoidingLoss?"avoid":"live"}
    if(move)place("blue",move.card,move.pos,source);
  }

  function recommendation(){
    if(!state||!state.started||state.over||state.turn!=="blue")return null;
    const guided=guideMove();
    if(guided)return guided;
    const avoidingLoss=state.guide&&state.candidates.length>0&&safeGuideRows(state.candidates).length===0;
    const fallback=bestMove("blue");return fallback?{...fallback,guided:false,avoidingLoss}:null;
  }

  function handSlots(initial,current){
    const available={};current.forEach(id=>available[id]=(available[id]||0)+1);
    return initial.map(id=>{const active=(available[id]||0)>0;if(active)available[id]--;return{id,active}});
  }

  function render(){
    if(!state)return;
    const hint=recommendation();
    $("#triadBoard").innerHTML=POSITIONS.map(pos=>{
      const item=state.board.get(pos);return `<button class="board-cell ${hint&&hint.pos===pos?"recommended":""}" type="button" data-pos="${pos}" ${item||!state.started||state.over||state.turn!=="red"?"disabled":""}>${item?cardMarkup(item.card,item.owner):""}<span class="board-index">${pos}</span></button>`;
    }).join("");
    $("#computerHand").innerHTML=handSlots(state.initialHands.blue,state.hands.blue).map(({id,active})=>`<div class="computer-card ${active?"":"used"} ${hint&&hint.card===id?"next":""}">${cardMarkup(id,"blue")}</div>`).join("");
    $("#playerHand").innerHTML=handSlots(state.initialHands.red,state.hands.red).map(({id,active})=>`<button class="hand-card ${selected===id&&active?"selected":""} ${active?"":"used"}" type="button" data-hand-card="${id}" ${active&&state.started&&!state.over&&state.turn==="red"?"":"disabled"}>${cardMarkup(id,"red")}</button>`).join("");
    const blue=[...state.board.values()].filter(x=>x.owner==="blue").length+state.hands.blue.length;
    const redMoves=state.history.filter(x=>x.owner==="red").length;
    const red=[...state.board.values()].filter(x=>x.owner==="red").length+Math.max(0,5-redMoves);
    $("#blueScore").textContent=blue;$("#redScore").textContent=red;$("#turnCount").textContent=`第 ${state.move} / 9 手`;
    $("#turnNote").textContent=!state.started?"請先選擇誰先攻":state.over?"本局結束":state.turn==="red"?`輪到你操作 NPC · 攻略方 ${blue}:${red} NPC`:`攻略電腦出牌中 · 攻略方 ${blue}:${red} NPC`;
    const possible=state.candidates.length,safePossible=safeGuideRows(state.candidates).length;
    $("#branchCount").textContent=!state.started?"51 安全 / 55":state.guide?`${safePossible} 安全 / ${possible} 相符`:"即時計算";
    $("#branchBar").style.width=!state.started||!state.guide?"100%":`${Math.max(2,safePossible/51*100)}%`;
    if(state.started)$("#branchLabel").textContent=state.guide?(safePossible?`剩餘 ${safePossible} 條安全分支；紅色敗局已排除`:possible?`命中原表紅色敗局，已切換避敗計算`:`已偏離原表，改用即時計算`):"NPC 先攻，電腦使用即時計算";
    showRecommendation(hint);
    $("#triadBoard").querySelectorAll("[data-pos]").forEach(btn=>btn.onclick=()=>{if(!selected){log("請先選擇一張 NPC 手牌。");return}if(place("red",selected,+btn.dataset.pos))setTimeout(aiTurn,600)});
    $("#playerHand").querySelectorAll("[data-hand-card]").forEach(btn=>btn.onclick=()=>{if(!state.started||state.turn!=="red"||state.over)return;selected=btn.dataset.handCard;render()});
    updateStats();
  }

  function showRecommendation(hint=recommendation()){
    if(!state||!state.started){$("#advisorStep").textContent="尚未開始";$("#advisorMove").textContent="請先選擇誰先攻";$("#advisorReason").textContent="攻略方先攻可使用先前整理的 55 種局面表。";return}
    if(state.over){$("#advisorStep").textContent="本局已結束";$("#advisorMove").textContent="可選擇先攻開始下一局";$("#advisorReason").textContent="戰績已保存在此瀏覽器。";return}
    if(state.turn==="blue"&&hint){
      const step=state.history.filter(x=>x.owner==="blue").length+1;
      const mode=hint.avoidingLoss?"紅色敗局避讓":hint.guided?"55 局面表":"即時計算";
      $("#advisorStep").textContent=`攻略方第 ${step} 手 · ${mode}`;
      $("#advisorMove").textContent=`即將出：${CARDS[hint.card].short} → ${hint.pos} 號格`;
      $("#advisorReason").textContent=hint.avoidingLoss?"目前 NPC 回應只會通往原表紅色敗局，電腦將改走較安全的一手。":hint.guided?"電腦正在從非紅色的安全分支中選擇攻略。":"先攻或局面不在原表內，改用加算、翻牌數與邊角安全性計算。";
      return;
    }
    if(state.lastComputerMove){
      const move=state.lastComputerMove;
      const mode=move.source==="avoid"?"紅色敗局避讓":move.guided?"55 局面表":"即時計算";
      $("#advisorStep").textContent=`電腦剛才出牌 · ${mode}`;
      $("#advisorMove").textContent=`${CARDS[move.card].short} → ${move.pos} 號格`;
      $("#advisorReason").textContent=move.source==="avoid"?"目前 NPC 回應只會通往原表紅色敗局，電腦已停止照抄並改走較安全的一手。":"這就是玩家端要照抄的牌與位置；現在請操作幻卡王回應。";
      return;
    }
    $("#advisorStep").textContent="等待 NPC 第一手";$("#advisorMove").textContent="請操作一張幻卡王手牌";$("#advisorReason").textContent="NPC 落子後，電腦會自動計算玩家端的下一手。";
  }

  function finish(){
    state.over=true;
    const blue=[...state.board.values()].filter(x=>x.owner==="blue").length+state.hands.blue.length;
    const redMoves=state.history.filter(x=>x.owner==="red").length;
    const red=[...state.board.values()].filter(x=>x.owner==="red").length+Math.max(0,5-redMoves);
    let result,copy;
    if(blue>red){result="win";copy=`攻略方勝利 ${blue}：${red}`}
    else if(blue===red){result="draw";copy=`平手 ${blue}：${red}`}
    else{result="lose";copy=`攻略方敗北 ${blue}：${red}`}
    stats[result]++;localStorage.setItem("ff14-tt-coach-stats-v2",JSON.stringify(stats));
    const banner=$("#resultBanner");banner.className=`result-banner show ${result}`;banner.textContent=copy;
    log(`對局結束：${copy}。`);render();
  }

  function log(message){
    const p=document.createElement("p");p.innerHTML=message.replace(/^(你（NPC）|攻略電腦|新對局|對局結束)/,"<b>$1</b>");$("#matchLog").prepend(p);
  }
  function updateStats(){$("#matchStats").textContent=`${stats.win} 勝 · ${stats.draw} 和 · ${stats.lose} 敗`}

  $("#computerFirst").onclick=()=>newGame(true);
  $("#npcFirst").onclick=()=>newGame(false);
  $("#showHint").onclick=()=>showRecommendation();
  $("#clearStats").onclick=()=>{stats={win:0,draw:0,lose:0};localStorage.setItem("ff14-tt-coach-stats-v2",JSON.stringify(stats));updateStats()};
  updateStats();
  prepareGame();
})();
