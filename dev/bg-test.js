// The Genre Snob background video on /play/: lazy loading, landscape and
// vertical, sync with the song (start, pause, resume, a forced jump, retry,
// turning the screen), the still for reduced motion and when the video fails,
// and the mid-game screenshots bg-desktop.png and bg-mobile.png (into ART).
// Needs the range server: node serve.js   then   node bg-test.js [case]
const puppeteer = require("puppeteer-core");
const path = require("path");
const { ART, LAUNCH, expected404 } = require("./env");
const BASE = process.env.BASE || "http://127.0.0.1:47322/play/?debug";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 2 };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const BAR = 4 * 60 / 140;
const MID = 22 * BAR + 0.3;
const BG = /genre-snob-bg|bg-poster/;
const MOVIE = /\.(webm|mp4)(\?|$)/;
const DRIFT = 0.12;

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

const vid = (p) => p.evaluate(() => window.skwishDrop.theme().video);
const drift = (v) => Math.abs(v.time - v.song);
const shot = (p, name) => p.screenshot({ path: path.join(ART, name) });
const fails = [];
function ok(name, cond, extra) {
  console.log((cond ? "PASS " : "FAIL ") + name + (extra !== undefined ? " " + JSON.stringify(extra) : ""));
  if (!cond) fails.push(name);
}
// Watches which background files the page asks for.
function watch(p) {
  const seen = [];
  p.on("request", (r) => { if (BG.test(r.url())) seen.push(r.url().split("/").pop()); });
  return seen;
}
// The video settles within a second or two of any change.
async function settled(p, ms = 4000) {
  const end = Date.now() + ms;
  let v;
  while (Date.now() < end) {
    v = await vid(p);
    if (v && v.on && !v.paused && drift(v) < DRIFT) return v;
    await wait(150);
  }
  return v;
}

(async () => {
  const b = await puppeteer.launch(LAUNCH);
  const only = process.argv[2];

  if (!only || only === "mobile") {
    const m2 = await fresh(b, PHONE);
    const seen2 = watch(m2);
    await m2.reload({ waitUntil: "networkidle0" });
    await wait(1500);
    ok("mobile: nothing from the background loads before Start", seen2.length === 0, seen2);
    await m2.click('input[name="difficulty"][value="hard"]');
    await m2.tap("[data-start]");
    await untilState(m2, "playing", 20000);
    await autoplay(m2);
    await untilSong(m2, MID);
    const v = await settled(m2);
    ok("mobile: vertical WebM playing", v && v.shape === "vertical" && /vertical\.webm$/.test(v.src) && v.on && !v.paused, v);
    ok("mobile: in sync with the song", v && drift(v) < DRIFT, v && drift(v));
    await shot(m2, "bg-mobile.png");
    ok("mobile: no console errors", m2.errors.length === 0, m2.errors.length ? m2.errors : undefined);
    await m2.close();
  }

  if (!only || only === "desktop") {
    const p = await fresh(b, DESKTOP);
    await p.evaluate(() => document.getElementById("game").scrollIntoView({ block: "center" }));
    await p.click('input[name="difficulty"][value="hard"]');
    await p.click("[data-start]");
    await untilState(p, "playing", 20000);
    let v = await settled(p, 6000);
    ok("desktop: landscape WebM playing from the start", v && v.shape === "landscape" && /landscape\.webm$/.test(v.src) && !v.paused, v);
    ok("desktop: in sync at the start", v && drift(v) < DRIFT, v && drift(v));
    await autoplay(p);
    await untilSong(p, MID);
    v = await settled(p);
    ok("desktop: in sync mid-song", v && drift(v) < DRIFT, v && drift(v));
    await shot(p, "bg-desktop.png");

    await p.keyboard.press("Escape");
    await wait(800);
    const paused = await vid(p);
    ok("pause: video stops", (await st(p)) === "paused" && paused.paused, paused);
    await wait(1000);
    const still = await vid(p);
    ok("pause: video holds still", Math.abs(still.time - paused.time) < 0.05, [paused.time, still.time]);
    await p.click("[data-resume]");
    v = await settled(p);
    ok("resume: back in sync", v && !v.paused && drift(v) < DRIFT, v && drift(v));

    // A jump (a stall, a dropped tab) is pulled back to the song.
    await p.evaluate(() => { document.querySelector("video.game-video").currentTime += 6; });
    await wait(300);
    v = await settled(p);
    ok("jump: seeks back to the song", v && drift(v) < DRIFT, v && drift(v));

    // Turning the screen tall swaps to the vertical video, still in sync.
    await p.setViewport({ width: 700, height: 1000, deviceScaleFactor: 1 });
    await wait(500);
    v = await settled(p, 6000);
    ok("turned tall: vertical video, in sync", v && v.shape === "vertical" && drift(v) < DRIFT, v);
    await p.setViewport(DESKTOP);
    await wait(500);
    v = await settled(p, 6000);
    ok("turned wide: landscape again, in sync", v && v.shape === "landscape" && drift(v) < DRIFT, v);

    await p.keyboard.press("Escape");
    await wait(300);
    await p.click(".game-screen:not([hidden]) [data-retry]").catch(() => p.keyboard.press("r"));
    await untilState(p, "playing", 20000);
    v = await settled(p, 6000);
    ok("retry: video starts over with the song", v && v.song < 6 && v.time < 6 && drift(v) < DRIFT, v);
    ok("desktop: no console errors", p.errors.length === 0, p.errors.length ? p.errors : undefined);
    await p.close();
  }

  if (!only || only === "reduce") {
    const r = await fresh(b, DESKTOP, "reduce");
    const seen = watch(r);
    await r.click("[data-start]");
    await untilState(r, "playing", 20000);
    await wait(2500);
    const v = await vid(r);
    ok("reduced motion: still only, on", v && v.still && v.on && /bg-poster-landscape/.test(v.src), v);
    ok("reduced motion: no video files asked for", !seen.some((u) => MOVIE.test(u)), seen);
    ok("reduced motion: no console errors", r.errors.length === 0, r.errors.length ? r.errors : undefined);
    await r.close();
  }

  if (!only || only === "fail") {
    // Video files blocked: the poster stays up as the still and the game plays on.
    const f = await fresh(b, DESKTOP);
    await f.setRequestInterception(true);
    f.on("request", (q) => (MOVIE.test(q.url()) ? q.respond({ status: 404, body: "" }) : q.continue()));
    await f.click("[data-start]");
    await untilState(f, "playing", 20000);
    await wait(3000);
    const v = await vid(f);
    const poster = await f.evaluate(() => { const e = document.querySelector("video.game-video"); return e && e.poster.split("/").pop(); });
    ok("no video: poster still shows, sync stands down", v && v.on && v.failed && poster === "bg-poster-landscape-960.webp", { v, poster });
    ok("no video: game keeps playing", (await st(f)) === "playing");
    const errs = f.errors.filter((e) => !/404|Failed to load resource/.test(e));
    ok("no video: no script errors", errs.length === 0, errs.length ? errs : undefined);
    await f.close();
  }

  await b.close();
  console.log(fails.length ? "FAILED: " + fails.join(", ") : "ALL PASS");
})();
