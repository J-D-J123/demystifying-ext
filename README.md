<div align="center">

# DEMYSTIFY

**Cut through the marketing. See what a website actually does.**

A browser extension that strips buzzwords from company websites and replaces them with one plain sentence about what the company really sells.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![Chrome](https://img.shields.io/badge/Chrome-supported-brightgreen?logo=googlechrome&logoColor=white)
![Firefox](https://img.shields.io/badge/Firefox-supported-orange?logo=firefoxbrowser&logoColor=white)

[Features](#features) · [Install](#install) · [How it works](#how-it-works) · [Privacy](#privacy) · [Contributing](#contributing)

</div>

---

## The problem

You land on a company's homepage and read:

> *"In a world of constant change, reinvention is a continuous strategy. We work with organizations to rewrite the rules of growth, innovation and resilience."*

Three paragraphs later you still don't know what they sell.

## The fix

DEMYSTIFY opens a clean **Plain View** before the page even finishes loading:

> **Accenture** sells consulting and outsourced business services for large companies.
>
> No pricing info on this page · **Marketing level: 10/10**

No AI, no servers, no API keys. Just rules that run instantly in your browser.

---

## Features

- **Plain View**: a clean, readable summary page with the site's logo, a one-line description, key links (Pricing, Docs, Sign up…), any prices found, and the page's sections ranked most-concrete-first.
- **What it does, in one sentence**: classifies the site (CRM, cybersecurity, cloud hosting, consulting, online store, and more) and who it's for.
- **How it makes money**: detects paid plans, free tiers, open source, "talk to sales" pricing, and direct sales.
- **Marketing level (0–10)**: scores how buzzword-heavy the page is.
- **Buzzword replacement**: on the original site, "leverage" becomes "use", "solutions" becomes "products", and "seamless" just disappears.
- **Smart history**: learns which words are generic marketing by noticing which ones show up across many different companies' sites. The more you browse, the sharper it gets.
- **Instant**: covers the page at load so you never see the hype flash first.
- **Per-site control**: turn it off for any site, or flip back to the original with one click.

---

## Install

DEMYSTIFY isn't on the extension stores yet, so load it manually. It takes about 30 seconds.

```bash
git clone https://github.com/J-D-J123/Demystifying-ext.git
```

### Chrome / Edge / Brave

1. Go to `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and select the `Demystifying-ext` folder

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…** and select `manifest.json` inside the folder
3. Open the extension popup. If you see **"Allow on all websites"**, click it so it can run automatically.

> Firefox removes temporary add-ons when it restarts, so you'll need to load it again next session.

---

## How it works

Everything is plain, deterministic JavaScript. There's no machine learning and nothing is sent anywhere.

| Step | What happens |
|---|---|
| **1. Read** | Pulls the title, meta description, headings, and main text, ignoring nav bars, footers, and cookie banners. |
| **2. Classify** | Scores the text against keyword groups for each kind of business. Headlines count 3×, subheadings 2×, body text 1×. The best match becomes the sentence. |
| **3. Follow the money** | Looks for price patterns (`$29/month`), free trials, open-source links, and "contact sales" buttons. |
| **4. Measure fluff** | Counts buzzwords per 100 words of real content to get the Marketing level. |
| **5. Learn** | Records which words appear on each site. Words found on 30%+ of *different* sites are treated as generic marketing. |
| **6. Rebuild** | Builds Plain View, ranking sections with numbers and concrete details above vague slogans. |

---

## Settings

Click the toolbar icon to open the settings popup.

| Setting | What it does |
|---|---|
| Enabled | Master on/off switch |
| On for this site | Disable it on just the current site |
| Open plain view first | Show Plain View automatically on every page load |
| "Plain view" button | Floating button on the original site to jump back |
| Rewrite headline | Replace the main headline with the plain-English summary |
| Replace buzzwords | Swap marketing words for plain ones on the original page |
| Learn buzzwords | Turn smart history on or off, see what it has learned, or reset it |

---

## Privacy

- **Nothing leaves your browser.** No servers, no analytics, no network requests.
- **No browsing history is stored.** Smart history saves sites as one-way hashes, not readable URLs.
- **Open source.** Every line is in this repo, and you can read it in about ten minutes.

---

## Project structure

```
Demystifying-ext/
├── manifest.json   # Extension config (Chrome + Firefox)
├── learn.js        # Smart history: learns generic words across sites
├── analyzer.js     # Classification, money detection, marketing score
├── content.js      # Plain View, page cover, buzzword replacement
├── popup.html      # Settings popup UI
└── popup.js        # Settings popup logic
```

---

## Tuning

| Want to… | Edit |
|---|---|
| Add a buzzword and its replacement | `FLUFF` in `analyzer.js` |
| Teach it a new kind of business | `CATS` in `analyzer.js` |
| Make the Marketing level harsher or gentler | The `3.5` multiplier in `analyzer.js` |
| Change how fast it learns | `MIN_SITES` and `RATIO` in `learn.js` |
| Stop a normal word from being flagged | `COMMON` in `learn.js` |

---

## Limitations

- It's rule-based, so unusual businesses can land in the wrong category. Adding keywords to `CATS` fixes most cases.
- Smart history needs about 15 different sites before it starts flagging words.
- Browser pages (`chrome://`, `about:`) and extension stores can't be read by any extension.

---

## Contributing

Pull requests are welcome, especially:

- new business categories and keywords
- better buzzword replacements
- sites that get misclassified (open an issue with the URL and what it *should* say)

1. Fork the repo
2. Create a branch: `git checkout -b my-change`
3. Commit and push, then open a pull request

---

## License

MIT. See [LICENSE](LICENSE).

<div align="center">

**If DEMYSTIFY saved you from one more "AI-powered transformation journey," consider giving it a ⭐**

</div>
