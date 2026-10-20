/* Hygo — panneau « Comptes » du super admin : valider, suspendre, consulter un compte.
   Chargé uniquement pour le super admin (voir js/auth.js). La sécurité reste dans les règles RLS. */
(()=>{
const {client,switchTo,esc}=window.hygoAuth;
const $=id=>document.getElementById(id);
const panel=$('admin'), body=$('adminBody');
const STATUS={pending:'En attente',active:'Actif',suspended:'Suspendu'};
const ROLE={super_admin:'Super admin',admin:'Admin'};

function rowHtml(p){
  const me=p.id===window.hygoAuth.uid;
  const actions=[];
  if(!me){
    if(p.status!=='active')actions.push(['activate',p.status==='pending'?'Valider':'Réactiver']);
    if(p.status==='active')actions.push(['suspend','Suspendre']);
    actions.push(['view','Consulter']);
  }
  return `<div class="admin-row">
    <div><b>${esc(p.email)}</b>${me?' <span class="tag neutral">Vous</span>':''}</div>
    <div class="admin-meta">${esc(ROLE[p.role]||p.role)} · ${esc(STATUS[p.status]||p.status)}</div>
    <div class="admin-actions">${actions.map(([a,l])=>`<button type="button" class="btn small" data-id="${esc(p.id)}" data-act="${a}">${l}</button>`).join('')}</div>
  </div>`;
}
async function refresh(){
  body.innerHTML='<p>Chargement…</p>';
  const {data,error}=await client.from('profiles').select('id,email,role,status').order('created_at',{ascending:false});
  if(error){body.innerHTML=`<p class="hint bad" role="status">${esc(error.message)}</p>`;return}
  body.innerHTML=data.map(rowHtml).join('')||'<p>Aucun compte.</p>';
}

body.addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');
  if(!b)return;
  const id=b.dataset.id, act=b.dataset.act;
  if(act==='view')return switchTo(id);
  if(act==='suspend'&&!confirm('Suspendre ce compte ? Son titulaire ne pourra plus accéder à ses données.'))return;
  const status=act==='suspend'?'suspended':'active';
  b.disabled=true;
  const {error}=await client.from('profiles').update({status}).eq('id',id);
  if(error)toast('Action impossible : '+error.message,{sticky:true});
  refresh();
});
// Le bouton est dans la page Réglages, recréée à chaque affichage : délégation sur le document.
document.addEventListener('click',e=>{if(e.target.closest('#adminBtn')){panel.hidden=false;refresh()}});
$('adminClose').addEventListener('click',()=>{panel.hidden=true});
})();
