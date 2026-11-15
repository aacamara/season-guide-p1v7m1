// @ts-check
/* Map: the v2 SVG map (OSM coastline, geoBoundaries regions, neighbourhood pins) with photo-card carousels. */
import { $, esc, plain } from "./util.js";
import { t, secLabel } from "./i18n.js";
import { D, audOK } from "./state.js";
import { cardHTML } from "./cards.js";

const VIEWS = /** @type {Record<string, {map:string, box:number[]}>} */ ({
  city: { map: "dakar", box: [22, 150, 335, 290] }, greater: { map: "dakar", box: [0, 0, 1000, 477] },
  coast: { map: "senegal", box: [6, 284, 210, 240] }, sen: { map: "senegal", box: [0, 0, 1000, 738] },
});
const M = { view: "city", sec: "all", /** @type {string|null} */ pin: null };
/** @type {number[]} */ let vb = [0, 0, 1000, 477];
/** @type {string|null} */ let curMap = null;
/** @type {SVGSVGElement} */ let svg;
/** @type {HTMLElement} */ let box;

/** @param {string} map @param {number} lon @param {number} lat */
function project(map, lon, lat) { const f = D.geo[map].frame; return [(lon - f.lon0) * f.kx * f.scale, (f.lat1 - lat) * f.scale]; }
/** @param {any} e */
const visible = e => e.pin && audOK(e) && (M.sec === "all" || e.sec === M.sec);

/** @param {string} map */
function drawBase(map) {
  curMap = map;
  const g = D.geo[map];
  let s = "";
  if (map === "dakar") {
    const pts = g.coastOpenPts[0];
    s += `<path class="m-land" d="M${pts.map((/** @type {number[]} */ p) => p.join(",")).join(" L")} L1300,${pts[pts.length - 1][1]} L1300,${pts[0][1]} Z"/>`;
    g.islands.forEach((/** @type {string} */ i) => { s += `<path class="m-land" d="${i}"/>`; });
    ["n1", "vdn", "corniche", "autoroute"].forEach(k => (g.roads[k] || []).forEach((/** @type {string} */ d2) => { s += `<path class="m-road${k === "autoroute" ? " main" : ""}" d="${d2}"/>`; }));
    s += `<text class="m-sea" x="20" y="370" style="font-size:14px">Atlantic</text>`;
  } else {
    g.neighbors.forEach((/** @type {any} */ n) => { s += `<path class="m-nb" d="${n.d}"/>`; });
    g.regions.forEach((/** @type {any} */ r) => { s += `<path class="m-land" d="${r.d}"/>`; });
    s += `<text class="m-sea" x="30" y="600" style="font-size:15px">Atlantic</text>`;
  }
  svg.innerHTML = s + `<g id="hoods"></g><g id="pins"></g>`;
}
const k = () => vb[2] / (svg.clientWidth || 600);

function drawPins() {
  const layer = svg.querySelector("#pins"), hoods = svg.querySelector("#hoods");
  if (!layer || !hoods || !curMap) return;
  const map = curMap, kk = k();
  hoods.innerHTML = (map === "dakar" ? D.hoods : D.towns).map((/** @type {any} */ h) => {
    const [x, y] = project(map, h.lon, h.lat);
    return `<text class="m-hood" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" style="font-size:${((map === "dakar" ? 10.5 : 11.5) * kk).toFixed(2)}px">${esc(h.name)}</text>`;
  }).join("");
  const counts = /** @type {Record<string, number>} */ ({}); let dakarTotal = 0;
  D.entries.forEach((/** @type {any} */ e) => { if (!visible(e)) return; counts[e.pin] = (counts[e.pin] || 0) + 1; if (D.pins[e.pin].map === "dakar") dakarTotal++; });
  const R = 12 * kk, items = /** @type {any[]} */ ([]);
  Object.keys(D.pins).forEach(key => {
    const p = D.pins[key]; if (p.map !== map || key === "base" || !counts[key]) return;
    const [x, y] = project(map, p.lon, p.lat); items.push({ key, p, n: counts[key], x, y });
  });
  const clusters = /** @type {any[]} */ ([]);
  items.sort((a, b) => b.n - a.n).forEach(it => {
    const c = clusters.find(c2 => Math.hypot(c2.x - it.x, c2.y - it.y) < 2.2 * R);
    if (c) { c.members.push(it); c.n += it.n; } else clusters.push({ x: it.x, y: it.y, n: it.n, members: [it] });
  });
  let s = "";
  if (map === "dakar") {
    const b = D.pins.base, [x, y] = project("dakar", b.lon, b.lat), h = 12 * kk;
    s += `<g class="pin home" aria-hidden="true"><path class="hm" d="M${x},${y - h} L${x + h},${y - h * .1} L${x + h},${y + h * .9} L${x - h},${y + h * .9} L${x - h},${y - h * .1} Z"/>
      <text class="lbl" x="${x + h + 5 * kk}" y="${y + 5 * kk}" style="font-size:${11.5 * kk}px;stroke-width:${3 * kk}px">${esc(t("homeBase"))}</text></g>`;
  }
  if (map === "senegal" && dakarTotal) {
    const [x, y] = project("senegal", -17.447, 14.693);
    s += `<g class="pin" data-goview="greater" tabindex="0" role="button" aria-label="${esc(t("vGreater"))}: ${dakarTotal}"><circle class="dot" cx="${x}" cy="${y}" r="${R}"/><text class="cnt" x="${x}" y="${y}" style="font-size:${11 * kk}px">${dakarTotal}</text></g>`;
  }
  const labels = map === "senegal" ? vb[2] < 480 : vb[2] < 560;
  clusters.forEach(c => {
    if (c.members.length > 1) {
      s += `<g class="pin cluster" data-cluster="${c.members.map((/** @type {any} */ m) => m.key).join(",")}" tabindex="0" role="button" aria-label="${c.n}">
        <circle class="ring" cx="${c.x}" cy="${c.y}" r="${R + 4 * kk}"/><circle class="dot" cx="${c.x}" cy="${c.y}" r="${R}"/><text class="cnt" x="${c.x}" y="${c.y}" style="font-size:${11 * kk}px">${c.n}</text></g>`;
      return;
    }
    const m = c.members[0], on = M.pin === m.key ? " on" : "";
    s += `<g class="pin${on}" data-pin="${m.key}" tabindex="0" role="button" aria-label="${esc(m.p.label)}: ${m.n}">
      <circle class="dot" cx="${c.x}" cy="${c.y}" r="${R}"/><text class="cnt" x="${c.x}" y="${c.y}" style="font-size:${11 * kk}px">${m.n}</text>
      ${labels ? `<text class="lbl" x="${c.x + R + 4 * kk}" y="${c.y + 4 * kk}" style="font-size:${11.5 * kk}px;stroke-width:${3 * kk}px">${esc(m.p.label)}</text>` : ""}</g>`;
  });
  layer.innerHTML = s;
}

/** @param {number[]} b */
function setVB(b) { vb = b; svg.setAttribute("viewBox", b.map(n => n.toFixed(1)).join(" ")); drawPins(); }
/** @param {number[]} bx */
function fitBox(bx) {
  let [x, y, w, h] = bx; const cw = box.clientWidth, ch = box.clientHeight;
  if (!cw || !ch) { vb = [x, y, w, h]; return; }
  const ar = cw / ch;
  if (w / h > ar) { const nh = w / ar; y -= (nh - h) / 2; h = nh; } else { const nw = h * ar; x -= (nw - w) / 2; w = nw; }
  setVB([x, y, w, h]);
}
/** @param {string} name */
function setView(name) {
  M.view = name; const V = VIEWS[name];
  if (curMap !== V.map) drawBase(V.map);
  fitBox(V.box);
  document.querySelectorAll("[data-view]").forEach(b => b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === name)));
}
/** @param {number} f @param {number} [cx] @param {number} [cy] */
function zoomAt(f, cx, cy) {
  const [x, y, w, h] = vb, nw = Math.min(Math.max(w * f, 40), 1400), nh = nw * (h / w);
  const ccx = cx == null ? x + w / 2 : cx, ccy = cy == null ? y + h / 2 : cy;
  setVB([ccx - (ccx - x) * (nw / w), ccy - (ccy - y) * (nh / h), nw, nh]);
}
/** @param {string[]} keys */
function zoomToKeys(keys) {
  const map = /** @type {string} */ (curMap);
  const pts = keys.map(kk => project(map, D.pins[kk].lon, D.pins[kk].lat));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), pad = map === "dakar" ? 30 : 14;
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  fitBox([x0, y0, Math.max(x1 - x0, 40), Math.max(y1 - y0, 30)]);
}
/** @param {number} px @param {number} py */
function clientToSvg(px, py) { const r = svg.getBoundingClientRect(); return [vb[0] + (px - r.left) / r.width * vb[2], vb[1] + (py - r.top) / r.height * vb[3]]; }

/** @param {HTMLElement} view @param {string|null} key */
function showPin(view, key) {
  M.pin = key;
  const panel = $("#pin-panel", view);
  if (!key) { panel.hidden = true; drawPins(); return; }
  const list = D.entries.filter((/** @type {any} */ e) => e.pin === key && visible(e));
  list.sort((/** @type {any} */ a, /** @type {any} */ b) => (a.img ? 0 : 1) - (b.img ? 0 : 1) || plain(a.name).localeCompare(plain(b.name)));
  panel.innerHTML = `<div class="pp-head"><b>${esc(D.pins[key].label)}</b><span class="muted">${esc(t("placesHere", { n: list.length }))}</span><button type="button" class="btn-sm" id="pp-x">${esc(t("close"))}</button></div>
    <div class="rail">${list.map((/** @type {any} */ e) => cardHTML(e, { size: "sm" })).join("")}</div>`;
  panel.hidden = false;
  $("#pp-x", panel).addEventListener("click", () => showPin(view, null));
  drawPins();
}

/** @param {HTMLElement} view @param {string} [focus] pin key to centre on */
export function renderMap(view, focus) {
  const secs = [["all", t("allSections")]].concat(D.sections.map((/** @type {any} */ s) => [s.key, secLabel(s)]));
  view.innerHTML = `<div class="mapview">
    <div class="map-tools">
      <div class="chiprow" role="group">${secs.map(([kk, l]) => `<button type="button" class="chip" data-msec="${kk}" aria-pressed="${M.sec === kk}">${esc(l)}</button>`).join("")}</div>
      <div class="seg" role="group">${["city", "greater", "coast", "sen"].map(v => `<button type="button" data-view="${v}" aria-pressed="${M.view === v}">${esc(t("v" + v[0].toUpperCase() + v.slice(1)))}</button>`).join("")}</div>
    </div>
    <div class="mapbox" id="mapbox"><svg id="map" role="img" aria-label="${esc(t("tabMap"))}"></svg>
      <div class="zoom"><button type="button" id="z-in" aria-label="${esc(t("zoomIn"))}">+</button><button type="button" id="z-out" aria-label="${esc(t("zoomOut"))}">−</button></div>
      <p class="map-hint">${esc(t("tapPin"))} ${esc(t("approxPin"))}</p>
    </div>
    <div class="pin-panel g-panel" id="pin-panel" hidden></div>
  </div>`;
  svg = /** @type {any} */ ($("#map", view)); box = $("#mapbox", view); curMap = null;

  const pf = focus && D.pins[focus] ? D.pins[focus] : null;
  if (pf) M.view = pf.map === "dakar" ? "city" : "coast";
  requestAnimationFrame(() => {
    setView(M.view);
    if (pf && focus) {
      const [x, y] = project(pf.map, pf.lon, pf.lat), w = pf.map === "dakar" ? 240 : 150;
      fitBox([x - w / 2, y - w * 0.35, w, w * 0.7]);
      showPin(view, focus);
    } else if (M.pin) showPin(view, M.pin);
  });

  view.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => setView(/** @type {string} */ (b.getAttribute("data-view")))));
  view.querySelectorAll("[data-msec]").forEach(b => b.addEventListener("click", () => {
    M.sec = /** @type {string} */ (b.getAttribute("data-msec"));
    view.querySelectorAll("[data-msec]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    if (M.pin) showPin(view, M.pin); else drawPins();
  }));
  $("#z-in", view).addEventListener("click", () => zoomAt(1 / 1.4));
  $("#z-out", view).addEventListener("click", () => zoomAt(1.4));

  /** @param {Element} g */
  const act = g => {
    if (g.hasAttribute("data-pin")) showPin(view, g.getAttribute("data-pin"));
    else if (g.hasAttribute("data-goview")) setView(/** @type {string} */ (g.getAttribute("data-goview")));
    else if (g.hasAttribute("data-cluster")) zoomToKeys(/** @type {string} */ (g.getAttribute("data-cluster")).split(","));
  };
  svg.addEventListener("click", ev => { const g = /** @type {Element} */ (ev.target).closest(".pin"); if (g) act(g); });
  svg.addEventListener("keydown", ev => { const g = /** @type {Element} */ (ev.target).closest(".pin"); if (g && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); act(g); } });

  const pointers = new Map(); let pinch = /** @type {any} */ (null), drag = /** @type {any} */ (null), moved = false;
  svg.addEventListener("pointerdown", e => {
    if (/** @type {Element} */ (e.target).closest(".pin")) return;
    try { svg.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    pointers.set(e.pointerId, [e.clientX, e.clientY]); moved = false;
    if (pointers.size === 1) drag = { p: [e.clientX, e.clientY], vb: vb.slice() };
    if (pointers.size === 2) { const [a, b] = Array.from(pointers.values()); pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), vb: vb.slice(), c: clientToSvg((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) }; drag = null; }
  });
  svg.addEventListener("pointermove", e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    const r = svg.getBoundingClientRect();
    if (pinch && pointers.size === 2) {
      const [a, b] = Array.from(pointers.values()), f = pinch.d / (Math.hypot(a[0] - b[0], a[1] - b[1]) || 1);
      const [x, y, w, h] = pinch.vb, [cx, cy] = pinch.c, nw = Math.min(Math.max(w * f, 40), 1400), nh = nw * (h / w);
      vb = [cx - (cx - x) * (nw / w), cy - (cy - y) * (nh / h), nw, nh]; svg.setAttribute("viewBox", vb.join(" ")); moved = true;
    } else if (drag) {
      const dx = (e.clientX - drag.p[0]) / r.width * drag.vb[2], dy = (e.clientY - drag.p[1]) / r.height * drag.vb[3];
      if (Math.abs(e.clientX - drag.p[0]) + Math.abs(e.clientY - drag.p[1]) > 4) moved = true;
      if (moved) { vb = [drag.vb[0] - dx, drag.vb[1] - dy, drag.vb[2], drag.vb[3]]; svg.setAttribute("viewBox", vb.join(" ")); }
    }
  });
  const end = (/** @type {PointerEvent} */ e) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; if (!pointers.size) { drag = null; if (moved) drawPins(); } };
  svg.addEventListener("pointerup", end); svg.addEventListener("pointercancel", end);
  svg.addEventListener("wheel", e => { e.preventDefault(); const [cx, cy] = clientToSvg(e.clientX, e.clientY); zoomAt(e.deltaY > 0 ? 1.15 : 1 / 1.15, cx, cy); }, { passive: false });
}
