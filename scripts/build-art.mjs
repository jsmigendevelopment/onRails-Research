#!/usr/bin/env node
// Draws the README's images into assets/, each in a light and a dark version, from one set of
// colour tokens: the "golden hour" palette, light and dark. No dependencies.
//
//   node scripts/build-art.mjs
//
// GitHub serves these as images: no scripts and no web fonts, so text uses system fonts and stays
// short, and every image has its text alternative in the README. Motion is CSS inside the SVG and
// stops for readers who ask for reduced motion.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const THEMES = {
  light: {
    bg: "#fff8ef", bg2: "#ffe9d6", card: "#ffffff", sunken: "#fdeedd", fg: "#2b1638", muted: "#5e4763",
    border: "#f3dfcb", primary: "#c2410c", ink: "#a63407", accent: "#ff4f9a", accentInk: "#b0105d",
    heroA: "#ffd39c", heroB: "#f2a3bb", onHero: "#2b1638", line: "#f2d6bd", lineStrong: "#e8a878",
    orbHi: "#fffbe6", orb1: "#ffd166", orb2: "#ff7a45", orb3: "#d0186f", orbGlow: "#ff8a00", glowOpacity: 0.5,
    orbSwirl: "#fff3c4", orbShade: "#140a3c", shadeOpacity: 0.3,
    pass: "#146c34", passBg: "#e6f6ec", warn: "#8a4300", warnBg: "#fff1d6", block: "#b3141c", blockBg: "#fdeaea",
  },
  dark: {
    bg: "#170d1c", bg2: "#2a1426", card: "#23142b", sunken: "#2e1b36", fg: "#fff3e6", muted: "#cfb6c2",
    border: "#40263f", primary: "#ffb454", ink: "#ffb454", accent: "#ff6fb0", accentInk: "#ff8cc0",
    heroA: "#c2410c", heroB: "#a3125c", onHero: "#ffffff", line: "#472944", lineStrong: "#9a5a3c",
    orbHi: "#fff3c4", orb1: "#ffc24d", orb2: "#ff7a45", orb3: "#b0125e", orbGlow: "#ff9628", glowOpacity: 0.5,
    orbSwirl: "#ffe6a8", orbShade: "#000000", shadeOpacity: 0.5,
    pass: "#5fe39a", passBg: "#0f2c22", warn: "#ffc94d", warnBg: "#33260a", block: "#ff9a9a", blockBg: "#3a1420",
  },
};

const DISPLAY = "'Bricolage Grotesque','Segoe UI Variable Display','Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif";
const BODY = "Figtree,'Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** A rough text width for a system sans font, used only to size chips. */
const textWidth = (text, size, weight = 600) => text.length * size * (weight >= 700 ? 0.6 : 0.56);

const MOTION = `@media (prefers-reduced-motion: reduce){.m{animation:none!important}}
.spin{transform-box:fill-box;transform-origin:center;animation:spin 40s linear infinite}
.swirl{transform-box:fill-box;transform-origin:center;animation:spin 20s linear infinite reverse}
.pulse{animation:flow 9s linear infinite}
.breathe{animation:breathe 6s ease-in-out infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes flow{from{stroke-dashoffset:1600}to{stroke-dashoffset:0}}
@keyframes breathe{50%{opacity:.75}}`;

function svg(w, h, title, body, defs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<defs>${defs}<style>${MOTION}</style></defs>
${body}
</svg>
`;
}

/** The sun orb: three body stops, a glow, a dashed ring that turns, swirl lines that turn the other way. */
function orb(t, cx, cy, r, id) {
  const s = r / 50;
  const swirl = (d) => `<path d="${d}" fill="none" stroke-linecap="round" stroke-width="${(2.5 / s).toFixed(2)}"/>`;
  return {
    defs: `<radialGradient id="${id}b" cx="34%" cy="30%" r="75%"><stop offset="0" stop-color="${t.orbHi}"/><stop offset=".2" stop-color="${t.orb1}"/><stop offset=".58" stop-color="${t.orb2}"/><stop offset="1" stop-color="${t.orb3}"/></radialGradient>
<radialGradient id="${id}g"><stop offset=".45" stop-color="${t.orbGlow}" stop-opacity="${t.glowOpacity}"/><stop offset="1" stop-color="${t.orbGlow}" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}s" cx="70%" cy="74%" r="60%"><stop offset="0" stop-color="${t.orbShade}" stop-opacity="${t.shadeOpacity}"/><stop offset="1" stop-color="${t.orbShade}" stop-opacity="0"/></radialGradient>`,
    body: `<circle class="m breathe" cx="${cx}" cy="${cy}" r="${r * 1.9}" fill="url(#${id}g)"/>
<circle class="m spin" cx="${cx}" cy="${cy}" r="${r * 1.26}" fill="none" stroke="${t.lineStrong}" stroke-width="1.5" stroke-dasharray="5 7"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}b)"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}s)"/>
<g transform="translate(${cx - r} ${cy - r}) scale(${s})"><g class="m swirl" stroke="${t.orbSwirl}" opacity=".8"><rect width="100" height="100" fill="none" stroke="none"/>${swirl("M22 58c6-22 30-34 52-22")}${swirl("M30 76c18 6 40-4 46-24")}<g stroke="${t.orbHi}" opacity=".7">${swirl("M36 30c10-8 26-8 34 2")}</g></g></g>`,
  };
}

function chip(x, y, text, { fill, stroke, color, size = 15, h = 34 }) {
  const w = Math.round(textWidth(text, size) + 32);
  return { w, body: `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" stroke="${stroke}"/><text x="${x + w / 2}" y="${y + h / 2 + size * 0.35}" text-anchor="middle" font-family="${BODY}" font-size="${size}" font-weight="600" fill="${color}">${esc(text)}</text>` };
}

function banner(t) {
  const W = 1200, H = 400, o = orb(t, 1008, 196, 78, "o");
  const chips = [];
  let x = 64;
  for (const label of ["Every claim sourced", "Model and effort recorded", "Fact-checked and dated"]) {
    const c = chip(x, 300, label, { fill: t.card, stroke: "none", color: t.fg });
    chips.push(c.body);
    x += c.w + 12;
  }
  const ribbon = (d, delay) => `<path d="${d}" fill="none" stroke="${t.line}" stroke-width="1.5"/><path class="m pulse" d="${d}" fill="none" stroke="${t.accent}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="60 1540" style="animation-delay:${delay}s" opacity=".8"/>`;
  return svg(W, H, "onRails Research: the open research commons. Every claim sourced, model and effort recorded, fact-checked and dated.",
    `<rect width="${W}" height="${H}" rx="28" fill="url(#page)"/>
${ribbon("M-20 120C220 30 430 260 700 160S1080 40 1220 150", 0)}
${ribbon("M-20 330C240 250 460 420 760 330S1100 250 1220 340", -4.5)}
<rect x="24" y="24" width="768" height="352" rx="22" fill="url(#hero)"/>
<text x="64" y="86" font-family="${BODY}" font-size="15" font-weight="700" letter-spacing="2.4" fill="${t.onHero}" opacity=".85">ONRAILS · RESEARCH COMMONS</text>
<text x="62" y="170" font-family="${DISPLAY}" font-size="68" font-weight="800" letter-spacing="-1.4" fill="${t.onHero}">onRails Research</text>
<text x="64" y="226" font-family="${DISPLAY}" font-size="30" font-weight="600" letter-spacing="-.3" fill="${t.onHero}">Research anyone can check.</text>
<text x="64" y="264" font-family="${BODY}" font-size="18" fill="${t.onHero}" opacity=".9">Open dossiers, added by pull request, kept fresh.</text>
${chips.join("\n")}
<rect x="816" y="24" width="360" height="352" rx="22" fill="${t.card}" stroke="${t.border}"/>
<path d="M792 112h24" stroke="${t.lineStrong}" stroke-width="2"/><circle class="m breathe" cx="804" cy="112" r="4" fill="${t.accent}"/>
${o.body}
<text x="996" y="338" text-anchor="middle" font-family="${BODY}" font-size="15" font-weight="600" fill="${t.muted}">Re-checked on a schedule</text>`,
    `<linearGradient id="page" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.bg2}"/><stop offset="1" stop-color="${t.bg}"/></linearGradient>
<linearGradient id="hero" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.heroA}"/><stop offset="1" stop-color="${t.heroB}"/></linearGradient>${o.defs}`);
}

const ICONS = {
  source: (c) => `<path d="M-9-12h12l7 7v17h-19z" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round"/><path d="M3-12v7h7M-4 2l3 3 6-7" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  record: (c) => `<rect x="-10" y="-10" width="20" height="20" rx="4" fill="none" stroke="${c}" stroke-width="2.4"/><path d="M-5-14v4M0-14v4M5-14v4M-5 10v4M0 10v4M5 10v4M-14-5h4M-14 0h4M-14 5h4M10-5h4M10 0h4M10 5h4" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/><circle r="3.5" fill="${c}"/>`,
  dated: (c) => `<rect x="-12" y="-10" width="24" height="22" rx="4" fill="none" stroke="${c}" stroke-width="2.4"/><path d="M-12-3h24M-6-14v6M6-14v6M-5 5l3 3 7-7" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
};

function pillars(t) {
  const W = 1200, H = 236;
  const cards = [
    ["source", "Sourced", "Every claim names its source", "and how it is known."],
    ["record", "Recorded", "Every run logs its model,", "its effort and its brief."],
    ["dated", "Checked", "A fresh session fact-checks it.", "It shows when to re-check."],
  ];
  const body = cards.map(([icon, title, l1, l2], i) => {
    const x = 24 + i * 392;
    return `<rect x="${x}" y="24" width="368" height="188" rx="22" fill="${t.card}" stroke="${t.border}"/>
<circle cx="${x + 56}" cy="78" r="26" fill="${t.sunken}" stroke="${t.line}"/><g transform="translate(${x + 56} 78)">${ICONS[icon](t.ink)}</g>
<text x="${x + 98}" y="89" font-family="${DISPLAY}" font-size="30" font-weight="800" letter-spacing="-.5" fill="${t.fg}">${title}</text>
<text x="${x + 32}" y="148" font-family="${BODY}" font-size="18" fill="${t.muted}">${esc(l1)}</text>
<text x="${x + 32}" y="176" font-family="${BODY}" font-size="18" fill="${t.muted}">${esc(l2)}</text>`;
  }).join("\n");
  const wires = [392, 784].map((x) => `<path d="M${x} 78h24" stroke="${t.lineStrong}" stroke-width="2"/><circle class="m breathe" cx="${x + 12}" cy="78" r="4" fill="${t.accent}"/>`).join("");
  return svg(W, H, "Why it is trustworthy: every claim names its source and how it is known; every run logs its model, effort and brief; a fresh session fact-checks each dossier, and each one shows when to re-check it.", body + wires);
}

function steps(t) {
  const W = 1200, H = 210, y = 92, x0 = 80, x1 = 1000;
  const names = [["1", "Make it", "the generator"], ["2", "Guess first", "hypotheses"], ["3", "Research", "sources, claims"], ["4", "Fact-check", "a fresh session"], ["5", "Pull request", "one dossier"]];
  const gap = (x1 - x0) / (names.length - 1);
  const o = orb(t, 1112, y, 34, "s");
  const stations = names.map(([n, a, b], i) => {
    const x = x0 + i * gap;
    return `<circle cx="${x}" cy="${y}" r="22" fill="${t.card}" stroke="${t.primary}" stroke-width="2.5"/><text x="${x}" y="${y + 7}" text-anchor="middle" font-family="${DISPLAY}" font-size="20" font-weight="800" fill="${t.ink}">${n}</text>
<text x="${x}" y="${y + 58}" text-anchor="middle" font-family="${DISPLAY}" font-size="20" font-weight="700" fill="${t.fg}">${a}</text>
<text x="${x}" y="${y + 84}" text-anchor="middle" font-family="${BODY}" font-size="16" fill="${t.muted}">${b}</text>`;
  }).join("\n");
  const rail = `M${x0} ${y}H${1112 - 34}`;
  return svg(W, H, "How to contribute in five steps: make the folder with the generator, write your hypotheses first, research and log sources and claims, get a fact-check in a fresh session, then open one pull request per dossier.",
    `<rect width="${W}" height="${H}" rx="24" fill="${t.bg}" stroke="${t.border}"/>
<path d="${rail}" stroke="${t.lineStrong}" stroke-width="3" stroke-linecap="round"/>
<path class="m pulse" d="${rail}" fill="none" stroke="${t.accent}" stroke-width="4" stroke-linecap="round" stroke-dasharray="70 1530"/>
${stations}
${o.body}`, o.defs);
}

function labels(t) {
  const W = 1200, H = 236;
  const rowY = [64, 160];
  const groups = [
    [rowY[0], "How a claim is known", [
      ["measured", t.passBg, t.pass, "fill"], ["read-in-source", t.sunken, t.ink, "fill"], ["vendor-claim", t.warnBg, t.warn, "fill"],
      ["anecdote", t.card, t.muted, "fill"], ["summary-only", t.card, t.muted, "dash"]]],
    [rowY[1], "Freshness and trust", [
      ["fresh", t.passBg, t.pass, "fill"], ["due soon", t.warnBg, t.warn, "fill"], ["stale", t.blockBg, t.block, "fill"],
      ["cross-checked", t.passBg, t.pass, "ring"], ["fact-checked", t.sunken, t.ink, "ring"]]],
  ];
  const marks = { fill: (x, y, c) => `<circle cx="${x}" cy="${y}" r="6" fill="${c}"/>`, dash: (x, y, c) => `<circle cx="${x}" cy="${y}" r="5.5" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="3 2.5"/>`, ring: (x, y, c) => `<circle cx="${x}" cy="${y}" r="5.5" fill="none" stroke="${c}" stroke-width="2.2"/><circle cx="${x}" cy="${y}" r="2" fill="${c}"/>` };
  const body = groups.map(([y, title, items]) => {
    let x = 322;
    const chips = items.map(([text, fill, color, mark]) => {
      const w = Math.round(textWidth(text, 16) + 50);
      const out = `<rect x="${x}" y="${y - 22}" width="${w}" height="44" rx="22" fill="${fill}" stroke="${color}" stroke-opacity=".45"${mark === "dash" ? ' stroke-dasharray="5 4"' : ""}/>${marks[mark](x + 22, y, color)}<text x="${x + 36}" y="${y + 6}" font-family="${BODY}" font-size="16" font-weight="600" fill="${color}">${esc(text)}</text>`;
      x += w + 10;
      return out;
    }).join("");
    return `<text x="44" y="${y + 7}" font-family="${DISPLAY}" font-size="20" font-weight="700" fill="${t.fg}">${esc(title)}</text>${chips}`;
  }).join("\n");
  return svg(W, H, "The trust labels. How a claim is known: measured, read-in-source, vendor-claim, anecdote, summary-only. How fresh a dossier is: fresh, due soon, stale. Who checked it: cross-checked or fact-checked.",
    `<rect width="${W}" height="${H}" rx="24" fill="${t.card}" stroke="${t.border}"/><path d="M48 112H1152" stroke="${t.line}"/>
${body}`);
}

const ART = { banner, pillars, steps, labels };

function main() {
  const out = resolve(dirname(fileURLToPath(import.meta.url)), "..", "assets");
  mkdirSync(out, { recursive: true });
  for (const [name, draw] of Object.entries(ART)) {
    for (const [theme, tokens] of Object.entries(THEMES)) {
      const text = draw(tokens);
      writeFileSync(join(out, `${name}-${theme}.svg`), text);
      console.log(`assets/${name}-${theme}.svg  ${text.length} bytes`);
    }
  }
}

main();
