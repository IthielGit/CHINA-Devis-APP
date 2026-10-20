/* Hygo — interface. Le calcul et les données viennent de js/engine.js (S, compute, snapshot, persist, normAll…). */
(()=>{
const app=document.getElementById('app');
const sheet=document.getElementById('sheet');
const sheetBody=document.getElementById('sheetBody');
const NUM=['price','qty','wt','delai','heure','trans','livCh','exclus','livFin','pvRetenu'];
const MODES=['Avion','Maritime','Express'];
const MARGES=[0.3,0.5,1];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const systemDark=matchMedia('(prefers-color-scheme: dark)');
let tab='devis', hSearch='', editT=-1, editC=-1, lastSig=null;
const touched=new Set();   // champs déjà touchés : leurs erreurs peuvent s’afficher
let showAll=false;         // vrai après une tentative d’enregistrement
const shown={};   // dernière valeur affichée par chiffre animé

const nowIso=()=>new Date().toISOString();
const val=x=>x==null?'':String(x);
const m=x=>isNum(x)?ar(x):'—';
const pct=x=>isNum(x)?(Math.round(x*1000)/10)+' %':'—';
const numOf=(data,k)=>{const v=data.get(k);return v===null||String(v).trim()===''?null:Number(String(v).replace(',','.'))};
const strOf=(data,k)=>String(data.get(k)??'').trim();
const initials=s=>(String(s||'?').trim()[0]||'?').toUpperCase();
const $=id=>document.getElementById(id);

/* ---------- thème : suit le système, ou le choix de l’utilisateur ---------- */
function effectiveTheme(){
  const t=document.documentElement.dataset.theme;
  return t==='dark'||t==='light'?t:(systemDark.matches?'dark':'light');
}
function syncTheme(){
  const eff=effectiveTheme();
  $('themeToggle').dataset.eff=eff;
  $('themeToggle').setAttribute('aria-label',eff==='dark'?'Passer au thème clair':'Passer au thème sombre');
  $('themeToggle').title=$('themeToggle').getAttribute('aria-label');
  let tc=document.querySelector('meta[name="theme-color"]:not([media])');
  if(document.documentElement.dataset.theme){
    if(!tc){tc=document.createElement('meta');tc.name='theme-color';document.head.appendChild(tc)}
    tc.content=eff==='dark'?'#11111B':'#F6F5FA';
  }else if(tc)tc.remove();
}
systemDark.addEventListener?.('change',syncTheme);
/* Apparence : 'system', 'light' ou 'dark'. */
function appearance(){const t=document.documentElement.dataset.theme;return t==='dark'||t==='light'?t:'system'}
function setAppearance(v){
  if(v==='light'||v==='dark')document.documentElement.dataset.theme=v;
  else delete document.documentElement.dataset.theme;
  try{localStorage.setItem('hygo-theme',v)}catch(e){}
  syncTheme();
}
$('themeToggle').addEventListener('click',()=>{
  setAppearance(effectiveTheme()==='dark'?'light':'dark');
  if(tab==='reglages')viewReglages();
});

/* ---------- navigation ---------- */
const PAGES={
  devis:['Devis','Chine → Madagascar · saisissez le produit, le reste se calcule.'],
  histo:['Historique','Produits enregistrés sur cet appareil.'],
  tarifs:['Tarifs','Transitaires, tarifs et dates de départ.'],
  reglages:['Réglages','Apparence, taux de change et sauvegarde.']
};
function go(t){
  const apply=()=>{tab=t;closeSheet();render()};
  if(document.startViewTransition&&!reduce)document.startViewTransition(apply);else apply();
  window.scrollTo(0,0);
}
function render(){
  document.querySelectorAll('.nav [data-go]').forEach(b=>b.setAttribute('aria-current',b.dataset.go===tab?'page':'false'));
  placeIndicator();
  $('pageTitle').textContent=PAGES[tab][0];
  $('pageSub').textContent=PAGES[tab][1];
  renderRates();
  ({devis:viewDevis,histo:viewHisto,tarifs:viewTarifs,reglages:viewReglages})[tab]();
}
function placeIndicator(){
  const nav=$('nav');
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
  $('rates').innerHTML=`<small>Taux de change</small>
    <p>1 ¥ = <b>${dec(yuanRate(p),2)} Ar</b></p>
    <p>1 USD = <b>${dec(p.usd,0)} Ar</b></p>`;
}

/* ---------- Devis ---------- */
/* Règles de validation : calculées en continu, sans bouton « vérifier ». */
function checksFor(d,R){
  const out=[];
  const dims=dimsOf(d), prod=dims[0]*dims[1]*dims[2];
  out.push({key:'name',label:'Nom',state:d.name.trim()?'ok':'bad',txt:d.name.trim()?'':'à saisir'});
  out.push({key:'price',label:'Prix d’achat',state:d.price>0?'ok':'bad',txt:d.price>0?'':'en yuans'});
  const dimsOk=dims.every(x=>x>0);
  out.push({key:'dims',label:'Dimensions',state:dimsOk?'ok':'bad',txt:dimsOk?'':'L x l x H'});
  const wtState=!(d.wt>0)?'bad':d.wt>30?'warn':'ok';
  out.push({key:'wt',label:'Poids',state:wtState,txt:wtState==='bad'?'à saisir':wtState==='warn'?'élevé, vérifiez':''});
  out.push({key:'offer',label:'Transport',state:R.sel?'ok':'bad',txt:R.sel?'':'aucune offre'});
  if(d.pvRetenu!=null&&isNum(R.costP))out.push({key:'pv',label:'Prix imposé',state:d.pvRetenu<R.costP?'bad':'ok',txt:d.pvRetenu<R.costP?'sous le revient':''});
  const margeState=(d.marge??0)<0?'bad':(d.marge??0)<0.1?'warn':'ok';
  out.push({key:'marge',label:'Marge',state:margeState,txt:margeState==='warn'?'faible':margeState==='bad'?'négative':''});
  if(d.pay){const old=Math.floor(Date.now()/864e5)-dayNum(d.pay)>30;out.push({key:'pay',label:'Date de paiement',state:old?'warn':'ok',txt:old?'ancienne':''})}
  return out;
}
function viewDevis(){
  const d=S.draft, cats=[...S.params.cats];
  if(d.cat&&!cats.includes(d.cat))cats.unshift(d.cat);
  const opt=(list,cur)=>list.map(o=>`<option ${o===cur?'selected':''}>${esc(o)}</option>`).join('');
  const inp=(k,label,type='text',attrs='',suffix='')=>`<label class="field"><span>${label}</span><span class="input-wrap"><input class="inp" data-k="${k}" type="${type}" ${attrs} value="${esc(val(d[k]))}">${suffix?`<span class="suffix">${suffix}</span>`:''}</span></label>`;
  const names=[...new Map(S.quotes.map(q=>[String(q.inputs?.name||'').trim().toLowerCase(),q.inputs?.name]).filter(([k])=>k)).values()];
  app.innerHTML=`
  <datalist id="names">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>
  <section class="card">
    <h2>Produit</h2>
    <div class="grid">
      <label class="field wide"><span>Nom du produit</span><input class="inp" data-k="name" list="names" autocomplete="off" placeholder="Ex. Spray anti-pluie 50 ml" value="${esc(val(d.name))}"><span class="hint" id="hint-name">${esc(d.repris?'Repris de '+d.repris+' : vérifiez le prix.':'Un nom déjà enregistré remplit le reste.')}</span></label>
      <label class="field"><span>Prix d’achat</span><span class="input-wrap"><input class="inp" data-k="price" type="number" step="any" inputmode="decimal" value="${esc(val(d.price))}"><span class="suffix">¥</span></span><span class="hint" id="hint-price"></span></label>
      <div class="field"><span>Quantité</span>
        <div class="stepper"><button type="button" data-step="-1" aria-label="Retirer une pièce">−</button><output id="qty-out">${d.qty||1}</output><button type="button" data-step="1" aria-label="Ajouter une pièce">+</button></div>
        <span class="hint">Pièces identiques</span></div>
      <label class="field wide"><span>Dimensions (cm, L × l × H)</span><input class="inp" data-k="dims" placeholder="14 x 6 x 6" inputmode="decimal" value="${esc(val(d.dims))}"><span class="hint" id="hint-dims"></span></label>
      <label class="field"><span>Poids d’un produit emballé</span><span class="input-wrap"><input class="inp" data-k="wt" type="number" step="any" inputmode="decimal" value="${esc(val(d.wt))}"><span class="suffix">kg</span></span><span class="hint" id="hint-wt"></span></label>
      <div class="field"><span>Marge</span>
        <div class="segments" id="margeChips" role="group" aria-label="Marge">
          ${MARGES.map(v=>`<button type="button" class="seg" data-marge="${v}" aria-pressed="false">${Math.round(v*100)} %</button>`).join('')}
          <input class="inp mini" data-k="marge" type="number" step="1" inputmode="numeric" aria-label="Marge personnalisée en pourcentage" value="${Math.round((d.marge??0)*1000)/10}">
        </div></div>
    </div>
    <div class="section-label">Contrôles automatiques</div>
    <div class="checks" id="checks"></div>
    <details class="adv"><summary>Catégorie, dates et frais <small>automatique, modifiable</small></summary>
      <div class="grid">
        <label class="field"><span>Catégorie</span><select class="inp" data-k="cat">${opt(cats,d.cat)}</select></label>
        <label class="field"><span>Base de facturation</span><select class="inp" data-k="base">${opt(['Le plus élevé','Poids réel','Poids volumétrique'],d.base)}</select></label>
        ${inp('pay','Date de paiement','date')}
        ${inp('delai','Jours vendeur → dépôt','number','min="0" step="1"')}
        ${inp('heure','Heure d’arrivée au dépôt (Chine)','number','min="0" max="23" step="1"')}
        ${inp('trans','Frais de transaction (CNY, commande)','number','step="any"')}
        ${inp('livCh','Livraison en Chine (Ar, commande)','number','step="any"')}
        ${inp('exclus','Frais exclusifs (Ar, commande)','number','step="any"')}
        ${inp('livFin','Livraison finale (Ar, commande)','number','step="any"')}
        ${inp('pvRetenu','Prix de vente imposé (Ar / pièce)','number','step="any" placeholder="Automatique"')}
      </div>
    </details>
  </section>
  <section class="card" id="result"></section>`;
  syncMarge();
  renderResult();
}

function syncMarge(){
  const v=S.draft.marge??0;
  document.querySelectorAll('[data-marge]').forEach(b=>b.setAttribute('aria-pressed',String(Math.abs(Number(b.dataset.marge)-v)<1e-9)));
}

function onDraftField(el){
  const k=el.dataset.k;
  let v=el.value;
  if(k==='marge')v=v===''?0:Number(v)/100;
  else if(NUM.includes(k))v=v===''?null:Number(v);
  S.draft[k]=v;
  touched.add(k);
  if(k==='cat')S.draft.catManual=true;
  if(k==='name'&&!S.draft.catManual){
    const g=guessCat(v);
    if(g&&S.params.cats.includes(g)){S.draft.cat=g;const sel=app.querySelector('[data-k="cat"]');if(sel)sel.value=g}
  }
  if(k==='marge')syncMarge();
  persist();
  renderResult();
}

/* Nom déjà enregistré : on reprend prix, dimensions, poids, catégorie et marge du dernier devis. */
function applyKnownName(){
  const key=String(S.draft.name||'').trim().toLowerCase();
  if(!key)return;
  const known=[...S.quotes].sort((a,b)=>String(b.modified||'').localeCompare(String(a.modified||''))).find(q=>String(q.inputs?.name||'').trim().toLowerCase()===key);
  if(!known)return;
  const i=known.inputs;
  Object.assign(S.draft,{cat:i.cat,catManual:true,price:i.price,dims:i.dims,wt:i.wt,marge:i.marge??S.draft.marge,repris:known.no});
  persist();
  viewDevis();
}

/* Chiffre qui compte depuis sa valeur précédente. */
function countUp(key,el,to){
  const from=isNum(shown[key])?shown[key]:0;
  shown[key]=to;
  if(reduce||from===to)return;
  const t0=performance.now(),D=300;
  const step=now=>{const k=Math.min(1,(now-t0)/D),e=1-Math.pow(1-k,4);el.textContent=ar(from+(to-from)*e);if(k<1)requestAnimationFrame(step)};
  requestAnimationFrame(step);
}

/* Une erreur ne s’affiche sous un champ qu’après l’avoir touché, ou après une tentative d’enregistrement.
   Avant, le champ montre seulement une indication neutre. */
function updateHints(d,R,checks){
  const dims=dimsOf(d), prod=dims[0]*dims[1]*dims[2];
  const show=k=>showAll||touched.has(k);
  const by=k=>checks.find(c=>c.key===k);
  const set=(id,k,okTxt,guide,badTxt,warnTxt='')=>{
    const el=$(id);if(!el)return;
    const c=by(k), bad=c?.state==='bad'&&show(k), warn=c?.state==='warn';
    el.textContent=bad?badTxt:warn&&warnTxt?warnTxt:(c?.state==='ok'&&okTxt?okTxt:guide);
    el.className='hint'+(bad||warn&&warnTxt?' bad':'');
  };
  set('hint-name','name',d.repris?`Repris de ${d.repris} : vérifiez le prix.`:'','Un nom déjà enregistré remplit le reste.','Donnez un nom au produit.');
  set('hint-price','price',isNum(R.achat)?`≈ ${ar(R.achat)} par pièce`:'','En yuans, pour une pièce.','Saisissez le prix d’achat en yuans.');
  set('hint-dims','dims',prod?`Volume ${dec(prod,0)} cm³ · poids volumétrique ${dec(prod/S.params.div,2)} kg`:'','Trois mesures en cm, par exemple 14 x 6 x 6.','Format attendu : 14 x 6 x 6.');
  set('hint-wt','wt','','Produit emballé, en kg.','Saisissez le poids d’un produit emballé.','Poids élevé : vérifiez que le transitaire l’accepte.');
  const out=$('qty-out');if(out)out.textContent=d.qty||1;
  document.querySelectorAll('.inp[data-k]').forEach(el=>{
    const k=el.dataset.k, c=by(k);
    el.classList.toggle('is-bad',!!c&&c.state==='bad'&&show(k));
    el.setAttribute('aria-invalid',String(!!c&&c.state==='bad'&&show(k)));
  });
}

function renderResult(){
  const el=$('result');
  if(!el)return;
  const d=S.draft, R=compute(d), s=R.sel, manual=d.mode==='manuel';
  const checks=checksFor(d,R);
  const blocking=checks.filter(c=>c.state==='bad');
  const chk=$('checks');
  if(chk)chk.innerHTML=checks.map(c=>`<span class="chk ${c.state==='ok'?'':c.state}" title="${esc(c.txt)}"><b>${c.state==='ok'?'✓':c.state==='warn'?'!':'✕'}</b>${esc(c.label)}${c.txt&&c.state!=='ok'?' · '+esc(c.txt):''}</span>`).join('');
  updateHints(d,R,checks);
  const row=(lab,value,sub='')=>`<div class="row"><span>${lab}</span><span class="val">${value}${sub?`<small>${sub}</small>`:''}</span></div>`;
  const num=(key,v)=>isNum(v)?` data-num="${v}" data-key="${key}"`:'';
  let body;
  if(!s){
    body=`<p class="warn-box"><span aria-hidden="true">⚠︎</span><span>${manual?'L’offre choisie n’est pas compatible avec ce produit. Revenez au meilleur prix.':`Aucun transitaire ne prend la catégorie « ${esc(d.cat)} ». Changez la catégorie dans « Catégorie, dates et frais ».`}</span></p>`;
  } else {
    const notes=[...(s.t.note?[s.t.note]:[]),...calendarFeedback(s)];
    body=`<div class="rows">
      ${row('Transitaire',esc(s.t.tr),esc(s.t.mode+(s.t.svc?' · '+s.t.svc:'')))}
      ${row('Arrivée estimée',isNum(s.I)?fd(Math.floor(s.I)):'—',isNum(s.F)?'Départ '+fd(Math.floor(s.F)):'')}
      ${row('Prix de revient',`<span class="amount"${num('cost',R.costP)}>${m(R.costP)}</span>`,`Total ${m(R.costLot)} · ${R.qty} pièce(s)`)}
    </div>
    ${notes.map(n=>`<p class="note">${esc(n)}</p>`).join('')}`;
  }
  // La marge s’affiche avec son signe et sa couleur : la couleur n’est jamais la seule information.
  const marge=isNum(R.margeP)?`<span class="${R.margeP>=0?'pos':'neg'}">Marge ${R.margeP>0?'+':''}${m(R.margeP)} (${pct(R.margeRate)})</span>`:'<span>Marge —</span>';
  const hero=`<div class="summary-head"><span class="tag neutral">${esc(d.cat||'Sans catégorie')}</span><span class="tag">${manual?'Offre choisie':'✓ Meilleur prix'}</span></div>
    <div class="product-name">${esc(d.name||'Nouveau produit')}</div>
    <div class="big-label">Prix de vente conseillé, par pièce</div>
    <div class="big-amount amount"${num('pv',R.pv)}>${m(R.pv)}</div>
    <div class="sub-amounts"><span>Total ${m(R.revenueLot)}</span>${marge}</div>`;
  const canSave=blocking.length===0;
  const why=canSave?'':`${showAll?'À corriger':'Il reste à compléter'} : ${blocking.map(c=>c.label.toLowerCase()).join(', ')}.`;
  const actions=`<div class="actions">
    <button class="btn primary" id="save" aria-describedby="saveWhy">Enregistrer dans l’historique</button>
    <button class="btn" id="compare" ${R.comp.length?'':'disabled'}>Comparer les offres (${R.comp.length})</button>
    <button class="btn" id="new">Nouveau produit</button>
    ${manual?'<button class="link" id="back-best">Revenir au meilleur prix</button>':''}
  </div><p class="hint${showAll&&why?' bad':''}" id="saveWhy" style="margin-top:10px">${esc(why)}</p>`;
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
    return `<button class="offer ${on?'is-on':''}" data-pick="${esc(o.label)}" aria-pressed="${on?'true':'false'}">
      <span class="radio" aria-hidden="true"></span>
      <span class="body">
        <b>${esc(o.t.tr)} · ${esc(o.t.mode)}${o.t.svc?' · '+esc(o.t.svc):''}</b>
        <small>${isNum(o.I)?'Arrivée '+fd(Math.floor(o.I)):'Date non connue'}${o.calendarNotice?' · '+esc(o.calendarNotice):''}</small>
      </span>
      <span class="price">${m(o.J)}<small>vente ${isNum(o.J)?ar(Math.ceil(o.J*(1+(d.marge??0))/100)*100):'—'}</small></span></button>`;
  }).join('')||'<p class="empty">Aucune offre compatible.</p>';
}
function openSheet(){sheet.hidden=false}
function closeSheet(){sheet.hidden=true}

/* Validation : coche dessinée, discrète, avec retour haptique quand l’appareil le permet. */
function celebrate(){
  const b=document.createElement('div');
  b.className='done';
  b.setAttribute('role','status');
  b.innerHTML=`<div class="done-core"><svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23" pathLength="1"/><path d="M15 27l8 8 14-16" pathLength="1"/></svg><p>Produit enregistré</p></div>`;
  document.body.appendChild(b);
  try{navigator.vibrate?.(12)}catch(e){}
  setTimeout(()=>b.classList.add('out'),900);
  setTimeout(()=>b.remove(),1150);
}

function saveDraft(){
  const d=S.draft, R=compute(d);
  const bad=checksFor(d,R).filter(c=>c.state==='bad');
  if(bad.length){
    // Affiche toutes les erreurs et place le curseur sur le premier champ à corriger.
    showAll=true;renderResult();
    const first=bad.map(c=>app.querySelector(`[data-k="${c.key}"]`)).find(Boolean);
    if(first)first.focus();
    toast(`À corriger : ${bad.map(c=>c.label.toLowerCase()).join(', ')}.`);
    return;
  }
  const now=nowIso(), i=S.quotes.findIndex(q=>q.no===d.no), existing=i>=0?S.quotes[i]:null;
  if(existing&&existing.status&&existing.status!==STATUS.DRAFT){toast('Ce produit est déjà confirmé : modifiez-le depuis la version bureau.',{sticky:true});return}
  const {status,destination,repris,...inputFields}=copyData(d);
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
  touched.clear();showAll=false;
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
  const el=$('hlist');
  if(!el)return;
  const q=hSearch.trim().toLowerCase();
  const rows=[...S.quotes]
    .sort((a,b)=>String(b.modified||'').localeCompare(String(a.modified||'')))
    .filter(x=>!q||String(x.inputs?.name||'').toLowerCase().includes(q)||String(x.no).toLowerCase().includes(q));
  if(!rows.length){el.innerHTML=`<p class="empty">${q?'Aucun résultat pour cette recherche.':'Aucun produit enregistré. Préparez un devis puis touchez « Enregistrer dans l’historique ».'}</p>`;return}
  // Regroupement par jour de modification, comme une liste de transactions.
  const dayKey=iso=>String(iso||'').slice(0,10);
  const today=dayStr(Math.floor(Date.now()/864e5)), yesterday=dayStr(Math.floor(Date.now()/864e5)-1);
  const dayLabel=k=>k===today?'Aujourd’hui':k===yesterday?'Hier':(k?new Date(k+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'Sans date');
  const groups=new Map();
  rows.forEach(x=>{const k=dayKey(x.modified);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x)});
  el.innerHTML=[...groups].map(([k,list])=>`<h3 class="day">${esc(dayLabel(k))}</h3><div class="list">${list.map(histItem).join('')}</div>`).join('');
}
function histItem(q){
  const r=q.res||{}, name=q.inputs?.name||'Sans nom';
  const meta=[q.no,r.tr,isNum(r.dateClient)?'arrivée '+fd(Math.floor(r.dateClient)):''].filter(Boolean).join(' · ');
  return `<div class="item-wrap">
    <button class="item" data-open="${esc(q.no)}" aria-label="Ouvrir ${esc(name)}">
      <span class="avatar" aria-hidden="true">${esc(initials(name))}</span>
      <span class="main"><b>${esc(name)}</b><small>${esc(meta)}</small></span>
      <span class="trail"><b>${m(r.pv)}</b><small>revient ${m(r.costP)}</small></span>
    </button>
    <div class="item-actions">
      <button class="btn small" data-dup="${esc(q.no)}">Dupliquer</button>
      <button class="btn small danger" data-del="${esc(q.no)}">Supprimer</button>
    </div></div>`;
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
  const ap=appearance();
  app.innerHTML=`
  <section class="card"><h2>Apparence</h2>
    <div class="segments" role="group" aria-label="Apparence">
      ${[['system','Système'],['light','Clair'],['dark','Sombre']].map(([v,l])=>`<button type="button" class="seg" data-appearance="${v}" aria-pressed="${ap===v}">${l}</button>`).join('')}
    </div>
    <p class="hint" style="margin-top:8px">« Système » suit le mode clair ou sombre de l’appareil.</p>
  </section>
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
  if(ds.step){S.draft.qty=Math.max(1,(Number(S.draft.qty)||1)+Number(ds.step));persist();renderResult();return}
  if(ds.marge){S.draft.marge=Number(ds.marge);syncMarge();const mi=app.querySelector('[data-k="marge"]');if(mi)mi.value=Math.round(S.draft.marge*100);persist();renderResult();return}
  if(ds.appearance){setAppearance(ds.appearance);viewReglages();return}
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
  if(el.dataset.k==='name'){S.draft.name=el.value;applyKnownName();return}
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
S.draft.marge=S.draft.marge??0.5;

/* Téléphone : la barre d’onglets se compacte quand on descend, revient quand on remonte. */
let lastY=window.scrollY;
window.addEventListener('scroll',()=>{
  const y=window.scrollY, side=$('side');
  if(y>lastY+8&&y>80)side.classList.add('compact');
  else if(y<lastY-8||y<40)side.classList.remove('compact');
  lastY=y;
  requestAnimationFrame(placeIndicator);
},{passive:true});
/* Quitter un champ le marque comme « touché » : son erreur éventuelle s’affiche. */
app.addEventListener('focusout',e=>{
  const k=e.target.dataset?.k;
  // Mise à jour des indications seulement : reconstruire les boutons ici ferait perdre le clic en cours.
  if(k&&!touched.has(k)&&tab==='devis'){touched.add(k);const R=compute(S.draft);updateHints(S.draft,R,checksFor(S.draft,R))}
});
/* Clavier : le champ actif reste visible au-dessus du clavier. */
app.addEventListener('focusin',e=>{
  if(e.target.matches('.inp')&&window.innerWidth<861)setTimeout(()=>e.target.scrollIntoView({block:'center',behavior:reduce?'auto':'smooth'}),280);
});

syncTheme();
render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
