const puppeteer = require("puppeteer-core");
const BASE = process.env.BASE || "http://127.0.0.1:47321";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const which = process.argv[2] || "all";

async function open(b, q) {
  const p = await b.newPage();
  p.errors = []; p.logs = []; p.reqs = [];
  p.on("console", (m) => { (m.type() === "error" ? p.errors : p.logs).push(m.type() + ": " + m.text()); });
  p.on("pageerror", (e) => p.errors.push("PAGEERROR " + e.message));
  p.on("request", (r) => p.reqs.push(r.url().replace(BASE, "")));
  await p.setViewport({ width: 1280, height: 860 });
  await p.goto(BASE + "/play/?debug" + q, { waitUntil: "networkidle0" });
  return p;
}

async function startAndWait(p) {
  const t0 = Date.now();
  await p.click("[data-start]");
  for (;;) {
    const s = await p.evaluate(() => window.skwishDrop.state());
    if (s === "playing") break;
    if (Date.now() - t0 > 20000) throw new Error("never started");
    await wait(50);
  }
  return Date.now() - t0;
}

async function autoplay(p, opts = {}) {
  await p.evaluate((opts) => {
    const S = window.skwishDrop;
    const sets = { arrows: ["ArrowLeft", "ArrowDown", "ArrowUp", "ArrowRight"], wasd: ["a", "s", "w", "d"] };
    const keys = sets[opts.keys || "arrows"];
    const skip = new Set(opts.skip || []);
    const early = new Set(opts.early || []);
    const late = (opts.late || 0) / 1000;
    const queued = new Set();
    function key(type, k) { document.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true })); }
    function tick() {
      const s = S.state();
      if (s === "results" || s === "start") return;
      if (s === "playing") {
        const t = S.songTime();
        S.notes().forEach((n, i) => {
          if (queued.has(i) || skip.has(i) || n[0] + late - t > 0.06) return;
          queued.add(i);
          const k = keys[n[1]];
          setTimeout(() => {
            key("keydown", k);
            const upAt = n[3] ? (early.has(i) ? (n[0] + n[3]) / 2 : n[3] + 0.03) : null;
            const delay = upAt ? Math.max(30, (upAt - S.songTime()) * 1000) : 40;
            setTimeout(() => key("keyup", k), delay);
          }, Math.max(0, (n[0] + late - S.songTime()) * 1000));
        });
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, opts);
}

(async () => {
  const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"] });
  const out = {};

  if (which === "all" || which === "auto") {
    const p = await open(b, "&audio=/tmp-audio/mix.mp3&bpm=145");
    out.autoCredit = await p.$eval("[data-credit]", (e) => e.textContent);
    out.autoLoadMs = await startAndWait(p);
    out.autoSong = await p.evaluate(() => window.skwishDrop.song());
    await autoplay(p);
    await wait(2500);
    // While playing, read where the music is against the note times.
    for (;;) { if ((await p.evaluate(() => window.skwishDrop.state())) === "results") break; await wait(1000); }
    out.autoResults = await p.evaluate(() => [...document.querySelectorAll("[data-r]")].map((e) => e.dataset.r + "=" + e.textContent).join(" "));
    out.autoBestKeys = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("dm-play-best")));
    out.autoMakerLoaded = p.reqs.some((r) => r.includes("chart-maker.js"));
    out.autoLogs = p.logs.filter((l) => l.includes("Skwish"));
    out.autoErrors = p.errors;
    await p.close();
  }

  if (which === "all" || which === "guess") {
    const p = await open(b, "&audio=/tmp-audio/b146/mix.mp3");
    await startAndWait(p);
    out.guessSong = await p.evaluate(() => window.skwishDrop.song());
    out.guessErrors = p.errors;
    await p.close();
  }

  if (which === "all" || which === "broken") {
    const p = await open(b, "&audio=/tmp-audio/nope.mp3&bpm=145");
    await startAndWait(p);
    out.brokenSong = await p.evaluate(() => window.skwishDrop.song());
    out.brokenCredit = await p.$eval("[data-credit]", (e) => e.textContent);
    out.brokenWarn = p.logs.filter((l) => l.startsWith("warn"));
    await p.close();
  }

  if (which === "all" || which === "placeholder") {
    const p = await open(b, "");
    out.phCredit = await p.$eval("[data-credit]", (e) => e.textContent);
    await startAndWait(p);
    out.phSong = await p.evaluate(() => window.skwishDrop.song());
    await autoplay(p);
    await wait(6000);
    out.phEarly = await p.evaluate(() => window.skwishDrop.notes().slice(0, 10).map((n) => n[2]).join(","));
    out.phMaker = p.reqs.some((r) => r.includes("chart-maker.js"));
    out.phErrors = p.errors;
    await p.close();
  }

  if (which === "written") {
    const p = await open(b, "");
    out.wCredit = await p.$eval("[data-credit]", (e) => e.textContent);
    await startAndWait(p);
    out.wSong = await p.evaluate(() => window.skwishDrop.song());
    await autoplay(p);
    await wait(20000);
    out.wEarly = await p.evaluate(() => { const n = window.skwishDrop.notes(); const r = n.filter((x) => x[2]); return r.length + " judged, " + r.filter((x) => x[2] === "marvelous" || x[2] === "perfect").length + " marvelous or perfect, " + r.filter((x) => x[2] === "miss").length + " miss"; });
    out.wMaker = p.reqs.some((r) => r.includes("chart-maker.js"));
    out.wErrors = p.errors;
    await p.close();
  }

  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
