#!/usr/bin/env node
// Charts for "Genre Snob" (Dirt Monkey), 140 BPM, beat 1 at 0.000 s.
//
// 1. Splits the mix into kick (< 90 Hz), snare (1.5 to 6 kHz) and bass
//    (120 to 900 Hz) bands with ffmpeg, since there are no stems.
// 2. Runs tools/make-beatmap.js on the mix plus those bands.
// 3. Hand-tunes the result: a note grid and a density cap per section and
//    difficulty, written builds into each drop, a jump (or jump hold) on each
//    drop impact, holds over the breaks, and no fast same-lane repeats.
// 4. Writes the track block into js/beatmap.js.
//
//   node dev/genre_snob_charts.js [path/to/genre-snob.wav]
//
// Needs ffmpeg on PATH (or dev/node_modules after npm install).

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
require("./env.js");
const ChartMaker = require("../js/chart-maker.js");

const ROOT = path.resolve(__dirname, "..");
const WAV = process.argv[2] || path.join(os.homedir(), "DMBuilds", "DMSite-shots", "genre-snob.wav");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "genre-snob-"));
const BPM = 140;
const OFFSET = 0;

// Song map, in bars (1-based, inclusive). Found from the kick and full-mix
// level per bar: every change lands on a bar line with beat 1 at 0 s.
const MAP = [
  { type: "intro", from: 1, to: 12 },
  { type: "break", from: 13, to: 16 },
  { type: "build", from: 17, to: 20 },
  { type: "drop", from: 21, to: 36 },
  { type: "break", from: 37, to: 40 },
  { type: "build", from: 41, to: 44 },
  { type: "drop", from: 45, to: 60 },
  { type: "outro", from: 61, to: 64 }
];

// Finest note spacing in beats, the most notes per bar, and whether jumps are kept.
const RULES = {
  easy: { intro: [2, 2], break: [4, 1], drop: [1, 4], outro: [4, 1], jumps: "none" },
  normal: { intro: [1, 4], break: [2, 2], drop: [0.5, 7], outro: [4, 1], jumps: "phrase" },
  hard: { intro: [0.5, 7], break: [1, 4], drop: [0.25, 11], outro: [4, 1], jumps: "bar" },
  wild: { intro: [0.25, 10], break: [0.5, 6], drop: [0.25, 15], outro: [4, 1], jumps: "beat" }
};

// Bar 20 and bar 44, as heard: hits on 1, a 16th roll through beat 2, a last
// hit on 3, then silence until the drop lands.
const PRE_DROP = {
  easy: [0, 1, 2],
  normal: [0, 1, 1.5, 2],
  hard: [0, 1, 1.25, 1.5, 1.75, 2],
  wild: [0, 0.5, 1, 1.25, 1.5, 1.75, 2]
};

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", WAV, "-ac", "1"].concat(args));
}

function toolBlock() {
  const bands = {
    kick: "lowpass=f=90,lowpass=f=90",
    snare: "highpass=f=1500,lowpass=f=6000,highpass=f=1500",
    bass: "highpass=f=120,lowpass=f=900,highpass=f=120"
  };
  const args = [path.join(ROOT, "tools", "make-beatmap.js"), "--mix", WAV, "--bpm", String(BPM), "--offset", String(OFFSET)];
  for (const name of Object.keys(bands)) {
    const file = path.join(TMP, name + ".wav");
    ffmpeg(["-af", bands[name], file]);
    args.push("--" + name, file);
  }
  const out = path.join(TMP, "block.js");
  args.push("--out", out);
  execFileSync(process.execPath, args, { stdio: ["ignore", "ignore", "inherit"] });
  const text = fs.readFileSync(out, "utf8").replace(/^.*TRACK.*$/gm, "");
  return new Function("return ({" + text + "}).track;")();
}

const barOf = (beat) => Math.floor(beat / 4) + 1;
const sectionOf = (beat) => MAP.find((s) => barOf(beat) >= s.from && barOf(beat) <= s.to);
const on = (beat, step) => Math.abs(beat / step - Math.round(beat / step)) < 1e-6;
const startBeat = (s) => (s.from - 1) * 4;
const endBeat = (s) => s.to * 4;

// Keep notes on the section's grid, apply the jump rule, then cap each bar,
// dropping the off-beat 16ths first, then 8ths.
function shape(notes, rules) {
  const bySlot = new Map();
  for (const n of notes) {
    const sec = sectionOf(n[0]);
    if (!sec || sec.type === "build") continue;
    const kind = sec.type === "intro" ? "intro" : sec.type === "drop" ? "drop" : sec.type === "outro" ? "outro" : "break";
    if (!on(n[0], rules[kind][0])) continue;
    const slot = bySlot.get(n[0]) || [];
    if (slot.some((m) => m[1] === n[1])) continue;
    slot.push(n);
    bySlot.set(n[0], slot);
  }
  const out = [];
  for (const [beat, slot] of bySlot) {
    const sec = sectionOf(beat);
    let jump = false;
    if (sec.type === "drop") {
      if (rules.jumps === "beat") jump = on(beat, 1);
      if (rules.jumps === "bar") jump = on(beat, 4);
      if (rules.jumps === "phrase") jump = on(beat - startBeat(sec), 16);
    }
    out.push.apply(out, slot.slice(0, jump ? 2 : 1));
  }
  out.sort((a, b) => a[0] - b[0]);

  const capped = [];
  for (let bar = 1; bar <= 64; bar++) {
    const sec = sectionOf((bar - 1) * 4);
    let inBar = out.filter((n) => barOf(n[0]) === bar);
    if (sec.type === "build") continue;
    const kind = sec.type === "intro" ? "intro" : sec.type === "drop" ? "drop" : sec.type === "outro" ? "outro" : "break";
    const cap = rules[kind][1];
    if (inBar.length > cap) {
      const rank = (n, i) => (on(n[0], 4) ? 0 : on(n[0], 1) ? 1 : on(n[0], 0.5) ? 2 : 3) + (i % 2) * 0.5;
      inBar = inBar
        .map((n, i) => ({ n, r: rank(n, i) }))
        .sort((x, y) => x.r - y.r)
        .slice(0, cap)
        .map((x) => x.n)
        .sort((x, y) => x[0] - y[0]);
    }
    capped.push.apply(capped, inBar);
  }
  return capped;
}

// The build: speeds up bar by bar, lanes climbing like a riser.
function build(level, sec) {
  const start = startBeat(sec);
  const plan = {
    easy: [1, 1, 1],
    normal: [1, 1, 0.5],
    hard: [0.5, 0.5, 0.25],
    wild: [0.5, 0.25, 0.25]
  }[level];
  const climb = [0, 1, 2, 3, 2, 1];
  const notes = [];
  let i = 0;
  plan.forEach((step, bar) => {
    for (let b = 0; b < 4; b += step) {
      // Hard keeps 8ths for the first half of bar 3, then rolls.
      if (level === "hard" && bar === 2 && b < 2 && !on(b, 0.5)) continue;
      notes.push([start + bar * 4 + b, climb[i++ % climb.length]]);
    }
  });
  PRE_DROP[level].forEach((b, k) => notes.push([start + 12 + b, [3, 2, 1, 0, 1, 2, 3][k % 7]]));
  return notes;
}

function tune(level, notes) {
  let out = shape(notes, RULES[level]);
  for (const sec of MAP.filter((s) => s.type === "build")) out = out.concat(build(level, sec));

  for (const sec of MAP.filter((s) => s.type === "drop")) {
    const hit = startBeat(sec);
    // The impact: nothing else for the first beat, then the groove.
    out = out.filter((n) => n[0] < hit || n[0] >= hit + 1);
    // Keep the outer lanes free until the impact hold lets go.
    out = out.filter((n) => {
      if (n[0] > hit + 1.25 || n[0] < hit + 1 || (n[1] !== 0 && n[1] !== 3)) return true;
      const inner = n[1] === 0 ? 1 : 2;
      if (out.some((m) => m[0] === n[0] && m[1] === inner)) return false;
      n[1] = inner;
      return true;
    });
    if (level === "hard" || level === "wild") out.push([hit, 0, 1], [hit, 3, 1]);
    else out.push([hit, 0], [hit, 3]);
    // Each later 4-bar phrase opens on a jump from Normal up.
    if (level !== "easy") {
      for (let p = hit + 16; p < endBeat(sec); p += 16) {
        const here = out.filter((n) => n[0] === p);
        if (here.length < 2) out = out.filter((n) => n[0] !== p).concat([[p, 0], [p, 3]]);
      }
    }
  }

  // Holds across the breaks on Hard and Wild: one per bar, lanes 1 and 2 in turn.
  if (level === "hard" || level === "wild") {
    for (const sec of MAP.filter((s) => s.type === "break")) {
      for (let bar = sec.from; bar <= sec.to; bar++) {
        const b = (bar - 1) * 4;
        const lane = bar % 2 ? 1 : 2;
        const len = level === "hard" ? 2 : 1.5;
        out = out.filter((n) => !(n[0] >= b && n[0] < b + len + 0.5 && (n[1] === lane || n[0] === b)));
        out.push([b, lane, len]);
      }
    }
  }

  // The last hit, bar 61.
  const last = (MAP[MAP.length - 1].from - 1) * 4;
  out = out.filter((n) => n[0] < last);
  if (level === "hard" || level === "wild") out.push([last, 0, 2], [last, 3, 2]);
  else out.push([last, 0], [last, 3]);

  // Drop the tool's own holds outside the breaks and impacts if anything sits
  // in their lane while held; shorten them otherwise to fit.
  out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  out = out.filter((n, i) => {
    if (!(n[2] > 0)) return true;
    const clash = out.find((m) => m !== n && m[1] === n[1] && m[0] > n[0] && m[0] < n[0] + n[2] + 0.25);
    if (!clash) return true;
    const room = clash[0] - n[0] - 0.5;
    if (room >= 0.5) {
      n[2] = room;
      return true;
    }
    n.length = 2;
    return true;
  });

  // Easy and Normal get their lanes from a shape per bar, so all four arrows
  // get used (the kick alone would only ever be left and right).
  if (level === "easy" || level === "normal") {
    const SHAPES = [[0, 1, 2, 3], [3, 2, 1, 0], [0, 2, 1, 3], [3, 1, 2, 0], [1, 0, 3, 2], [2, 3, 0, 1]];
    for (let bar = 1; bar <= 64; bar++) {
      if (sectionOf((bar - 1) * 4).type === "build") continue;
      const shape = SHAPES[(bar - 1) % SHAPES.length];
      let k = 0;
      out
        .filter((n) => barOf(n[0]) === bar && out.filter((m) => m[0] === n[0]).length === 1)
        .sort((a, b) => a[0] - b[0])
        .forEach((n) => { n[1] = shape[k++ % 4]; });
    }
  }

  // No fast same-lane repeats: move the second note to a free lane nearby.
  const gap = level === "easy" ? 0.5 : level === "normal" ? 0.5 : 0.25;
  for (let i = 0; i < out.length; i++) {
    const n = out[i];
    const prev = out.slice(0, i).reverse().find((m) => m[0] < n[0]);
    if (!prev || n[0] - prev[0] > gap) continue;
    const before = out.filter((m) => m[0] === prev[0]).map((m) => m[1]);
    const same = out.filter((m) => m[0] === n[0] && m !== n).map((m) => m[1]);
    const held = out.filter((m) => m !== n && m[2] > 0 && m[0] < n[0] && m[0] + m[2] >= n[0]).map((m) => m[1]);
    if (!before.includes(n[1]) && !held.includes(n[1])) continue;
    const free = [n[1] ^ 1, 3 - n[1], (n[1] + 2) % 4, 0, 1, 2, 3].find((l) => !before.includes(l) && !same.includes(l) && !held.includes(l));
    if (free !== undefined) n[1] = free;
  }
  // Notes that land in a held lane go.
  out = out.filter((n) => !out.some((h) => h !== n && h[2] > 0 && h[1] === n[1] && n[0] > h[0] && n[0] <= h[0] + h[2]));

  const seen = new Set();
  out = out.filter((n) => {
    const k = n[0] + ":" + n[1];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  out.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return out.map((n) => (n[2] > 0 ? [n[0], n[1], n[2]] : [n[0], n[1]]));
}

function main() {
  const made = toolBlock();
  const charts = {};
  for (const level of ChartMaker.ORDER) charts[level] = tune(level, made.charts[level]);

  const seconds = (MAP[MAP.length - 1].to * 4 * 60) / BPM;
  for (const level of ChartMaker.ORDER) {
    const c = charts[level];
    const holds = c.filter((n) => n.length > 2).length;
    const drop = c.filter((n) => sectionOf(n[0]).type === "drop").length / ((32 * 4 * 60) / BPM);
    console.error(level.padEnd(9) + c.length + " notes, " + holds + " holds, " + (c.length / seconds).toFixed(1) + "/s overall, " + drop.toFixed(1) + "/s in the drops");
  }

  const result = {
    bpm: BPM,
    offset: OFFSET,
    source: "mix and band-split stems, then hand-tuned (dev/genre_snob_charts.js)",
    sections: MAP.map((s) => ({ type: s.type, bars: s.to - s.from + 1 })),
    charts
  };
  const block = ChartMaker.trackBlock(result, {
    title: "Genre Snob",
    audio: "/assets/audio/genre-snob.m4a",
    credit: "Music by Dirt Monkey",
    from: path.basename(WAV)
  });
  const file = path.join(ROOT, "js", "beatmap.js");
  fs.writeFileSync(file, ChartMaker.spliceBeatmap(fs.readFileSync(file, "utf8"), block));
  console.error("Wrote the Genre Snob track into js/beatmap.js.");
  fs.rmSync(TMP, { recursive: true, force: true });
}

main();
