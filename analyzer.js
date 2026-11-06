(() => {
  const CATS = [
    ["IT help-desk and internal workflow software", "makes", ["it service","help desk","ticket","tickets","incident","itsm","service desk","workflow","workflows"]],
    ["sales and customer-tracking (CRM) software", "makes", ["crm","customer relationship","pipeline","leads","deals"]],
    ["project and task-management software", "makes", ["project","projects","task","tasks","kanban","sprint","roadmap","issues"]],
    ["data storage and analytics software", "makes", ["data","warehouse","sql","etl","analytics","query","lakehouse","dashboards"]],
    ["cybersecurity software", "makes", ["security","threat","threats","vulnerability","endpoint","firewall","siem","breach","malware"]],
    ["tools for programmers", "makes", ["api","sdk","developer","developers","deploy","git","code","repository"]],
    ["cloud hosting and servers", "sells", ["hosting","server","servers","kubernetes","compute","storage","cdn","vps"]],
    ["an online store", "runs", ["cart","checkout","shop","shipping","returns","in stock"]],
    ["payments, banking, or accounting software", "makes", ["payments","invoice","invoices","banking","accounting","expenses"]],
    ["marketing and advertising tools", "makes", ["email marketing","seo","campaign","campaigns","ads","advertising","social media"]],
    ["hiring, HR, and payroll software", "makes", ["hiring","recruiting","employees","hr","payroll","onboarding","candidates"]],
    ["chat, meeting, or messaging software", "makes", ["chat","messaging","video","meetings","calls","inbox"]],
    ["consulting and outsourced business services", "sells", ["consulting","consultancy","advisory","clients","client stories",
      "industries","managed services","outsourcing","business and technology","digital transformation",
      "technology services","it services","engineering services","operating model","reinvention"]],
    ["AI models or AI tooling", "sells", ["llm","inference","gpu","machine learning","fine-tuning","model training"]],
    ["software for governments and defense", "makes", ["defense","defence","military","federal","national security","warfighter"]],
    ["news and articles", "publishes", ["breaking news","reporters","opinion","editorial","headlines","journalism","live updates"]],
    ["courses and learning material", "offers", ["courses","course","students","lessons","certificate","tutorials"]]
  ];

  const AUDIENCES = {
    "developers": ["developer","developers","engineers","engineering teams"],
    "small businesses": ["small business","small businesses","smb","startups","entrepreneurs"],
    "large companies": ["enterprise","enterprises","fortune 500","global organizations","ceos","executives"],
    "IT departments": ["it teams","it departments","it leaders","cios"],
    "sales teams": ["sales teams","sales reps","sellers"],
    "marketers": ["marketers","marketing teams"],
    "students": ["students","learners"],
    "HR teams": ["hr teams","recruiters","hiring managers"],
    "data teams": ["data teams","analysts","data scientists"],
    "governments": ["government agencies","public sector"]
  };

  // Seed buzzwords -> plain replacement ("" = delete). Learned words add to this over time.
  const FLUFF = {
    "seamlessly":"", "seamless":"", "leverage":"use", "leverages":"uses", "leveraging":"using",
    "empower":"help", "empowers":"helps", "empowering":"helping", "empowerment":"help",
    "unlock":"get", "unlocks":"gets", "revolutionize":"change", "revolutionizes":"changes",
    "reimagine":"redo", "reimagined":"redone", "reinvent":"change", "reinvention":"change",
    "reinvented":"changed", "next-generation":"new", "next-gen":"new", "cutting-edge":"new",
    "state-of-the-art":"new", "world-class":"", "best-in-class":"", "industry-leading":"",
    "innovative":"", "innovation":"new ideas", "transform":"change", "transforms":"changes",
    "transforming":"changing", "transformation":"change", "synergy":"teamwork", "holistic":"complete",
    "robust":"solid", "scalable":"", "at scale":"widely", "end-to-end":"full", "game-changing":"",
    "disrupt":"compete with", "disruptive":"", "supercharge":"speed up", "effortless":"easy",
    "effortlessly":"easily", "intelligent":"automated", "ai-powered":"", "powered by ai":"using AI",
    "powerful":"", "unleash":"use", "solutions":"products", "solution":"product", "ecosystem":"set of tools",
    "mission-critical":"important", "agentic":"automated", "limitless":"", "harness":"use",
    "accelerate":"speed up", "accelerating":"speeding up", "elevate":"improve", "journey":"process",
    "resilience":"stability", "people-centric":"", "human-centric":"", "customer-centric":"",
    "powerhouse":"team", "shaping tomorrow":"working", "shape the future":"plan ahead",
    "future-ready":"", "future-proof":"", "future-shaping":"", "reshaping":"changing", "reshape":"change",
    "rewrite the rules":"change how things work", "unique":"", "momentum":"progress", "purposeful":"",
    "lasting value":"results", "real value":"results", "value creation":"profit",
    "thought leadership":"opinions", "pioneering":"", "visionary":"", "frictionless":"smooth",
    "streamline":"simplify", "actionable":"", "impactful":"", "data-driven":"", "turnkey":"ready-made",
    "paradigm":"model"
  };

  const STOP = new Set(("that this with from your more what about their them into over across have will " +
    "learn started sign contact read company business work help make makes today world people every " +
    "they were been just than then also only most teams team products product customers customer " +
    "here there when where which while using used free login demo blog home menu discover explore " +
    "expand report reports news latest").split(" "));

  const esc = s => s.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
  const count = (text, p) => (text.match(new RegExp(`\\b${esc(p)}\\b`, "g")) || []).length;
  const joinList = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a.at(-1);
  const FLUFF_RE = new RegExp(`\\b(${Object.keys(FLUFF).sort((a, b) => b.length - a.length).map(esc).join("|")})\\b`, "gi");

  const JUNK = "script,style,noscript,svg,nav,footer,header,[role=dialog],[aria-modal=true]," +
    "[id*=cookie i],[class*=cookie i],[id*=consent i],[class*=consent i]," +
    "#plainspeak-view,#plainspeak-cover,#plainspeak-pill";

  // How many words in `text` are learned buzzwords (not already in the seed list)
  function learnedHits(text, learned) {
    if (!learned || !learned.size) return 0;
    let n = 0;
    for (const w of (text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || []))
      if (learned.has(w) && !(w in FLUFF)) n++;
    return n;
  }

  // Main content text without nav/footer/cookie banners, with spaces between elements
  function cleanBody() {
    const root = document.querySelector("main") || document.body;
    if (!root) return "";
    const c = root.cloneNode(true);
    c.querySelectorAll(JUNK).forEach(e => e.remove());
    const tw = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    const parts = [];
    while (tw.nextNode()) parts.push(tw.currentNode.nodeValue);
    return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 15000);
  }

  function extract() {
    const q = s => document.querySelector(s);
    const txt = el => (el?.innerText || "").replace(/\s+/g, " ").trim();
    return {
      title: document.title, host: location.hostname,
      site: q('meta[property="og:site_name"]')?.content || "",
      meta: q('meta[name="description"]')?.content || "",
      og: q('meta[property="og:description"]')?.content || "",
      h1: [...document.querySelectorAll("h1")].slice(0, 3).map(txt).join(" "),
      h2: [...document.querySelectorAll("h2,h3")].slice(0, 15).map(txt).join(" "),
      body: cleanBody(),
      links: [...document.querySelectorAll("a")].slice(0, 400).map(a => (a.innerText + " " + a.href).toLowerCase())
    };
  }

  function siteName(p) {
    const root = p.host.replace(/^www\./, "").split(".")[0];
    const squash = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const pickWord = s => s.split(/\s+/).find(w => squash(w) === root) || s;
    if (p.site) return p.site.length > 30 ? pickWord(p.site) : p.site;
    const parts = p.title.split(/\s[|\-–—:·]\s/).map(s => s.trim()).filter(Boolean);
    const exact = parts.find(s => squash(s) === root);
    if (exact) return exact;
    const hit = parts.find(s => squash(s).includes(root));
    if (hit) return pickWord(hit);
    return root.charAt(0).toUpperCase() + root.slice(1);
  }

  // learned = Set of words learned from browsing history (may be empty)
  function analyze(p, learned = new Set()) {
    const strong = `${p.title} ${p.meta} ${p.og} ${p.h1}`.toLowerCase();
    const mid = p.h2.toLowerCase();
    const body = p.body.toLowerCase();
    const content = `${strong} ${mid} ${body}`;
    const all = `${content} ${p.links.join(" ")}`;
    const score = kw => kw.reduce((s, k) => s + 3 * count(strong, k) + 2 * count(mid, k) + count(body, k), 0);

    const ranked = CATS.map(([desc, verb, kw]) => ({ desc, verb, s: score(kw) })).sort((a, b) => b.s - a.s);
    const aud = Object.entries(AUDIENCES).map(([n, kw]) => [n, score(kw)])
      .sort((a, b) => b[1] - a[1]).find(([, s]) => s >= 3)?.[0];

    const money = [];
    const price = all.match(/\$\s?\d[\d,]*(?:\.\d{2})?\s*(?:\/|per )\s*(?:mo|month|user|seat|yr|year)\w*/);
    if (price) money.push(`paid plans (e.g. ${price[0].replace(/\s+/g, " ")})`);
    if (/free (trial|plan|tier|forever)|start (for )?free|get started free/.test(all)) money.push("a free tier or trial");
    if (/open[- ]source|github\.com/.test(all)) money.push("open-source code");
    if (!price && /contact sales|request a demo|book a demo|talk to sales/.test(all))
      money.push("custom enterprise pricing (you have to talk to sales)");
    if (/add to cart|add to bag|buy now|shop now/.test(all)) money.push("direct product sales");

    // Concrete topics: skip stopwords, seed buzzwords, AND learned buzzwords
    const freq = {};
    const root = p.host.replace(/^www\./, "").split(".")[0];
    for (const w of `${strong} ${mid}`.match(/[a-z][a-z-]{3,}/g) || [])
      if (!STOP.has(w) && !(w in FLUFF) && !learned.has(w) && !w.includes(root)) freq[w] = (freq[w] || 0) + 1;
    const terms = Object.entries(freq).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);

    // Marketing level: seed buzzwords count fully, learned ones count half (less certain)
    const words = (content.match(/[a-z]+/g) || []).length || 1;
    const buzz = Object.keys(FLUFF).reduce((s, f) => s + count(content, f), 0) + 0.5 * learnedHits(content, learned);
    const fluff = Math.min(10, Math.round((buzz / words) * 100 * 3.5));

    const name = siteName(p);
    const [top, second] = ranked;
    const confident = top.s >= 4;
    const headline = `${name} ${top.verb} ${top.desc}${aud ? " for " + aud : ""}.`;
    const summary = confident ? headline
      : `Couldn't confidently tell what ${name} is.` + (top.s > 0 ? ` Best guess: ${top.desc}.` : "");
    const related = confident && second.s >= 4 && second.s >= top.s * 0.75 ? `Also looks related to ${second.desc}.` : "";
    const moneyLine = money.length ? `Makes money through ${joinList(money)}.` : "No pricing info on this page.";
    const termsLine = terms.length ? `Page mostly talks about: ${terms.join(", ")}.` : "";
    const marketing = `Marketing level: ${fluff}/10`;
    const text = [summary, related, moneyLine, termsLine, marketing].filter(Boolean).join("\n\n");

    return { name, headline, confident, fluff, summary, related, moneyLine, marketing, text };
  }

  // Returns rewritten text, or null if nothing changed (seed list only, so learned words never get deleted)
  function plainify(text) {
    let changed = false;
    let s = text.replace(FLUFF_RE, m => {
      changed = true;
      const r = FLUFF[m.toLowerCase()];
      if (!r) return "";
      return m[0] === m[0].toUpperCase() ? r[0].toUpperCase() + r.slice(1) : r;
    });
    if (!changed) return null;
    s = s.replace(/ {2,}/g, " ")
         .replace(/ ([,.!?;:])/g, "$1")
         .replace(/,\s*,/g, ",")
         .replace(/\b([Aa])n? ([a-zA-Z])/g, (m, a, c) => a + (/[aeioAEIO]/.test(c) ? "n " : " ") + c);
    if (!/^\s/.test(text)) s = s.replace(/^\s+/, "");
    if (/^\s*[A-Z]/.test(text)) s = s.replace(/^(\s*)([a-z])/, (m, w, c) => w + c.toUpperCase());
    return s;
  }

  globalThis.PlainSpeak = { extract, analyze, plainify, learnedHits, JUNK };
})();