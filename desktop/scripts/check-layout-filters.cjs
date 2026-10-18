const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('C:/Users/My PC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  try {
    const page=await browser.newPage({viewport:{width:1445,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../Devis Transitaires.html')).href);
    const boxes=await page.locator('.quote-cols > .stack > section:first-child').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom}}));
    assert.equal(boxes.length,2);assert.equal(boxes[0].top,boxes[1].top);
    await page.screenshot({path:path.resolve(__dirname,'../ux-devis-review.png'),fullPage:true});
    assert.equal(await page.locator('[data-detail="dates"]').getAttribute('open'),null);
    await page.locator('#tab-params').click();
    const cards=await page.locator('.params-grid > .stack > .card:first-child').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().top));
    assert.equal(cards.length,2);assert.equal(cards[0],cards[1]);
    assert.equal(await page.locator('#p_div').isVisible(),false);
    await page.locator('.params-advanced > summary').click();assert.equal(await page.locator('#p_div').isVisible(),true);
    await page.locator('.params-advanced > summary').click();
    await page.screenshot({path:path.resolve(__dirname,'../ux-params-review.png'),fullPage:true});
    await page.evaluate(()=>{S.cal=[{tr:'A',mode:'Avion',svc:'Fast',date:'2099-01-01',note:'first'},{tr:'B',mode:'Maritime',svc:'',date:'2099-02-01',note:'second'},{tr:'A',mode:'Avion',svc:'Standard',date:'2099-01-01',note:'third'}];go('cal')});
    await page.locator('#cTr').selectOption('A');assert.equal(await page.locator('#cb tr').count(),2);
    await page.locator('#cSvc').selectOption('Standard');assert.equal(await page.locator('#cb tr').count(),1);
    assert.equal(await page.locator('[data-cal-view]').getAttribute('data-cal-view'),'2');
    await page.locator('[data-cal-view]').click();assert.equal(await page.locator('#calNote').inputValue(),'third');await page.locator('#calCancel').click();
    await page.locator('#cDateFrom').fill('2099-02-01');assert.match(await page.locator('#cb').innerText(),/Aucun départ/);
    await page.locator('#cReset').click();assert.equal(await page.locator('#cb tr').count(),3);
    await page.locator('#cDateFrom').fill('2099-01-01');await page.locator('#cDateTo').fill('2099-02-01');
    assert.equal(await page.locator('[data-cal-view]').count(),3);
    await page.locator('#cDateTo').fill('2099-01-01');assert.equal(await page.locator('[data-cal-view]').count(),2);
    await page.locator('#cDateFrom').fill('');assert.equal(await page.locator('[data-cal-view]').count(),2);
    await page.locator('#cDateFrom').fill('2099-02-01');assert.equal(await page.locator('#cDateError').isVisible(),true);assert.equal(await page.locator('[data-cal-view]').count(),0);
    await page.locator('#cReset').click();assert.equal(await page.locator('#cDateError').isVisible(),false);assert.equal(await page.locator('#cDateFrom').inputValue(),'');assert.equal(await page.locator('#cDateTo').inputValue(),'');
    await page.locator('#cMode').selectOption('Maritime');await page.locator('#cSvc').selectOption('__empty__');assert.equal(await page.locator('[data-cal-view]').getAttribute('data-cal-view'),'1');
    assert.equal(await page.locator('[data-cal-view]').getAttribute('data-cal-view'),'1');
    await page.locator('#cReset').click();
    assert.deepEqual(await page.locator('[data-cal-view]').evaluateAll(els=>els.map(el=>el.dataset.calView)),['0','2','1']);
    await page.evaluate(()=>{S.cal.push({tr:'Archive',mode:'Avion',svc:'Fast',date:'2000-01-01',note:''});go('cal')});
    assert.equal(await page.locator('[data-cal-view]').count(),3);
    await page.locator('[data-cal-period="past"]').click();assert.equal(await page.locator('[data-cal-view]').count(),1);assert.equal(await page.locator('[data-cal-edit]').count(),0);
    await page.locator('[data-cal-period="all"]').click();assert.equal(await page.locator('[data-cal-view]').count(),4);
    await page.locator('[data-cal-period="upcoming"]').click();
    const menu=page.locator('.row-actions').first();assert.equal(await menu.locator('[data-cal-edit]').isVisible(),false);
    await menu.locator('summary').click();assert.equal(await menu.locator('[data-cal-edit]').isVisible(),true);
    await menu.locator('[data-cal-edit]').press('Escape');assert.equal(await menu.getAttribute('open'),null);
    await page.screenshot({path:path.resolve(__dirname,'../calendar-filters-review.png'),fullPage:true});
    for(const tab of ['devis','params','cal'])for(const width of [390,768,1445]){
      await page.setViewportSize({width,height:844});await page.locator('#tab-'+tab).click();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${tab} overflow at ${width}`);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: top alignment, natural-height settings, advanced controls, date ranges, combined filters, upcoming/past/all, sorted original record actions, keyboard menu, responsive layouts, no runtime errors.');
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
