(() => {
"use strict";
/* ══ 1 · the coffee ═══════════════════════════════════════════════════════ */
const ROASTS = [
  { name:"Kamwangi AB", origin:"Kenya · Kirinyaga", alt:"1,750 m", process:"Washed",
    level:"City", band:"light", price:26.00, lo:0.628, hi:0.706,
    notes:["Blackcurrant","Grapefruit","Cane sugar"],
    line:"Dense enough to take the heat, so we stop it early. Every acid the farm grew is still in the cup." },
  { name:"Finca La Soledad", origin:"Guatemala · Huehuetenango", alt:"1,580 m", process:"Washed",
    level:"City+", band:"medium", price:22.50, lo:0.706, hi:0.782,
    notes:["Red apple","Milk chocolate","Almond"],
    line:"The middle of the roast. Half the fruit has survived, half has already turned to caramel." },
  { name:"Situmorang", origin:"Indonesia · Lintong, Sumatra", alt:"1,340 m", process:"Wet-hulled",
    level:"Full City", band:"medium-dark", price:21.00, lo:0.782, hi:0.864,
    notes:["Cedar","Dark cocoa","Tobacco leaf"],
    line:"Wet-hulled beans are soft and low-grown, so they arrive here sooner. Past the acids, into cocoa." },
  { name:"Rua Velha", origin:"Brazil · Cerrado Mineiro", alt:"1,050 m", process:"Natural",
    level:"French", band:"dark", price:19.50, lo:0.864, hi:0.948,
    notes:["Burnt sugar","Walnut","Pipe smoke"],
    line:"Taken through second crack. Oil on the surface, and the origin has gone quiet on purpose." },
];
const P_FC = 0.620, P_SC = 0.864;          // first crack, second crack
const T_FC = 450,   T_TOT = 780;           // seconds
/* bean temperature against roast position — decreasing rate of rise, as real */
const TEMP = [[0,22],[0.10,88],[0.22,124],[0.34,150],[0.46,172],[0.56,188],
              [0.62,196],[0.70,205],[0.78,214],[0.864,224],[0.93,234],[1,246]];
/* the bean's own colour through the roast */
const BEAN = [[0,"#8d9657"],[0.17,"#c6bd88"],[0.31,"#dcb65c"],[0.47,"#c88f43"],
              [0.62,"#ab6a30"],[0.74,"#8c4b23"],[0.82,"#713718"],[0.90,"#4b2513"],
              [0.96,"#301a0e"],[1,"#231813"]];
/* ══ 2 · small maths ══════════════════════════════════════════════════════ */
const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
const clamp01=v=>clamp(v,0,1);
const lerp=(a,b,t)=>a+(b-a)*t;
const smoothstep=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};
const bell=(x,mu,sd)=>Math.exp(-((x-mu)*(x-mu))/(2*sd*sd));
const rng=s=>{let x=s>>>0;return()=>((x=(x*1664525+1013904223)>>>0)/4294967296);};
const hx=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const rgb=(c,a)=>a===undefined?`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`
                              :`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;
const mixc=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
const hex=c=>"#"+c.map(v=>Math.round(clamp(v,0,255)).toString(16).padStart(2,"0")).join("");
function pick(stops,p){
  for(let i=0;i<stops.length-1;i++){
    const [a,va]=stops[i],[b,vb]=stops[i+1];
    if(p<=b){ const t=(p-a)/(b-a||1);
      return typeof va==="string" ? mixc(hx(va),hx(vb),clamp01(t)) : lerp(va,vb,clamp01(t)); }
  }
  const last=stops[stops.length-1][1];
  return typeof last==="string"?hx(last):last;
}
const beanColour=p=>pick(BEAN,clamp01(p));
const tempAt=p=>pick(TEMP,clamp01(p));
const timeAt=p=>p<=P_FC ? (p/P_FC)*T_FC : T_FC+((p-P_FC)/(1-P_FC))*(T_TOT-T_FC);
const mmss=s=>String(Math.floor(s/60)).padStart(2,"0")+":"+String(Math.round(s)%60).padStart(2,"0");
/* the flavour model — every band is a real thing heat does to a seed */
const NOTES = [
  { label:"Grass · straw", hex:"#4b7a2c", f:p=>0.02+0.98*(1-smoothstep(0.42,0.70,p)) },
  { label:"Citrus",        hex:"#d99d21", f:p=>bell(p,0.668,0.058)*0.95 },
  { label:"Red fruit",     hex:"#c8437c", f:p=>bell(p,0.700,0.062)*0.80 },
  { label:"Caramel",       hex:"#ed5a14", f:p=>bell(p,0.775,0.080)*1.00 },
  { label:"Toasted nut",   hex:"#a8622a", f:p=>bell(p,0.818,0.082)*0.86 },
  { label:"Cocoa",         hex:"#6b3a1e", f:p=>bell(p,0.880,0.080)*0.94 },
  { label:"Smoke · ash",   hex:"#332b28", f:p=>smoothstep(0.872,1.0,p)*1.25 },
];
NOTES.forEach(n=>n.c=hx(n.hex));
/* the chemistry, as two things heat does in opposite directions */
const acidAt   = p=>1/(1+Math.exp((p-0.722)/0.052));
const brownAt  = p=>(1/(1+Math.exp(-(p-0.640)/0.078)))*(1-0.42*smoothstep(0.925,1.0,p));
const carbonAt = p=>smoothstep(0.878,1.0,p);
const PAPER=hx("#f4f1eb"), INK=hx("#1b1310"), ORANGE=hx("#ed5a14"),
      GOLD=hx("#d99d21"), NAVY=hx("#16305f"), BLUE=hx("#1e5fce"), GREEN=hx("#3f7a2e");
function zoneAt(p){
  for(let i=0;i<ROASTS.length;i++){
    const r=ROASTS[i];
    if(p>=r.lo && (i===ROASTS.length-1 ? p<=r.hi : p<r.hi)) return i;
  }
  return -1;
}
/* ══ 3 · painterly helpers ════════════════════════════════════════════════ */
function stipple(size,dots,colour,rMin,rMax,aMin,aMax,seed){
  const c=document.createElement("canvas"); c.width=c.height=size;
  const g=c.getContext("2d"); const r=rng(seed);
  for(let i=0;i<dots;i++){
    g.globalAlpha=aMin+r()*(aMax-aMin);
    g.fillStyle=colour;
    g.beginPath(); g.arc(r()*size,r()*size,rMin+r()*(rMax-rMin),0,6.2832); g.fill();
  }
  return c;
}
const TILE_DARK  = stipple(180,2600,"#2a1a10",0.5,1.9,0.05,0.26,11);
const TILE_LIGHT = stipple(180,1500,"#fff2d8",0.6,2.2,0.05,0.24,29);
const TILE_PAPER = stipple(200,2300,"#8b7460",0.5,1.6,0.03,0.13,53);
let PAT_DARK=null, PAT_LIGHT=null, PAT_PAPER=null;
/* a bean silhouette in local coordinates — superellipse, slightly egg-shaped,
   with layered sine wobble so the outline reads as drawn rather than plotted */
function beanPath(g,rx,ry,seed,rough){
  const n=112; g.beginPath();
  for(let i=0;i<=n;i++){
    const a=i/n*Math.PI*2, s=Math.sin(a), c=Math.cos(a), k=2/2.35;
    const x=(s<0?-1:1)*Math.pow(Math.abs(s),k);
    const y=(c<0?-1:1)*Math.pow(Math.abs(c),k);
    const egg=1+0.075*c;
    const w=1+rough*(Math.sin(a*3+seed)*0.55+Math.sin(a*7+seed*1.7)*0.28+Math.sin(a*13+seed*2.9)*0.15);
    const X=x*rx*egg*w, Y=y*ry*w;
    i?g.lineTo(X,Y):g.moveTo(X,Y);
  }
  g.closePath();
}
function creasePath(g,rx,ry,wig){
  const n=44; g.beginPath();
  for(let i=0;i<=n;i++){
    const u=i/n, y=(-0.87+1.74*u)*ry;
    const x=Math.sin(u*Math.PI*2.05+0.55)*rx*0.155*wig;
    i?g.lineTo(x,y):g.moveTo(x,y);
  }
}
const swell=p=>1+0.095*smoothstep(0.598,0.646,p)+0.105*smoothstep(0.646,0.868,p)
                +0.045*smoothstep(0.868,0.955,p)-0.020*smoothstep(0.955,1,p);
/* THE BEAN. Everything about it is a function of p. */
function paintBean(g,cx,cy,ryBase,p,opts){
  const o=opts||{};
  const S=ryBase/190;                                   // stroke scale
  const sw=swell(p)*(1+(o.pop||0));
  const RY=ryBase*sw, RX=RY*lerp(0.700,0.805,smoothstep(0.15,0.95,p));
  const col=beanColour(p);
  const ash=smoothstep(0.952,1,p);
  const oil=smoothstep(0.874,0.968,p);
  const dark=mixc(col,[10,6,4],0.50);
  const light=mixc(col,[255,246,224],0.44);
  const rough=0.011+0.026*ash+(o.rough||0);
  const seed=o.seed||3.14;
  g.save();
  g.translate(cx,cy);
  g.rotate(o.rot===undefined?-0.13:o.rot);
  /* body */
  beanPath(g,RX,RY,seed,rough);
  g.save(); g.clip();
  const grd=g.createLinearGradient(-RX*0.9,-RY*0.9,RX*0.8,RY);
  grd.addColorStop(0,rgb(light)); grd.addColorStop(0.40,rgb(col)); grd.addColorStop(1,rgb(dark));
  g.fillStyle=grd; g.fillRect(-RX*1.6,-RY*1.6,RX*3.2,RY*3.2);
  /* highlight, upper left */
  const hl=g.createRadialGradient(-RX*0.36,-RY*0.44,RX*0.04,-RX*0.36,-RY*0.44,RX*1.15);
  hl.addColorStop(0,`rgba(255,251,238,${0.34-0.16*ash})`); hl.addColorStop(1,"rgba(255,251,238,0)");
  g.fillStyle=hl; g.fillRect(-RX*1.6,-RY*1.6,RX*3.2,RY*3.2);
  /* gouache grain */
  if(PAT_DARK){ g.globalAlpha=0.30; g.fillStyle=PAT_DARK; g.fillRect(-RX*1.6,-RY*1.6,RX*3.2,RY*3.2); }
  if(PAT_LIGHT){ g.globalAlpha=0.22; g.fillStyle=PAT_LIGHT; g.fillRect(-RX*1.6,-RY*1.6,RX*3.2,RY*3.2); }
  g.globalAlpha=1;
  /* rim shading, painted from inside the edge */
  for(let i=0;i<5;i++){
    beanPath(g,RX,RY,seed,rough);
    g.lineWidth=(16-i*2.7)*S; g.strokeStyle=rgb(dark,0.11); g.stroke();
  }
  /* the centre crease — widens as the bean swells, and its silverskin lifts
     to a pale line through the middle of the roast */
  const wig=1+0.35*smoothstep(0.6,1,p);
  const openW=RX*(0.140+0.078*smoothstep(0.55,0.92,p));
  creasePath(g,RX,RY,wig);
  g.lineCap="round"; g.lineJoin="round";
  g.lineWidth=openW; g.strokeStyle=rgb(mixc(dark,[0,0,0],0.35),0.62); g.stroke();
  creasePath(g,RX,RY,wig);
  const creaseLight=smoothstep(0.42,0.80,p);
  g.lineWidth=openW*0.38;
  g.strokeStyle=rgb(mixc(mixc(col,[0,0,0],0.35),[240,228,200],creaseLight),0.85-0.25*ash);
  g.stroke();
  /* oil beading past second crack */
  if(oil>0.01){
    const r=rng(97); const n=Math.round(oil*30);
    for(let i=0;i<n;i++){
      const a=r()*6.2832, rr=Math.sqrt(r())*0.82;
      const bx=Math.cos(a)*RX*rr, by=Math.sin(a)*RY*rr;
      const br=(2.4+r()*4.6)*S*(0.7+oil*0.6);
      const gg=g.createRadialGradient(bx-br*0.25,by-br*0.3,0,bx,by,br);
      gg.addColorStop(0,`rgba(255,236,200,${0.42*oil})`);
      gg.addColorStop(0.55,`rgba(255,206,140,${0.16*oil})`);
      gg.addColorStop(1,"rgba(255,200,130,0)");
      g.fillStyle=gg; g.beginPath(); g.arc(bx,by,br,0,6.2832); g.fill();
      g.fillStyle=`rgba(255,250,236,${0.62*oil})`;
      g.beginPath(); g.arc(bx-br*0.28,by-br*0.32,br*0.22,0,6.2832); g.fill();
    }
    const gl=g.createLinearGradient(-RX,-RY,RX*0.4,RY*0.6);
    gl.addColorStop(0,`rgba(255,242,214,${0.20*oil})`); gl.addColorStop(0.5,"rgba(255,242,214,0)");
    g.fillStyle=gl; g.fillRect(-RX*1.6,-RY*1.6,RX*3.2,RY*3.2);
  }
  /* ash — the surface goes flat and grey */
  if(ash>0.01){
    g.fillStyle=`rgba(146,136,128,${0.50*ash})`; g.fillRect(-RX*1.6,-RY*1.6,RX*3.2,RY*3.2);
    if(PAT_DARK){ g.globalAlpha=0.35*ash; g.fillStyle=PAT_DARK; g.fillRect(-RX*1.6,-RY*1.6,RX*3.2,RY*3.2); g.globalAlpha=1; }
  }
  g.restore();
  /* the ink outline — drawn twice, heavier on the shadow side */
  beanPath(g,RX,RY,seed,rough);
  g.lineWidth=3.4*S; g.strokeStyle=rgb(mixc(INK,col,0.18),0.30);
  g.save(); g.translate(1.6*S,2.2*S); g.stroke(); g.restore();
  beanPath(g,RX,RY,seed,rough);
  g.lineWidth=2.5*S; g.strokeStyle=rgb(mixc(INK,[60,40,30],0.25),0.92); g.stroke();
  g.restore();
  return {RX,RY};
}
/* ══ 4 · canvases ═════════════════════════════════════════════════════════ */
const $=id=>document.getElementById(id);
const CV={pan:$("pan"),strip:$("strip"),curve:$("curve"),cross:$("cross"),works:$("works")};
const LY={};
const bagCv=[], LYB=[];
function fitCanvas(cv){
  const r=cv.getBoundingClientRect();
  const d=Math.min(window.devicePixelRatio||1,1.75);
  const w=Math.max(1,Math.round(r.width)), h=Math.max(1,Math.round(r.height));
  if(cv.width!==Math.round(w*d)||cv.height!==Math.round(h*d)){
    cv.width=Math.round(w*d); cv.height=Math.round(h*d);
  }
  return {g:cv.getContext("2d"),w,h,d};
}
function open(L){ L.g.setTransform(L.d,0,0,L.d,0,0); L.g.clearRect(0,0,L.w,L.h); return L.g; }
/* ══ 5 · the stage — flame, pan, bean, heat, smoke ════════════════════════ */
const smoke=[], chaff=[];
let burst=null;
const beanPos={x:0,y:0,r:60};
/* a drawn thermometer — the picture of the number the readout also prints */
function drawThermo(g,x,yBot,hgt,T,S){
  const bulbR=Math.max(9,hgt*0.062), tube=bulbR*0.80, top=yBot-hgt;
  const by=yBot-bulbR*0.35;
  const frac=clamp01((T-20)/230);
  const merc=rgb(mixc(GOLD,ORANGE,clamp01((frac-0.1)*1.5)));
  g.lineCap="round";
  g.beginPath(); g.moveTo(x,by); g.lineTo(x,top+tube);
  g.lineWidth=tube+7*S; g.strokeStyle="rgba(255,250,238,.62)"; g.stroke();
  const my=lerp(by,top+tube,frac);
  g.beginPath(); g.moveTo(x,by); g.lineTo(x,my);
  g.lineWidth=tube; g.strokeStyle=merc; g.stroke();
  g.font='500 12px "DM Mono",monospace'; g.textBaseline="middle";
  g.fillStyle=rgb(mixc(ORANGE,INK,0.22));
  const lbl=Math.round(T)+"°";
  g.fillText(lbl,x-tube/2-6*S-g.measureText(lbl).width,my);
  g.beginPath(); g.arc(x,by,bulbR,0,6.2832); g.fillStyle=merc; g.fill();
  g.lineWidth=2.2*S; g.strokeStyle="rgba(40,26,16,.88)"; g.stroke();
  const hw=tube/2+3.5*S;
  g.beginPath();
  g.moveTo(x-hw,by-bulbR*0.55); g.lineTo(x-hw,top+tube);
  g.moveTo(x+hw,by-bulbR*0.55); g.lineTo(x+hw,top+tube);
  g.lineWidth=2*S; g.strokeStyle="rgba(40,26,16,.78)"; g.stroke();
  g.beginPath(); g.arc(x,top+tube,hw,0,Math.PI,true); g.stroke();
  g.font='400 10.5px "DM Mono",monospace'; g.textBaseline="middle";
  [[100,""],[150,"dry"],[196,"first crack"],[224,"second crack"]].forEach(([TT,lab])=>{
    const yy=lerp(by,top+tube,clamp01((TT-20)/230));
    const live=T>=TT-1;
    g.beginPath(); g.moveTo(x+hw+4*S,yy); g.lineTo(x+hw+13*S,yy);
    g.lineWidth=1.4; g.strokeStyle=live?rgb(ORANGE,.85):"rgba(27,19,16,.34)"; g.stroke();
    g.fillStyle=live?rgb(mixc(ORANGE,INK,.25),.95):"rgba(27,19,16,.48)";
    g.fillText(TT+"°"+(lab?"  "+lab:""),x+hw+18*S,yy);
  });
}
function drawStage(tRaw){
  const L=LY.pan; if(!L||L.h<40) return;
  const t=still?0:tRaw;          /* one frozen frame when motion is not wanted */
  const g=open(L), {w,h}=L;
  const wide=w>860;
  /* the words live top-left on a wide screen, so the object stands right of
     centre; on a phone it is centred with room kept clear underneath */
  const cx=wide?w*0.62:w*0.5;
  const room=(wide?0:0.028)*h;
  const heat=clamp01((tempAt(pv)-22)/224);
  const ryBase=Math.min(h*0.245,w*(wide?0.20:0.30));
  const RYnow=ryBase*swell(pv)*(1+(burst?burst.pop:0));
  const panR=Math.min(ryBase*1.45,w*0.36), panRy=panR*0.20, depth=panR*0.30;
  const rim=h*0.622-room;
  const bowlBot=rim+panRy+depth;
  const beanCy=rim+panRy*0.55-RYnow;
  const S=ryBase/190;
  beanPos.x=cx; beanPos.y=beanCy; beanPos.r=RYnow;
  /* ── the heat: a wash pooled around the flame, and a floor of it ──
     This is most of the page's colour. A cream page with no warmth in it
     measured saturation 25 against the 36 his favourites hold. */
  const floor=g.createLinearGradient(0,h*0.30,0,h);
  floor.addColorStop(0,rgb(GOLD,0));
  floor.addColorStop(0.55,rgb(GOLD,0.16+0.16*heat));
  floor.addColorStop(1,rgb(mixc(GOLD,ORANGE,0.45),0.26+0.30*heat));
  g.fillStyle=floor; g.fillRect(0,0,w,h);
  const hr=Math.max(w*0.42,h*0.86);
  const halo=g.createRadialGradient(cx,rim-ryBase*0.25,ryBase*0.1,cx,rim-ryBase*0.25,hr);
  halo.addColorStop(0,rgb(ORANGE,0.34+0.34*heat));
  halo.addColorStop(0.26,rgb(mixc(ORANGE,GOLD,0.55),0.20+0.26*heat));
  halo.addColorStop(0.60,rgb(GOLD,0.09+0.14*heat));
  halo.addColorStop(1,rgb(GOLD,0));
  g.fillStyle=halo; g.fillRect(0,0,w,h);
  /* ── the burner, and the flame licking up round the pan ──
     The burner sits just under the bowl and the flame is drawn BEFORE the pan,
     so at low heat only the tongues at the sides show and at full heat it
     climbs past the rim. A flame floating in the gap below reads as broken. */
  const bowlLow=rim+0.75*(panRy+depth*1.25);        /* where the bezier bottoms out */
  const fBase=Math.min(bowlLow+Math.max(34,Math.min((h-bowlLow)*0.72,panR*0.66)),h*0.945-room);
  const fW=panR*(0.26+0.20*heat);
  const gap=fBase-bowlLow;
  /* A flame taller than about twice its width stops reading as fire — but it must
     ALWAYS reach the bowl. At the default heat the old floor left ~30px of daylight
     between the tongue and the pan, and the whole pan read as floating. The aspect
     cap is therefore a ceiling on GROWTH, never allowed to shorten it below contact. */
  const fH=Math.max(gap+8,Math.min((gap+24)*(0.28+0.72*heat),fW*2.1));
  const tongue=(ww,hh,col,ph,al,ink)=>{
    g.beginPath(); g.moveTo(cx-ww,fBase);
    for(let i=0;i<=30;i++){
      const u=i/30, x=cx-ww+2*ww*u;
      const prof=Math.pow(Math.sin(Math.PI*u),0.72);
      const lick=Math.sin(u*8.5+t*3.0+ph)*0.10+Math.sin(u*17-t*4.4+ph)*0.05;
      g.lineTo(x,fBase-hh*prof*(1+lick));
    }
    g.lineTo(cx+ww,fBase); g.closePath();
    g.globalAlpha=al; g.fillStyle=col; g.fill(); g.globalAlpha=1;
    if(ink){ g.lineWidth=2.4*S; g.strokeStyle=rgb(mixc(hx("#8a3d08"),INK,0.3),0.75); g.stroke(); }
  };
  tongue(fW,fH,rgb(GOLD),0,0.95,true);
  tongue(fW*0.66,fH*0.80,rgb(ORANGE),1.7,0.95,false);
  tongue(fW*0.32,fH*0.50,"#ffd47e",3.1,0.92,false);
  /* the gas ring, painted over the flame's foot so the fire has a source */
  g.lineCap="round"; g.strokeStyle=rgb(mixc(NAVY,INK,0.5));
  g.lineWidth=Math.max(6,panR*0.045);
  g.beginPath(); g.moveTo(cx-panR*0.42,fBase+2); g.lineTo(cx+panR*0.42,fBase+2); g.stroke();
  g.lineWidth=Math.max(4,panR*0.028);
  [-0.32,0.32].forEach(s=>{ g.beginPath(); g.moveTo(cx+s*panR,fBase+4);
    g.lineTo(cx+s*panR*1.18,fBase+Math.max(14,panR*0.10)); g.stroke(); });
  /* embers */
  const er=rng(5);
  for(let i=0;i<14;i++){
    const ph=er()*10, sp=0.5+er()*0.9;
    const u=((t*sp+ph)%3)/3;
    const x=cx+(er()-0.5)*fW*2.1, y=fBase-fH*0.4-u*h*0.22;
    g.globalAlpha=(1-u)*0.55*heat; g.fillStyle=rgb(mixc(ORANGE,GOLD,er()));
    g.beginPath(); g.arc(x,y,(1.2+er()*1.8)*S,0,6.2832); g.fill();
  }
  g.globalAlpha=1;
  /* ── the pan: a shallow cast-iron bowl seen slightly from above. Drawn in
     two halves so the bean can sit INSIDE it — back wall, then the bean, then
     the front lip painted over the bean's bottom edge. ── */
  const irons=rgb(mixc(NAVY,INK,0.30)), ironk=rgb(mixc(NAVY,INK,0.62));
  /* handle */
  g.lineWidth=Math.max(9,panR*0.075); g.lineCap="round";
  g.strokeStyle=ironk;
  g.beginPath(); g.moveTo(cx+panR*0.92,rim+panRy*0.35);
  g.quadraticCurveTo(cx+panR*1.42,rim+panRy*0.1,cx+panR*1.58,rim-panRy*0.9);
  g.stroke();
  /* bowl */
  g.beginPath();
  g.moveTo(cx-panR,rim);
  g.bezierCurveTo(cx-panR,rim+panRy+depth*1.25,cx+panR,rim+panRy+depth*1.25,cx+panR,rim);
  g.ellipse(cx,rim,panR,panRy,0,0,Math.PI,true);
  g.closePath();
  g.fillStyle=irons; g.fill();
  g.lineWidth=2.6*S; g.strokeStyle=ironk; g.stroke();
  /* the inside, lit by the flame */
  g.beginPath(); g.ellipse(cx,rim,panR*0.965,panRy*0.94,0,0,6.2832);
  g.fillStyle=rgb(mixc(NAVY,INK,0.62)); g.fill();
  const inner=g.createRadialGradient(cx,rim,1,cx,rim,panR*0.95);
  inner.addColorStop(0,rgb(mixc(ORANGE,GOLD,0.35),0.30+0.60*heat));
  inner.addColorStop(1,rgb(ORANGE,0));
  g.save(); g.beginPath(); g.ellipse(cx,rim,panR*0.965,panRy*0.94,0,0,6.2832); g.clip();
  g.fillStyle=inner; g.fillRect(cx-panR,rim-panRy,panR*2,panRy*2); g.restore();
  /* ── the bean ── */
  const breath=still?0:Math.sin(t*1.15)*0.008+Math.sin(t*2.31)*0.003;
  const tilt=-0.13+(still?0:Math.sin(t*0.83)*0.022);
  paintBean(g,cx,beanCy+(still?0:Math.sin(t*1.15)*ryBase*0.012),
            ryBase*(1+breath),pv,{rot:tilt,pop:burst?burst.pop:0,seed:3.14});
  /* the front lip, painted over the bean, so it genuinely sits IN the pan */
  g.beginPath(); g.ellipse(cx,rim,panR,panRy,0,0,Math.PI);
  g.lineWidth=Math.max(7,panR*0.052); g.lineCap="round"; g.strokeStyle=irons; g.stroke();
  g.beginPath(); g.ellipse(cx,rim,panR,panRy,0,0,Math.PI);
  g.lineWidth=2.4*S; g.strokeStyle=ironk; g.stroke();
  g.beginPath(); g.ellipse(cx,rim+panR*0.008,panR*0.88,panRy*0.86,0,0.45,Math.PI-0.55);
  g.lineWidth=2.2*S; g.strokeStyle=rgb(mixc(NAVY,PAPER,0.5),0.5); g.stroke();
  /* ── the thermometer standing beside the pan ── */
  if(wide) drawThermo(g,Math.max(w*0.28,cx-panR-w*0.06),rim+panRy,h*0.46,tempAt(pv),S);
  /* ── heat squiggles, the cartoon way of saying hot ── */
  const sq=Math.round(2+heat*2);
  g.lineCap="round"; g.lineJoin="round";
  for(let i=0;i<sq;i++){
    const x0=cx+(i-(sq-1)/2)*ryBase*0.52;
    const len=RYnow*(0.30+0.22*heat)+ryBase*0.10;
    const y0=beanCy-RYnow*1.04;
    /* never let the heat rise into the headline's own space */
    const top=Math.max(y0-len,h*(wide?0.04:0.33));
    g.beginPath();
    for(let k=0;k<=14;k++){
      const u=k/14, y=lerp(y0,top,u);
      const x=x0+Math.sin(u*6.6+t*(still?0:2.1)+i*1.9)*ryBase*0.085*(0.3+u*0.9);
      k?g.lineTo(x,y):g.moveTo(x,y);
    }
    g.lineWidth=Math.max(2.4,4.2*S); g.strokeStyle=rgb(ORANGE,0.16+0.44*heat); g.stroke();
  }
  /* ── smoke past full city ── */
  const want=Math.round(smoothstep(0.76,1,pv)*26);
  if(!still && smoke.length<want && Math.random()<0.5)
    smoke.push({x:cx+(Math.random()-0.5)*ryBase*0.8,y:beanCy-RYnow*0.7,
                v:16+Math.random()*26,r:6+Math.random()*14,a:0,ph:Math.random()*9});
  for(let i=smoke.length-1;i>=0;i--){
    const s=smoke[i];
    if(!still){ s.y-=s.v*0.016; s.r+=0.28; s.a+=0.016; }
    const life=clamp01(1-s.a/1.0);
    if(life<=0||smoke.length>want+6){ smoke.splice(i,1); continue; }
    const x=s.x+Math.sin(s.a*2.6+s.ph)*22;
    const gg=g.createRadialGradient(x,s.y,0,x,s.y,s.r*3.1);
    gg.addColorStop(0,`rgba(84,76,72,${0.36*life})`); gg.addColorStop(1,"rgba(84,76,72,0)");
    g.fillStyle=gg; g.beginPath(); g.arc(x,s.y,s.r*3.1,0,6.2832); g.fill();
  }
  /* ── chaff thrown off at first crack ── */
  for(let i=chaff.length-1;i>=0;i--){
    const c=chaff[i];
    if(!still){ c.x+=c.vx*0.016; c.y+=c.vy*0.016; c.vy+=42*0.016; c.a+=0.016; c.rot+=c.spin*0.016; }
    if(c.a>1.5){ chaff.splice(i,1); continue; }
    g.save(); g.translate(c.x,c.y); g.rotate(c.rot);
    g.globalAlpha=clamp01(1.5-c.a)*0.85; g.fillStyle="#e6dcc0";
    g.beginPath(); g.ellipse(0,0,c.r,c.r*0.42,0,0,6.2832); g.fill();
    g.lineWidth=1; g.strokeStyle="rgba(120,100,78,.6)"; g.stroke();
    g.restore();
  }
  g.globalAlpha=1;
  /* ── the crack itself: cartoon rays ── */
  if(burst){
    const u=clamp01(burst.a/0.55);
    const rr=RYnow*(1.06+u*0.45);
    g.lineWidth=Math.max(2,3.6*S); g.lineCap="round";
    g.strokeStyle=rgb(burst.kind===1?ORANGE:hx("#8f3f10"),(1-u)*0.9);
    for(let i=0;i<burst.n;i++){
      const a=(i/burst.n)*6.2832+burst.seed;
      const x=cx+Math.cos(a)*rr*0.78, y=beanCy+Math.sin(a)*rr;
      g.beginPath();
      g.moveTo(x,y);
      g.lineTo(cx+Math.cos(a)*rr*0.78*(1+0.22+u*0.3),beanCy+Math.sin(a)*rr*(1+0.22+u*0.3));
      g.stroke();
    }
  }
}
/* ══ 6 · the taste ribbon ═════════════════════════════════════════════════ */
function drawStrip(){
  const L=LY.strip; if(!L||L.h<20) return;
  const g=open(L), {w,h}=L;
  const ws=NOTES.map(n=>Math.max(0.0008,n.f(pv)));
  const sum=ws.reduce((a,b)=>a+b,0);
  const bd=[0]; let acc=0;
  ws.forEach(v=>{acc+=v/sum; bd.push(acc*h);});
  const wob=(x,k)=>(k===0||k===NOTES.length)?0:
    Math.sin(x*0.0125+k*2.3)*3.0+Math.sin(x*0.031+k*5.1)*1.6;
  NOTES.forEach((n,i)=>{
    const hh=bd[i+1]-bd[i];
    if(hh<0.7) return;
    g.beginPath();
    for(let x=0;x<=w;x+=8) x?g.lineTo(x,bd[i]+wob(x,i)):g.moveTo(0,bd[i]+wob(0,i));
    g.lineTo(w,bd[i]+wob(w,i));
    for(let x=w;x>=0;x-=8) g.lineTo(x,bd[i+1]+wob(x,i+1));
    g.closePath();
    g.save(); g.clip();
    g.fillStyle=rgb(n.c); g.fillRect(0,bd[i]-8,w,hh+16);
    const gl=g.createLinearGradient(0,bd[i],0,bd[i+1]);
    gl.addColorStop(0,"rgba(255,246,228,.20)"); gl.addColorStop(1,"rgba(20,12,8,.16)");
    g.fillStyle=gl; g.fillRect(0,bd[i]-8,w,hh+16);
    if(PAT_DARK){ g.globalAlpha=0.28; g.fillStyle=PAT_DARK; g.fillRect(0,bd[i]-8,w,hh+16); g.globalAlpha=1; }
    g.restore();
    /* the boundary, inked */
    if(i>0){
      g.beginPath();
      for(let x=0;x<=w;x+=8) x?g.lineTo(x,bd[i]+wob(x,i)):g.moveTo(0,bd[i]+wob(0,i));
      g.lineWidth=1.4; g.strokeStyle="rgba(27,19,16,.35)"; g.stroke();
    }
    if(hh>21){
      g.font='500 12px "DM Mono",monospace';
      const lum=(n.c[0]*0.3+n.c[1]*0.59+n.c[2]*0.11);
      g.fillStyle=lum>150?"rgba(24,16,12,.86)":"rgba(250,244,232,.92)";
      g.textBaseline="middle";
      g.fillText(n.label.toUpperCase(),Math.max(14,w*0.022),(bd[i]+bd[i+1])/2);
      const pct=Math.round(ws[i]/sum*100);
      const tx=w-Math.max(14,w*0.022)-g.measureText(pct+"%").width;
      g.fillText(pct+"%",tx,(bd[i]+bd[i+1])/2);
    }
  });
}
/* ══ 7 · the roast curve, drawn to where you are ══════════════════════════ */
function drawCurve(){
  const L=LY.curve; if(!L||L.h<40) return;
  const g=open(L), {w,h}=L;
  const pl=Math.max(46,w*0.055), pr=Math.max(50,w*0.055), pt=24, pb=38;
  const x0=pl,x1=w-pr,y0=pt,y1=h-pb;
  const X=s=>x0+(s/T_TOT)*(x1-x0);
  const Y=T=>y1-((T-20)/(252-20))*(y1-y0);
  const wob=s=>Math.sin(s*0.021)*1.5+Math.sin(s*0.058)*0.8;
  /* the three phases as washes under the line */
  const phases=[[0,0.34,GREEN,"Drying"],[0.34,P_FC,GOLD,"Browning"],[P_FC,1,ORANGE,"Development"]];
  phases.forEach(([a,b,c,label])=>{
    const xa=X(timeAt(a)),xb=X(timeAt(b));
    const gl=g.createLinearGradient(0,y0,0,y1);
    gl.addColorStop(0,rgb(c,0.05)); gl.addColorStop(1,rgb(c,0.26));
    g.fillStyle=gl; g.fillRect(xa,y0,xb-xa,y1-y0);
    if(PAT_PAPER){ g.globalAlpha=0.5; g.fillStyle=PAT_PAPER; g.fillRect(xa,y0,xb-xa,y1-y0); g.globalAlpha=1; }
    g.font='400 10.5px "DM Mono",monospace'; g.fillStyle="rgba(27,19,16,.5)";
    g.textBaseline="top";
    if(xb-xa>62) g.fillText(label.toUpperCase(),xa+8,y1+8);
  });
  /* baseline + right scale */
  g.beginPath(); g.moveTo(0,y1); g.lineTo(w,y1);
  g.lineWidth=1; g.strokeStyle="rgba(27,19,16,.28)"; g.stroke();
  g.font='400 10.5px "DM Mono",monospace'; g.textBaseline="middle";
  [100,150,200,250].forEach(T=>{
    g.beginPath(); g.moveTo(x0,Y(T)); g.lineTo(x1,Y(T));
    g.lineWidth=1; g.strokeStyle="rgba(27,19,16,.11)"; g.stroke();
    g.fillStyle="rgba(27,19,16,.45)"; g.fillText(T+"°",x1+8,Y(T));
  });
  /* the curve — solid to where the roast has got, ghosted beyond */
  const path=(from,to)=>{
    g.beginPath();
    for(let i=0;i<=90;i++){
      const q=lerp(from,to,i/90), s=timeAt(q), y=Y(tempAt(q))+wob(s);
      i?g.lineTo(X(s),y):g.moveTo(X(s),y);
    }
  };
  g.lineCap="round"; g.lineJoin="round";
  g.setLineDash([3,7]); path(pv,1);
  g.lineWidth=2; g.strokeStyle="rgba(30,48,95,.34)"; g.stroke(); g.setLineDash([]);
  path(0,pv);
  g.lineWidth=6.5; g.strokeStyle=rgb(mixc(NAVY,PAPER,0.72),0.5); g.stroke();
  path(0,pv);
  g.lineWidth=3.2; g.strokeStyle=rgb(NAVY); g.stroke();
  /* the two cracks */
  [[P_FC,"First crack",ORANGE],[P_SC,"Second crack",hx("#7a2f0c")]].forEach(([q,label,c])=>{
    const x=X(timeAt(q)),y=Y(tempAt(q));
    const live=pv>=q-0.004;
    g.lineWidth=live?2.6:1.6; g.strokeStyle=rgb(c,live?0.95:0.32);
    for(let i=0;i<7;i++){
      const a=i/7*6.2832+0.4, r1=8, r2=live?17:12;
      g.beginPath(); g.moveTo(x+Math.cos(a)*r1,y+Math.sin(a)*r1);
      g.lineTo(x+Math.cos(a)*r2,y+Math.sin(a)*r2); g.stroke();
    }
    g.font='500 10.5px "DM Mono",monospace'; g.textBaseline="bottom";
    g.fillStyle=rgb(c,live?0.95:0.45);
    g.fillText(label.toUpperCase()+"  "+Math.round(tempAt(q))+"°",x-4,y-22);
  });
  /* where you are: a small bean sitting on the line */
  const cxp=X(timeAt(pv)),cyp=Y(tempAt(pv));
  g.beginPath(); g.moveTo(cxp,y1); g.lineTo(cxp,cyp+12);
  g.lineWidth=1.4; g.strokeStyle=rgb(ORANGE,0.6); g.setLineDash([2,4]); g.stroke(); g.setLineDash([]);
  paintBean(g,cxp,cyp,Math.min(19,h*0.062),pv,{rot:-0.2,seed:2.2});
}
/* ══ 8 · why — two washes crossing, overprinted ═══════════════════════════ */
function drawCross(){
  const L=LY.cross; if(!L||L.h<40) return;
  const g=open(L), {w,h}=L;
  const pl=Math.max(20,w*0.03), pr=Math.max(20,w*0.03), pt=26, pb=36;
  const x0=pl,x1=w-pr,y0=pt,y1=h-pb;
  const X=q=>x0+q*(x1-x0), Y=v=>y1-clamp01(v)*(y1-y0);
  const wash=(fn,c,label,side)=>{
    g.beginPath(); g.moveTo(x0,y1);
    for(let i=0;i<=120;i++){
      const q=i/120;
      g.lineTo(X(q),Y(fn(q))+Math.sin(q*41)*1.6+Math.sin(q*97)*0.9);
    }
    g.lineTo(x1,y1); g.closePath();
    g.save();
    g.globalCompositeOperation="multiply";          /* overprint, from land-chroma */
    g.fillStyle=rgb(c,0.62); g.fill();
    g.restore();
    g.save(); g.clip();
    if(PAT_DARK){ g.globalAlpha=0.22; g.fillStyle=PAT_DARK; g.fillRect(0,0,w,h); }
    g.restore();
    g.beginPath();
    for(let i=0;i<=120;i++){ const q=i/120;
      const y=Y(fn(q))+Math.sin(q*41)*1.6+Math.sin(q*97)*0.9;
      i?g.lineTo(X(q),y):g.moveTo(X(q),y); }
    g.lineWidth=2; g.strokeStyle=rgb(mixc(c,INK,0.4),0.75); g.stroke();
    g.font='500 11px "DM Mono",monospace'; g.textBaseline="middle";
    g.fillStyle=rgb(mixc(c,INK,0.45));
    const q=side, tx=X(q), ty=Y(fn(q))-14;
    g.fillText(label.toUpperCase(),clamp(tx-g.measureText(label).width/2,6,w-120),clamp(ty,14,y1-8));
  };
  wash(acidAt,GOLD,"Fruit acid",0.30);
  wash(brownAt,hx("#a8622a"),"Browned sugar",0.90);
  wash(carbonAt,hx("#332b28"),"Carbon",0.985);
  /* the crossing */
  let cq=0.5,best=9;
  for(let i=0;i<=400;i++){const q=i/400,d=Math.abs(acidAt(q)-brownAt(q)); if(d<best){best=d;cq=q;}}
  const cxs=X(cq),cys=Y(acidAt(cq));
  g.beginPath(); g.moveTo(cxs,y0-4); g.lineTo(cxs,y1);
  g.lineWidth=1.3; g.strokeStyle="rgba(27,19,16,.34)"; g.setLineDash([3,5]); g.stroke(); g.setLineDash([]);
  g.beginPath(); g.arc(cxs,cys,5,0,6.2832); g.fillStyle=rgb(INK); g.fill();
  g.font='500 10.5px "DM Mono",monospace'; g.textBaseline="bottom"; g.fillStyle="rgba(27,19,16,.72)";
  g.fillText("THE CROSSING",clamp(cxs-42,6,w-110),y0+2);
  /* baseline + the roast axis */
  g.beginPath(); g.moveTo(0,y1); g.lineTo(w,y1);
  g.lineWidth=1; g.strokeStyle="rgba(27,19,16,.3)"; g.stroke();
  g.font='400 10.5px "DM Mono",monospace'; g.textBaseline="top"; g.fillStyle="rgba(27,19,16,.45)";
  g.fillText("GREEN",x0,y1+9);
  const rt="BURNT"; g.fillText(rt,x1-g.measureText(rt).width,y1+9);
  const fcx=X(P_FC);
  g.beginPath(); g.moveTo(fcx,y1); g.lineTo(fcx,y1+6); g.lineWidth=1.2;
  g.strokeStyle=rgb(ORANGE,0.8); g.stroke();
  g.fillStyle=rgb(ORANGE,0.9); g.fillText("FIRST CRACK",clamp(fcx-34,x0+52,w-92),y1+9);
  /* you are here */
  const px=X(pv);
  g.beginPath(); g.moveTo(px,y0-10); g.lineTo(px,y1);
  g.lineWidth=2; g.strokeStyle=rgb(ORANGE,0.9); g.stroke();
  g.beginPath(); g.arc(px,y0-10,4.5,0,6.2832); g.fillStyle=rgb(ORANGE); g.fill();
}
/* ══ 9 · the four bags ════════════════════════════════════════════════════ */
const shelf=$("shelf");
ROASTS.forEach((r,i)=>{
  const b=document.createElement("button");
  b.type="button"; b.className="bag"; b.setAttribute("aria-pressed","false");
  b.innerHTML=
    '<canvas class="bagart" aria-hidden="true"></canvas>'+
    '<span class="bagname">'+r.name+'</span>'+
    '<span class="bagmeta">'+r.origin+'<br><b>'+r.alt+'</b> · '+r.process+
      '<br><b>'+r.level+'</b> · '+r.band+'<br>'+r.notes.join(" · ")+'</span>'+
    '<span class="bagprice">A$'+r.price.toFixed(2)+' / 250 g <i class="bagfound" data-f="'+i+'"></i></span>';
  b.addEventListener("click",()=>{ arm(); target=(r.lo+r.hi)/2; });
  shelf.appendChild(b);
  bagCv.push(b.querySelector(".bagart"));
});
const bagEls=[...shelf.querySelectorAll(".bag")];
function drawBag(i){
  const L=LYB[i]; if(!L||L.h<20) return;
  const g=open(L), {w,h}=L;
  const r=ROASTS[i], q=(r.lo+r.hi)/2, col=beanColour(q);
  const cx=w*0.5, bw=Math.min(w*0.82,h*0.62), bh=h*0.86, by=h*0.97;
  const kraft=hx("#c8a273");
  const wob=(x,k)=>Math.sin(x*0.06+k)*1.4;
  /* body */
  g.beginPath();
  g.moveTo(cx-bw/2,by);
  g.lineTo(cx-bw/2*0.93,by-bh);
  g.lineTo(cx+bw/2*0.93,by-bh);
  g.lineTo(cx+bw/2,by);
  g.closePath();
  g.save(); g.clip();
  const gl=g.createLinearGradient(cx-bw/2,0,cx+bw/2,0);
  gl.addColorStop(0,rgb(mixc(kraft,[255,245,225],0.30)));
  gl.addColorStop(0.42,rgb(kraft));
  gl.addColorStop(1,rgb(mixc(kraft,[70,44,22],0.30)));
  g.fillStyle=gl; g.fillRect(0,0,w,h);
  if(PAT_PAPER){ g.globalAlpha=0.85; g.fillStyle=PAT_PAPER; g.fillRect(0,0,w,h); g.globalAlpha=1; }
  /* the roast band */
  const byT=by-bh*0.60, bhh=bh*0.34;
  g.fillStyle=rgb(col); g.fillRect(cx-bw,byT,bw*2,bhh);
  if(PAT_DARK){ g.globalAlpha=0.3; g.fillStyle=PAT_DARK; g.fillRect(cx-bw,byT,bw*2,bhh); g.globalAlpha=1; }
  g.restore();
  /* fold at the top */
  g.beginPath();
  g.moveTo(cx-bw/2*0.93,by-bh);
  g.lineTo(cx+bw/2*0.93,by-bh);
  g.lineTo(cx+bw/2*0.99,by-bh-h*0.075);
  g.lineTo(cx-bw/2*0.99,by-bh-h*0.075);
  g.closePath();
  g.fillStyle=rgb(mixc(kraft,[80,52,28],0.22)); g.fill();
  g.lineWidth=2; g.strokeStyle="rgba(40,26,16,.8)"; g.stroke();
  /* crimp */
  g.lineWidth=1.3; g.strokeStyle="rgba(40,26,16,.45)";
  for(let k=1;k<7;k++){ const x=cx-bw/2*0.99+(bw*0.99/7)*k;
    g.beginPath(); g.moveTo(x,by-bh-h*0.072); g.lineTo(x+2,by-bh+1); g.stroke(); }
  /* a small bean stamped on the band */
  paintBean(g,cx,byT+bhh*0.5,Math.min(bhh*0.42,bw*0.24),q,{rot:-0.22,seed:1.7+i});
  /* outline */
  g.beginPath();
  g.moveTo(cx-bw/2,by); g.lineTo(cx-bw/2*0.93,by-bh);
  g.lineTo(cx+bw/2*0.93,by-bh); g.lineTo(cx+bw/2,by); g.closePath();
  g.lineWidth=2.4; g.strokeStyle="rgba(34,22,14,.9)"; g.stroke();
  /* level, stencilled */
  g.font='500 10.5px "DM Mono",monospace'; g.textBaseline="alphabetic";
  g.fillStyle="rgba(40,26,16,.8)";
  const t=r.level.toUpperCase();
  g.fillText(t,cx-g.measureText(t).width/2,by-bh*0.14);
  /* shelf shadow, drawn as a line not a CSS shadow */
  g.beginPath(); g.moveTo(cx-bw*0.62,by+1); g.lineTo(cx+bw*0.62,by+1);
  g.lineWidth=2.2; g.strokeStyle="rgba(27,19,16,.22)"; g.stroke();
}
/* ══ 10 · the roastery ════════════════════════════════════════════════════ */
const works=[];
function drawWorks(tRaw){
  const L=LY.works; if(!L||L.h<40) return;
  const t=still?0:tRaw;
  const g=open(L), {w,h}=L;
  const heat=clamp01((tempAt(pv)-22)/224);
  const S=Math.min(w/470,h/262);
  const ox=(w-450*S)/2, oy=h-10;
  const chx=ox+206*S, chy=oy-244*S;
  g.beginPath(); g.moveTo(0,oy); g.lineTo(w,oy);
  g.lineWidth=1.4; g.strokeStyle="rgba(27,19,16,.30)"; g.stroke();
  g.save(); g.translate(ox,oy); g.scale(S,S);
  const ink="rgba(20,14,10,.9)";
  const iron=rgb(mixc(NAVY,INK,0.22)), ironD=rgb(mixc(NAVY,INK,0.58)),
        ironL=rgb(mixc(NAVY,PAPER,0.34));
  g.lineJoin="round"; g.lineCap="round"; g.lineWidth=3;
  /* chimney, behind everything */
  g.beginPath(); g.rect(196,-234,20,86); g.fillStyle=ironD; g.fill();
  g.strokeStyle=ink; g.stroke();
  g.beginPath(); g.rect(188,-244,36,12); g.fillStyle=iron; g.fill(); g.stroke();
  /* hopper */
  g.beginPath(); g.moveTo(70,-200); g.lineTo(164,-200); g.lineTo(142,-152); g.lineTo(92,-152);
  g.closePath(); g.fillStyle=iron; g.fill(); g.strokeStyle=ink; g.stroke();
  g.beginPath(); g.moveTo(70,-200); g.lineTo(164,-200);
  g.lineWidth=5; g.strokeStyle=ironD; g.stroke(); g.lineWidth=3;
  /* chassis */
  g.beginPath(); g.moveTo(32,-152); g.lineTo(198,-152); g.lineTo(188,0); g.lineTo(42,0);
  g.closePath(); g.fillStyle=iron; g.fill(); g.strokeStyle=ink; g.stroke();
  g.save(); g.clip();
  g.globalAlpha=.28; g.fillStyle=ironL; g.fillRect(150,-152,52,152); g.globalAlpha=1;
  g.restore();
  /* the drum face and its door, lit from inside */
  g.beginPath(); g.arc(106,-100,60,0,6.2832); g.fillStyle=ironD; g.fill();
  g.lineWidth=3.6; g.strokeStyle=ink; g.stroke();
  const dg=g.createRadialGradient(106,-100,2,106,-100,38);
  dg.addColorStop(0,rgb(mixc(GOLD,ORANGE,0.30),0.30+0.66*heat));
  dg.addColorStop(1,rgb(mixc(ORANGE,INK,0.66),0.92));
  g.beginPath(); g.arc(106,-100,38,0,6.2832); g.fillStyle=dg; g.fill();
  g.lineWidth=3; g.strokeStyle=ink; g.stroke();
  g.strokeStyle="rgba(20,14,10,.6)";
  [-17,0,17].forEach(dx=>{
    const k=Math.sqrt(Math.max(0,38*38-dx*dx))-4;
    g.beginPath(); g.moveTo(106+dx,-100-k); g.lineTo(106+dx,-100+k); g.stroke();
  });
  g.beginPath(); g.arc(106,-100,50,-0.55,0.55);
  g.lineWidth=6; g.strokeStyle=iron; g.stroke();
  g.lineWidth=2.4; g.strokeStyle=ink; g.stroke();
  /* the burner hatch */
  g.beginPath(); g.rect(58,-36,64,30); g.fillStyle="rgba(18,12,9,.88)"; g.fill();
  g.lineWidth=3; g.strokeStyle=ink; g.stroke();
  const fh=22*(0.32+0.68*heat);
  const lick=(x0,ww,hh,col)=>{
    g.beginPath(); g.moveTo(x0,-8);
    for(let i=0;i<=16;i++){ const u=i/16;
      g.lineTo(x0+ww*u,-8-hh*Math.pow(Math.sin(Math.PI*u),0.7)*(1+Math.sin(u*9+t*3)*0.13)); }
    g.closePath(); g.fillStyle=col; g.fill();
  };
  lick(64,52,fh,rgb(GOLD)); lick(76,28,fh*0.62,rgb(ORANGE));
  /* the cooling tray, holding what you just roasted */
  g.lineWidth=6; g.strokeStyle=ironD;
  g.beginPath(); g.moveTo(240,-62); g.lineTo(248,0); g.moveTo(328,-62); g.lineTo(320,0); g.stroke();
  g.beginPath(); g.ellipse(284,-62,54,15,0,0,6.2832); g.fillStyle=iron; g.fill();
  g.lineWidth=3; g.strokeStyle=ink; g.stroke();
  g.beginPath(); g.ellipse(284,-66,45,10,0,0,6.2832); g.fillStyle=rgb(mixc(NAVY,INK,0.62)); g.fill();
  const bc=beanColour(pv), br=rng(41);
  for(let i=0;i<9;i++){
    const a=br()*6.2832, rr=Math.sqrt(br());
    g.save(); g.translate(284+Math.cos(a)*40*rr,-67+Math.sin(a)*7*rr); g.rotate(br()*3);
    g.beginPath(); g.ellipse(0,0,5.2,3.4,0,0,6.2832);
    g.fillStyle=rgb(bc); g.fill(); g.lineWidth=1.4; g.strokeStyle="rgba(20,14,10,.75)"; g.stroke();
    g.restore();
  }
  /* sacks of green coffee waiting their turn */
  const sack=(sx,sw2,sh2,tone)=>{
    g.beginPath();
    g.moveTo(sx-sw2,0); g.quadraticCurveTo(sx-sw2*1.12,-sh2*0.72,sx-sw2*0.5,-sh2);
    g.lineTo(sx+sw2*0.5,-sh2); g.quadraticCurveTo(sx+sw2*1.12,-sh2*0.72,sx+sw2,0);
    g.closePath();
    g.fillStyle=rgb(mixc(hx("#cbb58c"),[78,58,34],tone)); g.fill();
    g.lineWidth=3; g.strokeStyle="rgba(44,30,16,.85)"; g.stroke();
    g.beginPath(); g.moveTo(sx-sw2*0.42,-sh2*0.56); g.lineTo(sx+sw2*0.42,-sh2*0.56);
    g.lineWidth=2.2; g.strokeStyle="rgba(44,30,16,.4)"; g.stroke();
  };
  sack(398,34,58,0.10); sack(356,27,42,0.28);
  g.restore();
  /* smoke off the chimney — thicker the darker the roast */
  const want=Math.round(3+smoothstep(0.30,1,pv)*14);
  if(!still&&works.length<want&&Math.random()<0.55)
    works.push({y:chy,r:5+Math.random()*7,a:0,ph:Math.random()*9,v:16+Math.random()*22});
  for(let i=works.length-1;i>=0;i--){
    const s=works[i];
    if(!still){ s.y-=s.v*0.016; s.r+=0.34; s.a+=0.017; }
    const life=clamp01(1-s.a);
    if(life<=0||works.length>want+5){ works.splice(i,1); continue; }
    const x=chx+Math.sin(s.a*3.1+s.ph)*22*S+s.a*20*S;
    const gr=g.createRadialGradient(x,s.y,0,x,s.y,s.r*2.7);
    gr.addColorStop(0,`rgba(92,84,80,${0.30*life})`); gr.addColorStop(1,"rgba(92,84,80,0)");
    g.fillStyle=gr; g.beginPath(); g.arc(x,s.y,s.r*2.7,0,6.2832); g.fill();
  }
}
/* ══ 11 · the rail ════════════════════════════════════════════════════════ */
const rail=$("rail"), head=$("head"), zonesWrap=$("zones"), marksWrap=$("marks");
/* 62% of the roast happens before the bean is coffee. The rail says so. */
const PHASES=[[0,0.34,"#3f7a2e","Drying"],[0.34,P_FC,"#d99d21","Browning"]];
const phaseEls=PHASES.map(([a,b,c,label])=>{
  const el=document.createElement("div");
  el.className="zone pre";
  el.style.left=(a*100)+"%"; el.style.width=((b-a)*100)+"%"; el.style.color=c;
  el.innerHTML='<i></i><b>'+label+'</b>';
  zonesWrap.appendChild(el);
  return {el,a,b};
});
const zoneEls=ROASTS.map((r,i)=>{
  const el=document.createElement("div");
  el.className="zone";
  el.style.left=(r.lo*100)+"%"; el.style.width=((r.hi-r.lo)*100)+"%";
  el.style.color=hex(beanColour((r.lo+r.hi)/2));
  el.innerHTML='<i></i><b>'+r.level+'</b>';
  zonesWrap.appendChild(el);
  return el;
});
[[P_FC,"1st crack"],[P_SC,"2nd crack"]].forEach(([q,label])=>{
  const el=document.createElement("div");
  el.className="mk"; el.style.left=(q*100)+"%";
  el.innerHTML="<b>"+label+"</b>";
  marksWrap.appendChild(el);
});
/* ══ 12 · state ═══════════════════════════════════════════════════════════ */
const still=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let target=0.02, pv=0.02;
let armed=false, drag=null, lastX=0, dwell=0, sel=-1, lastZone=-2;
const found=ROASTS.map(()=>false);
let foundCount=0;
const heroSay=$("heroSay"), hint=$("hint"), crackEl=$("crack");
const bTemp=$("bTemp"), bTime=$("bTime"), bPhase=$("bPhase");
const rTime=$("rTime"), rTemp=$("rTemp"), rDev=$("rDev"), rRatio=$("rRatio");
const tasteWords=$("tasteWords"), tasteSay=$("tasteSay"), whySay=$("whySay");
const priceNum=$("priceNum"), priceSub=$("priceSub");
const orderName=$("orderName"), orderMeta=$("orderMeta"), addBtn=$("addBtn");
const tallyTop=$("tallyTop"), tallyFoot=$("tallyFoot");
const root=document.documentElement;
/* a roast is shareable: ?roast=0.74 opens on that roast, and landing in a
   band rewrites the address so you can send someone the one you made */
(function fromUrl(){
  const q=parseFloat(new URLSearchParams(location.search).get("roast"));
  if(isFinite(q)){ target=clamp01(q); pv=target; armed=true; hint.classList.add("gone"); }
})();
function arm(){ if(armed) return; armed=true; hint.classList.add("gone"); }
function phaseOf(p){
  if(Math.abs(p-P_FC)<0.014) return "First crack";
  if(Math.abs(p-P_SC)<0.014) return "Second crack";
  if(tempAt(p)<150) return "Drying";
  if(p<P_FC) return "Browning";
  if(p<P_SC) return "Development";
  if(p<0.952) return "Past second";
  return "Burnt";
}
function topNotes(p){
  return NOTES.map((n,i)=>({n,v:n.f(p)}))
    .sort((a,b)=>b.v-a.v).slice(0,3)
    .filter(o=>o.v>0.06).map(o=>o.n.label);
}
function tasteLine(p){
  if(p<0.40) return "Nothing has browned yet — there is nothing to taste but the seed.";
  if(p<P_FC) return "Sugars are browning, but the bean has not opened. Still not drinkable.";
  if(p<0.70) return "The fruit acid survived. This is the sourness people call brightness.";
  if(p<0.79) return "Acid and caramel in the same cup — the reason this band sells the most.";
  if(p<0.865) return "The acids are mostly gone. What is left is browned sugar: cocoa, cedar, nut.";
  if(p<0.952) return "Oils are on the surface now. You taste the roast rather than the farm.";
  return "Past everything worth keeping. Ash, and a flat bitterness.";
}
function whyLine(p){
  if(p<P_FC) return "Every acid the farm grew is still in there — and almost none of the browned sugar.";
  if(p<0.722) return "You stopped before the crossing. Acid still outweighs browning: fruit, sharp, sweet at the edges.";
  if(p<0.878) return "Past the crossing. Browned sugar now outweighs the acid, which is chocolate and nut in the cup.";
  if(p<0.952) return "The acid is effectively gone and carbon has started. This is where origin stops mattering.";
  return "Carbon dominates. Every difference between these four farms has been burnt out of the cup.";
}
function syncState(){
  const T=tempAt(pv), s=timeAt(pv), z=zoneAt(pv);
  const col=beanColour(pv);
  root.style.setProperty("--hot",hex(col));
  bTemp.textContent=Math.round(T)+"°C";
  bTime.textContent=mmss(s);
  bPhase.textContent=phaseOf(pv);
  rTemp.textContent=Math.round(T)+"°C";
  rTime.textContent=mmss(s);
  if(pv>P_FC){
    const dev=s-T_FC;
    rDev.textContent=mmss(dev);
    rRatio.textContent=Math.round(dev/s*100)+"%";
  } else { rDev.textContent="—"; rRatio.textContent="—"; }
  heroSay.innerHTML =
    pv>0.952 ? "Burnt through — <b>we would not sell you this</b>" :
    z>=0     ? ROASTS[z].name+" — <b>"+ROASTS[z].level+"</b> · A$"+ROASTS[z].price.toFixed(2) :
    pv<0.40  ? "Still drying — <b>not coffee yet</b>" :
    pv<P_FC  ? "Browning — <b>the sugars are turning</b>" :
               "Just cracked — <b>keep going</b>";
  const tn=topNotes(pv);
  tasteWords.innerHTML = tn.length ? tn.join(' <i>·</i> ') : "—";
  tasteSay.textContent=tasteLine(pv);
  whySay.textContent=whyLine(pv);
  zoneEls.forEach((el,i)=>el.classList.toggle("on",i===z));
  phaseEls.forEach(o=>o.el.classList.toggle("on",pv>=o.a&&pv<o.b));
  if(z!==lastZone){
    lastZone=z;
    bagEls.forEach((b,i)=>{ b.classList.toggle("on",i===z); b.setAttribute("aria-pressed",i===z?"true":"false"); });
    if(z>=0){
      sel=z;
      const r=ROASTS[z];
      priceNum.textContent=r.price.toFixed(2);
      priceSub.textContent="250 g whole bean · "+r.level+" · "+r.process+" · "+r.alt;
      orderName.textContent=r.name+" — "+r.level;
      orderMeta.textContent=r.origin+" · "+r.notes.join(" · ");
      addBtn.disabled=false; addBtn.classList.remove("done"); addBtn.textContent="Add 250 g";
      try{ history.replaceState(null,"","?roast="+((r.lo+r.hi)/2).toFixed(3)); }catch(e){}
    }
    for(let i=0;i<4;i++) drawBag(i);
  }
  rail.setAttribute("aria-valuenow",String(Math.round(pv*1000)));
  rail.setAttribute("aria-valuetext",
    Math.round(T)+" degrees at "+mmss(s)+", "+phaseOf(pv)+
    (z>=0?" — "+ROASTS[z].name+", "+ROASTS[z].level+" roast, A$"+ROASTS[z].price.toFixed(2):""));
  head.style.transform="translateX("+(pv*rail.clientWidth).toFixed(2)+"px)";
}
function markFound(i){
  found[i]=true; foundCount++;
  zoneEls[i].classList.add("found");
  const dot=shelf.querySelector('[data-f="'+i+'"]'); if(dot) dot.textContent=" ● roasted";
  const txt=foundCount+" / 4 roasted";
  tallyTop.textContent=txt; tallyFoot.textContent=txt;
}
/* ══ 13 · input ═══════════════════════════════════════════════════════════ */
function fromRail(e){
  const r=rail.getBoundingClientRect();
  target=clamp01((e.clientX-r.left)/r.width);
}
/* On a mouse the bean takes the drag straight away. On touch it waits until
   the gesture is clearly sideways, so a thumb sweeping UP the page still
   scrolls instead of being eaten by the roaster. */
let pending=null;
CV.pan.addEventListener("pointerdown",e=>{
  if(e.pointerType==="touch"){ pending={x:e.clientX,y:e.clientY,id:e.pointerId}; return; }
  drag="pan"; lastX=e.clientX; arm();
  try{ CV.pan.setPointerCapture(e.pointerId); }catch(err){}
});
rail.addEventListener("pointerdown",e=>{
  drag="rail"; arm(); fromRail(e);
  try{ rail.setPointerCapture(e.pointerId); }catch(err){}
});
window.addEventListener("pointermove",e=>{
  if(pending){
    const dx=e.clientX-pending.x, dy=e.clientY-pending.y;
    if(Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)){ pending=null; return; }   // it is a scroll
    if(Math.abs(dx)>7){
      drag="pan"; lastX=pending.x; arm();
      try{ CV.pan.setPointerCapture(pending.id); }catch(err){}
      pending=null;
    } else return;
  }
  if(!drag) return;
  if(drag==="pan"){
    target=clamp01(target+(e.clientX-lastX)/Math.max(320,window.innerWidth*0.62));
    lastX=e.clientX;
  } else fromRail(e);
});
function endDrag(){
  pending=null;
  if(!drag) return;
  drag=null;
  const z=zoneAt(target);                       /* settle into the band you are in */
  if(z>=0){
    const c=(ROASTS[z].lo+ROASTS[z].hi)/2;
    if(Math.abs(target-c)<(ROASTS[z].hi-ROASTS[z].lo)*0.42) target=c;
  }
}
window.addEventListener("pointerup",endDrag);
window.addEventListener("pointercancel",endDrag);
/* only a drag that began on the bean or the rail eats the touch */
document.addEventListener("touchmove",e=>{ if(drag) e.preventDefault(); },{passive:false});
rail.addEventListener("keydown",e=>{
  const step=e.shiftKey?0.04:0.008;
  let ok=true;
  if(e.key==="ArrowRight"||e.key==="ArrowUp") target=clamp01(target+step);
  else if(e.key==="ArrowLeft"||e.key==="ArrowDown") target=clamp01(target-step);
  else if(e.key==="PageUp"){ const z=zoneAt(target); target=(ROASTS[Math.min(3,z<0?0:z+1)].lo+ROASTS[Math.min(3,z<0?0:z+1)].hi)/2; }
  else if(e.key==="PageDown"){ const z=zoneAt(target); target=(ROASTS[Math.max(0,z<0?0:z-1)].lo+ROASTS[Math.max(0,z<0?0:z-1)].hi)/2; }
  else if(e.key==="Home") target=0;
  else if(e.key==="End") target=1;
  else ok=false;
  if(ok){ arm(); e.preventDefault(); }
});
addBtn.addEventListener("click",()=>{
  if(sel<0) return;
  addBtn.classList.add("done");
  addBtn.textContent="Added · A$"+ROASTS[sel].price.toFixed(2);
  clearTimeout(addBtn._t);
  addBtn._t=setTimeout(()=>{ addBtn.classList.remove("done"); addBtn.textContent="Add 250 g"; },2000);
});
/* ══ 14 · loop ════════════════════════════════════════════════════════════ */
let last=performance.now(), crackTimer=0, paintOnce=true;
function fireCrack(kind){
  burst={a:0,pop:0,n:kind===1?10:14,seed:Math.random()*6,kind};
  crackEl.textContent=kind===1?"First crack — it opens":"Second crack — oil comes out";
  crackEl.classList.add("on");
  clearTimeout(crackTimer);
  crackTimer=setTimeout(()=>crackEl.classList.remove("on"),1500);
  if(kind===1){
    const r=rng(Date.now()&0xffff);
    /* chaff leaves the EDGE of the bean — spawned inside its outline it just
       looks like grains of rice stuck to the surface */
    for(let i=0;i<18;i++){
      const a=r()*6.2832;
      chaff.push({x:beanPos.x+Math.cos(a)*beanPos.r*0.78,y:beanPos.y+Math.sin(a)*beanPos.r*0.98,
        vx:Math.cos(a)*(90+r()*180),vy:-70-r()*190,r:2.5+r()*3.6,a:0,rot:r()*6,spin:(r()-0.5)*9});
    }
  }
}
function frame(now){
  const dt=Math.min((now-last)/1000,0.05); last=now;
  const t=now/1000;
  const prev=pv;
  pv+=(target-pv)*(1-Math.exp(-dt*(still?26:8.5)));
  if(Math.abs(target-pv)<0.00012) pv=target;
  if(prev<P_FC&&pv>=P_FC) fireCrack(1);
  if(prev<P_SC&&pv>=P_SC) fireCrack(2);
  if(burst){
    burst.a+=dt;
    burst.pop=Math.sin(clamp01(burst.a/0.30)*Math.PI)*(burst.kind===1?0.075:0.04);
    if(burst.a>0.62) burst=null;
  }
  const z=zoneAt(pv);
  if(armed&&z>=0&&Math.abs(target-pv)<0.004){
    dwell+=dt;
    if(dwell>0.45&&!found[z]) markFound(z);
  } else dwell=0;
  const changed=(pv!==prev)||!!burst;
  if(changed) syncState();
  if(changed||!still){ drawStrip(); drawCurve(); drawCross(); }
  if(changed||!still||paintOnce){ drawStage(t); drawWorks(t); paintOnce=false; }
  requestAnimationFrame(frame);
}
/* ══ 15 · boot ════════════════════════════════════════════════════════════ */
function measure(){
  /* the hero fills exactly one screen at every width, so the top frame's real
     height has to be measured rather than guessed at in the stylesheet */
  root.style.setProperty("--top",document.querySelector(".topframe").offsetHeight+"px");
  for(const k in CV) LY[k]=fitCanvas(CV[k]);
  bagCv.forEach((cv,i)=>LYB[i]=fitCanvas(cv));
  const g=LY.pan.g;
  PAT_DARK=g.createPattern(TILE_DARK,"repeat");
  PAT_LIGHT=g.createPattern(TILE_LIGHT,"repeat");
  PAT_PAPER=g.createPattern(TILE_PAPER,"repeat");
  for(let i=0;i<4;i++) drawBag(i);
  drawStrip(); drawCurve(); drawCross();
  syncState();
}
/* paper grain, made once */
(function grain(){
  const c=document.createElement("canvas"); c.width=c.height=128;
  const g=c.getContext("2d"), im=g.createImageData(128,128), r=rng(7);
  /* warm, not grey — a grey multiply layer pulls the whole page's colour down */
  for(let i=0;i<im.data.length;i+=4){
    const v=228+Math.floor(r()*27);
    im.data[i]=Math.min(255,v+4); im.data[i+1]=v; im.data[i+2]=v-8; im.data[i+3]=255;
  }
  g.putImageData(im,0,0);
  $("grain").style.backgroundImage="url("+c.toDataURL()+")";
})();
window.addEventListener("resize",()=>{ measure(); paintOnce=true; });
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ measure(); paintOnce=true; });
measure();
requestAnimationFrame(frame);
})();
