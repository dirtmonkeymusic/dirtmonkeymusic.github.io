// Web sizes of the Genre Snob cover art for /play/, from DIRT's full-res layers.
// node make_play_art.js [art folder]   (default ~/DMBuilds/DMSite-shots/art)
//
// Only scales, crops, and re-encodes the art. Nothing is redrawn or recolored.
// Writes assets/play/genre-snob/:
//   cover-280.webp, cover-560.webp, cover-280.jpg   the cover, for the start screen
//   title-560.webp                                  the GENRE SNOB lettering
//   logo-320.webp                                   the gold DIRT MONKEY lettering
//   skwish-640.webp                                 the skull monkey, the dancer in the game
//   backdrop-384.webp                               the gold spotlight behind the cover
//   coins-160.webp                                  coin sprites in one strip, 160 px cells:
//                                                   5 coins cut from coins.png, then the 19K coin
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { ROOT } = require("./env");

const ART = process.argv[2] || path.join(os.homedir(), "DMBuilds", "DMSite-shots", "art");
const OUT = path.join(ROOT, "assets", "play", "genre-snob");
const LOCAL_FF = path.join(__dirname, "node_modules", "ffmpeg-static", "ffmpeg");
const FF = fs.existsSync(LOCAL_FF) ? LOCAL_FF : "ffmpeg";
const CELL = 160;
fs.mkdirSync(OUT, { recursive: true });

const src = (name) => path.join(ART, name);
const out = (name) => path.join(OUT, name);
function ff(args) {
  execFileSync(FF, ["-v", "error", "-y", ...args], { stdio: "inherit" });
}
const webp = (q, alpha) => ["-c:v", "libwebp", "-q:v", String(q), "-compression_level", "6", "-pix_fmt", alpha ? "yuva420p" : "yuv420p", "-frames:v", "1"];

// Finds each separate coin in the coins layer by its alpha, on a quarter-size copy.
function findCoins() {
  const W = 886;
  const raw = execFileSync(FF, ["-v", "error", "-i", src("coins.png"), "-vf", "scale=" + W + ":-1:flags=area", "-f", "rawvideo", "-pix_fmt", "rgba", "-"], { maxBuffer: 1 << 28 });
  const H = raw.length / 4 / W;
  const k = 3543 / W;
  const seen = new Uint8Array(W * H);
  const found = [];
  for (let i = 0; i < W * H; i++) {
    if (seen[i] || raw[i * 4 + 3] < 24) continue;
    const stack = [i];
    seen[i] = 1;
    let x0 = W, y0 = H, x1 = 0, y1 = 0, n = 0;
    while (stack.length) {
      const j = stack.pop();
      const x = j % W, y = (j / W) | 0;
      n++;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const nb of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, j - W, j + W]) {
        if (nb < 0 || nb >= W * H || seen[nb] || raw[nb * 4 + 3] < 24) continue;
        seen[nb] = 1;
        stack.push(nb);
      }
    }
    // Coins cut off by the edge of the art are skipped.
    const whole = x0 > 0 && y0 > 0 && x1 < W - 1 && y1 < H - 1;
    if (n > 200 && whole) found.push({ n, x: Math.max(0, Math.floor((x0 - 2) * k)), y: Math.max(0, Math.floor((y0 - 2) * k)), w: Math.ceil((x1 - x0 + 5) * k), h: Math.ceil((y1 - y0 + 5) * k) });
  }
  // Biggest (face-on) first.
  return found.sort((a, b) => b.n - a.n);
}

ff(["-i", src("cover.jpg"), "-vf", "scale=560:560:flags=lanczos", ...webp(78, false), out("cover-560.webp")]);
ff(["-i", src("cover.jpg"), "-vf", "scale=280:280:flags=lanczos", ...webp(80, false), out("cover-280.webp")]);
ff(["-i", src("cover.jpg"), "-vf", "scale=280:280:flags=lanczos", "-q:v", "5", "-frames:v", "1", out("cover-280.jpg")]);
ff(["-i", src("title-genre-snob.png"), "-vf", "scale=560:-1:flags=lanczos", ...webp(85, true), out("title-560.webp")]);
ff(["-i", src("logo-dirt-monkey.png"), "-vf", "scale=320:-1:flags=lanczos", ...webp(85, true), out("logo-320.webp")]);
ff(["-i", src("skwish-skull-monkey.png"), "-vf", "scale=640:-1:flags=lanczos", ...webp(82, true), out("skwish-640.webp")]);
ff(["-i", src("background.png"), "-vf", "scale=384:384:flags=area", ...webp(80, false), out("backdrop-384.webp")]);

const coins = findCoins();
console.log("coins found:", coins.map((c) => c.w + "x" + c.h + "@" + c.x + "," + c.y).join("  "));
const inputs = [];
const chains = [];
coins.forEach((c, i) => {
  inputs.push("-i", src("coins.png"));
  chains.push("[" + i + ":v]crop=" + c.w + ":" + c.h + ":" + c.x + ":" + c.y + ",scale=" + CELL + ":" + CELL + ":force_original_aspect_ratio=decrease:flags=lanczos,format=rgba,pad=" + CELL + ":" + CELL + ":(ow-iw)/2:(oh-ih)/2:color=0x00000000[c" + i + "]");
});
const n19 = coins.length;
inputs.push("-i", src("19k-coin.png"));
chains.push("[" + n19 + ":v]scale=" + (CELL - 8) + ":" + (CELL - 8) + ":flags=lanczos,format=rgba,pad=" + CELL + ":" + CELL + ":4:4:color=0x00000000[c" + n19 + "]");
const labels = coins.map((c, i) => "[c" + i + "]").join("") + "[c" + n19 + "]";
chains.push(labels + "hstack=inputs=" + (n19 + 1) + "[strip]");
ff([...inputs, "-filter_complex", chains.join(";"), "-map", "[strip]", ...webp(82, true), out("coins-160.webp")]);

for (const f of fs.readdirSync(OUT).sort()) {
  console.log(f.padEnd(20), (fs.statSync(out(f)).size / 1024).toFixed(1) + " KB");
}
console.log("coin cells:", n19 + 1, "(the last is the 19K coin)");
