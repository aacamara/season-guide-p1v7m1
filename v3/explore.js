// @ts-check
/* Explore: searchable photo grid with section and quick filter chips. */
import { $, esc, fold, plain, isoToday } from "./util.js";
import { t, secLabel } from "./i18n.js";
import { D, audOK } from "./state.js";
import { cardHTML } from "./cards.js";

const QUICK = [["tod", "qTod"], ["u30", "qU30"], ["u60", "qU60"], ["free", "qFree"], ["book", "qBook"], ["photo", "qPhoto"]];
export const X = { sec: "all", q: "", /** @type {Set<string>} */ quick: new Set(), shown: 36 };
const CHUNK = 36;
/** @type {IntersectionObserver|null} */
let io = null;

/** @param {any} it */
function index(it) {
  if (!it._s) {
    const parts = [it.name, it.area, it.venue, it.sum && it.sum.en, it.sum && it.sum.fr, it.status, it.when];
    if (it.fields) it.fields.forEach((/** @type {[string,string]} */ f) => parts.push(f[1]));
    it._s = fold(parts.filter(Boolean).join(" "));
  }
  return it._s;
}

/** @param {any} it @param {string} [skip] */
function matches(it, skip) {
  if (!audOK(it)) return false;
  if (skip !== "sec") {
    if (X.sec === "events" && it._type !== "event") return false;
    if (X.sec !== "all" && X.sec !== "events" && it.sec !== X.sec) return false;
    if (X.sec === "all" && it._type === "event") return false;
  }
  for (const q of X.quick) {
    if (q === "photo") { if (!it.img) return false; continue; }
    if (it._type === "event") { if (q === "free" ? !/\bfree\b|gratuit/i.test(it.price) : q === "book" ? !/Expected|Not announced|Confirm/.test(it.status) : true) return false; continue; }
    if (!it.q || !it.q[q]) return false;
  }
  if (X.q) { const words = fold(X.q).split(/\s+/).filter(Boolean); const s = index(it); if (!words.every(w => s.includes(w))) return false; }
  return true;
}

function results() {
  const today = isoToday();
  const list = (X.sec === "events" ? D.events : D.entries).filter((/** @type {any} */ it) => matches(it));
  if (X.sec === "events") {
    const first = (/** @type {any} */ e) => e.days.find((/** @type {string} */ d) => d >= today) || e.days[0] || "9999";
    return list.sort((/** @type {any} */ a, /** @type {any} */ b) => first(a).localeCompare(first(b)));
  }
  const score = (/** @type {any} */ e) => (e.top ? 0 : e.rank ? 1 : 2) * 10 + (e.img ? 0 : 1);
  return list.sort((/** @type {any} */ a, /** @type {any} */ b) => score(a) - score(b) || (a.top || a.rank || 0) - (b.top || b.rank || 0) || plain(a.name).localeCompare(plain(b.name)));
}

/** @param {HTMLElement} view */
export function renderExplore(view) {
  const counts = /** @type {Record<string, number>} */ ({ all: D.entries.filter((/** @type {any} */ e) => matches(e, "sec")).length, events: D.events.filter((/** @type {any} */ e) => matches(e, "sec")).length });
  D.sections.forEach((/** @type {any} */ s) => { counts[s.key] = D.entries.filter((/** @type {any} */ e) => e.sec === s.key && matches(e, "sec")).length; });
  const secs = [["all", t("allSections")]].concat(D.sections.map((/** @type {any} */ s) => [s.key, secLabel(s)]), [["events", t("events")]]);
  view.innerHTML = `
  <div class="explore">
    <div class="ex-head">
      <label class="search"><span class="sr">${esc(t("search"))}</span>
        <input type="search" id="q" placeholder="${esc(t("search"))}" value="${esc(X.q)}" autocomplete="off" enterkeyhint="search"></label>
      <div class="chiprow" role="group" aria-label="${esc(t("tabExplore"))}">
        ${secs.map(([k, l]) => `<button type="button" class="chip" data-sec="${k}" aria-pressed="${X.sec === k}">${esc(l)} <span class="ct">${counts[k] || 0}</span></button>`).join("")}
      </div>
      <div class="chiprow quick" role="group">
        ${QUICK.map(([k, l]) => `<button type="button" class="chip chip-q" data-quick="${k}" aria-pressed="${X.quick.has(k)}">${esc(t(l))}</button>`).join("")}
      </div>
    </div>
    <div class="ex-status" id="ex-status" aria-live="polite"></div>
    <div class="grid" id="grid"></div>
    <div class="sentinel" id="sentinel"></div>
  </div>`;
  const sel = /** @type {HTMLElement|null} */ (view.querySelector('.chip[data-sec][aria-pressed="true"]'));
  if (sel) sel.scrollIntoView({ block: "nearest", inline: "center" });
  fillGrid(view);

  const q = /** @type {HTMLInputElement} */ ($("#q", view));
  let deb = 0;
  q.addEventListener("input", () => { clearTimeout(deb); deb = window.setTimeout(() => { X.q = q.value.trim(); X.shown = CHUNK; fillGrid(view); }, 140); });
  view.querySelectorAll("[data-sec]").forEach(b => b.addEventListener("click", () => {
    X.sec = /** @type {string} */ (b.getAttribute("data-sec")); X.shown = CHUNK;
    view.querySelectorAll("[data-sec]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    fillGrid(view);
  }));
  view.querySelectorAll("[data-quick]").forEach(b => b.addEventListener("click", () => {
    const k = /** @type {string} */ (b.getAttribute("data-quick"));
    if (X.quick.has(k)) X.quick.delete(k); else X.quick.add(k);
    if (k === "u30" && X.quick.has("u30")) X.quick.delete("u60");
    if (k === "u60" && X.quick.has("u60")) X.quick.delete("u30");
    view.querySelectorAll("[data-quick]").forEach(x => x.setAttribute("aria-pressed", String(X.quick.has(/** @type {string} */ (x.getAttribute("data-quick"))))));
    X.shown = CHUNK; fillGrid(view);
  }));
}

/** @param {HTMLElement} view */
function fillGrid(view) {
  const list = results(), grid = $("#grid", view), status = $("#ex-status", view);
  const today = isoToday();
  const n = list.length;
  status.innerHTML = n ? `<span>${esc(n === 1 ? t("oneResult") : t("results", { n }))}</span>${X.q || X.quick.size ? `<button type="button" class="btn-sm" id="ex-clear">${esc(t("clear"))}</button>` : ""}`
    : `<span>${esc(t("noResults"))}</span><button type="button" class="btn-sm" id="ex-clear">${esc(t("clear"))}</button>`;
  const clr = view.querySelector("#ex-clear");
  if (clr) clr.addEventListener("click", () => { X.q = ""; X.quick.clear(); X.shown = CHUNK; renderExplore(view); });
  // Append only the new cards so scroll position and loaded photos are kept.
  const have = grid.children.length && grid.dataset.key === key() ? grid.children.length : 0;
  if (!have) grid.innerHTML = "";
  grid.dataset.key = key();
  grid.insertAdjacentHTML("beforeend", list.slice(have, X.shown).map((/** @type {any} */ it) => cardHTML(it, {
    size: "sm", sum: true, iso: it._type === "event" ? (it.days.find((/** @type {string} */ d) => d >= today) || it.days[0]) : undefined,
  })).join(""));
  if (io) io.disconnect();
  if (X.shown < n) {
    io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { X.shown += CHUNK; fillGrid(view); } }, { rootMargin: "600px" });
    io.observe($("#sentinel", view));
  }
}
const key = () => [X.sec, X.q, [...X.quick].sort().join(","), document.documentElement.lang].join("|");
