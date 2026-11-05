// Screenshots of the real track, "Genre Snob": the start screen with the song
// title, the first drop landing, and mid-drop on desktop and phone.
// node song-shots.js   (saves song-*.png into ART, see env.js)
const puppeteer = require("puppeteer-core");
const path = require("path");
const { ART, LAUNCH, expected404 } = require("./env");
const BASE = process.env.BASE || "http://127.0.0.1:47321/play/?debug";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 2 };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
// Genre Snob is 140 BPM with beat 1 at 0 s. The first drop lands on bar 21.
const BAR = 4 * 60 / 140;
const IMPACT = 20 * BAR + 0.12;
const MID = 22 * BAR + 1.6 * 60 / 140;

async function fresh(b, viewport) {
  const p = await b.newPage();
  p.errors = [];
  p.on("console", (m) => { if (m.type() === "error" && !expected404(m)) p.errors.push(m.text()); });
  p.on("pageerror", (e) => p.errors.push("PAGEERROR " + e.message));
  await p.setViewport(viewport);
  await p.goto(BASE, { waitUntil: "networkidle0" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle0" });
  await p.evaluate(() => document.fonts.ready);
  await wait(300);
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

(async () => {
  const b = await puppeteer.launch(LAUNCH);
  const errors = [];

  const p = await fresh(b, DESKTOP);
  await toGame(p);
  const song = await p.$eval("[data-song]", (e) => e.textContent.trim());
  console.log("start screen says:", song);
  await shot(p, "song-start.png");
  await p.click('input[name="difficulty"][value="hard"]');
  await p.click("[data-start]");
  await untilState(p, "playing", 20000);
  await autoplay(p);
  await untilSong(p, IMPACT);
  await shot(p, "song-drop-desktop.png");
  await untilSong(p, MID);
  await shot(p, "song-midgame-desktop.png");
  errors.push(...p.errors);
  await p.close();

  const m = await fresh(b, PHONE);
  await m.click('input[name="difficulty"][value="hard"]');
  await m.tap("[data-start]");
  await untilState(m, "playing", 20000);
  await autoplay(m);
  await untilSong(m, MID);
  await shot(m, "song-midgame-mobile.png");
  errors.push(...m.errors);
  await m.close();

  await b.close();
  console.log(errors.length ? "console errors: " + JSON.stringify(errors) : "no console errors");
})();
