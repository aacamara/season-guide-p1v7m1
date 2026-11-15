// @ts-check
/* Detail sheet: bottom sheet on phones, side panel on wide screens. Opened by #/e/<id>. */
import { $, esc, md, plain, photoHTML, dayLabel, parseTime, fmtMin, toast, STAR_SVG, dayRange, isoToday } from "./util.js";
import { t, lang, fieldLabel } from "./i18n.js";
import { D, S, BYID, toggleStar, addToPlan, removeFromPlan } from "./state.js";
import { mainChip, metaLine, summary, cardHTML } from "./cards.js";

const wrap = () => $("#sheet");
let lastFocus = /** @type {HTMLElement|null} */ (null);
/** @type {(() => void) | null} */
let onCloseRequest = null;
/** @param {() => void} fn */
export const setCloseHandler = fn => { onCloseRequest = fn; };
export const sheetOpen = () => !wrap().hidden;

/** Link that opens this item in the app. @param {string} id */
export const deepLink = id => location.href.split("#")[0] + "#/e/" + encodeURIComponent(id);

/** @param {any} it */
function mapsHref(it) {
  const q = [plain(it.name).split(/[;(]/)[0], plain(it.area || it.venue || "").split(/[;(]/)[0], "Sénégal"].filter(Boolean).join(", ");
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
}
/** @param {any} it @param {string} [iso] */
export function gcalHref(it, iso) {
  const day = iso || (it.days && (it.days.find((/** @type {string} */ d) => d >= isoToday()) || it.days[0]));
  if (!day) return "";
  const tm = it._type === "event" ? parseTime(it.time) : null;
  const ymd = day.replace(/-/g, "");
  let dates;
  if (tm) { const [h, m] = tm.split(":").map(Number); const end = `${String(Math.min(h + 2, 23)).padStart(2, "0")}${String(m).padStart(2, "0")}00`; dates = `${ymd}T${tm.replace(":", "")}00Z/${ymd}T${end}Z`; }
  else { const next = new Date(Date.parse(day + "T12:00:00Z") + 864e5).toISOString().slice(0, 10).replace(/-/g, ""); dates = `${ymd}/${next}`; }
  return "https://calendar.google.com/calendar/render?" + new URLSearchParams({
    action: "TEMPLATE", text: plain(it.name), dates, details: summary(it) + "\n" + deepLink(it.id), location: plain(it.area || it.venue || ""),
  }).toString();
}

/** @param {any} it */
function factsHTML(it) {
  const rows = [];
  if (it._type === "event") {
    rows.push(["When", it.when], ["Time", it.time], ["Where", it.venue], ["Price", it.price]);
    if (it.approx) rows.push(["Status", it.approx]);
  } else if (it.area) rows.push(["Area", it.area]);
  (it.fields || []).forEach((/** @type {[string,string]} */ f) => rows.push(f));
  if (it.status) rows.push(["Status", it.status]);
  const label = (/** @type {string} */ k) => (k === "Area" ? t("area") : k === "Status" ? t("status") : k === "Time" ? t("time") : fieldLabel(k));
  return `<dl class="facts">${rows.filter(r => r[1]).map(([k, v]) => `<div class="fr"><dt>${esc(label(k))}</dt><dd>${md(v)}</dd></div>`).join("")}</dl>`;
}

/** Day chips for "Add to a day"; the item's own dates are highlighted. @param {any} it */
function dayPickerHTML(it) {
  const own = new Set(it.days || []);
  const planned = new Set(Object.keys(S.plan).filter(d => S.plan[d].includes(it.id)));
  const days = dayRange(D.meta.start, D.meta.end).filter(d => d >= isoToday() || planned.has(d));
  return `<div class="daypick" id="daypick" hidden><p class="lbl">${esc(t("pickDay"))}</p><div class="daygrid">
    ${days.map(d => `<button type="button" class="dchip${own.has(d) ? " own" : ""}" data-addday="${d}" aria-pressed="${planned.has(d)}">${esc(dayLabel(d, lang))}</button>`).join("")}
  </div></div>`;
}

/** @param {string} id */
export function openSheet(id) {
  const it = BYID[id];
  if (!it) return false;
  const body = $("#sheet-body");
  const starred = S.stars.has(id);
  const linked = it._type === "event" ? (it.links || []).map((/** @type {string} */ l) => BYID[l]).filter(Boolean)
    : D.events.filter((/** @type {any} */ ev) => (ev.links || []).includes(id));
  const pin = it.pin ? D.pins[it.pin] : null;
  const drive = it.drive ? `${t("driveEst", { m: fmtMin(it.drive) })}, ${t("fromBase")}` : "";
  body.innerHTML = `
    <div class="sheet-photo">${photoHTML(it, "sheet-img")}
      ${it.img ? `<a class="credit" href="${esc(it.img.link)}" target="_blank" rel="noopener noreferrer">${esc(t("photoBy"))}: ${esc(it.img.credit)}</a>` : ""}
    </div>
    <div class="sheet-in">
      <h2 id="sheet-title" class="sheet-t">${esc(plain(it.name))}</h2>
      <p class="cm">${metaLine(it)}${drive ? ` <span class="muted">(${esc(drive)})</span>` : ""}</p>
      <div class="chips">${mainChip(it)}${(it.flags || []).map((/** @type {[string,string]} */ f) => `<span class="b b-${f[1]}">${esc(f[0])}</span>`).join("")}</div>
      <p class="sheet-sum">${esc(summary(it))}</p>
      <div class="actions">
        <button type="button" class="btn act-star" data-star="${esc(id)}" aria-pressed="${starred}">${STAR_SVG}<span>${esc(starred ? t("unstar") : t("star"))}</span></button>
        <button type="button" class="btn" id="act-day" aria-expanded="false" aria-controls="daypick">${esc(t("addDay"))}</button>
        <a class="btn" href="${esc(mapsHref(it))}" target="_blank" rel="noopener noreferrer">${esc(t("maps"))}</a>
        <a class="btn" href="https://wa.me/?text=${encodeURIComponent(plain(it.name) + ": " + summary(it) + "\n" + deepLink(id))}" target="_blank" rel="noopener noreferrer">${esc(t("whatsapp"))}</a>
        ${it._type === "event" ? `<a class="btn" href="${esc(gcalHref(it))}" target="_blank" rel="noopener noreferrer">${esc(t("gcal"))}</a>` : ""}
        ${pin ? `<a class="btn" href="#/map/${esc(it.pin)}">${esc(t("showOnMap"))}</a>` : ""}
      </div>
      ${dayPickerHTML(it)}
      <h3 class="sheet-h">${esc(t("details"))}${lang === "fr" ? ` <span class="muted small">(${esc(t("detailsEn"))})</span>` : ""}</h3>
      ${factsHTML(it)}
      ${linked.length ? `<h3 class="sheet-h">${esc(it._type === "event" ? t("linkedPlace") : t("events"))}</h3><div class="rail rail-sheet">${linked.map((/** @type {any} */ l) => cardHTML(l, { size: "sm" })).join("")}</div>` : ""}
      ${it.sources ? `<h3 class="sheet-h">${esc(t("sources"))}</h3><p class="small sources">${md(it.sources)}</p>` : ""}
      ${pin ? `<p class="small muted">${esc(t("approxPin"))}</p>` : it._type === "entry" ? `<p class="small muted">${esc(t("notPlaced"))}</p>` : ""}
    </div>`;

  const dp = $("#daypick", body), btn = $("#act-day", body);
  btn.addEventListener("click", () => { dp.hidden = !dp.hidden; btn.setAttribute("aria-expanded", String(!dp.hidden)); if (!dp.hidden) dp.scrollIntoView({ block: "nearest" }); });
  dp.addEventListener("click", ev => {
    const b = /** @type {HTMLElement|null} */ (/** @type {HTMLElement} */ (ev.target).closest("[data-addday]"));
    if (!b) return;
    const d = /** @type {string} */ (b.getAttribute("data-addday"));
    if (b.getAttribute("aria-pressed") === "true") { removeFromPlan(d, id); b.setAttribute("aria-pressed", "false"); toast(t("removed")); return; }
    addToPlan(d, id); b.setAttribute("aria-pressed", "true");
    toast(t("addedTo", { d: dayLabel(d, lang) }), { label: t("undo"), fn: () => { removeFromPlan(d, id); b.setAttribute("aria-pressed", "false"); } });
  });
  const starBtn = /** @type {HTMLElement} */ (body.querySelector(".act-star"));
  starBtn.addEventListener("click", ev => {
    ev.stopPropagation();
    const on = toggleStar(id);
    const sp = starBtn.querySelector("span"); if (sp) sp.textContent = on ? t("unstar") : t("star");
  });

  const w = wrap();
  if (w.hidden) lastFocus = /** @type {HTMLElement|null} */ (document.activeElement);
  w.hidden = false;
  document.body.classList.add("sheet-on");
  const sheet = $(".sheet", w);
  sheet.scrollTop = 0;
  requestAnimationFrame(() => { w.classList.add("open"); $(".x", w).focus({ preventScroll: true }); });
  return true;
}

export function hideSheet() {
  const w = wrap();
  if (w.hidden) return;
  w.classList.remove("open");
  document.body.classList.remove("sheet-on");
  window.setTimeout(() => { w.hidden = true; $("#sheet-body").innerHTML = ""; }, 180);
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}

export function installSheet() {
  const w = wrap(), sheet = $(".sheet", w);
  w.addEventListener("click", ev => { if (/** @type {HTMLElement} */ (ev.target).closest("[data-close]")) onCloseRequest && onCloseRequest(); });
  document.addEventListener("keydown", ev => {
    if (w.hidden) return;
    if (ev.key === "Escape") { ev.preventDefault(); onCloseRequest && onCloseRequest(); }
    if (ev.key === "Tab") { // keep focus inside the open sheet
      const f = /** @type {HTMLElement[]} */ (Array.from(sheet.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))).filter(x => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
    }
  });
  // Swipe down on the grab handle to close (phones); content scrolling is left alone.
  let y0 = 0, dragging = false;
  sheet.addEventListener("pointerdown", ev => {
    if (!(/** @type {HTMLElement} */ (ev.target).closest(".grab"))) return;
    y0 = ev.clientY; dragging = true;
    try { sheet.setPointerCapture(ev.pointerId); } catch (_) { /* ignore */ }
  });
  sheet.addEventListener("pointermove", ev => { if (!dragging) return; const dy = ev.clientY - y0; if (dy > 0) sheet.style.transform = `translateY(${dy}px)`; });
  const end = (/** @type {PointerEvent} */ ev) => {
    if (!dragging) return; dragging = false;
    const dy = ev.clientY - y0; sheet.style.transform = "";
    if (dy > 110) onCloseRequest && onCloseRequest();
  };
  sheet.addEventListener("pointerup", end); sheet.addEventListener("pointercancel", end);
}
