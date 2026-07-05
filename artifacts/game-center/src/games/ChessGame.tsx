import { useEffect, useRef, useState, useCallback } from "react";
import { useApp } from "../context/AppContext";

// ─── Types ────────────────────────────────────────────────────────────────────
type PieceType = "king"|"queen"|"rook"|"bishop"|"knight"|"pawn";
type Color = "white"|"black";
type Piece = { type: PieceType; color: Color };
type Board = (Piece|null)[][];
type Move = { fr:number; fc:number; tr:number; tc:number; promotion?: PieceType };
type CastleRights = { wk:boolean; wq:boolean; bk:boolean; bq:boolean };

// ─── Piece values for AI ──────────────────────────────────────────────────────
const PIECE_VALUE: Record<PieceType, number> = {
  pawn:100, knight:320, bishop:330, rook:500, queen:900, king:20000
};

const PAWN_TABLE   = [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0];
const KNIGHT_TABLE = [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50];
const BISHOP_TABLE = [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20];
const ROOK_TABLE   = [0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0];
const QUEEN_TABLE  = [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20];
const KING_MID_TABLE=[-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20];

function getTable(type: PieceType): number[] {
  switch(type){
    case "pawn": return PAWN_TABLE;
    case "knight": return KNIGHT_TABLE;
    case "bishop": return BISHOP_TABLE;
    case "rook": return ROOK_TABLE;
    case "queen": return QUEEN_TABLE;
    case "king": return KING_MID_TABLE;
  }
}

// ─── Board utilities ──────────────────────────────────────────────────────────
function initBoard(): Board {
  const b: Board = Array.from({length:8},()=>Array(8).fill(null));
  const back: PieceType[] = ["rook","knight","bishop","queen","king","bishop","knight","rook"];
  for(let c=0;c<8;c++){
    b[0][c]={type:back[c],color:"black"};
    b[1][c]={type:"pawn",color:"black"};
    b[6][c]={type:"pawn",color:"white"};
    b[7][c]={type:back[c],color:"white"};
  }
  return b;
}

function cloneBoard(board: Board): Board {
  return board.map(row=>row.map(p=>p?{...p}:null));
}

function isInBounds(r:number,c:number){ return r>=0&&r<8&&c>=0&&c<8; }

function getPseudoMoves(board: Board, r:number, c:number, enPassant:[number,number]|null, castleRights: CastleRights): Move[] {
  const piece = board[r][c];
  if(!piece) return [];
  const { type, color } = piece;
  const opp = color==="white"?"black":"white";
  const moves: Move[] = [];
  const push = (tr:number,tc:number,promotion=false)=>{
    if(!isInBounds(tr,tc)) return false;
    const t=board[tr][tc];
    if(t&&t.color===color) return false;
    if(promotion && type==="pawn"){
      for(const p of ["queen","rook","bishop","knight"] as PieceType[])
        moves.push({fr:r,fc:c,tr,tc,promotion:p});
    } else {
      moves.push({fr:r,fc:c,tr,tc});
    }
    return !t;
  };

  if(type==="pawn"){
    const dir=color==="white"?-1:1;
    const startRow=color==="white"?6:1;
    const promRow=color==="white"?0:7;
    const isPromo=(tr:number)=>tr===promRow;
    if(isInBounds(r+dir,c)&&!board[r+dir][c]){
      push(r+dir,c,isPromo(r+dir));
      if(r===startRow&&!board[r+2*dir][c]) push(r+2*dir,c,false);
    }
    for(const dc of [-1,1]){
      const tr=r+dir,tc=c+dc;
      if(!isInBounds(tr,tc)) continue;
      if(board[tr][tc]&&board[tr][tc]!.color===opp) push(tr,tc,isPromo(tr));
      if(enPassant&&enPassant[0]===tr&&enPassant[1]===tc)
        moves.push({fr:r,fc:c,tr,tc});
    }
  } else if(type==="knight"){
    for(const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
      push(r+dr,c+dc);
  } else if(type==="bishop"||type==="queen"){
    for(const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]])
      for(let i=1;i<8;i++){ if(!push(r+dr*i,c+dc*i)) break; }
  }
  if(type==="rook"||type==="queen"){
    for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]])
      for(let i=1;i<8;i++){ if(!push(r+dr*i,c+dc*i)) break; }
  }
  if(type==="king"){
    for(const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
      push(r+dr,c+dc);
    if(color==="white"){
      if(castleRights.wk&&!board[7][5]&&!board[7][6]&&!isSquareAttacked(board,7,4,"black")&&!isSquareAttacked(board,7,5,"black"))
        moves.push({fr:7,fc:4,tr:7,tc:6});
      if(castleRights.wq&&!board[7][3]&&!board[7][2]&&!board[7][1]&&!isSquareAttacked(board,7,4,"black")&&!isSquareAttacked(board,7,3,"black"))
        moves.push({fr:7,fc:4,tr:7,tc:2});
    } else {
      if(castleRights.bk&&!board[0][5]&&!board[0][6]&&!isSquareAttacked(board,0,4,"white")&&!isSquareAttacked(board,0,5,"white"))
        moves.push({fr:0,fc:4,tr:0,tc:6});
      if(castleRights.bq&&!board[0][3]&&!board[0][2]&&!board[0][1]&&!isSquareAttacked(board,0,4,"white")&&!isSquareAttacked(board,0,3,"white"))
        moves.push({fr:0,fc:4,tr:0,tc:2});
    }
  }
  return moves;
}

function isSquareAttacked(board: Board, r:number, c:number, byColor: Color): boolean {
  for(let fr=0;fr<8;fr++)
    for(let fc=0;fc<8;fc++){
      const p=board[fr][fc];
      if(!p||p.color!==byColor) continue;
      const moves=getPseudoMoves(board,fr,fc,null,{wk:false,wq:false,bk:false,bq:false});
      if(moves.some(m=>m.tr===r&&m.tc===c)) return true;
    }
  return false;
}

function findKing(board: Board, color: Color): [number,number]|null {
  for(let r=0;r<8;r++)
    for(let c=0;c<8;c++)
      if(board[r][c]?.type==="king"&&board[r][c]?.color===color) return [r,c];
  return null;
}

function applyMove(board: Board, move: Move, enPassant:[number,number]|null, castleRights: CastleRights): { board:Board; enPassant:[number,number]|null; castleRights:CastleRights } {
  const nb=cloneBoard(board);
  const piece=nb[move.fr][move.fc]!;
  nb[move.tr][move.tc]=move.promotion?{type:move.promotion,color:piece.color}:piece;
  nb[move.fr][move.fc]=null;
  let newEP: [number,number]|null=null;
  let newCastle={...castleRights};
  if(piece.type==="pawn"&&enPassant&&move.tr===enPassant[0]&&move.tc===enPassant[1]){
    nb[move.fr][move.tc]=null;
  }
  if(piece.type==="pawn"&&Math.abs(move.tr-move.fr)===2)
    newEP=[(move.fr+move.tr)/2,move.fc];
  if(piece.type==="king"){
    if(piece.color==="white"){ newCastle.wk=false; newCastle.wq=false; }
    else { newCastle.bk=false; newCastle.bq=false; }
    if(move.fc===4&&move.tc===6){ nb[move.tr][5]=nb[move.tr][7]; nb[move.tr][7]=null; }
    if(move.fc===4&&move.tc===2){ nb[move.tr][3]=nb[move.tr][0]; nb[move.tr][0]=null; }
  }
  if(piece.type==="rook"){
    if(move.fr===7&&move.fc===7) newCastle.wk=false;
    if(move.fr===7&&move.fc===0) newCastle.wq=false;
    if(move.fr===0&&move.fc===7) newCastle.bk=false;
    if(move.fr===0&&move.fc===0) newCastle.bq=false;
  }
  return {board:nb, enPassant:newEP, castleRights:newCastle};
}

function getLegalMoves(board: Board, color: Color, enPassant:[number,number]|null, castleRights: CastleRights): Move[] {
  const legal: Move[]=[];
  for(let r=0;r<8;r++)
    for(let c=0;c<8;c++){
      if(board[r][c]?.color!==color) continue;
      const pseudo=getPseudoMoves(board,r,c,enPassant,castleRights);
      for(const m of pseudo){
        const {board:nb}=applyMove(board,m,enPassant,castleRights);
        const kg=findKing(nb,color);
        if(kg&&!isSquareAttacked(nb,kg[0],kg[1],color==="white"?"black":"white"))
          legal.push(m);
      }
    }
  return legal;
}

// ─── AI (minimax + alpha-beta) ────────────────────────────────────────────────
function evaluateBoard(board: Board): number {
  let score=0;
  for(let r=0;r<8;r++)
    for(let c=0;c<8;c++){
      const p=board[r][c];
      if(!p) continue;
      const idx=p.color==="white"?(r*8+c):(((7-r)*8+c));
      const tableBonus=getTable(p.type)[idx]??0;
      const val=PIECE_VALUE[p.type]+tableBonus;
      score+=p.color==="white"?val:-val;
    }
  return score;
}

function minimax(board: Board, depth:number, alpha:number, beta:number, maximizing:boolean, ep:[number,number]|null, cr:CastleRights): number {
  const color=maximizing?"white":"black";
  const moves=getLegalMoves(board,color,ep,cr);
  if(moves.length===0){
    const kg=findKing(board,color);
    if(kg&&isSquareAttacked(board,kg[0],kg[1],maximizing?"black":"white"))
      return maximizing?-99999:99999;
    return 0;
  }
  if(depth===0) return evaluateBoard(board);
  if(maximizing){
    let best=-Infinity;
    for(const m of moves){
      const {board:nb,enPassant:nep,castleRights:ncr}=applyMove(board,m,ep,cr);
      const val=minimax(nb,depth-1,alpha,beta,false,nep,ncr);
      best=Math.max(best,val);
      alpha=Math.max(alpha,val);
      if(beta<=alpha) break;
    }
    return best;
  } else {
    let best=Infinity;
    for(const m of moves){
      const {board:nb,enPassant:nep,castleRights:ncr}=applyMove(board,m,ep,cr);
      const val=minimax(nb,depth-1,alpha,beta,true,nep,ncr);
      best=Math.min(best,val);
      beta=Math.min(beta,val);
      if(beta<=alpha) break;
    }
    return best;
  }
}

function getBestAIMove(board: Board, ep:[number,number]|null, cr:CastleRights, depth=3): Move|null {
  const moves=getLegalMoves(board,"black",ep,cr);
  if(!moves.length) return null;
  let bestVal=Infinity, bestMove=moves[0];
  for(const m of moves){
    const {board:nb,enPassant:nep,castleRights:ncr}=applyMove(board,m,ep,cr);
    const val=minimax(nb,depth-1,-Infinity,Infinity,true,nep,ncr);
    if(val<bestVal){ bestVal=val; bestMove=m; }
  }
  return bestMove;
}

// ─── Piece symbols ────────────────────────────────────────────────────────────
const SYM: Record<Color,Record<PieceType,string>>={
  white:{king:"♔",queen:"♕",rook:"♖",bishop:"♗",knight:"♘",pawn:"♙"},
  black:{king:"♚",queen:"♛",rook:"♜",bishop:"♝",knight:"♞",pawn:"♟"},
};

const FILES = ["a","b","c","d","e","f","g","h"];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChessGame() {
  const {t, settings} = useApp();
  const [board,setBoard]=useState<Board>(initBoard);
  const [turn,setTurn]=useState<Color>("white");
  const [selected,setSelected]=useState<[number,number]|null>(null);
  const [legalMoves,setLegalMoves]=useState<Move[]>([]);
  const [enPassant,setEnPassant]=useState<[number,number]|null>(null);
  const [castleRights,setCastleRights]=useState<CastleRights>({wk:true,wq:true,bk:true,bq:true});
  const [capturedW,setCapturedW]=useState<string[]>([]);
  const [capturedB,setCapturedB]=useState<string[]>([]);
  const [mode,setMode]=useState<"hvh"|"hvai">("hvh");
  const [status,setStatus]=useState("");
  const [gameOver,setGameOver]=useState(false);
  const [aiThinking,setAiThinking]=useState(false);
  const [inCheck,setInCheck]=useState(false);
  const [flipped,setFlipped]=useState(false);
  const [promotionPending,setPromotionPending]=useState<Move|null>(null);
  const aiTimerRef=useRef<ReturnType<typeof setTimeout>|null>(null);

  const tc=settings.theme==="amber"?"#FFC000":settings.theme==="blue"?"#00CCFF":settings.theme==="red"?"#FF4444":"#00FF00";

  // Compute status whenever board/turn changes
  useEffect(()=>{
    const kg=findKing(board,turn);
    const opp=turn==="white"?"black":"white";
    const check=kg?isSquareAttacked(board,kg[0],kg[1],opp):false;
    setInCheck(check);
    const legal=getLegalMoves(board,turn,enPassant,castleRights);
    if(!legal.length){
      if(check){
        setStatus(turn==="white"?t("chess.black.wins"):t("chess.white.wins"));
        setGameOver(true);
      } else {
        setStatus(t("chess.stalemate"));
        setGameOver(true);
      }
    } else {
      setStatus(check
        ? t("chess.check")+" — "+(turn==="white"?t("chess.white"):t("chess.black"))
        : (turn==="white"?t("chess.white"):t("chess.black"))
      );
    }
  },[board,turn,enPassant,castleRights,t]);

  // AI move
  useEffect(()=>{
    if(mode==="hvai"&&turn==="black"&&!gameOver){
      setAiThinking(true);
      if(aiTimerRef.current) clearTimeout(aiTimerRef.current);
      aiTimerRef.current=setTimeout(()=>{
        const move=getBestAIMove(board,enPassant,castleRights,3);
        if(move) executeMove(move, board, enPassant, castleRights, "black");
        setAiThinking(false);
      },300);
    }
    return ()=>{ if(aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  },[turn,mode,gameOver,board,enPassant,castleRights]);

  const executeMove=useCallback((move:Move, brd:Board, ep:[number,number]|null, cr:CastleRights, color:Color)=>{
    const captured=brd[move.tr][move.tc];
    if(captured){
      if(captured.color==="black") setCapturedB(p=>[...p,SYM.black[captured.type]]);
      else setCapturedW(p=>[...p,SYM.white[captured.type]]);
    }
    const piece=brd[move.fr][move.fc]!;
    if(piece.type==="pawn"&&ep&&move.tr===ep[0]&&move.tc===ep[1]){
      const victim=color==="white"?"black":"white";
      if(victim==="black") setCapturedB(p=>[...p,"♟"]);
      else setCapturedW(p=>[...p,"♙"]);
    }
    const {board:nb,enPassant:nep,castleRights:ncr}=applyMove(brd,move,ep,cr);
    setBoard(nb);
    setEnPassant(nep);
    setCastleRights(ncr);
    setSelected(null);
    setLegalMoves([]);
    setTurn(color==="white"?"black":"white");
  },[]);

  const handleClick=(r:number,c:number)=>{
    if(gameOver||aiThinking) return;
    if(mode==="hvai"&&turn==="black") return;

    // Map visual position to board position when flipped
    const br = flipped ? 7-r : r;
    const bc = flipped ? 7-c : c;

    const piece=board[br][bc];
    if(selected){
      const [sr,sc]=selected;
      const movesForSelected=legalMoves.filter(m=>m.fr===sr&&m.fc===sc);
      const move=movesForSelected.find(m=>m.tr===br&&m.tc===bc);
      if(move){
        // Promotion choice
        if(move.promotion){
          setPromotionPending({...move, promotion:undefined});
          setSelected(null); setLegalMoves([]);
          return;
        }
        executeMove(move,board,enPassant,castleRights,turn);
        return;
      }
      setSelected(null); setLegalMoves([]);
    }
    if(piece&&piece.color===turn){
      setSelected([br,bc]);
      const legal=getLegalMoves(board,turn,enPassant,castleRights);
      setLegalMoves(legal.filter(m=>m.fr===br&&m.fc===bc));
    }
  };

  const handlePromotion=(promo:PieceType)=>{
    if(!promotionPending) return;
    const move={...promotionPending,promotion:promo};
    executeMove(move,board,enPassant,castleRights,turn);
    setPromotionPending(null);
  };

  const reset=()=>{
    setBoard(initBoard());
    setTurn("white"); setSelected(null); setLegalMoves([]);
    setEnPassant(null); setCastleRights({wk:true,wq:true,bk:true,bq:true});
    setCapturedW([]); setCapturedB([]); setGameOver(false);
    setAiThinking(false); setInCheck(false); setPromotionPending(null);
    if(aiTimerRef.current) clearTimeout(aiTimerRef.current);
  };

  // Build display rows/cols based on flip
  const displayRows = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
  const displayCols = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

  return (
    <div className="flex flex-col items-center gap-3 p-3 w-full">

      {/* Mode + controls */}
      <div className="flex flex-wrap gap-2 justify-center">
        {(["hvh","hvai"] as const).map(m=>(
          <button key={m} className="pipboy-btn text-xs py-1 px-3"
            style={{
              background: mode===m?`${tc}22`:"transparent",
              borderColor: mode===m?tc:`${tc}55`,
              color: mode===m?tc:`${tc}88`,
              boxShadow: mode===m?`0 0 8px ${tc}44`:"none",
            }}
            onClick={()=>{ setMode(m); reset(); }}>
            {m==="hvh"?t("chess.mode.hvh"):t("chess.mode.hvai")}
          </button>
        ))}
        <button className="pipboy-btn text-xs py-1 px-3" onClick={reset}>{t("chess.reset")}</button>
        <button className="pipboy-btn text-xs py-1 px-3" onClick={()=>setFlipped(f=>!f)}>{t("chess.flip")} ⇅</button>
      </div>

      {/* Status bar */}
      <div className={`text-sm font-mono px-4 py-1`}
        style={{
          color: inCheck?"#ff4444":gameOver?"#ffffff":tc,
          textShadow: inCheck?"0 0 10px #FF0000":`0 0 10px ${tc}`,
          border: `1px solid ${inCheck?"#ff444466":tc+"44"}`,
          background: inCheck?"rgba(255,0,0,0.08)":"transparent",
        }}>
        {aiThinking?t("chess.thinking"):status}
      </div>

      {/* Captures */}
      <div className="flex gap-6 text-xs" style={{color:`${tc}88`}}>
        <span>{t("chess.captures.b")} {capturedW.join(" ")||"—"}</span>
        <span>{t("chess.captures.w")} {capturedB.join(" ")||"—"}</span>
      </div>

      {/* Board + coordinates */}
      <div className="flex">
        {/* Rank numbers (left) */}
        <div className="flex flex-col justify-around mr-1" style={{height:"min(480px,92vw)"}}>
          {displayRows.map(r=>(
            <div key={r} className="text-xs flex items-center justify-center" style={{color:`${tc}55`,height:"calc(min(480px,92vw)/8)",width:14}}>
              {8-r}
            </div>
          ))}
        </div>

        <div>
          {/* Board grid */}
          <div className="pipboy-border" style={{ display:"grid", gridTemplateColumns:"repeat(8, 1fr)", width:"min(480px,92vw)", height:"min(480px,92vw)" }}>
            {displayRows.map(r=>displayCols.map(c=>{
              const piece=board[r][c];
              const isLight=(r+c)%2===0;
              const isSel=selected?.[0]===r&&selected?.[1]===c;
              const isLegal=legalMoves.some(m=>m.tr===r&&m.tc===c);
              const isCapture=isLegal&&board[r][c]!==null;
              const isKingInCheck=piece?.type==="king"&&piece?.color===turn&&inCheck;

              return(
                <div key={`${r}-${c}`} onClick={()=>{
                  // Convert display coords back to board coords
                  const visR=displayRows.indexOf(r);
                  const visC=displayCols.indexOf(c);
                  handleClick(visR,visC);
                }}
                  style={{
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"clamp(1.2rem,3.5vw,2rem)", cursor:"pointer",
                    background: isSel?`${tc}44`: isKingInCheck?"rgba(255,0,0,0.35)": isCapture?"rgba(255,80,0,0.28)": isLegal?`${tc}1a`: isLight?"rgba(0,80,0,0.2)":"rgba(0,25,0,0.4)",
                    border: isSel?`2px solid ${tc}`: isKingInCheck?"2px solid #FF0000":"1px solid rgba(0,255,0,0.08)",
                    boxShadow: isSel?`0 0 10px ${tc}`:"none",
                    transition:"background 0.1s", userSelect:"none", position:"relative",
                  }}>
                  {piece&&(
                    <span style={{ textShadow: piece.color==="white"?`0 0 6px ${tc}, 0 0 12px ${tc}`:"0 0 6px #FF3300, 0 0 12px #FF0000", color:piece.color==="white"?`${tc}ee`:"#ff7777", lineHeight:1 }}>
                      {SYM[piece.color][piece.type]}
                    </span>
                  )}
                  {isLegal&&!piece&&(
                    <div style={{ width:10, height:10, borderRadius:"50%", background:`${tc}88`, boxShadow:`0 0 6px ${tc}` }}/>
                  )}
                </div>
              );
            }))}
          </div>

          {/* File letters (bottom) */}
          <div className="flex justify-around mt-1" style={{width:"min(480px,92vw)"}}>
            {displayCols.map(c=>(
              <div key={c} className="text-xs text-center flex-1" style={{color:`${tc}55`}}>
                {FILES[c]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mode label */}
      <div className="text-xs text-center" style={{color:`${tc}55`}}>
        {mode==="hvai"
          ? `${t("chess.mode.hvai")} — ${t("chess.white")}`
          : t("chess.mode.hvh")}
        {flipped ? " · ↕ FLIPPED" : ""}
      </div>

      {/* Promotion dialog */}
      {promotionPending&&(
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{background:"rgba(0,0,0,0.8)"}}>
          <div className="p-6 font-mono text-center" style={{border:`1px solid ${tc}`,boxShadow:`0 0 30px ${tc}33`}}>
            <div className="text-sm mb-4" style={{color:tc}}>
              {settings.language==="es"?"ELIGE PROMOCIÓN":"CHOOSE PROMOTION"}
            </div>
            <div className="flex gap-3 justify-center">
              {(["queen","rook","bishop","knight"] as PieceType[]).map(p=>(
                <button key={p} onClick={()=>handlePromotion(p)}
                  className="pipboy-btn text-2xl p-3"
                  style={{color:turn==="white"?`${tc}ee`:"#ff7777"}}>
                  {SYM[turn][p]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
