// @ts-check
/* Picks: favourites, compare with the other phone, swipe decks, and receiving a shared link. */
import { $, esc, plain, toast, photoHTML, reducedMotion, STAR_SVG } from "./util.js";
import { t } from "./i18n.js";
import { D, S, BYID, save, audOK, toggleStar } from "./state.js";
import { cardHTML, rowHTML, summary, metaLine, mainChip } from "./cards.js";
import { encode, decode, shareURL } from "./share.js";

/** Deck definitions: which places each swipe deck draws from. */
const DECKS = /** @type {Record<string, {label:string, test:(e:any) => boolean}>} */ ({
  date: { label: "deckDate", test: e => e.suits.includes("couple") && ["romantic", "music"].includes(e.sec) },
  family: { label: "deckFamily", test: e => e.suits.includes("family") && (e.fit === "great" || e.fit === "fine") && ["kids", "sights", "family", "restaurants"].includes(e.sec) },
  escape: { label: "deckEscape", test: e => ["weekends", "resorts", "getaways"].includes(e.sec) },
});
/** Order: photos and top picks first so the deck opens strong. @param {string} key */
function deckItems(key) {
  return D.entries.filter((/** @type {any} */ e) => DECKS[key].test(e))
    .sort((/** @type {any} */ a, /** @type {any} */ b) => (b.img ? 1 : 0) - (a.img ? 1 : 0) || (a.top || a.rank || 99) - (b.top || b.rank || 99));
}
/** @param {string} key */
const deckLeft = key => deckItems(key).filter((/** @type {any} */ e) => !S.stars.has(e.id) && !S.passes.has(e.id));

export async function myShareLink() {
  return shareURL(await encode({ v: 1, l: S.label || t("me"), s: [...S.stars], p: S.plan }));
}

/** @param {HTMLElement} view */
export function renderPicks(view) {
  const mine = [...S.stars].map(id => BYID[id]).filter(Boolean);
  const P = S.partner;
  let compare = "";
  if (P) {
    const theirs = new Set(P.s.filter(id => BYID[id]));
    const both = mine.filter(it => theirs.has(it.id));
    const onlyThem = [...theirs].filter(id => !S.stars.has(id)).map(id => BYID[id]);
    const onlyMe = mine.filter(it => !theirs.has(it.id));
    compare = `
      ${rowHTML(t("bothLike") + ` (${both.length})`, both)}
      ${rowHTML(t("onlyThem", { who: P.label }) + ` (${onlyThem.length})`, onlyThem, { more: onlyThem.length ? `<button type="button" class="btn-sm" id="add-all">${esc(t("addAll"))}</button>` : "" })}
      ${rowHTML(t("onlyMe") + ` (${onlyMe.length})`, onlyMe)}
      <p><button type="button" class="btn-sm" id="forget">${esc(t("forget"))}</button></p>`;
  }
  view.innerHTML = `<div class="picks">
    <section class="pk-share g-panel">
      <h1 class="view-t">${esc(t("yourPicks"))} <span class="muted">${mine.length}</span></h1>
      <label class="lbl" for="label-in">${esc(t("thisPhone"))}</label>
      <input id="label-in" class="txt" maxlength="40" value="${esc(S.label)}" placeholder="${esc(t("me"))}" autocomplete="off">
      <p class="small muted">${esc(t("thisPhoneNote"))}</p>
      <div class="actions">
        <button type="button" class="btn btn-solid" id="send">${esc(t("sendPicks"))}</button>
        <button type="button" class="btn" id="copy">${esc(t("copyLink"))}</button>
      </div>
    </section>
    ${compare}
    <section class="row-sec">
      <div class="row-head"><h2 class="row-t">${esc(t("pickTogether"))}</h2></div>
      <p class="row-note">${esc(t("pickTogetherNote"))}</p>
      <div class="decks">${Object.keys(DECKS).map(k => {
        const items = deckItems(k), left = deckLeft(k).length, cover = items.find((/** @type {any} */ e) => e.img) || items[0];
        return `<a class="deck-btn" href="#/picks/swipe/${k}">${cover ? photoHTML(cover) : ""}<span class="deck-l"><b>${esc(t(DECKS[k].label))}</b><span>${esc(t("left", { n: left }))}</span></span></a>`;
      }).join("")}</div>
    </section>
    ${mine.length ? `<section class="row-sec"><div class="row-head"><h2 class="row-t">${esc(t("yourPicks"))}</h2></div>
      <div class="grid">${mine.map(it => cardHTML(it, { size: "sm", sum: true })).join("")}</div></section>`
      : `<p class="row-empty">${esc(t("picksEmpty"))}</p>`}
  </div>`;

  const lab = /** @type {HTMLInputElement} */ ($("#label-in", view));
  lab.addEventListener("change", () => { S.label = lab.value.trim().slice(0, 40); save(); });
  $("#send", view).addEventListener("click", async () => {
    S.label = lab.value.trim().slice(0, 40); save();
    const url = await myShareLink();
    window.open("https://wa.me/?text=" + encodeURIComponent(t("shareMsg") + "\n" + url), "_blank", "noopener");
  });
  $("#copy", view).addEventListener("click", async () => {
    S.label = lab.value.trim().slice(0, 40); save();
    const url = await myShareLink();
    try { await navigator.clipboard.writeText(url); toast(t("copied")); } catch (_) { window.prompt(t("copyLink"), url); }
  });
  const addAll = view.querySelector("#add-all");
  if (addAll && P) addAll.addEventListener("click", () => { P.s.forEach(id => { if (BYID[id]) S.stars.add(id); }); save(); renderPicks(view); });
  const forget = view.querySelector("#forget");
  if (forget) forget.addEventListener("click", () => { S.partner = null; save(); renderPicks(view); });
}

/* ---------- Swipe deck ---------- */
/** @param {HTMLElement} view @param {string} key */
export function renderSwipe(view, key) {
  if (!DECKS[key]) { location.hash = "#/picks"; return; }
  /** @type {{id:string, kept:boolean}[]} */
  const history = [];
  view.innerHTML = `<div class="swipe">
    <div class="sw-head"><a class="btn-sm" href="#/picks">${esc(t("back"))}</a><h1 class="view-t">${esc(t(DECKS[key].label))}</h1><span class="muted" id="sw-left"></span></div>
    <div class="sw-stage" id="stage" aria-live="polite"></div>
    <div class="sw-btns">
      <button type="button" class="sw-b sw-no" id="sw-no" aria-label="${esc(t("skip"))}">✕</button>
      <button type="button" class="sw-b sw-undo" id="sw-undo" aria-label="${esc(t("undo"))}">↺</button>
      <button type="button" class="sw-b sw-yes" id="sw-yes" aria-label="${esc(t("keep"))}">${STAR_SVG}</button>
    </div>
  </div>`;
  const stage = $("#stage", view);

  function draw() {
    const left = deckLeft(key).filter(audOK);
    $("#sw-left", view).textContent = t("left", { n: left.length });
    if (!left.length) {
      stage.innerHTML = `<div class="sw-done g-panel"><p>${esc(t("deckDone"))}</p><a class="btn btn-solid" href="#/picks">${esc(t("tabPicks"))}</a>
        <button type="button" class="btn" id="sw-restart">${esc(t("restart"))}</button></div>`;
      $("#sw-restart", stage).addEventListener("click", () => { deckItems(key).forEach((/** @type {any} */ e) => S.passes.delete(e.id)); save(); draw(); });
      return;
    }
    stage.innerHTML = left.slice(0, 2).reverse().map((/** @type {any} */ e, i, arr) => `
      <article class="sw-card${i === arr.length - 1 ? " top" : ""}" data-id="${esc(e.id)}">
        <div class="sw-ph">${photoHTML(e)}</div>
        <div class="sw-cb"><h2 class="sw-t">${esc(plain(e.name))}</h2><p class="cm">${metaLine(e)}</p>
          <div class="chips">${mainChip(e)}</div><p class="cs">${esc(summary(e))}</p>
          <a class="small" href="#/e/${esc(e.id)}">${esc(t("details"))}</a></div>
        <span class="sw-stamp sw-stamp-yes">${esc(t("keep"))}</span><span class="sw-stamp sw-stamp-no">${esc(t("skip"))}</span>
      </article>`).join("");
    bindDrag(/** @type {HTMLElement} */ (stage.querySelector(".sw-card.top")));
  }

  /** @param {boolean} keep */
  function decide(keep) {
    const card = /** @type {HTMLElement|null} */ (stage.querySelector(".sw-card.top"));
    if (!card) return;
    const id = /** @type {string} */ (card.dataset.id);
    history.push({ id, kept: keep });
    if (keep) { if (!S.stars.has(id)) toggleStar(id); } else { S.passes.add(id); save(); }
    if (reducedMotion()) { draw(); return; }
    card.style.transition = "transform .22s ease-out, opacity .22s";
    card.style.transform = `translateX(${keep ? 120 : -120}%) rotate(${keep ? 14 : -14}deg)`;
    card.style.opacity = "0";
    window.setTimeout(draw, 200);
  }
  function undo() {
    const last = history.pop(); if (!last) return;
    if (last.kept) { if (S.stars.has(last.id)) toggleStar(last.id); } else { S.passes.delete(last.id); save(); }
    draw();
  }
  /** @param {HTMLElement|null} card */
  function bindDrag(card) {
    if (!card) return;
    let x0 = 0, dx = 0, on = false;
    card.addEventListener("pointerdown", e => { if (/** @type {HTMLElement} */ (e.target).closest("a")) return; on = true; x0 = e.clientX; dx = 0; card.setPointerCapture(e.pointerId); card.style.transition = "none"; });
    card.addEventListener("pointermove", e => {
      if (!on) return; dx = e.clientX - x0;
      card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
      card.classList.toggle("yes", dx > 40); card.classList.toggle("no", dx < -40);
    });
    const end = () => {
      if (!on) return; on = false;
      if (Math.abs(dx) > 90) decide(dx > 0);
      else { card.style.transition = "transform .18s"; card.style.transform = ""; card.classList.remove("yes", "no"); }
    };
    card.addEventListener("pointerup", end); card.addEventListener("pointercancel", end);
  }
  $("#sw-no", view).addEventListener("click", () => decide(false));
  $("#sw-yes", view).addEventListener("click", () => decide(true));
  $("#sw-undo", view).addEventListener("click", undo);
  const keys = (/** @type {KeyboardEvent} */ e) => {
    if (!document.contains(stage)) { document.removeEventListener("keydown", keys); return; }
    if (/** @type {HTMLElement} */ (e.target).closest("input, textarea") || !$("#sheet").hidden) return;
    if (e.key === "ArrowRight") decide(true); else if (e.key === "ArrowLeft") decide(false); else if (e.key === "Backspace") undo();
  };
  document.addEventListener("keydown", keys);
  draw();
}

/* ---------- Receiving a shared link ---------- */
/** @param {HTMLElement} view @param {string} token @param {() => void} done */
export async function renderShared(view, token, done) {
  const p = await decode(token);
  if (!p) { view.innerHTML = `<div class="g-panel band-msg"><p>${esc(t("shareBad"))}</p><a class="btn" href="#/today">${esc(t("tabToday"))}</a></div>`; return; }
  const s = p.s.filter(id => BYID[id]);
  /** @type {Record<string, string[]>} */
  const plan = {};
  Object.keys(p.p || {}).forEach(d => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && Array.isArray(p.p[d])) { const ids = p.p[d].filter(id => typeof id === "string" && BYID[id]); if (ids.length) plan[d] = ids; }
  });
  const who = p.l || "?";
  const preview = s.slice(0, 8).map(id => BYID[id]);
  view.innerHTML = `<div class="shared">
    <section class="g-panel band-msg">
      <h1 class="view-t">${esc(t("sharedTitle", { who }))}</h1>
      <p>${esc(t("sharedBody", { s: s.length, p: Object.keys(plan).length }))}</p>
      <div class="actions"><button type="button" class="btn btn-solid" id="keep">${esc(t("keepThem"))}</button><a class="btn" href="#/today">${esc(t("notNow"))}</a></div>
    </section>
    ${rowHTML(who, preview)}
  </div>`;
  $("#keep", view).addEventListener("click", () => {
    S.partner = { label: who, s, p: plan, at: Date.now() };
    save();
    done();
  });
}
