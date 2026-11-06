const api = typeof browser !== "undefined" ? browser : chrome;
const DEFAULTS = { enabled: true, rewriteHeadline: true, replaceBuzzwords: true, showBanner: true,
                   plainView: true, learn: true, disabledSites: [] };
const IDS = ["enabled", "plainView", "rewriteHeadline", "replaceBuzzwords", "showBanner", "learn"];
const ALL_SITES = { origins: ["<all_urls>"] };
const $ = id => document.getElementById(id);
const FAIL = "Can't reach this page. Browser pages are blocked, or reload the page once after installing.";
let tab, host = "";

// Name + version come straight from manifest.json — rename it there only
const manifest = api.runtime.getManifest();
$("title").textContent = manifest.name;
$("ver").textContent = "v" + manifest.version;
document.title = manifest.name;

async function save() {
  const s = await api.storage.local.get(DEFAULTS);
  IDS.forEach(id => s[id] = $(id).checked);
  s.disabledSites = s.disabledSites.filter(h => h !== host);
  if (!$("site").checked && host) s.disabledSites.push(host);
  await api.storage.local.set(s);
  $("note").textContent = "Saved. Reload the page to apply.";
}

async function checkAccess() {
  let ok = true;
  try { ok = await api.permissions.contains(ALL_SITES); } catch {}
  $("access").style.display = ok ? "none" : "block";
}

// Show learning progress, or the top learned buzzwords once there's enough data
async function showLearned() {
  const box = $("learned");
  box.textContent = "";
  const L = await DemystifyLearn.load();

  if (L.sites < DemystifyLearn.MIN_SITES) {
    box.textContent = `Learning… ${L.sites}/${DemystifyLearn.MIN_SITES} sites seen`;
    return;
  }
  const list = DemystifyLearn.ranked(L);
  const head = document.createElement("div");
  head.textContent = `${list.length} buzzwords learned from ${L.sites} sites`;
  box.append(head);

  const words = document.createElement("div");
  words.className = "words";
  for (const [w, r] of list.slice(0, 30)) {
    const row = document.createElement("div");
    row.className = "bar";
    const a = document.createElement("span"); a.textContent = w;
    const b = document.createElement("span"); b.className = "pct"; b.textContent = Math.round(r * 100) + "% of sites";
    row.append(a, b);
    words.append(row);
  }
  box.append(words);
}

(async () => {
  [tab] = await api.tabs.query({ active: true, currentWindow: true });
  try { host = new URL(tab.url).hostname; } catch {}
  $("hostname").textContent = host || "this site";

  const s = await api.storage.local.get(DEFAULTS);
  IDS.forEach(id => { $(id).checked = s[id]; $(id).onchange = save; });
  $("site").checked = !s.disabledSites.includes(host);
  $("site").onchange = save;

  checkAccess();
  showLearned();
})();

// Must call permissions.request directly in the click, with no await before it
$("grant").onclick = () => {
  api.permissions.request(ALL_SITES).then(ok => {
    if (ok) {
      $("access").style.display = "none";
      $("note").textContent = "Access granted. Reload any page.";
    } else {
      $("note").textContent = "Not granted. You can also enable it in about:addons → Permissions.";
    }
  }).catch(e => { $("note").textContent = "Couldn't request access: " + e.message; });
};

$("resetLearn").onclick = async () => {
  await DemystifyLearn.reset();
  $("note").textContent = "Learned words cleared.";
  showLearned();
};

$("toggle").onclick = async () => {
  try { await api.tabs.sendMessage(tab.id, { type: "togglePlain" }); window.close(); }
  catch { $("out").textContent = FAIL; }
};

$("reload").onclick = () => { api.tabs.reload(tab.id); window.close(); };

$("go").onclick = async () => {
  try {
    const r = await api.tabs.sendMessage(tab.id, { type: "analyze" });
    $("out").textContent = r.text;
  } catch { $("out").textContent = FAIL; }
};