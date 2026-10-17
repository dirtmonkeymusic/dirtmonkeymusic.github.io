// Plays Skwish Pong headless against a simple "casual player" bot and reports the win rate.
// node pong-sim.js [games=50] [path to pong.js] [bot=casual|sloppy|sharp]
// The bot follows Skwish with the mouse like a person would: it reacts a beat late,
// misjudges where to stand a little each rally, and drifts to the middle when Skwish goes away.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const GAMES = +(process.argv[2] || 50);
const FILE = process.argv[3] || path.join(__dirname, "..", "js", "pong.js");
const BOT = process.argv[4] || "casual";
const BOTS = {
  sharp: { lag: 0.15, noise: 0.15 },
  casual: { lag: 0.22, noise: 0.3 },
  sloppy: { lag: 0.3, noise: 0.45 }
};
const bot = BOTS[BOT];
const src = fs.readFileSync(FILE, "utf8");
const W = 960, H = 480, FPS = 60;

function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function playOne() {
  const handlers = new Map();
  const el = (name) => {
    const e = {
      name, hidden: true, textContent: "", style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      complete: true, naturalWidth: 512, width: 0, height: 0,
      addEventListener(t, f) { handlers.set(name + ":" + t, f); }, removeEventListener() {},
      querySelector(q) { return els[q] || el(q); }, querySelectorAll() { return []; },
      getBoundingClientRect() { return { left: 0, top: 0, width: W, height: H }; },
      getContext() { return new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } }); },
      setPointerCapture() {}, focus() {}, contains() { return false; }, setAttribute() {}, closest() { return null; }
    };
    return e;
  };
  const els = {};
  const box = el("box");
  for (const q of ["canvas", ".pong-skwish img", "[data-pong-start]", "[data-pong-close]", "[data-pong-score]", "[data-pong-you]", "[data-pong-cpu]", "[data-pong-msg]", "[data-pong-help]", "[data-pong-win]", "[data-dub-player]"]) els[q] = el(q);
  els["[data-pong-win]"] = null; // no win player in the sim
  box.querySelector = (q) => (q in els ? els[q] : el(q));
  let now = 0;
  const raf = [];
  const ctx = {
    document: { querySelector: (q) => (q === "[data-pong]" ? box : null), createElement: () => el("c"), addEventListener() {}, readyState: "complete", hidden: false, activeElement: null },
    window: { matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {}, devicePixelRatio: 1 },
    performance: { now: () => now },
    requestAnimationFrame: (f) => raf.push(f),
    localStorage: { getItem() { return null; }, setItem() {} },
    Math, setInterval() { return 0; }, clearInterval() {}, console
  };
  ctx.window.document = ctx.document;
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const game = ctx.window.skwishPong;
  handlers.get("[data-pong-start]:click")();
  const move = handlers.get("canvas:pointermove");
  const hist = [];
  let aimErr = 0, lastDir = 0, aim = H / 2;
  const padH = H * 0.24;
  for (let f = 0; f < FPS * 600; f++) {
    now += 1000 / FPS;
    const st = game.state();
    if (st.mode === "over") return { won: st.score[0] > st.score[1], score: st.score, secs: f / FPS };
    hist.push({ y: st.ball.y, x: st.ball.x });
    const seen = hist[Math.max(0, hist.length - 1 - Math.round(bot.lag * FPS))];
    const prev = hist[Math.max(0, hist.length - 2 - Math.round(bot.lag * FPS))];
    const dir = Math.sign(seen.x - prev.x);
    if (dir !== lastDir) { aimErr = gauss() * padH * bot.noise; lastDir = dir; }
    const goal = dir < 0 ? seen.y + aimErr : H / 2;
    aim += (goal - aim) * 0.25; // a hand on a mouse, not a teleport
    move({ clientX: 100, clientY: aim, pointerType: "mouse", buttons: 0 });
    const q = raf.splice(0);
    q.forEach((fn) => fn(now));
  }
  return { won: false, score: game.state().score, secs: 600, timeout: true };
}

let wins = 0, total = 0, pts = [0, 0], secs = 0;
for (let i = 0; i < GAMES; i++) {
  const r = playOne();
  total++; if (r.won) wins++;
  pts[0] += r.score[0]; pts[1] += r.score[1]; secs += r.secs;
}
console.log(JSON.stringify({ file: path.basename(FILE), bot: BOT, games: total, wins, winRate: Math.round(wins / total * 100) + "%", avgPoints: [+(pts[0] / total).toFixed(2), +(pts[1] / total).toFixed(2)], avgGameSecs: +(secs / total).toFixed(1) }));
