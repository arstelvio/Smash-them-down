# Smash Them Down 🔨

Jeu satirique de « tape-taupe » pour mobile : **Macron, Obama, Modi et Cheikh Tamim** sortent de leurs trous, il faut les frapper au marteau… mais épargner la pauvre taupe **Taxpayer** (le contribuable) ! Chaque partie dure 60 secondes et un **Top 10 commun** permet à tous les amis de se mesurer sur le même tableau des scores.

- 📱 Format vertical, pensé pour le téléphone (Safari sur iPhone, Chrome sur Android). Jouable aussi sur ordinateur.
- 🚫 Sans installation : c'est une page web. Elle **peut être ajoutée à l'écran d'accueil**, avec sa propre icône et en plein écran (PWA).
- 🌍 Top 10 partagé via une base Firebase gratuite.
- ✈️ Fonctionne hors connexion une fois ouvert (les scores sont envoyés au retour du réseau).
- 🇬🇧 Le jeu est entièrement en anglais.

> Œuvre satirique : caricatures dessinées en SVG, aucune vraie photo.

## Règles

| Personnage | Points | Particularité |
|---|---|---|
| Macron « Jupiter » | +10 | Apparaît parfois dans deux trous **en même temps** : frapper les deux = bonus |
| Obama « Yes we can » | +15 | Le plus rapide |
| Modi « 56-inch chest » | +20 | Il faut le frapper **deux fois** |
| Tamim « The Emir » | +30 | Rare et rapide, fait pleuvoir des pétrodollars |
| Taxpayer 🐹 | **−25** | Ne PAS le frapper (le combo est perdu) |

Combo : tous les 5 coups réussis d'affilée, le multiplicateur augmente (jusqu'à x5). Un coup dans le vide ou un personnage qui s'échappe le remet à zéro.

---

## 1. Mettre le jeu en ligne (GitHub Pages)

1. Fusionner cette branche dans `main` (ou utiliser directement la branche).
2. Sur GitHub : **Settings → Pages**.
3. *Source* : **Deploy from a branch**. *Branch* : `main` (ou la branche qui contient le code), dossier **`/ (root)`**, puis **Save**.
4. Après 1 à 2 minutes, le jeu est disponible à l'adresse
   **`https://arstelvio.github.io/Smash-them-down/`**

Il suffit d'envoyer ce lien aux amis.

## 2. Activer le Top 10 commun (Firebase, gratuit, environ 5 minutes)

Sans cette étape, le jeu fonctionne mais chaque joueur ne voit que **ses propres** scores (enregistrés sur son téléphone). Pour un tableau **partagé** :

1. Aller sur <https://console.firebase.google.com> (compte Google) → **Créer un projet** (par ex. `smash-them-down`). Google Analytics n'est pas nécessaire.
2. Menu de gauche : **Créer (Build) → Realtime Database → Créer une base de données**.
   - Emplacement : **Belgique (europe-west1)**.
   - Mode : **Démarrer en mode verrouillé**.
3. Onglet **Règles** : tout effacer, coller le contenu du fichier [`firebase-rules.json`](firebase-rules.json), puis **Publier**.
4. Onglet **Données** : copier l'URL affichée en haut, du type
   `https://smash-them-down-default-rtdb.europe-west1.firebasedatabase.app`
5. La coller dans [`js/config.js`](js/config.js) :
   ```js
   window.SMASH_CONFIG = {
     firebaseUrl: 'https://smash-them-down-default-rtdb.europe-west1.firebasedatabase.app',
   };
   ```
6. Commit et push. C'est terminé : l'écran du classement affiche « 🌍 Shared leaderboard ».

L'offre gratuite (Spark) suffit largement, sans carte bancaire.

**Remettre le classement à zéro** : dans Firebase, onglet *Données* → supprimer le nœud `scores`.

**Triche** : le jeu tourne entièrement dans le navigateur, donc un ami très motivé pourrait envoyer un faux score. Les règles bloquent les abus évidents (nom de 12 caractères maximum, score plafonné à 50 000, impossible de modifier ou d'effacer les scores des autres, horodatage fixé par le serveur), ce qui suffit pour un jeu entre amis.

## 3. Installer sur le téléphone

- **iPhone (Safari)** : ouvrir le lien → bouton *Partager* → **Sur l'écran d'accueil**.
- **Android (Chrome)** : ouvrir le lien → le jeu propose **INSTALL** (ou menu ⋮ → *Installer l'application*).

L'application s'ouvre alors en plein écran, sans barre de navigateur, avec son icône.

## Mettre à jour le jeu

Après avoir modifié un fichier, augmenter `VERSION` dans [`sw.js`](sw.js) (par ex. `smash-v2`) pour que les téléphones qui ont installé le jeu récupèrent la nouvelle version (elle s'applique au lancement suivant).

## Fichiers

```
index.html            la page (menus, HUD)
style.css             styles
js/config.js          ← URL Firebase à renseigner
js/main.js            écrans, classement, installation
js/game.js            moteur du jeu (canvas)
js/art.js             caricatures en SVG
js/characters.js      personnages, points, répliques
js/audio.js           sons synthétisés (Web Audio, aucun fichier)
js/leaderboard.js     Top 10 partagé (Firebase REST) + secours local/hors ligne
sw.js                 service worker (hors ligne, chargement rapide)
manifest.webmanifest  manifeste PWA (icône, plein écran, portrait)
firebase-rules.json   règles de sécurité de la base
icons/                icônes (générées par tools/make-icons.mjs)
fonts/                polices Lilita One et Nunito (licence SIL OFL)
```

Pour tester en local : `python3 -m http.server 8000` puis ouvrir <http://localhost:8000>.
