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
    tc.content=eff==='dark'?HYGO_BRAND.bgDark:HYGO_BRAND.bgLight;
  }else if(tc)tc.remove();
}
systemDark.addEventListener?.('change',syncTheme);
/* Apparence : 'system', 'light' ou 'dark'. */
function appearance(){const t=document.documentElement.dataset.theme;return t==='dark'||t==='light'?t:'system'}
function setAppearance(v,onChange){
  const apply=()=>{
    if(v==='light'||v==='dark')document.documentElement.dataset.theme=v;
    else delete document.documentElement.dataset.theme;
    try{localStorage.setItem('hygo-theme',v)}catch(e){}
    syncTheme();
    onChange?.();
  };
  if(document.startViewTransition&&!reduce)document.startViewTransition(apply);
  else apply();
}
$('themeToggle').addEventListener('click',()=>{
  setAppearance(effectiveTheme()==='dark'?'light':'dark',()=>{if(tab==='reglages')viewReglages()});
});

/* ---------- navigation ---------- */
const PAGES={
  devis:['Devis','Chine → Madagascar · saisissez le produit, le reste se calcule.'],
  histo:['Historique','Vos devis enregistrés et le bilan du mois.'],
  tarifs:['Tarifs','Transitaires, tarifs et dates de départ.'],
  reglages:['Réglages','Apparence, taux de change et sauvegarde.']
};
const trail=[];  // onglets déjà ouverts : le bouton Retour revient au dernier
function go(t,back){
  if(!back&&t!==tab)trail.push(tab);
  const apply=()=>{tab=t;closeSheet();render()};
  if(document.startViewTransition&&!reduce)document.startViewTransition(apply);else apply();
  window.scrollTo(0,0);
}
function goBack(){
  const prev=trail.pop();
  if(prev)go(prev,true);
}
$('backBtn').addEventListener('click',goBack);
function render(){
  document.querySelectorAll('.nav [data-go]').forEach(b=>b.setAttribute('aria-current',b.dataset.go===tab?'page':'false'));
  $('backBtn').hidden=!trail.length;
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
  // Poids : la limite du transitaire choisi si elle est connue, sinon le seuil des Réglages.
  const maxWt=wtLimit(R.sel?.t);
  const wtState=!(d.wt>0)?'bad':d.wt>(maxWt??wtWarnOf())?'warn':'ok';
  out.push({key:'wt',label:'Poids',state:wtState,txt:wtState==='bad'?'à saisir':wtState==='warn'?(maxWt!=null?`max ${dec(maxWt,1)} kg chez ${R.sel.t.tr}`:'élevé, vérifiez'):''});
  out.push({key:'offer',label:'Transport',state:R.sel?'ok':'bad',txt:R.sel?'':'aucune offre'});
  if(d.pvRetenu!=null&&isNum(R.costP))out.push({key:'pv',label:'Prix imposé',state:d.pvRetenu<R.costP?'bad':'ok',txt:d.pvRetenu<R.costP?'sous le revient':''});
  const margeState=(d.marge??0)<0?'bad':(d.marge??0)<margeMinOf()?'warn':'ok';
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
    <ul class="chk-notes" id="chkNotes"></ul>
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
  const maxWt=wtLimit(R.sel?.t);
  set('hint-wt','wt','','Produit emballé, en kg.','Saisissez le poids d’un produit emballé.',maxWt!=null?`Au-delà de la limite de ${R.sel.t.tr} (${dec(maxWt,1)} kg par pièce) : choisissez une autre offre.`:'Poids élevé : vérifiez que le transitaire l’accepte.');
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
  const pills=chk?[...chk.querySelectorAll('.chk')]:[];
  if(chk&&pills.length===checks.length)checks.forEach((c,i)=>{const el=pills[i];el.className=`chk ${c.state==='ok'?'':c.state}`;el.firstElementChild.textContent=c.state==='ok'?'✓':c.state==='warn'?'!':'✕';el.lastChild.textContent=c.label});
  else if(chk)chk.innerHTML=checks.map(c=>`<span class="chk ${c.state==='ok'?'':c.state}"><b>${c.state==='ok'?'✓':c.state==='warn'?'!':'✕'}</b>${esc(c.label)}</span>`).join('');
  // Raison de chaque point à corriger, en clair. Un tap amène au champ concerné (le survol n’existe pas sur téléphone).
  const notes=$('chkNotes');
  if(notes)notes.innerHTML=checks.filter(c=>c.state!=='ok'&&c.txt).map(c=>`<li><button type="button" class="chk-note ${c.state}" data-focus="${c.key}">${esc(c.label)} : ${esc(c.txt)}</button></li>`).join('');
  updateHints(d,R,checks);
  const row=(lab,value,sub='')=>`<div class="row"><span>${lab}</span><span class="val">${value}${sub?`<small>${sub}</small>`:''}</span></div>`;
  const num=(key,v)=>isNum(v)?` data-num="${v}" data-key="${key}"`:'';
  let body;
  if(!s){
    // La correction se fait ici même : seules les catégories prises par au moins un transitaire sont proposées.
    const accepted=[...new Set(S.tarifs.flatMap(t=>catList(t.cats)))].filter(c=>c!==d.cat).sort((a,b)=>a.localeCompare(b,'fr'));
    const fix=!manual&&accepted.length?`<label class="field fix-cat"><span>Choisir une catégorie acceptée</span>
      <select class="inp" data-fixcat><option value="" selected disabled>Catégorie…</option>${accepted.map(c=>`<option>${esc(c)}</option>`).join('')}</select></label>`:'';
    body=`<p class="warn-box"><span aria-hidden="true">⚠︎</span><span>${manual?'L’offre choisie n’est pas compatible avec ce produit. Revenez au meilleur prix.':accepted.length?`Aucun transitaire ne prend la catégorie « ${esc(d.cat)} ».`:`Aucun transitaire ne prend la catégorie « ${esc(d.cat)} ». Ajoutez-la à un tarif dans Tarifs.`}</span></p>${fix}`;
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
  // Devis déjà confirmé (il se modifie depuis la version bureau), ou rien de changé depuis le dernier enregistrement : rien à enregistrer.
  const confirmed=isConfirmed(d);
  const unchanged=!confirmed&&canSave&&savedUnchanged(d,R);
  const why=confirmed?'Ce produit est déjà confirmé : modifiez-le depuis la version bureau.':unchanged?'Aucune modification depuis le dernier enregistrement.':canSave?'':`${showAll?'À corriger':'Il reste à compléter'} : ${blocking.map(c=>c.label.toLowerCase()).join(', ')}.`;
  const actions=`<div class="result-actions">
    <button class="btn primary wide" id="save" aria-describedby="saveWhy" ${confirmed||unchanged?'disabled':canSave?'':'aria-disabled=true'}>Enregistrer dans l’historique</button>
    <button class="btn" id="share" ${s&&canSave?'':'disabled'}>Partager au client</button>
    <button class="btn" id="compare" ${R.comp.length?'':'disabled'}>Comparer (${R.comp.length})</button>
    <button class="btn wide" id="new">Nouveau produit</button>
    ${manual?'<button class="link wide" id="back-best">Revenir au meilleur prix</button>':''}
  </div><p class="hint${showAll&&!canSave&&!confirmed?' bad':''}" id="saveWhy" style="margin-top:10px">${esc(why)}</p>`;
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
        <small>${isNum(o.I)?'Arrivée '+fd(Math.floor(o.I)):'Date non connue'}${wtLimit(o.t)!=null&&d.wt>wtLimit(o.t)?` · ⚠︎ poids max ${esc(dec(wtLimit(o.t),1))} kg dépassé`:''}${o.calendarNotice?' · '+esc(o.calendarNotice):''}</small>
      </span>
      <span class="price">${m(o.J)}<small>vente ${isNum(o.J)?ar(Math.ceil(o.J*(1+(d.marge??0))/100)*100):'—'}</small></span></button>`;
  }).join('')||'<p class="empty">Aucune offre compatible.</p>';
}
/* Feuille « Comparer les offres » (lecture) ou éditeur de tarif (saisie). */
/* Durée lue dans les tokens CSS (ex. --t : 220ms) : la feuille ne se cache qu’une fois son animation finie. */
const cssMs=name=>{const v=getComputedStyle(document.documentElement).getPropertyValue(name).trim();return v.endsWith('ms')?parseFloat(v):parseFloat(v)*1000};
let closeTimer=0;
function openSheet(){
  clearTimeout(closeTimer);
  sheet.classList.remove('closing');
  sheet.hidden=false;
}
function closeSheet(){
  editorSubmit=null;
  if(sheet.hidden||sheet.classList.contains('closing'))return;
  sheet.classList.add('closing');
  closeTimer=setTimeout(()=>{
    sheet.hidden=true;
    sheet.classList.remove('closing');
    sheetBody.classList.remove('editor-body');
    sheetBody.innerHTML='';
  },reduce?0:cssMs('--t'));
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

/* Ce qui est enregistré pour le brouillon courant (même forme que dans l’historique). */
function draftRecord(d,R){
  const {status,destination,repris,...inputFields}=copyData(d);
  return copyData({inputs:{...inputFields,mode:'manuel',offer:R.sel.label},res:snapshot(d,R),offer:R.sel.label});
}
/* Comparaison insensible à l’ordre des clés : le serveur (jsonb) ne les garde pas dans le même ordre. */
function sameData(a,b){
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
  const keys=Object.keys(a);
  return keys.length===Object.keys(b).length&&keys.every(k=>sameData(a[k],b[k]));
}
/* Vrai si le produit est déjà enregistré en brouillon avec exactement les mêmes données. */
function isConfirmed(d){
  const existing=S.quotes.find(q=>q.no===d.no);
  return!!existing&&!!existing.status&&existing.status!==STATUS.DRAFT;
}
function savedUnchanged(d,R){
  const existing=S.quotes.find(q=>q.no===d.no);
  if(!existing||isConfirmed(d))return false;
  const {inputs,res,offer}=draftRecord(d,R);
  return sameData({inputs,res,offer},{inputs:existing.inputs,res:existing.res,offer:existing.offer});
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
  const {inputs,res,offer}=draftRecord(d,R);
  const base=existing??normalizeQuoteWorkflow({no:d.no,created:now,status:STATUS.DRAFT,statusHistory:[{from:null,to:STATUS.DRAFT,at:now,comment:'Création'}]});
  const rec={...base,modified:now,inputs,res,offer,destination:''};
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
}

/* ---------- Historique ---------- */
/* Le mois en cours, en un coup d’œil : nombre de devis, valeur, marge moyenne et transitaire le plus utilisé. */
function statsHtml(){
  if(!S.quotes.length)return '';
  const month=iso=>String(iso||'').slice(0,7);
  const now=new Date(), cur=now.toISOString().slice(0,7);
  const prev=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-1,1)).toISOString().slice(0,7);
  const when=q=>month(q.created||q.modified);
  const list=S.quotes.filter(q=>when(q)===cur);
  const before=S.quotes.filter(q=>when(q)===prev).length;
  const rates=list.map(q=>q.res).filter(r=>r&&isNum(r.margeP)&&r.costP>0).map(r=>r.margeP/r.costP);
  const value=list.reduce((a,q)=>a+(isNum(q.res?.revenueLot)?q.res.revenueLot:0),0);
  const byTr=new Map();list.forEach(q=>{const t=q.res?.tr;if(t)byTr.set(t,(byTr.get(t)||0)+1)});
  const top=[...byTr].sort((a,b)=>b[1]-a[1])[0];
  const tile=(label,value,ctx)=>`<div class="stat"><span class="stat-label">${label}</span><b class="stat-value">${value}</b><small>${ctx}</small></div>`;
  const monthName=now.toLocaleDateString('fr-FR',{month:'long'});
  return `<section class="card"><h2>Ce mois-ci <small class="muted">${esc(monthName)}</small></h2>
    <div class="stats">
      ${tile('Devis',list.length,before?`${before} le mois dernier`:'aucun le mois dernier')}
      ${tile('Valeur des devis',list.length?m(value):'—','prix de vente × quantité')}
      ${tile('Marge moyenne',rates.length?pct(rates.reduce((a,x)=>a+x,0)/rates.length):'—',rates.length?`sur ${rates.length} devis`:'pas encore de devis')}
      ${tile('Transitaire le plus utilisé',top?esc(top[0]):'—',top?`${top[1]} devis sur ${list.length}`:'pas encore de devis')}
    </div></section>`;
}
function viewHisto(){
  app.innerHTML=`${statsHtml()}<section class="card"><h2>Produits enregistrés</h2>
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
    <button class="item-more" data-more="${esc(q.no)}" aria-label="Actions pour ${esc(name)}"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>
    </div>`;
}
/* Actions d’un produit enregistré : dans la feuille, plutôt que deux boutons sur chaque ligne. */
function openQuoteActions(no){
  const q=S.quotes.find(x=>x.no===no);
  if(!q)return;
  $('sheetTitle').textContent=q.inputs?.name||'Sans nom';
  $('sheetHint').textContent=[q.no,q.status&&q.status!==STATUS.DRAFT?q.status:'',m(q.res?.pv)].filter(Boolean).join(' · ');
  sheetBody.classList.remove('editor-body');
  sheetBody.innerHTML=`<div class="action-list">
    <button class="action" data-act="open" data-no="${esc(no)}">Ouvrir</button>
    <button class="action" data-act="share" data-no="${esc(no)}" ${isNum(q.res?.pv)?'':'disabled'}>Partager au client</button>
    <button class="action" data-act="dup" data-no="${esc(no)}">Dupliquer</button>
    <button class="action danger" data-act="del" data-no="${esc(no)}">Supprimer</button></div>`;
  editorSubmit=null;
  openSheet();
}

/* ---------- Partage au client ---------- */
/* Texte simple, lisible dans WhatsApp ou un SMS : ni prix de revient, ni marge, ni nom du transitaire. */
const longDate=n=>isNum(n)?new Date(Math.floor(n+1e-9)*864e5).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}):'';
const transportOf=label=>/maritime/i.test(label)?'Maritime':/avion/i.test(label)?'Avion':'';
function shareText({no,name,qty,pv,total,mode,arrival}){
  return [
    `Devis ${no}`,
    name,
    '',
    `Prix : ${ar(pv)} par pièce`,
    qty>1?`Quantité : ${qty} · Total : ${ar(total)}`:null,
    mode?`Transport : ${mode==='Maritime'?'bateau':'avion'} depuis la Chine`:null,
    isNum(arrival)?`Arrivée estimée : ${longDate(arrival)}`:null,
    '',
    'Prix valable à ce jour, sous réserve du taux de change.'
  ].filter(l=>l!==null).join('\n');
}
/* « Partager au client » : le client reçoit un PDF (document propre) ou le texte (message rapide). */
let pendingShare=null;
function shareQuote(info){
  pendingShare=info;
  $('sheetTitle').textContent='Partager au client';
  $('sheetHint').textContent=`${info.name} · ${ar(info.pv)} par pièce`;
  sheetBody.classList.remove('editor-body');
  sheetBody.innerHTML=`<div class="action-list">
    <button class="action" data-share="pdf">Envoyer en PDF<small>Document A4, à joindre dans WhatsApp ou un email</small></button>
    <button class="action" data-share="text">Envoyer en texte<small>Message court, à coller dans WhatsApp ou un SMS</small></button></div>`;
  editorSubmit=null;
  openSheet();
}
/* Contenu détaillé du PDF : uniquement ce qui concerne le client (ni prix de revient, ni marge, ni transitaire). */
const QUOTE_VALID_DAYS=7;
const fullDate=n=>isNum(n)?new Date(Math.floor(n+1e-9)*864e5).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}):'';
const weightTxt=kg=>kg<1?`${dec(kg*1000,0)} g`:`${dec(kg,2)} kg`;
function pdfInfo(info){
  const i=info.inputs||{}, qty=Math.max(1,Number(info.qty)||1);
  const dm=dimsOf(i), hasDims=dm.every(x=>x>0), wt=Number(i.wt)||0;
  const today=Math.floor(Date.now()/864e5);
  const plane=info.mode!=='Maritime';
  const colis=[
    hasDims&&['Dimensions par pièce',`${dm.map(x=>dec(x,1)).join(' × ')} cm`],
    wt>0&&['Poids par pièce',weightTxt(wt)+' (emballé)'],
    wt>0&&qty>1&&['Poids total',weightTxt(wt*qty)],
    hasDims&&['Volume total',(v=>`${dec(v,v<0.01?4:3)} m³`)(dm[0]*dm[1]*dm[2]*qty/1e6)]
  ].filter(Boolean);
  const days=isNum(info.arrival)?Math.max(0,Math.round(info.arrival-today)):null;
  const livraison=[
    info.mode&&['Transport',plane?'Aérien (avion)':'Maritime (bateau)'],
    isNum(info.depart)&&['Départ de Chine',fullDate(info.depart)],
    isNum(info.arrival)&&['Arrivée estimée',fullDate(info.arrival)],
    days!=null&&['Délai estimé',`environ ${days} jour${days>1?'s':''}`]
  ].filter(Boolean);
  // Ce que couvre le prix, d’après les frais réellement saisis dans le devis.
  const included=['L’achat du produit auprès du fournisseur en Chine',
    Number(i.trans)>0&&'Les frais de paiement vers la Chine',
    Number(i.livCh)>0&&'La livraison du fournisseur jusqu’au dépôt en Chine',
    `Le transport ${plane?'aérien':'maritime'} de la Chine jusqu’à Madagascar`,
    Number(i.exclus)>0&&'Les frais spécifiques à ce produit',
    Number(i.livFin)>0&&'La livraison finale à Madagascar'].filter(Boolean);
  const excluded=Number(i.livFin)>0?[]:['La livraison finale jusqu’à votre adresse à Madagascar'];
  const valid=new Date(Date.now()+QUOTE_VALID_DAYS*864e5).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
  const totalValue=isNum(info.total)?info.total:info.pv*qty;
  const acc=window.hygoAccount||{};
  return {
    transport:info.mode?(plane?'Avion':'Bateau'):'', totalValue, issuer:{name:acc.name||'',email:acc.email||''},
    no:info.no, date:new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}), validUntil:valid,
    route:'Chine – Madagascar', name:info.name,
    details:[i.cat&&i.cat!=='Général'?'Catégorie : '+i.cat:'',hasDims?`${dm.map(x=>dec(x,1)).join(' × ')} cm`:'',wt>0?weightTxt(wt)+' par pièce':''].filter(Boolean).join(' · '),
    qty, unitPrice:ar(info.pv), total:ar(totalValue),
    colis, livraison, included, excluded,
    conditions:[`Prix valable jusqu’au ${valid}, sous réserve de l’évolution du taux de change.`,
      'Les dates de départ et d’arrivée sont des estimations : elles dépendent des départs du transporteur et des formalités à l’arrivée.',
      'Prix exprimés en ariary (Ar).']
  };
}
async function sharePdf(info){
  const blob=devisPdf(pdfInfo(info));
  const name=`Devis ${info.no} - ${String(info.name).replace(/[\\/:*?"<>|]+/g,' ').slice(0,40).trim()}.pdf`;
  const file=new File([blob],name,{type:'application/pdf'});
  try{
    if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:`Devis ${info.no}`});return}
  }catch(e){if(e.name==='AbortError')return}
  // Pas de partage de fichier (ordinateur) : le PDF est téléchargé.
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('PDF téléchargé.');
}
async function shareTextOnly(info){
  const text=shareText(info);
  try{
    if(navigator.share){await navigator.share({title:`Devis ${info.no}`,text});return}
  }catch(e){if(e.name==='AbortError')return}
  try{await navigator.clipboard.writeText(text);toast('Devis copié : collez-le dans WhatsApp ou un message.')}
  catch(e){prompt('Copiez ce texte :',text)}
}
function shareDraft(){
  const d=S.draft, R=compute(d), s=R.sel;
  if(!s||!isNum(R.pv))return;
  shareQuote({no:d.no,name:d.name||'Produit',qty:R.qty,pv:R.pv,total:R.revenueLot,mode:s.t.mode,arrival:s.I,depart:s.F,inputs:d});
}
function shareSaved(no){
  const q=S.quotes.find(x=>x.no===no);
  if(!q)return;
  const r=q.res||{};
  shareQuote({no:q.no,name:q.inputs?.name||'Produit',qty:r.qty||q.inputs?.qty||1,pv:r.pv,total:r.revenueLot,mode:transportOf(q.offer||q.inputs?.offer||r.svc),arrival:r.dateClient,depart:r.depart,inputs:q.inputs||{}});
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
/* Suppression immédiate, avec « Annuler » pendant quelques secondes. */
function delQuote(no){
  const i=S.quotes.findIndex(x=>x.no===no);
  if(i<0)return;
  const q=S.quotes[i];
  S.quotes=S.quotes.filter(x=>x.no!==no);
  persist();
  if(tab==='histo')viewHisto();
  toast(`« ${q.inputs?.name||q.no} » supprimé.`,{action:{label:'Annuler',run:()=>{
    if(S.quotes.some(x=>x.no===no))return;
    const quotes=[...S.quotes];quotes.splice(Math.min(i,quotes.length),0,q);S.quotes=quotes;
    persist();
    if(tab==='histo')viewHisto();
  }}});
}

/* ---------- Tarifs : transitaires, leurs tarifs et leurs dates ---------- */
/* Parcours simplifié : un transitaire = nom + mode + tarif + délai + catégories. Le reste est facultatif. */
const MODE_DEFAULTS={Avion:[10,15],Maritime:[30,45],Express:[3,5]};
const MODES_LIST=['Avion','Maritime'];
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
/* Poids maximum accepté par pièce pour un tarif (null : pas de limite indiquée). */
const wtLimit=t=>t&&isNum(t.maxWt)&&t.maxWt>0?t.maxWt:null;

function viewTarifs(){
  const map=carriers();
  const names=[...new Set(S.tarifs.map(x=>x.tr).filter(Boolean))];
  app.innerHTML=`<datalist id="dl-tr">${names.map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
    <div class="toolbar"><button class="btn primary" data-new-carrier>+ Nouveau transitaire</button></div>
    ${[...map].map(([name,g])=>carrierCard(name,g)).join('')||'<p class="empty">Aucun transitaire. Touchez « Nouveau transitaire » : il suffit du nom, du mode, du tarif et du délai.</p>'}`;
}

function carrierCard(name,g){
  const tariffs=g.tariffs.map(({x,i})=>`<div class="line">
      <span><b>${esc(tariffLabel(x))}</b><small>${isNum(x.tarif)?esc(dec(x.tarif,2))+' '+esc(x.cur)+' / '+esc(x.unit):'Tarif manquant'} · ${esc(x.cats||'aucune catégorie')}${isNum(x.dmin)&&isNum(x.dmax)?' · '+x.dmin+' à '+x.dmax+' j':''}${wtLimit(x)!=null?' · max '+esc(dec(x.maxWt,1))+' kg':''}</small></span>
      <span class="actions"><button class="btn small" data-edit-t="${i}">Modifier</button><button class="btn small" data-dup-t="${i}">Dupliquer</button><button class="btn small danger" data-del-t="${i}" aria-label="Supprimer ce tarif">Supprimer</button></span></div>`).join('')
    ||'<p class="muted">Aucun tarif.</p>';
  const dates=[...g.cal].sort((a,b)=>String(a.x.date).localeCompare(String(b.x.date)))
    .map(({x,i})=>`<div class="line"><span><b>${esc(fd(dayNum(x.date)))}</b><small>${esc(x.mode)}${x.svc?' · '+esc(x.svc):''}${x.note?' · '+esc(x.note):''}</small></span>
      <span class="actions"><button class="btn small" data-edit-c="${i}" aria-label="Modifier la date du ${esc(x.date)}">Modifier</button><button class="btn small" data-dup-c="${i}" aria-label="Dupliquer la date du ${esc(x.date)}">Dupliquer</button><button class="btn small danger" data-del-c="${i}" aria-label="Supprimer la date du ${esc(x.date)}">Supprimer</button></span></div>`).join('');
  const opts=[...new Map(g.tariffs.map(({x})=>[x.mode+'|'+(x.svc||''),x])).values()];
  const quick=opts.length?`<form class="quick-date" data-quick-date="${esc(name)}">
      <input class="inp" type="date" name="date" required aria-label="Date de départ">
      <select class="inp" name="svc" aria-label="Mode et service">${opts.map(x=>`<option value="${esc(x.mode)}|${esc(x.svc||'')}">${esc(tariffLabel(x))}</option>`).join('')}</select>
      <button class="btn small primary" type="submit">Ajouter</button></form>`:'';
  return `<section class="card carrier" data-carrier="${esc(name)}">
    <header class="carrier-head"><div><h2>${esc(name)}</h2><small class="muted">${g.tariffs.length} tarif(s) · ${g.cal.length} date(s)</small></div>
      <div class="actions tight"><button class="btn small" data-add-tariff="${esc(name)}">+ Tarif</button><button class="btn small danger" data-del-carrier="${esc(name)}" aria-label="Supprimer le transitaire ${esc(name)}">Supprimer</button></div></header>
    <details class="fold">
      <summary>Tarifs <small class="muted">${g.tariffs.length}</small></summary>
      ${tariffs}
    </details>
    <details class="fold">
      <summary>Dates de départ <small class="muted">${g.cal.length}</small></summary>
      ${dates||'<p class="muted">Aucune date. Si ce transitaire part à jour fixe, indiquez son jour dans le tarif ; sinon ajoutez les dates ici.</p>'}
      ${quick}
    </details>
  </section>`;
}

/* ----- Éditeur de tarif (feuille) ----- */
function chipGroup(name,options,current,multi=false){
  const cur=multi?current:[current];
  const value=multi?current.join(';'):(current??'');
  return `<div class="chips-field" ${multi?'data-multi':''}><input type="hidden" name="${name}" value="${esc(value)}">
    ${options.map(([label,v])=>`<button type="button" class="seg" data-chip="${name}" data-value="${esc(v)}" aria-pressed="${cur.includes(v)}">${esc(label)}</button>`).join('')}</div>`;
}
/* Services déjà utilisés pour l’avion (le maritime n’en a pas) : c’est la liste proposée à la saisie. */
function serviceOptions(current){
  const list=[...new Set(S.tarifs.filter(x=>x.mode==='Avion'&&x.svc).map(x=>x.svc.trim()))].sort((a,b)=>a.localeCompare(b,'fr'));
  if(current&&!list.some(s=>serviceKey(s)===serviceKey(current)))list.push(current);
  return list;
}
function editorHtml(t,{isNew,carrier}){
  const c=t||{};
  const mode=MODES_LIST.includes(c.mode)?c.mode:'Avion';
  const def=MODE_DEFAULTS[mode]||[7,14];
  const selCats=catList(c.cats||'');
  const cats=S.params.cats.map(x=>[x,x]);
  const svc=c.svc||'';
  return `<form id="editorForm" class="editor" data-new="${isNew?1:0}">
    <label class="field"><span>Nom du transitaire</span><input class="inp" name="tr" list="dl-tr" required autocomplete="off" placeholder="Ex. E-SOA" value="${esc(c.tr||carrier||'')}"></label>
    <div class="field"><span>Mode de transport</span>${chipGroup('mode',MODES_LIST.map(m=>[m,m]),mode)}</div>
    <label class="field svc-field"><span>Service</span>
      <select class="inp" name="svc" aria-label="Service">
        <option value="" ${svc?'':'selected'} disabled>Choisir un service</option>
        ${serviceOptions(svc).map(s=>`<option value="${esc(s)}" ${svc&&serviceKey(s)===serviceKey(svc)?'selected':''}>${esc(s)}</option>`).join('')}
        <option value="__new__">+ Nouveau service…</option>
      </select>
      <input class="inp" name="svcNew" placeholder="Ex. Standard, Express" autocomplete="off" hidden></label>
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
    <details class="adv"><summary>Départ à jour fixe, heure limite, poids max, note</summary>
      <div class="grid">
        <div class="field wide"><span>Jour de départ habituel</span>${chipGroup('d1',DAY_OPTS,c.d1||'')}</div>
        <label class="field"><span>Clôture (jours avant le départ)</span><input class="inp" name="c1" type="number" inputmode="numeric" value="${val(c.c1??1)}"></label>
        <label class="field"><span>Heure limite au dépôt (h)</span><input class="inp" name="h" type="number" min="0" max="23" inputmode="numeric" value="${val(c.h??12)}"></label>
        <label class="field wide"><span>Poids max accepté par pièce (kg)</span><input class="inp" name="maxWt" type="number" step="any" inputmode="decimal" placeholder="Aucune limite" value="${val(c.maxWt)}"></label>
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
  // Service choisi dans la liste, ou saisi (« + Nouveau service… ») ; un nom déjà connu garde son orthographe.
  const picked=g('svc')==='__new__'?g('svcNew').trim():g('svc').trim();
  const known=serviceOptions().find(s=>serviceKey(s)===serviceKey(picked));
  const svc=mode==='Maritime'?'':(known||picked);
  const t={...(old||{palier:null,tarif2:null,base:null,min:null,d2:null,c2:null}),
    tr:g('tr').trim(), mode, svc, cats:g('cats'),
    tarif:num('tarif'), unit:g('unit')||'kg', cur:g('cur')||'Ar',
    dmin:num('dmin'), dmax:num('dmax'), d1:g('d1')||null, c1:num('c1'), h:num('h'), maxWt:num('maxWt'), note:g('note').trim()};
  if(!(t.maxWt>0))t.maxWt=null;
  if(t.d1&&t.c1==null)t.c1=1;
  if(t.h==null)t.h=12;
  const errors=[];
  if(!t.tr)errors.push('Donnez le nom du transitaire.');
  if(mode!=='Maritime'&&!t.svc)errors.push('Choisissez un service ou ajoutez-en un nouveau.');
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
  openSheet();
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
/* Modifier ou dupliquer une date : même feuille, avec la liste des modes du transitaire. */
function modeOptions(carrier,current){
  const list=[...new Map(S.tarifs.filter(x=>(x.tr||'Sans nom')===carrier).map(x=>[x.mode+'|'+(x.svc||''),x])).values()]
    .map(x=>[x.mode+'|'+(x.svc||''),tariffLabel(x)]);
  if(current&&!list.some(([v])=>v===current)){const [m,...s]=current.split('|');list.unshift([current,tariffLabel({mode:m,svc:s.join('|')})])}
  return list.map(([v,l])=>`<option value="${esc(v)}"${v===current?' selected':''}>${esc(l)}</option>`).join('');
}
function dateEditorHtml(c,carrier,date){
  return `<form class="editor" novalidate>
    <div class="grid">
      <label class="field"><span>Date de départ</span><input class="inp" name="date" type="date" required value="${esc(date)}"></label>
      <label class="field"><span>Mode et service</span><select class="inp" name="svc">${modeOptions(carrier,(c.mode||'')+'|'+(c.svc||''))}</select></label>
      <label class="field wide"><span>Note</span><input class="inp" name="note" value="${esc(c.note||'')}"></label>
    </div>
    <p class="form-error" id="editorErr" role="alert"></p>
    <div class="actions"><button class="btn primary block" type="submit">Enregistrer</button></div>
  </form>`;
}
function openEditDate(i){
  const c=S.cal[i];
  if(!c)return;
  openEditor('Modifier la date',dateEditorHtml(c,c.tr,c.date),form=>submitDate(form,c.tr,i),`${c.tr||'Sans nom'}`);
}
function openDuplicateDate(i){
  const c=S.cal[i];
  if(!c)return;
  // Par défaut, la copie tombe une semaine plus tard (départs hebdomadaires) ; la date reste modifiable.
  const [y,m,d]=c.date.split('-').map(Number);
  const next=new Date(Date.UTC(y,m-1,d+7)).toISOString().slice(0,10);
  openEditor('Dupliquer la date',dateEditorHtml(c,c.tr,next),form=>submitDate(form,c.tr,null),'Copie à une semaine. Changez la date si besoin.');
}
function submitDate(form,carrier,index){
  const data=new FormData(form);
  const date=strOf(data,'date'), [mode,...svc]=strOf(data,'svc').split('|');
  const errors=[];
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))errors.push('Choisissez une date.');
  if(!mode)errors.push('Ajoutez d’abord un tarif pour ce transitaire.');
  const err=form.querySelector('#editorErr');
  if(errors.length){err.textContent=errors.join(' ');return false}
  const entry={tr:carrier,mode,svc:mode==='Maritime'?'':svc.join('|'),date,note:strOf(data,'note').trim()};
  if(index!=null)S.cal[index]={...S.cal[index],...entry};else S.cal.push(entry);
  persist();
  closeSheet();
  toast(index!=null?'Date modifiée.':'Date dupliquée.');
  viewTarifs();
  return true;
}


/* Champs de formulaire pour les Réglages. */
const field=(name,label,value="",type="text",extra="")=>`<label class="field"><span>${label}</span><input class="inp" name="${name}" type="${type}" value="${esc(val(value))}" ${extra}></label>`;

/* ---------- Réglages et sauvegarde ---------- */
/* Synchronisation : seul le libellé est mis à jour à chaque changement, pour ne pas effacer la saisie en cours. */
const SYNC_LABEL={synced:'✓ Données synchronisées',pending:'… Modifications en attente d’envoi',offline:'! Hors ligne : envoi au retour du réseau'};
window.addEventListener('hygo-sync',e=>{const el=$('syncState');if(el)el.textContent=SYNC_LABEL[e.detail]});
function viewReglages(){
  const p=S.params;
  const sel=(name,label,opts,cur)=>`<label class="field"><span>${label}</span><select class="inp" name="${name}">${opts.map(([v,l])=>`<option value="${v}" ${v===cur?'selected':''}>${l}</option>`).join('')}</select></label>`;
  const ap=appearance(), restore=readRestore();
  app.innerHTML=`
  <section class="card"><h2>Apparence</h2>
    <div class="segments" role="group" aria-label="Apparence">
      ${[['system','Système'],['light','Clair'],['dark','Sombre']].map(([v,l])=>`<button type="button" class="seg" data-appearance="${v}" aria-pressed="${ap===v}">${l}</button>`).join('')}
    </div>
    <p class="hint" style="margin-top:8px">« Système » suit le mode clair ou sombre de l’appareil.</p>
  </section>
  <section class="card"><h2>Synchronisation</h2>
    <p class="hint" id="syncState">${SYNC_LABEL[window.hygoSyncState?.()]||''}</p>
  </section>
  <form class="card" id="pform" novalidate><h2>Taux et paramètres</h2>
    <p class="hint" id="pformState" role="status" style="margin:-4px 0 12px">Chaque changement est enregistré automatiquement.</p>
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
      ${field('wtWarn','Alerte « poids élevé » au-delà de (kg par pièce)',wtWarnOf(),'number','step="any" inputmode="decimal"')}
      ${field('margeMin','Alerte « marge faible » en dessous de (%)',Math.round(margeMinOf()*1000)/10,'number','step="any" inputmode="decimal"')}
      ${catsField(p.cats)}
    </div>
    <p class="hint" style="margin-top:8px">Le poids maximum d’un transitaire, s’il est indiqué dans son tarif, remplace l’alerte générale.</p>
  </form>
  <section class="card"><h2>Sauvegarde</h2>
    <p class="muted">Vos données sont enregistrées sur votre compte et synchronisées dès que l’appareil est connecté à Internet. Une copie reste sur cet appareil pour travailler hors ligne. Exportez tout de même une sauvegarde régulièrement, et avant de changer de téléphone ou de désinstaller.</p>
    <div class="actions">
      <button class="btn" id="export">Exporter la sauvegarde (JSON)</button>
      <label class="btn">Importer une sauvegarde<input id="import" type="file" accept="application/json,.json" hidden></label>
    </div>
    ${restore?.state?`<p class="hint" style="margin-top:12px">Un import a remplacé vos données le ${esc(new Date(restore.at).toLocaleString('fr-FR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}))}.</p>
    <div class="actions"><button class="btn" id="restore">Restaurer les données d’avant l’import</button></div>`:''}
  </section>`;
}

/* Catégories : étiquettes retirables + une seule saisie pour en ajouter. La valeur réelle est dans un champ caché (séparé par « ; »). */
const catChip=c=>`<span class="cat-chip">${esc(c)}<button type="button" data-rm-cat="${esc(c)}" aria-label="Retirer ${esc(c)}">×</button></span>`;
function catsField(list){
  return `<div class="field wide" data-cats>
    <span>Catégories de produits</span>
    <div class="cat-chips" data-cat-list>${list.map(catChip).join('')||'<small class="muted">Aucune catégorie.</small>'}</div>
    <input type="hidden" name="cats" value="${esc(list.join(';'))}">
    <div class="cat-add"><input class="inp" id="newCat" autocomplete="off" enterkeyhint="done" placeholder="Ajouter une catégorie" aria-label="Ajouter une catégorie"><button type="button" class="btn small" data-add-cat>Ajouter</button></div>
  </div>`;
}
function catsOf(root){return [...root.querySelectorAll('[data-cat-list] [data-rm-cat]')].map(b=>b.dataset.rmCat)}
function setCats(root,list){
  root.querySelector('[name="cats"]').value=list.join(';');
  root.querySelector('[data-cat-list]').innerHTML=list.map(catChip).join('')||'<small class="muted">Aucune catégorie.</small>';
}
function addCat(){
  const inp=$('newCat');if(!inp)return;
  const v=inp.value.trim(), root=inp.closest('[data-cats]');
  if(!v){inp.focus();return}
  const list=catsOf(root);
  if(list.some(x=>x.toLowerCase()===v.toLowerCase())){toast('Cette catégorie existe déjà.',{sticky:true});inp.select();return}
  setCats(root,[...list,v]);
  inp.value='';inp.focus();
  autosaveParams();
}
/* Réglages : enregistrés à chaque changement, comme le devis. Une valeur impossible est signalée sur son champ et n’est pas enregistrée. */
function autosaveParams(){
  const f=$('pform');
  if(f)saveParams(new FormData(f));
}
function saveParams(data){
  const p={...S.params,usd:numOf(data,'usd'),cnyUsd:numOf(data,'cnyUsd'),marge:(numOf(data,'marge')??0)/100,div:numOf(data,'div'),
    dispo:numOf(data,'dispo'),mAvion:numOf(data,'mAvion'),mMar:numOf(data,'mMar'),dimanche:strOf(data,'dimanche'),
    calendarClosePolicy:strOf(data,'calendarClosePolicy'),cats:strOf(data,'cats').split(';').map(s=>s.trim()).filter(Boolean),
    wtWarn:numOf(data,'wtWarn'),margeMin:numOf(data,'margeMin')==null?null:numOf(data,'margeMin')/100};
  const bad=['usd','cnyUsd','div'].filter(k=>!(p[k]>0));
  app.querySelectorAll('#pform .inp[name]').forEach(el=>{el.classList.toggle('is-bad',bad.includes(el.name));el.setAttribute('aria-invalid',String(bad.includes(el.name)))});
  const state=$('pformState');
  if(bad.length){
    if(state){state.textContent='Non enregistré : taux et diviseur doivent être supérieurs à 0.';state.className='hint bad'}
    return;
  }
  S.params=p;persist();renderRates();
  if(state){state.textContent='✓ Enregistré';state.className='hint'}
}
const wtWarnOf=()=>isNum(S.params.wtWarn)&&S.params.wtWarn>0?S.params.wtWarn:30;
const margeMinOf=()=>isNum(S.params.margeMin)?S.params.margeMin:0.1;
function exportData(){
  const txt=JSON.stringify(S,null,1), name='hygo-'+dayStr(Math.floor(Date.now()/864e5))+'.json';
  const url=URL.createObjectURL(new Blob([txt],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('Sauvegarde téléchargée.');
}
/* Importer remplace tout : on demande d’abord, et l’état actuel est gardé sur l’appareil pour pouvoir revenir en arrière. */
const RESTORE_KEY='hygo-restore';
const counts=s=>`${(s.quotes||[]).length} produit(s), ${(s.tarifs||[]).length} tarif(s), ${(s.cal||[]).length} date(s)`;
function readRestore(){try{return JSON.parse(localStorage.getItem(RESTORE_KEY))}catch(e){return null}}
function importData(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    let j;
    try{
      j=JSON.parse(reader.result);
      if(!j||!j.params||!Array.isArray(j.tarifs))throw new Error('format');
    }catch(err){toast('Fichier invalide : ce n’est pas une sauvegarde Hygo ou Devis Transitaires.',{sticky:true});return}
    if(!confirm(`Remplacer toutes vos données ?\n\nActuellement : ${counts(S)}.\nDans le fichier : ${counts(j)}.\n\nCela s’applique aussi à vos autres appareils. L’état actuel reste gardé : vous pourrez le restaurer depuis Réglages.`))return;
    try{localStorage.setItem(RESTORE_KEY,JSON.stringify({at:nowIso(),state:S}))}
    catch(e){if(!confirm('Impossible de garder une copie de l’état actuel sur cet appareil. Importer quand même ?'))return}
    S=normAll(j);persist();toast('Sauvegarde importée.');go('devis');
  };
  reader.readAsText(file);
}
function restoreBeforeImport(){
  const r=readRestore();
  if(!r?.state)return;
  const when=new Date(r.at).toLocaleString('fr-FR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
  if(!confirm(`Revenir aux données d’avant l’import du ${when} (${counts(r.state)}) ? Les données actuelles seront remplacées.`))return;
  S=normAll(r.state);persist();
  try{localStorage.removeItem(RESTORE_KEY)}catch(e){}
  toast('Données d’avant l’import restaurées.');go('devis');
}

/* ---------- événements ---------- */
$('newProduct').addEventListener('click',()=>{newDraft();go('devis')});
document.querySelector('.side').addEventListener('click',e=>{
  const b=e.target.closest('[data-go]');if(b)go(b.dataset.go);
});
sheet.addEventListener('click',e=>{
  if(e.target.closest('[data-close]')){closeSheet();return}
  const sh=e.target.closest('[data-share]');
  if(sh){
    const info=pendingShare;
    closeSheet();
    if(info)(sh.dataset.share==='pdf'?sharePdf:shareTextOnly)(info);
    return;
  }
  const act=e.target.closest('[data-act]');
  if(act){
    const no=act.dataset.no;
    closeSheet();
    ({open:openQuote,share:shareSaved,dup:dupQuote,del:delQuote})[act.dataset.act](no);
    return;
  }
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
  if(ds.addCat!==undefined){addCat();return}
  if(ds.rmCat!==undefined){setCats(t.closest('[data-cats]'),catsOf(t.closest('[data-cats]')).filter(x=>x!==ds.rmCat));autosaveParams();return}
  if(ds.step){S.draft.qty=Math.max(1,(Number(S.draft.qty)||1)+Number(ds.step));persist();renderResult();return}
  if(ds.marge){S.draft.marge=Number(ds.marge);syncMarge();const mi=app.querySelector('[data-k="marge"]');if(mi)mi.value=Math.round(S.draft.marge*100);persist();renderResult();return}
  if(ds.appearance){setAppearance(ds.appearance,viewReglages);return}
  if(ds.focus!==undefined){focusCheck(ds.focus);return}
  if(t.id==='back-best'){S.draft.mode='prix';persist();renderResult();return}
  if(t.id==='save'){saveDraft();return}
  if(t.id==='new'){newDraft();viewDevis();return}
  if(t.id==='compare'){showCompare();return}
  if(t.id==='new-carrier'||ds.newCarrier!==undefined){openNewCarrier();return}
  if(ds.addTariff!==undefined){openAddTariff(ds.addTariff);return}
  if(ds.editT!==undefined){openEditTariff(+ds.editT);return}
  if(ds.dupT!==undefined){openDuplicateTariff(+ds.dupT);return}
  if(ds.delCarrier!==undefined){delCarrier(ds.delCarrier);return}
  if(t.id==='share'){shareDraft();return}
  if(ds.open){openQuote(ds.open);return}
  if(ds.more){openQuoteActions(ds.more);return}
  if(ds.delT!==undefined){delTariff(+ds.delT);return}
  if(ds.delC!==undefined){delCal(+ds.delC);return}
  if(ds.editC!==undefined){openEditDate(+ds.editC);return}
  if(ds.dupC!==undefined){openDuplicateDate(+ds.dupC);return}
  if(t.id==='export'){exportData();return}
  if(t.id==='restore'){restoreBeforeImport();return}
});
/* Amène le champ d’un point à corriger au centre de l’écran, en dépliant sa section si besoin. */
function focusCheck(key){
  const sel={dims:'[data-dim]',pv:'[data-k="pvRetenu"]'}[key]||`[data-k="${key}"]`;
  const el=app.querySelector(sel);
  if(!el)return;
  const fold=el.closest('details');
  if(fold)fold.open=true;
  el.focus();
  el.scrollIntoView({block:'center'});
}
/* Dimensions : trois champs, reconstitués en « L x l x H » pour le moteur de calcul. */
/* Le groupe L/l/H : on n’affiche pas son erreur tant que le focus reste dedans. */
const dimsGroup=()=>app.querySelector('.dims3');
function dimsFocused(){const g=dimsGroup();return!!g&&g.contains(document.activeElement)}
function onDimField(){
  const parts=[...app.querySelectorAll('[data-dim]')].map(x=>x.value.trim().replace(',','.'));
  S.draft.dims=parts.every(x=>x==='')?'':parts.map(x=>x||'0').join(' x ');
  persist();
  if(!dimsFocused())renderResult();
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
  if(el.dataset.fixcat!==undefined){
    S.draft.cat=el.value;S.draft.catManual=true;
    const sel=app.querySelector('[data-k="cat"]');if(sel)sel.value=el.value;
    persist();renderResult();return}
  if(el.id==='import'){importData(el.files[0]);el.value='';return}
  if(el.closest('#pform')&&el.id!=='newCat')autosaveParams();
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

/* Données fusionnées avec un autre appareil (js/auth.js) : on les reprend sans perdre la saisie en cours. */
window.hygoApplyState=state=>{
  const draft=S.draft;
  S=normAll(copyData(state));
  if(S.draft.no===draft.no)S.draft=draft;
  if(!sheet.hidden)return;  // feuille ouverte (éditeur) : l’écran sera à jour au prochain affichage
  const typing=app.contains(document.activeElement)&&document.activeElement.matches('input,select,textarea');
  if(typing){if(tab==='devis')renderResult()}else render();
  toast('Données mises à jour depuis un autre appareil.');
};

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
  if(e.key==='Enter'&&e.target.id==='newCat'){e.preventDefault();addCat();return}
  if(e.key!=='Enter'||e.target.tagName!=='INPUT'||['file','checkbox','radio','button','submit'].includes(e.target.type))return;
  e.preventDefault();
  const list=fieldsInOrder(), i=list.indexOf(e.target);
  if(i<0)return;
  const next=list[i+1];
  if(next){next.focus();if(next.select&&next.type!=='date')next.select()}else e.target.blur();
};
app.addEventListener('keydown',onNextKey);
sheetBody.addEventListener('keydown',onNextKey);
// « + Nouveau service… » affiche le champ de saisie ; les autres listes « service » (date) n’ont pas ce champ.
sheetBody.addEventListener('change',e=>{
  const input=e.target.form?.querySelector('[name="svcNew"]');
  if(e.target.name!=='svc'||!input)return;
  input.hidden=e.target.value!=='__new__';
  if(!input.hidden)input.focus();
});

/* Clavier à l’écran (téléphone) : la zone visible se réduit. On garde le champ actif visible,
   on masque la barre d’onglets pendant la saisie, et on laisse la fin de la page accessible. */
const vv=window.visualViewport;
function layoutForKeyboard(){
  if(!vv)return;
  const kb=Math.max(0,window.innerHeight-vv.height-vv.offsetTop);
  document.documentElement.style.setProperty('--kb',kb+'px');
  document.body.classList.toggle('kbd-open',kb>120&&window.innerWidth<861);
  // Pas de défilement ici : la zone visible change pendant la frappe, et recadrer à chaque fois fait bouger l’écran.
  // Le recadrage se fait une seule fois, à l’ouverture du champ (focusin).
}
/* Fait défiler pour que le champ soit au centre de la zone encore visible. */
function keepVisible(el){
  // 56 px : marge pour la barre d’état (en haut) et la barre d’outils du clavier iOS (en bas, non supprimable).
  const top=vv.offsetTop+56, bottom=vv.offsetTop+vv.height-56;
  const r=el.getBoundingClientRect();
  if(r.top<top||r.bottom>bottom){
    const y=window.scrollY+r.top-(top+(bottom-top)/2)+r.height/2;
    window.scrollTo({top:Math.max(0,y),behavior:reduce?'auto':'smooth'});
  }
}
if(vv){vv.addEventListener('resize',layoutForKeyboard);vv.addEventListener('scroll',layoutForKeyboard)}
app.addEventListener('focusin',e=>{
  const el=e.target;
  if(!el.matches('input,select,textarea'))return;
  // Champ numérique déjà rempli (ex. prix « 39 ») : on sélectionne tout, la première touche remplace la valeur.
  // iOS place le curseur au toucher, après le focus : d’où le petit délai.
  if(el.matches('input[inputmode="decimal"],input[inputmode="numeric"]')&&el.value)setTimeout(()=>el.select(),60);
  // Le clavier met un peu de temps à monter : on recadre après son animation.
  setTimeout(()=>{if(vv&&document.activeElement===el)keepVisible(el)},320);
});
/* Quitter un champ le marque comme « touché » : son erreur éventuelle s’affiche. */
app.addEventListener('focusout',e=>{
  // Passer d’un champ L/l/H à l’autre ne compte pas : l’erreur n’apparaît qu’en quittant le groupe.
  if(e.target.dataset?.dim!==undefined){
    if(e.relatedTarget&&e.target.closest('.dims3')?.contains(e.relatedTarget))return;
    touched.add('dims');renderResult();
    return}
  const k=e.target.dataset?.k;
  // Mise à jour des indications seulement : reconstruire les boutons ici ferait perdre le clic en cours.
  if(k&&!touched.has(k)&&tab==='devis'){touched.add(k);const R=compute(S.draft);updateHints(S.draft,R,checksFor(S.draft,R))}
});

syncTheme();
render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
