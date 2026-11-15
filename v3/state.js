// @ts-check
/* App data and per-device state. Everything personal stays in this browser's storage. */
import { store } from "./util.js";

const K = { aud: "dkr3-aud", stars: "dkr3-stars", passes: "dkr3-passes", plan: "dkr3-plan", partner: "dkr3-partner", label: "dkr3-label" };

/** @type {any} */
export let D = null;
/** @type {Record<string, any>} */
export const BYID = {};
/** @param {any} data */
export function setData(data) {
  D = data;
  data.entries.forEach((/** @type {any} */ e) => { BYID[e.id] = e; e._type = "entry"; });
  data.events.forEach((/** @type {any} */ e) => { BYID[e.id] = e; e._type = "event"; e.name = e.title; e.area = e.venue; e.cat = (e.cats && e.cats[0]) || "family"; });
}

export const AUDS = ["all", "family", "couple", "solo"];
export const S = {
  /** @type {string} */ aud: AUDS.includes(store.get(K.aud, "all")) ? store.get(K.aud, "all") : "all",
  /** @type {Set<string>} */ stars: new Set(store.get(K.stars, [])),
  /** @type {Set<string>} */ passes: new Set(store.get(K.passes, [])),
  /** @type {Record<string, string[]>} */ plan: store.get(K.plan, {}) || {},
  /** @type {null | {label:string, s:string[], p:Record<string,string[]>, at:number}} */ partner: store.get(K.partner, null),
  /** @type {string} */ label: store.get(K.label, ""),
};
export function save() {
  store.set(K.aud, S.aud); store.set(K.stars, [...S.stars]); store.set(K.passes, [...S.passes]);
  store.set(K.plan, S.plan); store.set(K.partner, S.partner); store.set(K.label, S.label);
}

/** @param {{suits?: string[]}} item */
export const audOK = item => S.aud === "all" || (item.suits || []).includes(S.aud);

/** @param {string} id @returns {boolean} new starred state */
export function toggleStar(id) {
  if (S.stars.has(id)) S.stars.delete(id); else { S.stars.add(id); S.passes.delete(id); }
  save();
  document.querySelectorAll(`[data-star="${CSS.escape(id)}"]`).forEach(b => b.setAttribute("aria-pressed", String(S.stars.has(id))));
  return S.stars.has(id);
}

/** @param {string} iso @param {string} id */
export function addToPlan(iso, id) {
  const day = S.plan[iso] || (S.plan[iso] = []);
  if (!day.includes(id)) day.push(id);
  save();
}
/** @param {string} iso @param {string} id */
export function removeFromPlan(iso, id) {
  const day = S.plan[iso]; if (!day) return;
  S.plan[iso] = day.filter(x => x !== id);
  if (!S.plan[iso].length) delete S.plan[iso];
  save();
}
export const plannedCount = () => Object.values(S.plan).reduce((n, a) => n + a.length, 0);
