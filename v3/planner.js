// @ts-check
/* Plan: days of the trip with planned items, clash warnings, sunset, travel estimates and .ics export. */
import { $, esc, plain, dayRange, dayLabel, isoToday, parseTime, km, driveMin, fmtMin, toast, md } from "./util.js";
import { t, lang } from "./i18n.js";
import { D, S, BYID, save, removeFromPlan, addToPlan } from "./state.js";
import { metaLine, mainChip, summary } from "./cards.js";
import { tableSunset } from "./weather.js";
import { gcalHref, deepLink } from "./sheet.js";

let showEarlier = false;
/** @type {string|null} */ let pickerDay = null;

/** Coordinates of an item: its pin, or the pin of the first linked place for events. @param {any} it */
function coords(it) {
  const key = it.pin || (it.links || []).map((/** @type {string} */ l) => BYID[l] && BYID[l].pin).find(Boolean);
  return key ? D.pins[key] : null;
}

/** @param {string} d @param {string[]} ids @param {boolean} mine */
function itemsHTML(d, ids, mine) {
  let prev = /** @type {any} */ (null);
  return ids.map((id, i) => {
    const it = BYID[id]; if (!it) return "";
    const c = coords(it);
    const leg = prev && c ? `<li class="leg">${esc(t("between", { m: fmtMin(driveMin(km(prev, c))) }))}</li>` : "";
    if (c) prev = c;
    const tm = it._type === "event" ? parseTime(it.time) : null;
    return `${leg}<li class="pl-item">
      <a class="pl-main" href="#/e/${esc(id)}">${tm ? `<span class="pl-time">${tm}</span>` : ""}<span class="pl-name">${esc(plain(it.name))}</span><span class="cm">${metaLine(it)}</span></a>
      ${mine ? `<span class="pl-acts">
        <button type="button" class="ic" data-mv="${d}|${i}|-1" aria-label="${esc(t("moveUp"))}" ${i === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="ic" data-mv="${d}|${i}|1" aria-label="${esc(t("moveDown"))}" ${i === ids.length - 1 ? "disabled" : ""}>↓</button>
        <a class="ic" href="${esc(gcalHref(it, d))}" target="_blank" rel="noopener noreferrer" aria-label="${esc(t("gcal"))}">⧉</a>
        <button type="button" class="ic" data-rm="${d}|${esc(id)}" aria-label="${esc(t("remove"))}">✕</button></span>` : ""}
    </li>`;
  }).join("");
}

/** @param {HTMLElement} view */
export function renderPlan(view) {
  const today = isoToday();
  const days = dayRange(D.meta.start, D.meta.end);
  const visible = showEarlier ? days : days.filter(d => d >= today || (S.plan[d] && S.plan[d].length));
  const P = S.partner;
  view.innerHTML = `<div class="plan">
    <section class="g-panel pl-top">
      <h1 class="view-t">${esc(t("planTitle"))}</h1>
      <p class="small muted">${esc(t("planNote"))}</p>
      <div class="actions"><button type="button" class="btn btn-solid" id="ics">${esc(t("exportIcs"))}</button></div>
    </section>
    ${!showEarlier && visible.length < days.length ? `<p><button type="button" class="btn-sm" id="earlier">${esc(t("showEarlier"))}</button></p>` : ""}
    <ol class="days">
    ${visible.map(d => {
      const mine = S.plan[d] || [], theirs = P && P.p[d] ? P.p[d].filter(id => BYID[id]) : [];
      const evs = D.events.filter((/** @type {any} */ e) => e.mode === "day" && e.days.includes(d)).length;
      const clash = D.clashes[d], sun = tableSunset(D.sunset, d);
      return `<li class="pday${d === today ? " is-today" : ""}${d === D.meta.arrive ? " is-arrive" : ""}" id="d-${d}">
        <div class="pd-head"><h2 class="pd-t">${esc(dayLabel(d, lang, true))}</h2>
          <span class="pd-meta">${sun ? `${esc(t("sunset"))} ${esc(t("sunsetAbout"))} ${esc(sun)}` : ""}${evs ? ` · <a href="#/today/${d}">${esc(evs === 1 ? t("eventsThisDay1") : t("eventsThisDay", { n: evs }))}</a>` : ""}</span></div>
        ${clash ? `<details class="pd-clash"><summary>${esc(t("clashNight"))}</summary><div class="small">${md(clash)}</div></details>` : ""}
        ${mine.length ? `<ul class="pl-list">${itemsHTML(d, mine, true)}</ul>` : `<p class="pd-empty muted small">${esc(t("nothingPlanned"))}</p>`}
        ${theirs.length ? `<div class="pd-theirs"><p class="lbl">${esc(t("theirPlan", { who: P ? P.label : "" }))}</p><ul class="pl-list">${itemsHTML(d, theirs, false)}</ul>
          <button type="button" class="btn-sm" data-copyday="${d}">${esc(t("copyTheirs"))}</button></div>` : ""}
        ${S.stars.size ? `<button type="button" class="btn-sm" data-picker="${d}" aria-expanded="${pickerDay === d}">${esc(t("addFromPicks"))}</button>` : ""}
        ${pickerDay === d ? pickerHTML(d) : ""}
      </li>`;
    }).join("")}
    </ol>
  </div>`;

  view.querySelector("#earlier")?.addEventListener("click", () => { showEarlier = true; renderPlan(view); });
  $("#ics", view).addEventListener("click", exportIcs);
  view.querySelector(".plan")?.addEventListener("click", ev => {
    const el = /** @type {HTMLElement} */ (ev.target);
    const mv = el.closest("[data-mv]"), rm = el.closest("[data-rm]"), pk = el.closest("[data-picker]"), add = el.closest("[data-pickadd]"), cp = el.closest("[data-copyday]");
    if (mv) {
      const [d, i, dir] = /** @type {string} */ (mv.getAttribute("data-mv")).split("|"), a = S.plan[d], j = +i + +dir;
      if (a && j >= 0 && j < a.length) { [a[+i], a[j]] = [a[j], a[+i]]; save(); renderPlan(view); }
    } else if (rm) {
      const [d, id] = /** @type {string} */ (rm.getAttribute("data-rm")).split("|");
      removeFromPlan(d, id); renderPlan(view);
      toast(t("removed"), { label: t("undo"), fn: () => { addToPlan(d, id); renderPlan(view); } });
    } else if (pk) {
      const d = /** @type {string} */ (pk.getAttribute("data-picker")); pickerDay = pickerDay === d ? null : d; renderPlan(view);
      document.getElementById("d-" + d)?.scrollIntoView({ block: "nearest" });
    } else if (add) {
      const [d, id] = /** @type {string} */ (add.getAttribute("data-pickadd")).split("|"); addToPlan(d, id); renderPlan(view);
    } else if (cp && P) {
      const d = /** @type {string} */ (cp.getAttribute("data-copyday")); (P.p[d] || []).forEach(id => { if (BYID[id]) addToPlan(d, id); }); renderPlan(view);
    }
  });
}

/** Favourites not yet on this day, events on that date first. @param {string} d */
function pickerHTML(d) {
  const on = new Set(S.plan[d] || []);
  const list = [...S.stars].map(id => BYID[id]).filter(it => it && !on.has(it.id))
    .sort((a, b) => ((b.days || []).includes(d) ? 1 : 0) - ((a.days || []).includes(d) ? 1 : 0));
  if (!list.length) return "";
  return `<ul class="picker">${list.map(it => `<li><button type="button" class="pk-add" data-pickadd="${d}|${esc(it.id)}">
    <span class="pl-name">${esc(plain(it.name))}</span>${mainChip(it)}${(it.days || []).includes(d) ? '<span class="b b-top">✓</span>' : ""}</button></li>`).join("")}</ul>`;
}

/* ---------- Calendar export (.ics). Dakar is UTC+0, so times are written in UTC. ---------- */
/** @param {string} s */
const icsText = s => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** Fold lines to 75 octets as RFC 5545 asks. @param {string} line */
const foldLine = line => { const out = []; let s = line; while (s.length > 74) { out.push(s.slice(0, 74)); s = " " + s.slice(74); } out.push(s); return out.join("\r\n"); };

export function buildIcs() {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Dakar season 2026//Guide//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  let n = 0;
  Object.keys(S.plan).sort().forEach(d => {
    S.plan[d].forEach(id => {
      const it = BYID[id]; if (!it) return;
      const ymd = d.replace(/-/g, ""), tm = it._type === "event" ? parseTime(it.time) : null;
      lines.push("BEGIN:VEVENT", `UID:${id}-${ymd}@dakar-season-2026`, `DTSTAMP:${stamp}`);
      if (tm) {
        const [h, m] = tm.split(":").map(Number);
        lines.push(`DTSTART:${ymd}T${tm.replace(":", "")}00Z`, `DTEND:${ymd}T${String(Math.min(h + 2, 23)).padStart(2, "0")}${String(m).padStart(2, "0")}00Z`);
      } else {
        const next = new Date(Date.parse(d + "T12:00:00Z") + 864e5).toISOString().slice(0, 10).replace(/-/g, "");
        lines.push(`DTSTART;VALUE=DATE:${ymd}`, `DTEND;VALUE=DATE:${next}`);
      }
      lines.push(foldLine("SUMMARY:" + icsText(plain(it.name))), foldLine("LOCATION:" + icsText(plain(it.area || it.venue || ""))),
        foldLine("DESCRIPTION:" + icsText(summary(it) + "\n" + deepLink(id))), "END:VEVENT");
      n++;
    });
  });
  lines.push("END:VCALENDAR");
  return { text: lines.join("\r\n") + "\r\n", count: n };
}

function exportIcs() {
  const { text, count } = buildIcs();
  if (!count) { toast(t("icsEmpty")); return; }
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = "dakar-season-2026-plan.ics";
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast(t("icsDone"));
}
