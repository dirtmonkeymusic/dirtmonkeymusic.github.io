// You do not need to edit this file.
// Skwish Drop, the rhythm game at /play/.
// The song, the notes, and the drops live in js/beatmap.js.
//
// Timing uses the Web Audio clock, so notes stay locked to the music
// even if the screen stutters. The placeholder beat is synthesized here
// from the sections in the beatmap. Set BEATMAP.audio to use a real file.

(function () {
  var map = typeof BEATMAP === "undefined" ? null : BEATMAP;
  var root = document.getElementById("game");
  if (!root || !map || !map.notes) return;

  var canvas = root.querySelector("canvas");
  var g = canvas.getContext("2d");
  var screens = {
    start: root.querySelector('[data-screen="start"]'),
    pause: root.querySelector('[data-screen="pause"]'),
    results: root.querySelector('[data-screen="results"]')
  };
  var startBtn = root.querySelector("[data-start]");
  var muteBtn = root.querySelector("[data-mute]");
  var pauseBtn = root.querySelector("[data-pause]");
  var bestEl = root.querySelector("[data-best]");
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  var LANES = 4;
  var LANE_COLORS = ["#ff2bd6", "#3dfff2", "#3dfff2", "#ff2bd6"];
  var LANE_KEYS = ["D", "F", "J", "K"];
  var KEYS = { d: 0, f: 1, j: 2, k: 3, arrowleft: 0, arrowdown: 1, arrowup: 2, arrowright: 3 };
  var WIN = { perfect: 0.05, good: 0.11, miss: 0.15 };
  var POINTS = { perfect: 300, good: 120 };
  var TRAVEL = 1.45;
  var FONT = '"JetBrains Mono", ui-monospace, monospace';
  var BEST_KEY = "dm-play-best:" + map.title;

  var spb = 60 / map.bpm;
  var offset = Number(map.offset) || 0;
  var inputOffset = (Number(map.inputOffsetMs) || 0) / 1000;

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

  // ---------- song layout from the beatmap

  var sections = [];
  (function () {
    var at = 0;
    (map.sections || []).forEach(function (sec) {
      var bars = Math.max(0, Math.floor(sec.bars) || 0);
      sections.push({ type: sec.type, variant: sec.variant || 1, from: at, to: at + bars * 4, bars: bars });
      at += bars * 4;
    });
  })();
  var totalBeats = sections.length ? sections[sections.length - 1].to : 0;
  var drops = sections.filter(function (s) { return s.type === "drop"; });

  function inDrop(beat) {
    for (var i = 0; i < drops.length; i++) {
      if (beat >= drops[i].from && beat < drops[i].to) return drops[i];
    }
    return null;
  }

  var chart = map.notes
    .map(function (n) { return { beat: Number(n[0]), lane: Math.max(0, Math.min(LANES - 1, Number(n[1]) | 0)) }; })
    .filter(function (n) { return isFinite(n.beat); })
    .sort(function (a, b) { return a.beat - b.beat || a.lane - b.lane; });

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
          var bps = map.bpm / 60;
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
  var sprites = [];
  var bg = null;

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

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var cw = canvas.clientWidth;
    var ch = canvas.clientHeight;
    W = Math.max(1, Math.round(cw * dpr));
    H = Math.max(1, Math.round(ch * dpr));
    canvas.width = W;
    canvas.height = H;
    L.side = cw >= 720 && cw / ch >= 1.15;
    if (L.side) {
      L.laneW = Math.min(108 * dpr, (W * 0.42) / LANES);
      L.x = (W - L.laneW * LANES) / 2;
      L.top = 0;
      L.hitY = H * 0.84;
      L.sk = { x: L.x / 2, y: H * 0.5, size: Math.min(L.x * 0.8, H * 0.52) };
      L.hud = { x: L.x + L.laneW * LANES + L.x / 2, y: H * 0.3 };
    } else {
      // The Pause and Sound buttons sit over the top strip.
      var pad = 56 * dpr;
      var band = pad + Math.min(H * 0.2, 150 * dpr);
      L.laneW = (W - 16 * dpr) / LANES;
      L.x = 8 * dpr;
      L.top = band;
      L.pad = pad;
      L.hitY = band + (H - band) * 0.86;
      L.sk = { x: W / 2, y: pad + (band - pad) * 0.5, size: (band - pad) * 0.96 };
      L.hud = null;
    }
    L.right = L.x + L.laneW * LANES;
    L.noteW = L.laneW * 0.78;
    L.noteH = Math.max(14 * dpr, Math.min(26 * dpr, L.laneW * 0.24));
    L.speed = (L.hitY - L.top + L.noteH) / TRAVEL;

    sprites = LANE_COLORS.map(function (color) {
      var pad = 18 * dpr;
      var c = document.createElement("canvas");
      c.width = Math.ceil(L.noteW + pad * 2);
      c.height = Math.ceil(L.noteH + pad * 2);
      var x = c.getContext("2d");
      x.shadowColor = color;
      x.shadowBlur = 14 * dpr;
      x.fillStyle = color;
      rr(x, pad, pad, L.noteW, L.noteH, L.noteH / 2);
      x.fill();
      x.shadowBlur = 0;
      x.fillStyle = "rgba(255,255,255,0.75)";
      rr(x, pad + L.noteW * 0.12, pad + L.noteH * 0.22, L.noteW * 0.76, L.noteH * 0.22, L.noteH * 0.11);
      x.fill();
      return c;
    });

    bg = document.createElement("canvas");
    bg.width = W;
    bg.height = H;
    var b = bg.getContext("2d");
    b.fillStyle = "#07060a";
    b.fillRect(0, 0, W, H);
    var glow = b.createRadialGradient(L.sk.x, L.sk.y, 0, L.sk.x, L.sk.y, Math.max(W, H) * 0.6);
    glow.addColorStop(0, "rgba(255,43,214,0.16)");
    glow.addColorStop(1, "rgba(255,43,214,0)");
    b.fillStyle = glow;
    b.fillRect(0, 0, W, H);
    for (var i = 0; i < LANES; i++) {
      var lx = L.x + i * L.laneW;
      var lg = b.createLinearGradient(0, L.top, 0, H);
      lg.addColorStop(0, "rgba(255,255,255,0)");
      lg.addColorStop(1, i % 2 ? "rgba(61,255,242,0.07)" : "rgba(255,43,214,0.06)");
      b.fillStyle = lg;
      b.fillRect(lx + 2 * dpr, L.top, L.laneW - 4 * dpr, H - L.top);
    }
    b.strokeStyle = "rgba(255,255,255,0.08)";
    b.lineWidth = dpr;
    for (var j = 0; j <= LANES; j++) {
      var x0 = Math.round(L.x + j * L.laneW) + 0.5;
      b.beginPath();
      b.moveTo(x0, L.top);
      b.lineTo(x0, H);
      b.stroke();
    }
    if (state !== "playing") draw(0);
  }

  // ---------- Skwish (existing art, recolored for the light show)

  var skwishArt = [];
  (function () {
    var img = new Image();
    img.decoding = "async";
    img.onload = function () {
      [null, "#ff4fe0", "#e4ff70"].forEach(function (color) {
        var c = document.createElement("canvas");
        c.width = c.height = 512;
        var x = c.getContext("2d");
        x.drawImage(img, 0, 0, 512, 512);
        if (color) {
          x.globalCompositeOperation = "source-atop";
          x.globalAlpha = 0.82;
          x.fillStyle = color;
          x.fillRect(0, 0, 512, 512);
        }
        skwishArt.push(c);
      });
      if (state !== "playing") draw(0);
    };
    img.src = "/assets/skwish-cyan.webp";
  })();

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

  function songTime() {
    return run ? heard() - run.start : 0;
  }

  function show(name) {
    Object.keys(screens).forEach(function (k) {
      if (screens[k]) screens[k].hidden = k !== name;
    });
    root.classList.toggle("is-playing", !name);
    if (pauseBtn) pauseBtn.hidden = state !== "playing";
  }

  function readBest() {
    try {
      return JSON.parse(store(BEST_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function showBest() {
    var best = readBest();
    if (bestEl) {
      bestEl.textContent = best && best.score
        ? "Best: " + best.score.toLocaleString("en-US") + " (" + best.grade + ", combo " + best.combo + ")"
        : "No best score yet. Set one.";
    }
  }

  function loadTrack() {
    if (!map.audio || trackBuf) return Promise.resolve();
    return fetch(map.audio)
      .then(function (r) {
        if (!r.ok) throw new Error("track " + r.status);
        return r.arrayBuffer();
      })
      .then(function (data) {
        return new Promise(function (resolve, reject) {
          ctx.decodeAudioData(data, resolve, reject);
        });
      })
      .then(function (buf) { trackBuf = buf; });
  }

  function begin() {
    if (!ensureAudio()) {
      if (bestEl) bestEl.textContent = "This browser cannot play Web Audio, so the game cannot run here.";
      return;
    }
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = map.audio ? "Loading the track..." : "Get ready...";
    }
    var fonts = document.fonts && document.fonts.load ? document.fonts.load("800 32px " + FONT).catch(function () {}) : Promise.resolve();
    Promise.all([fonts, loadTrack(), ctx.resume()])
      .then(startRun)
      .catch(function () {
        if (startBtn) {
          startBtn.disabled = false;
          startBtn.textContent = "Start";
        }
        if (bestEl) bestEl.textContent = "The track did not load. Check the audio line in js/beatmap.js.";
      });
  }

  function startRun() {
    stopAudio();
    bus = ctx.createGain();
    bus.connect(master);
    var lead = map.audio ? 1.6 : 0.25;
    run = {
      start: ctx.currentTime + lead,
      notes: chart.map(function (n) { return { t: offset + n.beat * spb, beat: n.beat, lane: n.lane, done: false, result: "" }; }),
      first: 0,
      score: 0,
      combo: 0,
      maxCombo: 0,
      counts: { perfect: 0, good: 0, miss: 0 },
      judge: null,
      shout: null,
      flash: [0, 0, 0, 0],
      held: [false, false, false, false],
      hitGlow: [0, 0, 0, 0],
      particles: [],
      squash: 0,
      wince: 0,
      shake: 0,
      white: 0,
      lastBeat: -1
    };
    var lastNote = run.notes.length ? run.notes[run.notes.length - 1].t : 0;
    run.end = map.audio
      ? Math.min(trackBuf ? trackBuf.duration - offset : lastNote + 3, lastNote + 3)
      : Math.max(totalBeats * spb, lastNote + 1.5);
    run.end = Math.max(run.end, lastNote + 0.6);
    if (map.audio && trackBuf) {
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
    if (!run || state !== "playing" || !ctx) return;
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

  function pause() {
    if (state !== "playing") return;
    state = "paused";
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
      if (!map.audio) scheduler = window.setInterval(schedule, 25);
      canvas.focus({ preventScroll: true });
      lastFrame = 0;
      raf = requestAnimationFrame(frame);
    });
  }

  function quit() {
    if (ctx && ctx.state === "suspended") ctx.resume();
    stopAudio();
    run = null;
    state = "start";
    cancelAnimationFrame(raf);
    showBest();
    show("start");
    draw(0);
    if (startBtn) startBtn.focus();
  }

  function grade(acc) {
    return acc >= 95 ? "S" : acc >= 88 ? "A" : acc >= 75 ? "B" : acc >= 60 ? "C" : "D";
  }

  function finish() {
    state = "results";
    cancelAnimationFrame(raf);
    stopAudio();
    var c = run.counts;
    var total = run.notes.length || 1;
    var acc = Math.round(((c.perfect + c.good * 0.5) / total) * 1000) / 10;
    var letter = grade(acc);
    var best = readBest();
    var isBest = !best || run.score > best.score;
    if (isBest && run.score > 0) {
      store(BEST_KEY, JSON.stringify({ score: run.score, grade: letter, combo: run.maxCombo, accuracy: acc }));
    }
    var el = screens.results;
    function set(name, value) {
      var node = el.querySelector('[data-r="' + name + '"]');
      if (node) node.textContent = value;
    }
    set("grade", letter);
    set("score", run.score.toLocaleString("en-US"));
    set("accuracy", acc + "%");
    set("perfect", c.perfect);
    set("good", c.good);
    set("miss", c.miss);
    set("combo", run.maxCombo);
    var flag = el.querySelector("[data-r-best]");
    if (flag) {
      flag.hidden = false;
      flag.textContent = c.miss === 0 && isBest && run.score > 0
        ? "Full combo and a new best!"
        : c.miss === 0 ? "Full combo!" : isBest && run.score > 0 ? "New best score!"
        : best ? "Best: " + best.score.toLocaleString("en-US") : "Hit a few notes to set a best score.";
    }
    el.setAttribute("data-grade", letter);
    show("results");
    var again = el.querySelector("[data-again]");
    if (again) again.focus();
    draw(run.end);
  }

  // ---------- hits

  function press(lane, event) {
    if (state !== "playing" || !run) return;
    run.held[lane] = true;
    run.flash[lane] = 1;
    var t = heardAt(event) - run.start - inputOffset;
    var pick = null;
    var gap = 0;
    for (var i = run.first; i < run.notes.length; i++) {
      var n = run.notes[i];
      if (n.t > t + WIN.miss) break;
      if (n.done || n.lane !== lane) continue;
      gap = Math.abs(n.t - t);
      if (gap <= WIN.miss) {
        pick = n;
        break;
      }
    }
    if (!pick) return;
    if (gap <= WIN.perfect) hit(pick, "perfect");
    else if (gap <= WIN.good) hit(pick, "good");
    else miss(pick);
  }

  function release(lane) {
    if (run) run.held[lane] = false;
  }

  function multiplier(combo) {
    return 1 + Math.min(3, Math.floor(combo / 10));
  }

  var MILESTONES = [10, 25, 50, 100, 150];

  function hit(note, kind) {
    note.done = true;
    note.result = kind;
    run.counts[kind]++;
    run.combo++;
    run.maxCombo = Math.max(run.maxCombo, run.combo);
    run.score += POINTS[kind] * multiplier(run.combo);
    run.judge = { text: kind === "perfect" ? "PERFECT" : "GOOD", color: kind === "perfect" ? "#d6ff4a" : "#3dfff2", at: songTime() };
    run.squash = 1;
    run.hitGlow[note.lane] = 1;
    burst(L.x + (note.lane + 0.5) * L.laneW, L.hitY, LANE_COLORS[note.lane], kind === "perfect" ? 14 : 8);
    if (MILESTONES.indexOf(run.combo) > -1) {
      run.shout = { text: run.combo + " COMBO!", at: songTime() };
      burst(L.sk.x, L.sk.y, "#d6ff4a", 22);
    }
  }

  function miss(note) {
    note.done = true;
    note.result = "miss";
    run.counts.miss++;
    run.combo = 0;
    run.judge = { text: "MISS", color: "#ff5c8a", at: songTime() };
    run.wince = 1;
  }

  function burst(x, y, color, count) {
    if (calm()) count = Math.min(count, 4);
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = (120 + Math.random() * 320) * dpr;
      run.particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120 * dpr, life: 1, color: color, size: (2 + Math.random() * 3) * dpr });
    }
    if (run.particles.length > 260) run.particles.splice(0, run.particles.length - 260);
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
    if (state === "playing" && now >= run.end) {
      finish();
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function update(now, dt) {
    var notes = run.notes;
    while (run.first < notes.length && notes[run.first].done) run.first++;
    for (var i = run.first; i < notes.length; i++) {
      var n = notes[i];
      if (n.t > now - WIN.miss) break;
      if (!n.done) miss(n);
    }
    var fade = Math.exp(-dt * 9);
    for (var l = 0; l < LANES; l++) {
      if (!run.held[l]) run.flash[l] *= fade;
      run.hitGlow[l] *= Math.exp(-dt * 7);
    }
    run.squash *= Math.exp(-dt * 10);
    run.wince *= Math.exp(-dt * 5);
    run.shake *= Math.exp(-dt * 12);
    run.white *= Math.exp(-dt * 6);

    var beat = Math.floor((now - offset) / spb);
    if (beat !== run.lastBeat && beat >= 0) {
      run.lastBeat = beat;
      var drop = inDrop(beat);
      if (drop && !calm()) {
        run.shake = Math.max(run.shake, beat === drop.from ? 1 : 0.35);
        if (beat === drop.from) {
          run.white = 0.55;
          run.shout = { text: "DROP!", at: now, big: true };
          burst(L.sk.x, L.sk.y, "#ff2bd6", 30);
        }
      } else if (drop && beat === drop.from) {
        run.shout = { text: "DROP!", at: now, big: true };
      }
    }

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

  function text(str, x, y, size, color, align, glow) {
    g.font = "800 " + Math.round(size) + "px " + FONT;
    g.textAlign = align || "center";
    g.textBaseline = "middle";
    if (glow) {
      g.shadowColor = color;
      g.shadowBlur = glow;
    }
    g.fillStyle = color;
    g.fillText(str, x, y);
    g.shadowBlur = 0;
  }

  function draw(now) {
    if (!bg) return;
    var r = run;
    var beatPos = (now - offset) / spb;
    var phase = beatPos - Math.floor(beatPos);
    var drop = r && state !== "start" ? inDrop(beatPos) : null;
    var still = calm();

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(bg, 0, 0);
    if (r && r.shake > 0.01 && !still) {
      g.translate((Math.random() - 0.5) * 12 * dpr * r.shake, (Math.random() - 0.5) * 12 * dpr * r.shake);
    }

    if (drop && !still) {
      g.fillStyle = "rgba(255,43,214," + (0.1 * Math.pow(1 - phase, 3)).toFixed(3) + ")";
      g.fillRect(0, 0, W, H);
    }

    // Beat lines scrolling toward the hit line.
    if (r) {
      var firstBeat = Math.ceil(beatPos - 0.5);
      var lastBeat = beatPos + TRAVEL / spb + 1;
      for (var b = firstBeat; b <= lastBeat; b++) {
        var by = L.hitY - (offset + b * spb - now) * L.speed;
        if (by < L.top || by > H) continue;
        g.fillStyle = b % 4 === 0 ? "rgba(61,255,242,0.18)" : "rgba(255,255,255,0.06)";
        g.fillRect(L.x, by, L.right - L.x, b % 4 === 0 ? 2 * dpr : dpr);
      }
    }

    // Lane presses.
    for (var l = 0; l < LANES; l++) {
      var lx = L.x + l * L.laneW;
      var f = r ? Math.max(r.flash[l], r.held[l] ? 1 : 0) : 0;
      if (f > 0.02) {
        var grad = g.createLinearGradient(0, L.hitY, 0, L.hitY - L.laneW * 3);
        grad.addColorStop(0, hexA(LANE_COLORS[l], 0.35 * f));
        grad.addColorStop(1, hexA(LANE_COLORS[l], 0));
        g.fillStyle = grad;
        g.fillRect(lx + 2 * dpr, L.hitY - L.laneW * 3, L.laneW - 4 * dpr, L.laneW * 3);
      }
    }

    // Hit line and targets.
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.shadowColor = "#3dfff2";
    g.shadowBlur = 12 * dpr;
    g.fillRect(L.x, L.hitY - dpr, L.right - L.x, 2 * dpr);
    g.shadowBlur = 0;
    for (var t = 0; t < LANES; t++) {
      var cx = L.x + (t + 0.5) * L.laneW;
      var glow = r ? r.hitGlow[t] : 0;
      g.lineWidth = 2 * dpr;
      g.strokeStyle = hexA(LANE_COLORS[t], 0.55 + 0.45 * glow);
      rr(g, cx - L.noteW / 2 - 3 * dpr, L.hitY - L.noteH / 2 - 3 * dpr, L.noteW + 6 * dpr, L.noteH + 6 * dpr, L.noteH);
      g.stroke();
      if (glow > 0.05) {
        g.fillStyle = hexA(LANE_COLORS[t], 0.45 * glow);
        g.fill();
      }
      text(LANE_KEYS[t], cx, L.hitY + L.noteH + 14 * dpr, 13 * dpr, "rgba(244,240,248,0.55)");
    }

    // Notes.
    if (r) {
      for (var i = r.first; i < r.notes.length; i++) {
        var n = r.notes[i];
        var ny = L.hitY - (n.t - now) * L.speed;
        if (ny < L.top - L.noteH * 2) break;
        if (n.done && n.result !== "miss") continue;
        if (ny > H + L.noteH * 2) continue;
        var sp = sprites[n.lane];
        g.globalAlpha = n.result === "miss" ? 0.25 : 1;
        g.drawImage(sp, L.x + (n.lane + 0.5) * L.laneW - sp.width / 2, ny - sp.height / 2);
        g.globalAlpha = 1;
      }

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

    drawSkwish(now, beatPos, phase, drop, still);
    drawHud(now, beatPos, drop);

    if (r && r.white > 0.02) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "rgba(255,255,255," + r.white.toFixed(3) + ")";
      g.fillRect(0, 0, W, H);
    }
  }

  function drawSkwish(now, beatPos, phase, drop, still) {
    if (!skwishArt.length) return;
    var r = run;
    var combo = r ? r.combo : 0;
    var tier = combo >= 50 ? 3 : combo >= 25 ? 2 : combo >= 10 ? 1 : 0;
    var playing = r && state !== "start" && beatPos >= 0;
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
      var bounce = pulse * (0.05 + 0.03 * tier + (drop ? 0.14 : 0));
      scale = 1 + bounce + (drop ? 0.12 : 0);
      sx = 1 + r.squash * 0.12;
      sy = 1 - r.squash * 0.1;
      hop = -(drop ? Math.abs(Math.sin(beatPos * Math.PI)) * 0.16 : bounce * 0.6) * size;
      rot = drop ? Math.sin(beatPos * Math.PI) * 0.26 : tier >= 2 ? Math.sin(beatPos * Math.PI) * 0.07 : 0;
      dx = r.wince * Math.sin(now * 70) * 10 * dpr;
      art = drop ? Math.floor(beatPos * 2) % 3 : tier >= 3 ? Math.floor(beatPos) % 3 : 0;
    } else if (playing && drop) {
      art = Math.floor(beatPos / 4) % 3;
    }
    if (!playing && !still) hop = Math.sin(performance.now() / 600) * 6 * dpr;

    var cx = L.sk.x + dx;
    var cy = L.sk.y + hop;
    var halo = g.createRadialGradient(cx, cy, 0, cx, cy, size * (0.62 + pulse * (drop ? 0.25 : 0.08)));
    halo.addColorStop(0, drop ? "rgba(255,43,214,0.55)" : "rgba(255,43,214,0.38)");
    halo.addColorStop(1, "rgba(255,43,214,0)");
    g.fillStyle = halo;
    g.fillRect(cx - size, cy - size, size * 2, size * 2);

    g.save();
    g.translate(cx, cy);
    g.rotate(rot);
    g.scale(scale * sx, scale * sy);
    g.globalAlpha = r ? 1 - r.wince * 0.35 : 1;
    g.drawImage(skwishArt[art] || skwishArt[0], -size / 2, -size / 2, size, size);
    g.restore();
    g.globalAlpha = 1;
  }

  function drawHud(now, beatPos, drop) {
    var r = run;
    if (!r || state === "start") return;
    var big = L.side ? 1 : 0.8;
    var scoreStr = r.score.toLocaleString("en-US");
    var mult = multiplier(r.combo);

    if (L.hud) {
      text("SCORE", L.hud.x, L.hud.y - 40 * dpr, 12 * dpr, "rgba(196,184,210,0.9)");
      text(scoreStr, L.hud.x, L.hud.y, 34 * dpr, "#f4f0f8", "center", 10 * dpr);
      text("COMBO", L.hud.x, L.hud.y + 54 * dpr, 12 * dpr, "rgba(196,184,210,0.9)");
      text(String(r.combo), L.hud.x, L.hud.y + 92 * dpr, 46 * dpr, r.combo >= 10 ? "#d6ff4a" : "#f4f0f8", "center", r.combo >= 10 ? 16 * dpr : 0);
      text("x" + mult, L.hud.x, L.hud.y + 140 * dpr, 20 * dpr, mult > 1 ? "#ff2bd6" : "rgba(196,184,210,0.7)", "center", mult > 1 ? 12 * dpr : 0);
    } else {
      var hy = L.pad + (L.top - L.pad) * 0.42;
      text(scoreStr, 14 * dpr, hy, 20 * dpr, "#f4f0f8", "left", 8 * dpr);
      text("SCORE", 14 * dpr, hy + 20 * dpr, 10 * dpr, "rgba(196,184,210,0.9)", "left");
      text(String(r.combo), W - 14 * dpr, hy, 24 * dpr, r.combo >= 10 ? "#d6ff4a" : "#f4f0f8", "right", r.combo >= 10 ? 12 * dpr : 0);
      text("COMBO x" + mult, W - 14 * dpr, hy + 21 * dpr, 10 * dpr, mult > 1 ? "#ff2bd6" : "rgba(196,184,210,0.9)", "right");
    }

    // Progress along the top of the lanes.
    var prog = Math.max(0, Math.min(1, now / r.end));
    g.fillStyle = "rgba(255,255,255,0.08)";
    g.fillRect(L.x, L.top, L.right - L.x, 3 * dpr);
    g.fillStyle = drop ? "#ff2bd6" : "#3dfff2";
    g.fillRect(L.x, L.top, (L.right - L.x) * prog, 3 * dpr);

    var mid = (L.x + L.right) / 2;
    var countin = sections.length && sections[0].type === "countin" ? sections[0] : null;
    if (countin && beatPos >= 0 && beatPos < countin.to) {
      var left = countin.to - Math.floor(beatPos);
      var label = left > 1 ? String(left - 1) : "GO";
      var k = 1 - (beatPos - Math.floor(beatPos));
      text(label, mid, (L.top + L.hitY) / 2, (64 + 26 * k) * dpr * big, "#f4f0f8", "center", 24 * dpr);
    } else if (beatPos < 0) {
      text("GET READY", mid, (L.top + L.hitY) / 2, 30 * dpr * big, "#f4f0f8", "center", 18 * dpr);
    }

    if (r.judge) {
      var age = now - r.judge.at;
      if (age < 0.6) {
        var pop = age < 0.1 ? 1 + (0.1 - age) * 3 : 1;
        g.globalAlpha = age > 0.4 ? (0.6 - age) / 0.2 : 1;
        text(r.judge.text, mid, L.hitY - L.laneW * (L.side ? 1.3 : 1.6), 26 * dpr * pop * big, r.judge.color, "center", 14 * dpr);
        g.globalAlpha = 1;
      }
    }

    if (r.shout) {
      var sAge = now - r.shout.at;
      if (sAge < 1.2) {
        g.globalAlpha = sAge > 0.8 ? (1.2 - sAge) / 0.4 : 1;
        var sy = r.shout.big ? (L.top + L.hitY) * 0.42 : L.sk.y + L.sk.size * 0.62;
        var sx = r.shout.big ? mid : L.sk.x;
        if (!L.side && !r.shout.big) sy = L.top + 26 * dpr;
        text(r.shout.text, sx, sy, (r.shout.big ? 58 : 22) * dpr * big * (sAge < 0.12 ? 1.25 : 1), r.shout.big ? "#ff2bd6" : "#d6ff4a", "center", 20 * dpr);
        g.globalAlpha = 1;
      }
    }
  }

  function hexA(hex, a) {
    var v = parseInt(hex.slice(1), 16);
    return "rgba(" + (v >> 16) + "," + ((v >> 8) & 255) + "," + (v & 255) + "," + Math.max(0, Math.min(1, a)).toFixed(3) + ")";
  }

  // ---------- input

  function laneAt(clientX) {
    var rect = canvas.getBoundingClientRect();
    var x = (clientX - rect.left) * dpr;
    if (L.side && (x < L.x - L.laneW * 0.5 || x > L.right + L.laneW * 0.5)) return -1;
    return Math.max(0, Math.min(LANES - 1, Math.floor((x - L.x) / L.laneW)));
  }

  var pointerLanes = {};
  canvas.addEventListener("pointerdown", function (event) {
    if (state !== "playing") return;
    event.preventDefault();
    var lane = laneAt(event.clientX);
    if (lane < 0) return;
    pointerLanes[event.pointerId] = lane;
    press(lane, event);
  });
  function lift(event) {
    var lane = pointerLanes[event.pointerId];
    if (lane == null) return;
    delete pointerLanes[event.pointerId];
    release(lane);
  }
  canvas.addEventListener("pointerup", lift);
  canvas.addEventListener("pointercancel", lift);
  canvas.addEventListener("pointerleave", lift);
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  document.addEventListener("keydown", function (event) {
    var key = String(event.key || "").toLowerCase();
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (state === "playing") {
      if (key in KEYS) {
        event.preventDefault();
        if (!event.repeat) press(KEYS[key], event);
        return;
      }
      if (key === "escape" || key === "p") {
        event.preventDefault();
        pause();
      }
      if (key === "m") setMuted(!muted);
    } else if (state === "paused" && (key === "escape" || key === "p")) {
      event.preventDefault();
      resume();
    }
  });

  document.addEventListener("keyup", function (event) {
    var key = String(event.key || "").toLowerCase();
    if (key in KEYS) release(KEYS[key]);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pause();
  });
  window.addEventListener("blur", pause);

  if (startBtn) startBtn.addEventListener("click", begin);
  if (muteBtn) {
    setMuted(muted);
    muteBtn.addEventListener("click", function () { setMuted(!muted); });
  }
  if (pauseBtn) pauseBtn.addEventListener("click", pause);
  root.addEventListener("click", function (event) {
    var el = event.target.closest("[data-resume], [data-quit], [data-again]");
    if (!el) return;
    if (el.hasAttribute("data-resume")) resume();
    else if (el.hasAttribute("data-quit")) quit();
    else begin();
  });

  var credit = root.querySelector("[data-credit]");
  if (credit && map.credit) credit.textContent = map.credit + ".";

  window.addEventListener("resize", resize);

  // Open /play/?debug to read the clock from the console or an automated test.
  if (/[?&]debug\b/.test(window.location.search)) {
    window.skwishDrop = {
      songTime: songTime,
      state: function () { return state; },
      notes: function () { return run ? run.notes.map(function (n) { return [n.t, n.lane, n.result]; }) : []; },
      combo: function () { return run ? run.combo : 0; },
      score: function () { return run ? run.score : 0; }
    };
  }

  showBest();
  show("start");
  resize();
  root.classList.add("is-ready");
})();
