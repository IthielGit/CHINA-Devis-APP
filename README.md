# Hygo — devis simple

Version web simplifiée de l’outil de devis d’importation (Chine → Madagascar). Un seul écran pour saisir un produit et obtenir le meilleur prix de revient, le prix de vente conseillé et la date d’arrivée estimée. Fonctionne sur iPhone, Android et ordinateur, sans passer par un store.

## Contenu

- `index.html` : la page (style, structure).
- `js/engine.js` : moteur de calcul, copié à l’identique de `desktop/Devis Transitaires.html` (de `const SEED` à `snapshot`). Seule la clé de stockage change (`hygo-v1`).
- `js/app.js` : interface (devis, historique, tarifs et calendrier, réglages, sauvegarde).
- `sw.js` : cache hors ligne (réseau d’abord, cache en secours).
- `manifest.webmanifest`, `icon-*.png`, `apple-touch-icon.png` : installation sur l’écran d’accueil.

## Données

Les données sont stockées dans le navigateur de l’appareil (`localStorage`). Elles ne sont envoyées à aucun serveur. Chaque appareil a donc ses propres données : exportez une sauvegarde JSON (Réglages → Sauvegarde) pour les transférer.

Une sauvegarde exportée depuis la version bureau (`Devis Transitaires`) peut être importée ici.

## Utilisation sur téléphone

1. Ouvrir l’adresse de l’application dans Safari (iPhone) ou Chrome (Android).
2. iPhone : Partager → « Sur l’écran d’accueil ». Android : menu → « Installer l’application ».

L’adresse doit commencer par `https://` pour que l’installation et le mode hors ligne fonctionnent.

## Mettre à jour le moteur de calcul

Le moteur est une copie de la version bureau. Si une formule ou un tarif change dans `desktop/Devis Transitaires.html`, reportez le même changement dans `js/engine.js`, puis vérifiez le résultat sur un produit d’exemple dans les deux versions.
