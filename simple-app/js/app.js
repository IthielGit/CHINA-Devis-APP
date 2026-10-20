/* Hygo — interface. Le calcul et les données viennent de js/engine.js (S, compute, snapshot, persist, normAll…). */
(()=>{
const app=document.getElementById('app');
const sheet=document.getElementById('sheet');
const sheetBody=document.getElementById('sheetBody');
const NUM=['price','qty','wt','delai','heure','trans','livCh','exclus','livFin','pvRetenu'];
const MODES=['Avion','Maritime','Express'];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let tab='devis', hSearch='', editT=-1, editC=-1, lastSig=null;
const shown={};   // dernière valeur affichée par chiffre animé

const nowIso=()=>new Date().toISOString();
const val=x=>x==null?'':String(x);
const m=x=>isNum(x)?ar(x):'—';
const pct=x=>isNum(x)?(Math.round(x*1000)/10)+' %':'—';
const numOf=(data,k)=>{const v=data.get(k);return v===null||String(v).trim()===''?null:Number(String(v).replace(',','.'))};
const strOf=(data,k)=>String(data.get(k)??'').trim();
/* Couleur de couverture dérivée du nom : chaque produit a son dégradé, comme une affiche d’événement. */
const hueOf=s=>{let h=0;for(const c of String(s||'Hygo'))h=(h*31+c.charCodeAt(0))>>>0;return h%360};
const coverOf=s=>{const h=hueOf(s);return `linear-gradient(135deg,hsl(${h} 86% 64%),hsl(${(h+52)%360} 82% 50%))`};
const initials=s=>(String(s||'?').trim()[0]||'?').toUpperCase();

/* ---------- navigation ---------- */
const PAGES={
  devis:['Devis d’importation','Renseignez votre produit. Comparez le transport. Fixez votre prix.'],
  histo:['Historique','Produits enregistrés sur cet appareil.'],
  tarifs:['Tarifs et calendrier','Transitaires, tarifs et dates de départ.'],
  reglages:['Paramètres','Taux de change, délais et sauvegarde.']
};
function go(t){
  const apply=()=>{tab=t;closeSheet();render()};
  if(document.startViewTransition&&!reduce)document.startViewTransition(apply);else apply();
  window.scrollTo(0,0);
}
function render(){
  document.querySelectorAll('.nav [data-go]').forEach(b=>b.setAttribute('aria-current',b.dataset.go===tab?'page':'false'));
  placeIndicator();
  document.getElementById('pageTitle').textContent=PAGES[tab][0];
  document.getElementById('pageSub').textContent=PAGES[tab][1];
  renderRates();
  ({devis:viewDevis,histo:viewHisto,tarifs:viewTarifs,reglages:viewReglages})[tab]();
}
/* La pastille de navigation glisse jusqu’à l’onglet actif. */
function placeIndicator(){
  const nav=document.getElementById('nav');
  const btn=nav.querySelector('[aria-current="page"]');
  if(!btn)return;
  const n=nav.getBoundingClientRect(), r=btn.getBoundingClientRect();
  nav.style.setProperty('--ind-x',(r.left-n.left)+'px');
  nav.style.setProperty('--ind-y',(r.top-n.top)+'px');
  nav.style.setProperty('--ind-w',r.width+'px');
  nav.style.setProperty('--ind-h',r.height+'px');
  nav.style.setProperty('--ind-on',1);
}
window.addEventListener('resize',placeIndicator);
function renderRates(){
  const p=S.params;
  document.getElementById('rates').innerHTML=`<small>Taux de change</small>
    <p>1 ¥ = <b>${dec(yuanRate(p),2)} Ar</b></p>
    <p>1 USD = <b>${dec(p.usd,0)} Ar</b></p>`;
}

/* ---------- Thème clair / sombre ---------- */
function setTheme(theme){
  document.documentElement.dataset.theme=theme;
  const btn=document.getElementById('themeToggle');
  const next=theme==='dark'?'Activer le thème clair':'Activer le thème sombre';
  btn.setAttribute('aria-label',next);
  btn.title=next;
  try{localStorage.setItem('hygo-theme',theme)}catch(e){}
}
document.getElementById('themeToggle').addEventListener('click',()=>{
  setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
});

/* ---------- Devis ---------- */
function viewDevis(){
  const d=S.draft, cats=[...S.params.cats];
  if(d.cat&&!cats.includes(d.cat))cats.unshift(d.cat);
  const opt=(list,cur)=>list.map(o=>`<option ${o===cur?'selected':''}>${esc(o)}</option>`).join('');
  const inp=(k,label,type='text',attrs='')=>`<label class="field"><span>${label}</span><input class="inp" data-k="${k}" type="${type}" ${attrs} value="${esc(val(d[k]))}"></label>`;
  app.innerHTML=`
  <section class="card">
    <h2>Nouveau produit</h2>
    <div class="grid">
      ${inp('name','Nom du produit','text','autocomplete="off"')}
      <label class="field"><span>Catégorie</span><select class="inp" data-k="cat">${opt(cats,d.cat)}</select></label>
      ${inp('price','Prix d’achat (CNY / pièce)','number','step="any" inputmode="decimal"')}
      ${inp('qty','Quantité','number','min="1" step="1" inputmode="numeric"')}
      ${inp('dims','Dimensions cm (L x l x H)','text','placeholder="14 x 6 x 6"')}
      ${inp('wt','Poids (kg / pièce)','number','step="any" inputmode="decimal"')}
      <label class="field"><span>Base de facturation</span><select class="inp" data-k="base">${opt(['Le plus élevé','Poids réel','Poids volumétrique'],d.base)}</select></label>
      ${inp('pay','Date de paiement','date')}
      ${inp('delai','Jours vendeur → dépôt','number','min="0" step="1"')}
      ${inp('heure','Heure d’arrivée au dépôt (Chine)','number','min="0" max="23" step="1"')}
      <label class="field"><span>Marge souhaitée (%)</span><input class="inp" data-k="marge" type="number" step="any" value="${Math.round((d.marge??0)*1000)/10}"></label>
    </div>
    <details class="adv"><summary>Frais de commande <small>facultatif</small></summary>
      <div class="grid">
        ${inp('trans','Frais de transaction (CNY, commande)','number','step="any"')}
        ${inp('livCh','Livraison en Chine (Ar, commande)','number','step="any"')}
        ${inp('exclus','Frais exclusifs (Ar, commande)','number','step="any"')}
        ${inp('livFin','Livraison finale (Ar, commande)','number','step="any"')}
        ${inp('pvRetenu','Prix de vente imposé (Ar / pièce)','number','step="any" placeholder="Automatique"')}
      </div>
    </details>
  </section>
  <section class="card" id="result"></section>`;
  renderResult();
}

function onDraftField(el){
  const k=el.dataset.k;
  let v=el.value;
  if(k==='marge')v=v===''?0:Number(v)/100;
  else if(NUM.includes(k))v=v===''?null:Number(v);
  S.draft[k]=v;
  if(k==='cat')S.draft.catManual=true;
  if(k==='name'&&!S.draft.catManual){
    const g=guessCat(v);
    if(g&&S.params.cats.includes(g)){S.draft.cat=g;const sel=app.querySelector('[data-k="cat"]');if(sel)sel.value=g}
  }
  persist();
  renderResult();
}

/* Chiffre qui compte depuis sa valeur précédente. */
function countUp(key,el,to){
  const from=isNum(shown[key])?shown[key]:0;
  shown[key]=to;
  if(reduce||from===to)return;
  const t0=performance.now(),D=700;
  const step=now=>{const k=Math.min(1,(now-t0)/D),e=1-Math.pow(1-k,4);el.textContent=ar(from+(to-from)*e);if(k<1)requestAnimationFrame(step)};
  requestAnimationFrame(step);
}

function renderResult(){
  const el=document.getElementById('result');
  if(!el)return;
  const d=S.draft, R=compute(d), s=R.sel, manual=d.mode==='manuel';
  const kpi=(tone,lab,value,sub='',text=false)=>`<div class="kpi ${tone}${text?' text':''}"><span>${lab}</span><b>${value}</b>${sub?`<small>${sub}</small>`:''}</div>`;
  const num=(key,v)=>isNum(v)?` data-num="${v}" data-key="${key}"`:'';
  let body;
  if(!s){
    body=`<p class="warn">${manual?'L’offre choisie n’est pas compatible avec ce produit. Revenez au meilleur prix.':`Aucune offre pour la catégorie « ${esc(d.cat)} ». Vérifiez la catégorie ou l’onglet Tarifs.`}</p>`;
  } else {
    const notes=[...(s.t.note?[s.t.note]:[]),...calendarFeedback(s)];
    body=`<div class="kpis">
      ${kpi('t2','Transitaire',esc(s.t.tr),esc(s.t.mode+(s.t.svc?' · '+s.t.svc:'')),true)}
      ${kpi('t2','Arrivée estimée',isNum(s.I)?fd(Math.floor(s.I)):'—',isNum(s.F)?'Départ '+fd(Math.floor(s.F)):'',true)}
      ${kpi('t1','Prix de revient',`<span${num('cost',R.costP)}>${m(R.costP)}</span>`,`Total ${m(R.costLot)} · ${R.qty} pièce(s)`)}
    </div>
    ${notes.map(n=>`<p class="note">${esc(n)}</p>`).join('')}`;
    if(!isNum(R.costP))body+=`<p class="warn">Complétez le prix d’achat et le poids ou les dimensions pour obtenir le prix de revient.</p>`;
  }
  const hero=`<div class="hero" style="--cover:${coverOf(d.name)}">
    <div class="hero-top"><span class="chip">${esc(d.cat||'Sans catégorie')}</span><span class="res-tag ${manual?'manual':''}">${manual?'Offre choisie':'Meilleur prix'}</span></div>
    <div class="hero-name">${esc(d.name||'Nouveau produit')}</div>
    <div class="hero-price"><small>Prix de vente conseillé / pièce</small><b${num('pv',R.pv)}>${m(R.pv)}</b><small>Total ${m(R.revenueLot)} · marge ${m(R.margeP)} (${pct(R.margeRate)})</small></div>
  </div>`;
  const actions=`<div class="actions">
    <button class="btn primary" id="save">Enregistrer dans l’historique</button>
    <button class="btn" id="compare">Comparer les offres (${R.comp.length})</button>
    <button class="btn" id="new">Nouveau produit</button>
    ${manual?'<button class="link" id="back-best">Revenir au meilleur prix</button>':''}
  </div>`;
  // Animation seulement quand les chiffres changent vraiment (pas à chaque frappe).
  const sig=[s?.label,R.costP,R.pv,s?.I,manual].join('|');
  const bump=sig!==lastSig;
  lastSig=sig;
  el.innerHTML=hero+body+actions;
  el.classList.toggle('bump',bump);
  el.querySelectorAll('[data-num]').forEach(b=>countUp(b.dataset.key,b,+b.dataset.num));
  renderSheet(R,d);
}

/* Feuille : toutes les offres compatibles, la plus avantageuse en premier. */
function renderSheet(R,d){
  const s=R.sel;
  const offers=[...R.comp].sort((a,b)=>(isNum(a.J)?a.J:Infinity)-(isNum(b.J)?b.J:Infinity));
  sheetBody.innerHTML=offers.map(o=>{
    const on=s&&o.label===s.label;
    return `<button class="offer ${on?'is-on':''}" data-pick="${esc(o.label)}">
      <span class="radio" aria-hidden="true"></span>
      <span class="body">
        <b>${esc(o.t.tr)} · ${esc(o.t.mode)}${o.t.svc?' · '+esc(o.t.svc):''}</b>
        <small>Revient ${m(o.J)} · Vente ${isNum(o.J)?ar(Math.ceil(o.J*(1+(d.marge??0))/100)*100):'—'}</small>
        <small>${isNum(o.I)?'Arrivée '+fd(Math.floor(o.I)):'Date non connue'}${o.calendarNotice?' · '+esc(o.calendarNotice):''}</small>
      </span></button>`;
  }).join('')||'<p class="empty">Aucune offre compatible.</p>';
}
function openSheet(){
  sheet.hidden=false;
  sheet.querySelector('.panel').focus?.();
}
function closeSheet(){sheet.hidden=true}

/* Validation : pastille animée et confettis. */
function celebrate(){
  const b=document.createElement('div');
  b.className='burst';
  const bits=Array.from({length:taille()},(_,i)=>`<i style="--a:${i*(360/taille())}deg;--d:${70+((i*37)%70)}px;--c:hsl(${(i*53)%360} 85% 60%);--delay:${(i%4)*.03}s"></i>`).join('');
  b.innerHTML=`<div class="burst-core"><svg viewBox="0 0 52 52" pathLength="1"><circle cx="26" cy="26" r="23" pathLength="1"/><path d="M15 27l8 8 14-16" pathLength="1"/></svg><p>Produit enregistré</p><small>Retrouvez-le dans l’historique</small></div>${bits}`;
  document.body.appendChild(b);
  setTimeout(()=>b.classList.add('out'),1500);
  setTimeout(()=>b.remove(),1900);
}
const taille=()=>reduce?0:26;

function saveDraft(){
  const d=S.draft, R=compute(d);
  if(!d.name.trim()){toast('Donnez un nom au produit avant d’enregistrer.');app.querySelector('[data-k="name"]')?.focus();return}
  if(!R.sel){toast('Aucune offre disponible : vérifiez la catégorie et les tarifs.');return}
  const now=nowIso(), i=S.quotes.findIndex(q=>q.no===d.no), existing=i>=0?S.quotes[i]:null;
  if(existing&&existing.status&&existing.status!==STATUS.DRAFT){toast('Ce produit est déjà confirmé : modifiez-le depuis la version bureau.',{sticky:true});return}
  const {status,destination,...inputFields}=copyData(d);
  const inputs={...inputFields,mode:'manuel',offer:R.sel.label};
  const base=existing??normalizeQuoteWorkflow({no:d.no,created:now,status:STATUS.DRAFT,statusHistory:[{from:null,to:STATUS.DRAFT,at:now,comment:'Création'}]});
  const rec={...base,modified:now,inputs,res:snapshot(d,R),offer:R.sel.label,destination:''};
  const quotes=[...S.quotes];
  if(i>=0)quotes[i]=rec;else quotes.push(rec);
  S.quotes=quotes;
  persist();
  celebrate();
  renderResult();
}

function newDraft(){
  const keep=({marge,delai,heure,trans,base,pay})=>({marge,delai,heure,trans,base,pay});
  S.draft={...blankDraft(nextNo()),...keep(S.draft)};
  persist();
  viewDevis();
}

/* ---------- Historique ---------- */
function viewHisto(){
  app.innerHTML=`<section class="card"><h2>Produits enregistrés</h2>
    <input class="inp search" id="hsearch" type="search" placeholder="Rechercher un produit ou un numéro" value="${esc(hSearch)}">
    <div id="hlist"></div></section>`;
  renderHisto();
}
function renderHisto(){
  const el=document.getElementById('hlist');
  if(!el)return;
  const q=hSearch.trim().toLowerCase();
  const rows=[...S.quotes]
    .sort((a,b)=>String(b.modified||'').localeCompare(String(a.modified||'')))
    .filter(x=>!q||String(x.inputs?.name||'').toLowerCase().includes(q)||String(x.no).toLowerCase().includes(q));
  el.innerHTML=rows.length?rows.map(histCard).join(''):`<p class="empty">${q?'Aucun résultat.':'Aucun produit enregistré. Préparez un devis puis cliquez sur « Enregistrer dans l’historique ».'}</p>`;
}
function histCard(q){
  const r=q.res||{}, name=q.inputs?.name||'Sans nom';
  return `<article class="hcard">
    <div class="thumb" style="--cover:${coverOf(name)}">${esc(initials(name))}</div>
    <div class="hbody">
      <div class="hhead"><b>${esc(name)}</b><small class="muted">${esc(q.no)} · ${esc(fdt(q.modified))}</small></div>
      <div class="hnums"><span>Revient <b>${m(r.costP)}</b></span><span>Vente <b>${m(r.pv)}</b></span>${isNum(r.dateClient)?`<span>Arrivée ${fd(Math.floor(r.dateClient))}</span>`:''}</div>
      <small class="muted">${esc([r.tr,r.svc].filter(Boolean).join(' · '))}</small>
      <div class="actions">
        <button class="btn" data-open="${esc(q.no)}">Ouvrir</button>
        <button class="btn" data-dup="${esc(q.no)}">Dupliquer</button>
        <button class="btn danger" data-del="${esc(q.no)}">Supprimer</button>
      </div>
    </div></article>`;
}
function openQuote(no){
  const q=S.quotes.find(x=>x.no===no);
  if(!q)return;
  S.draft={...copyData(q.inputs),no:q.no};
  persist();
  go('devis');
}
function dupQuote(no){
  const q=S.quotes.find(x=>x.no===no);
  if(!q)return;
  S.draft={...copyData(q.inputs),no:nextNo()};
  persist();
  toast('Copie prête : enregistrez-la pour la garder.');
  go('devis');
}
function delQuote(no){
  const q=S.quotes.find(x=>x.no===no);
  if(!q||!confirm(`Supprimer « ${q.inputs?.name||q.no} » de l’historique ?`))return;
  S.quotes=S.quotes.filter(x=>x.no!==no);
  persist();
  renderHisto();
}

/* ---------- Tarifs et calendrier ---------- */
const field=(name,label,value='',type='text',extra='')=>`<label class="field"><span>${label}</span><input class="inp" name="${name}" type="${type}" value="${esc(val(value))}" ${extra}></label>`;
const select=(name,label,opts,cur,blank=true)=>`<label class="field"><span>${label}</span><select class="inp" name="${name}">${(blank?['',...opts]:opts).map(o=>`<option value="${esc(o)}" ${o===(cur??'')?'selected':''}>${esc(o)||'—'}</option>`).join('')}</select></label>`;

function viewTarifs(){
  const t=editT>=0?S.tarifs[editT]:null, c=editC>=0?S.cal[editC]:null;
  const trs=[...new Set(S.tarifs.map(x=>x.tr).filter(Boolean))];
  const modes=[...new Set([...MODES,...S.tarifs.map(x=>x.mode).filter(Boolean)])];
  const svcs=[...new Set(S.tarifs.map(x=>x.svc).filter(Boolean))];
  const datalists=`<datalist id="dl-tr">${trs.map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
    <datalist id="dl-mode">${modes.map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
    <datalist id="dl-svc">${svcs.map(x=>`<option value="${esc(x)}">`).join('')}</datalist>`;
  const tl=S.tarifs.map((x,i)=>`<div class="line"><span><b>${esc(x.tr)}</b> · ${esc(x.mode)}${x.svc?' · '+esc(x.svc):''}<small>${esc(x.cats||'')} · ${isNum(x.tarif)?esc(dec(x.tarif,2))+' '+esc(x.cur)+' / '+esc(x.unit):'—'}</small></span>
    <span class="actions"><button class="btn" data-edit-t="${i}">Modifier</button><button class="btn danger" data-del-t="${i}">Supprimer</button></span></div>`).join('')||'<p class="empty">Aucun tarif.</p>';
  const cl=[...S.cal].map((x,i)=>({x,i})).sort((a,b)=>String(a.x.date).localeCompare(String(b.x.date)))
    .map(({x,i})=>`<div class="line"><span><b>${esc(fd(dayNum(x.date)))}</b> · ${esc(x.tr)} · ${esc(x.mode)}${x.svc?' · '+esc(x.svc):''}<small>${esc(x.note||'')}</small></span>
    <span class="actions"><button class="btn" data-edit-c="${i}">Modifier</button><button class="btn danger" data-del-c="${i}">Supprimer</button></span></div>`).join('')||'<p class="empty">Aucune date de départ publiée.</p>';
  app.innerHTML=`${datalists}
  <form class="card" id="tform"><h2>${t?'Modifier le tarif':'Ajouter un tarif'}</h2>
    <div class="grid">
      ${field('tr','Transitaire',t?.tr,'text','list="dl-tr" required')}
      ${field('mode','Mode (Avion, Maritime…)',t?.mode,'text','list="dl-mode" required')}
      ${field('svc','Service (vide si maritime)',t?.svc,'text','list="dl-svc"')}
      ${field('cats','Catégories acceptées (séparées par ;)',t?.cats,'text')}
      ${field('tarif','Tarif',t?.tarif,'number','step="any" required')}
      ${select('unit','Unité',['kg','pièce','m³'],t?.unit??'kg',false)}
      ${select('cur','Devise',['Ar','USD'],t?.cur??'Ar',false)}
      ${field('min','Minimum facturable',t?.min,'number','step="any"')}
      ${field('dmin','Transit min (jours)',t?.dmin,'number')}
      ${field('dmax','Transit max (jours)',t?.dmax,'number')}
      ${select('d1','Jour de départ 1',JOURS,t?.d1??'')}
      ${field('c1','Clôture 1 (jours avant départ)',t?.c1,'number')}
      ${select('d2','Jour de départ 2',JOURS,t?.d2??'')}
      ${field('c2','Clôture 2 (jours avant départ)',t?.c2,'number')}
      ${field('h','Heure limite au dépôt (h)',t?.h,'number','min="0" max="23"')}
      ${field('note','Note',t?.note,'text')}
    </div>
    <div class="actions"><button class="btn primary" type="submit">${t?'Enregistrer le tarif':'Ajouter le tarif'}</button>${t?'<button class="btn" type="button" id="cancel-t">Annuler</button>':''}</div>
  </form>
  <section class="card"><h2>Tarifs</h2>${tl}</section>
  <form class="card" id="cform"><h2>${c?'Modifier une date de départ':'Ajouter une date de départ'}</h2>
    <p class="muted">Pour les transitaires sans départ régulier. La date doit correspondre au transitaire, au mode et au service du tarif.</p>
    <div class="grid">
      ${field('tr','Transitaire',c?.tr,'text','list="dl-tr" required')}
      ${field('mode','Mode',c?.mode,'text','list="dl-mode" required')}
      ${field('svc','Service (vide si maritime)',c?.svc,'text','list="dl-svc"')}
      ${field('date','Date de départ',c?.date,'date','required')}
      ${field('note','Note',c?.note,'text')}
    </div>
    <div class="actions"><button class="btn primary" type="submit">${c?'Enregistrer la date':'Ajouter la date'}</button>${c?'<button class="btn" type="button" id="cancel-c">Annuler</button>':''}</div>
  </form>
  <section class="card"><h2>Dates de départ</h2>${cl}</section>`;
}

function saveTariff(data){
  const mode=strOf(data,'mode');
  const old=editT>=0?S.tarifs[editT]:{palier:null,tarif2:null,base:null};
  const t={...old,tr:strOf(data,'tr'),mode,svc:mode==='Maritime'?'':strOf(data,'svc'),cats:strOf(data,'cats'),
    tarif:numOf(data,'tarif'),unit:strOf(data,'unit'),cur:strOf(data,'cur'),min:numOf(data,'min'),dmin:numOf(data,'dmin'),dmax:numOf(data,'dmax'),
    d1:strOf(data,'d1')||null,c1:numOf(data,'c1'),d2:strOf(data,'d2')||null,c2:numOf(data,'c2'),h:numOf(data,'h'),note:strOf(data,'note')};
  if(!t.tr||!mode||!isNum(t.tarif)){toast('Transitaire, mode et tarif sont obligatoires.',{sticky:true});return}
  if(editT>=0)S.tarifs[editT]=t;else S.tarifs.push(t);
  editT=-1;persist();toast('Tarif enregistré.');viewTarifs();
}
function delTariff(i){
  const t=S.tarifs[i];
  if(!t||!confirm(`Supprimer le tarif ${t.tr} · ${t.mode}${t.svc?' · '+t.svc:''} ?`))return;
  S.tarifs.splice(i,1);editT=-1;persist();viewTarifs();
}
function saveCal(data){
  const mode=strOf(data,'mode');
  const old=editC>=0?S.cal[editC]:{};
  const c={...old,tr:strOf(data,'tr'),mode,svc:mode==='Maritime'?'':strOf(data,'svc'),date:strOf(data,'date'),note:strOf(data,'note')};
  if(!c.tr||!mode||!/^\d{4}-\d{2}-\d{2}$/.test(c.date)){toast('Transitaire, mode et date sont obligatoires.',{sticky:true});return}
  if(editC>=0)S.cal[editC]=c;else S.cal.push(c);
  editC=-1;persist();toast('Date enregistrée.');viewTarifs();
}
function delCal(i){
  const c=S.cal[i];
  if(!c||!confirm(`Supprimer la date du ${c.date} (${c.tr}) ?`))return;
  S.cal.splice(i,1);editC=-1;persist();viewTarifs();
}

/* ---------- Réglages et sauvegarde ---------- */
function viewReglages(){
  const p=S.params;
  const sel=(name,label,opts,cur)=>`<label class="field"><span>${label}</span><select class="inp" name="${name}">${opts.map(([v,l])=>`<option value="${v}" ${v===cur?'selected':''}>${l}</option>`).join('')}</select></label>`;
  app.innerHTML=`
  <form class="card" id="pform"><h2>Taux et paramètres</h2>
    <div class="grid">
      ${field('usd','Taux du dollar (Ar pour 1 USD)',p.usd,'number','step="any" required')}
      ${field('cnyUsd','Yuans pour 1 USD',p.cnyUsd,'number','step="any" required')}
      ${field('marge','Marge de sécurité sur le change (%)',Math.round((p.marge??0)*1000)/10,'number','step="any"')}
      ${field('div','Diviseur volumétrique (cm³ → kg)',p.div,'number','required')}
      ${field('dispo','Jours de manutention au dépôt',p.dispo,'number')}
      ${field('mAvion','Délai client avion (jours)',p.mAvion,'number')}
      ${field('mMar','Délai client maritime (jours)',p.mMar,'number')}
      ${sel('dimanche','Disponibilité tombant un dimanche',[['Non','Décaler au lundi'],['Oui','Garder le dimanche']],p.dimanche)}
      ${sel('calendarClosePolicy','Départs après l’heure limite',[['exclude','Les écarter'],['keep','Les garder, avec un avertissement']],p.calendarClosePolicy)}
      <label class="field wide"><span>Catégories de produits (séparées par des virgules)</span><textarea class="inp" name="cats" rows="3">${esc(p.cats.join(', '))}</textarea></label>
    </div>
    <div class="actions"><button class="btn primary" type="submit">Enregistrer les paramètres</button></div>
  </form>
  <section class="card"><h2>Sauvegarde</h2>
    <p class="muted">Les données restent sur cet appareil. Exportez une sauvegarde régulièrement, et avant de changer de téléphone ou de désinstaller.</p>
    <div class="actions">
      <button class="btn" id="export">Exporter la sauvegarde (JSON)</button>
      <label class="btn">Importer une sauvegarde<input id="import" type="file" accept="application/json,.json" hidden></label>
    </div>
  </section>`;
}

function saveParams(data){
  const p={...S.params,usd:numOf(data,'usd'),cnyUsd:numOf(data,'cnyUsd'),marge:(numOf(data,'marge')??0)/100,div:numOf(data,'div'),
    dispo:numOf(data,'dispo'),mAvion:numOf(data,'mAvion'),mMar:numOf(data,'mMar'),dimanche:strOf(data,'dimanche'),
    calendarClosePolicy:strOf(data,'calendarClosePolicy'),cats:strOf(data,'cats').split(',').map(s=>s.trim()).filter(Boolean)};
  if(!(p.usd>0)||!(p.cnyUsd>0)||!(p.div>0)){toast('Taux et diviseur doivent être supérieurs à 0.',{sticky:true});return}
  S.params=p;persist();toast('Paramètres enregistrés.');renderRates();viewReglages();
}
function exportData(){
  const txt=JSON.stringify(S,null,1), name='hygo-'+dayStr(Math.floor(Date.now()/864e5))+'.json';
  const url=URL.createObjectURL(new Blob([txt],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('Sauvegarde téléchargée.');
}
function importData(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const j=JSON.parse(reader.result);
      if(!j||!j.params||!Array.isArray(j.tarifs))throw new Error('format');
      S=normAll(j);persist();toast('Sauvegarde restaurée.');go('devis');
    }catch(err){toast('Fichier invalide : ce n’est pas une sauvegarde Hygo ou Devis Transitaires.',{sticky:true})}
  };
  reader.readAsText(file);
}

/* ---------- événements ---------- */
document.querySelector('.side').addEventListener('click',e=>{
  const b=e.target.closest('[data-go]');if(b)go(b.dataset.go);
});
sheet.addEventListener('click',e=>{
  if(e.target.closest('[data-close]')){closeSheet();return}
  const o=e.target.closest('[data-pick]');
  if(o){S.draft.mode='manuel';S.draft.offer=o.dataset.pick;persist();closeSheet();renderResult()}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!sheet.hidden)closeSheet()});
app.addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t)return;
  const ds=t.dataset;
  if(t.id==='back-best'){S.draft.mode='prix';persist();renderResult();return}
  if(t.id==='save'){saveDraft();return}
  if(t.id==='new'){newDraft();return}
  if(t.id==='compare'){openSheet();return}
  if(ds.open){openQuote(ds.open);return}
  if(ds.dup){dupQuote(ds.dup);return}
  if(ds.del){delQuote(ds.del);return}
  if(ds.editT!==undefined){editT=+ds.editT;viewTarifs();window.scrollTo(0,0);return}
  if(ds.delT!==undefined){delTariff(+ds.delT);return}
  if(ds.editC!==undefined){editC=+ds.editC;viewTarifs();window.scrollTo(0,0);return}
  if(ds.delC!==undefined){delCal(+ds.delC);return}
  if(t.id==='cancel-t'){editT=-1;viewTarifs();return}
  if(t.id==='cancel-c'){editC=-1;viewTarifs();return}
  if(t.id==='export'){exportData();return}
});
app.addEventListener('input',e=>{
  const el=e.target;
  if(el.dataset.k){if(el.tagName==='INPUT')onDraftField(el);return}
  if(el.id==='hsearch'){hSearch=el.value;renderHisto()}
});
app.addEventListener('change',e=>{
  const el=e.target;
  if(el.dataset.k&&el.tagName==='SELECT')onDraftField(el);
  if(el.id==='import')importData(el.files[0]);
});
app.addEventListener('submit',e=>{
  e.preventDefault();
  const f=e.target, data=new FormData(f);
  if(f.id==='tform')saveTariff(data);
  else if(f.id==='cform')saveCal(data);
  else if(f.id==='pform')saveParams(data);
});

/* Au premier lancement, le moteur met un exemple de la version bureau : on repart d’un formulaire vide. */
if(!S.quotes.length&&S.draft.name==='Spray anti-pluie 50 ml')S.draft=blankDraft(nextNo());

render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
