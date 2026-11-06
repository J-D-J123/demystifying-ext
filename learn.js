// Learns which words are generic marketing by counting how many DIFFERENT sites use them.
// A word on 30%+ of all sites you've visited (that isn't plain English) = buzzword.
// Stored locally only. Sites are stored as hashes, never as readable URLs.
(() => {
  const api = typeof browser !== "undefined" ? browser : chrome;
  const KEY = "learned";
  const MIN_SITES = 15;   // don't judge anything until this many sites seen
  const RATIO = 0.3;      // word on >= 30% of sites = generic
  const MAX_WORDS = 5000; // cap storage size
  const MAX_HOSTS = 3000;

  const COMMON = new Set((
    "that this with from your have will what about more when they them their there here which were been " +
    "just than then also only most into over some such other these those each many much very well make made " +
    "like time year years first last next back come know take want need using used page site website click " +
    "read learn sign home menu search close open view share follow privacy cookie cookies terms policy " +
    "rights reserved contact help account login email skip content main today world people news does done " +
    "every across within without between through after before while where because could would should still " +
    "even really something anything everything able best good great right left full free start started " +
    "find show watch latest year's company companies please accept settings manage javascript browser " +
    "january february march april june july august september october november december monday friday"
  ).split(/\s+/));

  const EMPTY = () => ({ sites: 0, hosts: [], df: {} });

  // FNV-1a hash so visited sites aren't stored as readable history
  function hash(s) {
    let x = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; }
    return x.toString(36);
  }

  function siteRoot(host) {
    const parts = host.replace(/^www\./, "").split(".");
    return parts.length > 2 ? parts.slice(-2).join(".") : parts.join(".");
  }

  function wordsOf(text, brand) {
    const out = new Set();
    for (const w of (text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || [])) {
      const t = w.replace(/-+$/, "");
      if (t.length >= 4 && !COMMON.has(t) && !(brand && t.includes(brand))) out.add(t);
    }
    return out;
  }

  async function load() {
    const { [KEY]: L } = await api.storage.local.get({ [KEY]: EMPTY() });
    return L;
  }

  // Count each word once per site (not per page), so one wordy site can't skew it
  async function record(host, text) {
    const root = siteRoot(host);
    const id = hash(root);
    const L = await load();
    if (L.hosts.includes(id)) return L;

    L.hosts.push(id);
    if (L.hosts.length > MAX_HOSTS) L.hosts = L.hosts.slice(-MAX_HOSTS);
    L.sites++;
    for (const w of wordsOf(text, root.split(".")[0])) L.df[w] = (L.df[w] || 0) + 1;

    const keys = Object.keys(L.df);
    if (keys.length > MAX_WORDS) {
      L.df = Object.fromEntries(Object.entries(L.df).sort((a, b) => b[1] - a[1]).slice(0, MAX_WORDS * 0.8));
    }
    await api.storage.local.set({ [KEY]: L });
    return L;
  }

  // Ranked list of learned buzzwords: [word, share of sites]
  function ranked(L) {
    if (!L || L.sites < MIN_SITES) return [];
    return Object.entries(L.df)
      .map(([w, n]) => [w, n / L.sites])
      .filter(([, r]) => r >= RATIO)
      .sort((a, b) => b[1] - a[1]);
  }

  const fluffSet = L => new Set(ranked(L).map(([w]) => w));
  const reset = () => api.storage.local.remove(KEY);

  globalThis.DemystifyLearn = { load, record, ranked, fluffSet, reset, MIN_SITES, RATIO };
})();