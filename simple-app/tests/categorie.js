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
  ['Écouteurs bluetooth sans fil', 'Électronique'], ['Casque microphone gaming', 'Électronique'],
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

// Sans/Bluetooth : l’application demande si le produit contient une batterie. Le jeu simule la réponse
// d’après l’étiquette (Batterie → oui, Électronique → non). Sans réponse, le score est affiché à part.
const cases = data.filter(x => x.category !== 'Aimant');
let ok = 0, sansReponse = 0;
const erreurs = {};
for (const x of cases) {
  const batt = x.category === 'Batterie' ? true : x.category === 'Électronique' ? false : undefined;
  const got = guessCat(x.name, batt) || 'null';
  if (got === x.category) ok++;
  else (erreurs[`${x.category} → ${got}`] ||= []).push(x.name);
  if ((guessCat(x.name) || 'null') === x.category) sansReponse++;
}
console.log(`Jeu de tests (hors Aimant, réponse batterie simulée) : ${ok}/${cases.length} (${Math.round(100 * ok / cases.length)} %)`);
console.log(`Sans réponse batterie : ${sansReponse}/${cases.length}`);
for (const [k, list] of Object.entries(erreurs).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n${k} (${list.length})`);
  list.forEach(n => console.log('   ' + n));
}
