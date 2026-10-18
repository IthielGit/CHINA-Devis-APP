// Génère www/index.html : version bureau (desktop/) + couche mobile (mobile-overlay.html).
// Ne modifiez pas www/index.html à la main : modifiez desktop/ ou mobile-overlay.html, puis relancez ce script.
const fs = require('node:fs');
const path = require('node:path');
const desktop = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'Devis Transitaires.html'), 'utf8');
const overlay = fs.readFileSync(path.join(__dirname, 'mobile-overlay.html'), 'utf8');
const stamp = new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Indian/Antananarivo'}).format(new Date()).replace(', ',' ');
const overlayBuilt = overlay.replace('__BUILD__', stamp);
const end = desktop.match(/<\/body>\s*<\/html>\s*$/);
if (!end) throw new Error('Fin de page </body></html> introuvable dans la version bureau');
fs.writeFileSync(path.join(__dirname, 'www', 'index.html'), desktop.slice(0, end.index) + overlayBuilt + '</body></html>\n');
console.log('www/index.html généré');
