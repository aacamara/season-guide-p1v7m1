// @ts-check
/* Share picks by link: the payload rides in the URL fragment (#/share/...), which browsers never send
   to a server. Compressed with deflate when the browser supports it, then base64url. */

/** @typedef {{v:1, l:string, s:string[], p:Record<string,string[]>}} Payload */

/** @param {Uint8Array} bytes */
const b64u = bytes => { let s = ""; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
/** @param {string} s */
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));

/** @param {Uint8Array} data @param {"compress"|"decompress"} dir */
async function pipe(data, dir) {
  const Ctor = dir === "compress" ? /** @type {any} */ (window).CompressionStream : /** @type {any} */ (window).DecompressionStream;
  const stream = new Blob([data]).stream().pipeThrough(new Ctor("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** @param {Payload} p @returns {Promise<string>} */
export async function encode(p) {
  const raw = new TextEncoder().encode(JSON.stringify(p));
  if ("CompressionStream" in window) {
    try { return "z" + b64u(await pipe(raw, "compress")); } catch (_) { /* fall through to plain */ }
  }
  return "j" + b64u(raw);
}

/** @param {string} token @returns {Promise<Payload|null>} */
export async function decode(token) {
  try {
    const kind = token[0], bytes = unb64u(token.slice(1));
    const raw = kind === "z" ? await pipe(bytes, "decompress") : kind === "j" ? bytes : null;
    if (!raw) return null;
    const p = JSON.parse(new TextDecoder().decode(raw));
    if (p.v !== 1 || !Array.isArray(p.s) || typeof p.p !== "object") return null;
    return { v: 1, l: String(p.l || "").slice(0, 40), s: p.s.filter((/** @type {any} */ x) => typeof x === "string").slice(0, 600), p: p.p };
  } catch (_) { return null; }
}

/** Full link for a payload token. @param {string} token */
export const shareURL = token => location.href.split("#")[0] + "#/share/" + token;
