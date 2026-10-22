/* Moteur de calcul de Hygo.
 * Copie fidèle du moteur de « desktop/Devis Transitaires.html » (de const SEED à snapshot).
 * Mêmes tarifs, mêmes formules, mêmes résultats. Seule la clé de stockage change.
 * Ne pas modifier ici sans reporter le changement dans la version bureau. */
const SEED = {"T":[{"tr":"Arizato","mode":"Avion","svc":"Standard","cats":"Général","tarif":67000,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":10,"dmax":15,"d1":"Dimanche","c1":1,"d2":null,"c2":null,"h":12,"note":"Danger. Poids réel / volumétrique à préciser. Clôture non communiquée (1 j avant supposé).","base":null},{"tr":"Arizato","mode":"Avion","svc":"Standard","cats":"Téléphone","tarif":50000,"unit":"pièce","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":10,"dmax":15,"d1":"Dimanche","c1":1,"d2":null,"c2":null,"h":12,"note":"Unité à préciser. Clôture supposée.","base":null},{"tr":"Arizato","mode":"Avion","svc":"Express","cats":"Général","tarif":80000,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":3,"dmax":5,"d1":"Samedi","c1":1,"d2":"Lundi","c2":1,"h":12,"note":"Aucun minimum facturable. Clôture supposée.","base":null},{"tr":"Arizato","mode":"Avion","svc":"Standard","cats":"Aimant","tarif":69000,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":10,"dmax":15,"d1":"Dimanche","c1":1,"d2":null,"c2":null,"h":12,"note":"Faire accepter l’aimant et la référence exacte. Clôture supposée.","base":null},{"tr":"Arizato","mode":"Avion","svc":"Express","cats":"Aimant","tarif":82000,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":3,"dmax":5,"d1":"Samedi","c1":1,"d2":"Lundi","c2":1,"h":12,"note":"Sensible ≠ tout produit dangereux. Clôture supposée.","base":null},{"tr":"Arizato","mode":"Avion","svc":"Standard","cats":"Ordinateur/tablette","tarif":130000,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":null,"dmax":null,"d1":null,"c1":null,"d2":null,"c2":null,"h":null,"note":"Admission avec batterie à confirmer. Délai et départ à obtenir.","base":null},{"tr":"E-SOA","mode":"Avion","svc":"Normal","cats":"Général","tarif":65800,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":7,"dmax":10,"d1":"Lundi","c1":2,"d2":null,"c2":null,"h":12,"note":"Prix TTC (affiche E-SOA). Fin de réception des colis : samedi avant 12 h, heure de Chine.","base":null},{"tr":"E-SOA","mode":"Avion","svc":"Express","cats":"Général","tarif":78800,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":3,"dmax":5,"d1":"Lundi","c1":2,"d2":"Jeudi","c2":1,"h":12,"note":"Prix TTC (affiche E-SOA). Fin de réception : samedi 12 h (départ lundi) et mercredi 12 h (départ jeudi), heure de Chine.","base":null},{"tr":"E-SOA","mode":"Avion","svc":"Standard","cats":"Batterie","tarif":128000,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":10,"dmax":15,"d1":"Jeudi","c1":0,"d2":null,"c2":null,"h":12,"note":"Prix TTC (affiche E-SOA). Fin de réception : jeudi avant 12 h, heure de Chine. Faire confirmer qu’un colis reçu le jeudi matin part bien le jour même.","base":null},{"tr":"E-SOA","mode":"Avion","svc":"Standard","cats":"Poudre/liquide; Aimant","tarif":88000,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":10,"dmax":15,"d1":"Jeudi","c1":0,"d2":null,"c2":null,"h":12,"note":"Prix TTC (affiche E-SOA). Fin de réception : jeudi avant 12 h, heure de Chine (à confirmer : départ le jour même). Composition et quantité à déclarer.","base":null},{"tr":"E-SOA","mode":"Maritime","svc":"Standard","cats":"Général","tarif":360,"unit":"m³","cur":"USD","palier":null,"tarif2":null,"min":null,"dmin":45,"dmax":60,"d1":null,"c1":null,"d2":null,"c2":null,"h":null,"note":"Prix TTC (affiche E-SOA). Délai jusqu’à l’arrivée à Tana. Aucun minimum facturable. Jour de départ non indiqué.","base":null},{"tr":"E-SOA","mode":"Maritime","svc":"Standard","cats":"Batterie","tarif":425,"unit":"m³","cur":"USD","palier":null,"tarif2":null,"min":null,"dmin":45,"dmax":60,"d1":null,"c1":null,"d2":null,"c2":null,"h":null,"note":"Prix TTC (affiche E-SOA). Délai jusqu’à l’arrivée à Tana. Valider la référence ; ne couvre pas le gaz. Jour de départ non indiqué.","base":null},{"tr":"Importation Express","mode":"Avion","svc":"Express","cats":"Général","tarif":77500,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":0.2,"dmin":3,"dmax":5,"d1":"Lundi","c1":2,"d2":"Jeudi","c2":1,"h":12,"note":"Prix TTC (message du 14/10/2026). Minimum 200 g. Fin de réception : samedi 12 h (départ lundi) et mercredi 12 h (départ jeudi), heure de Chine.","base":null},{"tr":"Importation Express","mode":"Avion","svc":"Normal","cats":"Général","tarif":67000,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":5,"dmax":10,"d1":"Vendredi","c1":1,"d2":null,"c2":null,"h":12,"note":"Message du 12/10/2026. Facturé au poids volumétrique. Fin de réception : jeudi 12 h, heure de Chine. Aucun minimum facturable.","base":"Poids volumétrique"},{"tr":"Importation Express","mode":"Maritime","svc":"Standard","cats":"Général","tarif":410,"unit":"m³","cur":"USD","palier":0.25,"tarif2":360,"min":null,"dmin":45,"dmax":60,"d1":"Vendredi","c1":1,"d2":null,"c2":null,"h":12,"note":"Message du 12/10/2026 : volume inférieur à 0,25 m³ → 410 USD/m³ ; volume supérieur à 0,25 m³ → 360 USD/m³. Aucun minimum facturable. Arrivée 45 à 60 jours. Jour de départ (vendredi) et clôture repris de l’ancienne info : à confirmer.","base":null},{"tr":"Importation Express","mode":"Maritime","svc":"Standard","cats":"Danger","tarif":null,"unit":"m³","cur":"USD","palier":null,"tarif2":null,"min":null,"dmin":null,"dmax":null,"d1":null,"c1":null,"d2":null,"c2":null,"h":null,"note":"Tarif, délai et admission du produit exact à obtenir (mention « 410 » à clarifier).","base":null},{"tr":"Importation de l’Asie","mode":"Avion","svc":"Fast","cats":"Général","tarif":82500,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":0.1,"dmin":2,"dmax":2,"d1":null,"c1":1,"d2":null,"c2":null,"h":12,"note":"FAST 48 h, environ 3 départs par semaine aux dates publiées (onglet Calendrier). Poids minimum 100 g. Habillement, bijoux, alimentaire. Maximum 32 kg par colis. Fin de réception non communiquée : veille 12 h supposée.","base":null},{"tr":"Importation de l’Asie","mode":"Avion","svc":"Fast","cats":"Électronique","tarif":90000,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":0.1,"dmin":2,"dmax":2,"d1":null,"c1":1,"d2":null,"c2":null,"h":12,"note":"FAST 48 h, environ 3 départs par semaine aux dates publiées (onglet Calendrier). Poids minimum 100 g. Électronique, pièces, matériel médical. Maximum 32 kg par colis. Fin de réception non communiquée : veille 12 h supposée.","base":null},{"tr":"Importation de l’Asie","mode":"Avion","svc":"Fast","cats":"Poudre/liquide; Aimant","tarif":100000,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":0.1,"dmin":2,"dmax":2,"d1":null,"c1":1,"d2":null,"c2":null,"h":12,"note":"FAST 48 h, environ 3 départs par semaine aux dates publiées (onglet Calendrier). Poids minimum 100 g. Cosmétique, poudre, liquide, aimant, piles. Maximum 32 kg par colis. Fin de réception non communiquée : veille 12 h supposée.","base":null},{"tr":"Importation de l’Asie","mode":"Avion","svc":"Fast","cats":"Téléphone","tarif":90000,"unit":"pièce","cur":"Ar","palier":null,"tarif2":null,"min":0.1,"dmin":2,"dmax":2,"d1":null,"c1":1,"d2":null,"c2":null,"h":12,"note":"FAST 48 h, environ 3 départs par semaine aux dates publiées (onglet Calendrier). Poids minimum 100 g. Smartphone, powerbank : prix par pièce. Maximum 32 kg par colis. Fin de réception non communiquée : veille 12 h supposée.","base":null},{"tr":"Importation de l’Asie","mode":"Avion","svc":"Fast","cats":"Ordinateur/tablette; Batterie","tarif":120000,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":0.1,"dmin":2,"dmax":2,"d1":null,"c1":1,"d2":null,"c2":null,"h":12,"note":"FAST 48 h, environ 3 départs par semaine aux dates publiées (onglet Calendrier). Poids minimum 100 g. Ordinateur portable, appareil avec batterie. Maximum 32 kg par colis. Fin de réception non communiquée : veille 12 h supposée.","base":null},{"tr":"Importation de l’Asie","mode":"Avion","svc":"Fast","cats":"Batterie brute","tarif":200000,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":0.1,"dmin":2,"dmax":2,"d1":null,"c1":1,"d2":null,"c2":null,"h":12,"note":"FAST 48 h, environ 3 départs par semaine aux dates publiées (onglet Calendrier). Poids minimum 100 g. Batteries seules. Maximum 32 kg par colis. Fin de réception non communiquée : veille 12 h supposée.","base":null},{"tr":"Importation de l’Asie","mode":"Avion","svc":"Normal","cats":"Général","tarif":67500,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":5,"dmax":7,"d1":"Lundi","c1":2,"d2":null,"c2":null,"h":10,"note":"Départ chaque lundi, durée annoncée 7 jours, colis à déposer avant samedi 10 h (heure de Chine). Habillement, bijoux, alimentaire. Cosmétiques, liquides, batteries et smartphones NON autorisés en Normal. Maximum 500 kg par colis. Aucun minimum facturable.","base":null},{"tr":"Importation de l’Asie","mode":"Avion","svc":"Normal","cats":"Électronique","tarif":67500,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":5,"dmax":7,"d1":"Lundi","c1":2,"d2":null,"c2":null,"h":10,"note":"Départ chaque lundi, durée annoncée 7 jours, colis à déposer avant samedi 10 h (heure de Chine). Électronique, pièces, matériel médical (sans batterie). Maximum 500 kg par colis. Aucun minimum facturable.","base":null},{"tr":"Importation de l’Asie","mode":"Avion","svc":"Plus","cats":"Général","tarif":73000,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":10,"dmax":15,"d1":"Lundi","c1":2,"d2":null,"c2":null,"h":10,"note":"Départ chaque lundi, durée annoncée 15 jours, colis à déposer avant samedi 10 h (heure de Chine). Habillement, bijoux, alimentaire. Maximum 500 kg par colis. Aucun minimum facturable.","base":null},{"tr":"Importation de l’Asie","mode":"Avion","svc":"Plus","cats":"Électronique","tarif":78000,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":10,"dmax":15,"d1":"Lundi","c1":2,"d2":null,"c2":null,"h":10,"note":"Départ chaque lundi, durée annoncée 15 jours, colis à déposer avant samedi 10 h (heure de Chine). Électronique, pièces, matériel médical. Maximum 500 kg par colis. Aucun minimum facturable.","base":null},{"tr":"Importation de l’Asie","mode":"Avion","svc":"Plus","cats":"Poudre/liquide; Aimant","tarif":80000,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":10,"dmax":15,"d1":"Lundi","c1":2,"d2":null,"c2":null,"h":10,"note":"Départ chaque lundi, durée annoncée 15 jours, colis à déposer avant samedi 10 h (heure de Chine). Cosmétique, poudre, liquide, aimant, piles. Maximum 500 kg par colis. Aucun minimum facturable.","base":null},{"tr":"Importation de l’Asie","mode":"Avion","svc":"Plus","cats":"Téléphone","tarif":75000,"unit":"pièce","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":10,"dmax":15,"d1":"Lundi","c1":2,"d2":null,"c2":null,"h":10,"note":"Départ chaque lundi, durée annoncée 15 jours, colis à déposer avant samedi 10 h (heure de Chine). Smartphone, powerbank : prix par pièce. Maximum 500 kg par colis. Aucun minimum facturable.","base":null},{"tr":"Importation de l’Asie","mode":"Avion","svc":"Plus","cats":"Ordinateur/tablette; Batterie","tarif":90000,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":10,"dmax":15,"d1":"Lundi","c1":2,"d2":null,"c2":null,"h":10,"note":"Départ chaque lundi, durée annoncée 15 jours, colis à déposer avant samedi 10 h (heure de Chine). Ordinateur portable, appareil avec batterie. Maximum 500 kg par colis. Aucun minimum facturable.","base":null},{"tr":"Importation de l’Asie","mode":"Avion","svc":"Plus","cats":"Batterie brute","tarif":150000,"unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":10,"dmax":15,"d1":"Lundi","c1":2,"d2":null,"c2":null,"h":10,"note":"Départ chaque lundi, durée annoncée 15 jours, colis à déposer avant samedi 10 h (heure de Chine). Batteries seules. Maximum 500 kg par colis. Aucun minimum facturable.","base":null},{"tr":"Importation Express","mode":"Avion","svc":"Normal","unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":10,"dmax":15,"d1":"Vendredi","c1":1,"d2":null,"c2":null,"h":12,"base":"Poids volumétrique","cats":"Poudre/liquide","tarif":80000,"note":"Liquide et poudre. Message transmis (date non précisée). Envoi normal par avion. Départ vendredi ; fin de réception jeudi 12 h, heure de Chine. Délai 10 à 15 jours. Facturé au poids volumétrique."},{"tr":"Importation Express","mode":"Avion","svc":"Normal","unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":10,"dmax":15,"d1":"Vendredi","c1":1,"d2":null,"c2":null,"h":12,"base":"Poids volumétrique","cats":"Aimant","tarif":80000,"note":"Entana sensible (interprété comme aimant ; à confirmer). Message transmis (date non précisée). Envoi normal par avion. Départ vendredi ; fin de réception jeudi 12 h, heure de Chine. Délai 10 à 15 jours. Facturé au poids volumétrique."},{"tr":"Importation Express","mode":"Avion","svc":"Normal","unit":"kg","cur":"Ar","palier":null,"tarif2":null,"min":null,"dmin":10,"dmax":15,"d1":"Vendredi","c1":1,"d2":null,"c2":null,"h":12,"base":"Poids volumétrique","cats":"Batterie","tarif":120000,"note":"Produit avec batterie ou pile. Message transmis (date non précisée). Envoi normal par avion. Départ vendredi ; fin de réception jeudi 12 h, heure de Chine. Délai 10 à 15 jours. Facturé au poids volumétrique."}],"C":[{"tr":"Importation de l’Asie","svc":"Fast","date":"2026-10-02","note":"Dates publiées pour octobre 2026. Ajoutez les dates de novembre dès qu’elles sont publiées."},{"tr":"Importation de l’Asie","svc":"Fast","date":"2026-10-04","note":null},{"tr":"Importation de l’Asie","svc":"Fast","date":"2026-10-05","note":null},{"tr":"Importation de l’Asie","svc":"Fast","date":"2026-10-06","note":null},{"tr":"Importation de l’Asie","svc":"Fast","date":"2026-10-08","note":null},{"tr":"Importation de l’Asie","svc":"Fast","date":"2026-10-10","note":null},{"tr":"Importation de l’Asie","svc":"Fast","date":"2026-10-12","note":null},{"tr":"Importation de l’Asie","svc":"Fast","date":"2026-10-14","note":null},{"tr":"Importation de l’Asie","svc":"Fast","date":"2026-10-15","note":null},{"tr":"Importation de l’Asie","svc":"Fast","date":"2026-10-16","note":null},{"tr":"Importation de l’Asie","svc":"Fast","date":"2026-10-18","note":null},{"tr":"Importation de l’Asie","svc":"Fast","date":"2026-10-20","note":null},{"tr":"Importation de l’Asie","svc":"Fast","date":"2026-10-21","note":null},{"tr":"Importation de l’Asie","svc":"Fast","date":"2026-10-22","note":null},{"tr":"Importation de l’Asie","svc":"Fast","date":"2026-10-24","note":null},{"tr":"Importation de l’Asie","svc":"Fast","date":"2026-10-26","note":null},{"tr":"Importation de l’Asie","svc":"Fast","date":"2026-10-28","note":null},{"tr":"Importation de l’Asie","svc":"Fast","date":"2026-10-30","note":null}]};
const JOURS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const ARR_P=[0.01,0.1,0.5,1], ARR_V=[1e-10,0.001,0.01,0.1];
const KEY='hygo-v1';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isNum=x=>typeof x==='number'&&isFinite(x);
const N=x=>isNum(x)?x:0;
const nf=new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const ar=x=>isNum(x)?nf.format(Math.round(x)).replace(/ /g,' ')+' Ar':'';
const dec=(x,d=2)=>isNum(x)?x.toLocaleString('fr-FR',{maximumFractionDigits:d}):'';
const dayNum=s=>{if(!s)return null;const [y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d)/864e5};
const dayStr=n=>new Date(n*864e5).toISOString().slice(0,10);
const fd=n=>isNum(n)?new Date(Math.floor(n+1e-9)*864e5).toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}):'';
const fdt=iso=>iso?new Date(iso).toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}):'';
const wdIso=d=>((d+3)%7+7)%7+1;
const mod=(a,b)=>((a%b)+b)%b;
const r6=x=>Math.round(x*1e6)/1e6;

/* ---------- state ---------- */
const LEGACY_CALENDAR_MAPPINGS=[
  {tr:'E-SOA',mode:'Maritime',serviceQuote:'',serviceCalendar:'Standard Maritime'},
  {tr:'E-SOA',mode:'Maritime',serviceQuote:'',serviceCalendar:'Maritime standard'},
  {tr:'E-SOA',mode:'Maritime',serviceQuote:'',serviceCalendar:'Maritime normal'},
  {tr:'E-SOA',mode:'Avion',serviceQuote:'Normal',serviceCalendar:'Standard Avion'},
  {tr:'E-SOA',mode:'Avion',serviceQuote:'Normal',serviceCalendar:'Avion standard'},
  {tr:'E-SOA',mode:'Avion',serviceQuote:'Normal',serviceCalendar:'Avion normal'},
  {tr:'E-SOA',mode:'Maritime',serviceQuote:'',serviceCalendar:'Maritime'},
  {tr:'E-SOA',mode:'Maritime',serviceQuote:'',serviceCalendar:'Normal'},
  {tr:'Importation de l’Asie',mode:'Avion',serviceQuote:'Fast',serviceCalendar:'Fast'}
];
function defaultParams(){return{usd:4850,marge:0.07,cnyUsd:6.54,div:6000,arrP:0.01,arrV:1e-10,dispo:3,mAvion:4,mMar:10,dimanche:'Non',calendarClosePolicy:'exclude',
  cats:['Général','Électronique','Téléphone','Ordinateur/tablette','Aimant','Batterie','Batterie brute','Poudre/liquide','Danger'],
  trs:['Arizato','E-SOA','Importation Express','Importation de l’Asie'],svcs:['Standard','Express','Normal','Fast','Plus'],
  margins:[0.1,0.2,0.3,0.5,0.75,1,1.5,2]}}
function calendarServices(tr,mode){
  if(mode==='Maritime')return S.tarifs.some(t=>t.tr===tr&&t.mode===mode)?['']:[];
  return [...new Set(S.tarifs.filter(t=>t.tr===tr&&t.mode===mode).map(t=>t.svc||''))].sort((a,b)=>a.localeCompare(b,'fr'));
}
function blankDraft(no){return{no,name:'',cat:'Général',catManual:false,batteryStatus:'',handling:'',dangerous:'',magnet:'',deviceType:'',price:null,qty:1,dims:'',wt:null,mode:'prix',offer:'',base:'Le plus élevé',
  pay:dayStr(Math.floor(Date.now()/864e5)),delai:2,heure:16,livCh:0,exclus:0,livFin:0,trans:2,marge:0.5,pvRetenu:null,marketPrice:null,status:STATUS.DRAFT,destination:''}}
function exampleDraft(no){return{...blankDraft(no),name:'Spray anti-pluie 50 ml',cat:'Poudre/liquide',catManual:true,price:4.04,qty:1,dims:'14 x 6 x 6',wt:0.08,mode:'prix',pay:'2026-10-10',marge:0.5}}
function norm(d){if(typeof d.marge==='string'&&Number.isFinite(Number(d.marge)))d.marge=Number(d.marge);if(d.dims===undefined)d.dims=d.L?`${d.L} x ${d.W} x ${d.H}`:'';if(!d.mode)d.mode=d.offer?'manuel':'prix';if(d.catManual===undefined)d.catManual=true;for(const k of ['batteryStatus','handling','dangerous','magnet','deviceType'])if(d[k]===undefined)d[k]='';if(d.marketPrice===undefined)d.marketPrice=null;return d}
function serviceKey(x){return String(x||'').trim().toLocaleLowerCase('fr').replace(/\s+/g,' ')}
function quoteService(t){return String(t.svc||'')}
function normalizeLegacyOffer(d){
  const match=String(d.offer||'').match(/^E-SOA \| (Maritime standard|Maritime normal|Avion standard|Avion normal) \| (.+)$/i);
  if(match)d.offer=`E-SOA | ${match[1].toLowerCase().startsWith('avion')?'Avion Normal':'Maritime'} | ${match[2]}`;
}
function copyData(value){return JSON.parse(JSON.stringify(value))}
function normAll(s){
  const defaults=defaultParams();
  const legacyMappings=s.params?.calendarServiceVersion===4?[]:
    Array.isArray(s.params?.calendarMappings)?s.params.calendarMappings:LEGACY_CALENDAR_MAPPINGS;
  for(const mapping of legacyMappings)if(mapping.tr==='E-SOA'){
    if(mapping.mode==='Avion'&&['avion standard','standard avion','avion normal'].includes(serviceKey(mapping.serviceQuote)))
      mapping.serviceQuote='Normal';
    if(mapping.mode==='Maritime')mapping.serviceQuote='';
  }
  s.params={...defaults,...s.params};
  if(!['exclude','keep'].includes(s.params.calendarClosePolicy))s.params.calendarClosePolicy='exclude';
  s.quotes??=[];s.cal??=[];
  for(const tariff of s.tarifs){
    if(tariff.tr==='E-SOA'&&tariff.mode==='Avion'&&tariff.svc==='Standard')tariff.svc='Normal';
    if(tariff.mode==='Maritime')tariff.svc='';
  }
  for(const entry of s.cal){
    if(entry.tr==='E-SOA'&&entry.mode==='Avion'&&['avion standard','standard avion','avion normal'].includes(serviceKey(entry.svc)))entry.svc='Normal';
    if(entry.mode==='Maritime')entry.svc='';
    else if(entry.tr==='E-SOA'&&!entry.mode&&/maritime/i.test(entry.svc||'')){entry.mode='Maritime';entry.svc=''}
  }
  for(const entry of s.cal)if(entry.mode){
    const services=[...new Set(s.tarifs.filter(t=>t.tr===entry.tr&&t.mode===entry.mode&&
      (serviceKey(t.svc)===serviceKey(entry.svc)||serviceKey(`${entry.mode} ${t.svc}`)===serviceKey(entry.svc))).map(t=>t.svc||''))];
    if(services.length===1)entry.svc=services[0];
  }
  if(s.params.calendarServiceVersion!==4)for(const c of s.cal){
    const mapped=legacyMappings.filter(m=>m.tr===c.tr&&
      (serviceKey(m.serviceCalendar)===serviceKey(c.svc)||serviceKey(m.serviceQuote)===serviceKey(c.svc)));
    const tariffModes=s.tarifs.filter(t=>t.tr===c.tr&&
      (serviceKey(t.svc)===serviceKey(c.svc)||serviceKey(quoteService(t))===serviceKey(c.svc)||
       serviceKey(`${t.mode} ${t.svc}`)===serviceKey(c.svc))).map(t=>t.mode);
    const legacyStandardModes=c.tr==='E-SOA'&&serviceKey(c.svc)==='standard'?['Avion','Maritime']:[];
    const modes=[...new Set([...mapped.map(m=>m.mode),...(c.mode?[c.mode]:[...tariffModes,...legacyStandardModes])])];
    if(!c.mode)c.mode=modes.length===1?modes[0]:'';
    if(c.mode){
      const oldNames=mapped.filter(m=>m.mode===c.mode&&serviceKey(m.serviceCalendar)===serviceKey(c.svc)).map(m=>m.serviceQuote);
      const names=oldNames.length?oldNames:[c.svc];
      const services=[...new Set(s.tarifs.filter(t=>t.tr===c.tr&&t.mode===c.mode&&
        names.some(name=>serviceKey(t.svc)===serviceKey(name)||serviceKey(quoteService(t))===serviceKey(name)||
          serviceKey(`${t.mode} ${t.svc}`)===serviceKey(name))).map(t=>t.svc||''))];
      if(services.length===1)c.svc=services[0];
    }
  }
  for(const entry of s.cal)if(entry.mode==='Maritime')entry.svc='';
  delete s.params.calendarMappings;
  s.params.calendarServiceVersion=4;
  norm(s.draft);normalizeLegacyOffer(s.draft);normalizeLegacyMaritimeOffer(s.draft,s.tarifs);
  s.draft.status??=STATUS.DRAFT;s.draft.destination??='';
  s.quotes.forEach(q=>{norm(q.inputs);normalizeQuoteWorkflow(q)});
  s.paymentGroups??=[];s.stock??=[];s.products??=[];return s;
}
function normalizeLegacyMaritimeOffer(d,tarifs){
  const match=String(d.offer||'').match(/^(.+) \| Maritime .+ \| (.+)$/i);
  if(!match)return;
  const tariff=tarifs.find(t=>t.tr===match[1]&&t.mode==='Maritime'&&t.cats===match[2]);
  if(tariff)d.offer=`${tariff.tr} | Maritime | ${tariff.cats||''}`;
}
/* ---------- Catégorie suggérée à partir du nom ----------
   Mots entiers, sans accents ni majuscules. Chaque mot-clé vaut de 1 à 3 points ; la catégorie au score le plus haut gagne.
   À égalité, CAT_PRIORITY (le plus restrictif au transport d’abord). Les devis déjà enregistrés ajoutent un point
   par mot commun à une catégorie choisie, plafonné à 3. « Aimant » ne se devine pas du nom : il dépend du poids.
   Accessoires sans partie électrique et jouets sans batterie : Général, même si le nom cite un téléphone ou un ordinateur. */
const normCat=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
const CAT_PRIORITY=['Danger','Batterie','Batterie brute','Poudre/liquide','Téléphone','Ordinateur/tablette','Électronique'];
const CAT_KEYWORDS={
  'Danger':[['gaz',3],['aerosol',3],['inflammable',3],['butane',3],['corrosif',3],['acide',2]],
  'Batterie':[['batterie',2],['batteries',2],['power bank',3],['powerbank',3],['pile',2],['piles',2],['lipo',2],['lithium',1],['rechargeable',4],['enceinte',2],['smartwatch',3],['montre connectee',2]],
  'Batterie brute':[['cellule',3],['cellules',3],['18650',4],['21700',4],['32140',3],['lifepo4',2],['li ion',2]],
  'Poudre/liquide':[['adhesif',3],['cyanoacrylate',3],['spray',3],['liquide',3],['poudre',3],['creme',3],['parfum',3],['huile',3],['gel',2],['shampoing',3],['savon',3],['cosmetique',2],['vernis',3],['colle',3],['encre',3],['serum',3],['lotion',3]],
  'Téléphone':[['telephone',2],['smartphone',3],['iphone',3],['phone',1]],
  'Ordinateur/tablette':[['ordinateur',3],['laptop',3],['notebook',3],['tablette',3],['tablet',3],['macbook',3]],
  'Électronique':[['led',3],['cable',3],['cellule photoelectrique',4],['chargeur',3],['charger',3],['usb',2],['casque',2],['microphone',2],['ecouteurs',2],['earbuds',2],['souris',3],['clavier',3],['lampe',2],['montre',2],['camera',2],['capteur',2]],
};
const CAT_KEYWORDS_N=Object.fromEntries(Object.entries(CAT_KEYWORDS).map(([c,l])=>[c,l.map(([k,w])=>[normCat(k),w])]));
const GENERAL_ACCESSORY=['coque','coques','housse','housses','etui','etuis','sac','sacs','sacoche','sacoches','cabas','pochette','pochettes','protection','protections','protecteur','protecteurs','verre','film','support','supports','stand','trepied','perche','holder','case','cover','sleeve'];
const GENERAL_TOY=['jouet','jouets','peluche','peluches','puzzle','toy','toys','enfant','enfants'];
const STOP_WORDS=new Set(['pour','avec','sans','dans','tous','cette','plus','sur','fait','produit','pouces']);
const catWords=s=>normCat(s).replace(/[^a-z0-9]+/g,' ').trim();
function historyBonus(words){
  const now=new Set(words.split(' ').filter(t=>t.length>=4&&!STOP_WORDS.has(t)));
  const out={};
  for(const q of S.quotes){
    const cat=q.inputs?.cat, name=q.inputs?.name;
    if(!cat||!name)continue;
    const past=catWords(name).split(' ').filter(t=>t.length>=4&&!STOP_WORDS.has(t));
    if(past.some(t=>now.has(t)))out[cat]=Math.min(3,(out[cat]||0)+1);
  }
  return out;
}
const WIRELESS_WORDS=['bluetooth','sans fil','wireless'];
const hasAny=(padded,list)=>list.some(w=>padded.includes(` ${w} `));
/* Ces produits demandent si une batterie est incluse (sans fil, Bluetooth, jouets). */
const askBattery=name=>hasAny(` ${catWords(name)} `,[...WIRELESS_WORDS,...GENERAL_TOY]);
function scoreCats(padded){
  const s={};
  for(const cat of CAT_PRIORITY){
    let n=0;for(const [k,w] of CAT_KEYWORDS_N[cat])if(padded.includes(` ${k} `))n+=w;
    if(n)s[cat]=n;
  }
  return s;
}
/* Ce qui précède « pour » ou « à » décrit le produit ; le reste est sa cible ou une option (« pour téléphone », « à clavier »).
   Sans/Bluetooth : Batterie seulement si le produit contient une batterie (batt), sinon Électronique. */
function rankCats(name,batt){
  const words=catWords(name), padded=` ${words} `, full=scoreCats(padded);
  const head=scoreCats(` ${words.split(/ (?:pour|a) /)[0]} `), score=Object.keys(head).length?head:{...full};
  const wireless=hasAny(padded,WIRELESS_WORDS), battery=askBattery(name)&&batt===true;
  if(battery)score.Batterie=(score.Batterie||0)+3;
  else if(wireless)score['Électronique']=(score['Électronique']||0)+2;
  const hasPart=wireless||battery||['Danger','Batterie','Batterie brute','Poudre/liquide','Électronique'].some(c=>full[c]);
  if(hasAny(padded,GENERAL_ACCESSORY)&&!hasPart)return [{cat:'Général',score:1}];
  if(hasAny(padded,GENERAL_TOY)&&!full.Batterie&&!full['Batterie brute']&&!battery)return [{cat:'Général',score:1}];
  for(const [cat,b] of Object.entries(historyBonus(words)))score[cat]=(score[cat]||0)+b;
  const rank=c=>CAT_PRIORITY.includes(c)?CAT_PRIORITY.indexOf(c):CAT_PRIORITY.length;
  return Object.keys(score).sort((a,b)=>score[b]-score[a]||rank(a)-rank(b)).map(c=>({cat:c,score:score[c]}));
}
function guessCat(n,batt){const r=rankCats(n,batt);return r.length?r[0].cat:null}
function categoryRecommendation(d){
  let category,reason;
  if(d.dangerous==='yes'){category='Danger';reason='Vous indiquez que le produit peut être dangereux.'}
  else if(d.batteryStatus==='separate'){category='Batterie brute';reason='La batterie est expédiée séparément du produit.'}
  else if(d.batteryStatus==='integrated'){category='Batterie';reason=`Le produit contient une batterie intégrée${d.deviceType==='phone'?' et est identifié comme un téléphone':d.deviceType==='computer'?' et est identifié comme un ordinateur ou une tablette':''}.`}
  else if(['liquid','powder','aerosol'].includes(d.handling)){category='Poudre/liquide';reason=({liquid:'Le produit est liquide.',powder:'Le produit est en poudre.',aerosol:'Le produit est un aérosol.'})[d.handling]}
  else if(d.magnetG>200){category='Aimant';reason='Le total des aimants dépasse 200 g.'}
  else if(d.deviceType==='phone'){category='Téléphone';reason='Le type d’article sélectionné est téléphone.'}
  else if(d.deviceType==='computer'){category='Ordinateur/tablette';reason='Le type d’article sélectionné est ordinateur ou tablette.'}
  else if(d.deviceType==='electronics'){category='Électronique';reason='Le type d’article sélectionné est autre appareil électronique.'}
  else if(d.deviceType==='general'){category='Général';reason='Le type d’article sélectionné est produit général.'}
  else {category=guessCat(d.name);reason=category?'Suggestion basée sur le nom du produit.':'Répondez aux questions pour obtenir une suggestion.'}
  if(!category)return null;
  const risks=Number(d.batteryStatus==='integrated'||d.batteryStatus==='separate')+
    Number(['liquid','powder','aerosol'].includes(d.handling))+Number(d.dangerous==='yes')+Number(d.magnetG>200);
  const warning=risks>1?'Plusieurs caractéristiques particulières sont indiquées : confirmez la catégorie et l’acceptation du colis auprès du transitaire.'
    :(d.batteryStatus==='integrated'||d.batteryStatus==='separate'||d.dangerous==='yes'||['liquid','powder','aerosol'].includes(d.handling)||d.magnetG>200)?'Cette suggestion ne remplace pas les consignes du transitaire : confirmez que cette offre accepte ce type de produit.'
    :d.deviceType==='phone'||d.deviceType==='computer'?'Si l’appareil contient une batterie, vérifiez les consignes du transitaire pour les batteries intégrées.':'';
  return{category,reason,warning};
}
function categoryAdvice(d){
  const recommendation=categoryRecommendation(d),countFor=category=>S.tarifs.filter(t=>catList(t.cats).includes(category)).length;
  const currentCount=countFor(d.cat);
  if(!recommendation)return `<div class="category-advice" role="status">Répondez aux questions pour obtenir une suggestion. Votre catégorie actuelle « ${esc(d.cat)} » est acceptée par ${currentCount} offre${currentCount===1?'':'s'} configurée${currentCount===1?'':'s'}.</div>${currentCount===0?'<div class="badtxt">Aucune offre configurée n’accepte cette catégorie.</div>':''}`;
  const proposedCount=countFor(recommendation.category),available=S.params.cats.includes(recommendation.category);
  return `<div class="category-advice" role="status"><b>Catégorie proposée : ${esc(recommendation.category)}</b><br>${esc(recommendation.reason)}<br>Offres configurées acceptant cette catégorie : <b>${proposedCount}</b>${d.cat!==recommendation.category?`<br>Votre choix actuel « ${esc(d.cat)} » est accepté par ${currentCount} offre${currentCount===1?'':'s'} configurée${currentCount===1?'':'s'}.`:''}
    ${recommendation.warning?`<div class="warn" style="margin-top:5px">${esc(recommendation.warning)}</div>`:''}
    ${!available?'<div class="badtxt" style="margin-top:5px">Cette catégorie n’est pas dans la liste configurée des catégories.</div>':''}
    ${proposedCount===0?'<div class="badtxt" style="margin-top:5px">Aucune offre configurée n’accepte cette catégorie.</div>':''}
    ${d.cat!==recommendation.category&&currentCount===0?'<div class="badtxt" style="margin-top:5px">Attention : aucune offre configurée n’accepte votre catégorie actuelle.</div>':''}
    ${d.cat!==recommendation.category&&available?`<button type="button" class="btn sm" style="margin-top:7px" data-category-suggestion="${esc(recommendation.category)}">Utiliser cette catégorie</button>`:''}</div>`;
}
/* ---------- SUIVI DES DOSSIERS : référentiel des statuts et règles métier ----------
   Le devis enregistré garde `inputs` et `res` (devis initial, figé). Le suivi opérationnel
   (statut, dates, commande, réceptions, dépenses, client, stock) est stocké à côté, dans le même
   enregistrement, sans jamais réécrire `inputs` ni `res`. Ces fonctions ne touchent ni au DOM ni à S. */
const STATUS={DRAFT:'Brouillon',CONFIRMED:'Confirmé',ORDERED:'Commandé en Chine',SHIPPED:'En transit vers Madagascar',ARRIVED:'Arrivé à Madagascar',READY:'À récupérer',COLLECTED:'Récupéré',RECEPTION:'Contrôle de réception',STOCK:'Stock boutique',TO_DELIVER:'À livrer',DELIVERED:'Livré au client',CANCELLED:'Annulé'};
const STATUS_LIST=Object.values(STATUS);
const DESTINATION={STOCK:'Stock boutique',CLIENT:'Commande client'};
const DESTINATION_LIST=Object.values(DESTINATION);
/* Transitions autorisées. L’annulation reste possible après achat tant que la marchandise n’est pas arrivée ;
   elle conserve alors toutes les dépenses et l’historique. */
const STATUS_NEXT={
  [STATUS.DRAFT]:[STATUS.CONFIRMED,STATUS.CANCELLED],
  [STATUS.CONFIRMED]:[STATUS.ORDERED,STATUS.CANCELLED],
  [STATUS.ORDERED]:[STATUS.SHIPPED,STATUS.CANCELLED],
  [STATUS.SHIPPED]:[STATUS.ARRIVED,STATUS.CANCELLED],
  [STATUS.ARRIVED]:[STATUS.READY],
  [STATUS.READY]:[STATUS.COLLECTED],
  [STATUS.COLLECTED]:[STATUS.RECEPTION],
  [STATUS.RECEPTION]:[],
  [STATUS.STOCK]:[],
  [STATUS.TO_DELIVER]:[STATUS.DELIVERED],
  [STATUS.DELIVERED]:[],
  [STATUS.CANCELLED]:[]
};
/* Le contrôle de réception ne mène qu’à une branche, selon la destination du devis. */
const RECEPTION_BRANCH={[DESTINATION.STOCK]:STATUS.STOCK,[DESTINATION.CLIENT]:STATUS.TO_DELIVER};
/* Dates réelles saisies pendant le suivi : chacune ne peut pas précéder la précédente. */
const ACTUAL_DATES={
  [STATUS.SHIPPED]:{key:'shippedAt',label:'d’expédition',after:'paidAt'},
  [STATUS.ARRIVED]:{key:'arrivedAt',label:'d’arrivée',after:'shippedAt'},
  [STATUS.READY]:{key:'availableAt',label:'de mise à disposition',after:'arrivedAt'},
  [STATUS.COLLECTED]:{key:'withdrawnAt',label:'de retrait',after:'availableAt'}
};
const ARRIVAL_PENDING=[STATUS.CONFIRMED,STATUS.ORDERED,STATUS.SHIPPED];
const BEFORE_DELIVERY=[STATUS.CONFIRMED,STATUS.ORDERED,STATUS.SHIPPED,STATUS.ARRIVED,STATUS.READY,STATUS.COLLECTED,STATUS.RECEPTION,STATUS.STOCK,STATUS.TO_DELIVER];
const SPENDING_STATUSES=[STATUS.ORDERED,STATUS.SHIPPED,STATUS.ARRIVED,STATUS.READY,STATUS.COLLECTED,STATUS.RECEPTION,STATUS.STOCK,STATUS.TO_DELIVER,STATUS.DELIVERED];
/* Dates estimées modifiables. Chaque changement est historisé (ancienne valeur, nouvelle, motif). */
const PLANNED_DATES={
  arrival:{label:'Arrivée prévue à Madagascar',open:ARRIVAL_PENDING,get:q=>q.logistics.arrivalPlanned,set:(q,date)=>{q.logistics.arrivalPlanned=date}},
  client:{label:'Livraison client prévue',open:BEFORE_DELIVERY,get:q=>q.delivery.plannedAt,set:(q,date)=>{q.delivery.plannedAt=date}}
};
const EXPENSE_CATEGORIES=['Achat fournisseur','Livraison en Chine','Transport international','Frais du transitaire','Droits et frais de douane','Transport local','Manutention','Autres dépenses'];
const EXPENSE_CURRENCIES=['Ar','CNY','USD'];
const INCIDENT_TYPES=['Manquant','Endommagé','Non conforme','Autre'];
const INCIDENT_RESOLUTIONS=['Remboursement','Remplacement','Aucune'];

const nowIso=()=>new Date().toISOString();
const todayTana=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Indian/Antananarivo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const sumOf=(items,key)=>items.reduce((total,item)=>total+(item[key]??0),0);
const acceptedTotal=q=>sumOf(q.receptions,'qtyAccepted');
const realCostAr=q=>sumOf(q.expenses,'amountAr');
const receptionTotals=q=>{const received=sumOf(q.receptions,'qtyReceived'),ordered=q.order?.qtyOrdered??0;return{ordered,received,accepted:acceptedTotal(q),damaged:sumOf(q.receptions,'qtyDamaged'),missing:Math.max(0,ordered-received)}};
const arrivalShiftDays=q=>{const initial=q.estimates?.arrivalInitial,planned=q.logistics.arrivalPlanned;return initial&&planned?dayNum(planned)-dayNum(initial):0};
const isOverdue=(q,today)=>ARRIVAL_PENDING.includes(q.status)&&!!q.logistics.arrivalPlanned&&q.logistics.arrivalPlanned<today;
const canDeleteQuote=q=>q.status===STATUS.DRAFT&&!q.paymentGroupId&&!q.revisions.length&&!q.expenses.length&&!q.receptions.length&&!q.order;

function emptyLogistics(){return{paidAt:null,shippedAt:null,arrivalPlanned:null,arrivedAt:null,availableAt:null,withdrawnAt:null}}
function emptyClient(){return{name:'',contact:'',address:'',comment:''}}
function emptyDelivery(){return{qtyToDeliver:null,fee:null,plannedAt:null,actualAt:null,confirmed:false}}

/* Complète un devis enregistré. Idempotent : une valeur déjà présente n’est jamais écrasée.
   Un devis sans statut (format antérieur) passe en Brouillon et reste signalé pour vérification manuelle. */
function normalizeQuoteWorkflow(q){
  if(q.status===undefined){
    q.status=STATUS.DRAFT;
    q.needsStatusReview=true;
    q.statusHistory=[{from:null,to:STATUS.DRAFT,at:q.created,comment:'Devis antérieur au suivi : statut attribué automatiquement, à vérifier.',manual:true}];
  }
  q.needsStatusReview??=false;
  q.destination??='';
  q.statusHistory??=[];
  q.dateHistory??=[];
  q.estimates??=null;
  q.confirmation??=null;
  q.order??=null;
  q.logistics??=emptyLogistics();
  q.client??=emptyClient();
  q.delivery??=emptyDelivery();
  q.expenses??=[];
  q.receptions??=[];
  q.incidents??=[];
  q.revisions??=[];
  q.cancellation??=null;
  return q;
}

function nextStatuses(q){
  if(q.status===STATUS.RECEPTION){const branch=RECEPTION_BRANCH[q.destination];return branch?[branch]:[]}
  return STATUS_NEXT[q.status]??[];
}

/* Retourne le message d’erreur, ou null si la transition est permise. `ctx` porte les contrôles qui
   dépendent de l’état global (devis modifié depuis son calcul, entrée de stock déjà créée). */
function transitionError(q,target,p={},ctx={}){
  if(!nextStatuses(q).includes(target))return `Passage impossible : « ${q.status} » ne peut pas passer à « ${target} ».`;
  if(target===STATUS.CONFIRMED){
    if(!DESTINATION_LIST.includes(q.destination))return 'Choisissez la destination (Stock boutique ou Commande client) avant de confirmer.';
    if(q.paymentGroupId)return 'Dissociez le paiement groupé avant de confirmer ce devis.';
    if(ctx.stale)return 'Les tarifs ou paramètres ont changé depuis l’enregistrement : enregistrez à nouveau le devis avant de le confirmer.';
    return null;
  }
  if(target===STATUS.ORDERED)return orderError(p);
  if(ACTUAL_DATES[target])return actualDateError(q,target,p.date);
  if(target===STATUS.STOCK){
    if(ctx.hasStockEntry)return 'Une entrée de stock existe déjà pour ce dossier.';
    if(acceptedTotal(q)<1)return 'Aucune unité acceptée : enregistrez la réception avant de ranger en stock.';
  }
  if(target===STATUS.TO_DELIVER)return clientError(q.client,q.delivery,acceptedTotal(q));
  if(target===STATUS.DELIVERED){
    if(!p.date)return 'Renseignez la date réelle de livraison.';
    if(!p.confirmed)return 'Le client doit confirmer la réception de la commande.';
  }
  if(target===STATUS.CANCELLED&&!p.reason?.trim())return 'Indiquez le motif d’annulation.';
  return null;
}
function orderError(p){
  if(!p.platform?.trim()||!p.supplier?.trim()||!p.orderedAt)return 'Renseignez la plateforme, le fournisseur et la date de commande.';
  if(!isNum(p.paidAmountCny)||p.paidAmountCny<=0)return 'Renseignez le montant effectivement payé en yuans.';
  if(!Number.isInteger(p.qtyOrdered)||p.qtyOrdered<1)return 'La quantité commandée doit être un nombre entier supérieur à 0.';
  return null;
}
function actualDateError(q,target,date){
  const spec=ACTUAL_DATES[target];
  if(!date)return `Renseignez la date ${spec.label}.`;
  const previous=q.logistics[spec.after];
  if(previous&&date<previous)return `La date ${spec.label} ne peut pas être antérieure à la date précédente (${previous}).`;
  return null;
}
function clientError(client,delivery,acceptedQty){
  if(!client.name?.trim()||!client.contact?.trim()||!client.address?.trim())return 'Pour une commande client, renseignez le nom, le contact et l’adresse de livraison.';
  if(!Number.isInteger(delivery.qtyToDeliver)||delivery.qtyToDeliver<1)return 'Indiquez la quantité à livrer au client.';
  if(delivery.qtyToDeliver>acceptedQty)return `La quantité à livrer (${delivery.qtyToDeliver}) dépasse la quantité acceptée (${acceptedQty}).`;
  return null;
}

/* Applique une transition déjà validée. Retourne un nouvel enregistrement ; l’original n’est pas modifié. */
function applyTransition(q,target,p,now){
  const next=copyData(q),spec=ACTUAL_DATES[target];
  next.statusHistory.push({from:q.status,to:target,at:now,comment:(p.comment||p.reason||'').trim()});
  next.status=target;
  if(spec)next.logistics[spec.key]=p.date;
  if(target===STATUS.CONFIRMED)applyConfirmation(next,p.confirmation);
  if(target===STATUS.ORDERED){next.order=orderFromPayload(p);next.logistics.paidAt=p.orderedAt}
  if(target===STATUS.DELIVERED){next.delivery.actualAt=p.date;next.delivery.confirmed=true}
  if(target===STATUS.CANCELLED)next.cancellation={at:now,reason:p.reason.trim()};
  return next;
}
function orderFromPayload(p){
  return{platform:p.platform.trim(),supplier:p.supplier.trim(),reference:(p.reference||'').trim(),orderedAt:p.orderedAt,paidAmountCny:p.paidAmountCny,qtyOrdered:p.qtyOrdered,parcelRef:(p.parcelRef||'').trim()};
}
/* Figée à la confirmation : estimations du devis (jamais recalculées ensuite) et dates opérationnelles initiales. */
function applyConfirmation(q,confirmation){
  const toIso=day=>isNum(day)?dayStr(Math.floor(day)):null;
  q.confirmation=confirmation;
  q.estimates={departure:toIso(q.res.depart),arrivalInitial:toIso(q.res.arrMax),clientInitial:toIso(q.res.dateClient)};
  q.logistics.arrivalPlanned=q.estimates.arrivalInitial;
  q.delivery.plannedAt=q.destination===DESTINATION.CLIENT?q.estimates.clientInitial:null;
}
/* Le devis enregistré n’est plus celui que les tarifs actuels donneraient : il faut l’enregistrer à nouveau. */
function quoteIsStale(q){
  const R=compute(q.inputs);
  return !R.sel||R.sel.label!==q.offer||Math.abs(N(R.costLot)-N(q.res.costLot))>0.01||Math.abs(N(R.pv)-N(q.res.pv))>0.01||(R.sel.I??null)!==(q.res.dateClient??null);
}
function setDestinationRule(q,destination){
  if(q.status!==STATUS.DRAFT)throw Error('La destination ne se modifie qu’avant la confirmation.');
  if(!DESTINATION_LIST.includes(destination))throw Error('Choisissez une destination dans la liste.');
  const next=copyData(q);
  next.destination=destination;
  return next;
}
function reviseQuote(q,now){
  if(q.status!==STATUS.CONFIRMED)throw Error('Une révision n’est possible qu’après confirmation et avant la commande en Chine.');
  const next=copyData(q);
  next.revisions.push(copyData({at:now,previousStatus:q.status,inputs:q.inputs,res:q.res,offer:q.offer,confirmation:q.confirmation}));
  next.statusHistory.push({from:q.status,to:STATUS.DRAFT,at:now,comment:'Révision du devis : à enregistrer puis confirmer à nouveau.'});
  next.status=STATUS.DRAFT;
  next.confirmation=null;next.estimates=null;
  next.logistics.arrivalPlanned=null;next.delivery.plannedAt=null;
  return next;
}
function correctLegacyStatus(q,status,comment,now){
  if(!q.needsStatusReview)throw Error('Ce devis n’a pas besoin de correction de statut.');
  if(!STATUS_LIST.includes(status))throw Error('Choisissez un statut dans la liste.');
  if(!comment?.trim())throw Error('Indiquez la raison de la correction.');
  const next=copyData(q);
  next.statusHistory.push({from:q.status,to:status,at:now,comment:'Correction manuelle : '+comment.trim(),manual:true});
  next.status=status;next.needsStatusReview=false;
  return next;
}
function plannedDateChange(q,field,date,reason,now){
  const spec=PLANNED_DATES[field];
  if(!spec)throw Error('Date inconnue.');
  if(field==='client'&&q.destination!==DESTINATION.CLIENT)throw Error('La livraison client ne concerne que les commandes client.');
  if(!spec.open.includes(q.status))throw Error(`${spec.label} ne peut plus être modifiée au statut « ${q.status} ».`);
  if(!date)throw Error('Renseignez la nouvelle date.');
  if(!reason?.trim())throw Error('Indiquez le motif du changement.');
  const oldValue=spec.get(q);
  if(oldValue===date)throw Error('La date saisie est déjà celle du dossier.');
  const next=copyData(q);
  spec.set(next,date);
  next.dateHistory.push({field,label:spec.label,oldValue,newValue:date,reason:reason.trim(),at:now});
  return next;
}
function saveClientInfo(q,input){
  if(q.destination!==DESTINATION.CLIENT)throw Error('Ce dossier n’est pas une commande client.');
  if(!BEFORE_DELIVERY.includes(q.status))throw Error('Les informations client ne peuvent plus être modifiées à ce statut.');
  const quantity=input.qtyToDeliver??null,fee=input.fee??null;
  if(quantity!==null&&(!Number.isInteger(quantity)||quantity<1))throw Error('La quantité à livrer doit être un entier supérieur à 0.');
  if(fee!==null&&!(isNum(fee)&&fee>=0))throw Error('Les frais de livraison doivent être positifs ou nuls.');
  const next=copyData(q);
  next.client={name:(input.name||'').trim(),contact:(input.contact||'').trim(),address:(input.address||'').trim(),comment:(input.comment||'').trim()};
  next.delivery.qtyToDeliver=quantity;
  next.delivery.fee=fee;
  return next;
}

/* Dépenses réelles : chaque ligne garde la devise, le taux utilisé et le montant converti en Ar. */
function buildExpense(input,now){
  const rate=input.currency==='Ar'?1:input.rate,amount=input.amount;
  if(!EXPENSE_CATEGORIES.includes(input.category))throw Error('Choisissez une catégorie de dépense.');
  if(!EXPENSE_CURRENCIES.includes(input.currency))throw Error('Choisissez une devise.');
  if(!isNum(amount)||amount<=0)throw Error('Saisissez un montant supérieur à 0.');
  if(!isNum(rate)||rate<=0)throw Error('Saisissez un taux de conversion supérieur à 0.');
  if(!input.paidAt)throw Error('Renseignez la date du paiement.');
  return{id:crypto.randomUUID(),category:input.category,amount,currency:input.currency,rate,amountAr:Math.round(amount*rate*100)/100,paidAt:input.paidAt,comment:(input.comment||'').trim(),proof:(input.proof||'').trim(),createdAt:now};
}
function addExpense(q,input,now){
  if(!SPENDING_STATUSES.includes(q.status))throw Error('Les dépenses ne peuvent pas être ajoutées à ce statut.');
  if(q.logistics.paidAt&&input.paidAt<q.logistics.paidAt)throw Error(`La date de la dépense ne peut pas précéder le paiement de la commande (${q.logistics.paidAt}).`);
  if(q.status===STATUS.DELIVERED&&q.delivery.actualAt&&input.paidAt>q.delivery.actualAt)throw Error(`La date de la dépense ne peut pas être postérieure à la livraison (${q.delivery.actualAt}).`);
  const next=copyData(q);
  next.expenses.push(buildExpense(input,now));
  return next;
}

/* Réceptions : quantités reçues, acceptées et endommagées sont saisies séparément.
   Le manquant est calculé par rapport à la quantité commandée. Plusieurs réceptions partielles sont permises. */
function receptionError(q,r){
  const count=x=>Number.isInteger(x)&&x>=0;
  if(!r.date)return 'Renseignez la date de réception.';
  if(!count(r.qtyReceived)||!count(r.qtyAccepted)||!count(r.qtyDamaged))return 'Les quantités doivent être des nombres entiers positifs ou nuls.';
  if(r.qtyShipped!==null&&!count(r.qtyShipped))return 'La quantité expédiée doit être un nombre entier positif ou nul.';
  if(r.qtyAccepted+r.qtyDamaged>r.qtyReceived)return 'Les quantités acceptées et endommagées ne peuvent pas dépasser les quantités reçues.';
  const totals=receptionTotals(q);
  if(totals.received+r.qtyReceived>totals.ordered)return `Plus d’unités reçues que commandées : ${totals.ordered} commandées, ${totals.received} déjà reçues.`;
  return null;
}
function addReception(q,input,now){
  if(q.status!==STATUS.RECEPTION)throw Error('Les réceptions se saisissent pendant le contrôle de réception.');
  const reception={id:crypto.randomUUID(),date:input.date,qtyShipped:input.qtyShipped??null,qtyReceived:input.qtyReceived,qtyAccepted:input.qtyAccepted,qtyDamaged:input.qtyDamaged??0,comment:(input.comment||'').trim(),createdAt:now};
  const error=receptionError(q,reception);
  if(error)throw Error(error);
  const next=copyData(q);
  next.receptions.push(reception);
  return next;
}
function addIncident(q,input,now){
  if(!SPENDING_STATUSES.includes(q.status))throw Error('Un incident se déclare une fois la commande passée.');
  if(!input.date)throw Error('Renseignez la date de l’incident.');
  if(!INCIDENT_TYPES.includes(input.type))throw Error('Choisissez le type d’incident.');
  if(!input.description?.trim())throw Error('Décrivez l’incident.');
  const next=copyData(q);
  next.incidents.push({id:crypto.randomUUID(),createdAt:now,date:input.date,type:input.type,description:input.description.trim(),resolution:'En cours',refundAr:null,closed:false});
  return next;
}
function resolveIncident(q,incidentId,input,now){
  const incident=q.incidents.find(i=>i.id===incidentId);
  if(!incident)throw Error('Incident introuvable.');
  if(incident.closed)throw Error('Cet incident est déjà clos.');
  if(!INCIDENT_RESOLUTIONS.includes(input.resolution))throw Error('Choisissez la solution obtenue.');
  const refund=input.refundAr??null;
  if(refund!==null&&!(isNum(refund)&&refund>=0))throw Error('Le remboursement doit être positif ou nul.');
  const next=copyData(q);
  Object.assign(next.incidents.find(i=>i.id===incidentId),{resolution:input.resolution,refundAr:refund,closed:true,closedAt:now});
  return next;
}

/* Entrée de stock créée une seule fois, à la transition vers « Stock boutique ». Le coût unitaire
   est réel si des dépenses sont enregistrées, sinon celui du devis. */
function buildStockEntry(q,now){
  const accepted=acceptedTotal(q),real=realCostAr(q),unitCost=real>0?real/accepted:q.res.costP;
  return{id:crypto.randomUUID(),quoteNo:q.no,product:q.inputs.name,enteredAt:now,qtyAccepted:accepted,qtyExcluded:receptionTotals(q).damaged,unitCost:isNum(unitCost)?Math.round(unitCost*100)/100:null,costBasis:real>0?'réel':'estimé'};
}

/* Une action sur un devis est refusée si elle effacerait un suivi ou contournerait le verrouillage. */
function quoteActionBlock(q,action){
  if(q.paymentGroupId&&(action==='edit'||action==='del'))return 'Dissociez d’abord le paiement groupé pour modifier ou supprimer ce devis.';
  if(action==='edit'&&q.status!==STATUS.DRAFT)return 'Ce devis est confirmé : ouvrez son suivi et utilisez « Réviser » pour le modifier.';
  if(action==='del'&&!canDeleteQuote(q))return 'Ce dossier a déjà un suivi (confirmation, commande, réception ou dépense) : annulez-le au lieu de le supprimer.';
  return null;
}

let S=load();
function load(){
  try{const j=JSON.parse(localStorage.getItem(KEY));if(j&&j.params)return normAll(j)}catch(e){}
  return normAll({params:defaultParams(),tarifs:JSON.parse(JSON.stringify(SEED.T)),cal:JSON.parse(JSON.stringify(SEED.C)),quotes:[],draft:exampleDraft('DEV-0001'),editing:null,tab:'devis'});
}
let saveT;
function persist(){clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}if(window.hygoSync)hygoSync()},150)}
function nextNo(){const m=S.quotes.reduce((a,q)=>Math.max(a,parseInt(q.no.replace(/\D/g,''))||0),0);return 'DEV-'+String(m+1).padStart(4,'0')}
/* Message bref (disparaît seul) ; une erreur reste affichée jusqu’à ce que l’utilisateur la ferme. */
/* La notification s’efface en fondu avant d’être retirée ; sans délai si l’appareil réduit les animations. */
function dismissToast(t){
  if(!t.isConnected||t.classList.contains('out'))return;
  t.classList.add('out');
  setTimeout(()=>t.remove(),matchMedia('(prefers-reduced-motion: reduce)').matches?0:200);
}
/* `action` : { label, run } ajoute un bouton (ex. « Annuler ») ; le message reste alors un peu plus longtemps. */
function toast(msg,{sticky=false,action=null}={}){
  if(sticky)document.querySelectorAll('.toast.is-error').forEach(old=>old.remove());
  if(action)document.querySelectorAll('.toast.has-action').forEach(old=>old.remove());
  const t=document.createElement('div');t.className='toast'+(sticky?' is-error':'')+(action?' has-action':'');t.setAttribute('role',sticky?'alert':'status');t.textContent=msg;
  if(sticky){const close=document.createElement('button');close.type='button';close.className='toast-close';close.textContent='OK';close.onclick=()=>dismissToast(t);t.append(' ',close)}
  if(action){const b=document.createElement('button');b.type='button';b.className='toast-close';b.textContent=action.label;b.onclick=()=>{dismissToast(t);action.run()};t.append(' ',b)}
  document.body.appendChild(t);
  if(!sticky)setTimeout(()=>dismissToast(t),action?6000:3500);
}

/* ---------- calculation engine (port of the workbook formulas) ---------- */
const yuanRate=p=>p.cnyUsd?Math.round(p.usd*(1+p.marge)/p.cnyUsd*100)/100:null;
const catList=t=>String(t||'').split(';').map(s=>s.trim()).filter(Boolean);
const offerLabel=t=>t.tr+' | '+t.mode+(t.svc?' '+t.svc:'')+' | '+(t.cats||'');
const tariffTransportLabel=t=>t.svc||t.mode;
function savedOfferLabel(value){return String(value||'').replace(/^(.+ \| )Maritime .+ \| (.+)$/i,'$1Maritime | $2')}
function savedTransportService(quote){
  return /^Maritime(?:\s+.+)?$/i.test(quote.res?.svc||'')?'Maritime':quote.res?.svc||'';
}
function dimsOf(d){if(typeof d.dims!=='string')return[N(d.L),N(d.W),N(d.H)];const a=(d.dims.match(/\d+(?:[.,]\d+)?/g)||[]).map(x=>+x.replace(',','.'));return a.length===3?a:[0,0,0]}
function compute(d,p=S.params,tarifs=S.tarifs,cal=S.cal){
  const qty=Math.max(1,N(d.qty));
  const dm=dimsOf(d), reel=N(d.wt), prod=dm[0]*dm[1]*dm[2];
  const vol_w=prod?prod/p.div:null, vol=prod?prod/1e6:null;
  const arr=d.pay?dayNum(d.pay)+N(d.delai)+N(d.heure)/24:null;
  const yr=yuanRate(p), achat=N(d.price)*N(yr);
  const transactionTotal=d.paymentAllocation?d.paymentAllocation.shareAr:(isNum(yr)?N(d.trans)*yr:null);
  const transactionPerPiece=isNum(transactionTotal)?transactionTotal/qty:null;
  const offers=tarifs.filter(t=>t.tr).map((t,i)=>{
    const o={i,t,label:offerLabel(t)};
    o.compat=catList(t.cats).includes(d.cat);
    const eff=t.base||d.base;
    let v=null;
    if(t.unit==='m³'){ if(vol) v=Math.ceil(r6(vol/p.arrV))*p.arrV }
    else if(t.unit==='pièce') v=1;
    else if(eff==='Poids réel'){ if(reel) v=Math.ceil(r6(reel/p.arrP))*p.arrP }
    else if(eff==='Poids volumétrique'){ if(vol_w) v=Math.ceil(r6(vol_w/p.arrP))*p.arrP }
    else { const m=Math.max(reel,N(vol_w)); if(m) v=Math.ceil(r6(m/p.arrP))*p.arrP }
    if(v!==null&&isNum(t.min)) v=Math.max(v,t.min);
    o.qty=v;
    o.tarif=!isNum(t.tarif)?null:(t.unit==='m³'&&isNum(t.palier)&&v>t.palier?t.tarif2:t.tarif);
    o.E=(o.tarif!==null&&isNum(o.tarif)&&v!==null)?v*o.tarif*(t.cur==='USD'?p.usd:1):null;
    // départ
    o.F=null;o.excludedDates=[];o.keptCloseDate=null;o.calendarNotice='';
    if(arr!==null){
      const lim=(c)=>Math.ceil(Math.round((arr+N(c)-N(t.h)/24)*1e9)/1e9);
      o.arr=arr;
      const service=quoteService(t);
      const dates=cal.filter(c=>c.tr===t.tr&&c.mode===t.mode&&serviceKey(c.svc)===serviceKey(service)&&c.date).map(c=>dayNum(c.date));
      if(!dates.length)o.calendarNotice=`Aucune date publiée pour ${t.tr} · ${service||t.mode}.`;
      if(dates.length){
        const arrivalDay=Math.floor(arr),cutoff=lim(t.c1);
        o.excludedDates=dates.filter(x=>x>=arrivalDay&&x<cutoff).map(date=>({date,cutoff:date-N(t.c1)+N(t.h)/24}));
        const ok=p.calendarClosePolicy==='keep'?dates.filter(x=>x>=arrivalDay):dates.filter(x=>x>=cutoff);
        o.F=ok.length?Math.min(...ok):null;
        if(o.F!==null)o.calendarEntry=cal.find(c=>c.tr===t.tr&&c.mode===t.mode&&serviceKey(c.svc)===serviceKey(service)&&dayNum(c.date)===o.F)||null;
        if(p.calendarClosePolicy==='keep')o.keptCloseDate=o.excludedDates.find(x=>x.date===o.F)||null;
      }
      else if(t.d1){
        const nx=(day,c)=>{const b=lim(c);return b+mod(JOURS.indexOf(day)+1-wdIso(b),7)};
        const a=nx(t.d1,t.c1);
        o.F=t.d2?Math.min(a,nx(t.d2,t.c2)):a;
      }
    }
    o.G=(o.F!==null&&isNum(t.dmax))?o.F+t.dmax:null;
    o.Hh=o.G!==null?o.G+p.dispo+((p.dimanche==='Non'&&wdIso(o.G+p.dispo)===7)?1:0):null;
    o.I=o.Hh!==null?o.Hh+(t.mode==='Maritime'?p.mMar:p.mAvion):null;
    o.earliest=(o.F!==null&&isNum(t.dmin))?o.F+t.dmin:null;
    o.J=o.E!==null?achat+o.E+(N(d.livCh)+N(d.exclus)+N(d.livFin))/qty+N(transactionPerPiece):null;
    const ub=t.unit==='kg'&&!t.base;
    o.fl={base:ub?1:0,dims:(t.unit==='m³'||(t.unit==='kg'&&eff!=='Poids réel'))?1:0,wt:(t.unit==='kg'&&eff!=='Poids volumétrique')?1:0};
    return o;
  });
  const comp=offers.filter(o=>o.compat);
  comp.forEach(o=>{
    o.rP=isNum(o.J)?comp.filter(x=>isNum(x.J)&&x.J<o.J).length+1:null;
    o.rD=isNum(o.I)?comp.filter(x=>isNum(x.I)&&x.I<o.I).length+1:null;
  });
  const bestP0=comp.find(o=>o.rP===1)||null, bestD0=comp.find(o=>o.rD===1)||null, mode=d.mode||'manuel';
  const sel=mode==='prix'?bestP0:mode==='rapide'?(bestD0||bestP0):(comp.find(o=>o.label===d.offer)||null);
  // field usage: 2 = used, 1 = used by other offers only, 0 = unused
  const use=k=>{ if(!comp.length)return 2; if(sel)return sel.fl[k]?2:(comp.some(o=>o.fl[k])?1:0); return comp.some(o=>o.fl[k])?2:0 };
  const R={qty,reel:reel||null,vol_w,vol,arr,yr,achat:isNum(yr)&&d.price?achat:null,offers,comp,sel,use:{base:use('base'),dims:use('dims'),wt:use('wt')}};
  const transP=sel&&isNum(sel.E)?sel.E:null;
  R.transP=transP;
  R.livChP=N(d.livCh)?d.livCh/qty:null; R.exclP=N(d.exclus)?d.exclus/qty:null; R.livFinP=N(d.livFin)?d.livFin/qty:null;
  R.transacLot=transactionTotal;
  R.transacP=transactionPerPiece;
  if(transP!==null){
    R.costP=N(R.achat)+transP+N(R.livChP)+N(R.exclP)+N(R.livFinP)+N(R.transacP);
    R.costLot=N(R.achat)*qty+transP*qty+N(d.livCh)+N(d.exclus)+N(R.transacLot)+N(d.livFin);
  } else {R.costP=null;R.costLot=null}
  R.pvAdvised=isNum(R.costP)?Math.ceil(R.costP*(1+N(d.marge))/100)*100:null;
  R.pv=isNum(d.pvRetenu)?d.pvRetenu:R.pvAdvised;
  R.margeP=isNum(R.pv)&&isNum(R.costP)?R.pv-R.costP:null;
  R.revenueLot=isNum(R.pv)?R.pv*qty:null;
  R.margeLot=isNum(R.revenueLot)&&isNum(R.costLot)?R.revenueLot-R.costLot:null;
  R.margeRate=isNum(R.margeP)&&R.costP?R.margeP/R.costP:null;
  R.markRate=isNum(R.margeP)&&R.pv?R.margeP/R.pv:null;
  R.bestP=comp.find(o=>o.rP===1)||null; R.bestD=comp.find(o=>o.rD===1)||null;
  return R;
}
function calendarFeedback(o){
  const hour=x=>String(Math.round((x-Math.floor(x))*24)).padStart(2,'0')+' h';
  const notes=[];
  if(o.calendarNotice)notes.push(o.calendarNotice);
  const arrival=`${fd(Math.floor(o.arr))} à ${hour(o.arr)}`;
  const describe=(item,action)=>`Départ du ${fd(item.date)} ${action} : arrivée estimée au dépôt ${arrival}, après l’heure limite du ${fd(Math.floor(item.cutoff))} à ${hour(item.cutoff)}.`;
  if(o.keptCloseDate)notes.push(describe(o.keptCloseDate,'conservé malgré l’heure limite'));
  else for(const item of o.excludedDates||[])notes.push(describe(item,'écarté'));
  return notes;
}
function snapshot(d,R,p=S.params){
  const s=R.sel;
  return{costP:R.costP,costLot:R.costLot,pv:R.pv,margeP:R.margeP,dateClient:s?s.I:null,tr:s?s.t.tr:'',svc:s?tariffTransportLabel(s.t):'',
    qty:R.qty,achat:R.achat,transP:R.transP,yr:R.yr,usd:p.usd,depart:s?s.F:null,arrMax:s?s.G:null,dispo:s?s.Hh:null,
    transacLot:R.transacLot,transacP:R.transacP,revenueLot:R.revenueLot,margeLot:R.margeLot,note:s?s.t.note:''};
}
