# AK / Archive

Expérience éditoriale française : objet 3D réaliste en ouverture, chronologie cinématographique plein écran, images agrandissables, son optionnel et profil local. Vite, Three.js, GSAP, JavaScript modulaire et CSS responsive.

## Ouvrir le site

```sh
npm install
npm run dev
```

Avec VS Code Live Server, ouvrir **`dist/index.html`**. Ouvrir le `index.html` source avec Live Server redirige aussi vers cette version compilée. Après une modification des sources :

```sh
npm run build
npm run preview
```

Le build utilise des chemins relatifs pour fonctionner également sous `/dist/`. Déployer le contenu de `dist/` sur un hébergement statique. `npm run dev` actualise les sources sans reconstruction manuelle.

## Structure

```text
index.html                 Navigation, objet, chronologie, galerie, formulaires
src/style.css              Fondations visuelles et composants
src/story.css              Direction artistique et scène plein écran
src/bootstrap.js           Démarrage Vite / redirection Live Server
src/main.js                Assemblage et animations de présentation
src/viewer.js              Studio Three.js et modèle glTF texturé
src/story.js               Années, transitions, navigation, pause et galerie
src/film-player.js         Lecteur d’images progressif avec cache borné
src/audio.js               Nappe sonore originale et clics feutrés
src/profile.js             Pseudo et avatar enregistrés dans le navigateur
public/models/             GLB optimisé, licence et crédits
public/sequence/           192 images WebP et manifeste
public/media/              Vidéo MP4 d’origine, utilisée en repli
public/images/             Illustrations de la galerie et aperçu
scripts/                   Conversion des médias et serveur de tests
tests/story.spec.js        Tests Chrome des interactions
```

## Objet 3D

Le modèle provient du **Free Classic Weapons Pack de Stein Games**, publié sous **CC0 1.0** : [source du créateur](https://stein-indie.itch.io/classic-weapons-pack), [licence](https://creativecommons.org/publicdomain/zero/1.0/).

Le FBX a été converti en GLB ; les textures de couleur, normales, rugosité, métal et occlusion ont été raccordées. Les UV de ce modèle sortent de l’intervalle `[0,1]` : le mode de répétition des textures est conservé. Le fichier final pèse **2 205 476 octets**, avec textures WebP et sommets soudés. Les sources téléchargées restent dans `asset-sources/`, ignoré par Git. Le site utilise uniquement les fichiers optimisés de `public/models/`.

Le studio utilise des éclairages chauds/froids, un environnement de réflexion et un mappage des tons ACES. Faire glisser permet de tourner ; les boutons permettent de zoomer et réinitialiser. La molette continue de faire défiler la page. Le rendu s’arrête hors écran et dans un onglet masqué. La densité de pixels est plafonnée à 1,6. Un aperçu remplace la scène si WebGL ou le modèle est indisponible.

Les commandes de régénération, si les FBX/PNG sources sont disponibles :

```sh
node scripts/convert-model.mjs
node scripts/optimize-model.mjs
npm run build
```

Chrome doit être installé pour la conversion. Le fichier `.env.example` permet de choisir un autre modèle compatible. Le modèle livré ne nécessite pas de décodeur Draco. Pour importer un autre GLB compressé avec Draco/KTX2, brancher les décodeurs correspondants au chargeur avant son utilisation.

## Défilement du film

La vidéo Firefly fournie dure 8 secondes, en 1280 × 720. Elle a été préparée en **192 images WebP à 24 images/seconde**, soit **3 591 818 octets** au total. Le lecteur affiche directement l’image correspondante à la progression du défilement, avec un amortissement dépendant du temps. Cela évite de rechercher continuellement une nouvelle position dans le MP4.

- Scène de la taille du viewport, maintenue à l’écran pendant les cinq chapitres. Dates et textes en surimpression ; galerie après le film.
- Défilement natif à la souris, au pavé tactile, au clavier et au toucher, dans les deux sens. Les liens des années centrent leur chapitre et la molette reprend immédiatement la main.
- Au maximum **18 images décodées sur ordinateur**, **10 sur mobile**, et 3 téléchargements/décodages simultanés. Les fichiers compressés restent en cache ; les images décodées les plus éloignées sont libérées.
- Préchargement autour de l’image nécessaire, arrêt hors écran, lecteur MP4 de repli si la séquence est indisponible. L’aperçu reste disponible si les deux échouent.
- « Figer » suspend le film. Le réglage système de réduction des mouvements démarre avec une image fixe et conserve les textes lisibles ; l’utilisateur peut reprendre explicitement.
- Sur mobile, toute la scène reste plein écran, avec le sujet cadré dans la partie supérieure pour laisser de la place au texte.

La fluidité réelle dépend du navigateur, de l’appareil et du réseau ; la vidéo source reste à 24 images/seconde. Aucun nombre d’images/seconde universel n’est garanti. Le lecteur ne lance pas de son ou de lecture automatique.

Pour régénérer la séquence à partir du MP4 local :

```sh
node scripts/prepare-film.mjs
npm run build
```

Le script utilise FFmpeg installé comme dépendance de développement. Les images de la galerie peuvent être régénérées avec `node scripts/extract-stills.mjs`. L’hébergement doit accepter les requêtes HTTP Range pour le lecteur MP4 de repli. Les images et le film sont des créations Firefly fournies pour le projet, sans prétention de documenter les variantes historiques.

## Audio, compte et contenus

L’ambiance est une nappe originale Web Audio, activée uniquement au clic. Le bouton coupe aussi les clics d’interface. Aucun fichier audio tiers n’est nécessaire.

Le profil est une démonstration locale : pseudo et avatar recadré à 256 × 256 stockés dans `localStorage`. Ce n’est pas une authentification serveur. La déconnexion supprime ce profil du navigateur. Pour des comptes partagés entre appareils, ajouter une authentification et un stockage d’images côté serveur.

Les polices Inter et Barlow Condensed sont chargées depuis Google Fonts avec repli système. Pour un déploiement autonome, héberger leurs WOFF2 et licences localement. Les panneaux de présentation décrivent les trois axes du projet ; ils peuvent être remplacés par les véritables noms, photos et biographies de votre équipe.

## Vérification

```sh
npm run build
npx playwright test
```

Chrome installé localement est utilisé sans téléchargement d’un second navigateur. Les tests vérifient le chargement du modèle, rotation/zoom, défilement dans les deux sens, dimensions plein écran, limites du cache décodé, navigation annuelle, pause/reprise, galerie, mobile, mouvements réduits, repli MP4 et ouverture via Live Server. Les captures de vérification se trouvent dans `test-results/`.

## Sources historiques

- [ARES — Introduction to Basic AK-Type Rifle Identification](https://armamentresearch.com/wp-content/uploads/2014/12/ARES-Research-Note-No.-6-Introduction-to-Basic-AK-Type-Rifle-Identification.pdf)
- [Small Arms Survey — Self-loading Rifles](https://www.smallarmssurvey.org/sites/default/files/resources/SAS-WP25-Self-loading-rifles.pdf)

L’objet 3D et le film conservent leur propre apparence pendant la lecture : ils ne se transforment pas en reproductions certifiées de chaque génération historique.
