import { useState, useCallback, useEffect } from "react";
import { useApp } from "../context/AppContext";

// ─── Card utilities ────────────────────────────────────────────────────────────
type Suit = "♠"|"♥"|"♦"|"♣";
type CardRank = "A"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"J"|"Q"|"K";
interface Card { rank: CardRank; suit: Suit; faceUp?: boolean }

const SUITS: Suit[] = ["♠","♥","♦","♣"];
const RANKS: CardRank[] = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const RED_SUITS: Suit[] = ["♥","♦"];
const isRed=(card:Card)=>RED_SUITS.includes(card.suit);

function makeDeck(): Card[] {
  const deck: Card[]=[];
  for(const suit of SUITS) for(const rank of RANKS) deck.push({rank,suit,faceUp:false});
  return deck;
}

function shuffle(deck: Card[]): Card[] {
  const d=[...deck];
  for(let i=d.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [d[i],d[j]]=[d[j],d[i]];
  }
  return d;
}

function cardValue(rank: CardRank): number {
  if(["J","Q","K"].includes(rank)) return 10;
  if(rank==="A") return 11;
  return parseInt(rank);
}

function handTotal(cards: Card[]): number {
  let total=0, aces=0;
  for(const c of cards){ total+=cardValue(c.rank); if(c.rank==="A") aces++; }
  while(total>21&&aces>0){ total-=10; aces--; }
  return total;
}

// ─── Card rendering ────────────────────────────────────────────────────────────
function CardFace({ card, selected, onClick, small }: { card:Card; selected?:boolean; onClick?:()=>void; small?:boolean }) {
  const red=isRed(card);
  const W=small?44:64, H=small?64:92;
  return (
    <div onClick={onClick}
      style={{
        width:W, height:H, borderRadius:6, cursor:onClick?"pointer":"default",
        background: card.faceUp===false ? "linear-gradient(135deg,#0a2a0a,#071507)" : "#f8f8f0",
        border: selected?`2px solid #00FF00`:`1px solid ${card.faceUp===false?"#1a5a1a":"#aaa"}`,
        boxShadow: selected?"0 0 10px #00FF00, 0 0 20px #00FF00":card.faceUp===false?"0 0 4px rgba(0,255,0,0.2)":"0 2px 4px rgba(0,0,0,0.5)",
        display:"flex", flexDirection:"column", justifyContent:"space-between",
        padding: small?3:5, position:"relative", transition:"transform 0.1s, box-shadow 0.1s",
        transform: selected?"translateY(-8px)":"none", flexShrink:0,
      }}>
      {card.faceUp===false ? (
        <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center",
          backgroundImage:"repeating-linear-gradient(45deg,rgba(0,255,0,0.04) 0,rgba(0,255,0,0.04) 2px,transparent 0,transparent 50%)",
          backgroundSize:"8px 8px", borderRadius:4 }}>
          <span style={{fontSize:small?14:20, color:"rgba(0,255,0,0.3)"}}>✦</span>
        </div>
      ) : (
        <>
          <div style={{ fontSize:small?9:11, fontWeight:"bold", color:red?"#cc0000":"#111", lineHeight:1, fontFamily:"monospace" }}>
            {card.rank}<br/>{card.suit}
          </div>
          <div style={{ fontSize:small?18:28, textAlign:"center", color:red?"#cc0000":"#111", lineHeight:1 }}>
            {card.suit}
          </div>
          <div style={{ fontSize:small?9:11, fontWeight:"bold", color:red?"#cc0000":"#111", lineHeight:1, transform:"rotate(180deg)", fontFamily:"monospace" }}>
            {card.rank}<br/>{card.suit}
          </div>
        </>
      )}
    </div>
  );
}

function EmptySlot({ small }: { small?:boolean }) {
  return (
    <div style={{
      width:small?44:64, height:small?64:92, borderRadius:6, flexShrink:0,
      border:"1px dashed rgba(0,255,0,0.2)", background:"rgba(0,255,0,0.02)",
    }}/>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLACKJACK
// ═══════════════════════════════════════════════════════════════════════════════
type BJPhase = "bet"|"play"|"result";

function Blackjack() {
  const {t,settings}=useApp();
  const tc=settings.theme==="amber"?"#FFC000":settings.theme==="blue"?"#00CCFF":settings.theme==="red"?"#FF4444":"#00FF00";
  const [deck,setDeck]=useState<Card[]>(shuffle(makeDeck()));
  const [player,setPlayer]=useState<Card[]>([]);
  const [dealer,setDealer]=useState<Card[]>([]);
  const [phase,setPhase]=useState<BJPhase>("bet");
  const [balance,setBalance]=useState(500);
  const [bet,setBet]=useState(25);
  const [message,setMessage]=useState("");

  const freshDeck=()=>{ const d=shuffle([...makeDeck(),...makeDeck()]); return d; }

  const deal=useCallback(()=>{
    if(bet>balance) return;
    let d=deck.length<10?freshDeck():[...deck];
    const p1={...d.shift()!,faceUp:true};
    const d1={...d.shift()!,faceUp:true};
    const p2={...d.shift()!,faceUp:true};
    const d2={...d.shift()!,faceUp:false};
    setDeck(d);
    const p=[p1,p2];
    const dl=[d1,d2];
    setPlayer(p);
    setDealer(dl);
    setBalance(b=>b-bet);
    if(handTotal(p)===21){
      const dealerFull=[{...dl[0],faceUp:true},{...dl[1],faceUp:true}];
      setDealer(dealerFull);
      if(handTotal(dealerFull)===21){ setMessage(t("bj.push")); setBalance(b=>b+bet); }
      else { setMessage(t("bj.blackjack")); setBalance(b=>b+Math.floor(bet*2.5)); }
      setPhase("result");
    } else {
      setMessage("");
      setPhase("play");
    }
  },[deck,bet,balance,t]);

  const hit=useCallback(()=>{
    let d=[...deck];
    const card={...d.shift()!,faceUp:true};
    const np=[...player,card];
    setDeck(d);
    setPlayer(np);
    if(handTotal(np)>21){ resolve(np,dealer); }
  },[deck,player,dealer]);

  const stand=useCallback(()=>{ resolve(player,dealer); },[player,dealer]);

  const resolve=(p:Card[],dl:Card[])=>{
    let d=deck;
    let dealerCards=[{...dl[0],faceUp:true},{...dl[1],faceUp:true}];
    while(handTotal(dealerCards)<17){
      if(!d.length) d=freshDeck();
      dealerCards=[...dealerCards,{...d.shift()!,faceUp:true}];
    }
    setDeck(d);
    setDealer(dealerCards);
    const pt=handTotal(p), dt=handTotal(dealerCards);
    if(pt>21){ setMessage(t("bj.bust")+" — "+t("bj.lose")); }
    else if(dt>21||pt>dt){ setMessage(t("bj.win")); setBalance(b=>b+bet*2); }
    else if(pt===dt){ setMessage(t("bj.push")); setBalance(b=>b+bet); }
    else { setMessage(t("bj.lose")); }
    setPhase("result");
  };

  const dbl=useCallback(()=>{
    if(bet>balance) return;
    setBalance(b=>b-bet);
    const extraBet=bet;
    let d=[...deck];
    const card={...d.shift()!,faceUp:true};
    const np=[...player,card];
    setDeck(d);
    setPlayer(np);
    let dealerCards=[{...dealer[0],faceUp:true},{...dealer[1],faceUp:true}];
    while(handTotal(dealerCards)<17){
      if(!d.length) d=freshDeck();
      dealerCards=[...dealerCards,{...d.shift()!,faceUp:true}];
    }
    setDeck(d);
    setDealer(dealerCards);
    const pt=handTotal(np), dt=handTotal(dealerCards);
    const totalBet=bet+extraBet;
    if(pt>21){ setMessage(t("bj.bust")+" — "+t("bj.lose")); }
    else if(dt>21||pt>dt){ setMessage(t("bj.win")); setBalance(b=>b+totalBet*2); }
    else if(pt===dt){ setMessage(t("bj.push")); setBalance(b=>b+totalBet); }
    else { setMessage(t("bj.lose")); }
    setPhase("result");
  },[deck,player,dealer,bet,balance,t]);

  const playerTotal=handTotal(player);
  const dealerTotal=phase==="result"?handTotal(dealer):handTotal(dealer.filter(c=>c.faceUp));

  return (
    <div className="flex flex-col items-center gap-4 p-4 w-full max-w-lg mx-auto">
      <div style={{color:tc}} className="text-lg font-mono font-bold glow">{t("cards.blackjack")}</div>

      <div className="flex gap-4 text-sm font-mono">
        <span style={{color:`${tc}aa`}}>{t("bj.balance")} <span style={{color:tc}}>${balance}</span></span>
        <span style={{color:`${tc}aa`}}>{t("bj.bet")} <span style={{color:tc}}>${bet}</span></span>
      </div>

      {/* Dealer */}
      <div className="w-full">
        <div className="text-xs mb-2" style={{color:`${tc}88`}}>{t("bj.dealer")} {phase==="result"?`(${dealerTotal})`:`(?)`}</div>
        <div className="flex gap-2 flex-wrap">{dealer.map((c,i)=><CardFace key={i} card={c}/>)}</div>
      </div>

      {/* Player */}
      <div className="w-full">
        <div className="text-xs mb-2" style={{color:`${tc}88`}}>{t("bj.player")} ({playerTotal}){playerTotal>21?` — ${t("bj.bust")}!`:""}</div>
        <div className="flex gap-2 flex-wrap">{player.map((c,i)=><CardFace key={i} card={{...c,faceUp:true}}/>)}</div>
      </div>

      {/* Message */}
      {message&&<div className="text-lg font-mono glow" style={{color:message.includes(t("bj.win"))||message.includes(t("bj.blackjack"))?"#00FF00":"#FF4444"}}>{message}</div>}

      {/* Controls */}
      <div className="flex gap-2 flex-wrap justify-center">
        {phase==="bet"&&(
          <>
            {[10,25,50,100].map(v=>(
              <button key={v} className="pipboy-btn text-xs py-1 px-2" style={{background:bet===v?`${tc}22`:"transparent"}} onClick={()=>setBet(v)}>${v}</button>
            ))}
            <button className="pipboy-btn" onClick={deal} disabled={balance<bet}>{t("bj.deal")}</button>
          </>
        )}
        {phase==="play"&&(
          <>
            <button className="pipboy-btn" onClick={hit}>{t("bj.hit")}</button>
            <button className="pipboy-btn" onClick={stand}>{t("bj.stand")}</button>
            {player.length===2&&balance>=bet&&<button className="pipboy-btn" onClick={dbl}>{t("bj.double")}</button>}
          </>
        )}
        {phase==="result"&&(
          <>
            {[10,25,50,100].map(v=>(
              <button key={v} className="pipboy-btn text-xs py-1 px-2" style={{background:bet===v?`${tc}22`:"transparent"}} onClick={()=>setBet(v)}>${v}</button>
            ))}
            <button className="pipboy-btn" onClick={deal} disabled={balance<bet}>{t("bj.deal")}</button>
          </>
        )}
      </div>
      {balance<=0&&<div className="text-red-400 glow-red text-sm">GAME OVER — No more chips! Refreshing...</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO POKER (Jacks or Better)
// ═══════════════════════════════════════════════════════════════════════════════
type PokerPhase = "bet"|"draw"|"result";

const POKER_HANDS=[
  {name:"Royal Flush",namees:"Escalera Real",pay:800},
  {name:"Straight Flush",namees:"Escalera de Color",pay:50},
  {name:"Four of a Kind",namees:"Póker",pay:25},
  {name:"Full House",namees:"Full",pay:9},
  {name:"Flush",namees:"Color",pay:6},
  {name:"Straight",namees:"Escalera",pay:4},
  {name:"Three of a Kind",namees:"Trío",pay:3},
  {name:"Two Pair",namees:"Doble Pareja",pay:2},
  {name:"Jacks or Better",namees:"Pareja J o más",pay:1},
  {name:"Nothing",namees:"Nada",pay:0},
];

function rankIndex(r:CardRank):number{
  return RANKS.indexOf(r);
}

function evaluatePokerHand(cards:Card[]):{idx:number;name:string;pay:number}{
  const sorted=[...cards].sort((a,b)=>rankIndex(a.rank)-rankIndex(b.rank));
  const ranks=sorted.map(c=>rankIndex(c.rank));
  const suits=sorted.map(c=>c.suit);
  const rankCount:Record<number,number>={};
  ranks.forEach(r=>{rankCount[r]=(rankCount[r]??0)+1;});
  const counts=Object.values(rankCount).sort((a,b)=>b-a);
  const isFlush=suits.every(s=>s===suits[0]);
  const isStr=counts[0]===1&&(ranks[4]-ranks[0]===4||(ranks[4]===12&&ranks[3]===4&&ranks[0]===0));
  const isRoyal=isFlush&&isStr&&ranks[0]===8; // 10,J,Q,K,A
  if(isRoyal) return{idx:0,...POKER_HANDS[0]};
  if(isFlush&&isStr) return{idx:1,...POKER_HANDS[1]};
  if(counts[0]===4) return{idx:2,...POKER_HANDS[2]};
  if(counts[0]===3&&counts[1]===2) return{idx:3,...POKER_HANDS[3]};
  if(isFlush) return{idx:4,...POKER_HANDS[4]};
  if(isStr) return{idx:5,...POKER_HANDS[5]};
  if(counts[0]===3) return{idx:6,...POKER_HANDS[6]};
  if(counts[0]===2&&counts[1]===2) return{idx:7,...POKER_HANDS[7]};
  // Jacks or better
  const pairs=Object.entries(rankCount).filter(([,v])=>v===2).map(([k])=>parseInt(k));
  if(pairs.some(r=>r>=9)) return{idx:8,...POKER_HANDS[8]}; // J=9,Q=10,K=11,A=12 in index
  return{idx:9,...POKER_HANDS[9]};
}

function VideoPoker(){
  const {t,settings}=useApp();
  const tc=settings.theme==="amber"?"#FFC000":settings.theme==="blue"?"#00CCFF":settings.theme==="red"?"#FF4444":"#00FF00";
  const lang=settings.language;
  const [deck,setDeck]=useState<Card[]>(shuffle(makeDeck()));
  const [hand,setHand]=useState<Card[]>([]);
  const [held,setHeld]=useState<boolean[]>([false,false,false,false,false]);
  const [phase,setPhase]=useState<PokerPhase>("bet");
  const [balance,setBalance]=useState(500);
  const [bet,setBet]=useState(5);
  const [result,setResult]=useState<{name:string;pay:number}|null>(null);

  const deal=useCallback(()=>{
    if(bet>balance) return;
    let d=deck.length<10?shuffle(makeDeck()):[...deck];
    const h=[d.shift()!,d.shift()!,d.shift()!,d.shift()!,d.shift()!].map(c=>({...c,faceUp:true}));
    setDeck(d);
    setHand(h);
    setHeld([false,false,false,false,false]);
    setBalance(b=>b-bet);
    setResult(null);
    setPhase("draw");
  },[deck,bet,balance]);

  const draw=useCallback(()=>{
    let d=[...deck];
    const newHand=hand.map((c,i)=>held[i]?c:{...d.shift()!,faceUp:true});
    setDeck(d);
    setHand(newHand);
    const eval_=evaluatePokerHand(newHand);
    setResult({name:lang==="es"?eval_.namees:eval_.name,pay:eval_.pay});
    if(eval_.pay>0) setBalance(b=>b+bet*eval_.pay);
    setPhase("result");
  },[deck,hand,held,bet,lang]);

  const toggleHold=(i:number)=>{
    if(phase!=="draw") return;
    setHeld(h=>{ const n=[...h]; n[i]=!n[i]; return n; });
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 w-full max-w-lg mx-auto">
      <div style={{color:tc}} className="text-lg font-mono font-bold glow">{t("cards.poker")} — Jacks or Better</div>

      <div className="flex gap-4 text-sm font-mono">
        <span style={{color:`${tc}aa`}}>{t("poker.balance")} <span style={{color:tc}}>${balance}</span></span>
        <span style={{color:`${tc}aa`}}>{t("poker.bet")} <span style={{color:tc}}>${bet}</span></span>
      </div>

      {/* Pay table */}
      <div className="w-full grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs font-mono border border-green-900 p-2" style={{maxWidth:400}}>
        {POKER_HANDS.filter(h=>h.pay>0).map((h,i)=>(
          <div key={i} className="flex justify-between" style={{color:result?.name===h.name||result?.name===h.namees?tc:`${tc}55`}}>
            <span>{lang==="es"?h.namees:h.name}</span>
            <span>{h.pay}x</span>
          </div>
        ))}
      </div>

      {/* Hand */}
      <div className="flex gap-2 justify-center flex-wrap">
        {hand.length===0?[0,1,2,3,4].map(i=><EmptySlot key={i}/>):hand.map((c,i)=>(
          <div key={i} className="flex flex-col items-center gap-1">
            <CardFace card={c} selected={held[i]} onClick={()=>toggleHold(i)}/>
            {phase==="draw"&&<span className="text-xs font-mono" style={{color:held[i]?tc:`${tc}44`}}>{held[i]?"HOLD":"—"}</span>}
          </div>
        ))}
      </div>

      {/* Result */}
      {result&&<div className="text-base font-mono" style={{color:result.pay>0?"#00FF00":"#FF4444"}}>{result.name} {result.pay>0?`+$${bet*result.pay}`:""}</div>}

      {/* Controls */}
      <div className="flex gap-2 flex-wrap justify-center">
        {(phase==="bet"||phase==="result")&&(
          <>
            {[1,5,10,25].map(v=>(
              <button key={v} className="pipboy-btn text-xs py-1 px-2" style={{background:bet===v?`${tc}22`:"transparent"}} onClick={()=>setBet(v)}>${v}</button>
            ))}
            <button className="pipboy-btn" onClick={deal} disabled={balance<bet}>{t("poker.deal")}</button>
          </>
        )}
        {phase==="draw"&&(
          <button className="pipboy-btn" onClick={draw}>{t("poker.draw")} ({hand.filter((_,i)=>!held[i]).length})</button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOLITAIRE (Klondike)
// ═══════════════════════════════════════════════════════════════════════════════
type Pile = Card[];

interface SolState {
  stock: Pile;
  waste: Pile;
  foundations: [Pile,Pile,Pile,Pile];
  tableau: [Pile,Pile,Pile,Pile,Pile,Pile,Pile];
}

function initSolitaire(): SolState {
  const deck=shuffle(makeDeck());
  const tab: Pile[] = [[],[],[],[],[],[],[]];
  for(let c=0;c<7;c++){
    for(let r=0;r<=c;r++){
      const card={...deck.shift()!,faceUp:r===c};
      tab[c].push(card);
    }
  }
  return {
    stock:deck.map(c=>({...c,faceUp:false})),
    waste:[],
    foundations:[[],[],[],[]],
    tableau:tab as SolState["tableau"],
  };
}

function canPlaceOnFoundation(card:Card, foundation:Pile):boolean{
  if(foundation.length===0) return card.rank==="A";
  const top=foundation[foundation.length-1];
  return top.suit===card.suit&&rankIndex(card.rank)===rankIndex(top.rank)+1;
}

function canPlaceOnTableau(card:Card, pile:Pile):boolean{
  if(pile.length===0) return card.rank==="K";
  const top=pile[pile.length-1];
  if(!top.faceUp) return false;
  return isRed(card)!==isRed(top)&&rankIndex(card.rank)===rankIndex(top.rank)-1;
}

function Solitaire(){
  const {t,settings}=useApp();
  const tc=settings.theme==="amber"?"#FFC000":settings.theme==="blue"?"#00CCFF":settings.theme==="red"?"#FF4444":"#00FF00";
  const [state,setState]=useState<SolState>(initSolitaire);
  const [selected,setSelected]=useState<{from:"waste"|"tableau"|"foundation"; tIdx?:number; fIdx?:number; cards:Card[]}|null>(null);
  const [won,setWon]=useState(false);
  const [moves,setMoves]=useState(0);

  useEffect(()=>{
    if(state.foundations.every(f=>f.length===13)) setWon(true);
  },[state]);

  const newGame=()=>{ setState(initSolitaire()); setSelected(null); setWon(false); setMoves(0); };

  const incMoves=()=>setMoves(m=>m+1);

  const drawStock=()=>{
    setState(s=>{
      if(s.stock.length===0){
        return {...s,stock:[...s.waste].reverse().map(c=>({...c,faceUp:false})),waste:[]};
      }
      const card={...s.stock[0],faceUp:true};
      return {...s,stock:s.stock.slice(1),waste:[...s.waste,card]};
    });
    setSelected(null);
    incMoves();
  };

  const selectWaste=()=>{
    if(state.waste.length===0) return;
    const card=state.waste[state.waste.length-1];
    if(selected?.from==="waste"){ setSelected(null); return; }
    setSelected({from:"waste",cards:[card]});
  };

  const selectTableau=(tIdx:number,cardIdx:number)=>{
    const pile=state.tableau[tIdx];
    const card=pile[cardIdx];
    if(!card?.faceUp) return;
    const cards=pile.slice(cardIdx);

    if(selected){
      // Try to place
      if(selected.from==="waste"||selected.cards.length===1||(selected.from==="tableau"&&selected.tIdx!==tIdx)){
        if(canPlaceOnTableau(selected.cards[0],pile)){
          setState(s=>{
            const tab=[...s.tableau.map(p=>[...p])] as SolState["tableau"];
            let newWaste=s.waste,newFounds=s.foundations;
            if(selected.from==="waste"){
              newWaste=s.waste.slice(0,-1);
            } else if(selected.from==="tableau"&&selected.tIdx!==undefined){
              const fromPile=tab[selected.tIdx];
              tab[selected.tIdx]=fromPile.slice(0,-selected.cards.length);
              if(tab[selected.tIdx].length>0) tab[selected.tIdx][tab[selected.tIdx].length-1]={...tab[selected.tIdx][tab[selected.tIdx].length-1],faceUp:true};
            } else if(selected.from==="foundation"&&selected.fIdx!==undefined){
              const f=[...s.foundations] as SolState["foundations"];
              f[selected.fIdx]=f[selected.fIdx].slice(0,-1);
              newFounds=f;
            }
            tab[tIdx]=[...tab[tIdx],...selected.cards];
            return {...s,tableau:tab,waste:newWaste,foundations:newFounds};
          });
          setSelected(null); incMoves(); return;
        }
      }
      if(selected.from==="tableau"&&selected.tIdx===tIdx){ setSelected(null); return; }
    }
    setSelected({from:"tableau",tIdx,cards});
  };

  const clickFoundation=(fIdx:number)=>{
    if(selected){
      if(selected.cards.length===1&&canPlaceOnFoundation(selected.cards[0],state.foundations[fIdx])){
        setState(s=>{
          const tab=[...s.tableau.map(p=>[...p])] as SolState["tableau"];
          const f=[...s.foundations] as SolState["foundations"];
          let newWaste=s.waste;
          f[fIdx]=[...f[fIdx],selected.cards[0]];
          if(selected.from==="waste") newWaste=s.waste.slice(0,-1);
          else if(selected.from==="tableau"&&selected.tIdx!==undefined){
            tab[selected.tIdx]=tab[selected.tIdx].slice(0,-1);
            if(tab[selected.tIdx].length>0) tab[selected.tIdx][tab[selected.tIdx].length-1]={...tab[selected.tIdx][tab[selected.tIdx].length-1],faceUp:true};
          }
          return {...s,tableau:tab,foundations:f,waste:newWaste};
        });
        setSelected(null); incMoves();
      } else { setSelected(null); }
      return;
    }
    // Select from foundation
    if(state.foundations[fIdx].length>0){
      const card=state.foundations[fIdx][state.foundations[fIdx].length-1];
      setSelected({from:"foundation",fIdx,cards:[{...card,faceUp:true}]});
    }
  };

  const FND_SUITS: Suit[] = ["♠","♥","♦","♣"];

  return (
    <div className="flex flex-col items-center gap-3 p-3 w-full" style={{maxWidth:700,margin:"0 auto"}}>
      <div className="flex justify-between w-full items-center">
        <div style={{color:tc}} className="text-base font-mono font-bold">{t("cards.solitaire")}</div>
        <div className="text-xs font-mono" style={{color:`${tc}88`}}>Moves: {moves}</div>
        <button className="pipboy-btn text-xs py-1 px-2" onClick={newGame}>{t("sol.new")}</button>
      </div>

      {won&&<div className="text-2xl font-mono glow" style={{color:tc}}>{t("sol.won")} 🎉</div>}

      {/* Top row: Stock + Waste + Foundations */}
      <div className="flex gap-2 w-full justify-between" style={{maxWidth:500}}>
        <div className="flex gap-2">
          {/* Stock */}
          <div onClick={drawStock} style={{cursor:"pointer"}}>
            {state.stock.length>0?<CardFace card={{rank:"A",suit:"♠",faceUp:false}}/>:<EmptySlot/>}
          </div>
          {/* Waste */}
          <div onClick={selectWaste} style={{cursor:"pointer",position:"relative"}}>
            {state.waste.length>0?(
              <div style={{position:"relative"}}>
                {state.waste.length>1&&<div style={{position:"absolute",top:0,left:-6,opacity:0.5,zIndex:0}}><CardFace card={{...state.waste[state.waste.length-2],faceUp:true}} small/></div>}
                <div style={{position:"relative",zIndex:1}}>
                  <CardFace card={{...state.waste[state.waste.length-1],faceUp:true}} selected={selected?.from==="waste"} small/>
                </div>
              </div>
            ):<EmptySlot small/>}
          </div>
        </div>
        {/* Foundations */}
        <div className="flex gap-1">
          {state.foundations.map((f,i)=>(
            <div key={i} onClick={()=>clickFoundation(i)} style={{cursor:"pointer"}}>
              {f.length>0?(
                <CardFace card={{...f[f.length-1],faceUp:true}} selected={selected?.from==="foundation"&&selected.fIdx===i} small/>
              ):(
                <div style={{width:44,height:64,borderRadius:6,border:"1px dashed rgba(0,255,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                  <span style={{color:"rgba(0,255,0,0.3)",fontSize:18}}>{FND_SUITS[i]}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="flex gap-1 w-full justify-center" style={{maxWidth:520,overflowX:"auto"}}>
        {state.tableau.map((pile,tIdx)=>(
          <div key={tIdx} style={{display:"flex",flexDirection:"column",position:"relative",minWidth:48,minHeight:80}}>
            {pile.length===0?(
              <div onClick={()=>{
                if(selected&&canPlaceOnTableau(selected.cards[0],[])&&selected.cards[0].rank==="K"){
                  setState(s=>{
                    const tab=[...s.tableau.map(p=>[...p])] as SolState["tableau"];
                    let newWaste=s.waste,newFounds=s.foundations;
                    if(selected.from==="waste") newWaste=s.waste.slice(0,-1);
                    else if(selected.from==="tableau"&&selected.tIdx!==undefined){
                      tab[selected.tIdx]=tab[selected.tIdx].slice(0,-selected.cards.length);
                      if(tab[selected.tIdx].length>0) tab[selected.tIdx][tab[selected.tIdx].length-1]={...tab[selected.tIdx][tab[selected.tIdx].length-1],faceUp:true};
                    }
                    tab[tIdx]=[...selected.cards];
                    return {...s,tableau:tab,waste:newWaste,foundations:newFounds};
                  });
                  setSelected(null); incMoves();
                }
              }} style={{cursor:"pointer"}}>
                <EmptySlot small/>
              </div>
            ):(
              pile.map((card,cIdx)=>(
                <div key={cIdx} style={{
                  position:"relative",
                  marginTop:cIdx===0?0:card.faceUp?-48:-52,
                  zIndex:cIdx,
                }}>
                  <CardFace card={card} small
                    selected={selected?.from==="tableau"&&selected.tIdx===tIdx&&cIdx>=pile.length-selected.cards.length}
                    onClick={()=>selectTableau(tIdx,cIdx)}/>
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      {selected&&(
        <div className="text-xs font-mono" style={{color:`${tc}88`}}>
          {selected.cards.length} card{selected.cards.length>1?"s":""} selected — click destination
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main CardGames component with tabs
// ═══════════════════════════════════════════════════════════════════════════════
type CardTab = "blackjack"|"poker"|"solitaire";

export default function CardGames(){
  const {t,settings}=useApp();
  const tc=settings.theme==="amber"?"#FFC000":settings.theme==="blue"?"#00CCFF":settings.theme==="red"?"#FF4444":"#00FF00";
  const [tab,setTab]=useState<CardTab>("blackjack");

  return (
    <div className="flex flex-col w-full min-h-full">
      {/* Section header */}
      <div className="px-6 pt-4 pb-0">
        <div className="text-xs tracking-[0.3em] mb-1" style={{color:`${tc}77`}}>
          {settings.language==="es" ? "MÓDULO DE JUEGOS" : "GAME MODULE"}
        </div>
        <div className="text-2xl font-mono font-bold mb-1 flicker"
          style={{color:tc, textShadow:`0 0 12px ${tc}, 0 0 24px ${tc}`}}>
          {t("game.cards.name")}
        </div>
        <div className="text-xs mb-3" style={{color:`${tc}66`}}>
          {t("game.cards.desc")}
        </div>
        <div className="h-px mb-0 opacity-40"
          style={{background:`linear-gradient(to right, ${tc}, transparent)`}} />
      </div>

      {/* Tab bar */}
      <div className="flex px-2 pt-2 border-b" style={{borderColor:`${tc}22`}}>
        {(["blackjack","poker","solitaire"] as CardTab[]).map(tabId=>(
          <button key={tabId} onClick={()=>setTab(tabId)}
            className="px-4 py-2 text-sm font-mono uppercase tracking-wider transition-all"
            style={{
              color:tab===tabId?tc:`${tc}55`,
              background:tab===tabId?`${tc}11`:"transparent",
              borderBottom:tab===tabId?`2px solid ${tc}`:"2px solid transparent",
            }}>
            {tabId==="blackjack"?t("cards.blackjack"):tabId==="poker"?t("cards.poker"):t("cards.solitaire")}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {tab==="blackjack"&&<Blackjack/>}
        {tab==="poker"&&<VideoPoker/>}
        {tab==="solitaire"&&<Solitaire/>}
      </div>
    </div>
  );
}
