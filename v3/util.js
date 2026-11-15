// @ts-check
/* Shared helpers: DOM, text, storage, dates, images. No app state here. */

/** @param {string} s @param {ParentNode} [r] @returns {HTMLElement} */
export const $ = (s, r) => /** @type {HTMLElement} */ ((r || document).querySelector(s));
/** @param {string} s @param {ParentNode} [r] @returns {HTMLElement[]} */
export const $$ = (s, r) => /** @type {HTMLElement[]} */ (Array.from((r || document).querySelectorAll(s)));

/** @param {any} s */
export const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => /** @type {Record<string,string>} */ ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/* ---------- Inline markdown used by the research text: links, bold, italics ---------- */
const LINK_RE = /\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;
/** @param {string} t */
function inline(t) {
  let s = esc(t);
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^\w*])\*([^*\s][^*]*?)\*(?![\w*])/g, "$1<em>$2</em>");
  return s;
}
/** @param {any} src */
export function md(src) {
  src = String(src == null ? "" : src);
  let out = "", last = 0, m;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(src))) {
    out += inline(src.slice(last, m.index));
    const url = m[2];
    out += /^https?:\/\//.test(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${inline(m[1])}</a>` : inline(m[0]);
    last = LINK_RE.lastIndex;
  }
  return out + inline(src.slice(last));
}
/** @param {any} s */
export const plain = s => String(s == null ? "" : s).replace(LINK_RE, "$1").replace(/\*\*/g, "").replace(/(^|[^\w*])\*([^*\s][^*]*?)\*/g, "$1$2");
/** @param {any} s */
export const fold = s => plain(s).replace(/[œŒ]/g, "oe").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** @param {string} area */
export const shortArea = area => {
  const s = plain(area).replace(/^(Address not found|Not stated|Not found)\.?$/i, "").split(/[,;(]/)[0].trim().replace(/\.$/, "");
  return s.length > 30 ? s.slice(0, 28).trim() + "…" : s;
};

/* ---------- Storage: per-device conveniences only; the app works without it ---------- */
export const store = {
  /** @param {string} k @param {any} d */
  get(k, d) { try { const v = window.localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
  /** @param {string} k @param {any} v */
  set(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* storage unavailable */ } },
};

/* ---------- Dates (Dakar is UTC+0 all year, so UTC dates are local dates) ---------- */
export const isoToday = () => new Date().toISOString().slice(0, 10);
/** @param {string} iso @param {number} n */
export const addDays = (iso, n) => new Date(Date.parse(iso + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
/** @param {string} iso */
export const weekday = iso => new Date(iso + "T12:00:00Z").getUTCDay();
/** @param {string} a @param {string} b */
export const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
/** @param {string} start @param {string} end */
export const dayRange = (start, end) => { const out = []; for (let d = start; d <= end; d = addDays(d, 1)) out.push(d); return out; };
/** @param {string} iso @param {string} lang @param {boolean} [long] */
export function dayLabel(iso, lang, long) {
  const d = new Date(iso + "T12:00:00Z");
  const o = /** @type {Intl.DateTimeFormatOptions} */ ({ weekday: long ? "long" : "short", month: long ? "long" : "short", day: "numeric", timeZone: "UTC" });
  return d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", o).replace(",", "");
}
/** First clock time in a free-text time field, as "HH:MM", or null. @param {string} s */
export function parseTime(s) {
  const t = String(s || "");
  let m = t.match(/\b(\d{1,2})[:h](\d{2})\b/);
  if (m && +m[1] < 24) return m[1].padStart(2, "0") + ":" + m[2];
  m = t.match(/\b(\d{1,2})\s?(am|pm)\b/i);
  if (m) { let h = +m[1] % 12; if (/pm/i.test(m[2])) h += 12; return String(h).padStart(2, "0") + ":00"; }
  return null;
}

/* ---------- Distances (same rough model as build_v3.py: road factor 1.35, speed by band) ---------- */
/** @param {{lat:number, lon:number}} a @param {{lat:number, lon:number}} b */
export function km(a, b) {
  const r = 6371, p1 = a.lat * Math.PI / 180, p2 = b.lat * Math.PI / 180;
  const dp = p2 - p1, dl = (b.lon - a.lon) * Math.PI / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}
/** @param {number} k */
export function driveMin(k) {
  const road = k * 1.35, speed = road < 12 ? 22 : road < 45 ? 32 : 58;
  return Math.max(5, Math.round(road / speed * 60 / 5) * 5);
}
/** @param {number} m */
export const fmtMin = m => (m >= 90 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`);

/* ---------- Seeded shuffle so the Today picks rotate by day but stay stable within a day ---------- */
/** @template T @param {T[]} arr @param {number} seed @returns {T[]} */
export function seeded(arr, seed) {
  const a = arr.slice(); let s = (seed * 2654435761) >>> 0;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ---------- Categories (colour plus a glyph, never colour alone) ---------- */
export const CAT_GLYPH = /** @type {Record<string,string>} */ ({ ai: "AI", biz: "B", music: "M", arts: "A", sports: "S", romantic: "R", family: "F" });

/** Photo, or an honest designed tile when there is none. @param {any} item @param {string} [cls] */
export function photoHTML(item, cls) {
  const cat = item.cat || (item.cats && item.cats[0]) || "family";
  const g = CAT_GLYPH[cat] || "F";
  const area = esc(shortArea(item.area || item.venue || ""));
  const tile = `<div class="tile k-${cat} ${cls || ""}"><span class="tile-g">${g}</span>${area ? `<span class="tile-a">${area}</span>` : ""}</div>`;
  if (!item.img) return tile;
  return `<img class="pimg ${cls || ""}" src="${esc(item.img.src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-cat="${cat}" data-g="${g}" data-area="${area}">`;
}
/** Replace any photo that fails to load with its tile (delegated, capture phase). */
export function installImageFallback() {
  document.addEventListener("error", ev => {
    const el = /** @type {HTMLElement} */ (ev.target);
    if (!(el instanceof HTMLImageElement) || !el.classList.contains("pimg")) return;
    const d = el.dataset, div = document.createElement("div");
    div.className = el.className.replace("pimg", "tile") + ` k-${d.cat}`;
    div.innerHTML = `<span class="tile-g">${d.g}</span>${d.area ? `<span class="tile-a">${d.area}</span>` : ""}`;
    const credit = el.closest(".sheet-photo") && el.closest(".sheet-photo")?.querySelector(".credit");
    if (credit) credit.remove();
    el.replaceWith(div);
  }, true);
}

/* ---------- Toast with optional action ---------- */
let toastT = 0;
/** @param {string} msg @param {{label:string, fn:() => void}} [action] */
export function toast(msg, action) {
  const el = $("#toast");
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button" class="toast-act">${esc(action.label)}</button>` : ""}`;
  el.classList.add("on");
  const btn = el.querySelector("button");
  if (btn && action) btn.addEventListener("click", () => { action.fn(); el.classList.remove("on"); }, { once: true });
  clearTimeout(toastT); toastT = window.setTimeout(() => el.classList.remove("on"), action ? 5000 : 2600);
}

export const STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L2.9 9.4l6.3-.9z"/></svg>';
export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
