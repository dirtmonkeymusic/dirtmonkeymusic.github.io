// Turns a track, and its stems if there are any, into notes for Skwish Drop.
//
// Three things use this file:
//   tools/beatmap/          the beatmap maker page (runs in the browser)
//   tools/make-beatmap.js   the same thing from a terminal
//   js/rhythm.js            the game, when js/beatmap.js has a track but no charts
//
// How it works: find the hits (onsets) in each stem, or in the low, mid,
// and high bands of the full track, snap them to the beat grid from the
// BPM and offset, then give each kind of hit its own lanes. The loudest
// stretches of bars become the drops.

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ChartMaker = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var LANES = 4;

  // Lanes are 0 left, 1 down, 2 up, 3 right. Where each kind of hit lands,
  // and which one wins when there are too many at once.
  var VOICES = {
    kick: { lanes: [0, 3], rank: 0 },
    snare: { lanes: [2, 1], rank: 1 },
    bass: { lanes: [1, 2, 3, 0], rank: 2 },
    hats: { lanes: [3, 0, 2, 1], rank: 3 }
  };

  // voices: which hits become arrows, and the smallest gap between them in beats
  //   (1 is quarter notes, 0.5 is 8ths, 0.25 is 16ths).
  // jumps: two arrows at once ("some" means only on kick plus snare, or on beat 1).
  // holds: long kick and bass notes become hold arrows.
  var LEVELS = {
    easy: { voices: { kick: 1, snare: 1 }, jumps: "none", holds: false },
    normal: { voices: { kick: 0.5, snare: 0.5, bass: 1 }, jumps: "some", holds: false },
    hard: { voices: { kick: 0.25, snare: 0.25, bass: 0.5 }, jumps: "some", holds: true },
    skwished: { voices: { kick: 0.25, snare: 0.25, bass: 0.25, hats: 0.5 }, jumps: "all", holds: true }
  };
  var ORDER = ["easy", "normal", "hard", "skwished"];

  var FRAME_RATE = 200;
  var ANALYSIS_RATE = 22050;

  // ---------- signal helpers

  function toMono(channels) {
    if (!channels || !channels.length) return new Float32Array(0);
    if (channels.length === 1) return channels[0];
    var n = channels[0].length;
    var out = new Float32Array(n);
    for (var c = 0; c < channels.length; c++) {
      var ch = channels[c];
      for (var i = 0; i < n; i++) out[i] += ch[i];
    }
    for (var j = 0; j < n; j++) out[j] /= channels.length;
    return out;
  }

  function downsample(x, sr) {
    var step = Math.max(1, Math.floor(sr / ANALYSIS_RATE));
    if (step === 1) return { x: x, sr: sr };
    var n = Math.floor(x.length / step);
    var out = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var s = 0;
      for (var k = 0; k < step; k++) s += x[i * step + k];
      out[i] = s / step;
    }
    return { x: out, sr: sr / step };
  }

  function biquad(x, sr, type, freq, q) {
    var w = (2 * Math.PI * Math.min(freq, sr * 0.45)) / sr;
    var cos = Math.cos(w);
    var alpha = Math.sin(w) / (2 * q);
    var b0, b1, b2;
    if (type === "lowpass") {
      b1 = 1 - cos;
      b0 = b2 = b1 / 2;
    } else if (type === "highpass") {
      b1 = -(1 + cos);
      b0 = b2 = (1 + cos) / 2;
    } else {
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
    }
    var a0 = 1 + alpha;
    var a1 = (-2 * cos) / a0;
    var a2 = (1 - alpha) / a0;
    b0 /= a0;
    b1 /= a0;
    b2 /= a0;
    var y = new Float32Array(x.length);
    var x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (var i = 0; i < x.length; i++) {
      var v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1;
      x1 = x[i];
      y2 = y1;
      y1 = v;
      y[i] = v;
    }
    return y;
  }

  function aboveSub(x, sr) {
    return biquad(biquad(x, sr, "highpass", 150, 0.71), sr, "highpass", 150, 0.71);
  }

  function percentile(arr, p) {
    if (!arr.length) return 0;
    var step = Math.max(1, Math.floor(arr.length / 20000));
    var copy = [];
    for (var i = 0; i < arr.length; i += step) copy.push(arr[i]);
    copy.sort(function (a, b) { return a - b; });
    return copy[Math.min(copy.length - 1, Math.floor(p * copy.length))];
  }

  // Energy in short frames (5 ms apart).
  function energy(x, sr) {
    var hop = Math.max(1, Math.round(sr / FRAME_RATE));
    var win = hop * 2;
    var n = Math.max(0, Math.floor((x.length - win) / hop) + 1);
    var e = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var s = 0;
      var start = i * hop;
      for (var k = 0; k < win; k++) {
        var v = x[start + k];
        s += v * v;
      }
      e[i] = s / win;
    }
    return { e: e, hop: hop / sr };
  }

  // Hits: frames where the (log) energy jumps up more than the music around it.
  function onsets(x, sr) {
    var en = energy(x, sr);
    var e = en.e;
    var n = e.length;
    var ref = percentile(e, 0.99) || 1e-12;
    var c = new Float32Array(n);
    for (var i = 0; i < n; i++) c[i] = Math.log(1 + (1000 * e[i]) / ref);
    var d = new Float32Array(n);
    for (var j = 2; j < n; j++) d[j] = Math.max(0, c[j] - c[j - 2]);

    var floor = percentile(d, 0.995) * 0.12;
    var sum = new Float64Array(n + 1);
    for (var s = 0; s < n; s++) sum[s + 1] = sum[s] + d[s];
    var W = Math.round(0.2 / en.hop);
    var R = Math.round(0.03 / en.hop);
    var out = [];
    for (var f = 2; f < n; f++) {
      var v = d[f];
      if (v < floor || v <= 0) continue;
      var peak = true;
      for (var r = Math.max(0, f - R); r <= Math.min(n - 1, f + R); r++) {
        if (d[r] > v || (d[r] === v && r < f)) {
          peak = false;
          break;
        }
      }
      if (!peak) continue;
      var lo = Math.max(0, f - W);
      var hi = Math.min(n, f + W + 1);
      var mean = (sum[hi] - sum[lo]) / (hi - lo);
      if (v < mean * 1.5) continue;
      // How long the hit rings before it falls to a quarter of its loudest.
      var top = 0;
      for (var p = f; p < Math.min(n, f + R); p++) top = Math.max(top, e[p]);
      var end = f + R;
      while (end < n && e[end] >= top * 0.25) end++;
      out.push({ t: f * en.hop, w: v * Math.sqrt(e[f] / ref), sus: (end - f) * en.hop });
    }
    return { list: out, frames: en };
  }

  // ---------- tempo and offset

  function coherence(list, period) {
    var re = 0, im = 0;
    var k = (2 * Math.PI) / period;
    for (var i = 0; i < list.length; i++) {
      var a = list[i].t * k;
      re += list[i].w * Math.cos(a);
      im += list[i].w * Math.sin(a);
    }
    return { mag: Math.sqrt(re * re + im * im), phase: Math.atan2(im, re) };
  }

  // How well the hits sit on the 16th-note grid of a tempo. A pattern that repeats
  // every bar also fits 3 or 5 beats to the bar on quarter notes, but only the
  // real tempo puts every hit on its 16ths.
  function gridFit(list, period) {
    return coherence(list, period / 4).mag + 0.25 * (coherence(list, period / 2).mag + coherence(list, period).mag);
  }

  // The tempo where the hits line up best. One octave, so it cannot pick half or double time.
  function guessBpm(list, lo, hi) {
    if (list.length < 8) return null;
    var best = { bpm: 0, fit: -1 };
    for (var b = lo; b < hi; b += 0.05) {
      var m = gridFit(list, 60 / b);
      if (m > best.fit) best = { bpm: b, fit: m };
    }
    var fine = best;
    for (var f = best.bpm - 0.06; f <= best.bpm + 0.06; f += 0.002) {
      var mf = gridFit(list, 60 / f);
      if (mf > fine.fit) fine = { bpm: f, fit: mf };
    }
    return Math.round(fine.bpm * 100) / 100;
  }

  // Where in the bar a hit is most likely: kicks and bass on beat 1, snares on 2, 3, or 4.
  function place(voice, pos) {
    var onBeat = Math.abs(pos - Math.round(pos)) < 0.01;
    if (voice === "snare") return pos === 2 ? 1.5 : onBeat && pos !== 0 ? 1 : 0.4;
    return pos === 0 ? 2 : onBeat ? 1 : 0.5;
  }

  // Seconds from the start of the file to the first downbeat (beat 1 of a bar).
  // Tries every start point across one bar and keeps the one where the hits land best.
  function guessOffset(voices, bpm) {
    var spb = 60 / bpm;
    var bar = spb * 4;
    var hits = [];
    Object.keys(voices).forEach(function (k) {
      if (k === "hats") return;
      strongEnough(voices[k]).forEach(function (o) { hits.push({ t: o.t, w: o.w, v: k }); });
    });
    if (!hits.length) return 0;
    function score(phi) {
      var s = 0;
      for (var i = 0; i < hits.length; i++) {
        var pos = ((((hits[i].t - phi) / spb) % 4) + 4) % 4;
        var near = Math.round(pos * 2) / 2;
        var dist = Math.abs(pos - near) * spb;
        if (dist > 0.03) continue;
        s += hits[i].w * place(hits[i].v, near % 4) * Math.exp(-(dist * dist) / 0.0002);
      }
      return s;
    }
    var best = { phi: 0, s: -1 };
    for (var phi = 0; phi < bar; phi += 0.002) {
      var s = score(phi);
      if (s > best.s) best = { phi: phi, s: s };
    }
    for (var f = best.phi - 0.003; f <= best.phi + 0.003; f += 0.0005) {
      var sf = score(f);
      if (sf > best.s) best = { phi: f, s: sf };
    }
    var offset = ((best.phi % bar) + bar) % bar;
    if (offset > bar - 0.03) offset -= bar;
    return Math.round(offset * 1000) / 1000;
  }

  // ---------- notes

  function strongEnough(list) {
    var ws = list.map(function (o) { return o.w; });
    var cut = percentile(ws, 0.9) * 0.2;
    return list.filter(function (o) { return o.w >= cut; });
  }

  function makeNotes(voices, bpm, offset, level) {
    var spb = 60 / bpm;
    var grid = 1;
    var byBeat = {};
    Object.keys(level.voices).forEach(function (name) {
      var list = voices[name];
      if (!list) return;
      var vg = level.voices[name];
      var tol = Math.min(0.05, vg * spb * 0.35);
      grid = Math.min(grid, vg);
      strongEnough(list).forEach(function (o) {
        var bf = (o.t - offset) / spb;
        var q = Math.round(bf / vg) * vg;
        if (q < 0 || Math.abs(bf - q) * spb > tol) return;
        var key = q.toFixed(3);
        var slot = byBeat[key] || (byBeat[key] = { beat: q, hits: {} });
        if (!slot.hits[name] || slot.hits[name].w < o.w) slot.hits[name] = o;
      });
    });

    var turn = {};
    var busy = [-1, -1, -1, -1];
    var last = { lane: -1, beat: -9 };
    var holding = -1;
    var notes = [];
    Object.keys(byBeat)
      .map(function (k) { return byBeat[k]; })
      .sort(function (a, b) { return a.beat - b.beat; })
      .forEach(function (slot) {
        var names = Object.keys(slot.hits).sort(function (a, b) { return VOICES[a].rank - VOICES[b].rank; });
        var jump = level.jumps === "all" ||
          (level.jumps === "some" && ((slot.hits.kick && slot.hits.snare) || (slot.beat % 4 === 0 && names.length > 1)));
        var used = {};
        names.slice(0, jump ? 2 : 1).forEach(function (name) {
          var lanes = VOICES[name].lanes;
          var t = turn[name] || 0;
          var lane = -1;
          for (var pass = 0; pass < 2 && lane < 0; pass++) {
            for (var i = 0; i < lanes.length; i++) {
              var pick = lanes[(t + i) % lanes.length];
              if (used[pick] || busy[pick] > slot.beat) continue;
              // No repeated arrow in a row on the lighter levels, when there is another choice.
              if (pass === 0 && level.jumps !== "all" && pick === last.lane && slot.beat - last.beat < 1) continue;
              lane = pick;
              turn[name] = t + i + 1;
              break;
            }
          }
          for (var l = 0; lane < 0 && l < LANES; l++) if (!used[l] && busy[l] <= slot.beat) lane = l;
          if (lane < 0) return;
          used[lane] = true;
          var hit = slot.hits[name];
          var len = hit.sus / spb;
          var beat = Math.round(slot.beat * 1000) / 1000;
          if (level.holds && (name === "kick" || name === "bass") && len >= 1 && holding < slot.beat) {
            len = Math.min(4, Math.floor(len * 2) / 2);
            notes.push([beat, lane, len]);
            busy[lane] = slot.beat + len + 0.5;
            holding = slot.beat + len;
          } else {
            notes.push([beat, lane]);
            busy[lane] = slot.beat + grid * 0.99;
          }
          last = { lane: lane, beat: slot.beat };
        });
      });
    return notes;
  }

  // ---------- drops and sections

  // A bar scores by how loud it is above the sub (a long sub note alone is not a drop)
  // plus how many kick, bass, and hat hits it has. Snares are left out because
  // builds are mostly snare rolls.
  function makeSections(frames, voices, bpm, offset, duration, notes) {
    var spb = 60 / bpm;
    var bar = spb * 4;
    var bars = Math.max(1, Math.ceil((duration - Math.max(0, offset)) / bar));
    var e = frames.e;
    var db = [];
    for (var b = 0; b < bars; b++) {
      var from = Math.max(0, Math.floor((offset + b * bar) / frames.hop));
      var to = Math.min(e.length, Math.floor((offset + (b + 1) * bar) / frames.hop));
      var s = 0;
      for (var i = from; i < to; i++) s += e[i];
      db.push(10 * Math.log10(s / Math.max(1, to - from) + 1e-12));
    }
    var busy = [];
    for (var z = 0; z < bars; z++) busy.push(0);
    Object.keys(voices).forEach(function (name) {
      if (name === "snare") return;
      strongEnough(voices[name]).forEach(function (o) {
        var at = Math.floor((o.t - offset) / bar);
        if (at >= 0 && at < bars) busy[at] += Math.sqrt(o.w);
      });
    });
    var most = percentile(busy.slice(), 0.95) || 1;
    var score = db.map(function (v, k) { return v + 6 * Math.min(1, busy[k] / most); });
    var loud = percentile(score.slice(), 0.9);
    var isDrop = score.map(function (v) { return v >= loud - 3; });
    for (var g = 1; g < bars - 1; g++) {
      if (!isDrop[g] && isDrop[g - 1] && isDrop[g + 1]) isDrop[g] = true;
    }
    var runs = [];
    var at = 0;
    while (at < bars) {
      var end = at;
      while (end < bars && isDrop[end] === isDrop[at]) end++;
      runs.push({ drop: isDrop[at] && end - at >= 4, from: at, bars: end - at });
      at = end;
    }
    var merged = [];
    runs.forEach(function (r) {
      var last = merged[merged.length - 1];
      if (last && last.drop === r.drop) last.bars += r.bars;
      else merged.push({ drop: r.drop, from: r.from, bars: r.bars });
    });
    var firstDrop = -1, lastDrop = -1;
    merged.forEach(function (r, i) {
      if (r.drop) {
        if (firstDrop < 0) firstDrop = i;
        lastDrop = i;
      }
    });
    var sections = merged.map(function (r, i) {
      var type = r.drop ? "drop" : firstDrop < 0 || i < firstDrop ? "intro" : i > lastDrop ? "outro" : "break";
      return { type: type, bars: r.bars };
    });
    var firstNote = notes.length ? notes[0][0] : Infinity;
    if (firstNote >= 4 && sections[0].type !== "drop" && sections[0].bars > 1) {
      sections[0].bars -= 1;
      sections.unshift({ type: "countin", bars: 1 });
    }
    return sections;
  }

  // ---------- the whole job

  // options:
  //   sampleRate   required
  //   mix          the full track, mono Float32Array (optional if there are stems)
  //   stems        { kick, snare, bass, hats }, mono Float32Arrays, all lined up with the mix
  //   bpm          the tempo. Leave out to guess it.
  //   offset       seconds to the first downbeat. Leave out (or "auto") to guess it.
  //   bpmRange     [low, high] for guessing, one octave. Default [95, 190].
  function analyze(options) {
    var sr = options.sampleRate;
    var stems = options.stems || {};
    var voices = {};
    var frames = null;
    var duration = 0;
    var source = "stems";

    Object.keys(VOICES).forEach(function (name) {
      if (!stems[name] || !stems[name].length) return;
      var ds = downsample(stems[name], sr);
      duration = Math.max(duration, ds.x.length / ds.sr);
      var res = onsets(ds.x, ds.sr);
      voices[name] = res.list;
      var above = energy(aboveSub(ds.x, ds.sr), ds.sr);
      if (!frames) frames = above;
      else addFrames(frames, above);
    });

    if (options.mix && options.mix.length) {
      var m = downsample(options.mix, sr);
      duration = Math.max(duration, m.x.length / m.sr);
      frames = energy(aboveSub(m.x, m.sr), m.sr);
      if (!voices.kick) voices.kick = onsets(biquad(biquad(m.x, m.sr, "lowpass", 120, 0.71), m.sr, "lowpass", 120, 0.71), m.sr).list;
      if (!voices.snare) voices.snare = onsets(biquad(m.x, m.sr, "bandpass", 1800, 0.9), m.sr).list;
      if (!voices.hats) voices.hats = onsets(biquad(biquad(m.x, m.sr, "highpass", 7000, 0.71), m.sr, "highpass", 7000, 0.71), m.sr).list;
      if (!Object.keys(stems).some(function (k) { return stems[k] && stems[k].length; })) source = "mix";
      else source = "mix and stems";
    }
    if (!frames) throw new Error("Give it a track or at least one stem.");

    var beatHits = [];
    ["kick", "snare", "bass"].forEach(function (k) { if (voices[k]) beatHits = beatHits.concat(strongEnough(voices[k])); });
    var range = options.bpmRange || [95, 190];
    var bpmGuess = guessBpm(beatHits, range[0], range[1]);
    var bpm = Number(options.bpm) > 0 ? Number(options.bpm) : bpmGuess;
    if (!bpm) throw new Error("Could not hear a steady beat. Type in the BPM.");
    var offsetGuess = guessOffset(voices, bpm);
    var hasOffset = options.offset !== undefined && options.offset !== null && options.offset !== "" && options.offset !== "auto" && isFinite(Number(options.offset));
    var offset = hasOffset ? Number(options.offset) : offsetGuess;

    var charts = {};
    ORDER.forEach(function (name) { charts[name] = makeNotes(voices, bpm, offset, LEVELS[name]); });
    var sections = makeSections(frames, voices, bpm, offset, duration, charts.easy.concat(charts.skwished).sort(function (a, b) { return a[0] - b[0]; }));
    var counts = {};
    Object.keys(voices).forEach(function (k) { counts[k] = voices[k].length; });
    return {
      bpm: bpm,
      offset: offset,
      bpmGuess: bpmGuess,
      offsetGuess: offsetGuess,
      duration: Math.round(duration * 100) / 100,
      source: source,
      hits: counts,
      charts: charts,
      sections: sections
    };
  }

  function addFrames(into, more) {
    if (more.e.length > into.e.length) {
      var bigger = new Float32Array(more.e.length);
      bigger.set(into.e);
      into.e = bigger;
    }
    for (var i = 0; i < more.e.length; i++) into.e[i] += more.e[i];
  }

  // ---------- writing it into js/beatmap.js

  function q(str) {
    return JSON.stringify(String(str));
  }

  // A chart as lines of JavaScript, one line per bar.
  function chartLines(notes, indent) {
    var bars = [];
    notes.forEach(function (n) {
      var b = Math.floor(n[0] / 4);
      var last = bars[bars.length - 1];
      if (!last || last.bar !== b) bars.push(last = { bar: b, notes: [] });
      last.notes.push("[" + n.join(", ") + "]");
    });
    var lines = [];
    bars.forEach(function (b, i) {
      lines.push(indent + "// bar " + (b.bar + 1));
      lines.push(indent + b.notes.join(", ") + (i < bars.length - 1 ? "," : ""));
    });
    return lines;
  }

  // The track block, ready to paste between the TRACK lines in js/beatmap.js.
  function trackBlock(result, info) {
    info = info || {};
    var lines = [];
    lines.push("  // >>> TRACK  (the beatmap maker rewrites everything down to the <<< TRACK line)");
    lines.push("  track: {");
    if (info.title) lines.push("    title: " + q(info.title) + ",");
    lines.push("    audio: " + q(info.audio || "") + ",");
    lines.push("    bpm: " + result.bpm + ",");
    lines.push("    offset: " + result.offset + ",");
    lines.push("    credit: " + q(info.credit || "Music by Dirt Monkey") + ",");
    lines.push("");
    lines.push("    // Made by the beatmap maker from " + result.source + (info.from ? " (" + info.from + ")" : "") + ".");
    lines.push("    // Delete sections or any chart to have the game make it from the audio instead.");
    lines.push("    sections: [");
    lines.push(result.sections.map(function (s) { return "      { type: " + q(s.type) + ", bars: " + s.bars + " }"; }).join(",\n"));
    lines.push("    ],");
    lines.push("    charts: {");
    ORDER.forEach(function (name, i) {
      lines.push("      " + name + ": [");
      lines.push.apply(lines, chartLines(result.charts[name], "        "));
      lines.push("      ]" + (i < ORDER.length - 1 ? "," : ""));
    });
    lines.push("    }");
    lines.push("  },");
    lines.push("  // <<< TRACK");
    return lines.join("\n");
  }

  function spliceBeatmap(fileText, block) {
    var start = fileText.indexOf("// >>> TRACK");
    var end = fileText.indexOf("// <<< TRACK");
    if (start < 0 || end < start) throw new Error("js/beatmap.js is missing the >>> TRACK and <<< TRACK lines.");
    var lineStart = fileText.lastIndexOf("\n", start) + 1;
    var lineEnd = fileText.indexOf("\n", end);
    if (lineEnd < 0) lineEnd = fileText.length;
    return fileText.slice(0, lineStart) + block + fileText.slice(lineEnd);
  }

  return {
    analyze: analyze,
    toMono: toMono,
    trackBlock: trackBlock,
    chartLines: chartLines,
    ORDER: ORDER,
    spliceBeatmap: spliceBeatmap,
    LEVELS: LEVELS
  };
});
