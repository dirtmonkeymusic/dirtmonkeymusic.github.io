const puppeteer = require("puppeteer-core");
const BASE = process.env.BASE || "http://127.0.0.1:47321/play/?debug";
const { SHOT, ART, LAUNCH, expected404 } = require("./env");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const only = process.argv[2] || "all";
const results = {};
const ok = (name, cond, extra) => {
  results[name] = cond ? "PASS" : "FAIL " + JSON.stringify(extra === undefined ? "" : extra);
  console.log((cond ? "PASS " : "FAIL ") + name + (extra !== undefined ? " " + JSON.stringify(extra) : ""));
};

async function fresh(b, opts = {}) {
  const p = await b.newPage();
  const errors = [];
  p.on("console", (m) => { if (m.type() === "error" && !expected404(m)) errors.push(m.text()); });
  p.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
  p.errors = errors;
  await p.setViewport(opts.viewport || { width: 1440, height: 900, deviceScaleFactor: 2 });
  if (opts.reduce) await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await p.goto(opts.url || BASE, { waitUntil: "networkidle0" });
  if (!opts.keep) {
    await p.evaluate(() => localStorage.clear());
    await p.reload({ waitUntil: "networkidle0" });
  }
  await p.evaluate(() => document.fonts.ready);
  await wait(300);
  return p;
}

const st = (p) => p.evaluate(() => window.skwishDrop.state());
const songTime = (p) => p.evaluate(() => window.skwishDrop.songTime());

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
    const now = await songTime(p);
    if (now >= t) return now;
    await wait(Math.min(200, Math.max(10, (t - now) * 1000 - 30)));
  }
}

// Plays the chart in the page. opts.keys: "arrows" or "wasd". opts.skip: note indexes to leave alone.
// opts.early: note indexes whose hold is let go half way. opts.late: ms added to every press.
async function autoplay(p, opts = {}) {
  await p.evaluate((opts) => {
    const S = window.skwishDrop;
    const sets = { arrows: ["ArrowLeft", "ArrowDown", "ArrowUp", "ArrowRight"], wasd: ["a", "s", "w", "d"] };
    const keys = sets[opts.keys || "arrows"];
    const skip = new Set(opts.skip || []);
    const early = new Set(opts.early || []);
    const late = (opts.late || 0) / 1000;
    const queued = new Set();
    // Press when the note is heard, like a player would. songTime() has the timing offset
    // taken off, so add it back; otherwise a nudged offset would shift the presses too.
    const offset = S.settings().offsetMs / 1000 + (typeof BEATMAP !== "undefined" ? Number(BEATMAP.inputOffsetMs) || 0 : 0) / 1000;
    const heardSong = () => S.songTime() + offset;
    function key(type, k) { document.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true })); }
    function tick() {
      const s = S.state();
      if (s === "results" || s === "start") return;
      if (s === "playing") {
        const t = heardSong();
        S.notes().forEach((n, i) => {
          if (queued.has(i) || skip.has(i) || n[0] + late - t > 0.06) return;
          queued.add(i);
          const k = keys[n[1]];
          setTimeout(() => {
            key("keydown", k);
            const upAt = n[3] ? (early.has(i) ? (n[0] + n[3]) / 2 : n[3] + 0.03) : null;
            const delay = upAt ? Math.max(30, (upAt - heardSong()) * 1000) : 40;
            setTimeout(() => key("keyup", k), delay);
          }, Math.max(0, (n[0] + late - heardSong()) * 1000));
        });
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, opts);
}

async function readResults(p) {
  return p.evaluate(() => {
    const r = {};
    document.querySelectorAll("[data-r]").forEach((e) => { r[e.dataset.r] = e.textContent; });
    const fc = document.querySelector("[data-r-fc]");
    r.fc = fc.hidden ? "" : fc.textContent;
    r.flag = document.querySelector("[data-r-best]").textContent;
    const nudge = document.querySelector("[data-nudge]");
    r.nudge = nudge.hidden ? "" : nudge.textContent;
    r.focus = document.activeElement && document.activeElement.textContent;
    return r;
  });
}

async function pick(p, diff) {
  await p.click(`input[name="difficulty"][value="${diff}"]`);
}

async function fps(p, ms) {
  return p.evaluate((ms) => new Promise((res) => {
    const gaps = [];
    let last = 0;
    const end = performance.now() + ms;
    function f(t) {
      if (last) gaps.push(t - last);
      last = t;
      if (t < end) requestAnimationFrame(f);
      else {
        gaps.sort((a, b) => a - b);
        res({ frames: gaps.length, median: gaps[gaps.length >> 1], p95: gaps[Math.floor(gaps.length * 0.95)], fps: Math.round(1000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length)) });
      }
    }
    requestAnimationFrame(f);
  }), ms);
}

(async () => {
  const b = await puppeteer.launch(LAUNCH);

  if (only === "all" || only === "clear") {
    const p = await fresh(b);
    for (const [diff, keys] of [["easy", "arrows"], ["normal", "wasd"], ["hard", "arrows"], ["skwished", "wasd"]]) {
      await pick(p, diff);
      await p.click("[data-start]");
      await untilState(p, "playing", 5000);
      const holds = (await p.evaluate(() => window.skwishDrop.notes())).filter((n) => n[3]).length;
      await autoplay(p, { keys });
      await untilState(p, "results");
      const r = await readResults(p);
      const counts = await p.evaluate(() => window.skwishDrop.counts());
      // The key is "dm-play-best:<title>|<track audio, if any>|<difficulty>".
      const best = await p.evaluate((d) => Object.keys(localStorage).find((k) => k.startsWith("dm-play-best:Skwish Drop|") && k.endsWith("|" + d)), diff);
      ok(`clear ${diff}`, r.grade === "S" && r.status === "Cleared" && /full combo/i.test(r.fc) && counts.miss === 0 && counts.ng === 0 && !!best, { r, counts });
      if (diff === "hard") ok("holds counted on hard", holds > 0 && r.holds === holds + " / " + holds, { holds, shown: r.holds });
      ok(`retry focused after ${diff}`, r.focus === "Retry", r.focus);
      await p.click('[data-screen="results"] [data-quit]');
      await wait(200);
    }
    const metas = await p.evaluate(() => [...document.querySelectorAll("[data-diff-best]")].map((e) => e.textContent));
    ok("per-difficulty bests on picker", metas.every((m) => /^S /.test(m)), metas);
    ok("no console errors (clear)", p.errors.length === 0, p.errors);
    await p.close();
  }

  if (only === "all" || only === "fail") {
    const p = await fresh(b);
    await pick(p, "skwished");
    await p.click("[data-start]");
    await untilState(p, "playing", 5000);
    let lifeSeen = [];
    for (let i = 0; i < 40 && (await st(p)) === "playing"; i++) {
      lifeSeen.push(await p.evaluate(() => window.skwishDrop.life()));
      await wait(250);
    }
    await untilState(p, "results", 20000);
    const r = await readResults(p);
    ok("stage fails when life runs out", r.status === "Stage failed" && r.grade === "D" && !r.fc, r);
    ok("life drains", lifeSeen[0] >= 50 && Math.min(...lifeSeen) < 50, lifeSeen.slice(0, 12));
    // R on results retries at once
    await p.keyboard.press("r");
    const again = await untilState(p, "playing", 5000);
    const t = await songTime(p);
    ok("R retries from results", again && t < 1.5, t);
    ok("no console errors (fail)", p.errors.length === 0, p.errors);
    await p.close();
  }

  if (only === "all" || only === "fail" || only === "retry") {
    // Easy, with nobody playing, lasts long enough to try the other ways to retry.
    const p = await fresh(b);
    await pick(p, "easy");
    await p.click("[data-start]");
    await untilState(p, "playing", 5000);
    // toolbar Retry during play
    await untilSong(p, 3);
    await p.click("[data-retry-tool]");
    await untilState(p, "playing", 5000);
    const t2 = await songTime(p);
    ok("toolbar Retry restarts the song", t2 < 1, t2);
    // pause then Retry button, then R from pause
    await untilSong(p, 2);
    await p.keyboard.press("Escape");
    ok("Esc pauses", (await st(p)) === "paused");
    await p.keyboard.press("r");
    await untilState(p, "playing", 5000);
    ok("R retries from pause", (await songTime(p)) < 1);
    ok("no console errors (retry)", p.errors.length === 0, p.errors);
    await p.close();
  }

  if (only === "all" || only === "holds") {
    const p = await fresh(b);
    await pick(p, "hard");
    await p.click("[data-start]");
    await untilState(p, "playing", 5000);
    const notes = await p.evaluate(() => window.skwishDrop.notes());
    const holdIdx = notes.map((n, i) => (n[3] ? i : -1)).filter((i) => i >= 0);
    const missIdx = notes.findIndex((n) => !n[3] && n[0] > 3);
    await autoplay(p, { keys: "arrows", early: holdIdx.slice(0, 2), skip: [missIdx] });
    await untilState(p, "results");
    const r = await readResults(p);
    const counts = await p.evaluate(() => window.skwishDrop.counts());
    ok("early release makes NG", counts.ng === 2 && counts.ok === holdIdx.length - 2, counts);
    ok("one miss, no full combo", counts.miss === 1 && !r.fc, { counts, fc: r.fc });
    // speed modifier is saved and shown
    await p.click('[data-screen="results"] [data-quit]');
    await p.select("[data-speed]", "4");
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem("dm-play-settings")));
    ok("speed saved", saved.speed === 4, saved);
    await p.click("[data-start]");
    await untilState(p, "playing", 5000);
    await autoplay(p, { keys: "wasd" });
    await untilSong(p, 9);
    await p.screenshot({ path: `${SHOT}/speed4.png` });
    await p.keyboard.press("Escape");
    await p.click('[data-screen="pause"] [data-quit]');
    ok("no console errors (holds)", p.errors.length === 0, p.errors);
    await p.close();
  }

  if (only === "all" || only === "late") {
    // Pressing 40 ms late every time shows up as average timing, and Nudge fixes it.
    const p = await fresh(b);
    await pick(p, "normal");
    await p.click("[data-start]");
    await untilState(p, "playing", 5000);
    await autoplay(p, { keys: "arrows", late: 40 });
    await untilState(p, "results");
    const r = await readResults(p);
    ok("late presses read as late", /^\+(3[5-9]|4[0-5]) ms late$/.test(r.timing) && /Nudge offset by \+/.test(r.nudge), r);
    await p.click("[data-nudge]");
    const s = await p.evaluate(() => window.skwishDrop.settings());
    ok("nudge moves offset", s.offsetMs >= 35 && s.offsetMs <= 45, s);
    await p.keyboard.press("r");
    await untilState(p, "playing", 5000);
    await autoplay(p, { keys: "arrows", late: 40 });
    await untilState(p, "results");
    const r2 = await readResults(p);
    ok("after nudge the same late presses are on time", r2.grade === "S" && (/On time/.test(r2.timing) || Math.abs(parseInt(r2.timing, 10)) < 6), r2);
    await p.click('[data-screen="results"] [data-quit]');
    await p.click('[data-offset-step="-5"]');
    const s2 = await p.evaluate(() => window.skwishDrop.settings());
    ok("-5 button", s2.offsetMs === s.offsetMs - 5, s2);
    await p.close();
  }

  if (only === "all" || only === "calibrate") {
    const p = await fresh(b);
    await p.click("[data-calibrate]");
    await wait(100);
    ok("calibration screen", (await st(p)) === "calibrating" && (await p.evaluate(() => !document.querySelector('[data-screen="calibrate"]').hidden)));
    await wait(900);
    await p.screenshot({ path: `${SHOT}/calibrate.png` });
    // Tap 32 ms after each click as heard.
    await p.evaluate(() => {
      const S = window.skwishDrop;
      const t0 = S.calibration().t0;
      for (let k = 4; k < 20; k++) {
        const at = t0 + k * 0.5 + 0.032;
        setTimeout(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: k % 2 ? " " : "ArrowUp", bubbles: true })), (at - S.heard()) * 1000);
      }
    });
    await wait(11500);
    const s = await p.evaluate(() => window.skwishDrop.settings());
    const text = await p.evaluate(() => document.querySelector("[data-cal-result]").textContent);
    ok("calibration finds the delay", s.offsetMs >= 27 && s.offsetMs <= 37, { s, text });
    await p.screenshot({ path: `${SHOT}/calibrate-done.png` });
    await p.click("[data-cal-done]");
    ok("back to start, offset shown", (await st(p)) === "start" && (await p.evaluate(() => document.querySelector("[data-offset]").textContent)) === "+" + s.offsetMs + " ms");
    ok("no console errors (calibrate)", p.errors.length === 0, p.errors);
    await p.close();
  }

  if (only === "all" || only === "shots") {
    const p = await fresh(b);
    await p.evaluate(() => document.getElementById("game").scrollIntoView());
    await p.screenshot({ path: `${ART}/skwish-ddr-start.png` });
    await pick(p, "hard");
    await p.click("[data-start]");
    await untilState(p, "playing", 5000);
    await autoplay(p, { keys: "arrows" });
    await untilSong(p, 52 * 60 / 140 * 0 + (36 + 20.6) * 60 / 140);
    await p.screenshot({ path: `${ART}/skwish-ddr-desktop.png` });
    const f = await fps(p, 3000);
    ok("60fps desktop", f.fps >= 55, f);
    await untilState(p, "results");
    await p.screenshot({ path: `${ART}/skwish-ddr-results.png` });
    await p.close();
  }

  if (only === "all" || only === "mobile") {
    const p = await fresh(b, { viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true } });
    await pick(p, "normal");
    await p.tap("[data-start]");
    await untilState(p, "playing", 5000);
    await wait(700);
    const box = await p.evaluate(() => { const r = document.querySelector(".game-canvas").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    const tools = await p.evaluate(() => [...document.querySelectorAll(".game-tool")].map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent, w: r.width, h: r.height, hidden: e.hidden }; }));
    ok("toolbar tap targets 44px", tools.filter((t) => !t.hidden).every((t) => t.h >= 44 && t.w >= 44) && tools.filter((t) => !t.hidden).length === 3, tools);
    // Tap the pads (bottom of each lane) on time, with real touch events.
    const padY = box.y + box.h - Math.max(84, Math.min(120, box.h * 0.16)) / 2;
    const laneX = (l) => box.x + 8 + ((box.w - 16) / 4) * (l + 0.5);
    let tapped = 0;
    const notes = await p.evaluate(() => window.skwishDrop.notes());
    for (let i = 0; i < notes.length && tapped < 24; i++) {
      const n = notes[i];
      const now = await songTime(p);
      if (n[0] < now + 0.03) continue;
      await wait(Math.max(0, (n[0] - now) * 1000 - 18));
      // jumps: two fingers
      const twin = notes[i + 1] && Math.abs(notes[i + 1][0] - n[0]) < 0.001 ? notes[i + 1] : null;
      const a = await p.touchscreen.touchStart(laneX(n[1]), padY);
      let bTouch = null;
      if (twin) bTouch = await p.touchscreen.touchStart(laneX(twin[1]), padY);
      if (tapped === 6) await p.screenshot({ path: `${ART}/skwish-ddr-mobile.png` });
      await wait(30);
      await a.end();
      if (bTouch) { await bTouch.end(); i++; }
      tapped++;
    }
    const counts = await p.evaluate(() => window.skwishDrop.counts());
    const hits = counts.marvelous + counts.perfect + counts.great + counts.good;
    ok("pads hit with touch", hits >= 20 && counts.miss <= 6, counts);
    ok("no console errors (mobile)", p.errors.length === 0, p.errors);
    await p.close();
  }

  if (only === "all" || only === "reduce") {
    const p = await fresh(b, { reduce: true });
    await pick(p, "hard");
    await p.click("[data-start]");
    await untilState(p, "playing", 5000);
    await autoplay(p, { keys: "arrows" });
    await untilSong(p, 40 * 60 / 140);
    await p.screenshot({ path: `${SHOT}/reduce.png` });
    const f = await fps(p, 2000);
    ok("reduced motion runs", f.fps >= 55 && p.errors.length === 0, { f, e: p.errors });
    await p.close();
  }

  await b.close();
  const fails = Object.entries(results).filter(([, v]) => v !== "PASS");
  console.log(fails.length ? "FAILED: " + fails.map(([k]) => k).join(", ") : "ALL PASS");
})();
