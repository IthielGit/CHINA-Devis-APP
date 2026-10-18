const assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('C:/Users/My PC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
// Parcours réel dans le navigateur : enregistrement, confirmation, commande, transport, réception, stock,
// double clic, rechargement de la page, puis branche « Commande client ».
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const errors=[];
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    page.on('pageerror',e=>errors.push(e.message));
    const url=pathToFileURL(path.resolve(__dirname,'../Devis Transitaires.html')).href;
    await page.goto(url);
    await page.evaluate(()=>localStorage.clear());
    await page.reload();
    await page.locator('#tab-devis').click();

    const stateOf=no=>page.evaluate(n=>{const q=S.quotes.find(x=>x.no===n);return q?{status:q.status,destination:q.destination,stock:S.stock.filter(e=>e.quoteNo===n).length,expenses:q.expenses.length,receptions:q.receptions.length,history:q.statusHistory.length}:null},no);
    const toast=async()=>page.locator('.toast').first().innerText().catch(()=>'');
    const submit=async(form,values)=>{for(const[name,value]of Object.entries(values)){const field=form.locator(`[name="${name}"]`);if(await field.count()===0)throw Error('champ absent : '+name);const kind=await field.evaluate(el=>el.tagName==='SELECT'?'select':el.type);if(kind==='checkbox'){if(value)await field.check()}else if(kind==='select')await field.selectOption(value);else await field.fill(value)}await form.locator('button[type=submit]').click()};

    // 1. Brouillon : destination obligatoire avant confirmation.
    const today=await page.evaluate(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Indian/Antananarivo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
    await page.locator('details.adv summary').click();
    await page.locator('#f_pay').fill(today);
    await page.locator('#bSave').click();
    await page.locator('#f_destination').selectOption('Stock boutique');
    await page.locator('#f_destination').dispatchEvent('change');
    assert.equal(await page.locator('#bConfirm').isHidden(),true,'pas de confirmation tant que le devis n’est pas enregistré avec sa destination');
    await page.locator('#bSave').click();
    assert.match(await page.locator('#qStat').innerText(),/Brouillon/);
    const no=(await page.locator('#qNo').innerText()).trim();
    assert.equal(await page.locator('#bConfirm').isVisible(),true);
    assert.equal((await stateOf(no)).status,'Brouillon');

    // 2. Confirmation : le devis est figé à l’écran ; une modification est refusée.
    await page.locator('#bConfirm').click();
    if(await page.locator('.calendar-dialog button#reviewConfirm').count())await page.locator('#reviewConfirm').click();
    await page.waitForFunction(n=>S.quotes.find(q=>q.no===n).status!=='Brouillon',no);
    assert.equal((await stateOf(no)).status,'Confirmé');
    assert.equal(await page.evaluate(()=>document.querySelector('.quote-cols').inert),true,'le formulaire est verrouillé après confirmation');

    // 3. Fiche : une seule action à la fois, selon le statut.
    await page.evaluate(()=>{document.querySelector('.more-actions').open=true});await page.locator('#bFollow').click();
    const fiche=page.locator('#ov');
    assert.match(await fiche.locator('.fiche-head').innerText(),/Confirmé/);
    await submit(fiche.locator('form[data-op=transition]').first(),{platform:'Pinduoduo',supplier:'Shop Guangzhou',reference:'PDD-42',orderedAt:today,paidAmountCny:'4.04',qtyOrdered:'20'});
    await page.waitForFunction(n=>S.quotes.find(q=>q.no===n).status==='Commandé en Chine',no);
    assert.equal((await stateOf(no)).status,'Commandé en Chine');
    // Dossier passé à la commande : le formulaire de confirmation a disparu, le suivi reste ouvert.
    assert.equal(await page.locator('#ov button[data-op=confirm]').count(),0);

    // 4. Dépense réelle, puis transport, arrivée, disponibilité, retrait.
    await submit(fiche.locator('form[data-op=addExpense]'),{category:'Transport international',amount:'100',currency:'CNY',paidAt:today,proof:'REF-1'});
    assert.equal((await stateOf(no)).expenses,1);
    await submit(fiche.locator('form[data-op=transition]').first(),{date:today});
    await page.waitForFunction(n=>S.quotes.find(q=>q.no===n).status==='En transit vers Madagascar',no);
    await submit(fiche.locator('form[data-op=transition]').first(),{date:today});
    await page.waitForFunction(n=>S.quotes.find(q=>q.no===n).status==='Arrivé à Madagascar',no);
    await submit(fiche.locator('form[data-op=transition]').first(),{date:today});
    await page.waitForFunction(n=>S.quotes.find(q=>q.no===n).status==='À récupérer',no);
    await submit(fiche.locator('form[data-op=transition]').first(),{date:today});
    await page.waitForFunction(n=>S.quotes.find(q=>q.no===n).status==='Récupéré',no);

    // 5. Contrôle de réception partiel : 20 commandées, 17 reçues, 1 endommagée → 16 acceptées.
    await submit(fiche.locator('form[data-op=transition]').first(),{});
    await page.waitForFunction(n=>S.quotes.find(q=>q.no===n).status==='Contrôle de réception',no);
    await submit(fiche.locator('form[data-op=addReception]'),{date:today,qtyShipped:'20',qtyReceived:'17',qtyAccepted:'16',qtyDamaged:'1'});
    assert.equal((await stateOf(no)).receptions,1);
    const receptionText=await fiche.locator('section',{hasText:'Réception et incidents'}).innerText();
    assert.match(receptionText,/Manquant \(commandé − reçu\)\n3\b/,'manquant de 3 unités affiché');
    assert.match(receptionText,/Accepté\n16\b/,'16 unités acceptées affichées');

    // 6. Double clic sur la clôture : une seule entrée de stock.
    const close=fiche.locator('form[data-op=transition] button[type=submit]').first();
    await close.dblclick();
    await page.waitForFunction(n=>S.quotes.find(q=>q.no===n).status==='Stock boutique',no);
    await page.waitForTimeout(200);
    const afterClose=await stateOf(no);
    assert.equal(afterClose.stock,1,'un seul mouvement de stock malgré le double clic');
    assert.equal(afterClose.history,9,'un seul événement par étape : création, confirmation, 6 étapes, contrôle, stock');
    const stock=await page.evaluate(()=>S.stock[0]);
    assert.equal(stock.qtyAccepted,16);
    assert.equal(stock.qtyExcluded,1);
    assert.equal(stock.costBasis,'réel');

    // 7. Rechargement du navigateur : le statut et le stock sont toujours là.
    await page.reload();
    assert.equal((await stateOf(no)).status,'Stock boutique');
    assert.equal((await stateOf(no)).stock,1);

    // 8. Historique : statut, destination, filtre par statut.
    await page.locator('#tab-histo').click();
    assert.match(await page.locator('#hlist').innerText(),/Stock boutique/);
    await page.evaluate(()=>{document.querySelector('.hfilters').open=true});await page.locator('#hStatus').selectOption('Confirmé');
    assert.match(await page.locator('#hlist').innerText(),/Aucun résultat/);
    await page.evaluate(()=>{document.querySelector('.hfilters').open=true});await page.locator('#hReset').click();

    // 9. Branche « Commande client » sur un second devis.
    await page.locator('#tab-devis').click();
    await page.evaluate(()=>{document.querySelector('.more-actions').open=true});await page.locator('#bNew').click();
    await page.locator('#f_name').fill('Spray anti-pluie 50 ml');
    await page.locator('#f_price').fill('4');
    await page.locator('#f_dims').fill('10 x 10 x 2');
    await page.locator('#f_wt').fill('0.1');
    await page.locator('#f_destination').selectOption('Commande client');
    await page.locator('#f_destination').dispatchEvent('change');
    await page.locator('#bSave').click();
    const no2=(await page.locator('#qNo').innerText()).trim();
    assert.notEqual(no2,no);
    await page.locator('#bConfirm').click();
    if(await page.locator('.calendar-dialog button#reviewConfirm').count())await page.locator('#reviewConfirm').click();
    await page.waitForFunction(n=>S.quotes.find(q=>q.no===n).status==='Confirmé',no2);

    // 10. Tableau de bord : compteurs réels.
    await page.locator('#tab-dash').click();
    assert.match(await page.locator('#view').innerText(),/Confirmés, à commander/);
    assert.match(await page.locator('#view').innerText(),/En stock boutique · 16 unité/);
    // Chaque indicateur ouvre la liste des dossiers concernés, avec le filtre déjà appliqué.
    await page.locator('[data-dash-status="Confirmé"]').first().click();
    assert.equal(await page.locator('#hStatus').inputValue(),'Confirmé');
    assert.equal(await page.locator('#hlist tbody tr').count(),1,'seul le dossier confirmé est listé');
    assert.match(await page.locator('#hlist').innerText(),new RegExp(no2));
    await page.evaluate(()=>{document.querySelector('.hfilters').open=true});await page.locator('#hReset').click();
    await page.locator('#tab-dash').click();
    await page.locator('[data-dash-status="Stock boutique"]').first().click();
    assert.equal(await page.locator('#hlist tbody tr').count(),1,'seul le dossier en stock est listé');

    assert.deepEqual(errors,[],'aucune erreur JavaScript pendant le parcours');
    console.log('PASS: browser workflow — brouillon, confirmation verrouillée, commande, dépense réelle, transport, arrivée, retrait, réception partielle (16 acceptées, 3 manquantes), stock unique malgré double clic, persistance après rechargement, historique filtré, branche commande client, tableau de bord.');
  } finally {
    await browser.close();
  }
})().catch(e=>{console.error('FAIL:',e.message);process.exitCode=1});
