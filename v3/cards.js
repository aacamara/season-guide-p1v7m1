// @ts-check
/* Photo cards and small chips shared by every view. */
import { esc, plain, shortArea, photoHTML, parseTime, dayLabel, fmtMin, STAR_SVG, CAT_GLYPH } from "./util.js";
import { t, lang } from "./i18n.js";
import { S, BYID } from "./state.js";

const FIT_KEY = /** @type {Record<string,string>} */ ({ great: "fitGreat", fine: "fitFine", skip: "fitSkip", unrated: "fitUnrated" });
const CAT_KEY = /** @type {Record<string,string>} */ ({ family: "catFamily", arts: "catArts", music: "catMusic", romantic: "catRomantic", sports: "catSports", ai: "catAi", biz: "catBiz" });
const WARN = /^(Conflict|Closed|Not found|Forbidden|Dangerous|Safety caution|Under reconstruction|Pools unavailable|Not recommended|At risk|Skip|Adults|Sea edge|Not renovated|Declining)$/;

/** @param {string|null|undefined} fit */
export const fitChip = fit => (fit && FIT_KEY[fit] ? `<span class="fitchip fit-${fit}">${esc(t(FIT_KEY[fit]))}</span>` : "");
/** @param {string} cat */
export const catChip = cat => `<span class="ctag k-${cat}"><span class="cg">${CAT_GLYPH[cat] || "F"}</span>${esc(t(CAT_KEY[cat] || "catFamily"))}</span>`;
/** @param {string} cat */
export const catLabel = cat => t(CAT_KEY[cat] || "catFamily");

/** Main chip for an item: toddler fit for family places, category otherwise. @param {any} it */
export function mainChip(it) {
  if (it._type === "entry" && it.cat === "family") return fitChip(it.fit || "unrated");
  return catChip(it.cat);
}
/** Warning flags worth showing on a card (at most one). @param {any} it */
export function warnChip(it) {
  const f = (it.flags || []).find((/** @type {[string,string]} */ x) => WARN.test(x[0]));
  return f ? `<span class="b b-warn">${esc(f[0])}</span>` : "";
}

/** One-line meta under a card title. @param {any} it @param {string} [iso] */
export function metaLine(it, iso) {
  const bits = [];
  if (it._type === "event") {
    const tm = parseTime(it.time);
    if (iso && it.mode !== "run") bits.push(dayLabel(iso, lang));
    if (tm) bits.push(tm);
    const v = shortArea(it.venue);
    if (v) bits.push(v);
  } else {
    const a = shortArea(it.area);
    if (a) bits.push(a);
    if (it.drive != null && it.drive > 0) bits.push("≈" + fmtMin(it.drive));
  }
  return bits.map(esc).join(" · ");
}

/** Summary in the current language. @param {any} it */
export const summary = it => (it.sum ? it.sum[lang] || it.sum.en : plain(it.name));

/** @param {any} it */
function partnerBadge(it) {
  if (!S.partner || !S.partner.s.includes(it.id)) return "";
  return `<span class="liked" title="${esc(t("likedBy", { who: S.partner.label }))}">♥ ${esc(S.partner.label)}</span>`;
}

/** A photo card. @param {any} it @param {{iso?: string, size?: "lg"|"md"|"sm", sum?: boolean}} [o] */
export function cardHTML(it, o = {}) {
  const starred = S.stars.has(it.id);
  const badges = [
    it.top ? `<span class="b b-top">${esc(t("topPick", { n: it.top }))}</span>` : "",
    it.rank ? `<span class="b b-top">${esc(t("dateNight", { n: it.rank }))}</span>` : "",
  ].join("");
  return `<article class="card card-${o.size || "md"}" data-open="${esc(it.id)}">
    <div class="ph">${photoHTML(it)}${partnerBadge(it)}
      <button type="button" class="star" data-star="${esc(it.id)}" aria-pressed="${starred}" aria-label="${esc(t("star"))}: ${esc(plain(it.name))}">${STAR_SVG}</button>
    </div>
    <div class="cb">
      <h3 class="ct"><a href="#/e/${esc(it.id)}" data-open-link>${esc(plain(it.name))}</a></h3>
      <p class="cm">${metaLine(it, o.iso)}</p>
      ${o.sum ? `<p class="cs">${esc(summary(it))}</p>` : ""}
      <div class="chips">${mainChip(it)}${badges}${warnChip(it)}</div>
    </div>
  </article>`;
}

/** Horizontal scroll row of cards with a heading. @param {string} title @param {any[]} items @param {{iso?: string, note?: string, id?: string, more?: string}} [o] */
export function rowHTML(title, items, o = {}) {
  if (!items.length) return "";
  return `<section class="row-sec"${o.id ? ` id="${o.id}"` : ""}>
    <div class="row-head"><h2 class="row-t">${esc(title)}</h2>${o.more || ""}</div>
    ${o.note ? `<p class="row-note">${esc(o.note)}</p>` : ""}
    <div class="rail" role="list">${items.map(it => `<div role="listitem">${cardHTML(it, { iso: o.iso, size: "md" })}</div>`).join("")}</div>
  </section>`;
}

/** @param {string} id */
export const item = id => BYID[id];
