# Devis Transitaires — application mobile

Application Android (et iOS, voir plus bas) construite à partir de la version bureau `..\desktop\Devis Transitaires.html`, avec Capacitor. Aucune donnée n’est envoyée à un serveur : les devis, les tarifs et les paramètres sont enregistrés sur le téléphone.

## Contenu

- `www/index.html` : page servie à l’application. **Fichier généré, ne pas le modifier à la main.**
- `mobile-overlay.html` : couche propre au mobile (navigation basse, « Plus », fenêtres en bas d’écran, etc.), ajoutée à la version bureau.
- `build-www.cjs` : génère `www/index.html` = version bureau + `mobile-overlay.html`.
- `capacitor.config.json` : identifiant de l’application (`com.ms2026.chinadevisapp`) et dossier web (`www`).
- `android/` : projet Android natif généré par Capacitor.

Pour modifier l’application : éditer `desktop\Devis Transitaires.html` (ce qui est commun aux deux versions) ou `mobile-overlay.html` (ce qui est propre au mobile). Puis :

```
node build-www.cjs
npx cap sync android
```

## Construire l’APK Android

Prérequis, tous gratuits : Android SDK (déjà présent dans `AppData\Local\Android\Sdk`) et un JDK 21.

```
cd "C:\Users\My PC\Documents\ChatGPT\CHINA Devis APP\mobile-app"
npx cap sync android
cd android
gradlew.bat assembleDebug
```

Première fois sur ce PC : le fichier `android\local.properties` doit contenir `sdk.dir=C\:/Users/My PC/AppData/Local/Android/Sdk` (sinon Gradle répond « SDK location not found »).

L’APK officiel se trouve dans `android/app/build/outputs/apk/debug/app-debug.apk`. Installez ce fichier sur le téléphone. Autorisez l’installation depuis une source inconnue pour le gestionnaire de fichiers.

## Données sur le téléphone

- Les devis et réglages sont conservés par l’application, sur le téléphone.
- **Désinstaller l’application efface ces données.** Exportez une sauvegarde JSON (Paramètres → Sauvegarde) avant toute désinstallation ou changement de téléphone.
- Changer de téléphone : installer l’application sur le nouveau téléphone, puis restaurer la sauvegarde JSON.

## iOS

Une application iPhone ne peut être construite que sur un Mac avec Xcode. Sans Mac, il n’est pas possible de produire la version iOS.

- Installation sur votre propre iPhone depuis un Mac avec un identifiant Apple gratuit : possible, mais l’application expire après 7 jours et doit être réinstallée.
- Distribution via l’App Store ou TestFlight : nécessite le compte développeur Apple (payant, 99 USD par an).

## Versions

- Capacitor 8.5.3 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`).
