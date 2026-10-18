const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../Devis Transitaires.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Règles métier pures (avant le shell) + checkQuote, sans DOM.
const context=vm.createContext({localStorage:{getItem:()=>null,setItem:()=>{}},console,setTimeout,clearTimeout,crypto:globalThis.crypto});
vm.runInContext(script.split('/* ---------- shell')[0]+'\n'+script.slice(script.indexOf('function checkQuote('),script.indexOf('function reviewDialog(')),context);
const run=code=>vm.runInContext(code,context);
// Appelle une fonction du script avec des arguments JS ; `data` renvoie une copie simple (sans prototype du contexte).
const call=(fn,...args)=>{context.__args=args;return run(`${fn}(...__args)`)};
const data=(fn,...args)=>JSON.parse(JSON.stringify(call(fn,...args)));
const NOW='2026-10-15T08:00:00.000Z';
const STATUS={DRAFT:'Brouillon',CONFIRMED:'Confirmé',ORDERED:'Commandé en Chine',SHIPPED:'En transit vers Madagascar',ARRIVED:'Arrivé à Madagascar',RECEPTION:'Contrôle de réception',STOCK:'Stock boutique',TO_DELIVER:'À livrer',DELIVERED:'Livré au client',CANCELLED:'Annulé'};

// Devis enregistré tel que saveQuote le crée : entrées sans champs de suivi, résultat figé, historique de création.
function makeQuote(no,overrides={}){
  const draft={...run(`exampleDraft("${no}")`),destination:'Stock boutique',...overrides};
  const R=call('compute',draft);
  const {status,destination,...inputs}=JSON.parse(JSON.stringify(draft));
  return call('normalizeQuoteWorkflow',{no,created:NOW,modified:NOW,inputs:{...inputs,mode:'manuel',offer:R.sel?.label},res:call('snapshot',draft,R),offer:R.sel?.label,destination:draft.destination,status:STATUS.DRAFT,statusHistory:[{from:null,to:STATUS.DRAFT,at:NOW,comment:'Création du devis'}]});
}
const json=x=>JSON.parse(JSON.stringify(x));
const confirmedOf=q=>data('applyTransition',q,STATUS.CONFIRMED,{confirmation:{at:NOW,params:{},tariff:{},offer:q.offer}},NOW);
const dayStrOf=n=>n==null?null:new Date(Math.floor(n)*864e5).toISOString().slice(0,10);

// 1. Brouillon initial ; les champs de suivi n’entrent pas dans les entrées du devis.
assert.equal(run('blankDraft("X").status'),STATUS.DRAFT);
const quote=makeQuote('DEV-0001');
assert.equal(quote.status,STATUS.DRAFT);
assert.equal(quote.destination,'Stock boutique');
assert.equal('status' in quote.inputs,false);
assert.equal('destination' in quote.inputs,false);
assert.ok(quote.res.costLot>0,'coût de la commande calculé');

// 2. Migration : devis sans statut → Brouillon à vérifier ; idempotente.
const legacy={no:'DEV-0009',created:NOW,modified:NOW,inputs:run('exampleDraft("DEV-0009")'),res:quote.res,offer:quote.offer};
context.__legacy=legacy;
run('globalThis.legacyState=normAll({params:defaultParams(),tarifs:JSON.parse(JSON.stringify(SEED.T)),cal:JSON.parse(JSON.stringify(SEED.C)),quotes:[JSON.parse(JSON.stringify(__legacy))],draft:exampleDraft("DEV-0001")})');
const migratedOnce=run('JSON.stringify(legacyState.quotes[0])');
assert.equal(run('legacyState.quotes[0].status'),STATUS.DRAFT);
assert.equal(run('legacyState.quotes[0].needsStatusReview'),true);
assert.equal(run('legacyState.quotes[0].statusHistory[0].manual'),true);
run('globalThis.migratedAgain=normAll(JSON.parse(JSON.stringify(legacyState)))');
assert.equal(run('JSON.stringify(migratedAgain.quotes[0])'),migratedOnce,'la migration ne change pas un devis déjà migré');
assert.equal(run('migratedAgain.quotes[0].statusHistory.length'),1,'l’historique n’est pas dupliqué');
assert.deepEqual(JSON.parse(run('JSON.stringify(legacyState.stock)')),[]);

// 3. Ordre des transitions et contrôles avant confirmation.
assert.match(call('transitionError',quote,STATUS.ORDERED,{}),/ne peut pas passer/);
assert.equal(call('transitionError',{...quote,destination:''},STATUS.CONFIRMED,{},{}),'Choisissez la destination (Stock boutique ou Commande client) avant de confirmer.');
assert.match(call('transitionError',quote,STATUS.CONFIRMED,{},{stale:true}),/enregistrez à nouveau/);
assert.equal(call('transitionError',quote,STATUS.CONFIRMED,{},{stale:false}),null);

// 4. Chemin « Stock boutique » : dates chronologiques, historique et statut.
const orderPayload={platform:'Pinduoduo',supplier:'Shop A',reference:'PDD-1',orderedAt:'2026-10-16',paidAmountCny:4.04,qtyOrdered:20,parcelRef:''};
const ordered=data('applyTransition',confirmedOf(quote),STATUS.ORDERED,orderPayload,NOW);
assert.equal(ordered.status,STATUS.ORDERED);
assert.equal(ordered.logistics.paidAt,'2026-10-16');
assert.equal(ordered.order.qtyOrdered,20);
assert.equal(ordered.statusHistory.length,3);
assert.match(call('transitionError',ordered,STATUS.SHIPPED,{date:'2026-10-15'}),/antérieure/,'expédition avant paiement refusée');
assert.equal(call('transitionError',ordered,STATUS.SHIPPED,{date:'2026-10-18'}),null);
const shipped=data('applyTransition',ordered,STATUS.SHIPPED,{date:'2026-10-18'},NOW);
const arrived=data('applyTransition',shipped,STATUS.ARRIVED,{date:'2026-10-30'},NOW);
assert.equal(arrived.status,STATUS.ARRIVED);
assert.match(call('transitionError',arrived,'À récupérer',{date:'2026-10-29'}),/antérieure/);
assert.match(call('transitionError',arrived,STATUS.DELIVERED,{date:'2026-11-01',confirmed:true}),/Passage impossible/);

// 5. Estimations figées à la confirmation ; dates réelles séparées.
const confirmedQuote=confirmedOf(quote);
assert.equal(confirmedQuote.estimates.arrivalInitial,dayStrOf(quote.res.arrMax));
assert.equal(confirmedQuote.logistics.arrivalPlanned,confirmedQuote.estimates.arrivalInitial);
assert.equal(confirmedQuote.logistics.arrivedAt,null);

// 6. Date estimée modifiée : ancienne valeur, nouvelle valeur, motif ; le statut ne change pas.
const moved=data('plannedDateChange',confirmedQuote,'arrival','2026-12-05','Retard du vol',NOW);
assert.equal(moved.logistics.arrivalPlanned,'2026-12-05');
assert.equal(moved.dateHistory.length,1);
assert.equal(moved.dateHistory[0].oldValue,confirmedQuote.estimates.arrivalInitial);
assert.equal(moved.dateHistory[0].reason,'Retard du vol');
assert.equal(moved.status,STATUS.CONFIRMED);
assert.equal(moved.estimates.arrivalInitial,confirmedQuote.estimates.arrivalInitial,'l’estimation initiale reste figée');
assert.throws(()=>call('plannedDateChange',arrived,'arrival','2026-12-09','Motif',NOW),/ne peut plus être modifiée/);
assert.throws(()=>call('plannedDateChange',confirmedQuote,'arrival','2026-12-05','',NOW),/motif/);

// 7. Réception partielle : 20 commandées, 17 reçues dont 1 endommagée → 16 acceptées, 3 manquantes.
const atReception={...arrived,status:STATUS.RECEPTION,order:{qtyOrdered:20}};
const r1=data('addReception',atReception,{date:'2026-11-02',qtyShipped:20,qtyReceived:17,qtyAccepted:16,qtyDamaged:1,comment:''},NOW);
const totals=data('receptionTotals',r1);
assert.deepEqual([totals.ordered,totals.received,totals.accepted,totals.damaged,totals.missing],[20,17,16,1,3]);
assert.throws(()=>call('addReception',atReception,{date:'2026-11-02',qtyReceived:5,qtyAccepted:4,qtyDamaged:2},NOW),/acceptées et endommagées/);
assert.throws(()=>call('addReception',r1,{date:'2026-11-03',qtyReceived:4,qtyAccepted:4,qtyDamaged:0},NOW),/Plus d’unités reçues/);
assert.throws(()=>call('addReception',{...atReception,status:STATUS.ARRIVED},{date:'2026-11-02',qtyReceived:1,qtyAccepted:1,qtyDamaged:0},NOW),/pendant le contrôle/);
const r2=data('addReception',r1,{date:'2026-11-04',qtyReceived:3,qtyAccepted:3,qtyDamaged:0},NOW);
assert.equal(r2.receptions.length,2,'plusieurs réceptions partielles sur un même dossier');
assert.equal(data('receptionTotals',r2).accepted,19);
assert.equal(data('receptionTotals',r2).missing,0);

// 8. Branche stock : une seule entrée ; seules les quantités acceptées ; dommages exclus.
assert.equal(call('transitionError',r1,STATUS.STOCK,{},{hasStockEntry:false}),null);
assert.match(call('transitionError',r1,STATUS.STOCK,{},{hasStockEntry:true}),/existe déjà/,'un second passage en stock est refusé');
const entry=data('buildStockEntry',r1,NOW);
assert.equal(entry.qtyAccepted,16);
assert.equal(entry.qtyExcluded,1);
assert.equal(entry.costBasis,'estimé');
assert.deepEqual(data('nextStatuses',r1),[STATUS.STOCK]);

// 9. Branche client : informations et quantité avant « À livrer » ; confirmation avant livraison.
const clientQuote={...r1,destination:'Commande client'};
assert.deepEqual(data('nextStatuses',clientQuote),[STATUS.TO_DELIVER]);
assert.match(call('transitionError',clientQuote,STATUS.TO_DELIVER,{},{}),/nom, le contact/);
const withClient={...clientQuote,client:{name:'Client A',contact:'034 00',address:'Tana',comment:''},delivery:{qtyToDeliver:12,fee:null,plannedAt:null,actualAt:null,confirmed:false}};
assert.equal(call('transitionError',withClient,STATUS.TO_DELIVER,{},{}),null);
assert.match(call('clientError',withClient.client,{...withClient.delivery,qtyToDeliver:17},16),/dépasse/);
const toDeliver={...withClient,status:STATUS.TO_DELIVER};
assert.match(call('transitionError',toDeliver,STATUS.DELIVERED,{date:'2026-11-10',confirmed:false}),/confirmer la réception/);
assert.equal(call('transitionError',toDeliver,STATUS.DELIVERED,{date:'2026-11-10',confirmed:true}),null);

// 10. Dépenses réelles : conversion en Ar, coût réel, annulation qui conserve tout.
const spent=data('addExpense',ordered,{category:'Transport international',amount:100,currency:'CNY',rate:800,paidAt:'2026-10-20',proof:'REF-1',comment:'Fret'},NOW);
assert.equal(spent.expenses[0].amountAr,80000);
assert.equal(call('realCostAr',spent),80000);
assert.throws(()=>call('addExpense',ordered,{category:'Achat fournisseur',amount:100,currency:'CNY',rate:800,paidAt:'2026-10-15'},NOW),/ne peut pas précéder le paiement/);
const deliveredExpenseQuote={...ordered,status:STATUS.DELIVERED,delivery:{...ordered.delivery,actualAt:'2026-11-10'}};
assert.equal(call('addExpense',deliveredExpenseQuote,{category:'Transport international',amount:10,currency:'CNY',rate:800,paidAt:'2026-11-10'},NOW).expenses.length,1,'une dépense datée le jour de la livraison est permise');
assert.throws(()=>call('addExpense',deliveredExpenseQuote,{category:'Transport international',amount:10,currency:'CNY',rate:800,paidAt:'2026-11-11'},NOW),/ne peut pas être postérieure à la livraison/);
assert.throws(()=>call('addExpense',quote,{category:'Autres dépenses',amount:5,currency:'Ar',rate:1,paidAt:'2026-10-20'},NOW),/ne peuvent pas être ajoutées/);
assert.throws(()=>call('buildExpense',{category:'Autres dépenses',amount:5,currency:'USD',rate:null,paidAt:'2026-10-20'},NOW),/taux/);
const cancelled=data('applyTransition',spent,STATUS.CANCELLED,{reason:'Fournisseur en rupture'},NOW);
assert.equal(cancelled.status,STATUS.CANCELLED);
assert.equal(cancelled.expenses.length,1,'les dépenses sont conservées');
assert.equal(cancelled.statusHistory.at(-1).comment,'Fournisseur en rupture');
assert.match(call('transitionError',arrived,STATUS.CANCELLED,{reason:'x'}),/Passage impossible/,'pas d’annulation une fois arrivée');
assert.match(call('transitionError',spent,STATUS.CANCELLED,{reason:' '}),/motif/);

// 11. Révision : la version confirmée précédente est conservée ; pas de révision après la commande.
const revised=data('reviseQuote',confirmedQuote,NOW);
assert.equal(revised.status,STATUS.DRAFT);
assert.equal(revised.revisions.length,1);
assert.equal(revised.revisions[0].res.costLot,confirmedQuote.res.costLot);
assert.throws(()=>call('reviseQuote',ordered,NOW),/avant la commande/);

// 12. Suppression et verrouillage : un suivi ne peut être ni effacé ni modifié.
assert.equal(call('canDeleteQuote',quote),true);
assert.equal(call('canDeleteQuote',spent),false);
assert.match(call('quoteActionBlock',confirmedQuote,'edit'),/Réviser/);
assert.match(call('quoteActionBlock',spent,'del'),/annulez-le/);
assert.equal(call('quoteActionBlock',quote,'edit'),null);

// 13. Immutabilité : une transition ne modifie pas le devis d’origine.
const snapshotBefore=JSON.stringify(confirmedQuote);
call('applyTransition',confirmedQuote,STATUS.ORDERED,orderPayload,NOW);
assert.equal(JSON.stringify(confirmedQuote),snapshotBefore);
assert.equal(confirmedQuote.res.costLot,quote.res.costLot,'coût figé');

// 14. Double clic : la même transition, rejouée sur le nouvel état, est refusée.
assert.match(call('transitionError',ordered,STATUS.ORDERED,orderPayload),/Passage impossible/);

// 15. Devis confirmé plus tard modifié dans les tarifs : détecté comme périmé.
const usdBefore=run('S.params.usd');
run('S.params.usd=S.params.usd*2');
assert.equal(call('quoteIsStale',quote),true,'les tarifs ont changé');
run(`S.params.usd=${usdBefore}`);
assert.equal(call('quoteIsStale',quote),false,'devis cohérent avec les tarifs');

// 16. Correction manuelle des anciens devis : tracée, réservée aux devis à vérifier.
const migrated=JSON.parse(run('JSON.stringify(legacyState.quotes[0])'));
const corrected=data('correctLegacyStatus',migrated,STATUS.CONFIRMED,'Confirmé sur papier avant le suivi',NOW);
assert.equal(corrected.needsStatusReview,false);
assert.equal(corrected.statusHistory.at(-1).manual,true);
assert.throws(()=>call('correctLegacyStatus',quote,STATUS.CONFIRMED,'x',NOW),/pas besoin/);

console.log('PASS: draft status, legacy migration (idempotent), transition order and blocked jumps, pre-confirmation checks, date chronology and history, estimates kept apart from actual dates, partial receptions with missing/damaged counts, single stock entry, client branch rules, real expenses in Ar, cancellation keeping expenses, revision history, delete and edit locks, immutability and double-click rejection, stale-quote detection.');
