// @ts-check
/* Today: date-aware home feed. */
import { $, esc, md, isoToday, dayRange, dayLabel, parseTime, seeded, weekday, daysBetween } from "./util.js";
import { t, lang } from "./i18n.js";
import { D, S, audOK } from "./state.js";
import { rowHTML } from "./cards.js";
import { fillWeather } from "./weather.js";

/** Clamp a date to the trip window and say why if it moved. @param {string} [iso] */
export function pickDay(iso) {
  const { start, end } = D.meta;
  if (iso && iso >= start && iso <= end) return { iso, note: "" };
  const real = isoToday();
  if (real < start) return { iso: start, note: t("beforeTrip") };
  if (real > end) return { iso: end, note: t("afterTrip") };
  return { iso: real, note: "" };
}

/** Dated events on a day that suit the current audience. @param {string} iso */
export const eventsOn = iso => D.events.filter((/** @type {any} */ ev) => ev.days.includes(iso) && audOK(ev));

/** @param {any} ev */
const isEvening = ev => { const tm = parseTime(ev.time); return tm ? tm >= "17:00" : ev.cats.some((/** @type {string} */ c) => c === "music" || c === "romantic"); };

/** Clash note as a one-line summary (its bold lead) that expands to the full text. @param {string} text */
function clashHTML(text) {
  const m = text.match(/^\*\*(.+?)\*\*\s*/);
  const lead = m ? m[1] : text.split(/(?<=\.)\s/)[0];
  const rest = m ? text.slice(m[0].length) : text.slice(lead.length);
  return `<details class="clash g-yellow"><summary><b>${esc(t("clashNight"))}</b> ${esc(lead)}</summary>${rest.trim() ? `<div class="clash-more">${md(rest)}</div>` : ""}</details>`;
}

/** @param {any[]} tops @param {any[]} rest @param {number} seed @param {number} n */
function mix(tops, rest, seed, n) {
  const a = seeded(tops, seed).slice(0, 2), b = seeded(rest.filter(x => !a.includes(x)), seed + 7);
  return a.concat(b).slice(0, n);
}

/** @param {HTMLElement} view @param {string} [wanted] */
export function renderToday(view, wanted) {
  const { iso, note } = pickDay(wanted);
  const days = dayRange(D.meta.start, D.meta.end);
  const idx = Math.max(0, days.indexOf(iso));
  const evs = eventsOn(iso);
  const dated = evs.filter((/** @type {any} */ e) => e.mode === "day");
  const tonight = dated.filter(isEvening), daytime = dated.filter((/** @type {any} */ e) => !isEvening(e));
  const running = evs.filter((/** @type {any} */ e) => e.mode === "run");
  const arrived = iso >= D.meta.arrive;
  const show = (/** @type {string} */ a) => S.aud === "all" || S.aud === a;
  const E = D.entries;

  // With the girls: well-rated family places, top picks first, rotated by day.
  const fam = E.filter((/** @type {any} */ e) => e.suits.includes("family") && (e.fit === "great" || e.fit === "fine") && ["kids", "sights", "family", "restaurants"].includes(e.sec));
  const girls = mix(fam.filter((/** @type {any} */ e) => e.top), fam.filter((/** @type {any} */ e) => !e.top), idx, 8);

  // The two of you: ranked date nights first; Fri and Sat lean to weekend escapes.
  const wd = weekday(iso);
  const coupleSecs = wd === 5 || wd === 6 ? ["weekends", "romantic", "music"] : ["romantic", "music", "weekends"];
  const cp = E.filter((/** @type {any} */ e) => e.suits.includes("couple") && coupleSecs.includes(e.sec));
  const couple = mix(cp.filter((/** @type {any} */ e) => e.rank || e.sec === coupleSecs[0]), cp, idx + 3, 8);

  // One adult: before Dec 4 the wife's evenings (arts, music); Dec 10 to 19 the work block (AI and tech).
  const biz = iso >= "2026-12-10" && iso <= "2026-12-19";
  const soloSecs = biz ? ["ai"] : arrived ? ["arts", "music", "sports", "ai"] : ["arts", "music"];
  const solo = seeded(E.filter((/** @type {any} */ e) => e.suits.includes("solo") && soloSecs.includes(e.sec)), idx + 11).slice(0, 8);
  const soloTitle = biz ? t("bizBlock") : !arrived ? t("wifeStretch") : t("oneAdult");

  const hero = D.heroes.length ? D.heroes[idx % D.heroes.length] : null;
  const clash = D.clashes[iso];
  const dayEvents = (/** @type {string} */ d) => D.events.some((/** @type {any} */ e) => e.mode === "day" && e.days.includes(d) && audOK(e));

  view.innerHTML = `
  <section class="hero-today${hero ? " has-photo" : ""}">
    ${hero ? `<img class="hero-img" src="${esc(hero.src)}" alt="${esc(hero.title)}">` : ""}
    <div class="hero-in">
      <p class="hero-k">${esc(t("appName"))}</p>
      <h1 class="hero-d">${esc(dayLabel(iso, lang, true))}</h1>
      ${note ? `<p class="hero-note">${esc(note)}</p>` : ""}
      <div class="weather" id="weather" aria-live="polite"></div>
    </div>
    ${hero ? `<a class="hero-credit" href="${esc(hero.link)}" target="_blank" rel="noopener noreferrer">${esc(t("photoBy"))}: ${esc(hero.title)}, ${esc(hero.credit)}</a>` : ""}
  </section>

  <nav class="strip" aria-label="${esc(t("dayStrip"))}">
    ${days.map(d => {
      const sel = d === iso, ev = dayEvents(d), cl = !!D.clashes[d], arr = d === D.meta.arrive;
      return `<button type="button" class="day${sel ? " sel" : ""}${cl ? " clash" : ""}${arr ? " arrive" : ""}" data-day="${d}" ${sel ? 'aria-current="date"' : ""} aria-label="${esc(dayLabel(d, lang, true))}">
        <span class="dw">${esc(dayLabel(d, lang).split(" ")[0].replace(".", ""))}</span><span class="dn">${+d.slice(8)}</span>
        <span class="dm">${ev ? '<i class="dot"></i>' : ""}${cl ? '<i class="dot dot-c"></i>' : ""}</span>
      </button>`;
    }).join("")}
  </nav>

  <div class="feed">
    ${clash ? clashHTML(clash) : ""}
    ${rowHTML(t("tonight"), tonight, { iso, id: "tonight" }) || (dated.length ? "" : `<p class="row-empty">${esc(t("nothingTonight"))}</p>`)}
    ${rowHTML(t("daytime"), daytime, { iso })}
    ${show("family") ? rowHTML(t("withGirls"), girls) : ""}
    ${show("couple") ? rowHTML(arrived ? t("twoOfYou") : t("twoOfYouLater"), couple, { note: arrived ? "" : t("twoOfYouLaterNote") }) : ""}
    ${show("solo") ? rowHTML(soloTitle, solo) : ""}
    ${rowHTML(t("runningNow"), running, { iso })}
    <aside class="foot-card g-panel">
      <a class="btn" href="${esc(D.meta.fullGuide)}">${esc(t("fullGuide"))}</a>
      <p class="small muted">${esc(t("fullGuideNote"))}</p>
      <p class="small muted install-hint">${esc(t("installHint"))}</p>
    </aside>
  </div>`;

  fillWeather($("#weather", view), iso, D.sunset);
  const sel = /** @type {HTMLElement|null} */ (view.querySelector(".day.sel"));
  if (sel) requestAnimationFrame(() => sel.scrollIntoView({ block: "nearest", inline: "center" }));
  return { iso, daysToArrive: daysBetween(iso, D.meta.arrive) };
}
