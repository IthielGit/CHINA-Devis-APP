const assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/My PC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
// Retour à l’écran précédent : rechargement = même écran ; nouvelle session (app fermée) = accueil.
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  try{
    const url=pathToFileURL(path.resolve(__dirname,'../Devis Transitaires.html')).href;
    const page=await browser.newPage();
    await page.goto(url);await page.evaluate(()=>localStorage.clear());await page.reload();
    assert.equal(await page.evaluate(()=>S.tab),'dash','premier lancement : accueil');
    await page.locator('#tab-histo').click();
    await page.reload();
    assert.equal(await page.evaluate(()=>S.tab),'histo','rechargement : retour à l’écran précédent');
    assert.match(await page.locator('#tab-histo').getAttribute('aria-selected'),/true/);
    const fresh=await browser.newPage();
    await fresh.goto(url);
    assert.equal(await fresh.evaluate(()=>S.tab),'dash','nouvelle ouverture de l’app : accueil');
    console.log('PASS: retour à l’écran précédent après rechargement ; accueil après fermeture complète.');
  }finally{await browser.close()}
})().catch(e=>{console.error('FAIL:',e.message);process.exitCode=1});
