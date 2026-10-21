/* Hygo — message de bienvenue. Affiché à l’ouverture de l’app (une fois par session, pour tous les comptes)
   et après chaque devis enregistré (js/app.js appelle hygoWelcome(true)).
   js/auth.js l’appelle au démarrage de la session (start) ; un nouveau chargement de la page ouvre une nouvelle session. */
(()=>{
let shownAtStart=false;
const $=id=>document.getElementById(id);
const box=$('welcome'), btn=$('welcomeBtn');
let opener=null;

function close(){
  btn.disabled=true;
  box.hidden=true;
  if(opener&&opener!==document.body&&typeof opener.focus==='function')opener.focus();
  opener=null;
}

// Un seul bouton : Tab et Échap restent sur la fenêtre au lieu de passer à l’application derrière.
if(box&&btn){
  box.addEventListener('keydown',e=>{
    if(e.key==='Tab'){e.preventDefault();btn.focus()}
    else if(e.key==='Escape')close();
  });
  btn.addEventListener('click',close);
}

/* force = true : après un devis enregistré, à chaque fois. Sinon : une seule fois au démarrage de la session. */
window.hygoWelcome=force=>{
  if(!box||!btn||!box.hidden)return;
  if(!force){
    if(shownAtStart)return;
    shownAtStart=true;
  }
  btn.disabled=false;
  opener=document.activeElement;
  box.hidden=false;
  btn.focus();
};
})();
