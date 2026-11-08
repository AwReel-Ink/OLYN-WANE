# OLYN-WANE

Accès centralisé aux applications de travail.
©2026 LEROY Aurélien — Tous Droits Réservés

Depuis la version 1.1, la liste des applications et des secteurs se gère directement depuis OLYN-WANE (onglet **Gérer**), comme dans MesZapply : plus besoin de modifier `js/config.js` à la main.

---

## Mise à jour vers la 1.1 (à faire une seule fois)

### 1. Envoyer les fichiers
1. Sur github.com, ouvre le dépôt **olyn-wane**.
2. **Add file > Upload files**.
3. Décompresse `olyn-wane-1.1.zip` sur ton PC, ouvre le dossier `olyn-wane`, sélectionne **tout son contenu** (les dossiers `assets`, `css`, `data`, `js` et les fichiers `index.html`, `manifest.json`, `sw.js`, `README.md`) et glisse-le dans la page.
   Glisse le contenu, pas le dossier `olyn-wane` lui-même : `index.html` doit rester à la racine du dépôt.
4. **Commit changes**. Les fichiers qui portent le même nom sont remplacés ; il n'y a rien à supprimer.

### 2. Récupérer la nouvelle version sur chaque appareil
- Attends une à deux minutes que GitHub publie la page.
- Ouvre OLYN-WANE : la nouvelle version s'installe en arrière-plan. Ferme-le puis rouvre-le : la roue dentée ⚙️ apparaît en haut à droite (la version **1.1.0** est indiquée tout en bas des Paramètres).
- Si un appareil affiche encore l'ancienne version, rouvre OLYN-WANE un peu plus tard : elle arrive au plus tard sous 24 h.
- **N'efface jamais les « données du site »** dans le navigateur : toutes tes applis partagent l'adresse awreel-ink.github.io, tu effacerais aussi les données de LiCoNote, LAOUPA, MesZapply…

### 3. Créer le jeton GitHub d'OLYN-WANE
1. Sur github.com : ta photo de profil en haut à droite, puis **Settings**.
2. Tout en bas du menu de gauche : **Developer settings > Personal access tokens > Fine-grained tokens**.
3. **Generate new token**.
4. Token name : `OLYN-WANE`. Expiration : 1 an par exemple.
5. Repository access : **Only select repositories**, puis uniquement **olyn-wane**.
6. Permissions : dans les permissions du dépôt, trouve **Contents** et choisis **Read and write**. Ne touche à rien d'autre.
7. **Generate token**, puis copie tout de suite le jeton (il commence par `github_pat_`). GitHub ne l'affiche qu'une seule fois : garde-le dans un endroit sûr.

Autre possibilité : modifier le jeton de MesZapply (même page, bouton **Edit**) pour lui ajouter le dépôt olyn-wane. Un jeton séparé reste plus sûr si un appareil de travail est perdu.

### 4. Brancher OLYN-WANE sur GitHub
1. Ouvre OLYN-WANE, touche la roue dentée ⚙️ (Paramètres).
2. Colle le jeton dans « Compte GitHub » et touche **Enregistrer**.
3. Les onglets **🧩 Applications / 🛠️ Gérer** apparaissent.

Ne le fais que sur **tes** appareils. Les appareils des travailleurs restent sans jeton : ils voient les applications normalement, mais pas l'onglet Gérer.

---

## Au quotidien

**Accueil** (inchangé)
- Les secteurs en haut filtrent les applications.
- Un appui sur une carte ouvre l'application dans un onglet ; 🏠 ramène à l'accueil, ✕ ferme l'onglet.
- Une carte avec **↗** s'ouvre à part, dans un nouvel onglet du navigateur.
- 🔄 recharge la liste des applications.

**Paramètres ⚙️**
- **Applications ouvertes en même temps** : de 1 à 15 (5 par défaut), réglé séparément sur chaque appareil. Sur une petite tablette, garde un petit nombre.
- **Compte GitHub** : enregistrer, tester ou retirer le jeton de cet appareil.

**Gérer 🛠️** (avec jeton)
- **➕ Ajouter une application** : OLYN-WANE liste tes applis publiées sur GitHub qui n'y sont pas encore. Touche-en une : le nom, l'icône, la couleur et la description sont remplis tout seuls. Coche les secteurs, puis **Ajouter à OLYN-WANE**.
  Tu peux aussi coller un lien (page publiée ou dépôt GitHub).
- **Crayon** : modifier nom, description, secteurs, émoji de secours, icône, couleur et mode d'ouverture.
- **Ouverture « À part »** : pour une appli qui fonctionne mal à l'intérieur d'OLYN-WANE (caméra, plein écran…).
- **Poignée ⠿** : glisser pour changer l'ordre des applications (c'est l'ordre de l'accueil) ou des secteurs.
- **Poubelle** : retire l'application d'OLYN-WANE (l'application elle-même et son dépôt ne sont pas touchés).
- **Secteurs** : créer (nom, émoji, couleur), modifier, réordonner, supprimer. Supprimer un secteur le retire des applications concernées, qui restent dans OLYN-WANE.

Chaque action est enregistrée directement sur GitHub (un « commit » dans `data/apps.json`). Les autres appareils la voient à leur prochaine ouverture d'OLYN-WANE, une à deux minutes plus tard (le temps que GitHub publie la page), ou avec 🔄.

---

## Bon à savoir

- **Ajouter une application ne demande jamais de toucher au code** : la liste est entièrement dans `data/apps.json`, qu'OLYN-WANE modifie tout seul.
- **Si tu modifies le code** (HTML, CSS, JS) : rien d'autre à faire, les appareils prennent la nouvelle version à leur prochaine ouverture. Change quand même le numéro `version` dans `js/config.js` pour t'y retrouver.
- **Deux appareils en même temps** : si la liste a été modifiée ailleurs entre-temps, OLYN-WANE récupère la dernière version et y ajoute ta modification. Rien n'est perdu.
- **Hors ligne** : OLYN-WANE s'affiche avec la dernière liste connue (bandeau jaune « Hors ligne »).
- **Jeton perdu ou appareil perdu** : supprime le jeton sur GitHub (même page qu'à l'étape 3) et crées-en un nouveau.
- **MesZapply et OLYN-WANE** cohabitent sans se gêner : réglages, jeton et mémoire hors ligne sont séparés. (L'ancien OLYN-WANE effaçait par erreur la mémoire hors ligne de MesZapply à chaque mise à jour ; c'est corrigé.)

---

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `index.html` | La page d'OLYN-WANE |
| `manifest.json` | Nom, icône et affichage de l'application installée |
| `sw.js` | Service worker : hors ligne et mises à jour automatiques |
| `data/apps.json` | **La liste** : secteurs et applications (modifiée par l'onglet Gérer) |
| `css/style.css` | L'apparence |
| `js/config.js` | Nom, **numéro de version**, compte et dépôt GitHub, limites |
| `js/app.js` | Démarrage |
| `js/home.js` | L'accueil : secteurs et cartes |
| `js/tabs.js` | Les onglets et applications ouvertes |
| `js/manage.js`, `js/appform.js`, `js/sortable.js` | L'onglet Gérer |
| `js/settings.js` | Les Paramètres |
| `js/github.js`, `js/store.js`, `js/actions.js` | Lecture et écriture sur GitHub |
| `js/db.js`, `js/prefs.js` | Réglages de l'appareil |
| `js/icon-loader.js` | Liens, icônes et manifests des autres applications |
| `js/ui.js` | Outils d'affichage |
| `assets/icons/` | Icônes d'OLYN-WANE |
