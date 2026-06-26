# 🌍 Tableau de bord — Ville

Un tableau de bord personnel : tape une ville française et obtiens en un coup d'œil la **météo**, la **qualité de l'air**, les **prix des carburants les moins chers** autour, la **population** et d'autres infos utiles.

100 % statique (HTML/CSS/JS), **aucune dépendance, aucune clé API, aucun build**. Ouvre simplement le fichier et c'est parti.

## Fonctionnalités

- 🔎 **Recherche de ville** avec autocomplétion (communes françaises)
- 🌤️ **Météo actuelle** : température, ressenti, humidité, vent, précipitations, indice UV, pression, lever/coucher du soleil
- 📅 **Prévisions sur 7 jours**
- 💨 **Vent** : vitesse, **rafales** et **direction** (flèche orientée)
- ☀️ **Indice UV** horaire + indice max du jour, avec **alerte** quand il est élevé/extrême
- 🍃 **Qualité de l'air** : indice européen coloré + PM2.5, PM10, NO₂, O₃
- 🌾 **Pollens** : graminées, bouleau, ambroisie, aulne
- ⛽ **Carburants** : prix le plus bas pour chaque type (Gazole, SP95, SP98, E10, E85, GPLc) dans un rayon de 15 km, avec la station et la distance
- ⚠️ **Risques naturels & technologiques** (inondation, séisme, etc.) via Géorisques
- 🏙️ **Infos commune** : population, superficie, densité, code INSEE, région, département, code postal, altitude, coordonnées
- 🔄 **Mise à jour automatique** toutes les 10 min (et au retour sur l'onglet)
- ⭐ **Favoris** et mémorisation de la dernière ville (stockés localement dans le navigateur)

## Utilisation

Ouvre `index.html` dans ton navigateur.

> Astuce : si ouvrir le fichier directement (`file://`) pose souci avec les appels réseau, lance un petit serveur local :
> ```bash
> python -m http.server 8000
> # puis ouvre http://localhost:8000
> ```

## Sources de données (gratuites, sans clé)

| Donnée | Source |
|--------|--------|
| Géocodage + population | [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) |
| Météo & prévisions | [Open-Meteo Forecast](https://open-meteo.com/) |
| Qualité de l'air + pollens | [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) |
| Prix des carburants | [data.economie.gouv.fr](https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/) |
| Données commune (INSEE, surface, densité) | [geo.api.gouv.fr](https://geo.api.gouv.fr/) |
| Risques naturels & technologiques | [Géorisques](https://www.georisques.gouv.fr/doc-api) |

Aucune donnée personnelle n'est collectée ni envoyée ailleurs ; favoris et dernière ville restent dans ton navigateur.

## Limites

- Les prix des carburants, données commune et risques couvrent **uniquement la France** (APIs officielles françaises).
- **Vigilance Météo-France non incluse** : son API publique exige une clé d'application (incompatible avec l'objectif « sans clé »). À ajouter si tu acceptes d'enregistrer un token gratuit sur le portail Météo-France.
- Les pollens dépendent de la saison : hors période, les valeurs sont nulles, c'est normal.
