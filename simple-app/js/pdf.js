/* Hygo — devis client en PDF (A4), sans bibliothèque : polices standard Helvetica, encodage WinAnsi (accents français).
   devisPdf(info) renvoie un Blob « application/pdf ». Les textes arrivent déjà formatés (montants, dates) depuis js/app.js :
   { no, date, validUntil, route, transport, name, details, qty, unitPrice, total, totalValue,
     colis:[[libellé,valeur]…], livraison:[[libellé,valeur]…], included:[…], excluded:[…], conditions:[…], issuer:{name,email} } */
(()=>{
// Caractères hors Latin-1 présents dans WinAnsi ; espaces insécables (dont l’espace fine des montants) → espace insécable.
const WIN={'€':0x80,'‚':0x82,'„':0x84,'…':0x85,'‘':0x91,'’':0x92,'“':0x93,'”':0x94,'•':0x95,'–':0x96,'—':0x97,'œ':0x9C,'Œ':0x8C,' ':0xA0,' ':0x20};
const enc=s=>[...String(s??'')].map(c=>{
  if(WIN[c]!=null)return String.fromCharCode(WIN[c]);
  const n=c.charCodeAt(0);
  return n<256&&!(n>=0x80&&n<0xA0)?c:c==='→'?'->':'?';
}).join('');
const pdfStr=s=>'('+enc(s).replace(/[\\()]/g,'\\$&')+')';
const rgb=hex=>[1,3,5].map(i=>(parseInt(hex.slice(i,i+2),16)/255).toFixed(3)).join(' ');

/* Largeurs Helvetica (1/1000 em) des caractères 32 à 126, pour aligner à droite et couper les lignes. */
const REG=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const BOLD=[278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
// Lettres accentuées : largeur de la lettre de base.
const base=c=>c.normalize('NFD')[0];
function width(s,size,bold){
  const t=bold?BOLD:REG;let w=0;
  for(const ch of String(s)){
    const c=base(ch), n=c.charCodeAt(0);
    w+=n>=32&&n<=126?t[n-32]:ch===' '||ch===' '?278:ch==='×'?584:ch==='•'?350:ch==='’'?(bold?278:222):556;
  }
  return w*size/1000;
}
function wrap(text,max,size,bold){
  const out=[];let line='';
  for(const w of String(text??'').split(/\s+/).filter(Boolean)){
    const next=line?line+' '+w:w;
    if(line&&width(next,size,bold)>max){out.push(line);line=w}else line=next;
  }
  if(line)out.push(line);
  return out.length?out:[''];
}

/* Montant en toutes lettres (« Arrêté le présent devis à la somme de… »), orthographe traditionnelle. */
const U=['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize'];
const TENS={2:'vingt',3:'trente',4:'quarante',5:'cinquante',6:'soixante'};
function below100(n){
  if(n<17)return U[n];
  if(n<20)return 'dix-'+U[n-10];
  const t=Math.floor(n/10), u=n%10;
  if(t===7)return 'soixante'+(n===71?' et ':'-')+below100(n-60);
  if(t===8)return u?'quatre-vingt-'+U[u]:'quatre-vingts';
  if(t===9)return 'quatre-vingt-'+below100(n-80);
  return TENS[t]+(u===1?' et un':u?'-'+U[u]:'');
}
function below1000(n){
  const h=Math.floor(n/100), r=n%100;
  let s=h?(h>1?U[h]+' cent'+(r?'':'s'):'cent'):'';
  if(r)s+=(s?' ':'')+below100(r);
  return s;
}
function inWords(n){
  n=Math.round(Math.abs(n));
  if(!n)return 'zéro';
  const md=Math.floor(n/1e9), mi=Math.floor(n/1e6)%1000, th=Math.floor(n/1000)%1000, r=n%1000, out=[];
  if(md)out.push(below1000(md)+' milliard'+(md>1?'s':''));
  if(mi)out.push(below1000(mi)+' million'+(mi>1?'s':''));
  // « mille » est invariable, et « cents / vingts » perdent leur s devant lui.
  if(th)out.push(th===1?'mille':below1000(th).replace(/(cent|vingt)s$/,'$1')+' mille');
  if(r)out.push(below1000(r));
  return out.join(' ');
}

window.devisPdf=function(info){
  const W=595,H=842,X=48,R=W-48;
  const ACCENT='#5B4BDB', INK='#191827', MUTED='#6B6880', LINE='#E2E0EC', TINT='#F5F4FA', SOFT='#EEEBFD', OK='#1E8E5A', NO='#B4233C';
  const ops=[];
  const text=(s,x,y,size,{bold=false,color=INK,align='left'}={})=>{
    const xx=align==='right'?x-width(s,size,bold):align==='center'?x-width(s,size,bold)/2:x;
    ops.push(`BT /${bold?'F2':'F1'} ${size} Tf ${rgb(color)} rg ${xx.toFixed(2)} ${y.toFixed(2)} Td ${pdfStr(s)} Tj ET`);
  };
  const f=n=>n.toFixed(2);
  const rect=(x,y,w,h,color)=>ops.push(`${rgb(color)} rg ${f(x)} ${f(y)} ${f(w)} ${f(h)} re f`);
  const hline=(y,x1=X,x2=R,color=LINE,lw=0.8)=>ops.push(`${rgb(color)} RG ${lw} w ${f(x1)} ${f(y)} m ${f(x2)} ${f(y)} l S`);
  // Rectangle à coins arrondis (courbes de Bézier) : rempli et/ou bordé.
  const round=(x,y,w,h,r,{fill=null,stroke=null,lw=0.8}={})=>{
    const k=r*0.5523;
    const p=`${f(x+r)} ${f(y)} m ${f(x+w-r)} ${f(y)} l ${f(x+w-r+k)} ${f(y)} ${f(x+w)} ${f(y+r-k)} ${f(x+w)} ${f(y+r)} c `+
      `${f(x+w)} ${f(y+h-r)} l ${f(x+w)} ${f(y+h-r+k)} ${f(x+w-r+k)} ${f(y+h)} ${f(x+w-r)} ${f(y+h)} c `+
      `${f(x+r)} ${f(y+h)} l ${f(x+r-k)} ${f(y+h)} ${f(x)} ${f(y+h-r+k)} ${f(x)} ${f(y+h-r)} c `+
      `${f(x)} ${f(y+r)} l ${f(x)} ${f(y+r-k)} ${f(x+r-k)} ${f(y)} ${f(x+r)} ${f(y)} c h`;
    ops.push(`${fill?rgb(fill)+' rg ':''}${stroke?rgb(stroke)+' RG '+lw+' w ':''}${p} ${fill&&stroke?'B':fill?'f':'S'}`);
  };
  const tick=(x,y,color)=>ops.push(`${rgb(color)} RG 1.4 w 1 J 1 j ${f(x)} ${f(y+3.6)} m ${f(x+2.8)} ${f(y+0.8)} l ${f(x+8)} ${f(y+7)} l S 0 J 0 j`);
  const cross=(x,y,color)=>ops.push(`${rgb(color)} RG 1.4 w 1 J ${f(x+0.8)} ${f(y+0.8)} m ${f(x+7.2)} ${f(y+7.2)} l ${f(x+0.8)} ${f(y+7.2)} m ${f(x+7.2)} ${f(y+0.8)} l S 0 J`);

  /* ---------- En-tête : émetteur à gauche, « DEVIS » à droite ---------- */
  rect(0,H-6,W,6,ACCENT);
  round(X,H-84,36,36,8,{fill:ACCENT});
  text('H',X+18,H-72.5,19,{bold:true,color:'#FFFFFF',align:'center'});
  text('Hygo',X+48,H-62,16,{bold:true});
  text('Import Chine – Madagascar',X+48,H-77,9,{color:MUTED});
  text('DEVIS',R,H-64,26,{bold:true,color:ACCENT,align:'right'});
  text('N° '+info.no,R,H-80,10,{bold:true,color:MUTED,align:'right'});

  /* ---------- Repères : dates, trajet, transport ---------- */
  let y=H-112;
  round(X,y-42,R-X,46,8,{fill:TINT});
  const meta=[['Date d’émission',info.date],['Valable jusqu’au',info.validUntil],['Trajet',info.route],['Transport',info.transport]].filter(m=>m[1]);
  const mw=(R-X)/meta.length;
  meta.forEach(([k,v],i)=>{
    const mx=X+14+i*mw;
    text(k.toUpperCase(),mx,y-14,7.5,{bold:true,color:MUTED});
    text(v,mx,y-30,10,{bold:true});
  });
  y-=64;

  /* ---------- Tableau : désignation, quantité, prix unitaire, montant ---------- */
  const cQty=332, cUnit=432;
  round(X,y-9,R-X,26,6,{fill:INK});
  text('DÉSIGNATION',X+12,y,8,{bold:true,color:'#FFFFFF'});
  text('QTÉ',cQty,y,8,{bold:true,color:'#FFFFFF',align:'right'});
  text('PRIX UNITAIRE',cUnit,y,8,{bold:true,color:'#FFFFFF',align:'right'});
  text('MONTANT',R-12,y,8,{bold:true,color:'#FFFFFF',align:'right'});
  y-=34;
  const nameLines=wrap(info.name,cQty-X-70,11.5,true);
  const rowTop=y;
  nameLines.forEach((l,i)=>text(l,X+12,y-i*15,11.5,{bold:true}));
  text(String(info.qty),cQty,rowTop,10.5,{align:'right'});
  text(info.unitPrice,cUnit,rowTop,10.5,{align:'right'});
  text(info.total,R-12,rowTop,10.5,{bold:true,align:'right'});
  y-=(nameLines.length-1)*15+15;
  for(const l of wrap(info.details,cQty-X-30,8.5,false)){text(l,X+12,y,8.5,{color:MUTED});y-=11}
  y-=10;
  hline(y);

  /* ---------- Totaux à droite, montant en lettres à gauche ---------- */
  const tx=330;
  y-=20;
  text('Sous-total',tx+12,y,9.5,{color:MUTED});
  text(info.total,R-12,y,9.5,{bold:true,align:'right'});
  y-=10;hline(y,tx,R);
  y-=34;
  round(tx,y-10,R-tx,34,6,{fill:ACCENT});
  text('TOTAL À PAYER',tx+12,y+2,9.5,{bold:true,color:'#FFFFFF'});
  text(info.total,R-12,y+1,15,{bold:true,color:'#FFFFFF',align:'right'});
  if(isFinite(info.totalValue)){
    const w=inWords(info.totalValue);
    let wy=y+40;
    text('Arrêté le présent devis à la somme de :',X,wy,8.5,{color:MUTED});
    for(const l of wrap(w.charAt(0).toUpperCase()+w.slice(1)+' ariary.',tx-X-24,9.5,true)){wy-=13;text(l,X,wy,9.5,{bold:true})}
  }
  y-=40;

  /* ---------- Deux encadrés : colis et livraison ---------- */
  const gap=16, bw=(R-X-gap)/2;
  const rowsH=rows=>rows.reduce((h,[k,v])=>h+Math.max(1,wrap(v,bw-28-width(k,9,false)-10,9,true).length)*12+8,0);
  const bh=Math.max(rowsH(info.colis||[]),rowsH(info.livraison||[]))+38;
  const panel=(title,rows,x)=>{
    round(x,y-bh,bw,bh,8,{stroke:LINE});
    text(title.toUpperCase(),x+14,y-20,8,{bold:true,color:ACCENT});
    let yy=y-40;
    for(const [k,v] of rows){
      text(k,x+14,yy,9,{color:MUTED});
      const lines=wrap(v,bw-28-width(k,9,false)-10,9,true);
      lines.forEach((l,i)=>text(l,x+bw-14,yy-i*12,9,{bold:true,align:'right'}));
      yy-=Math.max(1,lines.length)*12+8;
    }
  };
  panel('Colis',info.colis||[],X);
  panel('Livraison',info.livraison||[],X+bw+gap);
  y-=bh+22;

  /* ---------- Inclus / non compris, côte à côte ---------- */
  const listH=(list)=>list.reduce((h,it)=>h+wrap(it,bw-30,9,false).length*12+5,0);
  const lh=Math.max(listH(info.included||[]),listH(info.excluded||[]));
  const list=(title,items,x,mark,color)=>{
    text(title.toUpperCase(),x,y,8,{bold:true,color:MUTED});
    let yy=y-18;
    for(const it of items){
      mark(x,yy-1,color);
      const lines=wrap(it,bw-30,9,false);
      lines.forEach((l,i)=>text(l,x+16,yy-i*12,9));
      yy-=lines.length*12+5;
    }
  };
  list('Le prix comprend',info.included||[],X,tick,OK);
  if((info.excluded||[]).length)list('Non compris',info.excluded,X+bw+gap,cross,NO);
  y-=lh+26;

  /* ---------- Conditions ---------- */
  text('CONDITIONS',X,y,8,{bold:true,color:MUTED});
  y-=15;
  (info.conditions||[]).forEach((c,i)=>{
    const lines=wrap(c,R-X-16,8.5,false);
    text(`${i+1}.`,X,y,8.5,{bold:true,color:MUTED});
    lines.forEach((l,j)=>text(l,X+14,y-j*11,8.5,{color:MUTED}));
    y-=lines.length*11+4;
  });

  /* ---------- Émetteur et bon pour accord (calés au-dessus du pied de page) ---------- */
  // Le bloc tient entre la fin des conditions et le pied de page (filet à 58 pt).
  const sy=Math.max(Math.min(y-14,186),148);
  const iss=info.issuer||{};
  text('ÉMIS PAR',X,sy-14,8,{bold:true,color:MUTED});
  if(iss.name)text(iss.name,X,sy-30,10,{bold:true});
  if(iss.email)text(iss.email,X,sy-(iss.name?44:30),9,{color:MUTED});
  round(X+bw+gap,sy-82,bw,82,8,{stroke:LINE});
  text('BON POUR ACCORD',X+bw+gap+14,sy-14,8,{bold:true,color:ACCENT});
  text('Date, nom et signature du client',X+bw+gap+14,sy-28,8.5,{color:MUTED});

  /* ---------- Pied de page ---------- */
  hline(58);
  text('Hygo · Devis '+info.no+(info.date?' du '+info.date:''),X,44,8,{color:MUTED});
  text('Page 1 / 1',R,44,8,{color:MUTED,align:'right'});

  const stream=ops.join('\n');
  const objs=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    `<< /Title ${pdfStr('Devis '+info.no)} /Producer (Hygo) >>`
  ];
  // Tout est en octets 0–255 : la longueur de la chaîne est celle du fichier, d’où les décalages de la table xref.
  let out='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets=objs.map((o,i)=>{const at=out.length;out+=`${i+1} 0 obj\n${o}\nendobj\n`;return at});
  const xref=out.length;
  out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+offsets.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('');
  out+=`trailer\n<< /Size ${objs.length+1} /Root 1 0 R /Info ${objs.length} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([Uint8Array.from(out,c=>c.charCodeAt(0))],{type:'application/pdf'});
};
window.devisPdf.inWords=inWords;
})();
