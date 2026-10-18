
# Prompt de développement : Ajouter un workflow complet aux devis transitaires

## 1. Objectif

Je souhaite faire évoluer mon application existante de calcul de devis pour l'importation de produits depuis la Chine vers Madagascar, notamment via Pinduoduo.

L'application actuelle sert à calculer les coûts d'achat et de transport, comparer les offres des transitaires, prévoir les dates d'arrivée et calculer les prix de vente et les marges.

Je souhaite maintenant ajouter un workflow de suivi des devis et des importations, avec des statuts persistants, un historique des changements, un suivi logistique, le contrôle de réception et une distinction entre les produits destinés à ma boutique et ceux commandés pour un client.

**Le système de statuts doit être implémenté de bout en bout. Il ne suffit pas d'ajouter un champ dans un formulaire.**

## 2. Commencer par auditer le code existant

Avant toute modification, inspecte le fichier HTML et le JavaScript réellement utilisés dans l'application.

La documentation décrit une architecture comprenant :

- Un fichier HTML autonome avec CSS et JavaScript intégrés.
- Un état global `S`.
- Un brouillon courant `S.draft`.
- Des devis enregistrés dans `S.quotes`.
- Une sauvegarde locale avec `localStorage`, sous la clé `devis-transitaires-v1`.
- Des fonctions de calcul, de validation, de rendu et de persistance.
- Un historique des devis, des paiements groupés, des tarifs et un calendrier des départs.

Utilise le code présent comme référence finale. Si les noms des propriétés ou les fonctions ont changé, adapte les modifications à leur implémentation réelle.

Avant de coder, identifie les fichiers concernés, les structures de données existantes, les fonctions de sauvegarde et les contrôles de validation.

Ne réécris pas l'application avec React, un autre framework ou un backend. Conserve l'architecture actuelle en JavaScript natif, sauf contrainte technique démontrée.

## 3. Implémenter les statuts

Crée un système de statuts persistant pour les devis enregistrés. Ajoute le statut au brouillon courant et aux devis de l'historique.

Utilise les statuts suivants :

| Statut | Signification |
|---|---|
| `Brouillon` | Devis en préparation, modifiable. |
| `Confirmé` | Devis validé et décision d'achat prise. |
| `Commandé en Chine` | Achat effectué auprès du fournisseur. |
| `En transit vers Madagascar` | Marchandises expédiées vers Madagascar. |
| `Arrivé à Madagascar` | Arrivée physique confirmée. |
| `À récupérer` | Colis en attente de retrait ou de formalités. |
| `Récupéré` | Colis retiré auprès du transitaire. |
| `Contrôle de réception` | Vérification des quantités et de l'état des produits. |
| `Stock boutique` | Réception validée et produits acceptés enregistrés en stock. |
| `À livrer` | Produits destinés à un client et en attente de livraison. |
| `Livré au client` | Livraison au client confirmée. |
| `Annulé` | Dossier clôturé avec un motif d'annulation. |

Lorsqu'un nouveau brouillon est créé, son statut initial est automatiquement `Brouillon`.

Lorsqu'un devis est enregistré dans l'historique, sauvegarde son statut avec les autres données du devis.

Le statut doit rester identique après actualisation de la page et redémarrage du navigateur.

## 4. Workflow à implémenter

### Parcours principal

`Brouillon → Confirmé → Commandé en Chine → En transit vers Madagascar → Arrivé à Madagascar → À récupérer → Récupéré → Contrôle de réception`

### Branche A : produits destinés à la boutique

`Contrôle de réception → Stock boutique`

Après validation de la réception, enregistre les quantités acceptées dans un registre de stock local.

### Branche B : produits destinés à un client

`Contrôle de réception → À livrer → Livré au client`

Le dossier doit comporter les informations du client et les données nécessaires à la livraison.

### Annulation

`Annulé` est un statut de clôture distinct.

Autorise l'annulation uniquement aux étapes compatibles avec cette action. Après un achat, conserve les dépenses, les éventuels remboursements et les frais non récupérables.

Une annulation ne doit jamais supprimer le dossier ni effacer son historique.

## 5. Ajouter le champ Destination

Ajoute un champ `Destination` avec les valeurs suivantes :

- `Stock boutique`
- `Commande client`

Ce champ doit être renseigné au plus tard avant la confirmation du devis.

Pour `Stock boutique`, aucun client n'est obligatoire.

Pour `Commande client`, demande les informations du client avant le lancement du parcours de livraison.

La destination détermine le chemin suivi après le contrôle de réception. Elle ne doit pas être confondue avec le statut.

## 6. Adapter le modèle de données existant

Ne crée pas un second système de devis indépendant du système existant.

Complète les enregistrements déjà utilisés par `S.quotes` et `S.draft`, en gardant leurs champs actuels.

Chaque devis enregistré doit conserver :

- Son numéro existant.
- Sa date de création et sa date de modification.
- Ses entrées dans `inputs`.
- Ses résultats calculés dans `res`.
- Son offre de transport sélectionnée.
- Son statut actuel.
- Sa destination.
- Les informations de suivi logistique.
- L'historique des statuts.
- L'historique des modifications de dates.
- Les dépenses réelles liées à l'importation.
- Les informations de réception.
- Les informations de livraison, si le dossier concerne un client.

Si le code dispose déjà d'une structure équivalente, réutilise-la.

Ne remplace pas les données enregistrées dans `inputs` et `res` par les données opérationnelles. Elles servent à conserver la simulation et le devis initial.

### Historique des statuts

Ajoute une structure dédiée, par exemple `statusHistory`.

Chaque événement doit comporter :

- L'ancien statut.
- Le nouveau statut.
- La date et l'heure.
- Le motif ou le commentaire.
- L'utilisateur, si l'application dispose d'une identité utilisateur.

Si l'application fonctionne sans compte utilisateur, conserve au minimum la date, l'heure, les deux statuts et le commentaire.

L'historique doit être consultable depuis la fiche détaillée du devis.

## 7. Distinguer le devis du suivi opérationnel

L'application calcule actuellement un devis et enregistre une copie des résultats. Préserve ce fonctionnement.

Lorsqu'un devis passe à `Confirmé`, conserve une copie de ses entrées, de ses résultats et des hypothèses tarifaires nécessaires à l'audit.

Lorsqu'il passe à `Commandé en Chine`, enregistre les informations de la commande réelle :

- Plateforme d'achat.
- Fournisseur.
- Référence Pinduoduo.
- Date de commande.
- Montant effectivement payé.
- Quantité commandée.
- Référence du colis, lorsqu'elle existe.

Ne recalcule pas silencieusement l'ancien devis à partir des tarifs actuels à chaque changement de statut.

Si l'utilisateur souhaite corriger un devis confirmé, prévois une action explicite de révision qui conserve la version antérieure ou un historique de révision.

Préserve les règles existantes de modification, duplication et suppression des devis, en les adaptant au nouveau workflow. Une action de suppression ne doit pas effacer un dossier ayant déjà des opérations d'achat, de transport, de réception ou de stock sans un traitement explicite et sécurisé.

## 8. Suivi des dates logistiques

Les changements de dates du transitaire ne sont pas des statuts.

Ajoute les champs nécessaires au suivi des dates :

- Date de paiement au vendeur.
- Date d'expédition depuis la Chine.
- Date d'arrivée prévue initiale.
- Dernière date d'arrivée prévue.
- Date d'arrivée réelle à Madagascar.
- Date à laquelle le colis est disponible au retrait.
- Date de retrait.
- Date de livraison au client, si applicable.

À chaque modification d'une date estimée, conserve :

- L'ancienne date.
- La nouvelle date.
- Le motif.
- La date et l'heure de modification.

Une commande dont l'arrivée est retardée reste au statut `En transit vers Madagascar` tant qu'aucun événement ne justifie un changement de statut.

Utilise les calculs de dates existants pour les estimations initiales. Distingue clairement ces estimations des dates réelles renseignées lors du suivi.

Ne simule pas un suivi automatique du transporteur. Les informations de suivi sont saisies manuellement, car l'application ne dispose pas d'une connexion aux systèmes des transitaires.

## 9. Ajouter le contrôle de réception

Après le retrait, le dossier passe à `Contrôle de réception`.

Prévois un formulaire permettant de comparer :

- Quantité commandée.
- Quantité expédiée, si connue.
- Quantité reçue.
- Quantité acceptée.
- Quantité manquante.
- Quantité endommagée ou non conforme.

Enregistre la date de réception et les observations.

Exemple : 20 unités commandées, 17 reçues, dont 1 endommagée.

Le système doit enregistrer les quantités reçues et acceptées séparément. Il ne doit pas considérer automatiquement les 20 unités comme disponibles.

Prévois un suivi des réclamations, remboursements, remplacements et incidents.

Si plusieurs livraisons partielles sont reçues pour un même dossier, autorise plusieurs opérations de réception sans créer un nouveau devis.

## 10. Gérer les coûts estimés et les dépenses réelles

L'application dispose déjà d'un moteur de calcul des coûts, des prix de vente et des marges. Conserve ce moteur et ajoute un suivi distinct des coûts réellement supportés.

Ne remplace pas les frais estimés existants par les dépenses constatées.

Ajoute un registre de dépenses réelles comportant :

- La catégorie de dépense.
- Le montant.
- La devise.
- Le taux de conversion utilisé.
- La date du paiement.
- Le commentaire.
- Le justificatif, si cette fonctionnalité est disponible.

Catégories initiales :

- Achat fournisseur.
- Livraison en Chine.
- Transport international.
- Frais du transitaire.
- Droits et frais de douane, lorsqu'ils s'appliquent.
- Transport local.
- Manutention.
- Autres dépenses.

Affiche ensuite :

- Coût total estimé.
- Coût total réel des dépenses enregistrées.
- Écart en ariary.
- Écart en pourcentage.
- Coût de revient réel par unité acceptée.
- Prix de vente prévu.
- Marge estimée et marge recalculée à partir des coûts réels.

Le coût réel doit être calculé à partir des dépenses effectivement enregistrées et des quantités acceptées.

Pour les frais communs à plusieurs devis, préserve les fonctionnalités existantes de regroupement et de répartition des paiements. Ne modifie pas leur historique de répartition ni leur mécanisme d'annulation.

Prévois une règle explicite d'allocation des dépenses communes entre plusieurs produits.

## 11. Ajouter une gestion minimale du stock boutique

L'application actuelle est un calculateur d'importation, et non un logiciel complet de gestion de stock. Ne construis pas un ERP complet dans cette modification.

Ajoute uniquement les fonctionnalités nécessaires pour suivre les quantités reçues pour la boutique.

Lors du passage à `Stock boutique`, crée une entrée de stock avec :

- Le produit.
- Le numéro du dossier d'importation.
- La date d'entrée.
- La quantité acceptée.
- La quantité endommagée exclue du stock disponible.
- Le coût de revient unitaire calculé.
- Les observations éventuelles.

Le stock disponible doit correspondre aux quantités réellement acceptées, sans inclure les unités manquantes ou non conformes.

Une transition répétée ou un double clic ne doit jamais créer une seconde entrée identique.

Conserve le modèle actuel d'un produit par devis, répété sur une quantité. Ne transforme pas le moteur de calcul en système multi-produits dans cette tâche.

## 12. Ajouter le suivi de livraison client

Pour la destination `Commande client`, conserve les informations suivantes :

- Nom du client.
- Téléphone ou moyen de contact.
- Adresse de livraison.
- Quantité à livrer.
- Frais de livraison.
- Date prévue.
- Date réelle.
- Statut de livraison.
- Confirmation de réception.
- Commentaire éventuel.

Après le contrôle de réception, le dossier passe à `À livrer`. Après confirmation de la livraison, il passe à `Livré au client`.

Ne confonds pas la date estimée d'arrivée à Madagascar avec la date de livraison au client.

N'ajoute pas automatiquement des paiements clients ou une comptabilité de vente complète. Ces fonctionnalités sont hors périmètre de cette tâche.

## 13. Adapter l'interface existante

Conserve le style graphique, la navigation, les thèmes et la présentation responsive déjà en place.

### Vue Devis

Ajoute le statut et la destination. Prévois les actions cohérentes avec le stade courant.

Le statut initial est `Brouillon`. La confirmation déclenche une validation des champs nécessaires.

### Vue Historique

Ajoute les éléments suivants à la liste :

- Statut.
- Destination.
- Dernière date d'arrivée prévue.
- Indicateur de retard.
- Coût estimé.
- Coût réel disponible, une fois les dépenses enregistrées.

Ajoute des filtres par statut, destination, période et transitaire. Préserve la recherche actuelle par produit et numéro de devis.

### Fiche détaillée du devis

Affiche les entrées et résultats du devis initial, le statut actuel, la chronologie des événements, les dates, les dépenses, les réceptions et les informations de livraison.

Les actions disponibles doivent dépendre du statut actuel.

### Tableau de bord

Ajoute une vue synthétique des dossiers :

- Brouillons.
- Devis confirmés en attente d'achat.
- Commandes passées en Chine.
- Expéditions en cours.
- Colis arrivés à Madagascar.
- Colis à récupérer.
- Réceptions à contrôler.
- Produits entrés en stock boutique.
- Livraisons clients en attente.
- Livraisons terminées.
- Dossiers annulés.
- Montants engagés et écarts de coûts.

Ajoute des liens vers les dossiers concernés.

N'introduis pas de faux indicateurs ou de données simulées.

## 14. Persistance locale, sauvegarde et migration

L'application utilise `localStorage` et exporte ses données dans un fichier JSON. Intègre tous les nouveaux champs à ces mécanismes.

Lors de la modification :

- Mets à jour les fonctions d'initialisation du brouillon.
- Mets à jour les fonctions de normalisation de l'état et des devis enregistrés.
- Mets à jour la sauvegarde automatique.
- Mets à jour l'enregistrement des devis.
- Mets à jour l'export et l'import JSON.
- Maintiens la compatibilité avec les sauvegardes antérieures.
- Préserve les paramètres, tarifs, calendriers et groupes de paiements.
- Vérifie les fonctions de restauration des paiements groupés.

Si le schéma de données change, ajoute une migration idempotente. Une même migration exécutée plusieurs fois ne doit pas réinitialiser les statuts ni supprimer l'historique.

### Traitement des anciens devis

Les devis existants n'ont pas tous un historique de leur avancement opérationnel.

Ne leur attribue pas arbitrairement un statut avancé.

Si aucun statut n'existe dans les données actuelles, affecte `Brouillon` aux anciens devis non classés et ajoute un indicateur de vérification manuelle. L'utilisateur doit pouvoir corriger leur statut.

Si le code source contient des statuts d'une version antérieure, inspecte leur signification avant de les convertir. Conserve leur valeur d'origine dans les données de migration lorsqu'une correspondance certaine avec le nouveau workflow n'existe pas.

L'importation JSON remplace actuellement l'état local. Ne transforme pas cette opération en fusion sans demande explicite. Vérifie toutefois que les fichiers anciens restent importables et que les nouveaux champs sont initialisés correctement.

Rappelle dans l'interface que les données locales nécessitent des sauvegardes JSON régulières. N'annonce aucune synchronisation cloud ou multiappareil, car elle n'existe pas dans l'architecture actuelle.

## 15. Validation métier et sécurité

Conserve la validation de l'enregistrement des devis et renforce-la pour les transitions de statut.

Avant une transition :

- Vérifie les champs nécessaires.
- Vérifie la compatibilité de l'offre de transport sélectionnée.
- Vérifie que le coût est calculable.
- Bloque les transitions interdites.
- Affiche un message précis lorsque des informations manquent.

Corrige également le cas où une offre manuellement sélectionnée n'est plus compatible avec le produit. Un avertissement visuel ne suffit pas pour autoriser l'enregistrement du devis.

Évite de modifier les règles métier existantes de calcul des coûts, d'arrondis, de seuils tarifaires et de dates sans justification et tests spécifiques.

Tout nouveau texte utilisateur inséré dans une vue HTML doit être correctement échappé. Préserve les protections et les contrôles d'accessibilité déjà présents.

## 16. Tests obligatoires

Après développement, teste au minimum les scénarios suivants :

1. Un nouveau brouillon reçoit le statut `Brouillon`.
2. L'enregistrement du devis conserve ses entrées, résultats et statut.
3. La confirmation déclenche les contrôles requis.
4. Les statuts suivent l'ordre défini et les transitions interdites sont bloquées.
5. Les modifications de dates restent consultables dans l'historique.
6. Une réception partielle conserve les quantités manquantes et endommagées.
7. Une réception validée crée une entrée de stock unique pour les quantités acceptées.
8. La destination client permet le suivi jusqu'à la confirmation de livraison.
9. Les dépenses réelles s'ajoutent sans effacer les estimations initiales.
10. L'annulation conserve les dépenses et les événements antérieurs.
11. Les modifications de statut n'écrasent pas les résultats du devis enregistré.
12. Les paiements groupés restent cohérents après les changements.
13. Les sauvegardes JSON exportées contiennent les nouveaux champs.
14. Une ancienne sauvegarde JSON reste importable.
15. Le parcours fonctionne après actualisation du navigateur.
16. Les interfaces restent utilisables sur ordinateur et mobile.
17. Aucun double clic ou nouvel enregistrement ne crée un événement ou un mouvement de stock en double.

Si les scripts de tests présents dans le projet sont encore utilisables, exécute-les et ajoute des tests ciblés pour les nouvelles fonctionnalités.

## 17. Ordre de réalisation

Travaille dans cet ordre :

1. Auditer le code et les données existantes.
2. Définir les statuts et les transitions.
3. Mettre à jour les structures de données et la migration.
4. Ajouter les actions et les indicateurs dans les interfaces.
5. Implémenter l'historique des statuts et des dates.
6. Ajouter les dépenses réelles et le contrôle de réception.
7. Ajouter le registre minimal de stock et la branche client.
8. Adapter les sauvegardes et les imports JSON.
9. Exécuter les tests et corriger les anomalies.
10. Fournir un récapitulatif des fichiers et fonctions modifiés, des tests réalisés et des limites restantes.

**Livrable final :** une version fonctionnelle de l'application existante, avec un suivi des statuts de bout en bout, un historique consultable, des coûts estimés et réels distincts, un suivi logistique et deux parcours de réception selon la destination.

Ne remplace pas le moteur de calcul, les tarifs, le calendrier, les paiements groupés ou les données enregistrées par une maquette ou des données fictives.


## Exigences de qualité du code : Clean Code et maintenabilité

Le développement doit respecter les principes du **Clean Code** afin de faciliter la maintenance, les corrections et les évolutions futures de l'application.

### 1. Lisibilité et nommage
- Utilise des noms de variables, fonctions et propriétés explicites et cohérents.
- Privilégie des fonctions courtes, chacune avec une responsabilité claire.
- Évite les fonctions trop longues, les blocs imbriqués complexes et les conditions difficiles à lire.
- Utilise une convention de nommage cohérente dans tout le projet.
- Évite les abréviations ambiguës et les valeurs magiques dispersées dans le code.

### 2. Architecture et séparation des responsabilités
- Sépare clairement la logique métier, les calculs, la gestion des données, la persistance et l'affichage.
- Centralise la définition des statuts et des transitions autorisées dans un référentiel unique.
- Centralise les règles de validation pour éviter leur duplication entre les différentes interfaces.
- Isole les opérations de changement de statut, d'historisation et de mise à jour du stock dans des fonctions dédiées.
- Réutilise les fonctions existantes lorsqu'elles sont adaptées au besoin.
- Évite de dupliquer du code ou de créer plusieurs implémentations d'une même règle métier.

### 3. Maintien de l'architecture existante
- Conserve le HTML autonome et le JavaScript natif déjà utilisés par l'application.
- N'introduis pas de framework, de dépendance ou de couche d'abstraction supplémentaire sans justification technique.
- Si le projet reste dans un seul fichier HTML, organise le JavaScript en sections logiques clairement identifiées.
- Utilise des fonctions pures lorsque cela est pertinent, notamment pour les calculs, les validations et les transformations de données.
- Préserve la compatibilité avec `S`, `S.draft`, `S.quotes`, `localStorage` et les sauvegardes JSON existantes.

### 4. Gestion des données et fiabilité
- Évite les modifications implicites de données partagées.
- Prévois une gestion explicite des erreurs et des cas limites.
- Empêche les doubles changements de statut, les entrées de stock en double et les doublons dans l'historique.
- Rends les migrations de données idempotentes.
- Ne mélange pas les données du devis initial avec les données opérationnelles réelles.
- Utilise des fonctions dédiées pour normaliser les anciennes données et vérifier leur validité.

### 5. Constantes et règles métier
- Définis les statuts, les destinations et les transitions autorisées dans des constantes centralisées.
- Évite de répéter les libellés des statuts dans de nombreuses fonctions.
- Ne disperse pas les règles de calcul des coûts, les seuils tarifaires ou les règles de transition dans le code d'interface.
- Maintiens une source unique de vérité pour chaque règle métier.

### 6. Tests et régression
- Teste les fonctions métier indépendamment de l'interface lorsque cela est possible.
- Vérifie les transitions autorisées et interdites.
- Teste les cas limites : données manquantes, réception partielle, annulation après achat, import d'une ancienne sauvegarde et double clic sur une action.
- Vérifie que les calculs et les fonctionnalités existantes restent opérationnels après chaque modification.
- Corrige les régressions avant de considérer le développement comme terminé.

### 7. Documentation et livraison
- Ajoute des commentaires uniquement lorsqu'ils expliquent une règle métier, une contrainte technique ou une décision non évidente.
- Évite les commentaires qui répètent simplement le code.
- Documente les fonctions métier importantes, les structures de données et les règles de transition.
- Supprime le code mort, les fonctions inutilisées et les duplications introduites par les modifications.
- Ne réalise pas de refactorisation massive sans nécessité. Privilégie des changements progressifs et faciles à vérifier.

**Critère d'acceptation supplémentaire :** le code livré doit être compréhensible par un autre développeur sans devoir reconstituer les règles métier à partir de plusieurs fonctions dispersées. Chaque responsabilité doit être identifiable, les règles importantes doivent être centralisées et les modifications doivent rester faciles à tester et à faire évoluer.

