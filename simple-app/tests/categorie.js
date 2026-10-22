/* Mesure la suggestion de catégorie (js/engine.js) sur un jeu de tests étiqueté.
   Usage : node tests/categorie.js chemin/vers/jeu_de_tests_produits.json
   Les produits « Aimant » sont exclus : cette catégorie dépend du poids des aimants, pas du nom. */
const fs = require('fs');
const path = require('path');

const enginePath = path.join(__dirname, '..', 'js', 'engine.js');
const src = fs.readFileSync(enginePath, 'utf8');
const start = src.indexOf('const normCat='), end = src.indexOf('function categoryRecommendation');
const S = { quotes: [] };
eval(src.slice(start, end) + ';global.guessCat = guessCat; global.S = S;');

const file = process.argv[2];
if (!file) { console.error('Usage : node tests/categorie.js <jeu_de_tests.json>'); process.exit(1); }
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// Cas de base : ce que l’on attend clairement (indépendant du fichier).
const BASE = [
  ['Spray anti-pluie 50 ml', 'Poudre/liquide'], ['Chargeur téléphone USB-C 20W', 'Électronique'],
  ['Écouteurs bluetooth sans fil', 'Batterie'], ['Casque microphone gaming', 'Électronique'],
  ['Power bank 10000 mAh', 'Batterie'], ['Batterie 18650 seule', 'Batterie brute'],
  ['Smartphone Xiaomi 128 Go', 'Téléphone'], ['Lampe LED bureau', 'Électronique'],
  ['Montre connectée', 'Batterie'], ['Crème hydratante visage', 'Poudre/liquide'],
  ['Ordinateur portable 15 pouces', 'Ordinateur/tablette'], ['Laptop stand aluminium', 'Général'],
  ['Câble USB 2m', 'Électronique'], ['Pile AA alcaline', 'Batterie'],
  ['Sac à dos voyage', 'Général'], ['Jouet en peluche', 'Général'], ['Cartes mémoire microSD', 'null'],
  ['Gel douche 500 ml', 'Poudre/liquide'],
];

let base = 0;
for (const [name, expected] of BASE) {
  const got = guessCat(name) || 'null';
  if (got === expected) base++;
  else console.log(`  base  ${name} → ${got} (attendu ${expected})`);
}
console.log(`Cas de base : ${base}/${BASE.length}`);

const cases = data.filter(x => x.category !== 'Aimant');
let ok = 0;
const erreurs = {};
for (const x of cases) {
  const got = guessCat(x.name) || 'null';
  if (got === x.category) ok++;
  else (erreurs[`${x.category} → ${got}`] ||= []).push(x.name);
}
console.log(`Jeu de tests (hors Aimant) : ${ok}/${cases.length} (${Math.round(100 * ok / cases.length)} %)`);
for (const [k, list] of Object.entries(erreurs).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n${k} (${list.length})`);
  list.forEach(n => console.log('   ' + n));
}
