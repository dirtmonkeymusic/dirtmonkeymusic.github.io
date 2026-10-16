#!/usr/bin/env node
// Make the Skwish Drop beatmap from a track and its stems.
//
// The site does not need this to run. Use it when a new track arrives.
// Nothing to install except Node. WAV files work as they are. MP3 and
// other formats need ffmpeg (https://ffmpeg.org). The beatmap maker page
// at /tools/beatmap/ does the same job in a browser, with no install at all.
//
//   node tools/make-beatmap.js --mix song.wav --bpm 145
//   node tools/make-beatmap.js --mix song.mp3 --kick kick.wav --snare snare.wav --bass bass.wav --bpm 145 --write
//
// Options:
//   --mix FILE         the full track (gives the drops and the length)
//   --kick, --snare, --bass, --hats FILE
//                      stems, exported from the same session so they line up
//                      with the mix. Each one you add makes the notes cleaner.
//   --bpm N            the tempo. Leave it out to have it guessed.
//   --offset S         seconds from the start of the file to beat 1 of bar 1.
//                      Leave it out to have it guessed.
//   --audio PATH       what the game loads, default /assets/audio/<mix file name>
//   --credit TEXT      the line under the Start button, default "Music by Dirt Monkey"
//   --write            put the result into js/beatmap.js (between the TRACK lines)
//   --out FILE         save the track block to a file instead of printing it

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const ChartMaker = require("../js/chart-maker.js");

const ROLES = ["mix", "kick", "snare", "bass", "hats"];

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) fail("Not sure what " + a + " is. Options start with --.");
    const key = a.slice(2);
    if (key === "write" || key === "help") opts[key] = true;
    else {
      const v = argv[++i];
      if (v === undefined) fail("--" + key + " needs a value.");
      opts[key] = v;
    }
  }
  return opts;
}

function fail(msg) {
  console.error("make-beatmap: " + msg);
  process.exit(1);
}

// WAV: 8, 16, 24, 32-bit PCM and 32/64-bit float. Returns mono at the file's rate.
function readWav(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return null;
  let pos = 12;
  let fmt = null;
  let data = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    let size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === "fmt ") {
      let format = buf.readUInt16LE(body);
      if (format === 0xfffe && size >= 26) format = buf.readUInt16LE(body + 24);
      fmt = {
        format,
        channels: buf.readUInt16LE(body + 2),
        rate: buf.readUInt32LE(body + 4),
        bits: buf.readUInt16LE(body + 14)
      };
    } else if (id === "data") {
      if (size === 0 || body + size > buf.length) size = buf.length - body;
      data = { start: body, size };
    }
    pos = body + size + (size % 2);
  }
  if (!fmt || !data) throw new Error("this WAV file has no audio in it");
  const bytes = fmt.bits / 8;
  const frames = Math.floor(data.size / (bytes * fmt.channels));
  const out = new Float32Array(frames);
  const read = sampleReader(buf, fmt);
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let c = 0; c < fmt.channels; c++) s += read(data.start + (i * fmt.channels + c) * bytes);
    out[i] = s / fmt.channels;
  }
  return { sampleRate: fmt.rate, samples: out };
}

function sampleReader(buf, fmt) {
  if (fmt.format === 3 && fmt.bits === 32) return (o) => buf.readFloatLE(o);
  if (fmt.format === 3 && fmt.bits === 64) return (o) => buf.readDoubleLE(o);
  if (fmt.format !== 1) throw new Error("WAV format " + fmt.format + " is not supported. Export as PCM or float, or use ffmpeg.");
  if (fmt.bits === 8) return (o) => (buf[o] - 128) / 128;
  if (fmt.bits === 16) return (o) => buf.readInt16LE(o) / 32768;
  if (fmt.bits === 24) return (o) => buf.readIntLE(o, 3) / 8388608;
  if (fmt.bits === 32) return (o) => buf.readInt32LE(o) / 2147483648;
  throw new Error(fmt.bits + "-bit WAV is not supported");
}

function readWithFfmpeg(file) {
  const rate = 44100;
  let raw;
  try {
    raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "f32le", "-ac", "1", "-ar", String(rate), "-"], { maxBuffer: 1 << 30 });
  } catch (e) {
    if (e.code === "ENOENT") throw new Error("this is not a WAV file, and ffmpeg is not installed to read it. Export a WAV, or install ffmpeg.");
    throw new Error("ffmpeg could not read it");
  }
  const samples = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
  return { sampleRate: rate, samples: Float32Array.from(samples) };
}

function readAudio(file) {
  const buf = fs.readFileSync(file);
  return readWav(buf) || readWithFfmpeg(file);
}

function resample(audio, rate) {
  if (audio.sampleRate === rate) return audio.samples;
  const ratio = audio.sampleRate / rate;
  const n = Math.floor(audio.samples.length / ratio);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i * ratio;
    const j = Math.floor(x);
    const f = x - j;
    out[i] = audio.samples[j] * (1 - f) + (audio.samples[j + 1] || 0) * f;
  }
  return out;
}

function readCurrentTrack(file) {
  try {
    return new Function(fs.readFileSync(file, "utf8") + "\nreturn BEATMAP;")().track || {};
  } catch (e) {
    return {};
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !ROLES.some((r) => opts[r])) {
    const head = fs.readFileSync(__filename, "utf8").split("\n").slice(1, 28).map((l) => l.replace(/^\/\/ ?/, ""));
    console.log(head.join("\n"));
    process.exit(opts.help ? 0 : 1);
  }

  const loaded = {};
  for (const role of ROLES) {
    if (!opts[role]) continue;
    if (!fs.existsSync(opts[role])) fail("cannot find " + opts[role]);
    try {
      loaded[role] = readAudio(opts[role]);
    } catch (e) {
      fail(opts[role] + ": " + e.message);
    }
    const a = loaded[role];
    console.error("read " + role + ": " + path.basename(opts[role]) + ", " + (a.samples.length / a.sampleRate).toFixed(1) + " s");
  }
  const rate = (loaded.mix || loaded[Object.keys(loaded)[0]]).sampleRate;
  const stems = {};
  for (const role of ROLES.slice(1)) if (loaded[role]) stems[role] = resample(loaded[role], rate);

  let result;
  try {
    result = ChartMaker.analyze({
      sampleRate: rate,
      mix: loaded.mix ? resample(loaded.mix, rate) : null,
      stems,
      bpm: opts.bpm,
      offset: opts.offset
    });
  } catch (e) {
    fail(e.message);
  }

  const beatmapFile = path.join(__dirname, "..", "js", "beatmap.js");
  const current = readCurrentTrack(beatmapFile);
  const audio = opts.audio || (opts.mix ? "/assets/audio/" + path.basename(opts.mix) : current.audio || "");
  const from = ROLES.filter((r) => opts[r]).map((r) => path.basename(opts[r])).join(", ");
  const block = ChartMaker.trackBlock(result, { audio, credit: opts.credit || current.credit, from });

  const drops = [];
  let bar = 0;
  result.sections.forEach((s) => {
    if (s.type === "drop") drops.push("bars " + (bar + 1) + " to " + (bar + s.bars));
    bar += s.bars;
  });
  console.error("");
  console.error("BPM:    " + result.bpm + (opts.bpm ? "  (it sounds like " + result.bpmGuess + ")" : "  (guessed)"));
  console.error("offset: " + result.offset + " s" + (opts.offset !== undefined ? "  (it sounds like " + result.offsetGuess + ")" : "  (guessed)"));
  console.error("length: " + result.duration + " s, " + bar + " bars");
  console.error("notes:  " + ChartMaker.ORDER.map((d) => {
    const c = result.charts[d];
    const holds = c.filter((n) => n.length > 2).length;
    return d + " " + c.length + (holds ? " (" + holds + " holds)" : "");
  }).join(", "));
  console.error("drops:  " + (drops.join(", ") || "none found"));
  if (opts.bpm && result.bpmGuess && Math.abs(result.bpmGuess - Number(opts.bpm)) > 0.1) {
    console.error("\nHeads up: the BPM you gave and the one it hears are different. Check the tempo in the session.");
  }
  if (!audio) console.error("\nNo --mix, so set audio in js/beatmap.js to the track's address by hand.");
  console.error("");

  if (opts.write) {
    fs.writeFileSync(beatmapFile, ChartMaker.spliceBeatmap(fs.readFileSync(beatmapFile, "utf8"), block));
    console.error("Wrote the track into js/beatmap.js. Put the track file at " + (audio || "the audio address") + " and open /play/.");
  } else if (opts.out) {
    fs.writeFileSync(opts.out, block + "\n");
    console.error("Saved the track block to " + opts.out + ". Paste it over the TRACK part of js/beatmap.js.");
  } else {
    console.log(block);
  }
}

main();
