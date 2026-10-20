# Hygo — devis simple

Version web simplifiée de l’outil de devis d’importation (Chine → Madagascar). Un seul écran pour saisir un produit et obtenir le meilleur prix de revient, le prix de vente conseillé et la date d’arrivée estimée. Fonctionne sur iPhone, Android et ordinateur, sans passer par un store.

## Contenu

- `index.html` : la page (style, structure).
- `js/engine.js` : moteur de calcul, copié à l’identique de `desktop/Devis Transitaires.html` (de `const SEED` à `snapshot`). Seule la clé de stockage change (`hygo-v1`).
- `js/app.js` : interface (devis, historique, tarifs et calendrier, réglages, sauvegarde).
- `sw.js` : cache hors ligne (réseau d’abord, cache en secours).
- `manifest.webmanifest`, `icon-*.png`, `apple-touch-icon.png` : installation sur l’écran d’accueil.
- `favicon.svg` : icône du navigateur. `icon-full.svg` : source carrée des icônes PNG (à régénérer si l’icône change).

## Design system « Midnight Finance »

Tous les styles passent par les variables définies en tête de `index.html` (`:root`) : couleurs, typographie, espacements, rayons, matériau et durées d’animation. Ne mettez pas de code couleur directement dans un composant.

- **Thème** : chaque couleur est définie avec `light-dark(clair, sombre)`. Par défaut, l’app suit le mode du système ; Réglages → Apparence (ou le bouton lune/soleil) force le clair ou le sombre (`html[data-theme]`).
- **Couleurs** : violet pour les actions principales et la sélection, vert pour un résultat positif, rouge pour un résultat négatif ou une erreur, ambre pour un avertissement. Une information n’est jamais portée par la couleur seule : chaque état a aussi une icône (✓, !, ✕) ou un signe (+).
- **Verre (Liquid Glass)** : réservé à la barre d’onglets, à la feuille de comparaison, au bouton de thème, aux notifications et à la confirmation d’enregistrement. Les cartes, listes et champs sont des surfaces pleines. Avec « Réduire la transparence », le verre devient une surface pleine.
- **Typographie** : police du système (SF Pro sur iOS, Roboto sur Android), chiffres tabulaires pour les montants, tailles en `rem` qui suivent la taille de texte d’iOS.
- **Mouvement** : 150 à 300 ms, sans animation permanente ; tout est désactivé avec « Réduire les animations ».

## Validation de la saisie

Les contrôles (nom, prix, dimensions, poids, transport, marge, date) sont recalculés à chaque frappe et affichés sous forme de pastilles. Une erreur n’apparaît sous un champ qu’après l’avoir quitté, ou après une tentative d’enregistrement ; le curseur va alors sur le premier champ à corriger. Rien n’est enregistré tant qu’un contrôle bloquant n’est pas résolu.

## Données

Les données sont stockées dans le navigateur de l’appareil (`localStorage`). Elles ne sont envoyées à aucun serveur. Chaque appareil a donc ses propres données : exportez une sauvegarde JSON (Réglages → Sauvegarde) pour les transférer.

Une sauvegarde exportée depuis la version bureau (`Devis Transitaires`) peut être importée ici.

## Utilisation sur téléphone

1. Ouvrir l’adresse de l’application dans Safari (iPhone) ou Chrome (Android).
2. iPhone : Partager → « Sur l’écran d’accueil ». Android : menu → « Installer l’application ».

L’adresse doit commencer par `https://` pour que l’installation et le mode hors ligne fonctionnent.

## Mettre à jour le moteur de calcul

Le moteur est une copie de la version bureau. Si une formule ou un tarif change dans `desktop/Devis Transitaires.html`, reportez le même changement dans `js/engine.js`, puis vérifiez le résultat sur un produit d’exemple dans les deux versions.
