const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../Devis Transitaires.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new Function(script);
const context = vm.createContext({ localStorage: { getItem: () => null }, console, setTimeout, clearTimeout });
vm.runInContext(script.split('/* ---------- shell')[0], context);
const run = code => vm.runInContext(code, context);
const tariffs = run('S.tarifs');
const seedCalendar = run('S.cal');
const params = run('S.params');

function calculate(tariff, calendar, options = {}) {
  const input = {
    ...run("exampleDraft('CALENDAR-TEST')"),
    cat: options.category || tariff.cats.split(';')[0],
    pay: options.pay || '2026-10-10',
    delai: options.delay ?? 2,
    heure: options.hour ?? 16,
    mode: 'manuel',
    offer: `${tariff.tr} | ${tariff.mode}${tariff.svc ? ` ${tariff.svc}` : ''} | ${tariff.cats}`,
  };
  context.testInput = input;
  context.testTariff = tariff;
  context.testCalendar = calendar;
  context.testParams = { ...params, ...options.params };
  return run('compute(testInput, testParams, [testTariff], testCalendar)');
}

const maritime = tariffs.find(t => t.tr === 'E-SOA' && t.mode === 'Maritime' && t.svc === '' && t.cats === 'Général');
assert.equal(tariffs.filter(t => t.tr === 'E-SOA' && t.mode === 'Maritime').length, 2);
const airNormal = tariffs.find(t => t.tr === 'E-SOA' && t.mode === 'Avion' && t.svc === 'Normal' && t.cats === 'Batterie');
assert.ok(maritime && airNormal);
context.testTariff = maritime;
assert.equal(run('quoteService(testTariff)'), '');
assert.equal(run('offerLabel(testTariff)'), 'E-SOA | Maritime | Général',
  'the E-SOA Maritime quote label should come from transport when service is empty');
context.archivedQuote = { offer: 'E-SOA | Maritime Standard | Général', res: { tr: 'E-SOA', svc: 'Maritime Standard' } };
assert.equal(run('savedOfferLabel(archivedQuote.offer)'), 'E-SOA | Maritime | Général');
assert.equal(run('savedTransportService(archivedQuote)'), 'Maritime');
assert.equal(tariffs.some(t => t.tr === 'E-SOA' && t.mode === 'Avion' && t.svc === 'Standard'), false,
  'E-SOA Avion should expose only Normal and Express, never Standard');
assert.equal(tariffs.some(t => t.tr === 'E-SOA' && t.mode === 'Maritime' && t.svc), false,
  'Maritime tariff service fields should be empty');
assert.equal(tariffs.filter(t => t.mode === 'Maritime').every(t => t.svc === ''), true,
  'all Maritime tariffs, regardless of carrier, should have an empty service');
assert.deepEqual(JSON.parse(JSON.stringify(run("calendarServices('E-SOA','Maritime')"))), [''],
  'the calendar should match the E-SOA Maritime offer using an empty service');
assert.deepEqual(
  JSON.parse(JSON.stringify(run("calendarServices('E-SOA','Avion')"))).sort(),
  ['Express', 'Normal'],
  'E-SOA Avion calendar services should be Normal and Express without mode prefixes');
assert.deepEqual(
  JSON.parse(JSON.stringify(run("calendarServices(S.tarifs.find(t=>t.tr.includes('Asie')).tr,'Avion')"))).sort(),
  ['Fast', 'Normal', 'Plus'],
  'Importation de l’Asie calendar service choices should retain the tariff names without Avion prefixes');
for (const tariff of tariffs) {
  const offeredServices = run(`calendarServices(${JSON.stringify(tariff.tr)},${JSON.stringify(tariff.mode)})`);
  assert.ok(offeredServices.includes(tariff.svc || ''),
    `calendar choices for ${tariff.tr} ${tariff.mode} should include the exact tariff service ${tariff.svc || '(empty)'}`);
}
assert.equal(seedCalendar.every(entry=>tariffs.some(t=>t.tr===entry.tr&&t.mode===entry.mode&&(entry.mode==='Maritime'||(t.svc||'')===entry.svc))),true,
  'every embedded calendar service must exactly match a tariff service for that carrier and mode');
assert.ok(tariffs.some(t => t.tr === 'E-SOA' && t.mode === 'Avion' && t.svc === 'Express'));
const eSoaGeneralNormal = tariffs.find(t => t.tr === 'E-SOA' && t.mode === 'Avion' && t.svc === 'Normal' && t.cats === 'Général');
const eSoaGeneralExpress = tariffs.find(t => t.tr === 'E-SOA' && t.mode === 'Avion' && t.svc === 'Express' && t.cats === 'Général');
const eSoaHazardousNormal = tariffs.find(t => t.tr === 'E-SOA' && t.mode === 'Avion' && t.svc === 'Normal' && t.cats === 'Poudre/liquide; Aimant');
const eSoaMaritimeBattery = tariffs.find(t => t.tr === 'E-SOA' && t.mode === 'Maritime' && t.cats === 'Batterie');
assert.deepEqual(
  [eSoaGeneralNormal.tarif, eSoaGeneralNormal.d1, eSoaGeneralNormal.c1, eSoaGeneralNormal.dmin, eSoaGeneralNormal.dmax],
  [65800, 'Lundi', 2, 7, 10],
  'E-SOA normal general price, Monday departure/cutoff, and transit days should match the reference');
assert.deepEqual(
  [eSoaGeneralExpress.tarif, eSoaGeneralExpress.d1, eSoaGeneralExpress.c1, eSoaGeneralExpress.d2, eSoaGeneralExpress.c2, eSoaGeneralExpress.dmin, eSoaGeneralExpress.dmax],
  [78800, 'Lundi', 2, 'Jeudi', 1, 3, 5],
  'E-SOA express price, Monday/Thursday departures/cutoffs, and transit days should match the reference');
assert.equal(eSoaHazardousNormal.tarif, 88000, 'E-SOA poudre/liquide and aimant price should match the reference');
assert.deepEqual([maritime.tarif, eSoaMaritimeBattery.tarif, maritime.unit, eSoaMaritimeBattery.unit, maritime.dmin, maritime.dmax],
  [360, 425, 'm³', 'm³', 45, 60],
  'E-SOA maritime general/battery prices, unit, and transit days should match the reference');

const maritimeDate = { tr: 'E-SOA', mode: 'Maritime', svc: '', date: '2026-10-20', note: '' };
const maritimeResult = calculate(maritime, [maritimeDate]);
assert.equal(maritimeResult.sel.F, run("dayNum('2026-10-20')"), 'E-SOA Maritime should resolve its offer name directly');
context.testResult = maritimeResult;
assert.equal(run('snapshot(testInput,testResult,testParams).svc'), 'Maritime',
  'saved results should display Maritime without a duplicate service name');

const airWithoutWeekly = { ...airNormal, d1: null, d2: null };
const airResult = calculate(airWithoutWeekly, [maritimeDate]);
assert.equal(airResult.sel.F, null, 'a maritime published date must not appear for air');

const asiaFast = tariffs.find(t => t.tr.includes('Asie') && t.mode === 'Avion' && t.svc === 'Fast');
assert.ok(asiaFast);
const asiaResult = calculate(asiaFast, seedCalendar);
const asiaArrival = run("dayNum('2026-10-10')") + 2 + 16 / 24;
const asiaCutoff = Math.ceil(asiaArrival + Number(asiaFast.c1 || 0) - Number(asiaFast.h || 0) / 24);
const expectedAsiaDate = Math.min(...seedCalendar
  .filter(c => c.tr === asiaFast.tr && c.mode === 'Avion' && c.svc === asiaFast.svc)
  .map(c => run(`dayNum('${c.date}')`))
  .filter(date => date >= asiaCutoff));
assert.equal(asiaResult.sel.F, expectedAsiaDate, 'Importation de l’Asie Fast should use its Avion dates');
assert.equal(asiaResult.sel.calendarEntry.svc, 'Fast',
  'the selected Fast departure must retain the exact tariff service value');

const unmapped = { ...airWithoutWeekly, tr: 'Transitaire sans correspondance' };
const unmatched = calculate(unmapped, [
  { tr: unmapped.tr, mode: unmapped.mode, svc: 'Avion express', date: '2026-10-20', note: '' },
]);
assert.equal(unmatched.sel.F, null, 'a different offer service must not consume this tariff service date');
assert.match(unmatched.sel.calendarNotice, /Aucune date publiée/);

const fastNearCutoff = { ...asiaFast };
const nearCalendar = [{ tr: fastNearCutoff.tr, mode: 'Avion', svc: fastNearCutoff.svc, date: '2026-10-14', note: '' }];
const excludeResult = calculate(fastNearCutoff, nearCalendar, { pay: '2026-10-11', params: { calendarClosePolicy: 'exclude' } });
assert.equal(excludeResult.sel.F, null, 'close dates should be excluded by default');
assert.equal(excludeResult.sel.excludedDates.length, 1);
context.testResult = excludeResult.sel;
assert.match(run(`calendarFeedback(testResult)[0]`), /après l’heure limite/);

context.testResult = calculate(fastNearCutoff, nearCalendar, { pay: '2026-10-11', params: { calendarClosePolicy: 'keep' } }).sel;
const keepResult = context.testResult;
assert.equal(keepResult.F, run("dayNum('2026-10-14')"), 'keep policy should allow a close future date');
assert.equal(keepResult.keptCloseDate.date, run("dayNum('2026-10-14')"));
assert.match(run('calendarFeedback(testResult)[0]'), /conservé malgré l’heure limite/);

const sameDayCalendar = [{ tr: fastNearCutoff.tr, mode: 'Avion', svc: fastNearCutoff.svc, date: '2026-10-13', note: '' }];
const sameDayExclude = calculate(fastNearCutoff, sameDayCalendar, { pay: '2026-10-11', params: { calendarClosePolicy: 'exclude' } });
assert.equal(sameDayExclude.sel.F, null);
assert.equal(sameDayExclude.sel.excludedDates.length, 1, 'same-day close dates must also be explained');
const sameDayKeep = calculate(fastNearCutoff, sameDayCalendar, { pay: '2026-10-11', params: { calendarClosePolicy: 'keep' } });
assert.equal(sameDayKeep.sel.F, run("dayNum('2026-10-13')"));

const legacy = run(`normAll({
  params: {calendarMappings:[
    {tr:'E-SOA',mode:'Maritime',serviceQuote:'Maritime standard',serviceCalendar:'Standard Maritime'},
    {tr:'Importation de l’Asie',mode:'Avion',serviceQuote:'Fast',serviceCalendar:'Fast'},
    {tr:'E-SOA',mode:'Avion',serviceQuote:'Avion standard',serviceCalendar:'Nom personnalisé'}
  ]},
  tarifs: S.tarifs.map(t=>t.mode==='Maritime'?{...t,svc:'Standard'}:t),
  cal: [
    {tr:'Importation de l’Asie',svc:'Fast',date:'2026-10-20',note:''},
    {tr:'E-SOA',svc:'Standard',date:'2026-10-20',note:''},
    {tr:'E-SOA',mode:'Maritime',svc:'Standard Maritime',date:'2026-10-22',note:''},
    {tr:'Importation Express',mode:'Maritime',svc:'Standard',date:'2026-10-24',note:''},
    {tr:'E-SOA',mode:'Avion',svc:'Nom personnalisé',date:'2026-10-25',note:''}
  ],
  quotes:[{no:'ARCHIVE-1',inputs:exampleDraft('ARCHIVE-1'),offer:'E-SOA | Maritime standard | Général',
    res:{svc:'Maritime Standard',depart:12345,costP:1000}}],
  draft:{...exampleDraft('MIGRATION'),mode:'manuel',offer:'E-SOA | Maritime standard | Général'}
})`);
context.legacy = legacy;
assert.equal(legacy.draft.offer, 'E-SOA | Maritime | Général',
  'the active draft should migrate to the E-SOA Maritime offer label');
assert.equal(legacy.quotes[0].offer, 'E-SOA | Maritime standard | Général');
assert.equal(legacy.quotes[0].res.svc, 'Maritime Standard');
assert.equal(legacy.quotes[0].res.depart, 12345,
  'saved quote snapshots and dates should not be rewritten');
assert.equal(legacy.cal[0].mode, 'Avion', 'unambiguous legacy dates should acquire their unique mode');
assert.equal(legacy.cal[0].svc, 'Fast', 'legacy calendar names should migrate to exact tariff service names');
assert.equal(legacy.cal[1].mode, '', 'ambiguous legacy Standard dates must not be assigned to both modes');
assert.equal(legacy.cal[1].svc, 'Standard', 'ambiguous legacy names should be preserved, not guessed');
assert.equal(legacy.cal[2].svc, '', 'old E-SOA calendar labels should migrate to an empty service');
assert.equal(legacy.cal[2].date, '2026-10-22', 'calendar dates must survive service migration');
assert.equal(legacy.cal[3].svc, '', 'Maritime calendar services should be cleared for every carrier');
assert.equal(legacy.cal[3].date, '2026-10-24', 'non-E-SOA Maritime calendar dates must survive service migration');
assert.equal(legacy.cal[4].svc, 'Normal', 'legacy E-SOA Avion Standard mappings should migrate to Normal');
assert.equal(legacy.tarifs.filter(t => t.tr === 'E-SOA' && t.mode === 'Avion' && t.svc === 'Standard').length, 0,
  'stored E-SOA Avion Standard tariffs should be normalized to Normal');
assert.equal(legacy.tarifs.filter(t => t.mode === 'Maritime' && t.svc !== '').length, 0,
  'stored Maritime tariff services should be empty for every carrier');
assert.equal(legacy.params.calendarMappings, undefined, 'the user mapping layer should be removed after migration');
assert.equal(legacy.params.calendarServiceVersion, 4);
const migratedAgain = run('normAll(legacy)');
assert.deepEqual(JSON.parse(JSON.stringify(migratedAgain.cal)), JSON.parse(JSON.stringify(legacy.cal)), 'migration must be idempotent');
const versionOneLegacy = run(`normAll({
  params:{calendarServiceVersion:3},
  tarifs:S.tarifs.map(t=>t.tr==='E-SOA'&&t.mode==='Maritime'?{...t,svc:'Standard'}:t),
  cal:[{tr:'E-SOA',mode:'Maritime',svc:'Maritime standard',date:'2026-10-25',note:''}],
  quotes:[],draft:exampleDraft('MIGRATION-V1')
})`);
assert.equal(versionOneLegacy.cal[0].svc, '',
  'already-migrated calendar rows should follow the corrected E-SOA Maritime service name');

const maritimeUseCaseCalendar = [
  { tr: 'E-SOA', mode: 'Maritime', svc: '', date: '2026-10-20', note: 'Départ publié 1' },
  { tr: 'E-SOA', mode: 'Maritime', svc: '', date: '2026-11-03', note: 'Départ publié 2' },
];
const maritimeUseCase = calculate(maritime, maritimeUseCaseCalendar, {
  pay: '2026-10-15', delay: 2, hour: 16,
});
assert.equal(maritimeUseCase.sel.label, 'E-SOA | Maritime | Général');
assert.equal(maritimeUseCase.sel.calendarEntry.date, '2026-10-20',
  'a new General E-SOA Maritime quote should select the first eligible published sailing');
assert.deepEqual(maritimeUseCaseCalendar.map(entry => entry.date), ['2026-10-20', '2026-11-03'],
  'both matching published E-SOA Maritime dates remain available to the calendar');
console.log('E-SOA Maritime test quote:', JSON.stringify({
  offer: maritimeUseCase.sel.label,
  matchedService: maritimeUseCase.sel.t.svc,
  departuresDisplayed: maritimeUseCaseCalendar.map(entry => entry.date),
  selectedDeparture: maritimeUseCase.sel.calendarEntry.date,
  estimatedArrival: run(`dayStr(${maritimeUseCase.sel.I})`),
}));

console.log('PASS: tariff/calendar service equality, E-SOA Avion Normal/Express and empty Maritime service, mode isolation, unchanged archived snapshots, E-SOA Maritime test quote and dates, no-match handling, cutoff feedback, and safe migration.');
