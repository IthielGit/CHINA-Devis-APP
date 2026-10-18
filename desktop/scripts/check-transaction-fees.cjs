const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../Devis Transitaires.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1].split('/* ---------- shell')[0];
const context=vm.createContext({localStorage:{getItem:()=>null},setTimeout,clearTimeout,console});
vm.runInContext(source,context);
vm.runInContext(`
  globalThis.cases=[];
  for(const qty of [1,10])for(const trans of [2,0])for(const manual of [null,16600]){
    const d={...exampleDraft('TEST'),qty,trans,pvRetenu:manual,marge:0.5};
    const r=compute(d),without=compute({...d,trans:0});
    cases.push({qty,trans,manual,r,without});
  }
`,context);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
for(const {qty,trans,manual,r,without} of context.cases){
  close(r.transacLot,trans*r.yr);
  close(r.transacP,trans*r.yr/qty);
  close(r.costP*qty,r.costLot);
  close(r.costLot-without.costLot,trans*r.yr);
  close(r.costP-without.costP,trans*r.yr/qty);
  close(r.pvAdvised,Math.ceil(r.costP*1.5/100)*100);
  close(r.margeLot,r.pv*qty-r.costLot);
  close(r.margeP,r.pv-r.costP);
  close(r.sel.J,r.costP);
  for(let i=0;i<r.offers.length;i++){
    const a=r.offers[i],b=without.offers[i];
    if(a.J!==null)close(a.J-b.J,trans*r.yr/qty);
    assert.equal(a.rP,b.rP);
  }
  for(const key of ['costP','costLot','pvAdvised','margeLot','transacP'])assert.ok(Number.isFinite(r[key]),key);
  if(trans===2&&manual===null)console.log(JSON.stringify({qty,transactionPerPiece:r.transacP,transactionTotal:r.transacLot,costPerPiece:r.costP,totalCost:r.costLot,suggestedPrice:r.pvAdvised,totalMargin:r.margeLot}));
}
const one=context.cases.find(c=>c.qty===1&&c.trans===2&&c.manual===null).r;
const ten=context.cases.find(c=>c.qty===10&&c.trans===2&&c.manual===null).r;
close(one.transacP/10,ten.transacP);
console.log('PASS: 8 scenarios; 1/10 pieces; fees 2/0 CNY; automatic/manual price; comparison consistency and unchanged ranking; no non-finite calculation results.');
vm.runInContext(`
  const offer=S.tarifs.find(t=>t.tr==='E-SOA'&&t.cats==='Poudre/liquide; Aimant');
  const d={...exampleDraft('ESOA'),mode:'manuel',offer:offerLabel(offer),marge:0.5};
  globalThis.esoa=compute(d);
  globalThis.esoaFixed=compute({...d,pvRetenu:16600});
`,context);
close(context.esoa.costP,12712.74);
close(context.esoa.costLot,12712.74);
close(context.esoa.pvAdvised,19100);
close(context.esoaFixed.margeLot,3887.26);
console.log(JSON.stringify({example:'E-SOA',costPerPiece:context.esoa.costP,totalCost:context.esoa.costLot,suggestedPrice:context.esoa.pvAdvised,totalMargin:context.esoa.margeLot,marginAtFixed16600:context.esoaFixed.margeLot}));
