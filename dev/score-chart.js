// Compare a chart from tools/make-beatmap.js against the test track's ground truth.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { ROOT, SHOT, AUDIO } = require("./env");
const dir = AUDIO;
const block = path.join(SHOT, "block.js");
const truth = JSON.parse(fs.readFileSync(dir + "/truth.json"));
const ChartMaker = require(path.join(ROOT, "js/chart-maker.js"));

function run(args) {
  const out = execFileSync(process.execPath, [path.join(ROOT, "tools/make-beatmap.js"), ...args, "--out", block], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const text = fs.readFileSync(block, "utf8");
  const obj = eval("({" + text.replace(/\/\/.*$/gm, "") + "})").track;
  return obj;
}

function score(name, args, expect) {
  const t0 = Date.now();
  const tr = run(args);
  const ms = Date.now() - t0;
  const want = new Set();
  // with the guessed offset possibly a bar earlier/later, shift truth to the chart's beat 0
  const shiftBeats = Math.round(((truth.offset - tr.offset) / (60 / tr.bpm)));
  (expect || ["kick", "snare"]).forEach((k) => truth[k].forEach((b) => want.add((b + shiftBeats).toFixed(3))));
  const got = new Set(tr.charts.hard.map((n) => Number(n[0]).toFixed(3)));
  let hit = 0; want.forEach((b) => { if (got.has(b)) hit++; });
  let extra = 0; got.forEach((b) => { if (!want.has(b)) extra++; });
  const drops = []; let bar = 0; tr.sections.forEach((s) => { if (s.type === "drop") drops.push([bar, bar + s.bars]); bar += s.bars; });
  console.log(name.padEnd(28), "bpm", tr.bpm, "offset", tr.offset, "shift", shiftBeats, "charts", Object.keys(tr.charts).map((k) => k + ":" + tr.charts[k].length + "/" + tr.charts[k].filter((n) => n.length > 2).length + "h").join(" "),
    "recall", (hit / want.size * 100).toFixed(1) + "%", "extra beats", extra, "drops", JSON.stringify(drops), "truth", JSON.stringify(truth.drops.map(([a, b]) => [a + shiftBeats / 4, b + shiftBeats / 4])), ms + "ms");
}

score("stems + bpm + offset", ["--kick", dir + "/kick.wav", "--snare", dir + "/snare.wav", "--bass", dir + "/bass.wav", "--mix", dir + "/mix.wav", "--bpm", "145", "--offset", "0.37"]);
score("stems, all guessed", ["--kick", dir + "/kick.wav", "--snare", dir + "/snare.wav", "--bass", dir + "/bass.wav", "--mix", dir + "/mix.wav"]);
score("stems only (no mix)", ["--kick", dir + "/kick.wav", "--snare", dir + "/snare.wav", "--bass", dir + "/bass.wav"]);
score("mix wav, guessed", ["--mix", dir + "/mix.wav"]);
score("mix mp3, bpm given", ["--mix", dir + "/mix.mp3", "--bpm", "145"]);

