/* Hygo — connexion et synchronisation (Supabase). Les données restent en cache local (même clé que engine.js) ;
   js/engine.js et js/app.js ne se chargent qu’une fois le compte identifié. */
(()=>{
const DATA_KEY='hygo-v1';     // clé de js/engine.js
const USER_KEY='hygo-user';   // compte auquel appartient le cache local
const DIRTY_KEY='hygo-dirty'; // modifications pas encore envoyées au serveur
const ROLE_KEY='hygo-role';   // rôle du compte connecté (pour l’affichage hors ligne)
const VIEW_KEY='hygo-view-as'; // sessionStorage : compte consulté par le super admin
const EMAIL_KEY='hygo-email';  // email du compte connecté (avatar, hors ligne)
const MIN_PASSWORD=8;
const cfg=window.HYGO_CONFIG;
const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
const $=id=>document.getElementById(id);
const authEl=$('auth'), box=$('authBox'), shell=$('shell');
const redirectTo=location.origin+location.pathname;
let uid=null;      // compte connecté
let owner=null;    // compte dont les données sont dans le cache (le même, sauf en consultation)
let started=false, syncing=false, warned=false, retryT=null;

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notice=(text,bad)=>text?`<p class="hint${bad?' bad':''}" role="status">${esc(text)}</p>`:'';
function friendly(err){
  const m=err?.message||'';
  if(/invalid login/i.test(m))return 'Email ou mot de passe incorrect.';
  if(/already registered/i.test(m))return 'Un compte existe déjà avec cette adresse.';
  if(/not confirmed/i.test(m))return 'Confirmez d’abord votre adresse par le lien reçu par email.';
  if(/rate limit|too many/i.test(m))return 'Trop de tentatives. Patientez quelques minutes.';
  return 'Action impossible : '+m;
}

/* ---------- écrans ---------- */
function show(html){box.innerHTML=html;authEl.hidden=false;shell.hidden=true}
function viewLogin(msg,bad){
  show(`<h2>Connexion</h2>
  <form class="auth-form" data-form="login">
    <label class="field"><span>Email</span><input class="inp" type="email" name="email" autocomplete="email" required></label>
    <label class="field"><span>Mot de passe</span><input class="inp" type="password" name="password" autocomplete="current-password" required></label>
    ${notice(msg,bad)}
    <button class="btn primary block" type="submit">Se connecter</button>
  </form>
  <button class="btn block" type="button" data-action="google">Continuer avec Google</button>
  <p class="auth-links"><button type="button" class="link" data-view="forgot">Mot de passe oublié ?</button> · <button type="button" class="link" data-view="signup">Créer un compte</button></p>`);
}
function viewSignup(msg,bad){
  show(`<h2>Créer un compte</h2>
  <form class="auth-form" data-form="signup">
    <label class="field"><span>Email</span><input class="inp" type="email" name="email" autocomplete="email" required></label>
    <label class="field"><span>Mot de passe (${MIN_PASSWORD} caractères minimum)</span><input class="inp" type="password" name="password" autocomplete="new-password" minlength="${MIN_PASSWORD}" required></label>
    ${notice(msg,bad)}
    <button class="btn primary block" type="submit">Créer le compte</button>
  </form>
  <p class="auth-links"><button type="button" class="link" data-view="login">Retour à la connexion</button></p>`);
}
function viewForgot(msg,bad){
  show(`<h2>Mot de passe oublié</h2>
  <form class="auth-form" data-form="forgot">
    <label class="field"><span>Email</span><input class="inp" type="email" name="email" autocomplete="email" required></label>
    ${notice(msg,bad)}
    <button class="btn primary block" type="submit">Envoyer le lien</button>
  </form>
  <p class="auth-links"><button type="button" class="link" data-view="login">Retour à la connexion</button></p>`);
}
function viewRecover(msg,bad){
  show(`<h2>Nouveau mot de passe</h2>
  <form class="auth-form" data-form="recover">
    <label class="field"><span>Mot de passe (${MIN_PASSWORD} caractères minimum)</span><input class="inp" type="password" name="password" autocomplete="new-password" minlength="${MIN_PASSWORD}" required></label>
    ${notice(msg,bad)}
    <button class="btn primary block" type="submit">Enregistrer</button>
  </form>`);
}
function viewInfo(text){
  show(`<h2>Vérifiez vos emails</h2><p>${esc(text)}</p>
  <p class="auth-links"><button type="button" class="link" data-view="login">Retour à la connexion</button></p>`);
}
function viewPending(){
  show(`<h2>Compte en attente</h2>
  <p>Votre compte a bien été créé. Le super administrateur doit le valider avant que vous puissiez accéder aux devis.</p>
  <button class="btn primary block" type="button" data-action="recheck">Vérifier à nouveau</button>
  <p class="auth-links"><button type="button" class="link" data-action="logout">Se déconnecter</button></p>`);
}
function viewBlocked(text){
  show(`<h2>Accès impossible</h2><p>${esc(text)}</p>
  <p class="auth-links"><button type="button" class="link" data-action="logout">Se déconnecter</button></p>`);
}
const VIEWS={login:viewLogin,signup:viewSignup,forgot:viewForgot};

/* ---------- formulaires et boutons ---------- */
const FORMS={
  async login(email,password){
    const {error}=await client.auth.signInWithPassword({email,password});
    if(error)return viewLogin(friendly(error),true);
    boot();
  },
  async signup(email,password){
    if(password.length<MIN_PASSWORD)return viewSignup(`Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.`,true);
    const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:redirectTo}});
    if(error)return viewSignup(friendly(error),true);
    if(data.session)return boot();
    viewInfo('Compte créé. Confirmez votre adresse grâce au lien reçu par email. Un administrateur validera ensuite votre accès.');
  },
  async forgot(email){
    await client.auth.resetPasswordForEmail(email,{redirectTo});
    viewInfo('Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé.');
  },
  async recover(_,password){
    if(password.length<MIN_PASSWORD)return viewRecover(`Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.`,true);
    const {error}=await client.auth.updateUser({password});
    if(error)return viewRecover(friendly(error),true);
    history.replaceState(null,'',location.pathname);
    boot();
  }
};
authEl.addEventListener('submit',async e=>{
  e.preventDefault();
  const f=e.target, d=new FormData(f);
  const value=n=>String(d.get(n)??'').trim();
  const btn=f.querySelector('button[type=submit]');
  btn.disabled=true;
  try{await FORMS[f.dataset.form](value('email'),String(d.get('password')??''))}
  finally{btn.disabled=false}
});
authEl.addEventListener('click',e=>{
  const b=e.target.closest('[data-view],[data-action]');
  if(!b)return;
  if(b.dataset.view)return VIEWS[b.dataset.view]();
  ({google:signInGoogle,recheck:boot,logout})[b.dataset.action]();
});
async function signInGoogle(){
  const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo}});
  if(error)viewLogin(friendly(error),true);
}

/* ---------- démarrage ---------- */
function hasStoredSession(){return Object.keys(localStorage).some(k=>/^sb-.+-auth-token$/.test(k))}
async function boot(){
  if(location.hash.includes('type=recovery'))return viewRecover();
  const {data:{session}}=await client.auth.getSession();
  if(!session){
    // Hors ligne avec une session déjà enregistrée : on ouvre le cache du compte.
    if(!navigator.onLine&&localStorage.getItem(USER_KEY)&&hasStoredSession()){
      const cached=localStorage.getItem(USER_KEY);
      return start(cached,cached,localStorage.getItem(ROLE_KEY));
    }
    return viewLogin();
  }
  const id=session.user.id;
  let profile;
  try{
    const {data,error}=await client.from('profiles').select('status,role,email').eq('id',id).maybeSingle();
    if(error)throw error;
    profile=data;
  }catch(e){
    if(localStorage.getItem(USER_KEY)===id)return start(id,id,localStorage.getItem(ROLE_KEY));
    return viewLogin('Connexion Internet nécessaire pour ouvrir ce compte.',true);
  }
  if(!profile)return viewBlocked('Profil introuvable. Contactez le super administrateur.');
  if(profile.status==='suspended')return viewBlocked('Ce compte a été suspendu. Contactez le super administrateur.');
  if(profile.status==='pending')return viewPending();
  localStorage.setItem(ROLE_KEY,profile.role);
  localStorage.setItem(EMAIL_KEY,profile.email||'');
  // Le super admin peut consulter le compte choisi dans le panneau « Comptes ».
  const target=profile.role==='super_admin'&&sessionStorage.getItem(VIEW_KEY)||id;
  try{await loadData(target)}
  catch(e){
    if(localStorage.getItem(USER_KEY)===target)return start(id,target,profile.role);
    return viewLogin('Impossible de charger vos données. Réessayez.',true);
  }
  start(id,target,profile.role);
}

/* Serveur → cache. Si des modifications locales attendent encore d’être envoyées, elles l’emportent. */
async function loadData(id){
  const cachedUid=localStorage.getItem(USER_KEY);
  if(cachedUid&&cachedUid!==id)localStorage.removeItem(DATA_KEY);
  if(!(cachedUid===id&&localStorage.getItem(DIRTY_KEY))){
    const {data:row,error}=await client.from('app_data').select('state').eq('owner_id',id).maybeSingle();
    if(error)throw error;
    if(row?.state&&Object.keys(row.state).length)localStorage.setItem(DATA_KEY,JSON.stringify(row.state));
    // Compte sans données sur le serveur : les données de cet appareil lui sont envoyées.
    else if(localStorage.getItem(DATA_KEY))localStorage.setItem(DIRTY_KEY,'1');
  }
  localStorage.setItem(USER_KEY,id);
}

function start(sessionId,target,userRole){
  if(started)return;
  started=true;
  uid=sessionId;
  owner=target;
  authEl.hidden=true;
  shell.hidden=false;
  window.hygoRole=userRole;
  const email=localStorage.getItem(EMAIL_KEY)||'';
  window.hygoAccount={email,role:userRole};
  $('avatarInitial').textContent=(email[0]||'?').toUpperCase();
  setSync(localStorage.getItem(DIRTY_KEY)?'pending':'synced');
  $('viewAs').hidden=target===sessionId;
  load('js/engine.js')
    .then(()=>load('js/app.js'))
    .then(()=>{if(userRole==='super_admin')return load('js/admin.js')})
    .then(()=>pushState());
}
function load(src){
  return new Promise((ok,ko)=>{
    const s=document.createElement('script');
    s.src=src;s.onload=ok;s.onerror=ko;
    document.body.appendChild(s);
  });
}

/* ---------- synchronisation ---------- */
// État affiché dans Réglages : 'synced', 'pending' (à envoyer) ou 'offline'.
let syncState='synced';
function setSync(state){
  if(syncState===state)return;
  syncState=state;
  window.dispatchEvent(new CustomEvent('hygo-sync',{detail:state}));
}
window.hygoSyncState=()=>syncState;

// Appelé par js/engine.js après chaque enregistrement local.
window.hygoSync=()=>{localStorage.setItem(DIRTY_KEY,'1');setSync('pending');pushState()};
async function pushState(){
  if(!owner||syncing||!localStorage.getItem(DIRTY_KEY))return;
  syncing=true;
  try{
    while(localStorage.getItem(DIRTY_KEY)){
      localStorage.removeItem(DIRTY_KEY);
      const state=JSON.parse(localStorage.getItem(DATA_KEY));
      const {error}=await client.from('app_data').upsert({owner_id:owner,state,updated_at:new Date().toISOString()});
      if(error)throw error;
    }
    warned=false;
    setSync('synced');
  }catch(e){
    localStorage.setItem(DIRTY_KEY,'1');
    setSync(navigator.onLine?'pending':'offline');
    if(!warned&&typeof toast==='function'){warned=true;toast('Hors ligne : vos modifications seront envoyées au retour du réseau.')}
    clearTimeout(retryT);
    retryT=setTimeout(pushState,30000);
  }finally{syncing=false}
}
window.addEventListener('online',pushState);

/* Envoie les modifications en attente ; false si l’utilisateur refuse de les perdre. */
async function flushOrConfirm(question){
  if(!localStorage.getItem(DIRTY_KEY))return true;
  await pushState();
  return !localStorage.getItem(DIRTY_KEY)||confirm(question);
}
function clearCache(){
  localStorage.removeItem(DATA_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(DIRTY_KEY);
  localStorage.removeItem(EMAIL_KEY);
}
async function logout(){
  if(!await flushOrConfirm('Des modifications ne sont pas encore envoyées. Se déconnecter les effacera de cet appareil. Continuer ?'))return;
  try{await client.auth.signOut()}catch(e){}
  clearCache();
  sessionStorage.removeItem(VIEW_KEY);
  location.reload();
}
/* Consulte le compte donné (ou revient au sien si target est vide). Recharge l’app avec ses données. */
async function switchTo(target){
  if(!await flushOrConfirm('Des modifications ne sont pas encore envoyées. Les changer de compte les effacera de cet appareil. Continuer ?'))return;
  if(target)sessionStorage.setItem(VIEW_KEY,target);
  else sessionStorage.removeItem(VIEW_KEY);
  clearCache();
  location.reload();
}
// Le bouton est dans la page Réglages, recréée à chaque affichage : délégation sur le document.
document.addEventListener('click',e=>{if(e.target.closest('#logoutBtn'))logout()});
/* Fiche compte, ouverte depuis l’avatar de l’en-tête. */
function openAccount(){
  const a=window.hygoAccount||{};
  $('accountEmail').textContent=a.email;
  $('accountRole').textContent=a.role==='super_admin'?'Super administrateur':'Administrateur';
  $('adminBtn').hidden=a.role!=='super_admin';
  $('account').hidden=false;
}
$('accountBtn').addEventListener('click',openAccount);
$('accountClose').addEventListener('click',()=>{$('account').hidden=true});
$('viewAsExit').addEventListener('click',()=>switchTo(null));

// Utilisé par js/admin.js.
window.hygoAuth={client,switchTo,esc,get uid(){return uid},get owner(){return owner}};

boot();
})();
