// @ts-check
/* Daily forecast for Dakar from Open-Meteo (free, no key, no account), cached for an hour.
   Beyond the 16-day horizon, offline, or on error, callers fall back to the researched sunset table. */
import { store, esc, plain } from "./util.js";
import { t } from "./i18n.js";

const K_W = "dkr3-weather";
const URL_W = "https://api.open-meteo.com/v1/forecast?latitude=14.72&longitude=-17.45"
  + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,wind_speed_10m_max,sunset"
  + "&timezone=Africa%2FDakar&forecast_days=16";

/** @typedef {{code:number, tmax:number, tmin:number, rain:number|null, uv:number|null, wind:number|null, sunset:string|null}} Day */
/** @type {Promise<Record<string, Day>|null>|null} */
let pending = null;

/** @returns {Promise<Record<string, Day>|null>} */
export function forecast() {
  const cached = store.get(K_W, null);
  if (cached && Date.now() - cached.at < 36e5) return Promise.resolve(cached.days);
  if (pending) return pending;
  pending = fetch(URL_W, { referrerPolicy: "no-referrer" })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
    .then(j => {
      const d = j.daily, days = /** @type {Record<string, Day>} */ ({});
      d.time.forEach((/** @type {string} */ iso, /** @type {number} */ i) => {
        days[iso] = {
          code: d.weather_code[i], tmax: Math.round(d.temperature_2m_max[i]), tmin: Math.round(d.temperature_2m_min[i]),
          rain: d.precipitation_probability_max ? d.precipitation_probability_max[i] : null,
          uv: d.uv_index_max ? Math.round(d.uv_index_max[i]) : null,
          wind: d.wind_speed_10m_max ? Math.round(d.wind_speed_10m_max[i]) : null,
          sunset: d.sunset && d.sunset[i] ? String(d.sunset[i]).slice(11, 16) : null,
        };
      });
      store.set(K_W, { at: Date.now(), days });
      return days;
    })
    .catch(() => (cached ? cached.days : null))
    .finally(() => { pending = null; });
  return pending;
}

/** @param {number} c */
function label(c) {
  if (c === 0) return t("wClear");
  if (c <= 2) return t("wMostly");
  if (c === 3) return t("wCloudy");
  if (c === 45 || c === 48) return t("wFog");
  if (c >= 51 && c <= 57) return t("wDrizzle");
  if (c >= 61 && c <= 67) return t("wRain");
  if (c >= 80 && c <= 82) return t("wShowers");
  if (c >= 95) return t("wStorm");
  return t("wMostly");
}

/** Researched sunset for a date: nearest row of the sourced table, marked "about". @param {any} sunsetData @param {string} iso */
export function tableSunset(sunsetData, iso) {
  const rows = sunsetData.rows.map((/** @type {string[]} */ r) => {
    const m = plain(r[1]).match(/(\d{1,2}:\d{2})/);
    const d = new Date(r[0] + " 2026 12:00 UTC");
    return m && !isNaN(d.getTime()) ? { iso: d.toISOString().slice(0, 10), time: m[1] } : null;
  }).filter(Boolean);
  if (!rows.length) return null;
  const target = Date.parse(iso);
  rows.sort((/** @type {any} */ a, /** @type {any} */ b) => Math.abs(Date.parse(a.iso) - target) - Math.abs(Date.parse(b.iso) - target));
  return /** @type {any} */ (rows[0]).time;
}

/** Fill a weather card element for a day. @param {HTMLElement} el @param {string} iso @param {any} sunsetData */
export function fillWeather(el, iso, sunsetData) {
  const fallbackSun = tableSunset(sunsetData, iso);
  const sunLine = (/** @type {string|null} */ s, /** @type {boolean} */ about) =>
    s ? `<span class="w-sun"><span class="w-k">${esc(t("sunset"))}</span> ${about ? esc(t("sunsetAbout")) + " " : ""}<b>${esc(s)}</b></span>` : "";
  el.innerHTML = `<span class="w-main muted">${esc(t("weatherLoading"))}</span>${sunLine(fallbackSun, true)}`;
  forecast().then(days => {
    const day = days && days[iso];
    if (!day) {
      el.innerHTML = `<span class="w-main muted">${esc(days ? t("weatherNone") : t("weatherOff"))}</span>${sunLine(fallbackSun, true)}`;
      return;
    }
    const tips = [];
    if (day.uv != null && day.uv >= 8) tips.push(t("uvHigh", { uv: day.uv }));
    if (day.wind != null && day.wind >= 28) tips.push(t("windy", { w: day.wind }));
    if (day.rain != null && day.rain >= 30) tips.push(t("rain", { p: day.rain }));
    el.innerHTML = `<span class="w-main"><b class="w-t">${day.tmax}°</b><span class="w-lo">${day.tmin}°</span> ${esc(label(day.code))}</span>
      ${sunLine(day.sunset || fallbackSun, !day.sunset)}
      ${tips.length ? `<ul class="w-tips">${tips.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      <span class="w-src">${esc(t("forecastSrc"))}</span>`;
  });
}
