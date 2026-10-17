// Screenshots of the Genre Snob theme: the start screen, the first drop on
// desktop, and mid-game on a phone, all with perfect autoplay on Hard.
// node art-shots.js   (saves art-*.png into ART, see env.js)
// It also checks the theme art loaded, coins fell, and there were no console errors.
// The background video is optional, so 404s from looking for it do not count as errors.
const puppeteer = require("puppeteer-core");
const path = require("path");
const { ART, LAUNCH, expected404 } = require("./env");
const BASE = process.env.BASE || "http://127.0.0.1:47321/play/?debug";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 2 };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
// Genre Snob is 140 BPM with beat 1 at 0 s. The first drop lands on bar 21.
const BAR = 4 * 60 / 140;
const DROP = 20 * BAR + 0.55;
const MID = 22 * BAR + 0.3;

async function fresh(b, viewport, motion) {
  const p = await b.newPage();
  p.errors = [];
  p.on("console", (m) => {
    if (m.type() === "error" && !expected404(m)) p.errors.push(m.text());
  });
  p.on("pageerror", (e) => p.errors.push("PAGEERROR " + e.message));
  await p.setViewport(viewport);
  if (motion) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: motion }]);
  await p.goto(BASE, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle0" });
  await p.evaluate(() => document.fonts.ready);
  await wait(400);
  return p;
}

const st = (p) => p.evaluate(() => window.skwishDrop.state());
async function untilState(p, want, ms = 120000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if ((await st(p)) === want) return true;
    await wait(100);
  }
  return false;
}
async function untilSong(p, t) {
  for (;;) {
    const now = await p.evaluate(() => window.skwishDrop.songTime());
    if (now >= t) return;
    await wait(Math.min(200, Math.max(10, (t - now) * 1000 - 30)));
  }
}

// Perfect play from inside the page, pressing as each note is heard.
async function autoplay(p) {
  await p.evaluate(() => {
    const S = window.skwishDrop;
    const keys = ["ArrowLeft", "ArrowDown", "ArrowUp", "ArrowRight"];
    const offset = S.settings().offsetMs / 1000;
    const heardSong = () => S.songTime() + offset;
    const queued = new Set();
    const key = (type, k) => document.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));
    (function tick() {
      const s = S.state();
      if (s === "results" || s === "start") return;
      if (s === "playing") {
        const t = heardSong();
        S.notes().forEach((n, i) => {
          if (queued.has(i) || n[0] - t > 0.06) return;
          queued.add(i);
          setTimeout(() => {
            key("keydown", keys[n[1]]);
            const delay = n[3] ? Math.max(30, (n[3] + 0.03 - heardSong()) * 1000) : 90;
            setTimeout(() => key("keyup", keys[n[1]]), delay);
          }, Math.max(0, (n[0] - heardSong()) * 1000));
        });
      }
      requestAnimationFrame(tick);
    })();
  });
}

const shot = (p, name) => p.screenshot({ path: path.join(ART, name) });
const toGame = (p) => p.evaluate(() => document.getElementById("game").scrollIntoView({ block: "center" }));
const fails = [];
function ok(name, cond, extra) {
  console.log((cond ? "PASS " : "FAIL ") + name + (extra !== undefined ? " " + JSON.stringify(extra) : ""));
  if (!cond) fails.push(name);
}

(async () => {
  const b = await puppeteer.launch(LAUNCH);
  const only = process.argv[2];

  if (!only || only === "desktop") {
    const p = await fresh(b, DESKTOP);
    await toGame(p);
    const start = await p.evaluate(() => {
      const img = document.querySelector(".game-cover img");
      return { theme: document.getElementById("game").dataset.theme, cover: img.currentSrc.split("/").pop(), coverShown: img.getBoundingClientRect().width, song: document.querySelector("[data-song]").textContent.replace(/\s+/g, " ").trim() };
    });
    ok("start: theme on, cover shown", start.theme === "genre-snob" && start.coverShown > 100, start);
    await shot(p, "art-start.png");
    await p.click('input[name="difficulty"][value="hard"]');
    await p.click("[data-start]");
    await untilState(p, "playing", 20000);
    await autoplay(p);
    await untilSong(p, DROP);
    const missed = await p.evaluate(() => window.skwishDrop.counts().miss);
    await shot(p, "art-drop-desktop.png");
    const t = await p.evaluate(() => window.skwishDrop.theme());
    ok("desktop: theme art loaded", t.art.dancer && t.art.coins && t.art.title && t.art.logo && t.art.backdrop, t.art);
    ok("desktop: coins falling on the drop", t.coins > 10, t.coins);
    ok("desktop: no misses up to the drop", missed === 0, missed);
    ok("desktop: no console errors", p.errors.length === 0, p.errors.length ? p.errors : undefined);
    console.log("video:", JSON.stringify(t.video));
    await p.close();
  }

  if (!only || only === "mobile") {
    const m = await fresh(b, PHONE);
    await m.screenshot({ path: path.join(ART, "art-start-mobile.png") });
    await m.click('input[name="difficulty"][value="hard"]');
    await m.tap("[data-start]");
    await untilState(m, "playing", 20000);
    await autoplay(m);
    await untilSong(m, MID);
    await shot(m, "art-midgame-mobile.png");
    const t = await m.evaluate(() => window.skwishDrop.theme());
    ok("mobile: coins falling mid-drop", t.coins > 3, t.coins);
    ok("mobile: no console errors", m.errors.length === 0, m.errors.length ? m.errors : undefined);
    await m.close();
  }

  if (!only || only === "reduce") {
    // Reduced motion: no falling coins, no video lookup.
    const r = await fresh(b, DESKTOP, "reduce");
    await r.click("[data-start]");
    await untilState(r, "playing", 20000);
    await autoplay(r);
    await untilSong(r, DROP);
    const coinsMove = await r.evaluate(() => window.skwishDrop.theme());
    ok("reduced motion: coins fade in place, few of them", coinsMove.coins <= 8, coinsMove.coins);
    ok("reduced motion: no video", coinsMove.video === null);
    ok("reduced motion: no console errors", r.errors.length === 0, r.errors.length ? r.errors : undefined);
    await r.close();
  }

  await b.close();
  console.log(fails.length ? "FAILED: " + fails.join(", ") : "ALL PASS");
})();
