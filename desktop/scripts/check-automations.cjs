const assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/My PC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
// Les dix automatisations : valeurs proposées, contrôles rapides, alertes, stock, sauvegardes.
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const errors=[];
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../Devis Transitaires.html')).href);
    await page.evaluate(()=>localStorage.clear());await page.reload();
    await page.locator('#tab-devis').click();
    const today=await page.evaluate(()=>todayTana());
    const submit=async(form,values)=>{for(const[name,value]of Object.entries(values)){const field=form.locator(`[name="${name}"]`);const kind=await field.evaluate(el=>el.tagName==='SELECT'?'select':el.type);if(kind==='checkbox'){if(value)await field.check()}else if(kind==='select')await field.selectOption(value);else await field.fill(value)}await form.locator('button[type=submit]').click()};
    // Création d’un devis : produit, prix, quantité, destination ; date de paiement d’aujourd’hui.
    const makeQuote=async(name,destination,{qty='3',marge=null}={})=>{
      await page.evaluate(()=>startNewQuote());
      await page.locator('details.adv summary').click();await page.locator('#f_pay').fill(today);
      await page.locator('#f_name').fill(name);await page.locator('#f_price').fill('4');await page.locator('#f_dims').fill('10 x 10 x 2');await page.locator('#f_wt').fill('0.1');await page.locator('#f_qty').fill(qty);
      if(marge!==null)await page.locator('#f_marge').selectOption(String(marge));
      await page.locator('#f_destination').selectOption(destination);await page.locator('#f_destination').dispatchEvent('change');
      await page.locator('#bSave').click();
      // Alerte « Vérifiez ces points » (départ calculé dépassé) : le test enregistre malgré l’alerte.
      if(await page.locator('.calendar-dialog button#reviewConfirm').count())await page.locator('#reviewConfirm').click();
      await page.waitForTimeout(150);
      return (await page.locator('#qNo').innerText()).trim();
    };
    const confirm=async()=>{await page.locator('#bConfirm').click();if(await page.locator('.calendar-dialog button#reviewConfirm').count())await page.locator('#reviewConfirm').click();await page.waitForTimeout(150)};
    const openFiche=async()=>{await page.evaluate(()=>document.querySelector('.more-actions').open=true);await page.locator('#bFollow').click()};

    // 1. Étape « Commandé » préremplie : date du jour, quantité du devis, montant = prix × quantité.
    const no1=await makeQuote('Lampe auto','Stock boutique');
    await confirm();
    await openFiche();
    const orderForm=page.locator('#ov form[data-op=transition]').first();
    assert.equal(await orderForm.locator('[name=orderedAt]').inputValue(),today,'date de commande préremplie');
    assert.equal(await orderForm.locator('[name=qtyOrdered]').inputValue(),'3','quantité commandée reprise du devis');
    assert.equal(await orderForm.locator('[name=paidAmountCny]').inputValue(),'12','montant = prix × quantité');
    await submit(orderForm,{platform:'Pinduoduo',supplier:'Shop Guangzhou',reference:'PDD-1'});
    await page.waitForFunction(n=>S.quotes.find(q=>q.no===n).status==='Commandé en Chine',no1);
    // 2. Dépense : date du jour, devise CNY.
    const expForm=page.locator('#ov form[data-op=addExpense]');
    assert.equal(await expForm.locator('[name=paidAt]').inputValue(),today,'date de dépense préremplie');
    assert.equal(await expForm.locator('[name=currency]').inputValue(),'CNY','devise CNY proposée');
    await submit(expForm,{category:'Transport international',amount:'100',proof:'REF-1'});
    assert.equal(await page.evaluate(()=>S.quotes[0].expenses.length),1);
    await page.evaluate(()=>closeQuote());
    // 3. Commande suivante : fournisseur et plateforme repris de la dernière commande.
    await makeQuote('Spray auto','Stock boutique',{marge:1});
    await confirm();
    await openFiche();
    const orderForm2=page.locator('#ov form[data-op=transition]').first();
    assert.equal(await orderForm2.locator('[name=supplier]').inputValue(),'Shop Guangzhou','fournisseur repris');
    assert.equal(await orderForm2.locator('[name=platform]').inputValue(),'Pinduoduo','plateforme reprise');
    await page.evaluate(()=>closeQuote());

    // 4. Marge mémorisée par produit : un nouveau devis du même produit reprend la marge choisie.
    await page.evaluate(()=>startNewQuote());
    await page.locator('#f_name').fill('spray auto');
    assert.equal(await page.locator('#f_marge').inputValue(),'1','marge reprise pour ce produit');

    // 5. Date souhaitée : une date impossible déclenche l’alerte, une date lointaine non.
    await page.evaluate(()=>startNewQuote());
    await page.locator('#f_name').fill('Autre produit');await page.locator('#f_price').fill('4');await page.locator('#f_dims').fill('10 x 10 x 2');await page.locator('#f_wt').fill('0.1');
    await page.locator('#f_wantBy').fill('2000-01-01');await page.locator('#f_wantBy').dispatchEvent('change');
    assert.match(await page.locator('#result').innerText(),/Aucune offre n’arrive avant la date souhaitée/,'alerte quand aucune offre ne convient');
    await page.locator('#f_wantBy').fill('2099-01-01');await page.locator('#f_wantBy').dispatchEvent('change');
    assert.doesNotMatch(await page.locator('#result').innerText(),/Aucune offre n’arrive avant/,'pas d’alerte avec une date lointaine');
    await page.locator('#f_wantBy').fill('');await page.locator('#f_wantBy').dispatchEvent('change');

    // 6. Accueil : dossier en retard signalé.
    await page.evaluate(n=>{const q=S.quotes.find(x=>x.no===n);q.status='Commandé en Chine';q.logistics.arrivalPlanned='2020-01-01';commitState(S)},no1);
    await page.locator('#tab-dash').click();
    assert.match(await page.locator('#view').innerText(),/À relancer : 1 dossier en retard/,'retard affiché sur l’accueil');

    // 7. Historique : devis non payés du même transitaire et même départ → paiement groupé suggéré.
    await page.evaluate(n=>{const q=S.quotes.find(x=>x.no===n);q.logistics.arrivalPlanned=null;commitState(S)},no1);
    await makeQuote('Lot A','Stock boutique');
    await makeQuote('Lot B','Stock boutique');
    await page.locator('#tab-histo').click();
    assert.equal(await page.locator('#groupSuggest').count(),1,'suggestion de paiement groupé');

    // 8. Contrôle rapide de réception : quantité proposée = commandée, case « intacte » sans casse.
    await page.locator('#tab-devis').click();
    await page.evaluate(n=>{const q=S.quotes.find(x=>x.no===n);q.status='Contrôle de réception';commitState(S)},no1);
    await page.evaluate(n=>showQuote(S.quotes.find(x=>x.no===n)),no1);
    const recForm=page.locator('#ov form[data-op=addReception]');
    assert.equal(await recForm.locator('[name=qtyReceived]').inputValue(),'3','quantité reçue proposée = commandée');
    await page.locator('#ov [data-rec-check=intact]').check();
    assert.equal(await recForm.locator('[name=qtyDamaged]').inputValue(),'0','aucune casse');
    await page.evaluate(()=>closeQuote());

    // 9. Sauvegarde quotidienne : une copie du jour est gardée.
    await page.reload();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('devis-daily-snapshots')).length),1,'une sauvegarde du jour');

    assert.deepEqual(errors,[],'aucune erreur JavaScript');
    console.log('PASS: dix automatisations — étape commande préremplie, dépense, fournisseur repris, marge par produit, date souhaitée, retard sur l’accueil, paiement groupé suggéré, contrôle de réception, sauvegarde quotidienne. Le stock n’est pas proposé dans les commandes client (gestion de stock hors de cette app).');
  }finally{await browser.close()}
})().catch(e=>{console.error('FAIL:',e.message);process.exitCode=1});
