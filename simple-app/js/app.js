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
let tab="devis", hSearch="", lastSig=null;
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
  setEnterKeys();
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
      <div class="field wide"><span>Dimensions (cm)</span>
        <div class="dims3" role="group" aria-label="Dimensions en centimètres">
          ${['Longueur','Largeur','Hauteur'].map((lab,i)=>`<label class="dim"><input class="inp" data-dim="${i}" type="text" inputmode="decimal" enterkeyhint="${i<2?'next':'done'}" placeholder="${"LlH"[i]}" aria-label="${lab} en cm" value="${esc(dimsOf(d)[i]||'')}"></label>`).join('')}
        </div>
        <span class="hint" id="hint-dims"></span></div>
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
  const dc=by('dims'), dimBad=!!dc&&dc.state==='bad'&&show('dims');
  document.querySelectorAll('[data-dim]').forEach(el=>{el.classList.toggle('is-bad',dimBad);el.setAttribute('aria-invalid',String(dimBad))});
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
  const actions=`<div class="result-actions">
    <button class="btn primary wide" id="save" aria-describedby="saveWhy" ${canSave?'':'aria-disabled=true'}>Enregistrer dans l’historique</button>
    <button class="btn" id="compare" ${R.comp.length?'':'disabled'}>Comparer (${R.comp.length})</button>
    <button class="btn" id="new">Nouveau produit</button>
    ${manual?'<button class="link wide" id="back-best">Revenir au meilleur prix</button>':''}
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
/* Feuille « Comparer les offres » (lecture) ou éditeur de tarif (saisie). */
function openSheet(){sheet.hidden=false}
function closeSheet(){
  sheet.hidden=true;
  editorSubmit=null;
  sheetBody.classList.remove('editor-body');
  sheetBody.innerHTML='';
}
function showCompare(){
  const d=S.draft;
  $('sheetTitle').textContent='Comparer les offres';
  $('sheetHint').textContent='Triées par prix de revient. Choisir une offre la fixe pour ce produit.';
  sheetBody.classList.remove('editor-body');
  renderSheet(compute(d),d);
  editorSubmit=null;
  openSheet();
}

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

/* ---------- Tarifs : transitaires, leurs tarifs et leurs dates ---------- */
/* Parcours simplifié : un transitaire = nom + mode + tarif + délai + catégories. Le reste est facultatif. */
const MODE_DEFAULTS={Avion:[10,15],Maritime:[30,45],Express:[3,5]};
const MODES_LIST=['Avion','Maritime','Express'];
const DAY_OPTS=[['Aucun',''],...JOURS.map(j=>[j,j])];

/* Regroupe les tarifs et les dates par transitaire. */
function carriers(){
  const map=new Map();
  const get=k=>{if(!map.has(k))map.set(k,{tariffs:[],cal:[]});return map.get(k)};
  S.tarifs.forEach((x,i)=>get(x.tr||'Sans nom').tariffs.push({x,i}));
  S.cal.forEach((x,i)=>get(x.tr||'Sans nom').cal.push({x,i}));
  return map;
}
const tariffLabel=x=>`${x.mode}${x.svc?' · '+x.svc:''}`;

function viewTarifs(){
  const map=carriers();
  const names=[...new Set(S.tarifs.map(x=>x.tr).filter(Boolean))];
  app.innerHTML=`<datalist id="dl-tr">${names.map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
    <div class="toolbar"><button class="btn primary" data-new-carrier>+ Nouveau transitaire</button></div>
    ${[...map].map(([name,g])=>carrierCard(name,g)).join('')||'<p class="empty">Aucun transitaire. Touchez « Nouveau transitaire » : il suffit du nom, du mode, du tarif et du délai.</p>'}`;
}

function carrierCard(name,g){
  const tariffs=g.tariffs.map(({x,i})=>`<div class="line">
      <span><b>${esc(tariffLabel(x))}</b><small>${isNum(x.tarif)?esc(dec(x.tarif,2))+' '+esc(x.cur)+' / '+esc(x.unit):'Tarif manquant'} · ${esc(x.cats||'aucune catégorie')}${isNum(x.dmin)&&isNum(x.dmax)?' · '+x.dmin+' à '+x.dmax+' j':''}</small></span>
      <span class="actions"><button class="btn small" data-edit-t="${i}">Modifier</button><button class="btn small" data-dup-t="${i}">Dupliquer</button><button class="btn small danger" data-del-t="${i}" aria-label="Supprimer ce tarif">Supprimer</button></span></div>`).join('')
    ||'<p class="muted">Aucun tarif.</p>';
  const dates=[...g.cal].sort((a,b)=>String(a.x.date).localeCompare(String(b.x.date)))
    .map(({x,i})=>`<div class="line"><span><b>${esc(fd(dayNum(x.date)))}</b><small>${esc(x.mode)}${x.svc?' · '+esc(x.svc):''}${x.note?' · '+esc(x.note):''}</small></span>
      <span class="actions"><button class="btn small danger" data-del-c="${i}" aria-label="Supprimer la date du ${esc(x.date)}">Supprimer</button></span></div>`).join('');
  const opts=[...new Map(g.tariffs.map(({x})=>[x.mode+'|'+(x.svc||''),x])).values()];
  const quick=opts.length?`<form class="quick-date" data-quick-date="${esc(name)}">
      <input class="inp" type="date" name="date" required aria-label="Date de départ">
      <select class="inp" name="svc" aria-label="Mode et service">${opts.map(x=>`<option value="${esc(x.mode)}|${esc(x.svc||'')}">${esc(tariffLabel(x))}</option>`).join('')}</select>
      <button class="btn small primary" type="submit">Ajouter</button></form>`:'';
  return `<section class="card carrier" data-carrier="${esc(name)}">
    <header class="carrier-head"><div><h2>${esc(name)}</h2><small class="muted">${g.tariffs.length} tarif(s) · ${g.cal.length} date(s)</small></div>
      <div class="actions tight"><button class="btn small" data-add-tariff="${esc(name)}">+ Tarif</button><button class="btn small danger" data-del-carrier="${esc(name)}" aria-label="Supprimer le transitaire ${esc(name)}">Supprimer</button></div></header>
    <div class="subhead">Tarifs</div>${tariffs}
    <div class="subhead">Dates de départ</div>
    ${dates||'<p class="muted">Aucune date. Si ce transitaire part à jour fixe, indiquez son jour dans le tarif ; sinon ajoutez les dates ici.</p>'}
    ${quick}
  </section>`;
}

/* ----- Éditeur de tarif (feuille) ----- */
function chipGroup(name,options,current,multi=false){
  const cur=multi?current:[current];
  const value=multi?current.join(';'):(current??'');
  return `<div class="chips-field" ${multi?'data-multi':''}><input type="hidden" name="${name}" value="${esc(value)}">
    ${options.map(([label,v])=>`<button type="button" class="seg" data-chip="${name}" data-value="${esc(v)}" aria-pressed="${cur.includes(v)}">${esc(label)}</button>`).join('')}</div>`;
}
function editorHtml(t,{isNew,carrier}){
  const c=t||{};
  const mode=c.mode||'Avion';
  const def=MODE_DEFAULTS[mode]||[7,14];
  const selCats=catList(c.cats||'');
  const cats=S.params.cats.map(x=>[x,x]);
  return `<form id="editorForm" class="editor" data-new="${isNew?1:0}">
    <label class="field"><span>Nom du transitaire</span><input class="inp" name="tr" list="dl-tr" required autocomplete="off" placeholder="Ex. E-SOA" value="${esc(c.tr||carrier||'')}"></label>
    <div class="field"><span>Mode de transport</span>${chipGroup('mode',MODES_LIST.map(m=>[m,m]),mode)}</div>
    <label class="field svc-field"><span>Service <small class="muted">facultatif</small></span><input class="inp" name="svc" placeholder="Ex. Standard, Express" value="${esc(c.svc||'')}"></label>
    <div class="grid">
      <label class="field"><span>Tarif</span><input class="inp" name="tarif" type="number" step="any" inputmode="decimal" required value="${val(c.tarif)}"></label>
      <div class="field"><span>Unité</span>${chipGroup('unit',[['kg','kg'],['Pièce','pièce'],['m³','m³']],c.unit||'kg')}</div>
    </div>
    <div class="field"><span>Devise</span>${chipGroup('cur',[['Ar','Ar'],['USD','USD']],c.cur||'Ar')}</div>
    <div class="field"><span>Catégories acceptées</span>${chipGroup('cats',cats,selCats.length?selCats:[],true)}
      <button type="button" class="link" data-all-cats>Tout sélectionner</button></div>
    <div class="grid">
      <label class="field"><span>Délai de transit min (jours)</span><input class="inp" name="dmin" type="number" inputmode="numeric" value="${val(c.dmin??def[0])}"></label>
      <label class="field"><span>Délai de transit max (jours)</span><input class="inp" name="dmax" type="number" inputmode="numeric" value="${val(c.dmax??def[1])}"></label>
    </div>
    <details class="adv"><summary>Départ à jour fixe, heure limite, note</summary>
      <div class="grid">
        <div class="field wide"><span>Jour de départ habituel</span>${chipGroup('d1',DAY_OPTS,c.d1||'')}</div>
        <label class="field"><span>Clôture (jours avant le départ)</span><input class="inp" name="c1" type="number" inputmode="numeric" value="${val(c.c1??1)}"></label>
        <label class="field"><span>Heure limite au dépôt (h)</span><input class="inp" name="h" type="number" min="0" max="23" inputmode="numeric" value="${val(c.h??12)}"></label>
        <label class="field wide"><span>Note</span><input class="inp" name="note" value="${esc(c.note||'')}"></label>
      </div>
    </details>
    <p class="form-error" id="editorErr" role="alert"></p>
    <div class="actions"><button class="btn primary block" type="submit">${isNew?'Ajouter ce tarif':'Enregistrer'}</button></div>
  </form>`;
}

/* Lit le formulaire et renvoie { tariff, errors }. */
function readEditor(form,old){
  const g=n=>form.querySelector(`[name="${n}"]`)?.value??'';
  const num=n=>{const v=String(g(n)).trim().replace(',','.');return v===''?null:Number(v)};
  const mode=g('mode')||'Avion';
  const t={...(old||{palier:null,tarif2:null,base:null,min:null,d2:null,c2:null}),
    tr:g('tr').trim(), mode, svc:mode==='Maritime'?'':g('svc').trim(), cats:g('cats'),
    tarif:num('tarif'), unit:g('unit')||'kg', cur:g('cur')||'Ar',
    dmin:num('dmin'), dmax:num('dmax'), d1:g('d1')||null, c1:num('c1'), h:num('h'), note:g('note').trim()};
  if(t.d1&&t.c1==null)t.c1=1;
  if(t.h==null)t.h=12;
  const errors=[];
  if(!t.tr)errors.push('Donnez le nom du transitaire.');
  if(!(t.tarif>0))errors.push('Saisissez le tarif.');
  if(!catList(t.cats).length)errors.push('Choisissez au moins une catégorie.');
  if(t.dmin==null||t.dmax==null)errors.push('Indiquez le délai de transit minimum et maximum.');
  else if(t.dmax<t.dmin)errors.push('Le délai maximum doit être supérieur ou égal au minimum.');
  return {tariff:t,errors};
}

/* Ouvre l’éditeur dans la feuille. `done(form)` est appelé à l’envoi. */
let editorSubmit=null;
function openEditor(title,html,done,hint=''){
  $('sheetTitle').textContent=title;
  $('sheetHint').textContent=hint;
  sheetBody.innerHTML=html;
  sheetBody.classList.add('editor-body');
  editorSubmit=done;
  sheet.hidden=false;
  setEnterKeys();
  setTimeout(()=>sheetBody.querySelector('input:not([type=hidden])')?.focus(),260);
}
function applyModeToForm(form,{setDefaults}){
  const mode=form.querySelector('[name="mode"]').value;
  form.querySelector('.svc-field').hidden=mode==='Maritime';
  if(setDefaults){
    const d=MODE_DEFAULTS[mode]||[7,14];
    form.querySelector('[name="dmin"]').value=d[0];
    form.querySelector('[name="dmax"]').value=d[1];
  }
}

function openNewCarrier(){
  openEditor('Nouveau transitaire',editorHtml(null,{isNew:true}),form=>submitTariff(form,null),'Le transitaire et son tarif. Les dates de départ s’ajoutent ensuite dans sa fiche.');
}
function openAddTariff(carrier){
  openEditor('Nouveau tarif',editorHtml({tr:carrier},{isNew:true,carrier}),form=>submitTariff(form,null),`Tarif pour ${carrier}.`);
}
function openEditTariff(i){
  const x=S.tarifs[i];
  if(!x)return;
  openEditor('Modifier le tarif',editorHtml(x,{isNew:false}),form=>submitTariff(form,i),`${x.tr} · ${tariffLabel(x)}`);
}
function openDuplicateTariff(i){
  const x=S.tarifs[i];
  if(!x)return;
  openEditor('Dupliquer le tarif',editorHtml({...x,svc:'',mode:x.mode},{isNew:true}),form=>submitTariff(form,null),'Copie modifiable : changez le mode, le service ou le tarif.');
}
function submitTariff(form,index){
  const old=index!=null&&index>=0?S.tarifs[index]:null;
  const {tariff,errors}=readEditor(form,old);
  const err=form.querySelector('#editorErr');
  if(errors.length){err.textContent=errors.join(' ');return false}
  if(index!=null&&index>=0)S.tarifs[index]=tariff;else S.tarifs.push(tariff);
  persist();
  closeSheet();
  toast(index!=null&&index>=0?'Tarif modifié.':`Tarif ajouté pour ${tariff.tr}.`);
  viewTarifs();
  return true;
}
function delTariff(i){
  const t=S.tarifs[i];
  if(!t||!confirm(`Supprimer le tarif ${t.tr} · ${tariffLabel(t)} ?`))return;
  S.tarifs.splice(i,1);persist();viewTarifs();
}
function delCarrier(name){
  const tariffs=S.tarifs.filter(x=>(x.tr||'Sans nom')===name).length;
  const dates=S.cal.filter(x=>(x.tr||'Sans nom')===name).length;
  if(!confirm(`Supprimer « ${name} » ? Cela efface ${tariffs} tarif(s) et ${dates} date(s).`))return;
  S.tarifs=S.tarifs.filter(x=>(x.tr||'Sans nom')!==name);
  S.cal=S.cal.filter(x=>(x.tr||'Sans nom')!==name);
  persist();viewTarifs();toast(`« ${name} » supprimé.`);
}
/* Date de départ : saisie en une ligne, sous le transitaire. */
function addDate(carrier,date,mode,svc){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){toast('Choisissez une date.',{sticky:true});return}
  S.cal.push({tr:carrier,mode,svc:mode==='Maritime'?'':svc,date,note:''});
  persist();toast('Date ajoutée.');viewTarifs();
}
function delCal(i){
  const c=S.cal[i];
  if(!c||!confirm(`Supprimer la date du ${c.date} (${c.tr}) ?`))return;
  S.cal.splice(i,1);persist();viewTarifs();
}


/* Champs de formulaire pour les Réglages. */
const field=(name,label,value="",type="text",extra="")=>`<label class="field"><span>${label}</span><input class="inp" name="${name}" type="${type}" value="${esc(val(value))}" ${extra}></label>`;

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
  if(o){S.draft.mode='manuel';S.draft.offer=o.dataset.pick;persist();closeSheet();renderResult();return}
  const all=e.target.closest('[data-all-cats]');
  if(all){const f=all.closest('form');const inp=f.querySelector('[name="cats"]');inp.value=S.params.cats.join(';');f.querySelectorAll('[data-chip="cats"]').forEach(c=>c.setAttribute('aria-pressed','true'));return}
  const chip=e.target.closest('[data-chip]');
  if(chip){
    const group=chip.dataset.chip, wrap=chip.closest('.chips-field'), inp=wrap.querySelector(`input[name="${group}"]`);
    if(wrap.hasAttribute('data-multi')){
      const set=new Set(inp.value?inp.value.split(';'):[]);
      const v=chip.dataset.value;
      set.has(v)?set.delete(v):set.add(v);
      inp.value=[...set].join(';');
      chip.setAttribute('aria-pressed',String(set.has(v)));
    }else{
      inp.value=chip.dataset.value;
      wrap.querySelectorAll('[data-chip]').forEach(c=>c.setAttribute('aria-pressed',String(c===chip)));
      if(group==='mode')applyModeToForm(chip.closest('form'),{setDefaults:true});
    }
  }
});
/* Envoi de l’éditeur de tarif (feuille). */
sheet.addEventListener('submit',e=>{
  e.preventDefault();
  if(editorSubmit)editorSubmit(e.target);
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
  if(t.id==='compare'){showCompare();return}
  if(t.id==='new-carrier'||ds.newCarrier!==undefined){openNewCarrier();return}
  if(ds.addTariff!==undefined){openAddTariff(ds.addTariff);return}
  if(ds.editT!==undefined){openEditTariff(+ds.editT);return}
  if(ds.dupT!==undefined){openDuplicateTariff(+ds.dupT);return}
  if(ds.delCarrier!==undefined){delCarrier(ds.delCarrier);return}
  if(ds.open){openQuote(ds.open);return}
  if(ds.dup){dupQuote(ds.dup);return}
  if(ds.del){delQuote(ds.del);return}
  if(ds.delT!==undefined){delTariff(+ds.delT);return}
  if(ds.delC!==undefined){delCal(+ds.delC);return}
  if(t.id==='export'){exportData();return}
});
/* Dimensions : trois champs, reconstitués en « L x l x H » pour le moteur de calcul. */
function onDimField(){
  const parts=[...app.querySelectorAll('[data-dim]')].map(x=>x.value.trim().replace(',','.'));
  S.draft.dims=parts.every(x=>x==='')?'':parts.map(x=>x||'0').join(' x ');
  touched.add('dims');
  persist();
  renderResult();
}
app.addEventListener('input',e=>{
  const el=e.target;
  if(el.dataset.dim!==undefined){onDimField();return}
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
  if(f.dataset.quickDate!==undefined){
    // La valeur du service est « mode|service » (le service peut être vide).
    const [mode,...svc]=strOf(data,'svc').split('|');
    addDate(f.dataset.quickDate,strOf(data,'date'),mode,svc.join('|'));
  }
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
/* Champs de saisie visibles, dans l’ordre de l’écran. */
/* Un champ dans une section repliée n’est pas affiché : il ne doit pas recevoir le focus. */
const isShown=x=>{const d=x.closest('details');return x.getClientRects().length>0&&!(d&&!d.open)};
/* Dans la feuille ouverte (éditeur), l’ordre se lit dans la feuille ; sinon dans l’écran. */
const fieldsInOrder=()=>{const root=sheet.hidden?app:sheetBody;return [...root.querySelectorAll('input,select,textarea')].filter(x=>x.type!=='hidden'&&!x.disabled&&isShown(x))};
/* Touche « Suivant » du clavier : champ suivant partout ; « OK » sur le dernier, qui referme le clavier. */
function setEnterKeys(){
  const list=fieldsInOrder();
  list.forEach((el,i)=>{el.setAttribute('enterkeyhint',i<list.length-1?'next':'done')});
}
/* Une section repliée qui s’ouvre ajoute des champs : on recalcule la touche « Suivant ». */
app.addEventListener('toggle',setEnterKeys,true);
const onNextKey=e=>{
  if(e.key!=='Enter'||e.target.tagName!=='INPUT'||['file','checkbox','radio','button','submit'].includes(e.target.type))return;
  e.preventDefault();
  const list=fieldsInOrder(), i=list.indexOf(e.target);
  if(i<0)return;
  const next=list[i+1];
  if(next){next.focus();if(next.select&&next.type!=='date')next.select()}else e.target.blur();
};
app.addEventListener('keydown',onNextKey);
sheetBody.addEventListener('keydown',onNextKey);

/* Clavier à l’écran (téléphone) : la zone visible se réduit. On garde le champ actif visible,
   on masque la barre d’onglets pendant la saisie, et on laisse la fin de la page accessible. */
const vv=window.visualViewport;
function layoutForKeyboard(){
  if(!vv)return;
  const kb=Math.max(0,window.innerHeight-vv.height-vv.offsetTop);
  document.documentElement.style.setProperty('--kb',kb+'px');
  document.body.classList.toggle('kbd-open',kb>120&&window.innerWidth<861);
  const el=document.activeElement;
  if(kb>120&&el&&el.matches&&el.matches('input,select,textarea'))keepVisible(el);
}
/* Fait défiler pour que le champ soit au centre de la zone encore visible. */
function keepVisible(el){
  const top=vv.offsetTop+16, bottom=vv.offsetTop+vv.height-16;
  const r=el.getBoundingClientRect();
  if(r.top<top||r.bottom>bottom){
    const y=window.scrollY+r.top-(top+(bottom-top)/2)+r.height/2;
    window.scrollTo({top:Math.max(0,y),behavior:reduce?'auto':'smooth'});
  }
}
if(vv){vv.addEventListener('resize',layoutForKeyboard);vv.addEventListener('scroll',layoutForKeyboard)}
app.addEventListener('focusin',e=>{
  if(!e.target.matches('input,select,textarea'))return;
  // Le clavier met un peu de temps à monter : on recadre après son animation.
  setTimeout(()=>{if(vv&&document.activeElement===e.target)keepVisible(e.target)},320);
});
/* Quitter un champ le marque comme « touché » : son erreur éventuelle s’affiche. */
app.addEventListener('focusout',e=>{
  if(e.target.dataset?.dim!==undefined){if(!touched.has('dims')){touched.add('dims');renderResult()}return}
  const k=e.target.dataset?.k;
  // Mise à jour des indications seulement : reconstruire les boutons ici ferait perdre le clic en cours.
  if(k&&!touched.has(k)&&tab==='devis'){touched.add(k);const R=compute(S.draft);updateHints(S.draft,R,checksFor(S.draft,R))}
});

syncTheme();
render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
