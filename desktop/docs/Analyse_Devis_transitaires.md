# Analyse détaillée — Devis transitaires

Analyse du fichier `C:/Users/My PC/Downloads/Devis_transitaires (1).html`, réalisée le 14 octobre 2026. Le fichier original n’a pas été modifié. Les textes du document ont été traités comme du contenu à examiner, jamais comme des instructions à exécuter.

**Conclusion :** cette application est un outil local de préparation de devis pour l’importation Chine → Madagascar. Elle transforme les caractéristiques d’une commande et de son colis en coût de revient, compare les offres de transport, estime une date client, puis calcule un prix de vente. Elle conserve également des devis figés et des fiches produits. Son principal point faible est la séparation insuffisante entre « résultat calculable » et « devis réellement valide ».

## 1. Architecture et périmètre réel

L’application tient dans un seul fichier HTML de 1 781 lignes, avec styles CSS et JavaScript intégrés. Aucun framework ni serveur métier n’est nécessaire au moteur. Les données sont conservées dans le navigateur avec `localStorage`.

Les dépendances externes visibles sont les polices Google Fonts et les liens de partage WhatsApp. Les messages SMS utilisent un lien `sms:`. Il n’y a pas de connexion automatique aux transitaires, de récupération de taux de change, de suivi réel de colis ou de réservation de transport.

Le jeu de données initial contient **30 offres, 4 transitaires, 9 catégories et 18 dates de départ** : Arizato, E-SOA, Importation Express et Importation de l’Asie. Les dates précises concernent le service Fast d’Importation de l’Asie, en octobre 2026.

Ces données sont celles intégrées au fichier : leur présence et leur date de vérification affichée ne prouvent pas leur exactitude commerciale actuelle. Aucune vérification externe des tarifs n’a été effectuée.

Le parcours comprend le devis en trois étapes, l’historique, la consultation d’un devis, les fiches produits, les tarifs, le calendrier, les paramètres et le mode d’emploi. Une vue distincte sert à l’impression du devis client.

## 2. Modèle de données

Un objet global `state` rassemble toute l’application.

| Élément | Rôle |
|---|---|
| `params` | Changes, arrondis, diviseur volumétrique, délais de sécurité et dimanche |
| `company` | Nom, téléphone, adresse et mention commerciale |
| `categories` | Liste des catégories proposées |
| `tarifs` | Offres avec prix, unité, admission, délais et départs |
| `calendrier` | Dates précises associées à un transitaire et à un service |
| `produits` | Fiches réutilisables avec prix unitaire et conditionnement |
| `devis` | Numéro, saisie courante, étape et message client |
| `archive` | Devis enregistrés avec résultats et paramètres figés |
| `counter` | Compteur de numérotation `DEV-0001`, etc. |

Un devis représente **un produit et un modèle de carton répété**. Ce n’est pas un devis multiligne : aucune liste de produits différents ni de cartons aux dimensions différentes n’est calculée séparément.

Une offre est identifiée par un texte composé du transitaire, du mode, du service et des catégories. Elle ne possède pas d’identifiant stable indépendant de son libellé. Le calendrier est lié par `transitaire + service`, sans inclure le mode ni la catégorie : plusieurs tarifs d’un même service partagent donc leurs départs.

## 3. Circulation des données

À chaque saisie valide :

1. `onDevisInput` convertit le champ et modifie `state.devis.inputs`.
2. `derive` détermine la catégorie, le prix unitaire en yuan et les frais chinois en ariary.
3. `compute` calcule le colis, les coûts et les dates pour toutes les offres.
4. `evaluate` choisit une offre automatique si nécessaire, puis recalcule la sélection.
5. `checkAlerts` recherche des incohérences de saisie.
6. `renderDevis` actualise les offres, le détail des coûts, la marge, les dates et le message.
7. `persist` programme l’enregistrement local après 200 ms.

Le recalcul est immédiat. L’enregistrement local automatique du formulaire et l’action « enregistrer un devis » sont deux opérations différentes : la seconde crée une entrée figée dans l’historique.

## 4. Classification du produit

La catégorie est déduite dans cet ordre strict, dès la première condition satisfaite :

| Priorité | Condition | Catégorie |
|---|---|---|
| 1 | Gaz, aérosol ou inflammable coché | Danger |
| 2 | Nature batterie seule | Batterie brute |
| 3 | Nature téléphone ou powerbank | Téléphone |
| 4 | Nature ordinateur/tablette | Ordinateur/tablette |
| 5 | Batterie intégrée cochée | Batterie |
| 6 | Liquide, poudre ou cosmétique coché | Poudre/liquide |
| 7 | Aimant coché | Aimant |
| 8 | Appareil électronique | Électronique |
| 9 | Aucune condition précédente | Général |

Une catégorie manuelle remplace le résultat automatique. Modifier la nature ou l’un des indicateurs efface ce choix manuel.

**Conséquence importante :** les particularités ne s’additionnent pas dans le filtre d’admission. Un produit avec batterie et liquide est classé Batterie ; le liquide devient une note. Le moteur ne vérifie pas que l’offre accepte simultanément les deux contraintes.

Le nom du produit n’est pas analysé. Écrire « spray », « batterie » ou « téléphone » dans le nom ne change pas la classification.

## 5. Commande et conditionnement

Le prix d’achat peut être saisi par pièce ou pour toute la commande :

```text
Prix unitaire yuan = prix saisi                          si mode pièce
Prix unitaire yuan = prix saisi / nombre de pièces       si mode total
Achat en Ar = prix unitaire yuan × pièces × taux CNY
Livraison Chine en Ar = livraison Chine en yuan × taux CNY
```

Le poids et les dimensions décrivent **un carton**, puis sont multipliés par le nombre de cartons.

Une fiche produit mémorise le nom, la nature, les particularités, la catégorie manuelle éventuelle, les dimensions, le poids, le prix par pièce et les pièces par carton. Lorsque le calcul automatique des cartons est actif :

```text
Cartons = maximum(1, plafond(pièces / pièces par carton))
```

Une modification manuelle du nombre de cartons désactive ce calcul. Le dernier carton incomplet garde néanmoins le poids et le volume d’un carton complet : le modèle ne sait pas décrire un dernier colis plus petit.

## 6. Analyse du message vendeur

`parseSeller` est un parseur à expressions régulières, sans IA ni traduction complète. Il reconnaît notamment :

- des dimensions comme `35 × 28 × 28 cm`, ou `L / W / H` ;
- mm, cm, m et certaines unités chinoises ;
- des poids en kg, g ou lb ;
- le nombre de cartons, les pièces par carton et la quantité totale.

Il privilégie le poids brut : les expressions gross/GW/brut augmentent le score, net/NW le diminuent. Si un poids est identifié comme total, l’interface peut le diviser par le nombre de cartons détecté ou déjà saisi.

Sans unité de dimension, si les trois valeurs dépassent 150, elles sont interprétées comme des mm ; sinon comme des cm. Le résultat est présenté avec des cases à cocher avant application.

**Limites :** il ne distingue pas plusieurs modèles de cartons, peut confondre un contexte de poids total et un contexte de poids unitaire, et applique une seule unité aux trois dimensions. Le test `35cm x 280mm x 28cm` renvoie **35 × 280 × 28 cm**, alors que la deuxième dimension devrait être 28 cm. Le contrôle humain proposé dans l’interface est donc nécessaire.

## 7. Calcul de la quantité facturée

Avec `C` cartons, `P` kg par carton et des dimensions en cm :

```text
Poids réel total = C × P
Poids volumétrique total = C × longueur × largeur × hauteur / diviseur
Volume total en m³ = C × longueur × largeur × hauteur / 1 000 000
```

Le diviseur initial vaut 6 000. La quantité facturée dépend de l’unité du tarif :

| Unité | Quantité retenue |
|---|---|
| m³ | Volume total arrondi vers le haut |
| pièce | Nombre de pièces |
| kg | Poids réel, volumétrique ou maximum des deux, arrondi vers le haut |

La base imposée par le tarif est prioritaire sur le choix du devis. Le pas initial de poids est 0,1 kg ; le pas de volume est `10⁻¹⁰ m³`, donc presque aucun arrondi commercial. Après arrondi, le minimum facturable est appliqué.

L’arrondi et le minimum sont appliqués **au total de la commande**, pas à chaque carton séparément. Ce choix peut différer des règles réelles d’un transitaire.

Pour un tarif maritime à palier, lorsque la quantité dépasse strictement le seuil, le tarif au-delà s’applique à **tout le volume**. Ce n’est pas un calcul par tranches.

Exemple intégré : 0,25 m³ × 410 USD = 102,50 USD ; 0,251 m³ × 360 USD = 90,36 USD. Une petite hausse du volume peut donc faire baisser le prix. À exactement 0,25 m³, le code retient 410 USD/m³. Cette interprétation doit correspondre à la grille commerciale attendue.

## 8. Admission et comparaison des offres

Deux contrôles déterminent la compatibilité :

1. La catégorie doit apparaître dans la liste du tarif, séparée par des points-virgules. La comparaison ignore la casse, mais exige le même texte.
2. Le poids réel **d’un carton** ne doit pas dépasser `maxColis`, si cette limite est renseignée.

Il n’existe pas de vérification structurée des dimensions maximales, du poids total autorisé, du contenu détaillé, de la capacité batterie ou des formalités d’admission. Le texte « À vérifier » reste informatif.

Le mode « moins cher » trie par coût de revient total, puis par date client en cas d’égalité. Le mode « plus rapide » trie par date client, puis par coût. Une date inconnue est classée après les dates connues. Seules les offres compatibles et chiffrées participent au choix automatique.

Une offre sans date peut tout de même gagner en mode économique. Si toutes les dates sont inconnues, le mode rapide peut également retenir une offre chiffrée sans fournir de date.

Le choix manuel conserve l’offre sélectionnée. Si le produit change et rend cette offre incompatible, un avertissement apparaît, mais le moteur continue de calculer son prix et l’enregistrement ne revalide pas explicitement sa compatibilité.

## 9. Prix de revient, vente et marge

```text
Transport = quantité facturée × tarif × conversion devise
Coût total = achat + livraison Chine + transport + frais exclus + livraison finale
Coût par pièce = coût total / pièces
Prix conseillé = coût par pièce × (1 + taux de marge), arrondi au 100 Ar supérieur
Prix utilisé = prix manuel si numérique, sinon prix conseillé
Marge par pièce = prix utilisé − coût par pièce
Marge totale = marge par pièce × pièces
Taux de marge = marge par pièce / coût par pièce
Taux de marque = marge par pièce / prix utilisé
Chiffre d’affaires = prix utilisé × pièces
```

Le moteur convertit les tarifs USD au taux USD ; les autres devises sont traitées sans conversion. Les interfaces prévues utilisent Ar et USD. Les paramètres initiaux sont 675 Ar/CNY et 4 850 Ar/USD ; ce sont des valeurs du fichier.

Les frais exclus et la livraison finale sont des montants saisis pour la commande. Il n’y a pas de calcul automatique détaillé de douane, taxes, assurance, frais bancaires ou pertes. La marge affichée est une marge commerciale sur les coûts renseignés, pas un bénéfice net comptable.

Un taux de marge de 30 % ne signifie pas une marge de 30 % du prix de vente : avant arrondi, son taux de marque est environ 23,08 %.

### Exemple exécuté avec le moteur

Entrées : 10 pièces à 20 yuan, 2 cartons de 40 × 30 × 20 cm et 3 kg chacun, livraison Chine de 30 yuan, frais exclus de 20 000 Ar, livraison finale de 10 000 Ar, marge de 30 %.

| Résultat | Valeur |
|---|---:|
| Poids réel total | 6 kg |
| Poids volumétrique total | 8 kg |
| Volume total | 0,048 m³ |
| Achat | 135 000 Ar |
| Livraison Chine | 20 250 Ar |
| Offre économique choisie | E-SOA maritime Général |
| Transport : 0,048 × 360 × 4 850 | 83 808 Ar |
| Coût de revient total | 269 058 Ar |
| Coût par pièce | 26 905,80 Ar |
| Prix conseillé par pièce | 35 000 Ar |
| Marge par pièce | 8 094,20 Ar |
| Marge totale | 80 942 Ar |

Cette offre maritime ne possède pas de départ renseigné dans les données initiales. Le prix est calculable, mais aucune date client n’est disponible : c’est une illustration concrète de la différence entre comparaison économique et proposition complète.

## 10. Calcul des dates

L’arrivée estimée au dépôt chinois part de la date de paiement :

```text
Arrivée dépôt = date paiement + délai livraison Chine + heure d’arrivée / 24
Seuil de départ = plafond(arrivée dépôt + jours de clôture − heure clôture / 24)
```

S’il existe des dates précises pour le service, le moteur prend la première date supérieure ou égale au seuil. Ces dates remplacent les jours hebdomadaires. Si elles sont toutes dépassées, il n’y a pas de retour automatique aux jours hebdomadaires.

Sinon, il calcule le prochain jour hebdomadaire admissible. Si deux départs sont configurés, il retient le premier des deux, chacun avec son délai de clôture.

```text
Arrivée minimale = départ + délai minimum
Arrivée maximale = départ + délai maximum
Disponibilité = arrivée maximale + mise à disposition
Date client = disponibilité + marge de sécurité selon le mode
```

Valeurs initiales : 3 jours de mise à disposition, puis 4 jours de marge avion ou 10 jours maritime. Si la disponibilité tombe un dimanche et que le retrait dominical est interdit, elle est décalée au lundi. Ce contrôle n’est pas réappliqué après la marge client : la date finale peut donc tomber un dimanche.

Les durées sont des jours calendaires. Le moteur ne connaît pas les jours fériés, les fermetures exceptionnelles ou les retards réels. L’heure est saisie comme heure de Chine, sans conversion automatique depuis Madagascar. À l’heure exacte de clôture, la formule autorise encore le départ concerné ; les conditions « avant midi » peuvent nécessiter une règle plus stricte.

## 11. Alertes et validation

Les alertes recherchent des dimensions supérieures à 150 cm ou inférieures à 1 cm, une densité supérieure à 1 500 kg/m³ ou inférieure à 10 kg/m³, un prix unitaire d’au moins 10 000 yuan, une livraison Chine supérieure à 2 000 yuan, ainsi qu’un nombre de cartons supérieur au nombre de pièces.

Des corrections proposent mm → cm, m → cm, g → kg et Ar → yuan. Elles reposent sur une hypothèse, pas sur une preuve d’erreur. Une alerte ignorée est mémorisée avec la signature des valeurs concernées et peut réapparaître si celles-ci changent.

Les indicateurs « étape complète » vérifient certaines valeurs positives, mais **ne constituent pas des verrous d’enregistrement**. `saveDevis` exige essentiellement une offre existante et un nom de produit, puis permet de passer outre les alertes.

Un test du moteur avec les champs par défaut vides renvoie un coût de 0 : les valeurs absentes sont souvent converties en zéro. Un nom ajouté ensuite peut permettre un enregistrement insuffisamment renseigné. Les valeurs négatives et quantités fractionnaires ne font pas non plus l’objet d’une validation métier générale dans les gestionnaires examinés.

## 12. Devis enregistrés et historique

L’enregistrement conserve les entrées, leur représentation lisible, les résultats calculés, les paramètres, le tarif sélectionné et un résumé. La consultation affiche ces valeurs enregistrées, sans les recalculer.

- **Modifier** recharge les entrées et recalcule aux tarifs et taux actuels. Le remplacement écrase la version précédente après confirmation.
- **Dupliquer** crée un nouveau numéro, remet la date de paiement à aujourd’hui et recalcule aux conditions actuelles.
- **Supprimer** retire le devis après confirmation, sans réutiliser volontairement son numéro.

Le statut initial est « Envoyé », même si aucun message n’a réellement été transmis. Les autres statuts sont Accepté, Commandé, Livré et Refusé. Ce sont des étiquettes de suivi, pas un workflow connecté aux paiements ou aux transporteurs.

L’historique filtre par produit/client, statut, transitaire et date de création. L’export CSV reprend la liste filtrée, avec séparateur point-virgule. Il ne remplace pas une sauvegarde complète.

La modification d’un tarif recherche les devis Envoyés ou Acceptés qui utilisaient l’ancien libellé et compare leur ancien coût au coût recalculé avec les conditions actuelles. Elle ne modifie pas automatiquement les archives. Les devis Commandés ne font pas partie de cette alerte ; les changements de date ou de compatibilité sans variation du prix ne sont pas son objet.

## 13. Communication et impression

Le message client contient le produit, la quantité, le prix par pièce, le total, la date estimée et la signature de l’entreprise. Après modification manuelle, il cesse de suivre les recalculs jusqu’à réinitialisation : un prix changé dans le devis peut donc ne plus correspondre au texte.

WhatsApp et SMS sont ouverts avec un message prérempli ; ce n’est pas un envoi automatique. Le « PDF client » utilise `window.print()` et l’option d’enregistrement PDF du navigateur. La vue client masque les coûts internes ; les impressions de devis interne et de consultation ont un autre contenu.

## 14. Calendrier et sauvegarde

Le calendrier accepte des dates et peut en générer à partir de jours de semaine sur une période. La génération évite les doublons déjà présents pour le service et ajoute au maximum 400 dates par opération.

Un avertissement apparaît lorsqu’il reste au plus trois dates futures, ou lorsque la dernière date se trouve à moins de dix jours. Ce contrôle s’appuie sur les dates calendaires, pas sur la possibilité effective de respecter leur clôture pour le devis courant.

La clé de stockage est `devis-transitaires-mg-v2`, avec reprise prévue de `devis-transitaires-mg-v1`. Tout l’état est sérialisé en JSON. Il n’y a ni synchronisation multiappareil, ni compte, ni journal de versions, ni résolution de conflits entre onglets.

La sauvegarde JSON exporte l’ensemble de l’état. L’import **remplace** les données après confirmation ; il ne fusionne pas les historiques. Le contrôle de structure est sommaire : présence de `tarifs`, `params` et `devis`, puis quelques migrations. Un JSON incomplet ou incohérent peut échouer en cours de traitement.

L’effacement du stockage du navigateur fait perdre les données sans export. La temporisation de 200 ms laisse aussi une petite fenêtre avant l’écriture effective. Le fichier HTML ne contient pas automatiquement les devis créés dans un autre navigateur.

## 15. Défauts et limites prioritaires

| Priorité | Constat | Effet concret | Emplacement |
|---|---|---|---|
| Haute | Offre manuelle incompatible toujours calculée | Un changement de produit peut laisser un devis chiffré sur une offre qui le refuse, malgré l’avertissement visuel | `compute` 791–796 ; `saveDevis` 1397–1408 |
| Haute | Validation de complétude non bloquante | Un devis incomplet peut produire un prix nul ou sous-estimé et être enregistrable | `stepState` 1048–1053 ; `saveDevis` |
| Haute | Exemple initial incohérent | « Spray anti-pluie 50 ml » forcé dans Ordinateur/tablette ; le nom ne corrige pas la catégorie | `EXAMPLE` 644–645 |
| Haute | Contraintes multiples réduites à une seule catégorie | Batterie + liquide n’impose pas une double admission | `deduceCategory` 617–632 |
| Moyenne | Renommage des catégories sans adaptation du classificateur | Renommer Général en Textile met à jour les tarifs, mais le questionnaire continue de produire Général | 617–628 et 1730–1738 |
| Moyenne | Une seule unité pour les dimensions analysées | Des unités mélangées donnent un volume et un prix erronés | `parseSeller` 875–889 |
| Moyenne | Références fondées sur des libellés modifiables | Renommer une offre ou un service peut rompre les correspondances avec les archives ou le calendrier | `offerLabel` 597 ; calendrier 741 |
| Moyenne | `derive` utilise toujours l’état global | `evaluate(inp, autreEtat)` mélange potentiellement deux taux CNY | 726 et 826–830 |
| Moyenne | Frais d’admission et modalités en texte libre | Des restrictions réelles ne bloquent pas le moteur | champs `verifier`, filtre 746–749 |
| Moyenne | Message manuel non resynchronisé | Un ancien prix peut rester dans le message partagé | 1223–1228 |

Le défaut d’état alternatif a été reproduit : avec un taux alternatif de 1 000 Ar/CNY, l’achat est bien recalculé à ce taux, mais une livraison de 30 yuan reste à 20 250 Ar au taux global de 675, au lieu de 30 000 Ar. L’interface normale utilise surtout l’état global ; ce défaut concerne particulièrement la réutilisation du moteur pour des simulations indépendantes.

Les calculs d’arrondi global, de minimum et de palier ne sont pas automatiquement des bugs : ce sont des choix métier qu’il faut comparer aux règles contractuelles attendues. De même, une offre sans départ peut légitimement fournir une estimation de coût, mais elle ne fournit pas une promesse de livraison complète.

## 16. Vérifications réalisées et confiance

Lecture ciblée du JavaScript, du modèle initial, des formulaires et des opérations d’historique, de calendrier et de sauvegarde. Exécution isolée des fonctions originales de classification, calcul et analyse vendeur, sans interface ni accès au stockage du navigateur.

Les essais ont confirmé l’exemple chiffré, le coût nul du formulaire vide, la catégorie initiale du spray, le résultat d’une combinaison batterie/liquide, le défaut d’unités mélangées, le mélange de taux sur état alternatif et la conservation d’un coût pour une offre manuelle incompatible. Dans ce dernier essai, le moteur indiquait `compatible: false` tout en calculant un coût de 721 250 Ar.

**Confiance globale : 95 %.** Les formules et les anomalies citées reposent sur le code, avec reproduction ciblée des principaux cas. Les parcours complets dans un navigateur, le rendu imprimé et la persistance réelle n’ont pas été testés. Les tarifs, délais et conditions des transitaires n’ont pas été validés auprès de leurs sources ; le rapport décrit ce que fait le fichier, sans certifier ses données commerciales.
