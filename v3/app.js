// @ts-check
/* App shell: data load, top bar, bottom tabs, hash router, delegated clicks, offline support. */
import { $, esc, installImageFallback, toast, store } from "./util.js";
import { t, lang, setLang } from "./i18n.js";
import { setData, S, AUDS, save, toggleStar } from "./state.js";
import { renderToday } from "./today.js";
import { renderExplore } from "./explore.js";
import { renderMap } from "./mapview.js";
import { renderPlan } from "./planner.js";
import { renderPicks, renderSwipe, renderShared } from "./picks.js";
import { openSheet, hideSheet, installSheet, setCloseHandler, sheetOpen } from "./sheet.js";

const view = $("#view");
const ICON = /** @type {Record<string,string>} */ ({
  today: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  explore: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  map: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  plan: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  picks: '<path d="M12 3.3l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.6l-5.2 2.7 1-5.8L3.6 9.4l5.8-.8z"/>',
});
const TABS = [["today", "tabToday"], ["explore", "tabExplore"], ["map", "tabMap"], ["plan", "tabPlan"], ["picks", "tabPicks"]];
const AUD_KEY = /** @type {Record<string,string>} */ ({ all: "audAll", family: "audFamily", couple: "audCouple", solo: "audSolo" });

let currentKey = "";
let rendered = false;
let sheetDepth = 0, internalNav = false, prevWasSheet = false;

function chrome() {
  document.title = t("appName");
  $("#mark").textContent = t("appName");
  $("#aud").setAttribute("aria-label", t("audLabel"));
  $("#aud").innerHTML = AUDS.map(a => `<button type="button" data-aud="${a}" aria-pressed="${S.aud === a}">${esc(t(AUD_KEY[a]))}</button>`).join("");
  const lb = $("#lang"); lb.textContent = t("langBtn"); lb.setAttribute("aria-label", t("langAria"));
  const head = (currentKey || "today").split("/")[0];
  $("#tabs").innerHTML = TABS.map(([k, l]) => `<a href="#/${k}" class="tab" ${head === k || (head === "e" && k === "today" && !rendered) ? 'aria-current="page"' : ""}>
    <svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg><span>${esc(t(l))}</span></a>`).join("");
}

/** @param {string} key route without the leading "#/" */
function renderView(key) {
  const [head, a, b] = key.split("/");
  const y = window.scrollY;
  view.classList.toggle("is-map", head === "map");
  view.classList.toggle("is-swipe", head === "picks" && a === "swipe");
  if (head === "explore") renderExplore(view);
  else if (head === "map") renderMap(view, a);
  else if (head === "plan") renderPlan(view);
  else if (head === "picks" && a === "swipe") renderSwipe(view, b);
  else if (head === "picks") renderPicks(view);
  else if (head === "share") renderShared(view, key.slice(6), () => go("picks"));
  else renderToday(view, a);
  rendered = true;
  chrome();
  return y;
}

/** @param {string} key @param {boolean} [replace] */
function go(key, replace) {
  const h = "#/" + key;
  if (replace) history.replaceState(null, "", h); else history.pushState(null, "", h);
  route();
}

function route() {
  const raw = location.hash.replace(/^#\/?/, "");
  const key = raw ? decodeURIComponent(raw.startsWith("share/") ? "share/" + raw.slice(6) : raw) : "today";
  const [head, ...rest] = key.split("/");
  if (head === "e") {
    if (internalNav) sheetDepth++; else if (prevWasSheet) sheetDepth = Math.max(0, sheetDepth - 1);
    internalNav = false; prevWasSheet = true;
    if (!rendered) { currentKey = "today"; renderView("today"); }
    if (!openSheet(rest.join("/"))) go(currentKey || "today", true);
    return;
  }
  sheetDepth = 0; prevWasSheet = false; internalNav = false;
  const wasOpen = sheetOpen();
  if (wasOpen) hideSheet();
  // Coming back from a sheet to the same view keeps its scroll; plan and picks refresh because the sheet can change them.
  if (key === currentKey && rendered && wasOpen) {
    if (head === "plan" || head === "picks") { const y = window.scrollY; renderView(key); window.scrollTo(0, y); }
    return;
  }
  const sameHead = currentKey.split("/")[0] === head;
  currentKey = head === "share" ? "picks" : key;
  renderView(key);
  if (!sameHead) window.scrollTo(0, 0);
  if (head !== "share") view.focus({ preventScroll: true });
}

function closeSheet() {
  if (sheetDepth > 0) history.go(-sheetDepth);
  else { history.replaceState(null, "", "#/" + (currentKey || "today")); route(); }
}

function installClicks() {
  document.addEventListener("click", ev => {
    const el = /** @type {HTMLElement} */ (ev.target);
    const star = el.closest("[data-star]");
    if (star && !star.classList.contains("act-star")) { ev.preventDefault(); ev.stopPropagation(); toggleStar(/** @type {string} */ (star.getAttribute("data-star"))); return; }
    const aud = el.closest("[data-aud]");
    if (aud) { S.aud = /** @type {string} */ (aud.getAttribute("data-aud")); save(); const y = window.scrollY; renderView(currentKey || "today"); window.scrollTo(0, y); return; }
    const day = el.closest("[data-day]");
    if (day) { currentKey = "today/" + day.getAttribute("data-day"); history.replaceState(null, "", "#/" + currentKey); const y = window.scrollY; renderView(currentKey); window.scrollTo(0, Math.min(y, 120)); return; }
    if (el.closest("#lang")) {
      setLang(lang === "fr" ? "en" : "fr");
      const y = window.scrollY; renderView(currentKey || "today"); window.scrollTo(0, y);
      const m = location.hash.match(/^#\/e\/(.+)$/); if (m) openSheet(decodeURIComponent(m[1]));
      return;
    }
    const link = /** @type {HTMLAnchorElement|null} */ (el.closest('a[href^="#/e/"]'));
    const card = el.closest("[data-open]");
    if (link || (card && !el.closest("a, button"))) {
      ev.preventDefault();
      const id = link ? decodeURIComponent(link.getAttribute("href")?.slice(4) || "") : /** @type {string} */ (card?.getAttribute("data-open"));
      internalNav = true;
      location.hash = "#/e/" + encodeURIComponent(id);
    }
  });
}

function installOffline() {
  if (!("serviceWorker" in navigator) || !/^https:|^http:\/\/(localhost|127\.)/.test(location.href)) return;
  navigator.serviceWorker.register("sw.js").then(reg => {
    if (!navigator.serviceWorker.controller && !store.get("dkr3-offline-told", false)) {
      (reg.installing || reg.waiting)?.addEventListener("statechange", e => {
        if (/** @type {ServiceWorker} */ (e.target).state === "activated") { store.set("dkr3-offline-told", true); toast(t("offlineReady")); }
      });
    }
  }).catch(() => { /* offline support is a bonus */ });
}

async function boot() {
  setLang(lang);
  installImageFallback();
  installSheet();
  setCloseHandler(closeSheet);
  installClicks();
  try {
    const r = await fetch("data.json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    setData(await r.json());
  } catch (e) {
    view.innerHTML = `<div class="g-panel band-msg"><p>Could not load the guide data. Check the connection and reload.</p><p class="small muted">${esc(String(e))}</p></div>`;
    return;
  }
  window.addEventListener("hashchange", route);
  route();
  installOffline();
}
boot();
