// You do not need to edit this file.
// Monkey Drop, the arrow rhythm game at /play/.
// The song, the charts, and the drops live in js/beatmap.js.
//
// Timing uses the Web Audio clock, so arrows stay locked to the music
// even if the screen stutters. The placeholder beat is synthesized here
// from its sections. When BEATMAP.track has an audio file, that plays
// instead, and js/chart-maker.js makes any charts the track is missing.

(function () {
  var map = typeof BEATMAP === "undefined" ? null : BEATMAP;
  var root = document.getElementById("game");
  if (!root || !map || !map.placeholder) return;

  var canvas = root.querySelector("canvas");
  var g = canvas.getContext("2d");
  var screens = {
    start: root.querySelector('[data-screen="start"]'),
    pause: root.querySelector('[data-screen="pause"]'),
    results: root.querySelector('[data-screen="results"]'),
    calibrate: root.querySelector('[data-screen="calibrate"]')
  };
  var startBtn = root.querySelector("[data-start]");
  var muteBtn = root.querySelector("[data-mute]");
  var pauseBtn = root.querySelector("[data-pause]");
  var retryBtn = root.querySelector("[data-retry-tool]");
  var toolsEl = root.querySelector(".game-tools");
  var bestEl = root.querySelector("[data-best]");
  var creditEl = root.querySelector("[data-credit]");
  var songNameEl = root.querySelector("[data-song-name]");
  var songByEl = root.querySelector("[data-song-by]");
  var speedEl = root.querySelector("[data-speed]");
  var offsetEl = root.querySelector("[data-offset]");
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var coarseQuery = window.matchMedia ? window.matchMedia("(pointer: coarse)") : null;

  var LANES = 4;
  var KEYS = { a: 0, arrowleft: 0, s: 1, arrowdown: 1, w: 2, arrowup: 2, d: 3, arrowright: 3 };
  // Seconds either side of the arrow. Anything later than the last window is a Miss.
  var WINDOWS = [
    { name: "marvelous", w: 0.0225 },
    { name: "perfect", w: 0.045 },
    { name: "great", w: 0.09 },
    { name: "good", w: 0.135 }
  ];
  var MISS_AFTER = 0.135;
  // A hold survives a slip this long, and letting go this close to the end still counts.
  var HOLD_GRACE = 0.2;
  var HOLD_EARLY_OK = 0.1;
  var DIFFS = ["easy", "normal", "hard", "wild"];
  var DIFF_NAMES = { easy: "Easy", normal: "Normal", hard: "Hard", wild: "Wild" };
  var SPEEDS = [1, 1.5, 2, 2.5, 3, 4];
  var MISS_LIFE = { easy: 6, normal: 8, hard: 10, wild: 12 };
  // Easy and Normal fail after this many misses in a row instead of when the life bar empties.
  var MISS_STREAK_FAIL = { easy: 15, normal: 10 };
  var JUDGE = {
    marvelous: { text: "MARVELOUS", color: "#ffffff" },
    perfect: { text: "PERFECT", color: "#d6ff4a" },
    great: { text: "GREAT", color: "#3dff8a" },
    good: { text: "GOOD", color: "#3dbbff" },
    miss: { text: "MISS", color: "#ff4d6d" },
    ok: { text: "OK", color: "#3dfff2" },
    ng: { text: "NG", color: "#ff4d6d" }
  };
  // Arrow colors by where they fall in the beat: quarter, 8th, 16th, anything else.
  var QUANT_COLORS = ["#ff2bd6", "#3dfff2", "#d6ff4a", "#9b6bff"];
  var FONT = '"JetBrains Mono", ui-monospace, monospace';
  var mapOffset = (Number(map.inputOffsetMs) || 0) / 1000;

  // ?audio=/assets/audio/x.mp3&bpm=145&offset=0 tries a track without editing js/beatmap.js.
  var params = new URLSearchParams(window.location.search);
  var track = map.track || {};
  var trial = params.get("audio");
  if (trial && /^\/[^/\\]/.test(trial)) {
    track = {
      audio: trial,
      bpm: params.get("bpm") || "auto",
      offset: params.has("offset") ? params.get("offset") : "auto",
      credit: "Trying " + trial.split("/").pop()
    };
  }
  var useTrack = !!track.audio;
  var trackReady = false;

  // Colors for the light show. A song's theme in js/beatmap.js can swap any of them.
  var NEON = {
    lanes: ["#ff2bd6", "#3dfff2", "#3dfff2", "#ff2bd6"],
    base: "#07060a",
    glow: "255,43,214",
    pulse: "255,43,214",
    dropPulse: "255,43,214",
    laneTint: ["61,255,242", "255,43,214"],
    life: ["#3dfff2", "#ff2bd6"],
    progress: "#3dfff2",
    combo50: "#3dfff2",
    combo100: "#d6ff4a",
    shout: "#d6ff4a",
    drop: "#ff2bd6",
    flash: "255,255,255",
    edgeHues: null
  };
  // The theme (cover art, dancer, coins, palette) only goes with the song it was made for.
  var theme = map.theme && useTrack && track.audio === map.theme.audio ? map.theme : null;
  var C = palette();

  function palette() {
    var c = {};
    Object.keys(NEON).forEach(function (k) { c[k] = theme && theme.colors && theme.colors[k] != null ? theme.colors[k] : NEON[k]; });
    return c;
  }

  if (theme) root.setAttribute("data-theme", theme.name);
  else root.removeAttribute("data-theme");

  function calm() {
    return !!(motionQuery && motionQuery.matches);
  }

  function store(key, value) {
    try {
      if (arguments.length > 1) window.localStorage.setItem(key, value);
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  // ---------- player settings: difficulty, speed, and timing offset

  var settings = { difficulty: "normal", speed: 2, offsetMs: 0 };
  (function () {
    try {
      var saved = JSON.parse(store("dm-play-settings") || "null");
      if (saved && DIFFS.indexOf(saved.difficulty) > -1) settings.difficulty = saved.difficulty;
      if (saved && SPEEDS.indexOf(Number(saved.speed)) > -1) settings.speed = Number(saved.speed);
      if (saved && isFinite(Number(saved.offsetMs))) settings.offsetMs = clampOffset(Number(saved.offsetMs));
    } catch (e) {}
  })();

  function clampOffset(ms) {
    return Math.max(-300, Math.min(300, Math.round(ms)));
  }

  function saveSettings() {
    store("dm-play-settings", JSON.stringify(settings));
  }

  function totalOffset() {
    return settings.offsetMs / 1000 + mapOffset;
  }

  // ---------- the song: tempo, offset, sections, and charts

  var song = null;
  var spb = 0.5;
  var offset = 0;
  var sections = [];
  var totalBeats = 0;
  var drops = [];
  var charts = {};

  function parseChart(list) {
    if (!list || !list.length) return null;
    var out = list
      .map(function (n) {
        var len = Number(n[2]) || 0;
        return { beat: Number(n[0]), lane: Math.max(0, Math.min(LANES - 1, Number(n[1]) | 0)), len: len > 0 ? len : 0 };
      })
      .filter(function (n) { return isFinite(n.beat); })
      .sort(function (a, b) { return a.beat - b.beat || a.lane - b.lane; });
    return out.length ? out : null;
  }

  // Charts from a song definition. Old beatmaps with a single "notes" list count as Normal.
  function chartsOf(def) {
    var out = {};
    var given = def.charts || {};
    DIFFS.forEach(function (d) {
      var c = parseChart(given[d]);
      if (c) out[d] = c;
    });
    if (!out.normal && def.notes) {
      var legacy = parseChart(def.notes);
      if (legacy) out.normal = legacy;
    }
    return out;
  }

  function setSong(def) {
    song = def;
    spb = 60 / (Number(def.bpm) || 140);
    offset = Number(def.offset) || 0;
    sections = [];
    var at = 0;
    (def.sections || []).forEach(function (sec) {
      var bars = Math.max(0, Math.floor(sec.bars) || 0);
      sections.push({ type: sec.type, variant: sec.variant || 1, from: at, to: at + bars * 4, bars: bars });
      at += bars * 4;
    });
    totalBeats = at;
    drops = sections.filter(function (s) { return s.type === "drop"; });
    charts = def.madeCharts || chartsOf(def);
  }

  // The chart for a difficulty, or the closest one there is.
  function chartFor(diff) {
    if (charts[diff]) return charts[diff];
    var at = DIFFS.indexOf(diff);
    for (var step = 1; step < DIFFS.length; step++) {
      var lower = DIFFS[at - step];
      var higher = DIFFS[at + step];
      if (lower && charts[lower]) return charts[lower];
      if (higher && charts[higher]) return charts[higher];
    }
    return [];
  }

  function isSet(v) {
    return v !== undefined && v !== null && v !== "" && v !== "auto" && isFinite(Number(v));
  }

  function trackComplete() {
    if (!(isSet(track.bpm) && isSet(track.offset) && track.sections && track.sections.length)) return false;
    var have = chartsOf(track);
    return DIFFS.every(function (d) { return !!have[d]; });
  }

  function bestKey(diff) {
    return "dm-play-best:" + map.title + (useTrack ? "|" + track.audio : "") + "|" + (diff || settings.difficulty);
  }

  // "Now playing" on the start screen: the track's title, or the placeholder beat.
  function showSong() {
    if (!songNameEl) return;
    songNameEl.textContent = useTrack ? track.title || track.audio.split("/").pop() : "the placeholder beat";
    if (songByEl) songByEl.textContent = useTrack && track.title ? "by Dirt Monkey" : "";
  }

  function creditLine() {
    return useTrack ? track.credit || "Music by Dirt Monkey" : map.placeholder.credit;
  }

  function inDrop(beat) {
    for (var i = 0; i < drops.length; i++) {
      if (beat >= drops[i].from && beat < drops[i].to) return drops[i];
    }
    return null;
  }

  // A rough foot rating from arrows per second, the way the start screen shows it.
  function levelOf(chart) {
    if (!chart || !chart.length) return 0;
    var first = chart[0].beat;
    var last = chart[chart.length - 1].beat + chart[chart.length - 1].len;
    var seconds = Math.max(8, (last - first) * spb);
    var holds = chart.filter(function (n) { return n.len > 0; }).length;
    return Math.max(1, Math.min(15, Math.round(1 + ((chart.length + holds * 0.5) / seconds) * 1.6)));
  }

  setSong(useTrack && trackComplete() ? track : map.placeholder);

  // ---------- audio

  var ctx = null;
  var master = null;
  var bus = null;
  var noiseBuf = null;
  var grit = null;
  var trackBuf = null;
  var trackSource = null;
  var muted = store("dm-play-mute") === "on";

  function ensureAudio() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      master.connect(comp);
      comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var data = noiseBuf.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      grit = ctx.createWaveShaper();
      var curve = new Float32Array(1024);
      for (var j = 0; j < curve.length; j++) {
        var x = (j / (curve.length - 1)) * 2 - 1;
        curve[j] = Math.tanh(x * 3.2);
      }
      grit.curve = curve;
    }
    master.gain.value = muted ? 0 : 0.85;
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function setMuted(on) {
    muted = on;
    store("dm-play-mute", on ? "on" : "off");
    if (master) master.gain.setTargetAtTime(on ? 0 : 0.85, ctx.currentTime, 0.02);
    if (muteBtn) {
      muteBtn.setAttribute("aria-pressed", on ? "false" : "true");
      muteBtn.textContent = on ? "Sound off" : "Sound on";
    }
  }

  function freq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function envelope(param, t, peak, attack, hold, release) {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(peak, t + attack);
    if (hold) param.setValueAtTime(peak, t + attack + hold);
    param.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  }

  function noise(t, length, filterType, filterFreq, q) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(filterFreq, t);
    if (q) f.Q.value = q;
    var amp = ctx.createGain();
    src.connect(f);
    f.connect(amp);
    amp.connect(bus);
    src.start(t, Math.random() * 0.5, length + 0.05);
    return { amp: amp, filter: f };
  }

  var synth = {
    kick: function (t, big) {
      var o = ctx.createOscillator();
      var a = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(big ? 170 : 140, t);
      o.frequency.exponentialRampToValueAtTime(42, t + (big ? 0.3 : 0.16));
      envelope(a.gain, t, big ? 1.1 : 0.95, 0.004, 0.02, big ? 0.6 : 0.32);
      o.connect(a);
      a.connect(bus);
      o.start(t);
      o.stop(t + 0.8);
      var click = noise(t, 0.02, "highpass", 3000);
      envelope(click.amp.gain, t, 0.25, 0.001, 0, 0.02);
    },
    snare: function (t, vel) {
      vel = vel == null ? 1 : vel;
      var n = noise(t, 0.22, "bandpass", 1900, 0.7);
      envelope(n.amp.gain, t, 0.7 * vel, 0.002, 0.01, 0.18);
      var o = ctx.createOscillator();
      var a = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
      envelope(a.gain, t, 0.35 * vel, 0.002, 0, 0.1);
      o.connect(a);
      a.connect(bus);
      o.start(t);
      o.stop(t + 0.2);
    },
    hat: function (t, open) {
      var n = noise(t, open ? 0.25 : 0.05, "highpass", 8000);
      envelope(n.amp.gain, t, open ? 0.14 : 0.1, 0.001, 0, open ? 0.22 : 0.04);
    },
    click: function (t, f) {
      var o = ctx.createOscillator();
      var a = ctx.createGain();
      o.type = "square";
      o.frequency.value = f;
      envelope(a.gain, t, 0.08, 0.002, 0, 0.06);
      o.connect(a);
      a.connect(bus);
      o.start(t);
      o.stop(t + 0.1);
    },
    sub: function (t, midi, beats) {
      var o = ctx.createOscillator();
      var a = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq(midi);
      envelope(a.gain, t, 0.5, 0.02, beats * spb * 0.7, beats * spb * 0.25);
      o.connect(a);
      a.connect(bus);
      o.start(t);
      o.stop(t + beats * spb + 0.1);
    },
    pluck: function (t, midi, vel) {
      var o = ctx.createOscillator();
      var f = ctx.createBiquadFilter();
      var a = ctx.createGain();
      o.type = "square";
      o.frequency.value = freq(midi);
      f.type = "lowpass";
      f.frequency.setValueAtTime(3200, t);
      f.frequency.exponentialRampToValueAtTime(500, t + 0.2);
      envelope(a.gain, t, 0.09 * (vel || 1), 0.003, 0, 0.22);
      o.connect(f);
      f.connect(a);
      a.connect(bus);
      o.start(t);
      o.stop(t + 0.3);
    },
    wobble: function (t, midi, beats, rate) {
      var length = beats * spb;
      var f0 = freq(midi);
      var o1 = ctx.createOscillator();
      var o2 = ctx.createOscillator();
      var o3 = ctx.createOscillator();
      o1.type = "sawtooth";
      o2.type = "sawtooth";
      o3.type = "sine";
      o1.frequency.value = f0;
      o2.frequency.value = f0 * 1.006;
      o3.frequency.value = f0;
      var drive = ctx.createGain();
      drive.gain.value = 0.6;
      var shape = ctx.createWaveShaper();
      shape.curve = grit.curve;
      var filt = ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.Q.value = 9;
      filt.frequency.value = 900;
      var lfo = ctx.createOscillator();
      lfo.type = "triangle";
      lfo.frequency.value = rate;
      var depth = ctx.createGain();
      depth.gain.value = 780;
      lfo.connect(depth);
      depth.connect(filt.frequency);
      var amp = ctx.createGain();
      envelope(amp.gain, t, 0.32, 0.01, length - 0.07, 0.05);
      var subAmp = ctx.createGain();
      envelope(subAmp.gain, t, 0.4, 0.01, length - 0.07, 0.05);
      o1.connect(drive);
      o2.connect(drive);
      drive.connect(shape);
      shape.connect(filt);
      filt.connect(amp);
      amp.connect(bus);
      o3.connect(subAmp);
      subAmp.connect(bus);
      [o1, o2, o3, lfo].forEach(function (o) {
        o.start(t);
        o.stop(t + length + 0.05);
      });
    },
    riser: function (t, beats) {
      var length = beats * spb;
      var n = noise(t, length, "bandpass", 400, 3);
      n.filter.frequency.exponentialRampToValueAtTime(7000, t + length);
      n.amp.gain.setValueAtTime(0.0001, t);
      n.amp.gain.exponentialRampToValueAtTime(0.28, t + length);
      n.amp.gain.setValueAtTime(0.0001, t + length + 0.01);
      var o = ctx.createOscillator();
      var a = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(880, t + length);
      a.gain.setValueAtTime(0.0001, t);
      a.gain.exponentialRampToValueAtTime(0.05, t + length);
      a.gain.setValueAtTime(0.0001, t + length + 0.01);
      o.connect(a);
      a.connect(bus);
      o.start(t);
      o.stop(t + length + 0.02);
    },
    impact: function (t) {
      synth.kick(t, true);
      var crash = noise(t, 1.6, "lowpass", 9000);
      crash.filter.frequency.exponentialRampToValueAtTime(600, t + 1.5);
      envelope(crash.amp.gain, t, 0.45, 0.003, 0, 1.5);
      var o = ctx.createOscillator();
      var a = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(95, t);
      o.frequency.exponentialRampToValueAtTime(30, t + 1.2);
      envelope(a.gain, t, 0.6, 0.01, 0.2, 1.0);
      o.connect(a);
      a.connect(bus);
      o.start(t);
      o.stop(t + 1.3);
    }
  };

  // A minor: Am, F, C, G.
  var CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  var ROOTS = [33, 29, 36, 31];
  var ARP = [0, 1, 2, 1, 0, 2, 1, 2];
  var DROP_ROOTS = [33, 33, 29, 31];
  var DROP_RATES = [[2, 4], [3, 2], [2, 6], [4, 3]];

  function arrange() {
    var ev = [];
    function at(beat, fn) { ev.push({ b: beat, f: fn }); }
    var barIndex = 0;
    sections.forEach(function (sec) {
      for (var bar = 0; bar < sec.bars; bar++, barIndex++) {
        var s = sec.from + bar * 4;
        var last = bar === sec.bars - 1;
        var chord = CHORDS[barIndex % 4];
        var root = ROOTS[barIndex % 4];
        var i;
        if (sec.type === "countin") {
          for (i = 0; i < 4; i++) at(s + i, (function (hi) { return function (t) { synth.click(t, hi ? 1760 : 1320); }; })(i === 0));
        } else if (sec.type === "intro" || (sec.type === "break" && !last)) {
          at(s, function (t) { synth.kick(t); });
          if (sec.type === "intro") {
            at(s + 2, function (t) { synth.kick(t); });
            if (bar % 2) at(s + 2.5, function (t) { synth.kick(t); });
          }
          at(s, (function (r) { return function (t) { synth.sub(t, r, 4); }; })(root));
          for (i = 0; i < 8; i++) {
            at(s + i * 0.5, (function (open) { return function (t) { synth.hat(t, open); }; })(i === 7));
            at(s + i * 0.5, (function (m) { return function (t) { synth.pluck(t, m); }; })(chord[ARP[i] % 3] + (ARP[i] === 2 && i > 3 ? 12 : 0)));
          }
        } else if (sec.type === "build" || (sec.type === "break" && last)) {
          var buildBar = sec.type === "build" ? bar : 3;
          if (bar === 0 && sec.type === "build") at(s, function (t) { synth.riser(t, sec.bars * 4 - 0.5); });
          if (sec.type === "break") at(s, function (t) { synth.riser(t, 3.5); });
          var step = buildBar === 0 ? 1 : buildBar < 3 ? 0.5 : 0.25;
          for (var k = 0; k < 4 - (last ? 0.5 : 0); k += step) {
            at(s + k, (function (v) { return function (t) { synth.snare(t, v); }; })(0.45 + 0.5 * ((buildBar * 4 + k) / 16)));
          }
          if (buildBar < 3) {
            for (i = 0; i < 4; i++) at(s + i, function (t) { synth.kick(t); });
            if (buildBar < 2) {
              for (i = 0; i < 8; i++) at(s + i * 0.5, (function (m) { return function (t) { synth.pluck(t, m, 0.7); }; })(chord[ARP[i] % 3]));
            }
          }
        } else if (sec.type === "drop") {
          var v2 = sec.variant === 2;
          if (bar === 0) at(s, function (t) { synth.impact(t); });
          else at(s, function (t) { synth.kick(t, true); });
          at(s + 1.5, function (t) { synth.kick(t); });
          if (v2 && bar % 2) at(s + 3.5, function (t) { synth.kick(t); });
          at(s + 2, function (t) { synth.snare(t, 1); });
          for (i = 0; i < 8; i++) at(s + i * 0.5, (function (open) { return function (t) { synth.hat(t, open); }; })(i % 2 === 1 && v2));
          var dr = DROP_ROOTS[bar % 4];
          var rates = DROP_RATES[bar % 4];
          var bps = 1 / spb;
          at(s, (function (m, r) { return function (t) { synth.wobble(t, m, 2, r); }; })(dr, rates[0] * bps * (v2 ? 1.5 : 1)));
          if (last) {
            for (i = 0; i < 4; i++) at(s + 2 + i * 0.5, (function (v) { return function (t) { synth.snare(t, v); }; })(0.6 + i * 0.12));
          } else {
            at(s + 2, (function (m, r) { return function (t) { synth.wobble(t, m, 2, r); }; })(bar % 2 ? dr + 12 : dr, rates[1] * bps));
          }
        } else if (sec.type === "outro") {
          if (bar === 0) {
            at(s, function (t) { synth.impact(t); });
            at(s, function (t) { synth.sub(t, 33, 6); });
          }
        }
      }
    });
    ev.sort(function (a, b) { return a.b - b.b; });
    return ev;
  }

  // ---------- canvas layout

  var dpr = 1;
  var W = 0;
  var H = 0;
  var L = {};
  var noteSprites = [];
  var receptorSprites = [];
  var litSprites = [];
  var bg = null;
  // Arrows point left, down, up, right. The art is drawn pointing up.
  var ROT = [-Math.PI / 2, Math.PI, 0, Math.PI / 2];
  var LANE_GLOW = C.lanes;

  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function arrowPath(c, s) {
    var h = s / 2;
    c.beginPath();
    c.moveTo(0, -h * 0.94);
    c.lineTo(h * 0.94, 0);
    c.lineTo(h * 0.4, 0);
    c.lineTo(h * 0.4, h * 0.9);
    c.lineTo(-h * 0.4, h * 0.9);
    c.lineTo(-h * 0.4, 0);
    c.lineTo(-h * 0.94, 0);
    c.closePath();
  }

  function makeArrow(lane, color, mode) {
    var s = L.arrow;
    var pad = 18 * dpr;
    var c = document.createElement("canvas");
    c.width = c.height = Math.ceil(s + pad * 2);
    var x = c.getContext("2d");
    x.translate(c.width / 2, c.height / 2);
    x.rotate(ROT[lane]);
    arrowPath(x, s);
    x.lineJoin = "round";
    if (mode === "note") {
      x.shadowColor = color;
      x.shadowBlur = 14 * dpr;
      var grad = x.createLinearGradient(0, -s / 2, 0, s / 2);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.32, color);
      grad.addColorStop(1, color);
      x.fillStyle = grad;
      x.fill();
      x.shadowBlur = 0;
      x.lineWidth = 2 * dpr;
      x.strokeStyle = "rgba(255,255,255,0.9)";
      x.stroke();
    } else if (mode === "receptor") {
      x.fillStyle = "rgba(255,255,255,0.05)";
      x.fill();
      x.lineWidth = 3 * dpr;
      x.strokeStyle = "rgba(232,226,242,0.62)";
      x.stroke();
    } else {
      x.shadowColor = color;
      x.shadowBlur = 24 * dpr;
      x.fillStyle = hexA(color, 0.6);
      x.fill();
      x.lineWidth = 3 * dpr;
      x.strokeStyle = "#ffffff";
      x.stroke();
    }
    return c;
  }

  // On phones the life bar shares the top strip with the buttons, so it stops short of them.
  function layoutLife() {
    if (L.side || !L.life) return;
    var toolsW = toolsEl ? toolsEl.getBoundingClientRect().width : 0;
    L.life.w = Math.max(90 * dpr, W - (toolsW + 34) * dpr);
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var cw = canvas.clientWidth;
    var ch = canvas.clientHeight;
    W = Math.max(1, Math.round(cw * dpr));
    H = Math.max(1, Math.round(ch * dpr));
    canvas.width = W;
    canvas.height = H;
    L.side = cw >= 720 && cw / ch >= 1.15;
    L.pads = !L.side || !!(coarseQuery && coarseQuery.matches);
    L.padH = L.pads ? Math.max(84, Math.min(120, ch * 0.16)) * dpr : 0;
    if (L.side) {
      L.laneW = Math.min(96 * dpr, (W * 0.4) / LANES);
      L.x = (W - L.laneW * LANES) / 2;
      L.life = { x: L.x, y: 20 * dpr, w: L.laneW * LANES, h: 12 * dpr };
      L.arrow = Math.min(L.laneW * 0.84, 84 * dpr);
      L.recY = 48 * dpr + L.arrow / 2;
      L.sk = { x: L.x / 2, y: H * 0.56, size: Math.min(L.x * 0.78, H * 0.5), dim: 1 };
      L.hud = { x: L.x + L.laneW * LANES + L.x / 2, y: H * 0.3 };
      L.top = 0;
    } else {
      // The Retry, Pause, and Sound buttons sit on the right of the top strip.
      var strip = 56 * dpr;
      L.laneW = (W - 16 * dpr) / LANES;
      L.x = 8 * dpr;
      L.life = { x: 12 * dpr, y: 12 * dpr, w: 0, h: 10 * dpr };
      layoutLife();
      L.arrow = Math.min(L.laneW * 0.8, 76 * dpr);
      L.recY = strip + 8 * dpr + L.arrow / 2;
      L.hud = null;
      // Arrows that fly past the targets stop at the strip, so they never cover the life bar.
      // (They also stay above the pads; see drawArrows.)
      L.top = strip;
    }
    L.right = L.x + L.laneW * LANES;
    L.bottom = H - L.padH;
    if (!L.side) {
      L.sk = { x: W / 2, y: (L.recY + L.bottom) / 2, size: Math.min(W * 0.8, (L.bottom - L.recY) * 0.62), dim: 0.2 };
    }
    L.judgeY = L.recY + (L.bottom - L.recY) * 0.36;
    L.judgeSize = Math.min(L.laneW * LANES * 0.12, 44 * dpr);

    noteSprites = QUANT_COLORS.map(function (color) {
      return [0, 1, 2, 3].map(function (lane) { return makeArrow(lane, color, "note"); });
    });
    receptorSprites = [0, 1, 2, 3].map(function (lane) { return makeArrow(lane, "#ffffff", "receptor"); });
    litSprites = [0, 1, 2, 3].map(function (lane) { return makeArrow(lane, LANE_GLOW[lane], "lit"); });

    if (video.el) setupVideo();
    buildBg();
    if (state !== "playing") draw(0);
  }

  // The backdrop: dark, a glow behind the dancer, and the four lanes. With a
  // theme, its spotlight art sits behind the dancer. With a background video,
  // the dark is see-through so the video shows.
  function buildBg() {
    bg = document.createElement("canvas");
    bg.width = W;
    bg.height = H;
    var b = bg.getContext("2d");
    b.fillStyle = video.on ? hexA(C.base, 0.6) : C.base;
    b.fillRect(0, 0, W, H);
    if (backdropImg && !video.on) {
      var bs = Math.max(W, H) * 1.1;
      b.globalAlpha = 0.5;
      b.drawImage(backdropImg, L.sk.x - bs / 2, L.sk.y - bs / 2, bs, bs);
      b.globalAlpha = 1;
      var shade = b.createLinearGradient(L.x, 0, L.right, 0);
      shade.addColorStop(0, "rgba(11,8,5,0.55)");
      shade.addColorStop(0.5, "rgba(11,8,5,0.7)");
      shade.addColorStop(1, "rgba(11,8,5,0.55)");
      b.fillStyle = shade;
      b.fillRect(L.x, 0, L.right - L.x, L.bottom);
    }
    if (video.on) {
      // Extra dark under the lanes, so the arrows read over any video.
      b.fillStyle = hexA(C.base, 0.45);
      b.fillRect(L.x, 0, L.right - L.x, L.bottom);
    }
    var glow = b.createRadialGradient(L.sk.x, L.sk.y, 0, L.sk.x, L.sk.y, Math.max(W, H) * 0.6);
    glow.addColorStop(0, "rgba(" + C.glow + ",0.14)");
    glow.addColorStop(1, "rgba(" + C.glow + ",0)");
    b.fillStyle = glow;
    b.fillRect(0, 0, W, H);
    for (var i = 0; i < LANES; i++) {
      var lx = L.x + i * L.laneW;
      var lg = b.createLinearGradient(0, 0, 0, L.bottom);
      lg.addColorStop(0, "rgba(" + C.laneTint[i % 3 ? 0 : 1] + ",0.07)");
      lg.addColorStop(1, "rgba(255,255,255,0.01)");
      b.fillStyle = lg;
      b.fillRect(lx + 2 * dpr, 0, L.laneW - 4 * dpr, L.bottom);
    }
    b.strokeStyle = "rgba(255,255,255,0.07)";
    b.lineWidth = dpr;
    for (var j = 0; j <= LANES; j++) {
      var x0 = Math.round(L.x + j * L.laneW) + 0.5;
      b.beginPath();
      b.moveTo(x0, 0);
      b.lineTo(x0, L.bottom);
      b.stroke();
    }
  }

  // ---------- The monkey (existing art, recolored for the light show)
  // With a theme, its dancer art is used as is: no recoloring.

  var monkeyArt = [];
  var monkeyAspect = 1;
  var backdropImg = null;
  var coinImg = null;
  var titleImg = null;
  var logoImg = null;

  function picture(src, done) {
    var img = new Image();
    img.decoding = "async";
    img.onload = function () { done(img); };
    img.src = src;
  }

  function loadDancer() {
    var want = theme && theme.dancer;
    picture(want ? want.src : "/assets/monkey-cyan.webp", function (img) {
      if (!!want !== !!(theme && theme.dancer)) return;
      monkeyArt = [];
      monkeyAspect = img.naturalHeight / img.naturalWidth || 1;
      var w = Math.min(640, img.naturalWidth || 512);
      var h = Math.round(w * monkeyAspect);
      (want ? [null] : [null, "#ff4fe0", "#e4ff70"]).forEach(function (color) {
        var c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        var x = c.getContext("2d");
        x.drawImage(img, 0, 0, w, h);
        if (color) {
          x.globalCompositeOperation = "source-atop";
          x.globalAlpha = 0.82;
          x.fillStyle = color;
          x.fillRect(0, 0, w, h);
        }
        monkeyArt.push(c);
      });
      if (state !== "playing") draw(0);
    });
  }

  // The backdrop shows on the start screen, so it loads now. The coins, title,
  // and logo are only drawn in play, so they wait until the page is idle.
  function loadThemeArt() {
    if (!theme) return;
    if (theme.backdrop) {
      picture(theme.backdrop, function (img) {
        if (!theme) return;
        backdropImg = img;
        buildBg();
        if (state !== "playing") draw(0);
      });
    }
    var later = window.requestIdleCallback || function (fn) { window.setTimeout(fn, 1200); };
    var go = function () {
      later(function () {
        if (!theme) return;
        if (theme.coins) picture(theme.coins.src, function (img) { coinImg = img; });
        if (theme.title) picture(theme.title.src, function (img) { titleImg = img; });
        if (theme.logo) picture(theme.logo.src, function (img) { logoImg = img; });
      });
    };
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go);
  }

  // Back to the plain neon look, when the track cannot play.
  function dropTheme() {
    if (!theme) return;
    theme = null;
    C = palette();
    LANE_GLOW = C.lanes;
    backdropImg = coinImg = titleImg = logoImg = null;
    root.removeAttribute("data-theme");
    if (video.el) video.el.remove();
    video.on = false;
    video.el = null;
    video.shape = null;
    loadDancer();
    resize();
  }

  // ---------- game state

  var state = "start";
  var run = null;
  var events = [];
  var evAt = 0;
  var scheduler = 0;
  var raf = 0;

  function heard() {
    if (!ctx) return 0;
    if (ctx.state === "running" && ctx.getOutputTimestamp) {
      var ts = ctx.getOutputTimestamp();
      if (ts.contextTime > 0 && ts.performanceTime > 0) {
        return ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
      }
    }
    return ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
  }

  function heardAt(event) {
    if (ctx && ctx.state === "running" && ctx.getOutputTimestamp && event && event.timeStamp) {
      var ts = ctx.getOutputTimestamp();
      if (ts.contextTime > 0 && ts.performanceTime > 0) {
        return ts.contextTime + (event.timeStamp - ts.performanceTime) / 1000;
      }
    }
    return heard();
  }

  // Seconds into the song, as heard, with the player's timing offset applied.
  function songTime() {
    return run ? heard() - run.start - totalOffset() : 0;
  }

  function show(name) {
    Object.keys(screens).forEach(function (k) {
      if (screens[k]) screens[k].hidden = k !== name;
    });
    root.classList.toggle("is-playing", !name);
    var playing = state === "playing";
    if (pauseBtn) pauseBtn.hidden = !playing;
    if (retryBtn) retryBtn.hidden = !playing;
    layoutLife();
  }

  function readBest(diff) {
    try {
      return JSON.parse(store(bestKey(diff)) || "null");
    } catch (e) {
      return null;
    }
  }

  function fmt(n) {
    return Math.round(n).toLocaleString("en-US");
  }

  function grade(score) {
    return score >= 950000 ? "S" : score >= 850000 ? "A" : score >= 750000 ? "B" : score >= 650000 ? "C" : "D";
  }

  // ---------- start screen: difficulty, speed, offset

  function updatePicker() {
    DIFFS.forEach(function (d) {
      var input = root.querySelector('input[name="difficulty"][value="' + d + '"]');
      if (!input) return;
      input.checked = d === settings.difficulty;
      var label = input.closest("label");
      var lv = label && label.querySelector("[data-lv]");
      var bestNode = label && label.querySelector("[data-diff-best]");
      var chart = charts[d] || (!useTrack ? chartFor(d) : null);
      if (lv) lv.textContent = chart && chart.length ? "Lv " + levelOf(chart) : "Lv ?";
      var best = readBest(d);
      if (bestNode) bestNode.textContent = best && best.score ? best.grade + " " + fmt(best.score) + (best.fc ? " FC" : "") : "No best yet";
    });
    if (bestEl) {
      var b = readBest();
      bestEl.textContent = b && b.score
        ? "Best on " + DIFF_NAMES[settings.difficulty] + ": " + fmt(b.score) + " (" + b.grade + (b.fc ? ", " + b.fc : "") + ", combo " + b.combo + ")"
        : "No best on " + DIFF_NAMES[settings.difficulty] + " yet. Set one.";
    }
    if (speedEl) speedEl.value = String(settings.speed);
    showOffset();
  }

  function showOffset() {
    var ms = settings.offsetMs;
    var text = (ms > 0 ? "+" : "") + ms + " ms";
    if (offsetEl) offsetEl.textContent = text;
  }

  function setOffset(ms) {
    settings.offsetMs = clampOffset(ms);
    saveSettings();
    showOffset();
  }

  // ---------- loading

  function busy(label) {
    if (startBtn) startBtn.textContent = label;
    return new Promise(function (resolve) { window.setTimeout(resolve, 30); });
  }

  function loadMaker() {
    if (window.ChartMaker) return Promise.resolve(window.ChartMaker);
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "/js/chart-maker.js";
      s.onload = function () { resolve(window.ChartMaker); };
      s.onerror = function () { reject(new Error("chart maker did not load")); };
      document.head.appendChild(s);
    });
  }

  // Fetch and decode the track, then fill in whatever the beatmap left out
  // (charts, drops, BPM, offset) by listening to it.
  function loadTrack() {
    if (!useTrack || trackReady) return Promise.resolve();
    return fetch(track.audio)
      .then(function (r) {
        if (!r.ok) throw new Error("track " + r.status);
        return r.arrayBuffer();
      })
      .then(function (data) {
        return new Promise(function (resolve, reject) {
          ctx.decodeAudioData(data, resolve, reject);
        });
      })
      .then(function (buf) {
        trackBuf = buf;
        if (trackComplete()) return setSong(track);
        return Promise.all([loadMaker(), busy("Listening to the track...")]).then(function (got) {
          var channels = [];
          for (var c = 0; c < buf.numberOfChannels; c++) channels.push(buf.getChannelData(c));
          var made = got[0].analyze({
            sampleRate: buf.sampleRate,
            mix: got[0].toMono(channels),
            bpm: isSet(track.bpm) ? track.bpm : null,
            offset: isSet(track.offset) ? track.offset : null
          });
          var given = chartsOf(track);
          var all = {};
          var madeNames = [];
          DIFFS.forEach(function (d) {
            all[d] = given[d] || parseChart(made.charts[d]) || [];
            if (!given[d]) madeNames.push(d);
          });
          setSong({
            bpm: made.bpm,
            offset: made.offset,
            sections: track.sections && track.sections.length ? track.sections : made.sections,
            madeCharts: all
          });
          if (window.console) {
            console.info("Monkey Drop: made the " + madeNames.join(", ") + " charts from the track. BPM " + made.bpm + ", offset " + made.offset + " s. For cleaner charts, run the beatmap maker on the stems (/tools/beatmap/).");
          }
        });
      })
      .then(function () { trackReady = true; });
  }

  function begin() {
    if (!ensureAudio()) {
      state = "start";
      if (bestEl) bestEl.textContent = "This browser cannot play Web Audio, so the game cannot run here.";
      return;
    }
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = useTrack && !trackReady ? "Loading the track..." : "Get ready...";
    }
    var fonts = document.fonts && document.fonts.load ? document.fonts.load("800 32px " + FONT).catch(function () {}) : Promise.resolve();
    Promise.all([fonts, ctx.resume(), loadTrack().catch(fallBack)]).then(startRun);
  }

  // The track is missing or broken: play the placeholder beat instead, and say so.
  function fallBack(err) {
    if (window.console) console.warn("Monkey Drop: could not use " + track.audio + " (" + (err && err.message) + "). Playing the placeholder beat.");
    useTrack = false;
    trackBuf = null;
    dropTheme();
    setSong(map.placeholder);
    if (creditEl) creditEl.textContent = "The track did not load, so this is the placeholder beat.";
    showSong();
    updatePicker();
  }

  function quant(beat) {
    var f = beat - Math.floor(beat);
    function near(v) { return Math.abs(f - v) < 0.02; }
    if (near(0) || near(1)) return 0;
    if (near(0.5)) return 1;
    if (near(0.25) || near(0.75)) return 2;
    return 3;
  }

  function startRun() {
    stopAudio();
    bus = ctx.createGain();
    bus.connect(master);
    var diff = settings.difficulty;
    var list = chartFor(diff);
    var lead = useTrack ? 1.6 : 0.25;
    var notes = list.map(function (n) {
      return {
        t: offset + n.beat * spb,
        beat: n.beat,
        lane: n.lane,
        len: n.len,
        endT: offset + (n.beat + n.len) * spb,
        q: quant(n.beat),
        judged: false,
        done: false,
        result: "",
        hold: "",
        released: null
      };
    });
    var holds = notes.filter(function (n) { return n.len > 0; }).length;
    run = {
      diff: diff,
      speed: settings.speed,
      start: ctx.currentTime + lead,
      notes: notes,
      first: 0,
      active: [],
      taps: notes.length,
      holds: holds,
      unit: 1000000 / Math.max(1, notes.length + holds),
      points: 0,
      combo: 0,
      maxCombo: 0,
      counts: { marvelous: 0, perfect: 0, great: 0, good: 0, miss: 0, ok: 0, ng: 0 },
      offsets: [],
      life: 50,
      lifeShown: 50,
      missStreak: 0,
      failing: 0,
      judge: null,
      lanePop: [null, null, null, null],
      shout: null,
      flash: [0, 0, 0, 0],
      down: [0, 0, 0, 0],
      hitFx: [0, 0, 0, 0],
      rings: [],
      particles: [],
      coins: [],
      cheer: 0,
      squash: 0,
      wince: 0,
      shake: 0,
      white: 0,
      comboBump: 0,
      lastBeat: -1
    };
    var lastEnd = 0;
    notes.forEach(function (n) { lastEnd = Math.max(lastEnd, n.endT); });
    run.end = useTrack
      ? Math.min(trackBuf.duration, lastEnd + 4)
      : Math.max(totalBeats * spb, lastEnd + 1.5);
    run.end = Math.max(run.end, lastEnd + 0.6);
    pointerLanes = {};
    keyLanes = {};
    setupVideo();
    if (useTrack) {
      trackSource = ctx.createBufferSource();
      trackSource.buffer = trackBuf;
      trackSource.connect(bus);
      trackSource.start(run.start);
    } else {
      events = arrange();
      evAt = 0;
      schedule();
      scheduler = window.setInterval(schedule, 25);
    }
    state = "playing";
    show(null);
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = "Start";
    }
    var box = root.getBoundingClientRect();
    if (box.top < 0 || box.bottom > window.innerHeight) {
      root.scrollIntoView({ block: box.height > window.innerHeight ? "start" : "nearest", behavior: calm() ? "auto" : "smooth" });
    }
    canvas.focus({ preventScroll: true });
    lastFrame = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function schedule() {
    if (!run || state !== "playing" || !ctx || run.failing) return;
    var horizon = ctx.currentTime + 0.2;
    while (evAt < events.length) {
      var e = events[evAt];
      var time = run.start + e.b * spb;
      if (time > horizon) break;
      if (time >= ctx.currentTime - 0.02) e.f(time);
      evAt++;
    }
  }

  function stopAudio() {
    window.clearInterval(scheduler);
    scheduler = 0;
    if (trackSource) {
      try { trackSource.stop(); } catch (e) {}
      trackSource = null;
    }
    if (bus && ctx) {
      var old = bus;
      old.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      window.setTimeout(function () { old.disconnect(); }, 400);
      bus = null;
    }
  }

  function letGoOfEverything() {
    pointerLanes = {};
    keyLanes = {};
    if (!run) return;
    run.down = [0, 0, 0, 0];
    var t = songTime();
    run.active.forEach(function (n) {
      if (n.hold === "holding" && n.released == null) n.released = t;
    });
  }

  function pause() {
    if (state !== "playing") return;
    state = "paused";
    letGoOfEverything();
    stopVideo();
    ctx.suspend();
    window.clearInterval(scheduler);
    show("pause");
    var resumeBtn = screens.pause && screens.pause.querySelector("[data-resume]");
    if (resumeBtn) resumeBtn.focus();
  }

  function resume() {
    if (state !== "paused") return;
    ctx.resume().then(function () {
      state = "playing";
      show(null);
      if (!useTrack) scheduler = window.setInterval(schedule, 25);
      canvas.focus({ preventScroll: true });
      lastFrame = 0;
      raf = requestAnimationFrame(frame);
    });
  }

  function retry() {
    if (state === "loading") return;
    if (ctx && ctx.state === "suspended") ctx.resume();
    cancelAnimationFrame(raf);
    state = "loading";
    begin();
  }

  function quit() {
    if (ctx && ctx.state === "suspended") ctx.resume();
    stopAudio();
    stopCalibration();
    stopVideo(true);
    run = null;
    state = "start";
    cancelAnimationFrame(raf);
    updatePicker();
    show("start");
    draw(0);
    if (startBtn) startBtn.focus();
  }

  function finish(failed) {
    state = "results";
    cancelAnimationFrame(raf);
    stopVideo();
    stopAudio();
    letGoOfEverything();
    var c = run.counts;
    var flawless = !failed && c.marvelous === run.taps && c.ok === run.holds && run.taps > 0;
    var score = flawless ? 1000000 : Math.min(1000000, Math.floor(run.points / 10 + 1e-6) * 10);
    var letter = failed ? "D" : grade(score);
    var fc = "";
    if (!failed && run.taps > 0 && c.miss === 0 && c.ng === 0) {
      fc = c.good ? "Full combo" : c.great ? "Great full combo" : c.perfect ? "Perfect full combo" : "Marvelous full combo";
    }
    var best = readBest(run.diff);
    var isBest = score > 0 && (!best || score > best.score);
    if (isBest) {
      store(bestKey(run.diff), JSON.stringify({ score: score, grade: letter, combo: run.maxCombo, fc: fc ? fc.replace(" full combo", " FC").replace("Full combo", "FC") : "" }));
    }
    var hits = run.offsets.length;
    var avg = hits ? (run.offsets.reduce(function (a, b) { return a + b; }, 0) / hits) * 1000 : 0;
    run.avgMs = Math.round(avg);

    var el = screens.results;
    function set(name, value) {
      var node = el.querySelector('[data-r="' + name + '"]');
      if (node) node.textContent = value;
    }
    set("grade", letter);
    set("status", failed ? "Stage failed" : "Cleared");
    set("score", fmt(score));
    set("marvelous", c.marvelous);
    set("perfect", c.perfect);
    set("great", c.great);
    set("good", c.good);
    set("miss", c.miss);
    set("holds", run.holds ? c.ok + " / " + run.holds : "None");
    set("combo", run.maxCombo);
    set("difficulty", DIFF_NAMES[run.diff] + ", " + run.speed + "x");
    set("timing", !hits ? "No hits" : Math.abs(run.avgMs) < 5 ? "On time" : (run.avgMs > 0 ? "+" : "") + run.avgMs + " ms " + (run.avgMs > 0 ? "late" : "early"));
    var fcEl = el.querySelector("[data-r-fc]");
    if (fcEl) {
      fcEl.hidden = !fc;
      fcEl.textContent = fc;
      fcEl.setAttribute("data-tier", fc ? fc.split(" ")[0].toLowerCase() : "");
    }
    var flag = el.querySelector("[data-r-best]");
    if (flag) {
      flag.hidden = false;
      flag.textContent = isBest ? "New best on " + DIFF_NAMES[run.diff] + "!" : best ? "Best on " + DIFF_NAMES[run.diff] + ": " + fmt(best.score) : "Hit a few arrows to set a best score.";
    }
    var nudge = el.querySelector("[data-nudge]");
    if (nudge) {
      var show15 = hits >= 20 && Math.abs(run.avgMs) >= 15;
      nudge.hidden = !show15;
      nudge.textContent = "Nudge offset by " + (run.avgMs > 0 ? "+" : "") + run.avgMs + " ms";
    }
    el.setAttribute("data-grade", letter);
    el.classList.toggle("is-failed", !!failed);
    show("results");
    var again = el.querySelector("[data-retry]");
    if (again) again.focus();
    draw(run.failing || run.end);
  }

  // ---------- judging

  function press(lane, event) {
    if (state !== "playing" || !run || run.failing) return;
    run.flash[lane] = 1;
    var t = heardAt(event) - run.start - totalOffset();
    for (var a = 0; a < run.active.length; a++) {
      var h = run.active[a];
      if (h.lane === lane && h.hold === "holding" && h.released != null) {
        h.released = null;
        return;
      }
    }
    var pick = null;
    for (var i = run.first; i < run.notes.length; i++) {
      var n = run.notes[i];
      if (n.t > t + MISS_AFTER) break;
      if (n.judged || n.lane !== lane) continue;
      if (Math.abs(n.t - t) <= MISS_AFTER) {
        pick = n;
        break;
      }
    }
    if (!pick) return;
    var dt = t - pick.t;
    var gap = Math.abs(dt);
    for (var w = 0; w < WINDOWS.length; w++) {
      if (gap <= WINDOWS[w].w) {
        judgeHead(pick, WINDOWS[w].name, dt);
        return;
      }
    }
  }

  function release(lane, event) {
    if (!run || state !== "playing") return;
    var t = heardAt(event) - run.start - totalOffset();
    run.active.forEach(function (n) {
      if (n.lane !== lane || n.hold !== "holding" || n.released != null) return;
      if (t >= n.endT - HOLD_EARLY_OK) holdOk(n);
      else n.released = t;
    });
  }

  function pointsFor(kind) {
    var u = run.unit;
    return kind === "marvelous" || kind === "ok" ? u : kind === "perfect" ? u - 10 : kind === "great" ? u * 0.6 : kind === "good" ? u * 0.2 : 0;
  }

  function changeLife(delta) {
    run.life = Math.max(0, Math.min(100, run.life + delta));
    if (run.life <= 0 && !run.failing && !MISS_STREAK_FAIL[run.diff]) fail();
  }

  function addCombo() {
    run.combo++;
    run.comboBump = 1;
    run.maxCombo = Math.max(run.maxCombo, run.combo);
    if (run.combo === 50 || run.combo % 100 === 0) {
      run.shout = { text: run.combo + " COMBO!", at: songTime(), combo: true };
      burst(L.sk.x, L.sk.y, C.shout, 26);
      run.cheer = 1;
      rainCoins(run.combo === 50 ? 14 : 22, run.combo % 100 === 0);
    } else if (run.combo === 25) {
      run.cheer = 0.6;
      rainCoins(8);
    }
  }

  function breakCombo() {
    run.combo = 0;
    run.wince = 1;
  }

  function judgeHead(n, kind, dt) {
    n.judged = true;
    n.result = kind;
    run.counts[kind]++;
    run.points += pointsFor(kind);
    run.offsets.push(dt);
    run.missStreak = 0;
    addCombo();
    var gain = kind === "marvelous" || kind === "perfect" ? (run.diff === "easy" ? 2 : 1.2) : kind === "great" ? 0.6 : 0;
    changeLife(gain);
    run.judge = { kind: kind, at: songTime(), early: dt < 0 };
    run.hitFx[n.lane] = 1;
    run.squash = 1;
    run.rings.push({ lane: n.lane, at: songTime(), color: kind === "marvelous" ? "#ffffff" : JUDGE[kind].color });
    burst(L.x + (n.lane + 0.5) * L.laneW, L.recY, kind === "marvelous" ? LANE_GLOW[n.lane] : JUDGE[kind].color, kind === "marvelous" ? 16 : kind === "perfect" ? 12 : 6);
    if (n.len > 0) {
      n.hold = "holding";
      run.active.push(n);
    } else {
      n.done = true;
    }
  }

  function miss(n) {
    n.judged = true;
    n.done = true;
    n.result = "miss";
    run.counts.miss++;
    breakCombo();
    run.judge = { kind: "miss", at: songTime() };
    if (n.len > 0) {
      n.hold = "ng";
      run.counts.ng++;
    }
    changeLife(-MISS_LIFE[run.diff]);
    run.missStreak++;
    var limit = MISS_STREAK_FAIL[run.diff];
    if (limit && run.missStreak >= limit && !run.failing) fail();
  }

  function holdOk(n) {
    n.hold = "ok";
    n.done = true;
    run.counts.ok++;
    run.points += pointsFor("ok");
    addCombo();
    changeLife(1);
    run.lanePop[n.lane] = { kind: "ok", at: songTime() };
    run.hitFx[n.lane] = 1;
    burst(L.x + (n.lane + 0.5) * L.laneW, L.recY, "#3dfff2", 10);
  }

  function holdNg(n) {
    n.hold = "ng";
    n.done = true;
    run.counts.ng++;
    breakCombo();
    run.lanePop[n.lane] = { kind: "ng", at: songTime() };
    changeLife(-(MISS_LIFE[run.diff] - 2));
  }

  function fail() {
    run.failing = songTime();
    run.shout = { text: "FAILED", at: run.failing, big: true, bad: true };
    window.clearInterval(scheduler);
    if (bus && ctx) bus.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
  }

  function burst(x, y, color, count) {
    if (!run) return;
    if (calm()) count = Math.min(count, 3);
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = (120 + Math.random() * 320) * dpr;
      run.particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80 * dpr, life: 1, color: color, size: (2 + Math.random() * 3) * dpr });
    }
    if (run.particles.length > 300) run.particles.splice(0, run.particles.length - 300);
  }

  // ---------- coins: the theme's coin art rains on combos and the drop

  var MAX_COINS = 70;

  // Coins fall from the top, spinning. With reduced motion they fade in and out in place.
  function rainCoins(count, big) {
    if (!run || !theme || !theme.coins) return;
    var still = calm();
    if (still) count = Math.min(count, 4);
    var cells = theme.coins.count || 1;
    for (var i = 0; i < count; i++) {
      var hero = big && i === 0;
      var size = (hero ? 120 : 40 + Math.random() * 40) * dpr;
      run.coins.push({
        x: hero ? L.sk.x : Math.random() * W,
        y: still ? L.recY + Math.random() * (L.bottom - L.recY) : -size - Math.random() * H * (hero ? 0 : 0.4),
        vx: (Math.random() - 0.5) * 60 * dpr,
        vy: (60 + Math.random() * 140) * dpr,
        rot: (Math.random() - 0.5) * 0.8,
        vr: (Math.random() - 0.5) * 2,
        spin: Math.random() * Math.PI * 2,
        vs: (4 + Math.random() * 6) * (Math.random() < 0.5 ? -1 : 1),
        // The last cell is the 19K coin: the big one, and now and then a small one.
        cell: hero || Math.random() < 0.08 ? cells - 1 : Math.floor(Math.random() * Math.max(1, cells - 1)),
        size: size,
        age: 0,
        still: still
      });
    }
    if (run.coins.length > MAX_COINS) run.coins.splice(0, run.coins.length - MAX_COINS);
  }

  function moveCoins(dt) {
    for (var i = run.coins.length - 1; i >= 0; i--) {
      var co = run.coins[i];
      co.age += dt;
      if (co.still) {
        if (co.age > 1.6) run.coins.splice(i, 1);
        continue;
      }
      co.vy = Math.min(co.vy + 520 * dpr * dt, 560 * dpr);
      co.x += co.vx * dt;
      co.y += co.vy * dt;
      co.rot += co.vr * dt;
      co.spin += co.vs * dt;
      if (co.y - co.size > H) run.coins.splice(i, 1);
    }
  }

  function drawCoins(r) {
    if (!coinImg || !r.coins.length) return;
    var cell = theme.coins.cell;
    var base = g.getTransform();
    for (var i = 0; i < r.coins.length; i++) {
      var co = r.coins[i];
      var a = co.still ? Math.min(1, co.age / 0.3, (1.6 - co.age) / 0.4) : 1;
      if (a <= 0 || co.y < -co.size) continue;
      // Spinning is the coin turning edge-on and back: a squeeze, the art itself is untouched.
      var sq = co.still ? 1 : Math.max(0.12, Math.abs(Math.cos(co.spin)));
      var cos = Math.cos(co.rot);
      var sin = Math.sin(co.rot);
      g.setTransform(cos * sq, sin * sq, -sin, cos, co.x + base.e, co.y + base.f);
      g.globalAlpha = a * 0.92;
      g.drawImage(coinImg, co.cell * cell, 0, cell, cell, -co.size / 2, -co.size / 2, co.size, co.size);
    }
    g.setTransform(base);
    g.globalAlpha = 1;
  }

  // ---------- the optional background video (see "video" in the theme, js/beatmap.js)

  var video = { on: false, el: null, shape: null, still: false, failed: false, seekAt: 0 };

  // Puts the backdrop in when Start is pressed (never before, so the page itself
  // never waits on it), and swaps it when the screen turns between wide and tall.
  // Reduced motion and Save-Data get the still only. The still is also the
  // video's poster, so it shows while the video loads or if it cannot play.
  function setupVideo() {
    var want = theme && theme.video;
    if (!want) return;
    var shape = canvas.clientHeight > canvas.clientWidth && want.vertical ? "vertical" : "landscape";
    var files = want[shape] || want.vertical;
    var still = calm() || !!(navigator.connection && navigator.connection.saveData);
    if (video.el && video.shape === shape && video.still === still) return;
    if (video.el) video.el.remove();
    video.on = false;
    video.failed = false;
    video.shape = shape;
    video.still = still;
    var el;
    if (still) {
      el = document.createElement("img");
      el.alt = "";
      el.decoding = "async";
      el.addEventListener("load", function () { showVideo(el); });
      el.src = files.still;
    } else {
      el = document.createElement("video");
      el.muted = true;
      el.defaultMuted = true;
      el.playsInline = true;
      el.setAttribute("playsinline", "");
      el.setAttribute("muted", "");
      el.disablePictureInPicture = true;
      el.preload = "auto";
      el.tabIndex = -1;
      if (files.still) {
        el.poster = files.still;
        var poster = new Image();
        poster.onload = function () { showVideo(el); };
        poster.src = files.still;
      }
      [["webm", 'video/webm; codecs="vp9"'], ["mp4", "video/mp4"]].forEach(function (kind, i, all) {
        if (!files[kind[0]]) return;
        var src = document.createElement("source");
        src.src = files[kind[0]];
        src.type = kind[1];
        // When the last source fails, the poster stays up as the still.
        src.addEventListener("error", function () { if (i === all.length - 1) video.failed = true; });
        el.appendChild(src);
      });
      el.addEventListener("loadeddata", function () { showVideo(el); });
    }
    el.className = "game-video";
    el.setAttribute("aria-hidden", "true");
    root.insertBefore(el, canvas);
    video.el = el;
  }

  function showVideo(el) {
    if (!theme || video.el !== el || video.on) return;
    video.on = true;
    el.classList.add("is-on");
    buildBg();
    if (state !== "playing") draw(0);
  }

  // Keeps the video on the song as heard (the player's offset does not move it).
  // Small drift is eased out with the playback rate, big drift is a seek.
  function syncVideo() {
    var v = video.el;
    if (!video.on || !v || !run || video.still || video.failed) return;
    var t = heard() - run.start;
    var end = v.duration || Infinity;
    if (state !== "playing" || run.failing || t < 0 || t >= end) {
      if (!v.paused) v.pause();
      if (t < 0 && v.currentTime > 0.05 && !v.seeking) v.currentTime = 0;
      return;
    }
    if (v.paused) {
      seekVideo(v, t);
      var go = v.play();
      if (go && go.catch) go.catch(function () {});
      return;
    }
    var drift = v.currentTime - t;
    if (Math.abs(drift) > 0.3) {
      seekVideo(v, t + 0.1);
    } else {
      v.playbackRate = drift > 0.04 ? 0.96 : drift < -0.04 ? 1.04 : 1;
    }
  }

  // One seek at a time: a new one waits until the last has landed (or half a second).
  function seekVideo(v, t) {
    var at = performance.now();
    if (v.seeking && at - video.seekAt < 500) return;
    video.seekAt = at;
    v.currentTime = Math.max(0, t);
  }

  function stopVideo(rewind) {
    if (!video.el || video.still) return;
    video.el.pause();
    if (rewind && video.on) video.el.currentTime = 0;
  }

  // ---------- frame loop

  var lastFrame = 0;

  function frame(ms) {
    if (state !== "playing") return;
    var dt = lastFrame ? Math.min(0.05, (ms - lastFrame) / 1000) : 1 / 60;
    lastFrame = ms;
    var now = songTime();
    update(now, dt);
    draw(now);
    syncVideo();
    if (run.failing && now - run.failing > 1.8) {
      finish(true);
      return;
    }
    if (!run.failing && now >= run.end) {
      finish(false);
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function update(now, dt) {
    var notes = run.notes;
    while (run.first < notes.length && notes[run.first].done && notes[run.first].endT < now - 0.8) run.first++;
    if (!run.failing) {
      for (var i = run.first; i < notes.length; i++) {
        var n = notes[i];
        if (n.t > now - MISS_AFTER) break;
        if (!n.judged) miss(n);
      }
      for (var a = run.active.length - 1; a >= 0; a--) {
        var h = run.active[a];
        if (h.hold === "holding") {
          if (h.released == null) {
            if (now >= h.endT) holdOk(h);
          } else if (now - h.released > HOLD_GRACE || now >= h.endT) {
            holdNg(h);
          }
        }
        if (h.hold !== "holding") run.active.splice(a, 1);
      }
    }

    run.lifeShown += (run.life - run.lifeShown) * Math.min(1, dt * 10);
    var fade = Math.exp(-dt * 9);
    for (var l = 0; l < LANES; l++) {
      if (!run.down[l]) run.flash[l] *= fade;
      run.hitFx[l] *= Math.exp(-dt * 7);
    }
    run.squash *= Math.exp(-dt * 10);
    run.cheer *= Math.exp(-dt * 4);
    run.wince *= Math.exp(-dt * 5);
    run.shake *= Math.exp(-dt * 12);
    run.white *= Math.exp(-dt * 6);
    run.comboBump *= Math.exp(-dt * 12);
    for (var r = run.rings.length - 1; r >= 0; r--) {
      if (now - run.rings[r].at > 0.35) run.rings.splice(r, 1);
    }

    var beat = Math.floor((now - offset) / spb);
    if (beat !== run.lastBeat && beat >= 0 && !run.failing) {
      run.lastBeat = beat;
      var drop = inDrop(beat);
      if (drop && beat === drop.from) {
        run.shout = { text: "DROP!", at: now, big: true };
        run.cheer = 1;
        rainCoins(30, true);
        if (!calm()) {
          run.white = 0.5;
          burst(L.sk.x, L.sk.y, "#ff2bd6", 30);
        }
      } else if (!calm()) {
        // A steady coin rain on the drop and on a big combo.
        var tier = run.combo >= 100 ? 2 : run.combo >= 50 ? 1 : 0;
        if (drop) rainCoins(2 + tier);
        else if (tier === 2 || (tier === 1 && beat % 2 === 0)) rainCoins(1);
      }
      if (!calm()) {
        if (drop) run.shake = Math.max(run.shake, beat === drop.from ? 1 : 0.25 + 0.35 * heat());
        if (run.combo >= 100) {
          for (var e = 0; e < 2; e++) {
            var left = Math.random() < 0.5;
            burst(left ? 0 : W, L.recY + Math.random() * (L.bottom - L.recY), "hsl(" + Math.round((beat * 37) % 360) + ",100%,65%)", 5);
          }
        }
      }
    }

    moveCoins(dt);
    for (var p = run.particles.length - 1; p >= 0; p--) {
      var q = run.particles[p];
      q.life -= dt * 1.6;
      if (q.life <= 0) {
        run.particles.splice(p, 1);
        continue;
      }
      q.vy += 900 * dpr * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
    }
  }

  function heat() {
    return run ? Math.min(1, run.combo / 100) : 0;
  }

  // ---------- drawing

  function text(str, x, y, size, color, align, glow) {
    g.font = "800 " + Math.round(size) + "px " + FONT;
    g.textAlign = align || "center";
    g.textBaseline = "middle";
    if (glow) {
      g.shadowColor = typeof color === "string" ? color : "#ff2bd6";
      g.shadowBlur = glow;
    }
    g.fillStyle = color;
    g.fillText(str, x, y);
    g.shadowBlur = 0;
  }

  function draw(now) {
    if (!bg) return;
    var r = run && state !== "start" && state !== "calibrating" ? run : null;
    var beatPos = (now - offset) / spb;
    var phase = beatPos - Math.floor(beatPos);
    var drop = r && !r.failing ? inDrop(beatPos) : null;
    var still = calm();
    var h = r ? heat() : 0;
    var pulse = r && beatPos >= 0 && !r.failing ? Math.pow(1 - phase, 3) : 0;

    g.setTransform(1, 0, 0, 1, 0, 0);
    if (video.on) g.clearRect(0, 0, W, H);
    g.drawImage(bg, 0, 0);
    if (r && r.shake > 0.01 && !still) {
      g.translate((Math.random() - 0.5) * 12 * dpr * r.shake, (Math.random() - 0.5) * 12 * dpr * r.shake);
    }

    // The screen breathes with the beat, harder with a big combo and on the drop.
    if (r && !still && pulse > 0.01) {
      var amt = pulse * (0.03 + 0.07 * h) * (drop ? 2 : 1);
      g.fillStyle = "rgba(" + (drop && Math.floor(beatPos) % 2 ? C.dropPulse : C.pulse) + "," + amt.toFixed(3) + ")";
      g.fillRect(-20, -20, W + 40, H + 40);
    }
    if (r && r.combo >= 100) drawEdgeGlow(beatPos, pulse, still);

    drawMonkey(now, beatPos, phase, drop, still);
    if (r) drawCoins(r);

    if (r && r.combo >= 25 && !r.failing) {
      for (var lp = 0; lp < LANES; lp++) {
        var on = still ? 0.04 : 0.1 * pulse * (0.6 + h) * (drop ? 1.6 : 1);
        if (on < 0.005) continue;
        g.fillStyle = hexA(LANE_GLOW[lp], on);
        g.fillRect(L.x + lp * L.laneW + 2 * dpr, 0, L.laneW - 4 * dpr, L.bottom);
      }
    }

    drawReceptors(r, pulse, h, drop, still);
    if (r) drawArrows(r, now, beatPos);

    if (r) {
      for (var k = 0; k < r.rings.length; k++) {
        var ring = r.rings[k];
        var age = (now - ring.at) / 0.35;
        if (age < 0 || age > 1) continue;
        g.globalAlpha = 1 - age;
        g.strokeStyle = ring.color;
        g.lineWidth = 3 * dpr * (1 - age);
        g.beginPath();
        g.arc(L.x + (ring.lane + 0.5) * L.laneW, L.recY, L.arrow * (0.5 + (still ? 0.1 : 0.6) * age), 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = "lighter";
      for (var p = 0; p < r.particles.length; p++) {
        var q = r.particles[p];
        g.globalAlpha = Math.max(0, q.life);
        g.fillStyle = q.color;
        g.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
    }

    if (L.pads) drawPads(r);
    drawHud(r, now, beatPos, drop, still);

    if (r && r.failing) {
      var f = Math.min(1, (now - r.failing) / 1.2);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "rgba(20,0,8," + (0.55 * f).toFixed(3) + ")";
      g.fillRect(0, 0, W, H);
      drawShout(r, now, still);
    }

    if (r && r.white > 0.02) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "rgba(" + C.flash + "," + r.white.toFixed(3) + ")";
      g.fillRect(0, 0, W, H);
    }
  }

  function drawEdgeGlow(beatPos, pulse, still) {
    var hue = still ? 300 : (beatPos * 45) % 360;
    if (C.edgeHues) {
      // Swing between two hues (for Genre Snob, gold and pink) instead of the whole rainbow.
      var swing = still ? 0.5 : 0.5 + 0.5 * Math.sin(beatPos * Math.PI / 4);
      hue = (C.edgeHues[0] + (C.edgeHues[1] - C.edgeHues[0]) * swing + 360) % 360;
    }
    var size = (40 + (still ? 0 : 40 * pulse)) * dpr;
    var c0 = "hsla(" + Math.round(hue) + ",100%,60%,0.32)";
    var c1 = "hsla(" + Math.round(hue) + ",100%,60%,0)";
    var gl = g.createLinearGradient(0, 0, size, 0);
    gl.addColorStop(0, c0);
    gl.addColorStop(1, c1);
    g.fillStyle = gl;
    g.fillRect(0, 0, size, H);
    var gr = g.createLinearGradient(W, 0, W - size, 0);
    gr.addColorStop(0, c0);
    gr.addColorStop(1, c1);
    g.fillStyle = gr;
    g.fillRect(W - size, 0, size, H);
  }

  function drawReceptors(r, pulse, h, drop, still) {
    for (var l = 0; l < LANES; l++) {
      var cx = L.x + (l + 0.5) * L.laneW;
      var press = r ? Math.max(r.flash[l], r.down[l] ? 1 : 0) : 0;
      var scale = 1 + (still ? 0 : 0.07 * pulse) - press * 0.06;
      var sp = receptorSprites[l];
      var w = sp.width * scale;
      g.drawImage(sp, cx - w / 2, L.recY - w / 2, w, w);
      var glow = r ? Math.max(r.hitFx[l], press * 0.5, r.combo >= 50 ? 0.25 + 0.35 * pulse * (drop ? 1.5 : 1) : 0) : 0;
      if (glow > 0.02) {
        g.globalAlpha = Math.min(1, glow);
        var lit = litSprites[l];
        var lw = lit.width * (scale + (still ? 0 : 0.1 * r.hitFx[l]));
        g.drawImage(lit, cx - lw / 2, L.recY - lw / 2, lw, lw);
        g.globalAlpha = 1;
      }
    }
  }

  function drawArrows(r, now, beatPos) {
    var perBeat = (L.bottom + L.arrow - L.recY) / (8 / r.speed);
    var nowBeat = beatPos;
    var bodyW = L.arrow * 0.46;
    g.save();
    if (L.top || L.pads) {
      g.beginPath();
      g.rect(0, L.top, W, L.bottom - L.top);
      g.clip();
    }
    for (var pass = 0; pass < 2; pass++) {
      for (var i = r.first; i < r.notes.length; i++) {
        var n = r.notes[i];
        var y = L.recY + (n.beat - nowBeat) * perBeat;
        if (y > L.bottom + L.arrow) break;
        var cx = L.x + (n.lane + 0.5) * L.laneW;
        var holding = n.hold === "holding";
        if (pass === 0) {
          if (!n.len || n.hold === "ok") continue;
          var headY = holding ? L.recY : y;
          var tailY = L.recY + (n.beat + n.len - nowBeat) * perBeat;
          if (tailY < -L.arrow || tailY <= headY) continue;
          var color = QUANT_COLORS[n.q];
          var dead = n.hold === "ng" || n.result === "miss";
          var slipping = holding && n.released != null;
          var gb = g.createLinearGradient(0, headY, 0, tailY);
          gb.addColorStop(0, dead ? "rgba(120,110,130,0.35)" : hexA(color, holding && !slipping ? 0.85 : 0.5));
          gb.addColorStop(1, dead ? "rgba(120,110,130,0.15)" : hexA(color, 0.25));
          g.fillStyle = gb;
          rr(g, cx - bodyW / 2, headY, bodyW, tailY - headY + bodyW / 2, bodyW / 2);
          g.fill();
          g.strokeStyle = dead ? "rgba(160,150,170,0.4)" : "rgba(255,255,255," + (holding && !slipping ? 0.8 : 0.45) + ")";
          g.lineWidth = 1.5 * dpr;
          g.stroke();
        } else {
          if (n.result && n.result !== "miss") continue;
          if (y < -L.arrow) continue;
          var sp = noteSprites[n.q][n.lane];
          g.globalAlpha = n.result === "miss" ? 0.28 : 1;
          g.drawImage(sp, cx - sp.width / 2, y - sp.height / 2);
          g.globalAlpha = 1;
        }
      }
    }
    g.restore();
    // A held arrow stays lit on its target until the hold ends.
    for (var a = 0; a < r.active.length; a++) {
      var h = r.active[a];
      if (h.hold !== "holding") continue;
      var hs = noteSprites[h.q][h.lane];
      g.globalAlpha = h.released != null ? 0.45 : 1;
      g.drawImage(hs, L.x + (h.lane + 0.5) * L.laneW - hs.width / 2, L.recY - hs.height / 2);
      g.globalAlpha = 1;
    }
  }

  function drawPads(r) {
    var top = L.bottom + 6 * dpr;
    var ph = L.padH - 14 * dpr;
    for (var l = 0; l < LANES; l++) {
      var x = L.x + l * L.laneW + 4 * dpr;
      var w = L.laneW - 8 * dpr;
      var on = r ? Math.max(r.down[l] ? 1 : 0, r.flash[l] * 0.8) : 0;
      rr(g, x, top, w, ph, 18 * dpr);
      g.fillStyle = hexA(LANE_GLOW[l], 0.07 + 0.3 * on);
      g.fill();
      g.lineWidth = 2 * dpr;
      g.strokeStyle = hexA(LANE_GLOW[l], 0.45 + 0.5 * on);
      if (on > 0.05) {
        g.shadowColor = LANE_GLOW[l];
        g.shadowBlur = 18 * dpr * on;
      }
      g.stroke();
      g.shadowBlur = 0;
      var sp = on > 0.3 ? litSprites[l] : receptorSprites[l];
      var size = Math.min(ph * 0.9, sp.width * 0.75);
      g.drawImage(sp, x + w / 2 - size / 2, top + ph / 2 - size / 2, size, size);
    }
  }

  function drawMonkey(now, beatPos, phase, drop, still) {
    if (!monkeyArt.length) return;
    var r = run && state !== "start" && state !== "calibrating" ? run : null;
    var combo = r ? r.combo : 0;
    var tier = combo >= 100 ? 3 : combo >= 50 ? 2 : combo >= 25 ? 1 : 0;
    var playing = r && beatPos >= 0 && !r.failing;
    var pulse = playing ? Math.pow(1 - phase, 3) : 0;
    var size = L.sk.size;
    var scale = 1;
    var sx = 1;
    var sy = 1;
    var rot = 0;
    var hop = 0;
    var art = 0;
    var dx = 0;

    if (!still && playing) {
      var bounce = pulse * (0.05 + 0.04 * tier + (drop ? 0.14 : 0));
      scale = 1 + bounce + (drop ? 0.1 : 0);
      sx = 1 + r.squash * 0.12;
      sy = 1 - r.squash * 0.1;
      var wild = drop || tier >= 2;
      hop = -(wild ? Math.abs(Math.sin(beatPos * Math.PI)) * (0.08 + 0.04 * tier + (drop ? 0.06 : 0)) : bounce * 0.6) * size;
      rot = wild ? Math.sin(beatPos * Math.PI) * (0.1 + 0.05 * tier + (drop ? 0.1 : 0)) : tier >= 1 ? Math.sin(beatPos * Math.PI) * 0.06 : 0;
      dx = r.wince * Math.sin(now * 70) * 10 * dpr + (tier >= 2 ? Math.sin(beatPos * Math.PI * 0.5) * size * 0.05 : 0);
      art = drop ? Math.floor(beatPos * 2) % 3 : tier >= 2 ? Math.floor(beatPos) % 3 : 0;
    } else if (playing && (drop || tier >= 2)) {
      art = Math.floor(beatPos / 4) % 3;
    }
    if (!r && !still) hop = Math.sin(performance.now() / 600) * 6 * dpr;
    // A jump for combo milestones and the drop.
    if (r && !still && r.cheer > 0.01) {
      hop -= Math.sin(Math.min(1, r.cheer) * Math.PI) * 0.14 * size;
      scale *= 1 + 0.08 * r.cheer;
    }

    var cx = L.sk.x + dx;
    var cy = L.sk.y + hop;
    var dim = L.sk.dim + (L.sk.dim < 1 && drop ? 0.12 : 0);
    var haloSize = size * (0.62 + pulse * ((drop ? 0.3 : 0.08) + 0.12 * heat()));
    var halo = g.createRadialGradient(cx, cy, 0, cx, cy, haloSize);
    var haloRgb = drop && Math.floor(beatPos) % 2 ? C.dropPulse : C.glow;
    halo.addColorStop(0, "rgba(" + haloRgb + "," + ((drop ? 0.6 : 0.36) * Math.min(1, dim * 2)).toFixed(3) + ")");
    halo.addColorStop(1, "rgba(" + haloRgb + ",0)");
    g.fillStyle = halo;
    g.fillRect(cx - haloSize, cy - haloSize, haloSize * 2, haloSize * 2);

    g.save();
    g.translate(cx, cy);
    g.rotate(rot);
    g.scale(scale * sx, scale * sy);
    g.globalAlpha = dim * (r ? 1 - r.wince * 0.35 : 1);
    var sh = size * monkeyAspect;
    var sprite = monkeyArt[art] || monkeyArt[0];
    g.drawImage(sprite, -size / 2, -sh / 2, size, sh);
    // On the drop the dancer lights up on each beat (the same art, added on top).
    if (theme && drop && !still && pulse > 0.05) {
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = pulse * 0.32 * dim;
      g.drawImage(sprite, -size / 2, -sh / 2, size, sh);
      g.globalCompositeOperation = "source-over";
    }
    g.restore();
    g.globalAlpha = 1;
  }

  function lifeColor(life) {
    return life < 25 ? "#ff4d6d" : life >= 100 ? "#d6ff4a" : null;
  }

  function drawHud(r, now, beatPos, drop, still) {
    if (!r) return;
    var lb = L.life;
    var shown = r.lifeShown / 100;
    rr(g, lb.x, lb.y, lb.w, lb.h, lb.h / 2);
    g.fillStyle = "rgba(255,255,255,0.08)";
    g.fill();
    g.lineWidth = 1.5 * dpr;
    g.strokeStyle = "rgba(255,255,255,0.3)";
    g.stroke();
    if (shown > 0.005) {
      var solid = lifeColor(r.life);
      var lg = g.createLinearGradient(lb.x, 0, lb.x + lb.w, 0);
      lg.addColorStop(0, solid || C.life[0]);
      lg.addColorStop(1, solid || C.life[1]);
      var danger = r.life < 25 && !still ? 0.55 + 0.45 * Math.abs(Math.sin(now * 8)) : 1;
      g.globalAlpha = danger;
      g.shadowColor = solid || C.life[1];
      g.shadowBlur = 10 * dpr;
      rr(g, lb.x + 2 * dpr, lb.y + 2 * dpr, Math.max(lb.h - 4 * dpr, (lb.w - 4 * dpr) * shown), lb.h - 4 * dpr, (lb.h - 4 * dpr) / 2);
      g.fillStyle = lg;
      g.fill();
      g.shadowBlur = 0;
      g.globalAlpha = 1;
    }
    var prog = Math.max(0, Math.min(1, now / r.end));
    g.fillStyle = "rgba(255,255,255,0.08)";
    g.fillRect(lb.x, lb.y + lb.h + 5 * dpr, lb.w, 2 * dpr);
    g.fillStyle = drop ? "#ff2bd6" : C.progress;
    g.fillRect(lb.x, lb.y + lb.h + 5 * dpr, lb.w * prog, 2 * dpr);

    var scoreStr = fmt(Math.floor(r.points / 10 + 1e-6) * 10);
    if (L.hud) {
      drawSongArt();
      text("LIFE", lb.x - 10 * dpr, lb.y + lb.h / 2, 11 * dpr, "rgba(196,184,210,0.9)", "right");
      text("SCORE", L.hud.x, L.hud.y - 40 * dpr, 12 * dpr, "rgba(196,184,210,0.9)");
      text(scoreStr, L.hud.x, L.hud.y, 32 * dpr, "#f4f0f8", "center", 10 * dpr);
      text(DIFF_NAMES[r.diff].toUpperCase(), L.hud.x, L.hud.y + 54 * dpr, 16 * dpr, diffColor(r.diff), "center", 10 * dpr);
      text("SPEED " + r.speed + "x", L.hud.x, L.hud.y + 80 * dpr, 12 * dpr, "rgba(196,184,210,0.9)");
      text("MAX COMBO " + r.maxCombo, L.hud.x, L.hud.y + 104 * dpr, 12 * dpr, "rgba(196,184,210,0.9)");
    } else {
      text(scoreStr, lb.x, lb.y + lb.h + 22 * dpr, 15 * dpr, "#f4f0f8", "left", 6 * dpr);
      g.font = "800 " + Math.round(15 * dpr) + "px " + FONT;
      var sw = g.measureText(scoreStr).width;
      text(DIFF_NAMES[r.diff].toUpperCase() + " " + r.speed + "x", lb.x + sw + 10 * dpr, lb.y + lb.h + 22 * dpr, 10 * dpr, diffColor(r.diff), "left");
    }

    var mid = (L.x + L.right) / 2;
    var countin = sections.length && sections[0].type === "countin" ? sections[0] : null;
    if (!r.failing) {
      if (countin && beatPos >= 0 && beatPos < countin.to) {
        var left = countin.to - Math.floor(beatPos);
        var label = left > 1 ? String(left - 1) : "GO";
        var k = still ? 0 : 1 - (beatPos - Math.floor(beatPos));
        text(label, mid, L.judgeY, (64 + 26 * k) * dpr, "#f4f0f8", "center", 24 * dpr);
      } else if (beatPos < 0) {
        text("GET READY", mid, L.judgeY, 28 * dpr, "#f4f0f8", "center", 18 * dpr);
      }
    }

    drawJudge(r, now, mid, still);

    for (var l = 0; l < LANES; l++) {
      var lp = r.lanePop[l];
      if (!lp) continue;
      var age = now - lp.at;
      if (age > 0.5) continue;
      g.globalAlpha = age > 0.35 ? (0.5 - age) / 0.15 : 1;
      text(JUDGE[lp.kind].text, L.x + (l + 0.5) * L.laneW, L.recY + L.arrow * 0.8, 15 * dpr, JUDGE[lp.kind].color, "center", 10 * dpr);
      g.globalAlpha = 1;
    }

    if (!r.failing) drawShout(r, now, still);
  }

  // The song's title and logo art in the side column, on wide screens.
  function drawSongArt() {
    if (!theme) return;
    if (titleImg) {
      var tw = Math.min(L.x * 0.72, 300 * dpr);
      var th = tw * titleImg.naturalHeight / titleImg.naturalWidth;
      g.drawImage(titleImg, L.hud.x - tw / 2, L.hud.y - 66 * dpr - th, tw, th);
    }
    if (logoImg) {
      var lw = Math.min(L.x * 0.5, 190 * dpr);
      var lh = lw * logoImg.naturalHeight / logoImg.naturalWidth;
      g.drawImage(logoImg, L.hud.x - lw / 2, L.hud.y + 128 * dpr, lw, lh);
    }
  }

  function diffColor(d) {
    return d === "easy" ? "#3dff8a" : d === "normal" ? "#3dfff2" : d === "hard" ? "#ff2bd6" : "#d6ff4a";
  }

  function drawJudge(r, now, mid, still) {
    var j = r.judge;
    var size = L.judgeSize;
    if (j && !r.failing) {
      var age = now - j.at;
      if (age >= 0 && age < 0.55) {
        var pop = still ? 1 : age < 0.08 ? 1.35 - (age / 0.08) * 0.35 : 1;
        g.globalAlpha = age > 0.38 ? (0.55 - age) / 0.17 : 1;
        var s = size * pop * (j.kind === "marvelous" ? 1.05 : 1);
        var y = L.judgeY;
        if (j.kind === "marvelous") {
          g.font = "800 " + Math.round(s) + "px " + FONT;
          var tw = g.measureText("MARVELOUS").width;
          var shift = still ? 0 : (now * 1.5) % 1;
          var grad = g.createLinearGradient(mid - tw / 2 - tw * shift, 0, mid + tw / 2 + tw * (1 - shift), 0);
          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(0.35, "#3dfff2");
          grad.addColorStop(0.7, "#ff2bd6");
          grad.addColorStop(1, "#ffffff");
          g.shadowColor = "#ff2bd6";
          g.shadowBlur = 22 * dpr;
          text("MARVELOUS", mid, y, s, grad, "center");
          g.shadowColor = "#3dfff2";
          g.shadowBlur = 10 * dpr;
          text("MARVELOUS", mid, y, s, grad, "center");
          g.shadowBlur = 0;
        } else {
          var st = JUDGE[j.kind];
          text(st.text, mid, y, s, st.color, "center", 18 * dpr);
        }
        if (j.kind === "great" || j.kind === "good") {
          text(j.early ? "EARLY" : "LATE", mid, y - s * 0.95, 12 * dpr, j.early ? "#3dbbff" : "#ff9d3d", "center", 6 * dpr);
        }
        g.globalAlpha = 1;
      }
    }
    if (r.combo >= 4 && !r.failing && state !== "results") {
      var bump = still ? 0 : r.comboBump * 0.18;
      var cs = size * 1.15 * (1 + bump) * (r.combo >= 100 ? 1.15 : 1);
      var cy = L.judgeY + size * 1.25;
      var color = r.combo >= 200 ? "hsl(" + Math.round((now * 240) % 360) + ",100%,65%)" : r.combo >= 100 ? C.combo100 : r.combo >= 50 ? C.combo50 : "#f4f0f8";
      text(String(r.combo), (L.x + L.right) / 2, cy, cs, color, "center", (r.combo >= 50 ? 18 : 8) * dpr);
      text("COMBO", (L.x + L.right) / 2, cy + cs * 0.72, 11 * dpr, "rgba(196,184,210,0.95)", "center");
    }
  }

  function drawShout(r, now, still) {
    if (!r.shout) return;
    var sAge = now - r.shout.at;
    var life = r.shout.bad ? 1.8 : 1.2;
    if (sAge < 0 || sAge > life) return;
    g.globalAlpha = sAge > life - 0.4 ? (life - sAge) / 0.4 : 1;
    var mid = (L.x + L.right) / 2;
    var big = r.shout.big;
    var y = big ? L.recY + (L.bottom - L.recY) * 0.62 : L.side ? L.sk.y + L.sk.size * 0.62 : L.recY + (L.bottom - L.recY) * 0.62;
    var x = big || !L.side ? mid : L.sk.x;
    var size = (big ? Math.min(58 * dpr, (L.right - L.x) * 0.2) : 22 * dpr) * (!still && sAge < 0.12 ? 1.25 : 1);
    text(r.shout.text, x, y, size, r.shout.bad ? "#ff4d6d" : big ? C.drop : C.shout, "center", 22 * dpr);
    g.globalAlpha = 1;
  }

  function hexA(hex, a) {
    var v = parseInt(hex.slice(1), 16);
    return "rgba(" + (v >> 16) + "," + ((v >> 8) & 255) + "," + (v & 255) + "," + Math.max(0, Math.min(1, a)).toFixed(3) + ")";
  }

  // ---------- calibration: tap along with clicks to measure your timing

  var cal = null;
  var calTimer = 0;
  var calStatus = screens.calibrate && screens.calibrate.querySelector("[data-cal-status]");
  var calCount = screens.calibrate && screens.calibrate.querySelector("[data-cal-count]");
  var calResult = screens.calibrate && screens.calibrate.querySelector("[data-cal-result]");
  var CAL_LEAD = 4;
  var CAL_TAPS = 16;
  var CAL_GAP = 0.5;

  function startCalibration() {
    if (!ensureAudio()) return;
    if (muted) setMuted(false);
    stopCalibration();
    state = "calibrating";
    show("calibrate");
    if (calResult) calResult.textContent = "";
    if (calStatus) calStatus.textContent = "Listen to 4 clicks, then tap on each of the next 16.";
    if (calCount) calCount.textContent = "0 / " + CAL_TAPS;
    var focusEl = screens.calibrate && screens.calibrate.querySelector("[data-cal-pad]");
    if (focusEl) focusEl.focus();
    ctx.resume().then(function () {
      if (state !== "calibrating") return;
      stopAudio();
      bus = ctx.createGain();
      bus.connect(master);
      var t0 = ctx.currentTime + 0.6;
      cal = { t0: t0, taps: [] };
      for (var i = 0; i < CAL_LEAD + CAL_TAPS; i++) {
        synth.click(t0 + i * CAL_GAP, i < CAL_LEAD ? 1760 : 1320);
      }
      calTimer = window.setInterval(calTick, 100);
    });
  }

  function calTick() {
    if (!cal || state !== "calibrating") return;
    var now = ctx.currentTime;
    var idx = Math.floor((now - cal.t0) / CAL_GAP) - CAL_LEAD + 1;
    if (calStatus && idx > 0 && idx <= CAL_TAPS) calStatus.textContent = "Tap on every click.";
    if (calCount) calCount.textContent = cal.taps.length + " / " + CAL_TAPS;
    if (now > cal.t0 + (CAL_LEAD + CAL_TAPS) * CAL_GAP + 0.4) {
      window.clearInterval(calTimer);
      calTimer = 0;
      var list = cal.taps.slice().sort(function (a, b) { return a - b; });
      if (list.length < 6) {
        if (calStatus) calStatus.textContent = "Not enough taps to measure. Try again, and tap on each click.";
        if (calResult) calResult.textContent = "";
      } else {
        var med = list.length % 2 ? list[(list.length - 1) / 2] : (list[list.length / 2 - 1] + list[list.length / 2]) / 2;
        setOffset(med * 1000);
        if (calStatus) calStatus.textContent = "Done. Your offset is saved.";
        if (calResult) {
          var ms = settings.offsetMs;
          calResult.textContent = "Offset " + (ms > 0 ? "+" : "") + ms + " ms" + (Math.abs(ms) < 10 ? ": your timing is spot on." : ms > 0 ? ": the arrows now wait a little for your ears." : ": the arrows now arrive a little earlier.");
        }
      }
      cal.done = true;
    }
  }

  function calTap(event) {
    if (!cal || cal.done || state !== "calibrating") return;
    var t = heardAt(event);
    var k = Math.round((t - cal.t0) / CAL_GAP);
    if (k < CAL_LEAD || k >= CAL_LEAD + CAL_TAPS) return;
    var dt = t - (cal.t0 + k * CAL_GAP);
    if (Math.abs(dt) < 0.3) cal.taps.push(dt);
    if (calCount) calCount.textContent = cal.taps.length + " / " + CAL_TAPS;
  }

  function stopCalibration() {
    window.clearInterval(calTimer);
    calTimer = 0;
    if (cal) {
      cal = null;
      stopAudio();
    }
  }

  // ---------- input

  function laneAt(clientX) {
    var rect = canvas.getBoundingClientRect();
    var x = (clientX - rect.left) * dpr;
    if (L.side && (x < L.x - L.laneW * 0.5 || x > L.right + L.laneW * 0.5)) return -1;
    return Math.max(0, Math.min(LANES - 1, Math.floor((x - L.x) / L.laneW)));
  }

  function laneDown(lane, event) {
    if (!run) return;
    run.down[lane]++;
    press(lane, event);
  }

  function laneUp(lane, event) {
    if (!run) return;
    run.down[lane] = Math.max(0, run.down[lane] - 1);
    if (!run.down[lane]) release(lane, event);
  }

  var pointerLanes = {};
  var keyLanes = {};
  canvas.addEventListener("pointerdown", function (event) {
    if (state !== "playing") return;
    event.preventDefault();
    var lane = laneAt(event.clientX);
    if (lane < 0) return;
    pointerLanes[event.pointerId] = lane;
    laneDown(lane, event);
  });
  function lift(event) {
    var lane = pointerLanes[event.pointerId];
    if (lane == null) return;
    delete pointerLanes[event.pointerId];
    laneUp(lane, event);
  }
  canvas.addEventListener("pointerup", lift);
  canvas.addEventListener("pointercancel", lift);
  canvas.addEventListener("pointerleave", lift);
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  if (screens.calibrate) {
    screens.calibrate.addEventListener("pointerdown", function (event) {
      if (event.target.closest("button")) return;
      event.preventDefault();
      calTap(event);
    });
  }

  document.addEventListener("keydown", function (event) {
    var key = String(event.key || "").toLowerCase();
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (state === "playing") {
      if (key in KEYS) {
        event.preventDefault();
        if (!event.repeat && keyLanes[key] == null) {
          keyLanes[key] = KEYS[key];
          laneDown(KEYS[key], event);
        }
        return;
      }
      if (key === "escape" || key === "p") {
        event.preventDefault();
        pause();
      }
      if (key === "m") setMuted(!muted);
    } else if (state === "paused") {
      if (key === "escape" || key === "p") {
        event.preventDefault();
        resume();
      } else if (key === "r") {
        event.preventDefault();
        retry();
      }
    } else if (state === "results") {
      if (key === "r") {
        event.preventDefault();
        retry();
      } else if (key === "escape") {
        quit();
      }
    } else if (state === "calibrating") {
      if (key in KEYS || key === " " || key === "spacebar") {
        event.preventDefault();
        if (!event.repeat) calTap(event);
      } else if (key === "escape") {
        quit();
      }
    }
  });

  document.addEventListener("keyup", function (event) {
    var key = String(event.key || "").toLowerCase();
    var lane = keyLanes[key];
    if (lane == null) return;
    delete keyLanes[key];
    laneUp(lane, event);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pause();
  });
  window.addEventListener("blur", pause);

  if (startBtn) startBtn.addEventListener("click", function () { state = "loading"; begin(); });
  if (muteBtn) {
    setMuted(muted);
    muteBtn.addEventListener("click", function () { setMuted(!muted); });
  }
  if (pauseBtn) pauseBtn.addEventListener("click", pause);
  if (retryBtn) retryBtn.addEventListener("click", retry);
  root.addEventListener("click", function (event) {
    var el = event.target.closest("[data-resume], [data-quit], [data-retry], [data-calibrate], [data-cal-again], [data-cal-done], [data-nudge], [data-offset-step]");
    if (!el) return;
    if (el.hasAttribute("data-resume")) resume();
    else if (el.hasAttribute("data-quit") || el.hasAttribute("data-cal-done")) quit();
    else if (el.hasAttribute("data-retry")) retry();
    else if (el.hasAttribute("data-calibrate") || el.hasAttribute("data-cal-again")) startCalibration();
    else if (el.hasAttribute("data-offset-step")) setOffset(settings.offsetMs + Number(el.getAttribute("data-offset-step")));
    else if (el.hasAttribute("data-nudge") && run) {
      setOffset(settings.offsetMs + run.avgMs);
      el.hidden = true;
      var flag = screens.results.querySelector("[data-r-best]");
      if (flag) flag.textContent = "Offset is now " + (settings.offsetMs > 0 ? "+" : "") + settings.offsetMs + " ms. Retry to feel it.";
    }
  });
  root.addEventListener("change", function (event) {
    var el = event.target;
    if (el.name === "difficulty" && DIFFS.indexOf(el.value) > -1) {
      settings.difficulty = el.value;
      saveSettings();
      updatePicker();
    } else if (el === speedEl && SPEEDS.indexOf(Number(el.value)) > -1) {
      settings.speed = Number(el.value);
      saveSettings();
    }
  });

  if (creditEl) creditEl.textContent = creditLine() + ".";
  showSong();

  window.addEventListener("resize", resize);
  // Turning reduced motion on mid-song swaps the video for the still (and back).
  if (motionQuery && motionQuery.addEventListener) {
    motionQuery.addEventListener("change", function () { if (video.el) setupVideo(); });
  }

  // Open /play/?debug to read the clock from the console or an automated test.
  if (/[?&]debug\b/.test(window.location.search)) {
    window.monkeyDrop = {
      songTime: songTime,
      heard: heard,
      state: function () { return state; },
      notes: function () { return run ? run.notes.map(function (n) { return [n.t, n.lane, n.result, n.len ? n.endT : 0, n.hold]; }) : []; },
      combo: function () { return run ? run.combo : 0; },
      score: function () { return run ? Math.floor(run.points / 10 + 1e-6) * 10 : 0; },
      life: function () { return run ? run.life : 0; },
      missStreak: function () { return run ? run.missStreak : 0; },
      counts: function () { return run ? JSON.parse(JSON.stringify(run.counts)) : null; },
      settings: function () { return JSON.parse(JSON.stringify(settings)); },
      theme: function () {
        var v = video.el;
        return {
          name: theme ? theme.name : null,
          art: { dancer: monkeyArt.length, coins: !!coinImg, title: !!titleImg, logo: !!logoImg, backdrop: !!backdropImg },
          coins: run ? run.coins.length : 0,
          video: v ? { on: video.on, shape: video.shape, still: video.still, failed: video.failed, src: v.currentSrc, time: v.currentTime || 0, paused: !!v.paused, rate: v.playbackRate || 0, song: run ? heard() - run.start : 0 } : null
        };
      },
      calibration: function () { return cal ? { t0: cal.t0, taps: cal.taps.slice(), done: !!cal.done } : null; },
      song: function () {
        var counts = {};
        DIFFS.forEach(function (d) { counts[d] = (charts[d] || []).length; });
        return { track: useTrack, bpm: Math.round((60 / spb) * 100) / 100, offset: offset, charts: counts, sections: sections.map(function (s) { return s.type + ":" + s.bars; }) };
      }
    };
  }

  updatePicker();
  show("start");
  loadDancer();
  loadThemeArt();
  resize();
  root.classList.add("is-ready");
})();
