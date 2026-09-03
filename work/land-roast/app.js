(() => {
"use strict";
/* ══ 1 · the coffee ═══════════════════════════════════════════════════════ */
const ROASTS = [
  { name:"Kamwangi AB", origin:"Kenya · Kirinyaga", alt:"1,750 m", process:"Washed",
    level:"City", price:26.00, lo:0.628, hi:0.706,
    notes:["Blackcurrant","Grapefruit","Cane sugar"] },
  { name:"Finca La Soledad", origin:"Guatemala · Huehuetenango", alt:"1,580 m", process:"Washed",
    level:"City+", price:22.50, lo:0.706, hi:0.782,
    notes:["Red apple","Milk chocolate","Almond"] },
  { name:"Situmorang", origin:"Indonesia · Lintong, Sumatra", alt:"1,340 m", process:"Wet-hulled",
    level:"Full City", price:21.00, lo:0.782, hi:0.864,
    notes:["Cedar","Dark cocoa","Tobacco leaf"] },
  { name:"Rua Velha", origin:"Brazil · Cerrado Mineiro", alt:"1,050 m", process:"Natural",
    level:"French", price:19.50, lo:0.864, hi:0.948,
    notes:["Burnt sugar","Walnut","Pipe smoke"] },
];
const P_FC = 0.620, P_SC = 0.864;
const T_FC = 450, T_TOT = 780;
const TEMP = [[0,22],[0.10,88],[0.22,124],[0.34,150],[0.46,172],[0.56,188],
              [0.62,196],[0.70,205],[0.78,214],[0.864,224],[0.93,234],[1,246]];
const BEAN = [[0,"#8d9657"],[0.17,"#c6bd88"],[0.31,"#dcb65c"],[0.47,"#c88f43"],
              [0.62,"#ab6a30"],[0.74,"#8c4b23"],[0.82,"#713718"],[0.90,"#4b2513"],
              [0.96,"#301a0e"],[1,"#231813"]];
/* ══ 2 · small maths ══════════════════════════════════════════════════════ */
const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
const clamp01=v=>clamp(v,0,1);
const lerp=(a,b,t)=>a+(b-a)*t;
const smoothstep=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};
const rng=s=>{let x=(s*2654435761)>>>0;return()=>((x=(x*1664525+1013904223)>>>0)/4294967296);};
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
/* the chemistry — two things heat does in opposite directions, plus what is left */
const acidAt   = p=>1/(1+Math.exp((p-0.722)/0.052));
const brownAt  = p=>(1/(1+Math.exp(-(p-0.640)/0.078)))*(1-0.42*smoothstep(0.925,1,p));
const carbonAt = p=>smoothstep(0.878,1,p);
const PAPER=hx("#f4f1eb"), INK=hx("#1b1310"), ORANGE=hx("#ed5a14"),
      GOLD=hx("#d99d21"), NAVY=hx("#16305f"), CREAM=hx("#f6ead2"),
      COCOA=hx("#6b3a1e"), KRAFT=hx("#c8a273"), JUTE=hx("#c2ab7e");
function zoneAt(p){
  for(let i=0;i<ROASTS.length;i++){
    const r=ROASTS[i];
    if(p>=r.lo && (i===ROASTS.length-1 ? p<=r.hi : p<r.hi)) return i;
  }
  return -1;
}
function phaseOf(p){
  if(Math.abs(p-P_FC)<0.012) return "first crack";
  if(Math.abs(p-P_SC)<0.012) return "second crack";
  if(tempAt(p)<150) return "drying";
  if(p<P_FC) return "browning";
  if(p<P_SC) return "development";
  if(p<0.952) return "past second";
  return "burnt";
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
/* a hand-cut edge: never actually straight (borrowed from the FOLDAWAY build) */
function wobLine(g,x1,y1,x2,y2,r,amp){
  const dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy)||1;
  const n=Math.max(2,Math.round(len/26)), ux=-dy/len, uy=dx/len;
  g.moveTo(x1,y1);
  for(let i=1;i<=n;i++){
    const t=i/n, j=i===n?0:(r()-0.5)*2*amp;
    g.lineTo(x1+dx*t+ux*j, y1+dy*t+uy*j);
  }
}
/* the bean silhouette — a superellipse with layered wobble, deliberately
   asymmetric, and squashed vertically so it reads as lying in perspective
   rather than standing as a flat front-on oval. */
function beanPath(g,rx,ry,seed,rough){
  const n=112; g.beginPath();
  for(let i=0;i<=n;i++){
    const a=i/n*Math.PI*2, s=Math.sin(a), c=Math.cos(a), k=2/2.35;
    const x=(s<0?-1:1)*Math.pow(Math.abs(s),k);
    const y=(c<0?-1:1)*Math.pow(Math.abs(c),k);
    const egg=1+0.085*c+0.045*s;                        /* not symmetric on either axis */
    const w=1+rough*(Math.sin(a*2+seed)*0.70+Math.sin(a*5+seed*1.7)*0.34
                    +Math.sin(a*11+seed*2.9)*0.17);
    i?g.lineTo(x*rx*egg*w,y*ry*w):g.moveTo(x*rx*egg*w,y*ry*w);
  }
  g.closePath();
}
function creasePath(g,rx,ry,wig){
  const n=44; g.beginPath();
  for(let i=0;i<=n;i++){
    const u=i/n, y=(-0.87+1.74*u)*ry;
    i?g.lineTo(Math.sin(u*Math.PI*2.05+0.55)*rx*0.155*wig,y)
     :g.moveTo(Math.sin(0.55)*rx*0.155*wig,y);
  }
}
const swell=p=>1+0.095*smoothstep(0.598,0.646,p)+0.105*smoothstep(0.646,0.868,p)
                +0.045*smoothstep(0.868,0.955,p)-0.020*smoothstep(0.955,1,p);
/* THE BEAN. Everything about it is a function of p. Drawn in perspective:
   tipped away from the viewer, so the top face foreshortens. */
function paintBean(g,cx,cy,ryBase,p,opts){
  const o=opts||{};
  const S=Math.max(0.35,ryBase/190);
  const sw=swell(p)*(1+(o.pop||0));
  const RY=ryBase*sw, RX=RY*lerp(0.700,0.805,smoothstep(0.15,0.95,p));
  const col=beanColour(p);
  const ash=smoothstep(0.952,1,p);
  const oil=smoothstep(0.874,0.968,p);
  const dark=mixc(col,[10,6,4],0.50);
  const light=mixc(col,[255,246,224],0.44);
  const rough=0.013+0.028*ash+(o.rough||0);
  const seed=o.seed||3.14;
  const persp=o.persp===undefined?0.88:o.persp;        /* lying down, seen from above-front */
  g.save();
  g.translate(cx,cy);
  g.rotate(o.rot===undefined?-0.17:o.rot);
  g.scale(1,persp);
  beanPath(g,RX,RY,seed,rough);
  g.save(); g.clip();
  /* lit from BELOW — the flame is the only light in this room */
  const grd=g.createLinearGradient(-RX*0.5,RY*0.95,RX*0.35,-RY*0.9);
  grd.addColorStop(0,rgb(mixc(light,ORANGE,0.30)));
  grd.addColorStop(0.42,rgb(col));
  grd.addColorStop(1,rgb(dark));
  g.fillStyle=grd; g.fillRect(-RX*1.6,-RY*1.6,RX*3.2,RY*3.2);
  const hl=g.createRadialGradient(-RX*0.18,RY*0.52,RX*0.04,-RX*0.18,RY*0.52,RX*1.25);
  hl.addColorStop(0,`rgba(255,226,168,${0.42-0.20*ash})`); hl.addColorStop(1,"rgba(255,226,168,0)");
  g.fillStyle=hl; g.fillRect(-RX*1.6,-RY*1.6,RX*3.2,RY*3.2);
  if(PAT_DARK){ g.globalAlpha=0.30; g.fillStyle=PAT_DARK; g.fillRect(-RX*1.6,-RY*1.6,RX*3.2,RY*3.2); }
  if(PAT_LIGHT){ g.globalAlpha=0.22; g.fillStyle=PAT_LIGHT; g.fillRect(-RX*1.6,-RY*1.6,RX*3.2,RY*3.2); }
  g.globalAlpha=1;
  for(let i=0;i<5;i++){
    beanPath(g,RX,RY,seed,rough);
    g.lineWidth=(16-i*2.7)*S; g.strokeStyle=rgb(dark,0.11); g.stroke();
  }
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
  if(oil>0.01){
    const r=rng(97), n=Math.round(oil*30);
    for(let i=0;i<n;i++){
      const a=r()*6.2832, rr=Math.sqrt(r())*0.82;
      const bx=Math.cos(a)*RX*rr, by=Math.sin(a)*RY*rr, br=(2.4+r()*4.6)*S*(0.7+oil*0.6);
      const gg=g.createRadialGradient(bx-br*0.25,by+br*0.3,0,bx,by,br);
      gg.addColorStop(0,`rgba(255,236,200,${0.44*oil})`);
      gg.addColorStop(0.55,`rgba(255,206,140,${0.17*oil})`);
      gg.addColorStop(1,"rgba(255,200,130,0)");
      g.fillStyle=gg; g.beginPath(); g.arc(bx,by,br,0,6.2832); g.fill();
      g.fillStyle=`rgba(255,250,236,${0.62*oil})`;
      g.beginPath(); g.arc(bx-br*0.28,by+br*0.32,br*0.22,0,6.2832); g.fill();
    }
  }
  if(ash>0.01){
    g.fillStyle=`rgba(122,108,98,${0.44*ash})`; g.fillRect(-RX*1.6,-RY*1.6,RX*3.2,RY*3.2);
    if(PAT_DARK){ g.globalAlpha=0.35*ash; g.fillStyle=PAT_DARK;
                  g.fillRect(-RX*1.6,-RY*1.6,RX*3.2,RY*3.2); g.globalAlpha=1; }
  }
  g.restore();
  beanPath(g,RX,RY,seed,rough);
  g.lineWidth=3.4*S; g.strokeStyle=rgb(mixc(INK,col,0.18),0.30);
  g.save(); g.translate(1.4*S,-2.0*S); g.stroke(); g.restore();
  beanPath(g,RX,RY,seed,rough);
  g.lineWidth=2.5*S; g.strokeStyle=rgb(mixc(INK,[60,40,30],0.25),0.92); g.stroke();
  /* the fire's rim, on the underside only */
  g.save();
  beanPath(g,RX,RY,seed,rough); g.clip();
  beanPath(g,RX*0.995,RY*0.995,seed,rough);
  g.lineWidth=5.5*S; g.strokeStyle=rgb(mixc(ORANGE,GOLD,0.42),0.30+0.34*(o.lit||0));
  g.save(); g.translate(0,-2.2*S); g.stroke(); g.restore();
  g.restore();
  g.beginPath();
  g.ellipse(0,0,RX*0.99,RY*0.99,0,0.44,Math.PI-0.30);
  g.lineWidth=3.2*S; g.strokeStyle=rgb(mixc(ORANGE,hx("#ffcf7a"),0.45),0.42+0.36*(o.lit||0));
  g.stroke();
  g.restore();
  return {RX,RY:RY*persp};
}
/* ══ 4 · the page, the line, the layout ═══════════════════════════════════ */
const $=id=>document.getElementById(id);
const cv=$("scene"), pageEl=$("page"), gripEl=$("grip"), hintEl=$("hint");
const still=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const V={ w:0,h:0,dpr:1,wide:true,pad:24,botH:74,
          beanY:0,ryBase:0,panR:0,panRy:0,ledgeTop:0,bench:0,
          x0:0.56,x1:0.82, scrollMax:0, slide:{x:0,y:0,w:0} };
let g=null;
/* horizontal position of the line = how hot the bean is, with a hard kink at
   each crack, and a slow hand-drawn wander so it is never a plotted curve. */
const tnorm=u=>clamp01((tempAt(u)-22)/224);
function threadFrac(u){
  /* the shape IS the reading: it drifts right as the bean gets hotter and puts a
     hard dog-leg in at each crack, because a crack is an event and a smooth line
     through it would be a lie about what happens. */
  const base=0.62*tnorm(u)+0.14*u
            +0.132*smoothstep(P_FC-0.007,P_FC+0.007,u)
            +0.104*smoothstep(P_SC-0.007,P_SC+0.007,u);
  return clamp01(base)+Math.sin(u*17.2)*0.019+Math.sin(u*43.1+1.4)*0.009;
}
const threadX=u=>V.w*(V.x0+(V.x1-V.x0)*threadFrac(u));
/* the line does not stop dead at either end of the roast: above the green bean
   it keeps drifting up and to the left, off the top of the frame, and past burnt
   it keeps going down and right. A line that starts as a vertical pole at the top
   of the screen reads as scaffolding, not as a curve — measured on the first
   screenshot, where nothing above the bean had any lateral movement at all. */
function threadXU(uu){
  const s=V.wide?1:0.45;                 /* a phone has no width to spend on the run-in */
  if(uu<0){ const k=-uu; return threadX(0)-V.scrollMax*s*(0.13*k+0.55*k*k); }
  if(uu>1){ const k=uu-1; return threadX(1)+V.scrollMax*s*(0.13*k+0.45*k*k); }
  return threadX(uu);
}
const pageYof=u=>u*V.scrollMax+V.beanY;          /* page y of the point whose roast is u */
/* ══ 5 · the background, baked once and thrown out of focus ═══════════════ */
let BG=null;                       /* the blurred plate */
const bagRect=[];                  /* where the four bags ended up, for the live glow */
function bakeBackground(){
  const w=V.w,h=V.h,d=V.dpr;
  const sharp=document.createElement("canvas");
  sharp.width=Math.round(w*d); sharp.height=Math.round(h*d);
  const s=sharp.getContext("2d"); s.setTransform(d,0,0,d,0,0);
  const r=rng(19);
  bagRect.length=0;
  const bench=V.bench, ledge=V.ledgeTop;
  /* ── the drum roaster, cropped by the right edge and by the top of the frame.
       It is the only object that leaves the picture upward, which is what stops
       the room reading as a row of items lined up on a shelf. ── */
  {
    /* on a phone the reading column runs the full width above the bench, so the
       roaster is clipped to below it — dark chassis behind dark type was the one
       genuinely unreadable thing in the mobile screenshot */
    s.save();
    if(!V.wide){ s.beginPath(); s.rect(0,bench-h*0.055,w,h); s.clip(); }
    const bx=w*(V.wide?0.895:0.925), base=bench+h*0.052, bw=w*(V.wide?0.088:0.075);
    const iron=rgb(mixc(NAVY,INK,0.36)), ironD=rgb(mixc(NAVY,INK,0.70)),
          ironL=rgb(mixc(NAVY,hx("#8fa6c8"),0.34));
    /* chimney, running off the top of the frame */
    s.fillStyle=ironD; s.fillRect(bx+bw*0.55,-20,bw*0.34,base-h*0.20+20);
    s.fillStyle=iron;  s.fillRect(bx+bw*0.44,h*0.150,bw*0.56,h*0.030);
    /* hopper */
    s.beginPath();
    s.moveTo(bx-bw*0.95,base-h*0.335); s.lineTo(bx+bw*0.55,base-h*0.335);
    s.lineTo(bx+bw*0.26,base-h*0.250); s.lineTo(bx-bw*0.66,base-h*0.250);
    s.closePath(); s.fillStyle=iron; s.fill();
    s.lineWidth=Math.max(2.4,w*0.0026); s.strokeStyle="rgba(10,8,14,.85)"; s.stroke();
    /* chassis */
    s.beginPath();
    s.moveTo(bx-bw*1.02,base-h*0.250); s.lineTo(bx+bw*2.1,base-h*0.250);
    s.lineTo(bx+bw*2.1,base); s.lineTo(bx-bw*0.86,base);
    s.closePath(); s.fillStyle=iron; s.fill(); s.stroke();
    /* the drum face and its door, glowing */
    const fx=bx+bw*0.30, fy=base-h*0.140, fr=bw*0.92;
    s.beginPath(); s.arc(fx,fy,fr,0,6.2832); s.fillStyle=ironD; s.fill();
    s.lineWidth=Math.max(3,w*0.0034); s.strokeStyle="rgba(10,8,14,.9)"; s.stroke();
    const dg=s.createRadialGradient(fx-fr*0.3,fy+fr*0.2,2,fx,fy,fr*0.72);
    dg.addColorStop(0,rgb(mixc(GOLD,ORANGE,0.3),0.85));
    dg.addColorStop(1,rgb(mixc(ORANGE,INK,0.72),0.95));
    s.beginPath(); s.arc(fx,fy,fr*0.62,0,6.2832); s.fillStyle=dg; s.fill();
    s.lineWidth=Math.max(2.4,w*0.0026); s.strokeStyle="rgba(10,8,14,.9)"; s.stroke();
    s.strokeStyle="rgba(10,8,14,.55)"; s.lineWidth=Math.max(2,w*0.0022);
    [-0.30,0,0.30].forEach(k=>{
      const dxk=fr*0.62*k, kk=Math.sqrt(Math.max(0,(fr*0.62)**2-dxk*dxk))-3;
      s.beginPath(); s.moveTo(fx+dxk,fy-kk); s.lineTo(fx+dxk,fy+kk); s.stroke();
    });
    /* the cooling tray on its left arm — the piece that reaches back toward the
       bench, so the roaster is not a slab sitting on its own */
    s.beginPath(); s.ellipse(bx-bw*1.30,base-h*0.088,bw*0.80,bw*0.26,0,0,6.2832);
    s.fillStyle=iron; s.fill();
    s.lineWidth=Math.max(2.2,w*0.0024); s.strokeStyle="rgba(10,8,14,.85)"; s.stroke();
    s.beginPath(); s.ellipse(bx-bw*1.30,base-h*0.094,bw*0.66,bw*0.18,0,0,6.2832);
    s.fillStyle=ironD; s.fill();
    s.lineWidth=Math.max(4,w*0.005); s.strokeStyle=ironD; s.lineCap="round";
    s.beginPath(); s.moveTo(bx-bw*1.30,base-h*0.070); s.lineTo(bx-bw*1.24,base); s.stroke();
    /* the fire's rim on every left-facing edge, because the fire is to the left */
    s.lineWidth=Math.max(2.6,w*0.0030); s.strokeStyle=rgb(mixc(ORANGE,GOLD,0.35),0.60);
    s.beginPath(); s.moveTo(bx-bw*1.02,base-h*0.250); s.lineTo(bx-bw*0.86,base); s.stroke();
    s.beginPath(); s.moveTo(bx-bw*0.95,base-h*0.335); s.lineTo(bx-bw*0.66,base-h*0.250); s.stroke();
    s.beginPath(); s.arc(fx,fy,fr,Math.PI*0.62,Math.PI*1.32); s.stroke();
    s.strokeStyle=ironL; s.lineWidth=Math.max(1.8,w*0.002);
    s.beginPath(); s.moveTo(bx+bw*0.55,-20); s.lineTo(bx+bw*0.55,base-h*0.24); s.stroke();
    /* legs */
    s.lineWidth=Math.max(6,w*0.0075); s.strokeStyle=ironD; s.lineCap="round";
    [-0.62,0.9,2.0].forEach(k=>{ s.beginPath();
      s.moveTo(bx+bw*k,base-4); s.lineTo(bx+bw*k*1.05,base+h*0.050); s.stroke(); });
    s.restore();
  }
  /* ── sacks of green coffee, leaning on each other behind the bags ── */
  const sack=(sx,sy,sw2,sh2,tone)=>{
    s.beginPath();
    s.moveTo(sx-sw2,sy);
    s.quadraticCurveTo(sx-sw2*1.14,sy-sh2*0.70,sx-sw2*0.46,sy-sh2);
    s.lineTo(sx+sw2*0.44,sy-sh2*0.94);
    s.quadraticCurveTo(sx+sw2*1.12,sy-sh2*0.66,sx+sw2,sy);
    s.closePath();
    s.fillStyle=rgb(mixc(JUTE,[70,50,28],tone)); s.fill();
    s.lineWidth=Math.max(2,w*0.0022); s.strokeStyle="rgba(44,30,16,.75)"; s.stroke();
    s.beginPath(); s.moveTo(sx-sw2*0.44,sy-sh2*0.52); s.lineTo(sx+sw2*0.40,sy-sh2*0.50);
    s.lineWidth=Math.max(1.6,w*0.0016); s.strokeStyle="rgba(44,30,16,.35)"; s.stroke();
    if(PAT_PAPER){ s.save(); s.clip(); s.globalAlpha=.5; s.fillStyle=PAT_PAPER;
      s.fillRect(sx-sw2*1.2,sy-sh2*1.2,sw2*2.4,sh2*1.4); s.restore(); }
  };
  const sy=bench+h*0.042, sw2=w*0.043, sh2=h*0.100;
  sack(w*0.392,sy,sw2*1.12,sh2*1.10,0.36);
  sack(w*0.462,sy-h*0.008,sw2,sh2*0.84,0.18);
  sack(w*0.528,sy,sw2*0.92,sh2*1.18,0.30);
  sack(w*0.596,sy-h*0.004,sw2*0.84,sh2*0.92,0.24);
  /* ── the four bags standing on the bench, overlapping each other. The pan
       slides across in front of them as the roast advances. ── */
  const bw2=w*0.042, bh=h*0.168, by=bench+h*0.082;
  ROASTS.forEach((rr,i)=>{
    const bx=w*(0.452+i*0.050)+ (i%2?w*0.005:0);
    const q=(rr.lo+rr.hi)/2, col=beanColour(q);
    bagRect.push({x:bx,y:by,w:bw2,h:bh});
    s.beginPath();
    s.moveTo(bx-bw2*0.5,by);
    s.lineTo(bx-bw2*0.44,by-bh);
    s.lineTo(bx+bw2*0.44,by-bh);
    s.lineTo(bx+bw2*0.5,by);
    s.closePath();
    s.save(); s.clip();
    const gl=s.createLinearGradient(bx-bw2*0.5,0,bx+bw2*0.5,0);
    gl.addColorStop(0,rgb(mixc(KRAFT,[255,240,214],0.24)));
    gl.addColorStop(0.5,rgb(KRAFT));
    gl.addColorStop(1,rgb(mixc(KRAFT,[64,40,20],0.34)));
    s.fillStyle=gl; s.fillRect(bx-bw2,by-bh*1.2,bw2*2,bh*1.3);
    s.fillStyle=rgb(col); s.fillRect(bx-bw2,by-bh*0.62,bw2*2,bh*0.30);
    if(PAT_PAPER){ s.globalAlpha=.75; s.fillStyle=PAT_PAPER;
      s.fillRect(bx-bw2,by-bh*1.2,bw2*2,bh*1.3); s.globalAlpha=1; }
    s.restore();
    /* the folded crimp at the top, drawn over the body */
    s.beginPath();
    s.moveTo(bx-bw2*0.46,by-bh); s.lineTo(bx+bw2*0.46,by-bh);
    s.lineTo(bx+bw2*0.50,by-bh-h*0.016); s.lineTo(bx-bw2*0.50,by-bh-h*0.016);
    s.closePath();
    s.fillStyle=rgb(mixc(KRAFT,[70,44,22],0.30)); s.fill();
    s.lineWidth=Math.max(1.6,w*0.0018); s.strokeStyle="rgba(38,24,14,.8)"; s.stroke();
    s.beginPath();
    s.moveTo(bx-bw2*0.5,by); s.lineTo(bx-bw2*0.44,by-bh);
    s.lineTo(bx+bw2*0.44,by-bh); s.lineTo(bx+bw2*0.5,by);
    s.lineWidth=Math.max(1.8,w*0.002); s.strokeStyle="rgba(34,22,14,.85)"; s.stroke();
  });
  /* now blur the whole plate: this is the back of the room, not the subject */
  BG=document.createElement("canvas");
  BG.width=sharp.width; BG.height=sharp.height;
  const b=BG.getContext("2d");
  b.filter="blur("+(1.7*d).toFixed(2)+"px)";
  b.drawImage(sharp,0,0);
  b.filter="none";
  /* push the whole back of the room into shadow — only the pixels that were
     drawn, so the wash behind them is untouched. Without this the sacks and the
     roaster sat at the same brightness as the subject and the picture read as a
     row of cut-outs rather than as depth. */
  b.globalCompositeOperation="source-atop";
  b.fillStyle="rgba(22,9,4,.50)";
  b.fillRect(0,0,BG.width,BG.height);
  b.globalCompositeOperation="source-over";
}
/* ══ 6 · the picture ══════════════════════════════════════════════════════ */
const smoke=[], chaff=[];
let burst=null, crackLabel="", crackAge=9;
const beanPos={x:0,y:0,r:40};
let flamePt={x:0,y:0};
/* one light in the room, so every contact shadow points away from the fire */
function contactShadow(gg,x,y,rx,ry,strength){
  const dx=x-flamePt.x, dy=y-flamePt.y, len=Math.hypot(dx,dy)||1;
  const off=Math.min(rx*1.5,26);
  const sx=x+dx/len*off*0.9, sy=y+Math.max(0,dy/len)*off*0.30+ry*0.25;
  const gr=gg.createRadialGradient(sx,sy,0,sx,sy,rx*1.5);
  gr.addColorStop(0,`rgba(30,16,8,${0.42*strength})`);
  gr.addColorStop(1,"rgba(30,16,8,0)");
  gg.save(); gg.translate(sx,sy); gg.scale(1,0.34); gg.translate(-sx,-sy);
  gg.fillStyle=gr; gg.beginPath(); gg.arc(sx,sy,rx*1.5,0,6.2832); gg.fill();
  gg.restore();
}
function drawScene(t,u,heat){
  const w=V.w,h=V.h;
  g.setTransform(V.dpr,0,0,V.dpr,0,0);
  g.clearRect(0,0,w,h);
  stageGeom(u,heat);
  /* ── the room: one wash, cream at the top where you read, ember at the
       bottom where the fire is. No seam, no horizon band, no boxes. ── */
  const room=g.createLinearGradient(0,0,0,h);
  room.addColorStop(0,"#f7f3ec");
  room.addColorStop(0.30,rgb(mixc(PAPER,GOLD,0.11+0.06*heat)));
  room.addColorStop(0.50,rgb(mixc(PAPER,GOLD,0.36+0.14*heat)));
  room.addColorStop(0.66,rgb(mixc(hx("#a85c17"),ORANGE,0.18+0.26*heat)));
  room.addColorStop(0.83,rgb(mixc(hx("#37170a"),hx("#6d2607"),0.16+0.34*heat)));
  room.addColorStop(1,"#150a06");
  g.fillStyle=room; g.fillRect(0,0,w,h);
  if(BG) g.drawImage(BG,0,0,w,h);
  /* the bench: the shared ground everything stands on, in perspective —
     its back edge is a shallow curve and its front edge is off the frame. */
  const bench=V.bench;
  g.beginPath();
  g.moveTo(-4,bench+h*0.030);
  g.quadraticCurveTo(w*0.5,bench-h*0.012,w+4,bench+h*0.026);
  g.lineTo(w+4,h+4); g.lineTo(-4,h+4); g.closePath();
  const top=g.createLinearGradient(0,bench,0,h);
  top.addColorStop(0,rgb(mixc(hx("#7a4a24"),ORANGE,0.10+0.16*heat)));
  top.addColorStop(0.5,rgb(mixc(hx("#5b3318"),ORANGE,0.10+0.20*heat)));
  top.addColorStop(1,rgb(mixc(hx("#2c150a"),hx("#5e2408"),0.30)));
  g.fillStyle=top; g.fill();
  g.save(); g.clip();
  if(PAT_DARK){ g.globalAlpha=.34; g.fillStyle=PAT_DARK; g.fillRect(0,bench-20,w,h); g.globalAlpha=1; }
  const rb=rng(3);
  g.lineWidth=1.4;
  for(let i=0;i<9;i++){                                       /* the grain of the wood */
    const y=bench+h*0.03+rb()*(h-bench);
    g.beginPath(); wobLine(g,-10,y,w+10,y+ (rb()-0.5)*10, rng(70+i), 2.6);
    g.strokeStyle=`rgba(28,12,4,${0.10+rb()*0.12})`; g.stroke();
  }
  g.restore();
  /* the batch already tipped out on the bench, some of it under the pan */
  {
    const dr=rng(401), col=beanColour(u);
    for(let i=0;i<26;i++){
      const bx2=w*(0.10+dr()*0.92), by2=bench+h*(0.030+dr()*0.150);
      /* nearer the front of the bench = nearer the eye = bigger */
      const dep=(by2-bench)/Math.max(1,V.ledgeTop-bench);
      const rad=Math.max(2.6,w*0.0056)*(0.45+dep*1.05)*(0.75+dr()*0.5);
      g.save(); g.translate(bx2,by2); g.rotate(dr()*3.14);
      g.beginPath(); g.ellipse(0,0,rad,rad*0.60,0,0,6.2832);
      g.fillStyle=rgb(mixc(mixc(col,ORANGE,0.22),INK,0.30)); g.fill();
      g.lineWidth=1.1; g.strokeStyle="rgba(14,7,3,.7)"; g.stroke();
      g.restore();
    }
    /* and the chaff blown off the last batch, caught along the bench's low edge */
    g.beginPath();
    g.moveTo(w*0.16,V.ledgeTop-h*0.012);
    for(let i=0;i<=16;i++){
      const q=i/16;
      g.lineTo(w*(0.16+q*0.30),V.ledgeTop-h*(0.012+0.016*Math.sin(q*3.6)*Math.sin(q*Math.PI)));
    }
    g.lineTo(w*0.46,V.ledgeTop); g.lineTo(w*0.16,V.ledgeTop); g.closePath();
    g.fillStyle="rgba(214,192,150,.14)"; g.fill();
  }
  /* ── aerial perspective: the back of the room goes into shadow, so the only
       thing at full contrast is the thing the fire is actually lighting. Without
       this the whole picture was one flat orange fog and everything drawn in it
       measured as haze — the same "murky ground" fault recorded in §23. ── */
  const dusk=g.createLinearGradient(0,h*0.40,0,h);
  dusk.addColorStop(0,"rgba(26,11,5,0)");
  dusk.addColorStop(0.40,"rgba(26,11,5,.30)");
  dusk.addColorStop(0.70,"rgba(20,8,4,.56)");
  dusk.addColorStop(1,"rgba(12,5,3,.76)");
  g.fillStyle=dusk; g.fillRect(0,h*0.40,w,h*0.60);
  /* the fire's own light: a POOL, not a wash. It re-lights what is near it and
     leaves the rest of the room dark, which is what makes the rims read. */
  const hr=Math.max(w*0.34,h*0.46);
  const halo=g.createRadialGradient(flamePt.x,flamePt.y,V.panR*0.06,flamePt.x,flamePt.y,hr);
  halo.addColorStop(0,rgb(mixc(ORANGE,GOLD,0.25),0.50+0.34*heat));
  halo.addColorStop(0.20,rgb(ORANGE,0.26+0.28*heat));
  halo.addColorStop(0.55,rgb(mixc(ORANGE,hx("#7a2c08"),0.5),0.11+0.16*heat));
  halo.addColorStop(1,rgb(GOLD,0));
  g.fillStyle=halo; g.fillRect(0,0,w,h);
  /* and the patch of bench it stands on catches it hardest */
  const pool=g.createRadialGradient(flamePt.x,V.ledgeTop-h*0.03,2,flamePt.x,V.ledgeTop-h*0.03,V.panR*2.2);
  pool.addColorStop(0,rgb(mixc(ORANGE,GOLD,0.4),0.34+0.26*heat));
  pool.addColorStop(1,rgb(ORANGE,0));
  g.save(); g.translate(flamePt.x,V.ledgeTop-h*0.03); g.scale(1,0.34);
  g.translate(-flamePt.x,-(V.ledgeTop-h*0.03));
  g.fillStyle=pool; g.beginPath();
  g.arc(flamePt.x,V.ledgeTop-h*0.03,V.panR*2.2,0,6.2832); g.fill(); g.restore();
  /* the bag whose band you are standing in steps out of the blur */
  const z=zoneAt(u);
  if(z>=0&&bagRect[z]){
    const b=bagRect[z];
    const gl=g.createRadialGradient(b.x,b.y-b.h*0.5,2,b.x,b.y-b.h*0.5,b.w*2.6);
    gl.addColorStop(0,rgb(mixc(GOLD,CREAM,0.4),0.42));
    gl.addColorStop(1,rgb(GOLD,0));
    g.fillStyle=gl; g.beginPath(); g.arc(b.x,b.y-b.h*0.5,b.w*2.6,0,6.2832); g.fill();
    /* the lit bag comes UP out of the shadow — a sharp outline on a blurred
       object reads as a floating rectangle, which is exactly what it looked like */
    g.save();
    g.beginPath();
    g.moveTo(b.x-b.w*0.5,b.y); g.lineTo(b.x-b.w*0.44,b.y-b.h);
    g.lineTo(b.x+b.w*0.44,b.y-b.h); g.lineTo(b.x+b.w*0.5,b.y);
    g.closePath(); g.clip();
    const up=g.createLinearGradient(b.x-b.w*0.5,0,b.x+b.w*0.5,0);
    up.addColorStop(0,rgb(mixc(GOLD,CREAM,0.5),0.10));
    up.addColorStop(0.72,rgb(mixc(GOLD,CREAM,0.55),0.40));
    up.addColorStop(1,rgb(mixc(ORANGE,GOLD,0.4),0.24));
    g.fillStyle=up; g.fillRect(b.x-b.w,b.y-b.h*1.2,b.w*2,b.h*1.3);
    g.fillStyle=rgb(beanColour(u),0.55);
    g.fillRect(b.x-b.w,b.y-b.h*0.62,b.w*2,b.h*0.30);
    g.restore();
  }
  drawThread(u,heat,V.panTop,V.panBot);
  drawFire(t,u,heat);
  drawForeground(t,u,heat);
}
/* ── the one line, and every stop tied on to it ─────────────────────────── */
const stopEls=[];
function drawThread(u,heat,panTop,panBot){
  const w=V.w,h=V.h,S=window.scrollY;
  const yTop=-30, yBot=h+30;
  const uAt=y=>(y+S-V.beanY)/V.scrollMax;
  const beanU=u;
  const path=(a,b,step)=>{
    g.beginPath();
    for(let y=a;y<=b;y+=step){ const x=threadXU(uAt(y)); y===a?g.moveTo(x,y):g.lineTo(x,y); }
    g.lineTo(threadXU(uAt(b)),b);
  };
  /* ── THE LINE. Drawn as a BELT, not a wire: two ink edges with the bean's own
       colour running between them, and a cross-tick every so often, so it reads
       as a physical track the bean is riding rather than a stalk growing out of
       it. The first attempt was a 4px stroke and looked like a stem. ── */
  const BW=Math.max(15,h*0.022);
  /* what is still to come: the same track, empty */
  g.save();
  g.lineCap="butt"; g.lineJoin="round";
  const yA=panBot||V.beanY, yB=panTop||V.beanY;
  path(yA,yBot,7);
  g.lineWidth=BW+3; g.strokeStyle="rgba(28,13,6,.30)"; g.stroke();
  path(yA,yBot,7);
  g.lineWidth=BW-2.5; g.strokeStyle="rgba(246,232,206,.12)"; g.stroke();
  g.setLineDash([3,13]);
  path(yA,yBot,7);
  g.lineWidth=BW-3; g.strokeStyle="rgba(255,236,200,.34)"; g.stroke();
  g.restore();
  /* what has already happened: the belt carries the bean's colour at every point
     of it, so the line itself is the ramp from green to black */
  const grd=g.createLinearGradient(0,yTop,0,yB);
  for(let i=0;i<=8;i++){
    const y=lerp(yTop,yB,i/8);
    grd.addColorStop(i/8,rgb(beanColour(clamp01(uAt(y)))));
  }
  g.lineCap="butt"; g.lineJoin="round";
  path(yTop,yB,6);
  g.lineWidth=BW+5; g.strokeStyle="rgba(26,12,6,.34)"; g.stroke();
  path(yTop,yB,6);
  g.lineWidth=BW+2.5; g.strokeStyle="rgba(28,14,7,.92)"; g.stroke();
  path(yTop,yB,6);
  g.lineWidth=BW; g.strokeStyle=grd; g.stroke();
  /* the cross-ties, spaced along it, so it has a direction of travel */
  const tie0=Math.ceil((yTop)/22)*22;
  g.lineWidth=2.0; g.strokeStyle="rgba(22,10,4,.55)";
  for(let y=tie0;y<yB-4;y+=22){
    const x=threadXU(uAt(y)), x2=threadXU(uAt(y+6));
    const dx=x2-x, len=Math.hypot(dx,6)||1, nx=6/len, ny=-dx/len;
    g.beginPath();
    g.moveTo(x-nx*BW*0.50,y-ny*BW*0.50);
    g.lineTo(x+nx*BW*0.50,y+ny*BW*0.50);
    g.stroke();
  }
  /* the light along its upper edge */
  path(yTop,yB,6);
  g.lineWidth=Math.max(1.4,h*0.0018); g.strokeStyle="rgba(255,244,216,.42)";
  g.save(); g.translate(-BW*0.38,-1.2); g.stroke(); g.restore();
  /* the ticks, and the leader that ties each stop's words to its own point */
  g.font='500 11px "DM Mono",ui-monospace,monospace';
  stopEls.forEach(st=>{
    const tyRaw=pageYof(st.u)-S;
    if(tyRaw<-60||tyRaw>h+60) return;
    const ty=Math.min(tyRaw,(panTop||V.beanY)-4);
    const tx=threadX(st.u);
    const near=1-smoothstep(0.035,0.165,Math.abs((tyRaw-V.beanY)/h));
    if(near<=0.01) return;
    const tipX=V.wide ? st.el.offsetLeft+st.el.offsetWidth : st.el.offsetLeft;
    const tipY=st.el.offsetTop+st.el.offsetHeight-S;
    const lead=V.wide?8:-8;
    g.save();
    g.globalAlpha=near*0.85;
    g.beginPath();
    g.moveTo(tx,ty); g.lineTo(lerp(tx,tipX,0.55),ty); g.lineTo(tipX+lead,tipY);
    g.lineWidth=1.2; g.lineJoin="round";
    g.strokeStyle=rgb(mixc(INK,ORANGE,0.35),0.55); g.stroke();
    g.globalAlpha=near;
    g.beginPath(); g.arc(tx,ty,Math.max(3,h*0.0042),0,6.2832);
    g.fillStyle=rgb(beanColour(st.u)); g.fill();
    g.lineWidth=1.6; g.strokeStyle="rgba(30,18,10,.85)"; g.stroke();
    g.restore();
  });
  /* the two cracks, marked on the line whether or not you have reached them */
  [[P_FC,"FIRST CRACK"],[P_SC,"SECOND CRACK"]].forEach(([q,label])=>{
    const ty=pageYof(q)-S;
    if(ty<-20||ty>h+20) return;
    const tx=threadX(q), live=beanU>=q-0.004;
    g.save();
    g.lineWidth=live?2.4:1.4; g.lineCap="round";
    g.strokeStyle=rgb(live?ORANGE:INK,live?0.95:0.30);
    for(let i=0;i<6;i++){
      const a=i/6*6.2832+0.5, r1=Math.max(6,h*0.009), r2=live?r1*2.1:r1*1.5;
      g.beginPath(); g.moveTo(tx+Math.cos(a)*r1,ty+Math.sin(a)*r1);
      g.lineTo(tx+Math.cos(a)*r2,ty+Math.sin(a)*r2); g.stroke();
    }
    g.font='500 10.5px "DM Mono",ui-monospace,monospace';
    g.fillStyle=rgb(live?ORANGE:INK,live?0.9:0.4);
    g.textBaseline="middle";
    g.fillText(label,tx+Math.max(16,h*0.024),ty);
    g.restore();
  });
}
/* ── the fire, the pan, the bean: the midground, and the only sharp thing ── */
/* The whole stage's geometry, worked out ONCE per frame before anything is
   painted, because the line has to know where the pan is (it passes behind it)
   and the room's light has to know where the flame is. */
function stageGeom(u,heat){
  const cx=threadX(u);
  const RY=V.ryBase*swell(u)*(1+(burst?burst.pop:0));
  const panR=V.panR, panRy=V.panRy, depth=panR*0.30;
  const rim=V.beanY+RY*0.42;               /* the bean sits DOWN in the bowl */
  const bowlBot=rim+0.75*(panRy+depth*1.25);
  const fBase=Math.min(bowlBot+Math.max(36,Math.min((V.ledgeTop-bowlBot)*0.62,panR*0.60)),
                       V.ledgeTop-10);
  const gap=fBase-bowlBot;
  const fW=panR*(0.26+0.17*heat);
  /* the aspect cap is a ceiling on GROWTH and is never allowed to shorten the
     flame below contact — a flame with daylight under the pan reads as broken,
     and that was the bug he caught in the previous version at low heat. Checked
     at BOTH ends of the range, which is where that class of bug always hides. */
  const fH=Math.max(gap+panRy*0.55+10,Math.min((gap+panR*0.60)*(0.30+0.70*heat),fW*2.3));
  const pcx=cx+panR*0.42;
  V.cx=cx; V.pcx=pcx; V.bx=pcx+panR*0.10;
  V.RY=RY; V.rim=rim; V.bowlBot=bowlBot; V.depth=depth;
  V.fBase=fBase; V.fW=fW; V.fH=fH;
  V.panTop=rim+panRy*0.20; V.panBot=bowlBot+2;
  flamePt={x:pcx,y:fBase-fH*0.55};
  beanPos.x=V.bx; beanPos.y=V.beanY; beanPos.r=RY;
}
function drawFire(tRaw,u,heat){
  const w=V.w,h=V.h;
  const t=still?0:tRaw;
  const cx=V.pcx, S=Math.max(0.4,V.ryBase/190);   /* the PAN's centre, not the line's */
  const RY=V.RY;
  const panR=V.panR, panRy=V.panRy, depth=V.depth;
  const rim=V.rim, bowlBot=V.bowlBot;
  const fBase=V.fBase, fW=V.fW, fH=V.fH;
  /* contact shadows for the things standing behind the pan, thrown by the fire */
  bagRect.forEach(b=>contactShadow(g,b.x,b.y,b.w*0.6,b.w*0.3,0.7));
  /* the burner's iron ring, and its shadow on the bench */
  contactShadow(g,cx,fBase+4,panR*0.55,panR*0.16,1);
  const tongue=(ox,ww,hh,col,ph,al,ink)=>{
    g.beginPath(); g.moveTo(cx+ox-ww,fBase);
    for(let i=0;i<=30;i++){
      const q=i/30, x=cx+ox-ww+2*ww*q;
      const prof=Math.pow(Math.sin(Math.PI*q),0.72);
      const lick=Math.sin(q*8.5+t*3.0+ph)*0.10+Math.sin(q*17-t*4.4+ph)*0.05;
      g.lineTo(x,fBase-hh*prof*(1+lick));
    }
    g.lineTo(cx+ox+ww,fBase); g.closePath();
    g.globalAlpha=al; g.fillStyle=col; g.fill(); g.globalAlpha=1;
    if(ink){ g.lineWidth=2.2*S; g.strokeStyle=rgb(mixc(hx("#8a3d08"),INK,0.3),0.6); g.stroke(); }
  };
  /* side tongues first, so at high heat the fire wraps the bowl and licks past
     the rim; then the main body of the flame */
  tongue(-panR*0.34,fW*0.50,fH*(0.62+0.30*heat),rgb(mixc(ORANGE,hx("#c23c06"),0.42)),2.2,0.9,false);
  tongue( panR*0.27,fW*0.44,fH*(0.74+0.26*heat),rgb(mixc(ORANGE,hx("#c23c06"),0.36)),4.1,0.9,false);
  tongue(-panR*0.04,fW,fH,rgb(mixc(ORANGE,GOLD,0.52)),0,0.96,true);
  tongue( panR*0.07,fW*0.60,fH*0.86,rgb(GOLD),1.7,0.96,false);
  tongue(-panR*0.09,fW*0.30,fH*0.58,"#fff0bd",3.1,0.94,false);
  /* the gas ring the fire comes out of */
  g.lineCap="round"; g.strokeStyle=rgb(mixc(NAVY,INK,0.55));
  g.lineWidth=Math.max(6,panR*0.048);
  g.beginPath(); g.moveTo(cx-panR*0.44,fBase+2); g.lineTo(cx+panR*0.44,fBase+2); g.stroke();
  g.lineWidth=Math.max(4,panR*0.030);
  [-0.34,0.34].forEach(k=>{ g.beginPath(); g.moveTo(cx+k*panR,fBase+3);
    g.lineTo(cx+k*panR*1.20,fBase+Math.max(14,panR*0.11)); g.stroke(); });
  /* embers */
  if(!still){
    const er=rng(5);
    for(let i=0;i<16;i++){
      const ph=er()*10, sp=0.5+er()*0.9, q=((t*sp+ph)%3)/3;
      const x=cx+(er()-0.5)*fW*2.2, y=fBase-fH*0.4-q*h*0.24;
      g.globalAlpha=(1-q)*0.6*heat; g.fillStyle=rgb(mixc(ORANGE,GOLD,er()));
      g.beginPath(); g.arc(x,y,(1.3+er()*2.0)*S,0,6.2832); g.fill();
    }
    g.globalAlpha=1;
  }
  /* ── the pan: a shallow iron bowl seen from above and in front. Drawn in two
       halves so the bean genuinely sits INSIDE it. ── */
  const irons=rgb(mixc(NAVY,INK,0.34)), ironk=rgb(mixc(NAVY,INK,0.66));
  g.lineWidth=Math.max(9,panR*0.075); g.lineCap="round"; g.strokeStyle=ironk;
  g.beginPath(); g.moveTo(cx+panR*0.94,rim+panRy*0.30);
  g.quadraticCurveTo(cx+panR*1.5,rim+panRy*0.1,cx+panR*1.72,rim-panRy*1.1);
  g.stroke();                                        /* the handle, running off frame */
  g.beginPath();
  g.moveTo(cx-panR,rim);
  g.bezierCurveTo(cx-panR,rim+panRy+depth*1.25,cx+panR,rim+panRy+depth*1.25,cx+panR,rim);
  g.ellipse(cx,rim,panR,panRy,0,0,Math.PI,true);
  g.closePath();
  const bowl=g.createLinearGradient(0,rim,0,bowlBot);
  bowl.addColorStop(0,irons);
  bowl.addColorStop(1,rgb(mixc(mixc(NAVY,INK,0.5),ORANGE,0.22+0.30*heat)));
  g.fillStyle=bowl; g.fill();
  g.lineWidth=2.4*S; g.strokeStyle=ironk; g.stroke();
  /* the fire's rim on the underside of the bowl */
  g.beginPath();
  g.moveTo(cx-panR,rim);
  g.bezierCurveTo(cx-panR,rim+panRy+depth*1.25,cx+panR,rim+panRy+depth*1.25,cx+panR,rim);
  g.lineWidth=Math.max(3,panR*0.030);
  g.strokeStyle=rgb(mixc(ORANGE,GOLD,0.30),0.34+0.44*heat); g.stroke();
  g.beginPath(); g.ellipse(cx,rim,panR*0.965,panRy*0.94,0,0,6.2832);
  g.fillStyle=rgb(mixc(NAVY,INK,0.74)); g.fill();
  g.save(); g.clip();
  const inner=g.createRadialGradient(cx,rim+panRy*0.55,1,cx,rim,panR*0.95);
  inner.addColorStop(0,rgb(mixc(ORANGE,GOLD,0.40),0.46+0.50*heat));
  inner.addColorStop(0.55,rgb(ORANGE,0.16+0.24*heat));
  inner.addColorStop(1,rgb(ORANGE,0));
  g.fillStyle=inner; g.fillRect(cx-panR,rim-panRy*1.2,panR*2,panRy*2.4);
  if(PAT_DARK){ g.globalAlpha=.28; g.fillStyle=PAT_DARK;
    g.fillRect(cx-panR,rim-panRy*1.2,panR*2,panRy*2.4); g.globalAlpha=1; }
  /* the bean's own shadow, thrown up the back of the bowl because the only light
     in this room is underneath it */
  g.fillStyle="rgba(16,7,3,.62)";
  g.beginPath(); g.ellipse(V.bx-RY*0.10,rim-panRy*0.34,RY*0.66,panRy*0.62,-0.1,0,6.2832); g.fill();
  g.restore();
  /* ── the bean ── */
  const breath=still?0:Math.sin(tRaw*1.15)*0.008+Math.sin(tRaw*2.31)*0.003;
  const tilt=-0.17+(still?0:Math.sin(tRaw*0.83)*0.026);
  paintBean(g,V.bx,V.beanY+(still?0:Math.sin(tRaw*1.15)*V.ryBase*0.012),
            V.ryBase*(1+breath),u,{rot:tilt,pop:burst?burst.pop:0,seed:3.14,lit:heat});
  /* the front lip, over the bean's lower edge: this is what puts it IN the pan */
  g.beginPath(); g.ellipse(cx,rim,panR,panRy,0,0,Math.PI);
  g.lineWidth=Math.max(7,panR*0.052); g.lineCap="round"; g.strokeStyle=irons; g.stroke();
  g.beginPath(); g.ellipse(cx,rim,panR,panRy,0,0,Math.PI);
  g.lineWidth=2.2*S; g.strokeStyle=ironk; g.stroke();
  g.beginPath(); g.ellipse(cx,rim+panR*0.010,panR*0.87,panRy*0.84,0,0.5,Math.PI-0.6);
  g.lineWidth=2*S; g.strokeStyle=rgb(mixc(mixc(NAVY,PAPER,0.5),ORANGE,0.3),0.55); g.stroke();
  /* ── the dial, clamped to the pan's right rim, crossing in front of it ── */
  drawGauge(cx,rim,panR,panRy,tempAt(u),S,heat);
  /* ── heat, smoke, chaff, and the crack itself ── */
  const sq=Math.round(2+heat*2);
  g.lineCap="round"; g.lineJoin="round";
  for(let i=0;i<sq;i++){
    const x0=V.bx+(i-(sq-1)/2)*V.ryBase*0.55;
    const len=RY*(0.34+0.26*heat)+V.ryBase*0.12;
    const y0=V.beanY-RY*1.02;
    const topY=Math.max(y0-len,h*0.16);
    g.beginPath();
    for(let k=0;k<=14;k++){
      const q=k/14, y=lerp(y0,topY,q);
      const x=x0+Math.sin(q*6.6+t*2.1+i*1.9)*V.ryBase*0.09*(0.3+q*0.9);
      k?g.lineTo(x,y):g.moveTo(x,y);
    }
    g.lineWidth=Math.max(2.2,4*S); g.strokeStyle=rgb(ORANGE,0.14+0.42*heat); g.stroke();
  }
  const want=Math.round(smoothstep(0.74,1,u)*26);
  if(!still&&smoke.length<want&&Math.random()<0.5)
    smoke.push({x:V.bx+(Math.random()-0.5)*V.ryBase*0.8,y:V.beanY-RY*0.7,
                v:16+Math.random()*26,r:6+Math.random()*14,a:0,ph:Math.random()*9});
  for(let i=smoke.length-1;i>=0;i--){
    const sm=smoke[i];
    if(!still){ sm.y-=sm.v*0.016; sm.r+=0.30; sm.a+=0.016; }
    const life=clamp01(1-sm.a);
    if(life<=0||smoke.length>want+6){ smoke.splice(i,1); continue; }
    const x=sm.x+Math.sin(sm.a*2.6+sm.ph)*22;
    const gg=g.createRadialGradient(x,sm.y,0,x,sm.y,sm.r*3.1);
    gg.addColorStop(0,`rgba(74,66,62,${0.34*life})`); gg.addColorStop(1,"rgba(74,66,62,0)");
    g.fillStyle=gg; g.beginPath(); g.arc(x,sm.y,sm.r*3.1,0,6.2832); g.fill();
  }
  for(let i=chaff.length-1;i>=0;i--){
    const c=chaff[i];
    if(!still){ c.x+=c.vx*0.016; c.y+=c.vy*0.016; c.vy+=52*0.016; c.a+=0.016; c.rot+=c.spin*0.016; }
    if(c.a>1.5){ chaff.splice(i,1); continue; }
    g.save(); g.translate(c.x,c.y); g.rotate(c.rot);
    g.globalAlpha=clamp01(1.5-c.a)*0.9; g.fillStyle="#f0e6ca";
    g.beginPath(); g.ellipse(0,0,c.r,c.r*0.42,0,0,6.2832); g.fill();
    g.lineWidth=1; g.strokeStyle="rgba(120,100,78,.6)"; g.stroke();
    g.restore();
  }
  g.globalAlpha=1;
  if(burst){
    const q=clamp01(burst.a/0.55), rr=RY*(1.06+q*0.45);
    g.lineWidth=Math.max(2,3.4*S); g.lineCap="round";
    g.strokeStyle=rgb(burst.kind===1?ORANGE:hx("#8f3f10"),(1-q)*0.9);
    for(let i=0;i<burst.n;i++){
      const a=(i/burst.n)*6.2832+burst.seed;
      const x=V.bx+Math.cos(a)*rr*0.78, y=V.beanY+Math.sin(a)*rr*0.9;
      g.beginPath(); g.moveTo(x,y);
      g.lineTo(V.bx+Math.cos(a)*rr*0.78*(1.22+q*0.3),V.beanY+Math.sin(a)*rr*0.9*(1.22+q*0.3));
      g.stroke();
    }
  }
  if(crackAge<1.5){
    const a=clamp01(1.5-crackAge);
    g.save();
    g.font='500 '+Math.max(12,Math.round(h*0.019))+'px "DM Mono",ui-monospace,monospace';
    g.globalAlpha=a; g.fillStyle=rgb(ORANGE);
    g.textAlign="center"; g.textBaseline="alphabetic";
    g.fillText(crackLabel,V.bx,V.beanY-RY*1.5-(1-a)*10);
    g.restore(); g.textAlign="left";
  }
}
/* A dial thermometer clamped to the pan's right rim: its stem crosses IN FRONT
   of the rim and the dial itself is cropped by the right edge at a dark roast.
   The long thin probe it replaces read as a sword lying across the picture. */
function drawGauge(cx,rim,panR,panRy,T,S,heat){
  const R=panR*0.215;
  const clampX=cx+panR*0.74, clampY=rim+panRy*0.20;
  const dx=cx+panR*0.86, dy=rim-panR*0.42;
  const iron=rgb(mixc(NAVY,INK,0.44)), ironD=rgb(mixc(NAVY,INK,0.74));
  /* the stem, over the rim */
  g.lineCap="round";
  g.beginPath(); g.moveTo(clampX,clampY); g.lineTo(dx,dy);
  g.lineWidth=Math.max(6,R*0.26); g.strokeStyle=ironD; g.stroke();
  g.lineWidth=Math.max(2,R*0.07); g.strokeStyle=rgb(mixc(ORANGE,GOLD,0.4),0.35+0.3*heat);
  g.beginPath(); g.moveTo(clampX-1,clampY-2); g.lineTo(dx-1,dy-2); g.stroke();
  /* the clamp biting the rim */
  g.beginPath(); g.ellipse(clampX,clampY,R*0.30,R*0.20,0.3,0,6.2832);
  g.fillStyle=iron; g.fill();
  g.lineWidth=1.8*S; g.strokeStyle="rgba(16,10,8,.9)"; g.stroke();
  /* the face */
  g.beginPath(); g.arc(dx,dy,R*1.10,0,6.2832);
  g.fillStyle=ironD; g.fill();
  g.beginPath(); g.arc(dx,dy,R,0,6.2832);
  const fg=g.createRadialGradient(dx-R*0.3,dy+R*0.4,R*0.1,dx,dy,R*1.2);
  fg.addColorStop(0,"#fbf1da"); fg.addColorStop(1,rgb(mixc(CREAM,ORANGE,0.22+0.18*heat)));
  g.fillStyle=fg; g.fill();
  g.lineWidth=Math.max(2,R*0.075); g.strokeStyle="rgba(20,12,8,.85)"; g.stroke();
  /* ticks: 20 to 250, sweeping 220 degrees */
  const A0=Math.PI*0.72, A1=Math.PI*2.28;
  const ang=v=>A0+(A1-A0)*clamp01((v-20)/230);
  g.lineCap="butt";
  for(let v=25;v<=250;v+=25){
    const a=ang(v), big=(v%50===0);
    g.beginPath();
    g.moveTo(dx+Math.cos(a)*R*(big?0.66:0.76),dy+Math.sin(a)*R*(big?0.66:0.76));
    g.lineTo(dx+Math.cos(a)*R*0.88,dy+Math.sin(a)*R*0.88);
    g.lineWidth=big?Math.max(1.6,R*0.055):Math.max(1,R*0.03);
    g.strokeStyle="rgba(32,20,12,.65)"; g.stroke();
  }
  /* the two cracks, marked on the dial in the roast's own colours */
  [[196,ORANGE],[224,hx("#8f3f10")]].forEach(([v,c])=>{
    const a=ang(v);
    g.beginPath();
    g.arc(dx,dy,R*0.80,a-0.05,a+0.05);
    g.lineWidth=Math.max(3,R*0.13); g.strokeStyle=rgb(c,0.9); g.stroke();
  });
  /* the needle */
  const a=ang(T);
  g.lineCap="round";
  g.beginPath(); g.moveTo(dx-Math.cos(a)*R*0.20,dy-Math.sin(a)*R*0.20);
  g.lineTo(dx+Math.cos(a)*R*0.80,dy+Math.sin(a)*R*0.80);
  g.lineWidth=Math.max(2.4,R*0.10); g.strokeStyle=rgb(mixc(ORANGE,INK,0.10)); g.stroke();
  g.beginPath(); g.arc(dx,dy,Math.max(2.6,R*0.10),0,6.2832);
  g.fillStyle=rgb(mixc(INK,ORANGE,0.2)); g.fill();
  /* the number, printed on the face */
  g.font='500 '+Math.max(10,Math.round(R*0.34))+'px "DM Mono",ui-monospace,monospace';
  g.fillStyle="rgba(34,20,12,.9)"; g.textAlign="center"; g.textBaseline="middle";
  g.fillText(Math.round(T)+"°C",dx,dy+R*0.44);
  g.textAlign="left";
}
/* ── the foreground: the iron ledge, a scoop off the left edge, spilled beans,
     and the brass slide you actually hold ─────────────────────────────────── */
function drawForeground(tRaw,u,heat){
  const w=V.w,h=V.h,t=still?0:tRaw;
  const ly=V.ledgeTop;
  /* the ledge — heavy iron across the bottom, cropped by both side edges */
  g.beginPath();
  g.moveTo(-6,ly+h*0.012);
  g.quadraticCurveTo(w*0.5,ly-h*0.008,w+6,ly+h*0.010);
  g.lineTo(w+6,h+6); g.lineTo(-6,h+6); g.closePath();
  const ig=g.createLinearGradient(0,ly,0,h);
  ig.addColorStop(0,rgb(mixc(mixc(NAVY,INK,0.62),ORANGE,0.14+0.18*heat)));
  ig.addColorStop(0.35,rgb(mixc(NAVY,INK,0.80)));
  ig.addColorStop(1,"#0e0b0d");
  g.fillStyle=ig; g.fill();
  g.save(); g.clip();
  if(PAT_DARK){ g.globalAlpha=.5; g.fillStyle=PAT_DARK; g.fillRect(0,ly-10,w,h); g.globalAlpha=1; }
  g.restore();
  /* the lit top rim: the only edge in the room the fire can reach down here */
  g.beginPath();
  g.moveTo(-6,ly+h*0.012);
  g.quadraticCurveTo(w*0.5,ly-h*0.008,w+6,ly+h*0.010);
  g.lineWidth=Math.max(2,h*0.0028);
  g.strokeStyle=rgb(mixc(ORANGE,GOLD,0.35),0.42+0.32*heat); g.stroke();
  /* rivets, spaced by hand */
  const rr=rng(31);
  for(let i=0;i<11;i++){
    const x=w*(0.03+i*0.094)+rr()*8, y=ly+h*0.030+rr()*4;
    g.beginPath(); g.arc(x,y,Math.max(2,h*0.0030),0,6.2832);
    g.fillStyle="rgba(6,4,4,.7)"; g.fill();
    g.beginPath(); g.arc(x-0.8,y-1.2,Math.max(1.2,h*0.0016),0,6.2832);
    g.fillStyle=rgb(mixc(ORANGE,GOLD,0.5),0.4+0.3*heat); g.fill();
  }
  /* the scoop, cropped by the LEFT edge, with the batch it just tipped out
     spilling along the ledge in front of everything else in the room */
  const sc={x:V.wide?w*0.015:w*0.005, y:ly+h*0.050, r:Math.max(32,w*(V.wide?0.062:0.115))};
  contactShadow(g,sc.x,sc.y+sc.r*0.5,sc.r*1.15,sc.r*0.4,1);
  g.save();
  g.translate(sc.x,sc.y); g.rotate(-0.20);
  /* the handle first, running off the left edge and under the bowl */
  g.lineWidth=Math.max(9,sc.r*0.30); g.lineCap="round";
  g.strokeStyle=rgb(mixc(hx("#6d4520"),INK,0.22));
  g.beginPath(); g.moveTo(-sc.r*0.5,sc.r*0.16); g.lineTo(-sc.r*3.6,sc.r*0.74); g.stroke();
  g.lineWidth=Math.max(2,sc.r*0.06); g.strokeStyle=rgb(mixc(ORANGE,GOLD,0.5),0.34);
  g.beginPath(); g.moveTo(-sc.r*0.5,sc.r*0.10); g.lineTo(-sc.r*3.6,sc.r*0.68); g.stroke();
  /* the bowl of the scoop, seen from above-front */
  g.beginPath(); g.ellipse(0,0,sc.r*1.22,sc.r*0.80,0,0,6.2832);
  const wg=g.createLinearGradient(0,sc.r*0.9,0,-sc.r*0.9);
  wg.addColorStop(0,rgb(mixc(hx("#7d5527"),ORANGE,0.14)));
  wg.addColorStop(1,rgb(mixc(hx("#2e1a0b"),INK,0.42)));
  g.fillStyle=wg; g.fill();
  g.lineWidth=Math.max(2,w*0.0024); g.strokeStyle="rgba(20,10,4,.9)"; g.stroke();
  /* the inside, in shadow but not a black hole */
  g.beginPath(); g.ellipse(0,-sc.r*0.06,sc.r*1.00,sc.r*0.58,0,0,6.2832);
  const ing=g.createLinearGradient(0,-sc.r*0.6,0,sc.r*0.5);
  ing.addColorStop(0,rgb(mixc(hx("#1d1007"),INK,0.45)));
  ing.addColorStop(1,rgb(mixc(hx("#573418"),ORANGE,0.16)));
  g.fillStyle=ing; g.fill();
  g.lineWidth=Math.max(1.6,w*0.0018); g.strokeStyle="rgba(14,7,3,.85)"; g.stroke();
  /* the green batch still sitting in it */
  const sr=rng(211), gcol=beanColour(0.02);
  for(let i=0;i<11;i++){
    const bx=(sr()-0.5)*sc.r*1.60, by=-sc.r*0.10+(sr()-0.5)*sc.r*0.72;
    const rad=sc.r*0.115*(0.8+sr()*0.5);
    g.save(); g.translate(bx,by); g.rotate(sr()*3.14);
    g.beginPath(); g.ellipse(0,0,rad,rad*0.62,0,0,6.2832);
    g.fillStyle=rgb(mixc(mixc(gcol,ORANGE,0.16),INK,0.34)); g.fill();
    g.lineWidth=1.3; g.strokeStyle="rgba(16,8,4,.8)"; g.stroke();
    g.restore();
  }
  /* the fire-lit rim on the side facing the burner */
  g.beginPath(); g.ellipse(0,0,sc.r*1.22,sc.r*0.80,0,-1.15,0.85);
  g.lineWidth=Math.max(2.4,sc.r*0.07); g.strokeStyle=rgb(mixc(ORANGE,GOLD,0.45),0.55+0.25*heat);
  g.stroke();
  g.restore();
  /* the spilled beans — the same batch, so they carry the roast colour too */
  const br=rng(77), col=beanColour(u);
  for(let i=0;i<19;i++){
    const bx=sc.x+ br()*w*0.42, by=ly+h*(0.012+br()*0.044);
    const rad=Math.max(5,w*0.0080)*(0.75+br()*0.6);
    g.save(); g.translate(bx,by); g.rotate(br()*3.14);
    g.beginPath(); g.ellipse(0,0,rad,rad*0.62,0,0,6.2832);
    const bg2=g.createLinearGradient(0,rad,0,-rad);
    bg2.addColorStop(0,rgb(mixc(col,ORANGE,0.30)));
    bg2.addColorStop(1,rgb(mixc(col,INK,0.42)));
    g.fillStyle=bg2; g.fill();
    g.lineWidth=1.5; g.strokeStyle="rgba(16,8,4,.85)"; g.stroke();
    g.beginPath(); g.moveTo(-rad*0.7,0); g.quadraticCurveTo(0,rad*0.22,rad*0.7,0);
    g.lineWidth=1.4; g.strokeStyle="rgba(16,8,4,.6)"; g.stroke();
    g.restore();
  }
  drawSlide(t,u);
}
/* the brass slide: a real handle with a real drawn shadow, mounted on the ledge.
   It is the affordance — you can see it is meant to be grabbed before any text
   tells you so. Its scale is also the shop: four bands, named. */
let slideRock=0;
function drawSlide(t,u){
  const w=V.w,h=V.h,S=V.slide;
  const x0=S.x, x1=S.x+S.w, y=S.y;
  const kx=lerp(x0,x1,u);
  /* the brass track, with the four roast bands stencilled into it */
  g.save();
  g.beginPath(); g.moveTo(x0,y+3); g.lineTo(x1,y+3);
  g.lineWidth=Math.max(15,h*0.021); g.lineCap="round";
  g.strokeStyle="rgba(6,4,4,.6)";
  g.stroke();
  const bg=g.createLinearGradient(0,y-11,0,y+11);
  bg.addColorStop(0,"#6d4f22"); bg.addColorStop(0.30,"#e3bb63");
  bg.addColorStop(0.58,"#a67f34"); bg.addColorStop(1,"#5a4019");
  g.beginPath(); g.moveTo(x0,y); g.lineTo(x1,y);
  g.lineWidth=Math.max(12,h*0.017); g.strokeStyle=bg; g.stroke();
  ROASTS.forEach((r,i)=>{
    const a=lerp(x0,x1,r.lo), b=lerp(x0,x1,r.hi);
    const on=u>=r.lo&&u<=r.hi;
    g.beginPath(); g.moveTo(a,y); g.lineTo(b,y);
    g.lineWidth=Math.max(12,h*0.017);
    g.strokeStyle=rgb(beanColour((r.lo+r.hi)/2),on?1:0.66); g.stroke();
    g.beginPath(); g.moveTo(a,y-h*0.014); g.lineTo(a,y+h*0.014);
    g.lineWidth=1.2; g.strokeStyle="rgba(255,236,196,.4)"; g.stroke();
    if(V.w>620||on){
      g.font='500 10.5px "DM Mono",ui-monospace,monospace';
      g.fillStyle=on?"rgba(255,232,190,.95)":"rgba(255,232,190,.42)";
      g.textBaseline="alphabetic";
      g.fillText(r.level.toUpperCase(),a+2,y-h*0.017);
    }
  });
  [[P_FC,"1st"],[P_SC,"2nd"]].forEach(([q,lab])=>{
    const x=lerp(x0,x1,q);
    g.beginPath(); g.moveTo(x,y+h*0.010); g.lineTo(x,y+h*0.022);
    g.lineWidth=1.4; g.strokeStyle=rgb(ORANGE,0.9); g.stroke();
    g.font='400 10px "DM Mono",ui-monospace,monospace';
    g.fillStyle=rgb(ORANGE,0.85); g.textBaseline="top";
    g.fillText(lab,x+3,y+h*0.014);
  });
  g.restore();
  /* the knob. Cast shadow first, then the body, then the knurling and the
     highlight — the shadow is INSIDE the drawing, never a CSS box-shadow. */
  const kw=Math.max(19,h*0.026), kh=Math.max(38,h*0.054);
  const rock=slideRock*Math.sin(t*7.4);
  g.save();
  g.translate(kx,y); g.rotate(rock*0.20);
  g.fillStyle="rgba(6,4,4,.55)";
  g.beginPath(); g.ellipse(3,kh*0.52,kw*1.05,kh*0.16,0,0,6.2832); g.fill();
  const kg=g.createLinearGradient(-kw,0,kw,0);
  kg.addColorStop(0,"#6b4c1e"); kg.addColorStop(0.30,"#f0cf7c");
  kg.addColorStop(0.58,"#c9a049"); kg.addColorStop(1,"#5f4218");
  g.beginPath();
  g.moveTo(-kw,-kh*0.5); g.lineTo(kw,-kh*0.5);
  g.lineTo(kw*0.78,kh*0.5); g.lineTo(-kw*0.78,kh*0.5); g.closePath();
  g.fillStyle=kg; g.fill();
  g.lineWidth=1.8; g.strokeStyle="rgba(28,18,6,.9)"; g.stroke();
  g.lineWidth=1.2; g.strokeStyle="rgba(50,32,10,.55)";
  for(let i=-2;i<=2;i++){
    g.beginPath(); g.moveTo(i*kw*0.28,-kh*0.34); g.lineTo(i*kw*0.24,kh*0.34); g.stroke();
  }
  g.beginPath(); g.moveTo(-kw*0.86,-kh*0.42); g.lineTo(kw*0.86,-kh*0.42);
  g.lineWidth=1.6; g.strokeStyle="rgba(255,244,208,.7)"; g.stroke();
  g.restore();
}
/* ══ 7 · the stops, hung off the line ═════════════════════════════════════ */
[...document.querySelectorAll(".stop")].forEach(el=>{
  stopEls.push({el,u:parseFloat(el.dataset.u)});
});
function placeStops(){
  const w=V.w,h=V.h,pad=V.pad;
  stopEls.forEach(st=>{
    const el=st.el;
    const tx=threadX(st.u);
    let left,width;
    if(V.wide){
      const right=tx-w*0.055;
      width=Math.max(180,Math.min(520,right-pad));
      left=Math.max(pad,right-width);
    } else {
      left=Math.min(w*0.56,tx+w*0.105);
      width=Math.max(150,w-left-16);
    }
    el.style.width=width+"px";
    el.style.left=left+"px";
    /* measured, not guessed: a tall stop is pushed further up so its foot never
       reaches down into the fire, and a short one hangs close to its own tick */
    /* A stop must fit between the top frame and the point where the room goes
       dark, at EVERY window height — not just at 1440x900. On a short window the
       counter ran 127px past the bench and its last two roasts went dark-on-dark.
       So the block is scaled to the room it actually has, measured, and then hung
       so its foot clears the bean. */
    const eh=el.offsetHeight;
    const room=Math.max(140,h*0.58-V.topH-12);
    const sc=Math.min(1,room/Math.max(1,eh));
    st.scale=sc;
    const up=Math.min(eh*sc+h*(V.wide?0.09:0.16),V.beanY-V.topH-12);
    el.style.top=(pageYof(st.u)-up)+"px";
  });
}
/* the stations index: each link is a point on the same line, and clicking one
   RUNS the bean to it rather than jumping the page — the journey is the product,
   so it is never skipped, only fast-forwarded. */
const stationEls=[...document.querySelectorAll(".stations a")].map(a=>{
  const st=stopEls.find(s=>s.el.id===a.getAttribute("href").slice(1));
  a.addEventListener("click",e=>{
    e.preventDefault(); armIt();
    if(st) tweenTo(st.u*V.scrollMax);
  });
  return {a,u:st?st.u:0};
});
function litStations(u){
  let best=0,bd=9;
  stationEls.forEach((s,i)=>{ const d=Math.abs(s.u-u); if(d<bd){bd=d;best=i;} });
  stationEls.forEach((s,i)=>s.a.classList.toggle("on",i===best&&bd<0.14));
}
function litStops(){
  const h=V.h,S=window.scrollY;
  stopEls.forEach(st=>{
    const d=(pageYof(st.u)-S-V.beanY)/h;
    const vis=1-smoothstep(0.035,0.165,Math.abs(d));
    st.el.style.opacity=vis.toFixed(3);
    st.el.style.transform="translateY("+(d*14).toFixed(1)+"px) scale("+(st.scale||1).toFixed(3)+")";
    st.el.classList.toggle("lit",vis>0.5);
  });
}
/* the counter: the four, listed once, each one a way back to its own band */
const runEl=$("run");
const rowEls=ROASTS.map((r,i)=>{
  const b=document.createElement("button");
  b.type="button"; b.className="roastrow"; b.setAttribute("aria-pressed","false");
  b.innerHTML='<span class="rowname">'+r.name+'</span>'+
    '<span class="rowprice">'+r.level+' · A$'+r.price.toFixed(2)+'</span>'+
    '<span class="rowmeta">'+r.origin+' · '+r.alt+' · '+r.process+' · '+r.notes.join(", ")+
      '<b class="tick" data-t="'+i+'"></b></span>';
  b.addEventListener("click",()=>{ armed=true; hintEl.classList.add("gone");
    tweenTo(((r.lo+r.hi)/2)*V.scrollMax); });
  runEl.appendChild(b);
  return b;
});
/* ══ 8 · the shop, pinned ═════════════════════════════════════════════════ */
const liveName=$("liveName"), liveMeta=$("liveMeta"), livePrice=$("livePrice"),
      buy=$("buy"), tally=$("tally"), ribbon=$("ribbon"), ribkeys=$("ribkeys"),
      swatch=$("swatch");
const ribA=ribbon.querySelector('[data-k="acid"]'),
      ribS=ribbon.querySelector('[data-k="sugar"]'),
      ribC=ribbon.querySelector('[data-k="carbon"]');
const root=document.documentElement;
const found=ROASTS.map(()=>false);
let foundCount=0, sel=-1, lastZone=-2, dwell=0, armed=false;
let swG=null;
function syncState(u){
  const T=tempAt(u), s=timeAt(u), z=zoneAt(u), col=beanColour(u);
  root.style.setProperty("--hot",hex(col));
  if(z>=0){
    const r=ROASTS[z];
    liveName.textContent=r.name;
    liveMeta.textContent=r.level+" · "+Math.round(T)+"°C · "+r.notes.join(", ");
    livePrice.innerHTML='<i>A$</i><b>'+r.price.toFixed(2)+'</b>';
  } else {
    liveName.textContent = u>0.948 ? "Burnt through"
                         : u<0.40  ? "Green"
                         : u<P_FC  ? "Browning"
                         :           "Just cracked";
    liveMeta.textContent=Math.round(T)+"°C · "+mmss(s)+" · "+phaseOf(u);
    livePrice.innerHTML='<i>A$</i><b>—</b>';
  }
  if(z!==lastZone){
    lastZone=z;
    rowEls.forEach((b,i)=>{ b.classList.toggle("on",i===z);
      b.setAttribute("aria-pressed",i===z?"true":"false"); });
    if(z>=0){
      sel=z; buy.disabled=false; buy.classList.remove("done"); buy.textContent="Add 250 g";
    } else { sel=-1; buy.disabled=true; }
  }
  const a=acidAt(u), br=brownAt(u), cb=carbonAt(u), tot=a+br+cb||1;
  ribA.style.width=(a/tot*100).toFixed(2)+"%";
  ribS.style.width=(br/tot*100).toFixed(2)+"%";
  ribC.style.width=(cb/tot*100).toFixed(2)+"%";
  ribkeys.innerHTML="Fruit acid <b>"+Math.round(a/tot*100)+"%</b> · Browned sugar <b>"+
    Math.round(br/tot*100)+"%</b> · Carbon <b>"+Math.round(cb/tot*100)+"%</b>";
  gripEl.setAttribute("aria-valuenow",String(Math.round(u*1000)));
  gripEl.setAttribute("aria-valuetext",
    Math.round(T)+" degrees at "+mmss(s)+", "+phaseOf(u)+
    (z>=0?" — "+ROASTS[z].name+", "+ROASTS[z].level+" roast, A$"+ROASTS[z].price.toFixed(2):""));
  if(swG){
    swG.setTransform(V.dpr,0,0,V.dpr,0,0);
    swG.clearRect(0,0,30,38);
    paintBean(swG,15,19,13,u,{rot:-0.2,seed:5.1,persp:0.94});
  }
}
function markFound(i){
  if(found[i]) return;
  found[i]=true; foundCount++;
  const d=runEl.querySelector('[data-t="'+i+'"]'); if(d) d.textContent=" ● tasted";
  tally.textContent=foundCount+" / 4 tasted";
  tally.classList.add("some");
}
buy.addEventListener("click",()=>{
  if(sel<0) return;
  buy.classList.add("done");
  buy.textContent="Added · A$"+ROASTS[sel].price.toFixed(2);
  clearTimeout(buy._t);
  buy._t=setTimeout(()=>{ buy.classList.remove("done"); buy.textContent="Add 250 g"; },2000);
});
/* ══ 9 · input — everything drives the same one number ════════════════════ */
let tween=null;
function tweenTo(y,ms){
  const from=window.scrollY, to=clamp(y,0,V.scrollMax), t0=performance.now();
  tween={from,to,t0,ms:ms||Math.min(1400,420+Math.abs(to-from)*0.32)};
}
function stopTween(){ tween=null; }
function armIt(){ if(armed) return; armed=true; hintEl.classList.add("gone"); stopTween(); demo=null; }
let dragging=false;
function fromGrip(e){
  const r=gripEl.getBoundingClientRect();
  const q=clamp01((e.clientX-r.left)/Math.max(1,r.width));
  window.scrollTo(0,q*V.scrollMax);
}
gripEl.addEventListener("pointerdown",e=>{
  dragging=true; armIt(); fromGrip(e); e.preventDefault();
  try{ gripEl.setPointerCapture(e.pointerId); }catch(err){}
});
window.addEventListener("pointermove",e=>{ if(dragging) fromGrip(e); });
const endDrag=()=>{ dragging=false; };
window.addEventListener("pointerup",endDrag);
window.addEventListener("pointercancel",endDrag);
gripEl.addEventListener("keydown",e=>{
  const step=(e.shiftKey?0.06:0.014)*V.scrollMax;
  let ok=true;
  if(e.key==="ArrowRight"||e.key==="ArrowUp") tweenTo(window.scrollY+step,220);
  else if(e.key==="ArrowLeft"||e.key==="ArrowDown") tweenTo(window.scrollY-step,220);
  else if(e.key==="Home") tweenTo(0);
  else if(e.key==="End") tweenTo(V.scrollMax);
  else if(e.key==="PageUp"||e.key==="PageDown"){
    const z=zoneAt(clamp01(window.scrollY/V.scrollMax));
    const n=clamp((z<0?(e.key==="PageUp"?0:3):z+(e.key==="PageUp"?1:-1)),0,3);
    tweenTo(((ROASTS[n].lo+ROASTS[n].hi)/2)*V.scrollMax);
  } else ok=false;
  if(ok){ armIt(); e.preventDefault(); }
});
["wheel","touchstart","keydown"].forEach(ev=>
  window.addEventListener(ev,()=>{ if(!armed){ armed=true; hintEl.classList.add("gone"); demo=null; stopTween(); } },{passive:true}));
/* ══ 10 · the demo it runs at itself, once, so nobody finds this by accident ═ */
let demo=null;
function startDemo(){
  if(still||window.scrollY>4) return;
  if(document.visibilityState!=="visible"){        /* nobody is watching it yet */
    document.addEventListener("visibilitychange",()=>{ if(!armed) startDemo(); },{once:true});
    return;
  }
  demo={t0:performance.now()};
  slideRock=1;
}
/* ══ 11 · loop ════════════════════════════════════════════════════════════ */
let last=performance.now(), prevU=0, booted=false;
function fireCrack(kind){
  burst={a:0,pop:0,n:kind===1?10:14,seed:Math.random()*6,kind};
  crackLabel=kind===1?"FIRST CRACK — IT OPENS":"SECOND CRACK — OIL COMES OUT";
  crackAge=0;
  if(kind===1){
    const r=rng(Date.now()&0xffff);
    for(let i=0;i<20;i++){
      const a=r()*6.2832;
      chaff.push({x:beanPos.x+Math.cos(a)*beanPos.r*0.78,
                  y:beanPos.y+Math.sin(a)*beanPos.r*0.86,
                  vx:Math.cos(a)*(90+r()*190),vy:-80-r()*200,
                  r:2.5+r()*3.8,a:0,rot:r()*6,spin:(r()-0.5)*9});
    }
  }
}
function frame(now){
  const dt=Math.min((now-last)/1000,0.05); last=now;
  const t=now/1000;
  if(demo){
    /* out and back: the roast visibly runs a short way on its own, so the page
       demonstrates that it moves before anybody touches anything */
    const q=(now-demo.t0)/2600;
    /* ⚠️ The demo MUST snap back explicitly. rAF is throttled in a background
       tab, so the last frame before q crosses 1 can be as early as q≈0.77 and
       the sine never reaches zero — measured: the page settled at scrollY 191
       instead of 0, i.e. a visitor who looked away during the intro came back to
       a page already 9% roasted. Never trust an easing curve to land on its own. */
    if(q>=1){ demo=null; slideRock=0; window.scrollTo(0,0); }
    else{
      const e=Math.sin(clamp01(q)*Math.PI);
      window.scrollTo(0,e*V.scrollMax*0.135);
      slideRock=1-clamp01((q-0.55)/0.45);
    }
  } else if(tween){
    const q=clamp01((now-tween.t0)/tween.ms);
    const e=q<0.5?4*q*q*q:1-Math.pow(-2*q+2,3)/2;
    window.scrollTo(0,lerp(tween.from,tween.to,e));
    if(q>=1) tween=null;
  }
  const u=clamp01(window.scrollY/Math.max(1,V.scrollMax));
  const heat=clamp01((tempAt(u)-22)/224);
  if(prevU<P_FC&&u>=P_FC) fireCrack(1);
  if(prevU<P_SC&&u>=P_SC) fireCrack(2);
  if(burst){
    burst.a+=dt;
    burst.pop=Math.sin(clamp01(burst.a/0.30)*Math.PI)*(burst.kind===1?0.075:0.04);
    if(burst.a>0.62) burst=null;
  }
  crackAge+=dt;
  const z=zoneAt(u);
  if(z>=0&&Math.abs(u-prevU)<0.0016){ dwell+=dt; if(dwell>0.5) markFound(z); }
  else dwell=0;
  if(u!==prevU||!booted){ syncState(u); litStops(); litStations(u); booted=true; }
  prevU=u;
  drawScene(t,u,heat);
  requestAnimationFrame(frame);
}
/* ══ 12 · boot ════════════════════════════════════════════════════════════ */
function measure(){
  const w=Math.max(320,window.innerWidth), h=Math.max(420,window.innerHeight);
  V.w=w; V.h=h;
  V.dpr=Math.min(window.devicePixelRatio||1,1.75);
  V.wide=w>=860;
  V.pad=V.wide?Math.min(44,Math.max(16,w*0.032)):16;
  V.botH=document.querySelector(".botframe").offsetHeight||74;
  V.topH=document.querySelector(".topframe").offsetHeight||70;
  V.x0=V.wide?0.48:0.16; V.x1=V.wide?0.80:0.30;
  V.beanY=h*(V.wide?0.545:0.615);
  V.ryBase=V.wide?Math.min(h*0.102,w*0.066):Math.min(h*0.086,w*0.165);
  /* the pan has to be twice the bean or the whole thing reads as a toy — the
     first screenshot had a boulder sitting in a saucer */
  V.panR=Math.max(V.ryBase*1.78,Math.min(V.ryBase*2.05,w*0.215));
  V.panRy=V.panR*0.30;
  V.ledgeTop=h-V.botH-h*(V.wide?0.130:0.100);
  V.bench=h*0.615;
  V.scrollMax=Math.round(h*2.4);
  cv.width=Math.round(w*V.dpr); cv.height=Math.round(h*V.dpr);
  cv.style.width=w+"px"; cv.style.height=h+"px";
  g=cv.getContext("2d");
  PAT_DARK=g.createPattern(TILE_DARK,"repeat");
  PAT_LIGHT=g.createPattern(TILE_LIGHT,"repeat");
  PAT_PAPER=g.createPattern(TILE_PAPER,"repeat");
  swatch.width=Math.round(30*V.dpr); swatch.height=Math.round(38*V.dpr);
  swG=swatch.getContext("2d");
  pageEl.style.height=(V.scrollMax+h)+"px";
  /* the grip: the grab surface for the drawn brass slide, and the one element
     on the page that is allowed touch-action:none */
  /* the slide starts clear of the scoop that is cropped by the left edge, so the
     foreground has two objects in it and not one control laid across everything */
  const sx=V.wide?w*0.185:w*0.22;
  V.slide={x:sx, y:V.ledgeTop+h*0.055, w:Math.max(120,w-V.pad-sx)};
  gripEl.style.left=V.slide.x+"px";
  gripEl.style.width=V.slide.w+"px";
  gripEl.style.top=(V.slide.y-24)+"px";
  gripEl.style.height="52px";
  hintEl.style.left=V.slide.x+"px";
  hintEl.style.top=(V.slide.y-46)+"px";
  bakeBackground();
  placeStops();
  litStops();
  syncState(clamp01(window.scrollY/V.scrollMax));
}
/* paper grain, made once — warm, never grey */
(function grain(){
  const c=document.createElement("canvas"); c.width=c.height=128;
  const gg=c.getContext("2d"), im=gg.createImageData(128,128), r=rng(7);
  for(let i=0;i<im.data.length;i+=4){
    const v=228+Math.floor(r()*27);
    im.data[i]=Math.min(255,v+5); im.data[i+1]=v; im.data[i+2]=v-9; im.data[i+3]=255;
  }
  gg.putImageData(im,0,0);
  $("grain").style.backgroundImage="url("+c.toDataURL()+")";
})();
let rt=0;
window.addEventListener("resize",()=>{ clearTimeout(rt); rt=setTimeout(measure,120); });
window.addEventListener("scroll",()=>{ litStops(); },{passive:true});
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ measure(); });
measure();
requestAnimationFrame(frame);
setTimeout(startDemo,700);
})();
