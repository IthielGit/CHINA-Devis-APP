const assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/My PC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
// Automatisation : un produit déjà enregistré remplit ses valeurs, et la destination du dernier dossier est reprise.
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const errors=[];
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../Devis Transitaires.html')).href);
    await page.evaluate(()=>localStorage.clear());await page.reload();
    await page.locator('#tab-devis').click();
    const today=await page.evaluate(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Indian/Antananarivo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
    await page.locator('details.adv summary').click();
    await page.locator('#f_pay').fill(today);
    await page.locator('#f_name').fill('Lampe test');
    await page.locator('#f_price').fill('4');
    await page.locator('#f_dims').fill('10 x 10 x 2');
    await page.locator('#f_wt').fill('0.1');
    await page.locator('#f_qty').fill('3');
    await page.locator('#f_livCh').fill('50');
    await page.locator('#f_destination').selectOption('Stock boutique');
    await page.locator('#f_destination').dispatchEvent('change');
    await page.locator('#bSave').click();
    assert.equal(await page.evaluate(()=>S.products.length),1,'le produit est mémorisé à l’enregistrement');
    // Nouveau devis : la destination du dernier dossier est reprise.
    await page.evaluate(()=>startNewQuote());
    assert.equal(await page.locator('#f_destination').inputValue(),'Stock boutique','destination reprise');
    assert.equal(await page.evaluate(()=>S.draft.livCh),50,'frais de livraison en Chine repris');
    // Le nom connu remplit prix, dimensions, poids et catégorie.
    await page.locator('#f_name').fill('lampe test');
    assert.equal(await page.locator('#f_price').inputValue(),'4','prix repris');
    assert.equal(await page.locator('#f_dims').inputValue(),'10 x 10 x 2','dimensions reprises');
    assert.equal(await page.locator('#f_wt').inputValue(),'0.1','poids repris');
    assert.equal(await page.evaluate(()=>S.draft.catManual),true);
    assert.equal(await page.locator('#f_qty').inputValue(),'3','quantité reprise');
    assert.deepEqual(errors,[],'aucune erreur JavaScript');
    console.log('PASS: produit connu rempli automatiquement ; destination du dernier dossier reprise.');
  }finally{await browser.close()}
})().catch(e=>{console.error('FAIL:',e.message);process.exitCode=1});
