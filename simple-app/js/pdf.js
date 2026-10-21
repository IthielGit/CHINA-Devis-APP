/* Hygo — devis client en PDF (A4), sans bibliothèque : polices standard Helvetica, encodage WinAnsi (accents français).
   devisPdf({ no, name, qty, pv, total, mode, arrival, date }) renvoie un Blob « application/pdf ». */
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

// Coupe un texte en lignes d’environ `max` caractères (largeur moyenne Helvetica, suffisant ici).
function wrap(text,max){
  const out=[];let line='';
  for(const w of String(text).split(/\s+/).filter(Boolean)){
    if(line&&(line+' '+w).length>max){out.push(line);line=w}else line=line?line+' '+w:w;
  }
  if(line)out.push(line);
  return out.length?out:[''];
}

window.devisPdf=function(info){
  const W=595,H=842,X=48;
  const ACCENT='#5B4BDB', INK='#191827', MUTED='#6B6880', LINE='#E4E2EE';
  const ops=[];
  const text=(s,x,y,size,{bold=false,color=INK}={})=>ops.push(`BT /${bold?'F2':'F1'} ${size} Tf ${rgb(color)} rg ${x} ${y} Td ${pdfStr(s)} Tj ET`);
  const rect=(x,y,w,h,color)=>ops.push(`${rgb(color)} rg ${x} ${y} ${w} ${h} re f`);
  const hline=(y)=>ops.push(`${rgb(LINE)} RG 0.8 w ${X} ${y} m ${W-X} ${y} l S`);

  // Bandeau
  rect(0,H-96,W,96,ACCENT);
  text('DEVIS',X,H-58,24,{bold:true,color:'#FFFFFF'});
  text(info.no,X,H-80,11,{color:'#E6E2FF'});
  text('Chine - Madagascar',W-X-118,H-58,11,{color:'#E6E2FF'});
  text(info.date,W-X-118,H-80,11,{color:'#E6E2FF'});

  // Produit et prix
  let y=H-150;
  text('Produit',X,y,10,{color:MUTED});
  y-=26;
  for(const l of wrap(info.name,38)){text(l,X,y,20,{bold:true});y-=26}
  y-=14;
  text('Prix par pièce',X,y,10,{color:MUTED});
  y-=34;
  text(info.price,X,y,30,{bold:true,color:ACCENT});
  y-=34;

  // Détail
  const rows=[['Quantité',String(info.qty)],['Total',info.total],['Transport',info.mode],['Arrivée estimée',info.arrival]].filter(r=>r[1]);
  hline(y);
  for(const [k,v] of rows){
    y-=28;
    text(k,X,y,11,{color:MUTED});
    text(v,X+170,y,11,{bold:true});
    y-=14;
    hline(y);
  }

  // Conditions
  y-=36;
  for(const l of wrap('Prix valable à ce jour, sous réserve de l’évolution du taux de change. La date d’arrivée est une estimation, selon les départs du transitaire.',90)){text(l,X,y,9.5,{color:MUTED});y-=14}
  text('Devis établi avec Hygo',X,48,9,{color:MUTED});

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
})();
