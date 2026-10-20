/* Hygo — connexion et synchronisation (Supabase). Les données restent en cache local (même clé que engine.js) ;
   js/engine.js et js/app.js ne se chargent qu’une fois le compte identifié. */
(()=>{
const DATA_KEY='hygo-v1';     // clé de js/engine.js
const USER_KEY='hygo-user';   // compte auquel appartient le cache local
const DIRTY_KEY='hygo-dirty'; // modifications pas encore envoyées au serveur
const ROLE_KEY='hygo-role';   // rôle du compte connecté (pour l’affichage hors ligne)
const VIEW_KEY='hygo-view-as'; // sessionStorage : compte consulté par le super admin
const EMAIL_KEY='hygo-email';  // email du compte connecté (avatar, hors ligne)
const PROFILE_KEY='hygo-profile'; // nom et photo du compte (Google), hors ligne
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
/* Gabarit commun : logo, titre, sous-titre, puis le contenu de l’écran. */
const LOGO='<span class="auth-logo" aria-hidden="true"><img src="icon-192.png" alt=""></span>';
const card=(title,sub,body)=>`${LOGO}<div class="auth-head"><h2>${esc(title)}</h2>${sub?`<p>${esc(sub)}</p>`:''}</div>${body}`;
const GOOGLE_LOGO='<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
const GOOGLE_BTN=`<button class="btn block social" type="button" data-action="google"><span class="g-mark">${GOOGLE_LOGO}</span>Continuer avec Google</button>`;
const OR='<div class="or" aria-hidden="true"><span>OU</span></div>';
const EMAIL_FIELD='<label class="field"><span>Email</span><input class="inp" type="email" name="email" autocomplete="email" placeholder="Entrez votre email" required></label>';
const PW_TOGGLE='<button type="button" class="pw-toggle" data-action="toggle-pw" aria-label="Afficher le mot de passe" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg></button>';
const pwField=(label,autocomplete)=>`<label class="field"><span>${label}</span><span class="input-wrap"><input class="inp has-toggle" type="password" name="password" autocomplete="${autocomplete}" minlength="${MIN_PASSWORD}" placeholder="Entrez votre mot de passe" required>${PW_TOGGLE}</span></label>`;
const BACK_TO_LOGIN='<p class="auth-foot"><button type="button" class="link" data-view="login">Retour à la connexion</button></p>';

function viewLogin(msg,bad){
  show(card('Bienvenue','Entrez vos identifiants pour vous connecter.',`
  ${GOOGLE_BTN}
  ${OR}
  <form class="auth-form" data-form="login">
    ${EMAIL_FIELD}
    ${pwField('Mot de passe','current-password')}
    <p class="auth-aside"><button type="button" class="link" data-view="forgot">Mot de passe oublié ?</button></p>
    ${notice(msg,bad)}
    <button class="btn auth-submit" type="submit">Se connecter</button>
  </form>
  <p class="auth-foot">Vous n’avez pas de compte ? <button type="button" class="link" data-view="signup">Créer un compte</button></p>`));
}
function viewSignup(msg,bad){
  show(card('Créer un compte',`Choisissez un mot de passe d’au moins ${MIN_PASSWORD} caractères.`,`
  ${GOOGLE_BTN}
  ${OR}
  <form class="auth-form" data-form="signup">
    ${EMAIL_FIELD}
    ${pwField('Mot de passe','new-password')}
    ${notice(msg,bad)}
    <button class="btn auth-submit" type="submit">Créer le compte</button>
  </form>
  <p class="auth-foot">Vous avez déjà un compte ? <button type="button" class="link" data-view="login">Se connecter</button></p>`));
}
function viewForgot(msg,bad){
  show(card('Mot de passe oublié','Nous vous enverrons un lien de réinitialisation.',`
  <form class="auth-form" data-form="forgot">
    ${EMAIL_FIELD}
    ${notice(msg,bad)}
    <button class="btn auth-submit" type="submit">Envoyer le lien</button>
  </form>
  ${BACK_TO_LOGIN}`));
}
function viewRecover(msg,bad){
  show(card('Nouveau mot de passe',`Au moins ${MIN_PASSWORD} caractères.`,`
  <form class="auth-form" data-form="recover">
    ${pwField('Mot de passe','new-password')}
    ${notice(msg,bad)}
    <button class="btn auth-submit" type="submit">Enregistrer</button>
  </form>`));
}
function viewInfo(text){
  show(card('Vérifiez vos emails','',`<p class="auth-note">${esc(text)}</p>${BACK_TO_LOGIN}`));
}
function viewPending(){
  show(card('Compte en attente','Votre compte a bien été créé.',`
  <p class="auth-note">Le super administrateur doit le valider avant que vous puissiez accéder aux devis.</p>
  <button class="btn auth-submit" type="button" data-action="recheck">Vérifier à nouveau</button>
  <p class="auth-foot"><button type="button" class="link" data-action="logout">Se déconnecter</button></p>`));
}
function viewBlocked(text){
  show(card('Accès impossible','',`<p class="auth-note">${esc(text)}</p>
  <p class="auth-foot"><button type="button" class="link" data-action="logout">Se déconnecter</button></p>`));
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
  if(b.dataset.action==='toggle-pw'){
    const input=b.parentElement.querySelector('input');
    const reveal=input.type==='password';
    input.type=reveal?'text':'password';
    b.setAttribute('aria-pressed',String(reveal));
    b.setAttribute('aria-label',reveal?'Masquer le mot de passe':'Afficher le mot de passe');
    return;
  }
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
  // Nom et photo fournis par Google (vides pour un compte créé avec un mot de passe).
  const meta=session.user.user_metadata||{};
  localStorage.setItem(PROFILE_KEY,JSON.stringify({name:meta.full_name||meta.name||'',avatar:meta.avatar_url||meta.picture||''}));
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
  const profile=JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}');
  const name=displayName(profile.name,email);
  window.hygoAccount={email,role:userRole,name,avatar:profile.avatar||''};
  setAvatar($('avatarInitial'),window.hygoAccount);
  setSync(localStorage.getItem(DIRTY_KEY)?'pending':'synced');
  $('viewAs').hidden=target===sessionId;
  // Scripts téléchargés en parallèle, exécutés dans l’ordre (async=false dans load).
  const scripts=['js/engine.js','js/app.js',...(userRole==='super_admin'?['js/admin.js']:[])];
  Promise.all(scripts.map(load)).then(()=>pushState());
}
function load(src){
  return new Promise((ok,ko)=>{
    const s=document.createElement('script');
    s.src=src;s.async=false;s.onload=ok;s.onerror=ko;
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
  localStorage.removeItem(PROFILE_KEY);
}
async function logout(){
  if(!await flushOrConfirm('Des modifications ne sont pas encore envoyées. Se déconnecter les effacera de cet appareil. Continuer ?'))return;
  // Déconnexion locale : immédiate, sans attendre le serveur (fonctionne aussi hors ligne).
  try{await client.auth.signOut({scope:'local'})}catch(e){}
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
// Déconnexion en deux temps : le bouton affiche d’abord la confirmation.
document.addEventListener('click',e=>{
  if(e.target.closest('#logoutBtn')){$('logoutConfirm').hidden=false;return}
  if(e.target.closest('#logoutCancel')){$('logoutConfirm').hidden=true;return}
  if(e.target.closest('#logoutYes'))logout();
});
/* Nom affiché : celui du compte Google, sinon le début de l’email. */
function displayName(name,email){
  return name||(email.split('@')[0]||'').replace(/[._-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}
/* Photo du compte si elle existe (repli sur l’initiale si elle ne charge pas). */
function setAvatar(el,{name,email,avatar}){
  el.replaceChildren();
  if(avatar){
    const img=document.createElement('img');
    img.alt='';img.referrerPolicy='no-referrer';
    img.onerror=()=>setAvatar(el,{name,email,avatar:''});
    img.src=avatar;
    el.appendChild(img);
    return;
  }
  el.textContent=((name||email||'?')[0]).toUpperCase();
}

/* Fiche compte, ouverte depuis l’avatar de l’en-tête. */
function openAccount(){
  const a=window.hygoAccount||{};
  const SYNC={synced:'À jour',pending:'En attente',offline:'Hors ligne'};
  setAvatar($('profileAvatar'),a);
  $('accountName').textContent=a.name||'Mon compte';
  $('accountRole').textContent=a.role==='super_admin'?'Super administrateur':'Administrateur';
  $('accountEmail').textContent=a.email;
  $('accountSync').textContent=SYNC[window.hygoSyncState?.()]||'';
  $('adminBtn').hidden=a.role!=='super_admin';
  $('logoutConfirm').hidden=true;
  $('account').hidden=false;
}
$('accountBtn').addEventListener('click',openAccount);
$('accountClose').addEventListener('click',()=>{$('account').hidden=true});
$('viewAsExit').addEventListener('click',()=>switchTo(null));

// Utilisé par js/admin.js.
window.hygoAuth={client,switchTo,esc,get uid(){return uid},get owner(){return owner}};

boot();
})();
