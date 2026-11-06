const api = typeof browser !== "undefined" ? browser : chrome;
const DEFAULTS = { enabled: true, rewriteHeadline: true, replaceBuzzwords: true, showBanner: true,
                   plainView: true, learn: true, disabledSites: [] };
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "CODE", "PRE", "SELECT"]);
const OURS = "#plainspeak-view, #plainspeak-pill, #plainspeak-cover";
const NOISE = "footer, [role=dialog], [aria-modal=true], [id*=cookie i], [class*=cookie i], [id*=consent i], [class*=consent i]";
const KEY = "plainspeak-mode";
const BG = "#fafaf8", INK = "#151515", MUTED = "#777", LINE = "#e2e2de";
let result = null, view = null, pill = null, settings = DEFAULTS, cover = null, hideStyle = null;
let learned = new Set();

const ss = {
  get: () => { try { return sessionStorage.getItem(KEY); } catch { return null; } },
  set: v => { try { sessionStorage.setItem(KEY, v); } catch {} }
};

// ---------- helpers ----------
function el(tag, style = {}, text = "") {
  const e = document.createElement(tag);
  Object.assign(e.style, style);
  if (text) e.textContent = text;
  return e;
}
const plain = s => PlainSpeak.plainify(s) ?? s;
const analyzeNow = () => PlainSpeak.analyze(PlainSpeak.extract(), learned);

// ---------- instant cover (runs before the site paints) ----------
function showCover() {
  hideStyle = document.createElement("style");
  hideStyle.textContent = `html{overflow:hidden !important;background:${BG} !important}`;
  cover = el("div", { position: "fixed", inset: "0", zIndex: "2147483647", background: BG, color: MUTED,
    display: "flex", alignItems: "center", justifyContent: "center", font: "14px system-ui, sans-serif" },
    "Reading past the hype…");
  cover.id = "plainspeak-cover";
  document.documentElement.append(hideStyle, cover);
}
function removeCover() { cover?.remove(); cover = null; }
function unlockScroll() {
  hideStyle?.remove(); hideStyle = null;
  document.documentElement.style.removeProperty("overflow");
}

// Resolves as soon as the page has real content (or after maxMs)
function pageReady(maxMs = 2000) {
  return new Promise(res => {
    const t0 = performance.now();
    (function check() {
      const b = document.body;
      const parsed = document.readyState !== "loading";
      const hasContent = b && (b.querySelector("h1, h2") || b.textContent.length > 1500);
      if ((parsed && hasContent) || performance.now() - t0 > maxMs) return res();
      setTimeout(check, 40);
    })();
  });
}

// ---------- buzzword replacement (original site) ----------
function fixNode(n) {
  const p = n.parentElement;
  if (!p || SKIP.has(p.tagName) || p.isContentEditable || p.closest(OURS)) return;
  const r = PlainSpeak.plainify(n.nodeValue);
  if (r !== null) n.nodeValue = r;
}
function walk(root) {
  if (root.nodeType === 3) return fixNode(root);
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (tw.nextNode()) nodes.push(tw.currentNode);
  nodes.forEach(fixNode);
}
function watch() {
  new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes)
      if (n.nodeType === 1 || n.nodeType === 3) walk(n);
  }).observe(document.body, { childList: true, subtree: true });
}
function rewriteHeadline(text) {
  const h = [...document.querySelectorAll("h1")]
    .find(e => e.offsetParent !== null && e.innerText.trim().length >= 10);
  if (!h) return;
  h.title = "Original: " + h.innerText.trim();
  h.textContent = text;
}

// ---------- logo ----------
function findLogo() {
  const hit = s => /logo|brand/i.test(typeof s === "string" ? s : "");
  const scope = document.querySelector("header, [role=banner], nav") || document.body;
  for (const img of scope.querySelectorAll("img")) {
    if (img.closest(OURS)) continue;
    const a = img.closest("a");
    if (hit(img.alt) || hit(img.className) || hit(img.id) || hit(img.src) ||
        hit(a?.className) || hit(a?.getAttribute("aria-label"))) return { src: img.currentSrc || img.src };
  }
  for (const svg of scope.querySelectorAll("svg")) {
    const a = svg.closest("a");
    if (hit(svg.getAttribute("class")) || hit(svg.getAttribute("aria-label")) ||
        hit(a?.className) || hit(a?.getAttribute("aria-label"))) return { svg };
  }
  const home = [...scope.querySelectorAll("a[href]")].find(a => {
    try { const u = new URL(a.href); return u.origin === location.origin && u.pathname === "/"; } catch { return false; }
  });
  const hi = home?.querySelector("img"), hs = home?.querySelector("svg");
  if (hi) return { src: hi.currentSrc || hi.src };
  if (hs) return { svg: hs };
  const icon = document.querySelector('link[rel~="apple-touch-icon"], link[rel~="icon"]');
  return { src: icon ? icon.href : location.origin + "/favicon.ico" };
}
function logoNode() {
  const logo = findLogo();
  if (logo.svg) {
    const s = logo.svg.cloneNode(true);
    s.removeAttribute("width"); s.removeAttribute("height");
    Object.assign(s.style, { height: "40px", width: "auto", maxWidth: "220px", color: INK, display: "block" });
    return s;
  }
  const img = el("img", { maxHeight: "44px", maxWidth: "220px", display: "block" });
  img.src = logo.src;
  img.alt = "";
  img.onerror = () => img.remove();
  return img;
}

// ---------- page content ----------
const LINK_KINDS = [
  ["Pricing", /pric|plans/], ["Docs", /\bdocs\b|documentation/], ["API", /\bapi\b/],
  ["Download", /download/], ["Sign up", /sign ?up|get started|start free|free trial/],
  ["Log in", /log ?in|sign ?in/], ["Contact", /contact|talk to sales|book a demo|request a demo/],
  ["About", /\babout\b/], ["GitHub", /github\.com/], ["Careers", /careers|jobs/]
];
function findLinks() {
  const anchors = [...document.querySelectorAll("a[href]")]
    .filter(a => !a.closest(OURS) && /^https?:/.test(a.href));
  const found = [];
  for (const [label, re] of LINK_KINDS) {
    const a = anchors.find(a => re.test(a.innerText.toLowerCase()) || re.test(a.href.toLowerCase()));
    if (a) found.push([label, a.href]);
  }
  return found;
}
function findPrices() {
  const text = (document.querySelector("main") || document.body).innerText;
  // skip "$290M", "$1B", "$5 billion" etc. (those are stats, not prices)
  const re = /\$\s?\d[\d,]*(?:\.\d{2})?(?![\d.,]*\s?(?:[kmbt]\b|million|billion|trillion))(?:\s*(?:\/|per )\s*(?:mo|month|user|seat|yr|year)\w*)?/gi;
  const m = text.match(re) || [];
  return [...new Set(m.map(s => s.replace(/\s+/g, " ").trim()))].slice(0, 8);
}
function sectionText(h) {
  let t = "", e = h.nextElementSibling;
  while (e && !/^H[1-3]$/.test(e.tagName) && t.length < 320) { t += " " + (e.innerText || ""); e = e.nextElementSibling; }
  if (!t.trim() && h.parentElement) t = h.parentElement.innerText.replace(h.innerText, "");
  return t.replace(/\s+/g, " ").trim().slice(0, 320);
}
const CONCRETE = /\b(price|pricing|plan|feature|integrat|api|support|users?|storage|gb|tb|export|import|install|free|open.source|compatible|windows|mac|linux|ios|android|data|security)\w*/gi;
function usefulness(s) {
  return (s.match(/\d/g) || []).length * 0.5 + (s.match(CONCRETE) || []).length
    - (PlainSpeak.plainify(s) !== null ? 2 : 0) - (s.length < 40 ? 2 : 0)
    - 0.75 * PlainSpeak.learnedHits(s, learned); // learned buzzwords sink sections too
}
function findSections() {
  const seen = new Set(), out = [];
  for (const h of document.querySelectorAll("h2, h3")) {
    if (h.closest(OURS) || h.closest(NOISE) || h.offsetParent === null) continue;
    const head = h.innerText.replace(/\s+/g, " ").trim();
    if (!head || head.length > 120 || seen.has(head)) continue;
    seen.add(head);
    const body = sectionText(h);
    out.push({ head: plain(head), body: plain(body), score: usefulness(head + " " + body) });
    if (out.length >= 25) break;
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 14);
}

// ---------- plain view ----------
function buildView() {
  const v = el("div", { position: "fixed", inset: "0", zIndex: "2147483646", overflow: "auto",
    background: BG, color: INK, font: "16px/1.6 system-ui, sans-serif" });
  v.id = "plainspeak-view";
  const wrap = el("div", { maxWidth: "720px", margin: "0 auto", padding: "32px 18px 80px" });

  const top = el("div", { display: "flex", justifyContent: "space-between", alignItems: "center",
    gap: "16px", marginBottom: "20px" });
  const brand = el("div", { display: "flex", alignItems: "center", gap: "12px", minWidth: "0" });
  brand.append(logoNode(), el("span", { fontSize: "20px", fontWeight: "600" }, result.name));
  const back = el("a", { color: MUTED, fontSize: "14px", cursor: "pointer", whiteSpace: "nowrap",
    textDecoration: "underline" }, "Original site");
  back.onclick = closePlain;
  top.append(brand, back);
  wrap.append(top);

  wrap.append(el("p", { fontSize: "20px", lineHeight: "1.45", margin: "0 0 8px" },
    [result.summary, result.related].filter(Boolean).join(" ")));
  wrap.append(el("p", { color: MUTED, fontSize: "14px", margin: "0 0 28px" },
    `${result.moneyLine}  ·  ${result.marketing}`));

  const links = findLinks();
  if (links.length) {
    const row = el("p", { margin: "0 0 12px", fontSize: "15px" });
    links.forEach(([label, href], i) => {
      if (i) row.append(" · ");
      const a = el("a", { color: INK }, label);
      a.href = href;
      row.append(a);
    });
    wrap.append(row);
  }

  const prices = findPrices();
  if (prices.length)
    wrap.append(el("p", { margin: "0 0 28px", fontSize: "15px", color: MUTED }, "Prices: " + prices.join(", ")));

  for (const s of findSections()) {
    const box = el("div", { borderTop: `1px solid ${LINE}`, padding: "14px 0" });
    box.append(el("div", { fontWeight: "600" }, s.head));
    if (s.body) box.append(el("div", { color: "#444", fontSize: "15px", marginTop: "2px" }, s.body));
    wrap.append(box);
  }

  v.append(wrap);
  return v;
}

function showPill() {
  if (pill?.isConnected || !settings.showBanner || !document.body) return;
  pill = el("button", { position: "fixed", right: "16px", bottom: "16px", zIndex: "2147483645",
    padding: "6px 12px", background: INK, color: "#fff", border: "0", borderRadius: "999px",
    font: "13px system-ui, sans-serif", cursor: "pointer", boxShadow: "0 2px 10px #0004" }, "Plain view");
  pill.id = "plainspeak-pill";
  pill.onclick = openPlain;
  document.body.appendChild(pill);
}

function openPlain() {
  if (!result) result = analyzeNow();
  if (!view) view = buildView();
  pill?.remove();
  document.body.appendChild(view);
  document.documentElement.style.setProperty("overflow", "hidden", "important");
  ss.set("plain");
}
function closePlain() {
  view?.remove();
  unlockScroll();
  ss.set("original");
  showPill();
}
function togglePlain() { view?.isConnected ? closePlain() : openPlain(); }

// ---------- startup ----------
const maybePlain = ss.get() !== "original";
if (maybePlain) showCover(); // instantly, before settings even load
const failsafe = setTimeout(() => { removeCover(); unlockScroll(); }, 5000);

(async () => {
  try {
    settings = await api.storage.local.get(DEFAULTS);
    const active = settings.enabled && !settings.disabledSites.includes(location.hostname);
    const wantPlain = active && settings.plainView && maybePlain;
    if (!wantPlain) { removeCover(); unlockScroll(); } // off here: reveal right away

    if (settings.learn) learned = DemystifyLearn.fluffSet(await DemystifyLearn.load());

    await pageReady();
    const page = PlainSpeak.extract();
    result = PlainSpeak.analyze(page, learned); // analyze BEFORE changing anything

    // Learn from this site AFTER analyzing, so a page never grades itself
    if (settings.learn && active && /^https?:$/.test(location.protocol))
      DemystifyLearn.record(location.hostname, `${page.h1} ${page.h2} ${page.body}`).catch(() => {});

    if (!active) return;

    if (settings.rewriteHeadline && result.confident) rewriteHeadline(result.headline);
    if (settings.replaceBuzzwords) { walk(document.body); watch(); }
    wantPlain ? openPlain() : showPill();
  } catch (e) {
    console.warn("Demystify:", e);
    unlockScroll();
  } finally {
    removeCover();
    clearTimeout(failsafe);
  }
})();

api.runtime.onMessage.addListener((msg, _, send) => {
  if (msg.type === "analyze") send(result || analyzeNow());
  if (msg.type === "togglePlain") { togglePlain(); send(true); }
});