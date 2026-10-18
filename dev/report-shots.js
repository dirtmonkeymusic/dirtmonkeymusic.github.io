// Screenshots of the game for a report: start screen, mid-game on desktop and
// phone, results with a full combo badge, and the calibration screen.
// node report-shots.js   (saves PNGs into ART, see env.js)
const puppeteer = require("puppeteer-core");
const path = require("path");
const { ART, LAUNCH, expected404 } = require("./env");
const BASE = process.env.BASE || "http://127.0.0.1:47321/play/?debug";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 2 };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
// Beat 56.6 at 140 BPM: the second drop, past 100 combo on Hard.
const MID = (36 + 20.6) * 60 / 140;

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

const st = (p) => p.evaluate(() => window.monkeyDrop.state());
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
    const now = await p.evaluate(() => window.monkeyDrop.songTime());
    if (now >= t) return;
    await wait(Math.min(200, Math.max(10, (t - now) * 1000 - 30)));
  }
}

// Perfect play from inside the page, pressing as each note is heard.
async function autoplay(p) {
  await p.evaluate(() => {
    const S = window.monkeyDrop;
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
  await shot(p, "play-start.png");
  await p.click('input[name="difficulty"][value="hard"]');
  await p.click("[data-start]");
  await untilState(p, "playing", 5000);
  await autoplay(p);
  await untilSong(p, MID);
  await shot(p, "play-midgame-desktop.png");
  // Taking a screenshot stalls the page long enough to cost a note, so the results come from a clean run.
  await p.keyboard.press("Escape");
  await p.keyboard.press("r");
  await untilState(p, "playing", 5000);
  await autoplay(p);
  await untilState(p, "results");
  await wait(900);
  const fc = await p.$eval("[data-r-fc]", (e) => (e.hidden ? "" : e.textContent));
  await shot(p, "play-results.png");
  console.log("results badge:", fc || "(none)");
  await p.click('[data-screen="results"] [data-quit]');
  await p.click("[data-calibrate]");
  await wait(2500);
  await shot(p, "play-calibrate.png");
  errors.push(...p.errors);
  await p.close();

  const m = await fresh(b, PHONE);
  await m.click('input[name="difficulty"][value="hard"]');
  await m.tap("[data-start]");
  await untilState(m, "playing", 5000);
  await autoplay(m);
  await untilSong(m, MID);
  await shot(m, "play-midgame-mobile.png");
  errors.push(...m.errors);
  await m.close();

  await b.close();
  console.log(errors.length ? "console errors: " + JSON.stringify(errors) : "no console errors");
})();
