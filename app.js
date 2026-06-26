"use strict";

/* =========================================================================
   Tableau de bord ville — France
   APIs gratuites sans clé :
   - Géocodage + population : Open-Meteo Geocoding
   - Météo : Open-Meteo Forecast
   - Qualité de l'air : Open-Meteo Air Quality
   - Carburants : data.economie.gouv.fr (Opendatasoft)
   ========================================================================= */

const $ = (id) => document.getElementById(id);

// ---- Météo : codes WMO -> description + emoji ----------------------------
const WMO = {
  0:  ["Ciel dégagé", "☀️"],
  1:  ["Plutôt dégagé", "🌤️"],
  2:  ["Partiellement nuageux", "⛅"],
  3:  ["Couvert", "☁️"],
  45: ["Brouillard", "🌫️"],
  48: ["Brouillard givrant", "🌫️"],
  51: ["Bruine légère", "🌦️"],
  53: ["Bruine", "🌦️"],
  55: ["Bruine dense", "🌧️"],
  56: ["Bruine verglaçante", "🌧️"],
  57: ["Bruine verglaçante", "🌧️"],
  61: ["Pluie faible", "🌧️"],
  63: ["Pluie", "🌧️"],
  65: ["Pluie forte", "🌧️"],
  66: ["Pluie verglaçante", "🌧️"],
  67: ["Pluie verglaçante", "🌧️"],
  71: ["Neige faible", "🌨️"],
  73: ["Neige", "🌨️"],
  75: ["Neige forte", "❄️"],
  77: ["Grésil", "🌨️"],
  80: ["Averses faibles", "🌦️"],
  81: ["Averses", "🌧️"],
  82: ["Averses violentes", "⛈️"],
  85: ["Averses de neige", "🌨️"],
  86: ["Averses de neige", "❄️"],
  95: ["Orage", "⛈️"],
  96: ["Orage + grêle", "⛈️"],
  99: ["Orage + grêle", "⛈️"],
};
const wmo = (c) => WMO[c] || ["—", "❓"];

// ---- Indice européen de qualité de l'air ---------------------------------
function aqiInfo(v) {
  if (v == null) return ["—", "Inconnu", "#555"];
  if (v <= 20)  return [v, "Très bon", "#51cf66"];
  if (v <= 40)  return [v, "Bon", "#94d82d"];
  if (v <= 60)  return [v, "Moyen", "#ffd43b"];
  if (v <= 80)  return [v, "Médiocre", "#ff922b"];
  if (v <= 100) return [v, "Mauvais", "#fa5252"];
  return [v, "Très mauvais", "#ae3ec9"];
}

// ---- Direction du vent : degrés -> rose des vents ------------------------
const COMPASS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
const compass = (deg) => COMPASS[Math.round(deg / 45) % 8];

// ---- Indice UV : niveau + alerte (échelle OMS) ---------------------------
function uvLevel(v) {
  if (v == null) return ["—", "", ""];
  if (v < 3)  return [v, "faible", ""];
  if (v < 6)  return [v, "modéré", ""];
  if (v < 8)  return [v, "élevé", "high"];
  if (v < 11) return [v, "très élevé", "high"];
  return [v, "extrême", "extreme"];
}

// ---- Pollen : grains/m³ -> libellé ---------------------------------------
function pollenLevel(v) {
  if (v == null) return "—";
  if (v < 1)   return "nul";
  if (v < 20)  return `faible (${v.toFixed(0)})`;
  if (v < 50)  return `modéré (${v.toFixed(0)})`;
  if (v < 100) return `élevé (${v.toFixed(0)})`;
  return `très élevé (${v.toFixed(0)})`;
}

// ---- Carburants ----------------------------------------------------------
const FUELS = [
  { key: "gazole_prix", label: "Gazole" },
  { key: "sp95_prix",   label: "SP95" },
  { key: "sp98_prix",   label: "SP98" },
  { key: "e10_prix",    label: "E10" },
  { key: "e85_prix",    label: "E85" },
  { key: "gplc_prix",   label: "GPLc" },
];

// ---- Helpers -------------------------------------------------------------
const setStatus = (msg, isError = false) => {
  const el = $("status");
  el.textContent = msg || "";
  el.className = "status" + (isError ? " error" : "");
};

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const fmtTime = (iso) => iso ? iso.slice(11, 16) : "—";
// Valeur horaire correspondant à l'heure de référence (heure locale ville)
function currentHourValue(times, values, refTime) {
  if (!times || !values || !refTime) return null;
  const key = refTime.slice(0, 13); // "YYYY-MM-DDTHH"
  const i = times.findIndex((t) => t.slice(0, 13) === key);
  return values[i >= 0 ? i : 0];
}
const fmtNum = (n) => n == null ? "—" : Number(n).toLocaleString("fr-FR");
const dayName = (iso) =>
  new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });

// =========================================================================
//  Recherche / autocomplétion
// =========================================================================
let suggestTimer = null;
let currentSuggestions = [];

async function fetchSuggestions(name) {
  if (name.trim().length < 2) { hideSuggestions(); return; }
  try {
    const data = await getJSON(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}` +
      `&count=8&language=fr&format=json&countryCode=FR`
    );
    currentSuggestions = data.results || [];
    renderSuggestions();
  } catch (_) { hideSuggestions(); }
}

function renderSuggestions() {
  const ul = $("suggestions");
  if (!currentSuggestions.length) { hideSuggestions(); return; }
  ul.innerHTML = currentSuggestions.map((r, i) => {
    const sub = [r.admin2, r.admin1].filter(Boolean).join(" · ");
    const cp = r.postcodes && r.postcodes[0] ? r.postcodes[0] : "";
    return `<li data-i="${i}">${r.name} ${cp ? `<small>${sub}${sub ? " — " : ""}${cp}</small>` : `<small>${sub}</small>`}</li>`;
  }).join("");
  ul.hidden = false;
  ul.querySelectorAll("li").forEach((li) =>
    li.addEventListener("click", () => selectPlace(currentSuggestions[+li.dataset.i]))
  );
}
function hideSuggestions() { $("suggestions").hidden = true; }

// =========================================================================
//  Sélection d'une ville -> chargement de tout
// =========================================================================
const REFRESH_MS = 10 * 60 * 1000; // auto-rafraîchissement toutes les 10 min
let currentPlace = null;
let refreshTimer = null;

async function selectPlace(place) {
  hideSuggestions();
  $("city-input").value = place.name;
  $("dashboard").hidden = false;
  currentPlace = place;

  // En-tête + infos figées (ne changent pas avec le temps)
  $("place-name").textContent = place.name;
  $("place-sub").textContent =
    [place.admin2, place.admin1, place.country].filter(Boolean).join(" · ");
  $("population").textContent = place.population ? fmtNum(place.population) + " hab." : "non renseignée";
  $("region").textContent = place.admin1 || "—";
  $("departement").textContent = place.admin2 || "—";
  $("cp").textContent = (place.postcodes && place.postcodes[0]) || "—";
  $("altitude").textContent = place.elevation != null ? Math.round(place.elevation) + " m" : "—";
  $("coords").textContent = `${place.latitude.toFixed(3)}, ${place.longitude.toFixed(3)}`;

  updateFavBtn(place);
  saveLastCity(place);
  renderFavorites();

  await loadData(place);
  scheduleRefresh();
}

// Charge / recharge les données vivantes (météo, air, carburants)
async function loadData(place) {
  setStatus("Chargement…");
  const { latitude: lat, longitude: lon } = place;
  const results = await Promise.allSettled([
    loadWeather(lat, lon),
    loadAir(lat, lon),
    loadFuel(lat, lon),
    loadCommuneAndRisks(lat, lon),
  ]);
  const failed = results.filter((r) => r.status === "rejected").length;
  setStatus(failed ? `${failed} source(s) momentanément indisponible(s).` : "", failed > 0);
  $("updated").textContent =
    "mis à jour à " + new Date().toLocaleTimeString("fr-FR") + " · rafraîchissement auto toutes les 10 min";
}

// (Re)programme le rafraîchissement automatique de la ville courante
function scheduleRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    if (currentPlace && !document.hidden) loadData(currentPlace);
  }, REFRESH_MS);
}

// Rafraîchit aussi quand on revient sur l'onglet après une longue absence
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && currentPlace) loadData(currentPlace);
});

// ---- Météo ---------------------------------------------------------------
async function loadWeather(lat, lon) {
  const data = await getJSON(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,surface_pressure` +
    `&hourly=uv_index` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum` +
    `&timezone=auto&forecast_days=7`
  );
  const c = data.current, d = data.daily;
  const [desc, icon] = wmo(c.weather_code);
  $("weather-icon").textContent = icon;
  $("temp").textContent = Math.round(c.temperature_2m) + "°C";
  $("weather-desc").textContent = desc;
  $("feels").textContent = Math.round(c.apparent_temperature) + "°C";
  $("humidity").textContent = c.relative_humidity_2m + " %";
  $("wind").textContent = Math.round(c.wind_speed_10m) + " km/h";
  $("gust").textContent = Math.round(c.wind_gusts_10m) + " km/h";
  // Direction : flèche orientée (le vent vient de cette direction)
  $("wdir").innerHTML = `${compass(c.wind_direction_10m)} ` +
    `<span class="wind-arrow" style="transform:rotate(${c.wind_direction_10m}deg)">↓</span>`;
  $("precip").textContent = c.precipitation + " mm";
  $("pressure").textContent = Math.round(c.surface_pressure) + " hPa";
  $("sunrise").textContent = fmtTime(d.sunrise[0]);
  $("sunset").textContent = fmtTime(d.sunset[0]);

  // UV : valeur de l'heure courante (horaire) + max du jour + alerte
  const uvNow = currentHourValue(data.hourly?.time, data.hourly?.uv_index, c.time);
  const [uvVal, uvLab, uvCls] = uvLevel(uvNow);
  $("uv-now").textContent = uvNow != null ? `${Math.round(uvVal)} (${uvLab})` : "—";
  $("uv").textContent = d.uv_index_max[0] != null ? Math.round(d.uv_index_max[0]) : "—";
  const alert = $("uv-alert");
  if (uvCls) {
    alert.hidden = false;
    alert.className = "uv-alert" + (uvCls === "extreme" ? " extreme" : "");
    alert.textContent = `☀️ UV ${uvLab} (${Math.round(uvVal)}) — protection conseillée.`;
  } else { alert.hidden = true; }

  // Prévisions
  $("forecast").innerHTML = d.time.map((t, i) => {
    const [, ic] = wmo(d.weather_code[i]);
    return `<div class="fc-day">
      <div class="d">${dayName(t)}</div>
      <div class="ic">${ic}</div>
      <div><span class="tmax">${Math.round(d.temperature_2m_max[i])}°</span>
           <span class="tmin">${Math.round(d.temperature_2m_min[i])}°</span></div>
    </div>`;
  }).join("");
}

// ---- Qualité de l'air ----------------------------------------------------
async function loadAir(lat, lon) {
  const data = await getJSON(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
    `&current=european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,grass_pollen,birch_pollen,ragweed_pollen,alder_pollen&timezone=auto`
  );
  const c = data.current;
  const [val, label, color] = aqiInfo(c.european_aqi);
  $("aqi-value").textContent = val;
  $("aqi-label").textContent = label;
  $("aqi-badge").style.background = color + "33";
  $("aqi-badge").style.color = color;
  $("pm25").textContent = (c.pm2_5 ?? "—") + " µg/m³";
  $("pm10").textContent = (c.pm10 ?? "—") + " µg/m³";
  $("no2").textContent = (c.nitrogen_dioxide ?? "—") + " µg/m³";
  $("o3").textContent = (c.ozone ?? "—") + " µg/m³";
  $("p-grass").textContent = pollenLevel(c.grass_pollen);
  $("p-birch").textContent = pollenLevel(c.birch_pollen);
  $("p-ragweed").textContent = pollenLevel(c.ragweed_pollen);
  $("p-alder").textContent = pollenLevel(c.alder_pollen);
}

// ---- Carburants ----------------------------------------------------------
async function loadFuel(lat, lon) {
  const select = "ville,adresse,cp," + FUELS.map((f) => f.key).join(",") + ",geom";
  const url =
    `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/` +
    `prix-des-carburants-en-france-flux-instantane-v2/records` +
    `?where=within_distance(geom%2C%20geom%27POINT(${lon}%20${lat})%27%2C%2015km)` +
    `&select=${encodeURIComponent(select)}&limit=100`;
  const data = await getJSON(url);
  const stations = (data.results || []).map((s) => ({
    ...s,
    dist: s.geom ? haversine(lat, lon, s.geom.lat, s.geom.lon) : null,
  }));

  $("fuel").innerHTML = FUELS.map((f) => {
    const avail = stations.filter((s) => typeof s[f.key] === "number");
    if (!avail.length) {
      return `<div class="fuel-card empty"><div class="ft">${f.label}</div>
        <div class="price">—</div><div class="where">Aucune station</div></div>`;
    }
    const best = avail.reduce((a, b) => (b[f.key] < a[f.key] ? b : a));
    const dist = best.dist != null ? ` · ${best.dist.toFixed(1)} km` : "";
    return `<div class="fuel-card">
      <div class="ft">${f.label}</div>
      <div class="price">${best[f.key].toFixed(3)}<small> €/L</small></div>
      <div class="where">${best.adresse || ""}, ${best.ville || ""}${dist}</div>
    </div>`;
  }).join("");
}

// ---- Commune (geo.api.gouv.fr) + Risques (Géorisques) --------------------
async function loadCommuneAndRisks(lat, lon) {
  const arr = await getJSON(
    `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lon}` +
    `&fields=nom,code,codeDepartement,surface,population&format=json`
  );
  const com = arr && arr[0];
  if (!com) { $("risk").innerHTML = `<span class="muted">Commune introuvable.</span>`; return; }

  // surface est en hectares -> km²
  const km2 = com.surface != null ? com.surface / 100 : null;
  if (com.population) $("population").textContent = fmtNum(com.population) + " hab.";
  $("surface").textContent = km2 != null ? km2.toFixed(1) + " km²" : "—";
  $("density").textContent = (km2 && com.population)
    ? fmtNum(Math.round(com.population / km2)) + " hab/km²" : "—";
  $("insee").textContent = com.code || "—";

  await loadRisks(com.code);
}

async function loadRisks(insee) {
  if (!insee) return;
  const data = await getJSON(
    `https://www.georisques.gouv.fr/api/v1/gaspar/risques?code_insee=${insee}&page_size=20`
  );
  const detail = data.data?.[0]?.risques_detail || [];
  // garde les risques "principaux" (numéro court), ignore les sous-catégories
  const risks = detail.filter((r) => r.num_risque && r.num_risque.length <= 2);
  if (!risks.length) {
    $("risk").innerHTML = `<span class="muted">Aucun risque majeur recensé.</span>`;
    return;
  }
  $("risk").innerHTML = risks.map((r) => {
    const lib = r.libelle_risque_long || "";
    let cls = "";
    if (/séisme|sismic/i.test(lib)) cls = " sismique";
    else if (/inondation/i.test(lib)) cls = " inond";
    return `<span class="risk-chip${cls}">${lib}</span>`;
  }).join("");
}

// =========================================================================
//  Favoris + dernière ville (localStorage)
// =========================================================================
const FAV_KEY = "dashboard.favoris";
const LAST_KEY = "dashboard.derniere";

const getFavs = () => { try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch { return []; } };
const setFavs = (f) => localStorage.setItem(FAV_KEY, JSON.stringify(f));
const placeId = (p) => `${p.name}|${p.latitude}|${p.longitude}`;

function saveLastCity(p) { localStorage.setItem(LAST_KEY, JSON.stringify(p)); }

function isFav(p) { return getFavs().some((f) => placeId(f) === placeId(p)); }

function updateFavBtn(p) {
  const btn = $("fav-btn");
  btn.textContent = isFav(p) ? "★" : "☆";
  btn.onclick = () => {
    let favs = getFavs();
    if (isFav(p)) favs = favs.filter((f) => placeId(f) !== placeId(p));
    else favs.push(p);
    setFavs(favs);
    updateFavBtn(p);
    renderFavorites();
  };
}

function renderFavorites() {
  const favs = getFavs();
  $("favorites").innerHTML = favs.map((f, i) =>
    `<span class="chip" data-i="${i}">📍 ${f.name}</span>`
  ).join("");
  $("favorites").querySelectorAll(".chip").forEach((c) =>
    c.addEventListener("click", () => selectPlace(getFavs()[+c.dataset.i]))
  );
}

// =========================================================================
//  Événements
// =========================================================================
$("city-input").addEventListener("input", (e) => {
  clearTimeout(suggestTimer);
  const v = e.target.value;
  suggestTimer = setTimeout(() => fetchSuggestions(v), 250);
});

$("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  if (currentSuggestions.length) selectPlace(currentSuggestions[0]);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrap")) hideSuggestions();
});

// Restauration au chargement
renderFavorites();
try {
  const last = JSON.parse(localStorage.getItem(LAST_KEY));
  if (last) selectPlace(last);
} catch (_) {}
