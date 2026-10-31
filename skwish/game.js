/* Skwish Stack
   One file, no build. GitHub Pages serves /skwish/ from this folder.

   ASSET CONFIG
   Drop real files on these paths and the game picks them up.
   album-art.jpg is the final SKWISH cover (1080 square).
   blob.png, blob-squish.png, and golden.png are cover cutouts
   until dedicated sprites arrive. bg.jpg and the mp3s are optional:
   missing files fall back to a drawn background and a synthesized beat.
*/
(function () {
  "use strict";

  var CONFIG = {
    assets: {
      blob: "assets/blob.png",
      blobSquish: "assets/blob-squish.png",
      golden: "assets/golden.png",
      bg: "assets/bg.jpg",
      albumArt: "assets/album-art.jpg"
    },
    // file, bpm, and title. Landing a golden Skwish unlocks the next one.
    tracks: [
      { title: "Skwish (placeholder beat)", file: "assets/tracks/skwish.mp3", bpm: 140 },
      { title: "Glass Bass (placeholder beat)", file: "assets/tracks/glass-bass.mp3", bpm: 128 },
      { title: "Laser Hour (placeholder beat)", file: "assets/tracks/laser-hour.mp3", bpm: 174 },
      { title: "Afterglow (placeholder beat)", file: "assets/tracks/afterglow.mp3", bpm: 150 }
    ],
    loopBeats: 16,
    // Perfect if the landing center is within this fraction of the sprite width.
    perfectTolerance: 0.16,
    shareUrl: "https://dirtmonkey.music/skwish/",
    storage: {
      best: "skwish-stack-best",
      tracks: "skwish-stack-tracks",
      mute: "skwish-stack-mute"
    },
    // Leaderboard hook. Off until a backend exists. submitScore is the only call.
    leaderboard: {
      enabled: false,
      endpoint: ""
    }
  };

  var CYAN = "#4EF0DC";
  var PINK = "#F25AC4";
  var PURPLE = "#8B5CFF";
  var ORANGE = "#FF9A3C";
  var GOLD = "#ffe08a";
  var TIP_ANGLE = 0.78;

  var stage = document.getElementById("stage");
  var view = document.getElementById("view");
  var ctx = view.getContext("2d", { alpha: false });
  var hud = document.getElementById("hud");
  var heightEl = document.getElementById("height");
  var bestEl = document.getElementById("best");
  var bestStartEl = document.getElementById("best-start");
  var trackEl = document.getElementById("track");
  var streakEl = document.getElementById("streak");
  var pipsEl = document.getElementById("pips");
  var muteBtn = document.getElementById("mute");
  var bannerEl = document.getElementById("banner");
  var screenStart = document.getElementById("screen-start");
  var screenOver = document.getElementById("screen-over");
  var startBtn = document.getElementById("start");
  var againBtn = document.getElementById("again");
  var downloadBtn = document.getElementById("download");
  var shareBtn = document.getElementById("share");
  var beatLink = document.getElementById("beat");
  var coverEl = document.getElementById("cover");
  var hudCoverEl = document.getElementById("hud-cover");
  var overKicker = document.getElementById("over-kicker");
  var overHeightEl = document.getElementById("over-height");
  var overBestEl = document.getElementById("over-best");
  var newBestEl = document.getElementById("new-best");
  var card = document.getElementById("card");
  var cardCtx = card.getContext("2d");
  var liveEl = document.getElementById("live");

  beatLink.href = CONFIG.shareUrl;
  coverEl.src = CONFIG.assets.albumArt;
  hudCoverEl.src = CONFIG.assets.albumArt;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = 0, H = 0, dpr = 1;
  var fieldW = 0, baseX = 0, pivotX = 0, pivotY = 0, landY = 0;
  var blobW = 140, blobH = 146, length = 150, amp = 0.9, platW = 160;
  var spriteAspect = 1.05;
  var oldBlobW = 0;

  var mode = "menu"; // menu, swing, fall, miss, tip, over
  var phase = -1.1;
  var pieces = [];
  var lean = 0, leanVel = 0, tipFactor = 0, tipSign = 1;
  var falling = null;
  var lockUntil = 0;
  var overShown = false;
  var bestAtStart = 0;
  var streak = 0, snippetBeats = 0;
  var perfects = 0, goldensLanded = 0;
  var swingingGolden = false;
  var lastGoldenAt = -1;
  var trackIndex = 0;
  var best = 0;
  var muted = false;
  var shake = 0;
  var bannerUntil = 0;
  var last = 0;
  var stars = [];
  var backdrop = null;

  var bobPos = { x: 0, y: 0, rot: 0 };
  var images = { blob: null, squish: null, golden: null, album: null, bg: null, fallback: null, glow: null, glowGold: null };
  var parts = [];
  var floats = [];
  for (var pi = 0; pi < 48; pi++) parts.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, color: CYAN, s: 3 });

  var audio = {
    ctx: null, gain: null, buffers: [], mp3: [], loading: [],
    active: null, bpm: 140, src: null, thud: null
  };

  for (var pip = 0; pip < CONFIG.loopBeats; pip++) {
    var dot = document.createElement("i");
    pipsEl.appendChild(dot);
  }

  function readNum(key) {
    try { return Math.max(0, parseInt(localStorage.getItem(key), 10) || 0); }
    catch (e) { return 0; }
  }
  function writeNum(key, n) {
    try { localStorage.setItem(key, String(n)); } catch (e) {}
  }
  function readFlag(key) {
    try { return localStorage.getItem(key) === "1"; } catch (e) { return false; }
  }

  best = readNum(CONFIG.storage.best);
  trackIndex = Math.min(readNum(CONFIG.storage.tracks), CONFIG.tracks.length - 1);
  muted = readFlag(CONFIG.storage.mute);
  bestStartEl.textContent = String(best);
  bestEl.textContent = String(best);
  setMuteLabel();

  function loadImage(url) {
    return new Promise(function (resolve) {
      if (!url) return resolve(null);
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = url;
    });
  }

  function makeFallback() {
    var c = document.createElement("canvas");
    c.width = 320;
    c.height = 336;
    var g = c.getContext("2d");
    g.clearRect(0, 0, 320, 336);
    g.fillStyle = "#7a3eab";
    g.beginPath();
    g.ellipse(160, 230, 120, 90, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = ORANGE;
    g.beginPath();
    g.ellipse(160, 130, 108, 96, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#161018";
    roundRect(g, 78, 112, 164, 36, 10);
    g.fill();
    g.fillStyle = "#f4f7ff";
    g.fillRect(96, 118, 18, 24);
    g.fillRect(206, 118, 18, 24);
    g.fillStyle = GOLD;
    g.beginPath();
    g.arc(160, 248, 22, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#2a1608";
    g.font = "700 16px 'JetBrains Mono', monospace";
    g.textAlign = "center";
    g.fillText("19K", 160, 254);
    g.textAlign = "left";
    return c;
  }

  function makeGlow(img, color) {
    var c = document.createElement("canvas");
    c.width = c.height = 160;
    var g = c.getContext("2d");
    g.shadowColor = color;
    g.shadowBlur = 24;
    g.drawImage(img, 28, 28, 104, 104);
    g.drawImage(img, 28, 28, 104, 104);
    return c;
  }

  function refreshSprites() {
    var img = images.blob || images.fallback;
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (iw && ih) spriteAspect = ih / iw;
    images.glow = makeGlow(img, CYAN);
    images.glowGold = makeGlow(images.golden || img, ORANGE);
    layout();
  }

  images.fallback = makeFallback();
  refreshSprites();

  Promise.all([
    loadImage(CONFIG.assets.blob),
    loadImage(CONFIG.assets.blobSquish),
    loadImage(CONFIG.assets.golden),
    loadImage(CONFIG.assets.albumArt),
    loadImage(CONFIG.assets.bg)
  ]).then(function (list) {
    images.blob = list[0];
    images.squish = list[1];
    images.golden = list[2];
    images.album = list[3];
    images.bg = list[4];
    refreshSprites();
    if (mode === "over") drawCard();
  });

  function layout() {
    W = stage.clientWidth || window.innerWidth;
    H = stage.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (W * H * dpr * dpr > 2400000) dpr = Math.sqrt(2400000 / (W * H));
    view.width = Math.max(1, Math.round(W * dpr));
    view.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    fieldW = Math.min(W - 16, Math.max(260, Math.min(460, H * 0.58)));
    baseX = W * 0.5;
    pivotX = baseX;
    var prevW = blobW;
    var prevSurf = surfX;
    var fallFrac = falling && prevW ? (falling.x - prevSurf) / prevW : null;
    var maxH = Math.max(64, H * 0.22);
    blobW = Math.min(136, fieldW * 0.36, maxH / spriteAspect);
    blobH = blobW * spriteAspect;
    if (prevW && pieces.length && Math.abs(prevW - blobW) > 0.5) {
      var k = blobW / prevW;
      for (var i = 0; i < pieces.length; i++) pieces[i].ox *= k;
    }
    oldBlobW = blobW;
    length = Math.max(64, Math.min(H * 0.18, blobH * 0.92, fieldW * 0.42));
    var reach = Math.min(fieldW * 0.46, W * 0.5 - blobW * 0.58 - 6);
    reach = Math.max(48, reach);
    var ratio = Math.min(0.98, reach / length);
    amp = Math.min(0.95, Math.asin(ratio));
    pivotY = Math.max(58, H * 0.07);
    var hangBottom = pivotY + length + blobH;
    landY = hangBottom + Math.max(40, H * 0.055);
    if (landY > H * 0.52) landY = Math.max(hangBottom + 28, H * 0.52);
    if (landY > H - 28) landY = H - 28;
    platW = blobW * 1.18;
    buildStars();
    buildBackdrop();
    sync();
    if (falling && fallFrac !== null) falling.x = surfX + fallFrac * blobW;
  }

  function buildStars() {
    stars.length = 0;
    var n = 36;
    for (var i = 0; i < n; i++) {
      stars.push({
        x: (i * 97 % 1000) / 1000,
        y: (i * 53 % 1000) / 1000,
        r: (i % 3) + 0.6,
        a: 0.25 + (i % 5) * 0.08
      });
    }
  }

  function buildBackdrop() {
    backdrop = document.createElement("canvas");
    backdrop.width = Math.max(1, Math.round(W));
    backdrop.height = Math.max(1, Math.round(H));
    var g = backdrop.getContext("2d");
    g.fillStyle = "#100816";
    g.fillRect(0, 0, W, H);
    if (images.bg) {
      drawCover(g, images.bg, 0, 0, W, H);
      g.fillStyle = "rgba(10, 4, 18, 0.72)";
      g.fillRect(0, 0, W, H);
    } else if (images.album) {
      var side = Math.max(W, H) * 1.05;
      g.globalAlpha = 0.22;
      g.drawImage(images.album, (W - side) / 2, (H - side) / 2, side, side);
      g.globalAlpha = 1;
      g.fillStyle = "rgba(10, 4, 18, 0.55)";
      g.fillRect(0, 0, W, H);
    }
    var glow = function (x, y, r, color) {
      var rad = g.createRadialGradient(x, y, 0, x, y, r);
      rad.addColorStop(0, color);
      rad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rad;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    };
    glow(W * 0.5, H * 0.08, W * 0.55, "rgba(139, 92, 255, 0.28)");
    glow(W * 0.15, H * 0.85, W * 0.45, "rgba(255, 154, 60, 0.16)");
    glow(W * 0.86, H * 0.35, W * 0.32, "rgba(78, 240, 220, 0.10)");
    glow(W * 0.1, H * 0.3, W * 0.28, "rgba(242, 90, 196, 0.10)");
  }

  function period() {
    var n = pieces.length;
    return Math.max(0.70, 2.5 * Math.pow(0.968, n));
  }

  function bob() {
    var hang = amp * Math.sin(phase);
    bobPos.rot = hang;
    bobPos.x = pivotX + Math.sin(hang) * length;
    bobPos.y = pivotY + Math.cos(hang) * length;
    return bobPos;
  }

  function measure() {
    var moment = 0;
    var n = pieces.length;
    for (var i = 0; i < n; i++) moment += pieces[i].ox * (i + 1);
    var margin = blobW * 0.48;
    var denom = margin * (4.2 + n * 0.9);
    tipFactor = denom ? moment / denom : 0;
    return tipFactor;
  }

  function sync() {
    if (mode === "tip" || mode === "over") return;
    var n = pieces.length;
    var topOx = n ? pieces[n - 1].ox : 0;
    var a = lean;
    var top = n ? blobH + (n - 1) * stackStep() : 0;
    baseY = landY - topOx * Math.sin(a) + top * Math.cos(a);
    surfX = baseX + topOx * Math.cos(a) + top * Math.sin(a);
    surfY = landY;
  }

  function stackStep() {
    return blobH * 0.9;
  }

  var baseY = 0, surfX = 0, surfY = 0;

  function beatsFor(streakN) {
    if (streakN <= 0) return 0;
    var b = Math.pow(2, streakN - 1);
    return b > CONFIG.loopBeats ? CONFIG.loopBeats : b;
  }

  function rollGolden() {
    var n = pieces.length;
    if (n < 5) return false;
    if (lastGoldenAt >= 0 && n - lastGoldenAt < 7) return false;
    if (lastGoldenAt < 0 && n >= 11) return true;
    return Math.random() < 0.14;
  }

  function spawnSwing() {
    swingingGolden = rollGolden();
    if (swingingGolden) lastGoldenAt = pieces.length;
  }

  // ---- audio ----
  // Placeholder beat: 16 beats at the track bpm. A real mp3 replaces it when the file loads.
  var BASS = [
    [0, 0, 0, 7, 0, 0, 3, 0, 0, 5, 0, 7, 0, 3, 5, 0],
    [0, 0, 10, 0, 0, 7, 0, 3, 0, 0, 8, 0, 5, 0, 7, 3],
    [0, 12, 0, 7, 0, 12, 3, 0, 0, 12, 0, 8, 0, 10, 7, 0],
    [0, 0, 5, 7, 3, 0, 5, 0, 0, 8, 7, 5, 3, 0, 7, 5]
  ];

  function ensureAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audio.ctx) {
      audio.ctx = new AC();
      audio.gain = audio.ctx.createGain();
      audio.gain.gain.value = muted ? 0 : 0.85;
      audio.gain.connect(audio.ctx.destination);
      audio.thud = makeThud();
    }
    if (audio.ctx.state === "suspended") audio.ctx.resume();
    loadTrackAudio(trackIndex);
  }

  function makeLoop(bpm, index) {
    var beats = CONFIG.loopBeats;
    var spb = 60 / bpm;
    var sr = audio.ctx.sampleRate;
    var dur = beats * spb;
    var len = Math.floor(sr * dur);
    var buf = audio.ctx.createBuffer(2, len, sr);
    var L = buf.getChannelData(0);
    var R = buf.getChannelData(1);
    var notes = BASS[index % BASS.length];
    var root = 49 * Math.pow(2, (index % 3) * 0.08);
    for (var b = 0; b < beats; b++) {
      var t0 = b * spb;
      kick(L, R, sr, t0, 0.9);
      if (b % 2 === 1) clap(L, R, sr, t0, 0.34);
      hat(L, R, sr, t0 + spb * 0.5, 0.16, b % 4 === 3);
      var semi = notes[b];
      if (semi !== null) bass(L, R, sr, t0, spb * 0.92, root * Math.pow(2, semi / 12), 0.32);
    }
    return buf;
  }

  function write(L, R, sr, t, s, pan) {
    var i = (t * sr) | 0;
    if (i < 0 || i >= L.length) return;
    L[i] += s * (1 - pan);
    R[i] += s * (1 + pan);
  }

  function kick(L, R, sr, t0, ampK) {
    var n = (sr * 0.22) | 0;
    var ph = 0;
    for (var i = 0; i < n; i++) {
      var t = i / sr;
      var f = 150 * Math.exp(-t * 22) + 46;
      ph += (Math.PI * 2 * f) / sr;
      var env = Math.exp(-t * 14);
      var s = Math.sin(ph) * env * ampK;
      write(L, R, sr, t0 + t, s, 0);
    }
  }

  function hat(L, R, sr, t0, ampH, open) {
    var n = (sr * (open ? 0.12 : 0.045)) | 0;
    var seed = (t0 * 1000) | 0;
    for (var i = 0; i < n; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      var noise = (seed / 4294967295) * 2 - 1;
      var t = i / sr;
      var env = Math.exp(-t * (open ? 22 : 55));
      var s = noise * env * ampH;
      write(L, R, sr, t0 + t, s, 0.35);
    }
  }

  function clap(L, R, sr, t0, ampC) {
    var n = (sr * 0.12) | 0;
    var seed = 90 + ((t0 * 50) | 0);
    for (var i = 0; i < n; i++) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      var noise = (seed / 4294967295) * 2 - 1;
      var t = i / sr;
      var env = Math.exp(-t * 28) * (t < 0.008 ? t / 0.008 : 1);
      write(L, R, sr, t0 + t, noise * env * ampC, -0.15);
    }
  }

  function bass(L, R, sr, t0, dur, freq, ampB) {
    var n = (sr * dur) | 0;
    var ph = 0;
    for (var i = 0; i < n; i++) {
      var t = i / sr;
      ph += (Math.PI * 2 * freq) / sr;
      var env = Math.min(1, t / 0.012) * Math.exp(-t * 3.2);
      var s = (Math.sin(ph) + 0.35 * Math.sin(ph * 2)) * env * ampB;
      write(L, R, sr, t0 + t, s, 0);
    }
  }

  function makeThud() {
    var sr = audio.ctx.sampleRate;
    var len = (sr * 0.12) | 0;
    var buf = audio.ctx.createBuffer(1, len, sr);
    var d = buf.getChannelData(0);
    var ph = 0;
    for (var i = 0; i < len; i++) {
      var t = i / sr;
      ph += (Math.PI * 2 * (180 * Math.exp(-t * 30) + 60)) / sr;
      d[i] = Math.sin(ph) * Math.exp(-t * 28) * 0.45;
    }
    return buf;
  }

  function loadTrackAudio(index) {
    if (!audio.ctx) return;
    var track = CONFIG.tracks[index];
    audio.bpm = track.bpm;
    if (!audio.buffers[index]) audio.buffers[index] = makeLoop(track.bpm, index);
    audio.active = audio.mp3[index] || audio.buffers[index];
    if (audio.mp3[index] || audio.loading[index]) return;
    audio.loading[index] = true;
    fetch(track.file).then(function (res) {
      if (!res.ok) throw new Error("no track");
      return res.arrayBuffer();
    }).then(function (ab) {
      return new Promise(function (resolve, reject) {
        var p = audio.ctx.decodeAudioData(ab, resolve, reject);
        if (p && p.then) p.then(resolve, reject);
      });
    }).then(function (buf) {
      audio.mp3[index] = buf;
      if (trackIndex === index) audio.active = buf;
    }).catch(function () {});
  }

  function stopSnippet() {
    if (!audio.src) return;
    try { audio.src.stop(); } catch (e) {}
    audio.src = null;
  }

  function playBuffer(buf, dur, gainMul) {
    if (!audio.ctx || !buf || muted) return;
    var src = audio.ctx.createBufferSource();
    var g = audio.ctx.createGain();
    var now = audio.ctx.currentTime;
    var playDur = Math.min(dur, buf.duration);
    g.gain.setValueAtTime(gainMul, now);
    if (playDur > 0.03) {
      g.gain.setValueAtTime(gainMul, now + playDur - 0.02);
      g.gain.linearRampToValueAtTime(0, now + playDur);
    }
    src.buffer = buf;
    src.connect(g);
    g.connect(audio.gain);
    src.start(now, 0, playDur);
    return src;
  }

  function playSnippet(beats) {
    if (!audio.active) return;
    stopSnippet();
    var beatDur = 60 / audio.bpm;
    audio.src = playBuffer(audio.active, beats * beatDur, 1) || null;
  }

  function playThud() {
    if (audio.thud) playBuffer(audio.thud, 0.12, 0.55);
  }

  // ---- sim ----
  function startGame() {
    ensureAudio();
    pieces.length = 0;
    lean = 0;
    leanVel = 0;
    tipFactor = 0;
    phase = -1.15;
    falling = null;
    streak = 0;
    snippetBeats = 0;
    perfects = 0;
    goldensLanded = 0;
    lastGoldenAt = -1;
    swingingGolden = false;
    overShown = false;
    bestAtStart = readNum(CONFIG.storage.best);
    shake = 0;
    floats.length = 0;
    mode = "swing";
    lockUntil = performance.now() + 340;
    screenStart.hidden = true;
    screenOver.hidden = true;
    hud.hidden = false;
    hideBanner();
    stopSnippet();
    loadTrackAudio(trackIndex);
    refreshHud();
    say("Game on. Height 0.");
    sync();
    stage.tabIndex = -1;
    stage.focus({ preventScroll: true });
  }

  function drop() {
    if (mode !== "swing") return;
    if (performance.now() < lockUntil) return;
    var b = bob();
    falling = { x: b.x, y: b.y, vy: 60, rot: b.rot * 0.42, golden: swingingGolden };
    mode = "fall";
    playThud();
  }

  // Land a piece whose center x is world X. Shared by the fall and the debug hook.
  function landAt(x, golden) {
    sync();
    var dx = x - surfX;
    var support = (pieces.length ? blobW : platW) * 0.5;
    var reach = support * Math.max(0.62, Math.cos(lean));
    if (Math.abs(dx) > reach) {
      beginMiss();
      return false;
    }
    var perfect = Math.abs(dx) <= blobW * CONFIG.perfectTolerance;
    var prev = pieces.length ? pieces[pieces.length - 1].ox : 0;
    var local = dx / Math.max(0.5, Math.cos(lean));
    var ox = perfect ? prev : prev + local;
    pieces.push({ ox: ox, golden: !!golden, squish: 1 });
    if (perfect) {
      perfects += 1;
      streak += 1;
      leanVel *= 0.35;
      snippetBeats = beatsFor(streak);
      playSnippet(snippetBeats);
      popText(snippetBeats >= CONFIG.loopBeats ? "FULL DROP" : "PERFECT", x, landY - 28, CYAN);
      burst(x, landY, CYAN);
      if (!reduceMotion) shake = Math.max(shake, 2);
    } else {
      streak = 0;
      snippetBeats = 0;
      stopSnippet();
      leanVel += (dx / blobW) * (2.6 + pieces.length * 0.06);
      popText("OFF", x, landY - 28, PINK);
      burst(x, landY, PINK);
      if (!reduceMotion) shake = Math.min(10, Math.abs(dx) / blobW * 8);
    }
    if (golden) {
      goldensLanded += 1;
      burst(x, landY - blobH * 0.4, GOLD);
      unlockNext();
    }
    var saved = readNum(CONFIG.storage.best);
    if (pieces.length > saved) writeNum(CONFIG.storage.best, pieces.length);
    best = Math.max(best, pieces.length);
    measure();
    refreshHud();
    say("Height " + pieces.length + (perfect ? ". Perfect." : "."));
    if (Math.abs(tipFactor) > 1) {
      beginTip(tipFactor >= 0 ? 1 : -1);
      return true;
    }
    mode = "swing";
    falling = null;
    lockUntil = performance.now() + 260;
    spawnSwing();
    refreshHud();
    return true;
  }

  function unlockNext() {
    if (trackIndex >= CONFIG.tracks.length - 1) {
      showBanner("Golden");
      return;
    }
    trackIndex += 1;
    writeNum(CONFIG.storage.tracks, trackIndex);
    streak = Math.min(streak, 1);
    snippetBeats = beatsFor(streak);
    loadTrackAudio(trackIndex);
    if (snippetBeats) playSnippet(snippetBeats);
    showBanner("Unlocked: " + CONFIG.tracks[trackIndex].title);
  }

  function beginMiss() {
    if (mode === "miss" || mode === "over" || mode === "tip") return;
    mode = "miss";
    stopSnippet();
    if (!falling) showOver("Missed the stack");
  }

  function beginTip(sign) {
    if (mode === "tip" || mode === "over") return;
    sync();
    mode = "tip";
    tipSign = sign || (lean >= 0 ? 1 : -1);
    if (!tipSign) tipSign = 1;
    leanVel = tipSign * 1.1;
    falling = null;
    stopSnippet();
    if (audio.thud) playBuffer(audio.thud, 0.18, 0.9);
  }

  function showOver(reason) {
    if (overShown) return;
    overShown = true;
    mode = "over";
    var height = pieces.length;
    var saved = readNum(CONFIG.storage.best);
    var fresh = height > bestAtStart;
    hideBanner();
    if (fresh) writeNum(CONFIG.storage.best, height);
    best = Math.max(best, height, saved);
    overKicker.textContent = reason;
    overHeightEl.textContent = String(height);
    overBestEl.textContent = String(Math.max(best, height));
    newBestEl.hidden = !fresh;
    screenOver.hidden = false;
    hud.hidden = false;
    drawCard();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (mode === "over") drawCard(); });
    }
    say(reason + " Stack height " + height + ".");
    submitScore({
      height: height,
      best: Math.max(best, height),
      perfects: perfects,
      goldens: goldensLanded,
      track: CONFIG.tracks[trackIndex].title,
      at: new Date().toISOString()
    });
    window.setTimeout(function () {
      if (mode === "over") againBtn.focus();
    }, 400);
  }

  // Leaderboard hook. No request while leaderboard.enabled is false.
  function submitScore(entry) {
    if (!CONFIG.leaderboard.enabled || !CONFIG.leaderboard.endpoint) return Promise.resolve(null);
    return fetch(CONFIG.leaderboard.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry)
    }).then(function (res) {
      if (!res.ok) return null;
      return res.json().catch(function () { return null; });
    }).catch(function () { return null; });
  }

  function update(dt) {
    if (mode === "menu" || mode === "swing") phase += (Math.PI * 2 / period()) * dt;
    if (mode === "fall" && falling) {
      falling.vy += (2500 + pieces.length * 40) * dt;
      falling.y += falling.vy * dt;
      falling.rot += (lean - falling.rot) * Math.min(1, dt * 8);
      var bottom = falling.y + blobH;
      var contact = landY + (falling.x - surfX) * Math.tan(Math.max(-1, Math.min(1, lean)));
      if (bottom >= contact) landAt(falling.x, falling.golden);
    }
    if (mode === "miss" && falling) {
      falling.vy += 2600 * dt;
      falling.y += falling.vy * dt;
      falling.rot += dt * 2.2;
      if (falling.y > H + blobH) showOver("Missed the stack");
    }
    if (mode === "swing" || mode === "fall") {
      var target = Math.max(-1.05, Math.min(1.05, tipFactor)) * 0.40;
      var acc = (target - lean) * 46 - leanVel * 8.4;
      leanVel += acc * dt;
      lean += leanVel * dt;
      measure();
      if (Math.abs(tipFactor) > 1 || Math.abs(lean) > TIP_ANGLE) beginTip(tipFactor !== 0 ? (tipFactor > 0 ? 1 : -1) : (lean > 0 ? 1 : -1));
    }
    if (mode === "tip") {
      leanVel += tipSign * 2.8 * dt;
      lean += leanVel * dt;
      if (Math.abs(lean) > 1.35) showOver("The stack tipped");
    }
    for (var i = 0; i < pieces.length; i++) {
      if (pieces[i].squish > 0) pieces[i].squish = Math.max(0, pieces[i].squish - dt / 0.22);
    }
    for (var p = 0; p < parts.length; p++) {
      var q = parts[p];
      if (!q.on) continue;
      q.life -= dt;
      if (q.life <= 0) { q.on = false; continue; }
      q.vy += 420 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
    }
    for (var f = floats.length - 1; f >= 0; f--) {
      floats[f].life -= dt;
      floats[f].y -= 28 * dt;
      if (floats[f].life <= 0) floats.splice(f, 1);
    }
    if (shake > 0) shake = Math.max(0, shake - dt * 18);
    if (bannerEl && !bannerEl.hidden && performance.now() > bannerUntil) hideBanner();
    sync();
  }

  // ---- draw ----
  function draw() {
    var sx = 0, sy = 0;
    if (shake > 0 && !reduceMotion) {
      sx = (Math.random() - 0.5) * shake;
      sy = (Math.random() - 0.5) * shake;
    }
    ctx.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);
    if (backdrop) ctx.drawImage(backdrop, 0, 0, W, H);
    else { ctx.fillStyle = "#100816"; ctx.fillRect(0, 0, W, H); }

    ctx.save();
    for (var s = 0; s < stars.length; s++) {
      var st = stars[s];
      ctx.globalAlpha = st.a;
      ctx.fillStyle = s % 2 ? ORANGE : CYAN;
      ctx.fillRect(st.x * W, st.y * H * 0.7, st.r, st.r);
    }
    ctx.restore();

    drawFloor();
    if (mode === "swing") drawRope();
    drawStack();
    if (mode === "swing") drawGhost();
    if (mode === "swing") drawHanging(bob(), swingingGolden);
    if ((mode === "fall" || mode === "miss") && falling) drawFalling();
    drawParts();
    drawFloats();
  }

  function drawFloor() {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, landY + 8, W, H - landY);
    ctx.clip();
    ctx.strokeStyle = "rgba(139, 92, 255, 0.28)";
    ctx.lineWidth = 1;
    var horizon = landY + 10;
    for (var i = 0; i < 9; i++) {
      var y = horizon + i * i * 3.2;
      ctx.globalAlpha = Math.max(0, 0.45 - i * 0.04);
      ctx.beginPath();
      ctx.moveTo(baseX - fieldW, y);
      ctx.lineTo(baseX + fieldW, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRope() {
    var b = bob();
    var grad = ctx.createLinearGradient(pivotX, pivotY, b.x, b.y);
    grad.addColorStop(0, PINK);
    grad.addColorStop(1, CYAN);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = ORANGE;
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawStack() {
    var a = lean;
    var step = stackStep();
    // platform
    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.rotate(a);
    roundRect(ctx, -platW / 2, 0, platW, 12, 6);
    var pg = ctx.createLinearGradient(-platW / 2, 0, platW / 2, 0);
    pg.addColorStop(0, PINK);
    pg.addColorStop(0.5, PURPLE);
    pg.addColorStop(1, CYAN);
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.restore();

    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      var localY = blobH * 0.5 + i * step;
      var cx = baseX + p.ox * Math.cos(a) + localY * Math.sin(a);
      var cy = baseY + p.ox * Math.sin(a) - localY * Math.cos(a);
      if (cy < -blobH * 2 || cy > H + blobH) continue;
      drawSprite(cx, cy, a, p.golden, p.squish);
    }
    if (mode === "swing" || mode === "fall") drawZone();
  }

  function drawZone() {
    var zone = blobW * CONFIG.perfectTolerance;
    var y = landY + 6;
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(surfX - zone, y - 14);
    ctx.lineTo(surfX - zone, y);
    ctx.lineTo(surfX - zone + 10, y);
    ctx.moveTo(surfX + zone, y - 14);
    ctx.lineTo(surfX + zone, y);
    ctx.lineTo(surfX + zone - 10, y);
    ctx.stroke();
  }

  function drawGhost() {
    var b = bob();
    var contact = landY + (b.x - surfX) * Math.tan(Math.max(-0.8, Math.min(0.8, lean)));
    ctx.save();
    ctx.globalAlpha = 0.2;
    drawSprite(b.x, contact - blobH * 0.5, lean, swingingGolden && mode === "swing", 0);
    ctx.restore();
  }

  function drawHanging(b, golden) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot * 0.42);
    var img = spriteImg(golden, 0);
    if (images.glow) ctx.drawImage(golden ? images.glowGold : images.glow, -blobW * 0.78, -blobH * 0.15, blobW * 1.56, blobH * 1.35);
    ctx.drawImage(img, -blobW / 2, 0, blobW, blobH);
    ctx.restore();
    if (golden) label(b.x, b.y - 10, "GOLDEN", ORANGE);
  }

  function drawFalling() {
    ctx.save();
    ctx.translate(falling.x, falling.y + blobH / 2);
    ctx.rotate(falling.rot);
    var img = spriteImg(falling.golden, 0);
    ctx.drawImage(img, -blobW / 2, -blobH / 2, blobW, blobH);
    ctx.restore();
  }

  function drawSprite(cx, cy, rot, golden, squishAmt) {
    var u = squishAmt || 0;
    var dw = blobW * (1 + 0.1 * u);
    var dh = blobH * (1 - 0.26 * u);
    var img = spriteImg(golden, u);
    if (!golden && u > 0.45 && images.squish) {
      dw = blobW * 1.12;
      dh = blobH * 0.72;
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    // Pin the feet to the bottom of the slot so a squish stays on the stack.
    ctx.drawImage(img, -dw / 2, blobH / 2 - dh, dw, dh);
    ctx.restore();
  }

  function spriteImg(golden, squish) {
    if (golden && images.golden) return images.golden;
    if (!golden && squish > 0.45 && images.squish) return images.squish;
    return images.blob || images.fallback;
  }

  function drawParts() {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!p.on) continue;
      ctx.globalAlpha = Math.max(0, p.life / 0.45);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.s, p.s);
    }
    ctx.globalAlpha = 1;
  }

  function drawFloats() {
    ctx.textAlign = "center";
    ctx.font = "800 22px 'JetBrains Mono', ui-monospace, monospace";
    for (var i = 0; i < floats.length; i++) {
      var f = floats[i];
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.4));
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }

  function label(x, y, text, color) {
    ctx.save();
    ctx.font = "800 13px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function burst(x, y, color) {
    if (reduceMotion) return;
    var n = 0;
    for (var i = 0; i < parts.length && n < 12; i++) {
      if (parts[i].on) continue;
      var p = parts[i];
      var a = Math.random() * Math.PI * 2;
      var sp = 50 + Math.random() * 160;
      p.on = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp - 30;
      p.life = 0.45;
      p.color = color;
      p.s = 2 + (n % 3);
      n++;
    }
  }

  function popText(text, x, y, color) {
    floats.length = 0;
    floats.push({ text: text, x: x, y: y, life: 0.7, color: color });
  }

  // ---- ui ----
  function refreshHud() {
    heightEl.textContent = String(pieces.length);
    bestEl.textContent = String(Math.max(best, pieces.length));
    trackEl.textContent = CONFIG.tracks[trackIndex].title;
    if (swingingGolden && mode === "swing") streakEl.textContent = "Golden Skwish";
    else if (streak > 0) streakEl.textContent = snippetBeats >= CONFIG.loopBeats ? "Full drop" : ("Perfect x" + streak);
    else streakEl.textContent = "";
    var dots = pipsEl.children;
    for (var i = 0; i < dots.length; i++) {
      dots[i].className = i < snippetBeats ? (snippetBeats >= CONFIG.loopBeats ? "gold" : "on") : "";
    }
  }

  function showBanner(text) {
    bannerEl.textContent = text;
    bannerEl.hidden = false;
    bannerUntil = performance.now() + 2200;
  }
  function hideBanner() { bannerEl.hidden = true; }

  function say(text) { liveEl.textContent = text; }

  function setMuteLabel() {
    muteBtn.textContent = muted ? "Muted" : "Sound";
    muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    if (audio.gain) audio.gain.gain.value = muted ? 0 : 0.85;
  }

  function drawCover(g, img, x, y, w, h) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    var scale = Math.max(w / iw, h / ih);
    var dw = iw * scale, dh = ih * scale;
    g.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  function roundImage(g, img, x, y, w, h, r) {
    g.save();
    roundRect(g, x, y, w, h, r);
    g.clip();
    if (img) drawCover(g, img, x, y, w, h);
    else {
      g.fillStyle = "#3a1870";
      g.fillRect(x, y, w, h);
      g.fillStyle = ORANGE;
      g.font = "800 42px 'JetBrains Mono', monospace";
      g.textAlign = "center";
      g.fillText("SKWISH", x + w / 2, y + h / 2);
      g.textAlign = "left";
    }
    g.restore();
  }

  function drawCard() {
    var w = card.width, h = card.height;
    var g = cardCtx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#140818";
    g.fillRect(0, 0, w, h);
    var glow = g.createRadialGradient(260, h / 2, 40, 260, h / 2, 420);
    glow.addColorStop(0, "rgba(139, 92, 255, 0.45)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);
    var warm = g.createRadialGradient(w - 80, h, 20, w - 80, h, 380);
    warm.addColorStop(0, "rgba(255, 154, 60, 0.35)");
    warm.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = warm;
    g.fillRect(0, 0, w, h);

    var art = 500;
    var ax = 54;
    var ay = (h - art) / 2;
    roundImage(g, images.album, ax, ay, art, art, 28);
    g.lineWidth = 6;
    g.strokeStyle = ORANGE;
    roundRect(g, ax, ay, art, art, 28);
    g.stroke();
    g.lineWidth = 2;
    g.strokeStyle = CYAN;
    roundRect(g, ax - 8, ay - 8, art + 16, art + 16, 34);
    g.stroke();

    var tx = 600;
    g.textAlign = "left";
    g.fillStyle = ORANGE;
    g.font = "700 26px 'JetBrains Mono', ui-monospace, monospace";
    g.fillText("DIRT MONKEY", tx, 118);
    g.fillStyle = "#f6f3ff";
    g.font = "800 58px 'JetBrains Mono', ui-monospace, monospace";
    g.fillText("SKWISH STACK", tx, 186);
    g.fillStyle = PURPLE;
    g.font = "700 24px 'JetBrains Mono', ui-monospace, monospace";
    g.fillText("STACK HEIGHT", tx, 268);
    g.fillStyle = CYAN;
    g.font = "800 132px 'JetBrains Mono', ui-monospace, monospace";
    g.fillText(String(pieces.length), tx, 410);
    g.fillStyle = PINK;
    g.font = "800 28px 'JetBrains Mono', ui-monospace, monospace";
    g.fillText("Beat my stack", tx, 490);
    g.fillStyle = ORANGE;
    g.font = "500 22px 'JetBrains Mono', ui-monospace, monospace";
    g.fillText("dirtmonkey.music/skwish/", tx, 530);

    g.strokeStyle = CYAN;
    g.lineWidth = 8;
    g.strokeRect(18, 18, w - 36, h - 36);
    g.strokeStyle = PINK;
    g.lineWidth = 2;
    g.strokeRect(30, 30, w - 60, h - 60);
  }

  function downloadCard() {
    drawCard();
    var a = document.createElement("a");
    a.href = card.toDataURL("image/png");
    a.download = "skwish-stack-" + pieces.length + ".png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function shareCard() {
    if (!navigator.share) return;
    drawCard();
    var url = CONFIG.shareUrl;
    var text = "I stacked " + pieces.length + " on Skwish Stack. Beat my stack: " + url;
    card.toBlob(function (blob) {
      var payload = { title: "Skwish Stack", text: text, url: url };
      try {
        var file = new File([blob], "skwish-stack-" + pieces.length + ".png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) payload.files = [file];
      } catch (e) {}
      navigator.share(payload).catch(function () {});
    }, "image/png");
  }

  function act(e) {
    if (e && e.target && e.target.closest && e.target.closest("button, a")) return;
    ensureAudio();
    if (mode === "menu") { startGame(); return; }
    if (mode === "swing") drop();
  }

  stage.addEventListener("pointerdown", function (e) {
    if (e.button && e.button !== 0) return;
    act(e);
  }, { passive: false });

  window.addEventListener("keydown", function (e) {
    if (e.code !== "Space") return;
    if (e.repeat) return;
    if (e.target && e.target.closest && e.target.closest("button, a")) return;
    e.preventDefault();
    act(e);
  });

  startBtn.addEventListener("click", function () { ensureAudio(); if (mode === "menu") startGame(); });
  againBtn.addEventListener("click", function () { ensureAudio(); startGame(); });
  downloadBtn.addEventListener("click", downloadCard);
  shareBtn.addEventListener("click", shareCard);
  muteBtn.addEventListener("click", function () {
    muted = !muted;
    try { localStorage.setItem(CONFIG.storage.mute, muted ? "1" : "0"); } catch (e) {}
    setMuteLabel();
  });

  view.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  if (navigator.share) shareBtn.hidden = false;

  window.addEventListener("resize", layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(stage);
  document.addEventListener("visibilitychange", function () { last = 0; });

  layout();
  refreshHud();

  function frame(now) {
    if (!last) last = now;
    var dt = Math.min(0.034, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Hidden test hook. No on-screen debug UI.
  if (/[?&]debug=1(?:&|$)/.test(location.search)) {
    window.SKWISH_DEBUG = {
      read: function () {
        var b = bob();
        return {
          mode: mode,
          height: pieces.length,
          phase: phase,
          bobX: b.x,
          surfX: surfX,
          blobW: blobW,
          lean: lean,
          tipFactor: tipFactor,
          streak: streak,
          beats: snippetBeats,
          track: trackIndex,
          title: CONFIG.tracks[trackIndex].title,
          golden: swingingGolden,
          best: best,
          muted: muted,
          leaderboard: CONFIG.leaderboard.enabled
        };
      },
      drop: drop,
      place: function (frac) {
        sync();
        return landAt(surfX + frac * blobW, swingingGolden);
      },
      setPhase: function (p) { phase = p; },
      forceGolden: function (on) { swingingGolden = !!on; if (on) lastGoldenAt = pieces.length; refreshHud(); },
      start: startGame,
      config: CONFIG
    };
  }
})();
