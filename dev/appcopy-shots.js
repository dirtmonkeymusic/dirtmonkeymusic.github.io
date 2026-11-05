// Shows and Music pages (the app copy): screenshots, the live Bandsintown list,
// the fallback when Bandsintown is blocked, the localStorage cache, and the
// iTunes previews (one at a time, progress ring).
// node appcopy-shots.js
const puppeteer = require("puppeteer-core");
const path = require("path");
const { ART, LAUNCH } = require("./env");
const BASE = process.env.BASE || "http://127.0.0.1:47321";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
let fails = 0;
const ok = (name, cond, extra) => {
  if (!cond) fails++;
  console.log((cond ? "PASS " : "FAIL ") + name + (extra !== undefined ? " " + JSON.stringify(extra) : ""));
};

async function open(b, url, vp, opts = {}) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  p.errors = [];
  p.on("console", (m) => { if (m.type() === "error") p.errors.push(m.text()); });
  p.on("pageerror", (e) => p.errors.push("PAGEERROR " + e.message));
  if (opts.block) {
    await p.setRequestInterception(true);
    p.on("request", (r) => (opts.block.test(r.url()) ? r.abort("blockedbyclient") : r.continue()));
  }
  await p.setViewport(vp);
  await p.goto(BASE + url, { waitUntil: "networkidle0" });
  await p.evaluate(() => document.fonts.ready);
  p.ctx = ctx;
  return p;
}

(async () => {
  const b = await puppeteer.launch(LAUNCH);

  // Shows, live.
  for (const [name, vp] of [["desktop", DESKTOP], ["mobile", PHONE]]) {
    const p = await open(b, "/shows/", vp);
    await p.waitForSelector('[data-gig-list]:not([aria-busy])', { timeout: 20000 });
    await wait(600);
    const info = await p.evaluate(() => ({
      source: document.querySelector("[data-gig-list]").dataset.source,
      rows: [...document.querySelectorAll(".gig")].map((g) => g.innerText.replace(/\s+/g, " ")),
      tix: [...document.querySelectorAll(".gig-tix")].map((a) => a.href),
      follow: document.querySelector("[data-bit-follow]").href,
      count: document.querySelector("[data-bit-count]").textContent,
      followers: document.querySelector("[data-bit-followers]").textContent,
      overflow: document.documentElement.scrollWidth - innerWidth,
      dashes: document.body.innerText.includes("\u2014"),
      cached: !!localStorage.getItem("dm.bandsintown.v1")
    }));
    if (name === "desktop") console.log(JSON.stringify(info, null, 1));
    ok("shows live " + name, info.source === "live" && info.rows.length > 0, info.source);
    ok("shows tickets are offer links " + name, info.tix.every((h) => /bandsintown\.com\/t\//.test(h)));
    ok("shows follow has trigger=track " + name, /trigger=track/.test(info.follow));
    ok("shows cached " + name, info.cached);
    ok("shows no overflow, no em dash, no errors " + name, info.overflow <= 0 && !info.dashes && !p.errors.length, p.errors);
    await p.screenshot({ path: path.join(ART, "shows2-" + name + ".png"), fullPage: true });
    // Reload inside the cache window: no network call to Bandsintown.
    let hits = 0;
    p.on("request", (r) => { if (/rest\.bandsintown/.test(r.url())) hits++; });
    await p.reload({ waitUntil: "networkidle0" });
    const src = await p.evaluate(() => document.querySelector("[data-gig-list]").dataset.source);
    ok("shows reload uses cache " + name, src === "cache" && hits === 0, { src, hits });
    await p.ctx.close();
  }

  // Shows, Bandsintown blocked: the fallback dates.
  {
    const p = await open(b, "/shows/", PHONE, { block: /rest\.bandsintown\.com/ });
    await p.waitForSelector('[data-gig-list]:not([aria-busy])', { timeout: 20000 });
    const info = await p.evaluate(() => ({
      source: document.querySelector("[data-gig-list]").dataset.source,
      rows: document.querySelectorAll(".gig:not([hidden])").length,
      status: document.querySelector("[data-bit-status]").textContent
    }));
    ok("shows fallback when blocked", info.source === "fallback" && info.rows === 4, info);
    await p.ctx.close();
  }

  // Music.
  for (const [name, vp] of [["desktop", DESKTOP], ["mobile", PHONE]]) {
    const p = await open(b, "/music/", vp);
    const info = await p.evaluate(() => ({
      meta: document.querySelector(".upcoming-meta").textContent,
      cta: document.querySelector("[data-album-cta]").textContent,
      titles: [...document.querySelectorAll(".track-title")].map((t) => t.textContent),
      apple: document.querySelector(".pill-apple").href,
      overflow: document.documentElement.scrollWidth - innerWidth,
      dashes: document.body.innerText.includes("\u2014"),
      connect: document.querySelectorAll(".connect-link").length
    }));
    if (name === "desktop") console.log(JSON.stringify(info, null, 1));
    ok("music countdown " + name, /^Nov 13 · 19K · \d+ days? to go$/.test(info.meta) && info.cta === "Pre-save", info.meta);
    ok("music tracks in order " + name, info.titles.join("|") === "Try Again|Candy|Heads Will Roll|YKDR|Y2K DUB|ARROWS");
    ok("music apple link " + name, info.apple === "https://music.apple.com/us/album/6814886982?i=6814886983");
    ok("music connect links " + name, info.connect === 10);
    ok("music no overflow, no em dash " + name, info.overflow <= 0 && !info.dashes);
    await p.screenshot({ path: path.join(ART, "music2-" + name + ".png"), fullPage: true });

    if (name === "desktop") {
      // Play one, then another: only one plays.
      const btns = await p.$$(".play-btn");
      await btns[0].click();
      await p.waitForFunction(() => document.querySelector(".play-btn").classList.contains("is-playing"), { timeout: 20000 });
      await wait(2500);
      const ring = await p.evaluate(() => +getComputedStyle(document.querySelector(".play-btn")).getPropertyValue("--progress"));
      ok("music preview plays with ring moving", ring > 0.03, ring);
      await btns[1].click();
      await p.waitForFunction(() => document.querySelectorAll(".play-btn")[1].classList.contains("is-playing"), { timeout: 20000 });
      await wait(1200);
      const state = await p.evaluate(() => ({
        playing: [...document.querySelectorAll(".play-btn")].map((b) => b.getAttribute("aria-pressed")),
        src: document.querySelector("[data-preview]").src,
        status: document.querySelector("[data-track-status]").textContent
      }));
      ok("music one at a time", state.playing.join(",") === "false,true,false,false,false,false" && /itunes|apple/.test(state.src), state);
      await btns[1].click();
      await wait(300);
      const paused = await p.evaluate(() => document.querySelector("[data-preview]").paused);
      ok("music pause", paused);
    }
    ok("music no errors " + name, !p.errors.length, p.errors);
    await p.ctx.close();
  }

  // Release day.
  {
    const p = await open(b, "/music/?now=2026-11-13T09:00:00", PHONE);
    const info = await p.evaluate(() => [document.querySelector(".upcoming-meta").textContent, document.querySelector("[data-album-cta]").textContent, document.querySelector("[data-album-kicker]").textContent]);
    ok("music release day", info[0] === "Nov 13 · 19K · Out now" && info[1] === "Listen", info);
    await p.ctx.close();
  }

  await b.close();
  console.log(fails ? fails + " failed" : "all passed");
  process.exit(fails ? 1 : 0);
})();
