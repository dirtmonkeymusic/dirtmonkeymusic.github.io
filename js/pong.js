// Skwish Pong on the home page.
// Two neon paddles bounce Skwish back and forth on their own, like a
// screensaver. Click or tap Skwish (or Play Pong) to take the left paddle:
// mouse, a finger, the arrow keys, or W and S. First to 5. Esc or X stops it.
// With reduced motion, Skwish sits still until someone asks for a game.
// Beat the computer and one dub plate, picked at random, plays once through the
// mini player (Web Audio, no audio element). It is fetched only once a game
// starts, never plays on a loss, and stops on Esc, X, or a new game. When it
// ends, nothing else plays: win again for another.
(function () {
  "use strict";

  var box = document.querySelector("[data-pong]");
  if (!box) return;
  var canvas = box.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var art = box.querySelector(".pong-skwish img");
  var startBtn = box.querySelector("[data-pong-start]");
  var closeBtn = box.querySelector("[data-pong-close]");
  var scoreEl = box.querySelector("[data-pong-score]");
  var youEl = box.querySelector("[data-pong-you]");
  var cpuEl = box.querySelector("[data-pong-cpu]");
  var msgEl = box.querySelector("[data-pong-msg]");
  var helpEl = box.querySelector("[data-pong-help]");
  var winEl = box.querySelector("[data-pong-win]");
  var still = window.matchMedia("(prefers-reduced-motion: reduce)");

  var WIN = 5;
  var CYAN = "#3dfff2";
  var MAGENTA = "#ff2bd6";

  var W = 0, H = 0, dpr = 1;
  var padW, padH, inset, r;
  var left = { y: 0, err: 0 };
  var right = { y: 0, err: 0 };
  var ball = { x: 0, y: 0, vx: 0, vy: 0, speed: 0, spin: 0, squash: 0, wall: false };
  // attract: the paddles play each other. serve: a short wait before the ball
  // goes. play: a game is on. over: someone reached 5.
  var mode = "attract";
  var wait = 0;
  var score = [0, 0];
  var keys = { up: false, down: false };
  var aim = null;
  var sprite = null;
  var running = false;
  var onScreen = true;
  var last = 0;

  // ---- DUB PLATES: the win music. ----
  // EDIT: one line per track. Change a title here and the player shows it.
  // Each file is scrambled so it is not a plain audio file (tools: scramble
  // with the same key); it is put back together in memory and played through Web Audio.
  var PLATES = [
    { file: "/assets/pong/fx1.bin", title: "FREAK" },
    { file: "/assets/pong/fx2.bin", title: "RAVE TIME" },
    { file: "/assets/pong/fx3.bin", title: "FABRICATION FLIP" },
    { file: "/assets/pong/fx4.bin", title: "AGE OF LOVE FLIP" },
    { file: "/assets/pong/fx5.bin", title: "6 FT DEEP" }
  ];
  var KP = ["Sk", "wi5h", "-P0ng", ":dub", "pl4te", "#DM"];
  var VOL_KEY = "dm-pong-volume";
  var player = winEl && winEl.querySelector("[data-dub-player]");
  var dub = {
    ctx: null, gain: null, src: null, buf: null, plate: null, fetching: null,
    startedAt: 0, offset: 0, playing: false, ended: false, connected: false,
    sources: 0, tick: 0, vol: 0.8
  };
  try {
    var savedVol = parseFloat(localStorage.getItem(VOL_KEY));
    if (savedVol >= 0 && savedVol <= 1) dub.vol = savedVol;
  } catch (err) {}

  function unscramble(ab) {
    var k = KP.join(""), key = new Uint8Array(k.length);
    for (var i = 0; i < k.length; i++) key[i] = k.charCodeAt(i);
    var d = new Uint8Array(ab);
    for (var j = 0; j < d.length; j++) d[j] ^= key[j % key.length] ^ ((j >> 9) & 255);
    return ab;
  }

  // Called from the click or tap that starts a game, so audio is allowed.
  // Picks this game's dub plate and starts fetching it.
  function dubPrepare() {
    if (!player) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!dub.ctx) {
      dub.ctx = new AC();
      dub.gain = dub.ctx.createGain();
      dub.gain.gain.value = dub.vol;
      dub.gain.connect(dub.ctx.destination);
    }
    if (dub.ctx.state === "suspended") dub.ctx.resume();
    var plate = dub.plate = PLATES[Math.floor(Math.random() * PLATES.length)];
    player.querySelector("[data-dub-credit]").textContent = "Now playing: " + plate.title + " - Dirt Monkey (unreleased)";
    var job = dub.fetching = fetch(plate.file)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(function (ab) {
        return new Promise(function (res, rej) {
          var pr = dub.ctx.decodeAudioData(unscramble(ab), res, rej);
          if (pr && pr.then) pr.then(res, rej);
        });
      })
      .then(function (buf) { if (dub.fetching === job) dub.buf = buf; return buf; })
      .catch(function () { return null; });
  }

  function fmt(t) {
    t = Math.max(0, Math.floor(t));
    return Math.floor(t / 60) + ":" + (t % 60 < 10 ? "0" : "") + (t % 60);
  }

  function dubPos() {
    if (!dub.buf) return 0;
    var t = dub.playing ? dub.ctx.currentTime - dub.startedAt : dub.offset;
    return Math.min(t, dub.buf.duration);
  }

  function dubShow() {
    if (!player) return;
    var btn = player.querySelector("[data-dub-play]");
    var time = player.querySelector("[data-dub-time]");
    var fill = player.querySelector("[data-dub-fill]");
    btn.disabled = !dub.buf || dub.ended;
    btn.classList.toggle("is-paused", !dub.playing);
    btn.setAttribute("aria-label", dub.playing ? "Pause" : "Play");
    if (!dub.buf) { time.textContent = "Loading..."; fill.style.width = "0%"; }
    else {
      var t = dub.ended ? dub.buf.duration : dubPos();
      time.textContent = fmt(t) + " / " + fmt(dub.buf.duration);
      fill.style.width = (t / dub.buf.duration * 100).toFixed(2) + "%";
    }
    player.querySelector("[data-dub-again]").hidden = !dub.ended;
  }

  function dubKill() {
    if (dub.src) {
      dub.src.onended = null;
      try { dub.src.stop(); } catch (err) {}
      dub.src.disconnect();
      dub.src = null;
    }
    dub.connected = false;
    dub.playing = false;
    clearInterval(dub.tick);
  }

  // One track, once: no loop, and nothing starts after it ends.
  function dubStart(from) {
    if (!dub.buf || dub.ended || mode !== "over" || winEl.hidden || player.hidden) return;
    dubKill();
    var src = dub.ctx.createBufferSource();
    src.buffer = dub.buf;
    src.loop = false;
    src.connect(dub.gain);
    src.onended = function () {
      if (dub.src !== src) return;
      dubKill();
      dub.ended = true;
      dub.offset = dub.buf.duration;
      dubShow();
    };
    dub.src = src;
    dub.sources++;
    dub.connected = true;
    if (dub.ctx.state === "suspended") dub.ctx.resume();
    dub.startedAt = dub.ctx.currentTime - from;
    src.start(0, from);
    dub.playing = true;
    dub.tick = setInterval(dubShow, 250);
    dubShow();
  }

  function dubPause() {
    if (!dub.playing) return;
    dub.offset = dubPos();
    dubKill();
    dubShow();
  }

  // The win: show the player and play this game's dub plate from the top, once.
  function dubWin() {
    if (!player || !dub.fetching) return;
    dub.offset = 0;
    dub.ended = false;
    player.hidden = false;
    dubShow();
    var job = dub.fetching;
    job.then(function () {
      if (dub.fetching !== job) return;
      dubShow();
      if (!dub.src && !dub.ended && dub.offset === 0) dubStart(0);
    });
  }

  // Stops the music and drops this game's pick, so the next game picks again.
  function dubStop() {
    dubKill();
    dub.offset = 0;
    dub.ended = false;
    dub.buf = null;
    dub.fetching = null;
    dub.plate = null;
    if (player) dubShow();
  }

  function hideWin() {
    dubStop();
    if (winEl) winEl.hidden = true;
  }

  function setVol(v) {
    dub.vol = Math.max(0, Math.min(1, Math.round(v * 100) / 100));
    if (dub.gain) dub.gain.gain.setTargetAtTime(dub.vol, dub.ctx.currentTime, 0.02);
    try { localStorage.setItem(VOL_KEY, String(dub.vol)); } catch (err) {}
    var knob = player.querySelector("[data-dub-knob]");
    var pct = Math.round(dub.vol * 100);
    knob.style.setProperty("--turn", (-135 + dub.vol * 270) + "deg");
    knob.setAttribute("aria-valuenow", pct);
    knob.setAttribute("aria-valuetext", pct + "%");
  }

  function bindPlayer() {
    if (!player) return;
    var knob = player.querySelector("[data-dub-knob]");
    setVol(dub.vol);
    player.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    player.querySelector("[data-dub-play]").addEventListener("click", function () {
      if (dub.playing) dubPause();
      else dubStart(dub.offset);
    });
    player.querySelector("[data-dub-close]").addEventListener("click", function () {
      dubKill();
      player.hidden = true;
    });
    // The knob: drag up or right to turn it up, scroll, or use the arrow keys.
    var drag = null;
    knob.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      drag = { x: e.clientX, y: e.clientY, v: dub.vol };
      if (knob.setPointerCapture) knob.setPointerCapture(e.pointerId);
      knob.focus({ preventScroll: true });
    });
    knob.addEventListener("pointermove", function (e) {
      if (!drag) return;
      setVol(drag.v + ((e.clientX - drag.x) - (e.clientY - drag.y)) / 160);
    });
    var endDrag = function () { drag = null; };
    knob.addEventListener("pointerup", endDrag);
    knob.addEventListener("pointercancel", endDrag);
    knob.addEventListener("wheel", function (e) {
      e.preventDefault();
      setVol(dub.vol - Math.sign(e.deltaY || -e.deltaX) * 0.05);
    }, { passive: false });
    knob.addEventListener("keydown", function (e) {
      var k = e.key, step = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05, PageUp: 0.2, PageDown: -0.2 }[k];
      if (step !== undefined) setVol(dub.vol + step);
      else if (k === "Home") setVol(0);
      else if (k === "End") setVol(1);
      else return;
      e.preventDefault();
      e.stopPropagation();
    });
  }
  bindPlayer();

  // Skwish with his glow baked in once, so each frame is one drawImage.
  function makeSprite() {
    var size = 256;
    var c = document.createElement("canvas");
    c.width = c.height = size;
    var g = c.getContext("2d");
    var halo = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    halo.addColorStop(0, "rgba(255, 43, 214, 0.5)");
    halo.addColorStop(0.4, "rgba(255, 43, 214, 0.14)");
    halo.addColorStop(1, "rgba(255, 43, 214, 0)");
    g.fillStyle = halo;
    g.fillRect(0, 0, size, size);
    g.shadowColor = "rgba(61, 255, 242, 0.7)";
    g.shadowBlur = 14;
    g.drawImage(art, 22, 22, size - 44, size - 44);
    sprite = c;
  }

  function measure() {
    var rect = canvas.getBoundingClientRect();
    var oldW = W, oldH = H;
    W = rect.width;
    H = rect.height;
    if (!W || !H) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    padW = Math.max(8, W * 0.012);
    padH = H * 0.24;
    inset = Math.max(14, W * 0.03);
    r = Math.min(W, H) * 0.095;
    if (oldW && oldH) {
      ball.x *= W / oldW;
      ball.y *= H / oldH;
      ball.vx *= W / oldW;
      ball.vy *= H / oldH;
      left.y *= H / oldH;
      right.y *= H / oldH;
    } else {
      ball.x = W / 2;
      ball.y = H / 2;
      left.y = right.y = H / 2;
    }
    if (!running) draw();
  }

  function serve(toLeft) {
    ball.x = W / 2;
    ball.y = H * (0.3 + Math.random() * 0.4);
    ball.speed = W * (mode === "attract" ? 0.42 : 0.5);
    var angle = (Math.random() * 0.8 - 0.4);
    ball.vx = Math.cos(angle) * ball.speed * (toLeft ? -1 : 1);
    ball.vy = Math.sin(angle) * ball.speed;
  }

  // A paddle that follows the ball, a little off center so the angles vary.
  // The computer in a real game is slower, so it can be beaten.
  function track(p, coming, dt) {
    var target = coming ? ball.y + p.err : H / 2;
    var max = H * (mode === "attract" ? 2.4 : 1.05) * dt;
    var d = target - p.y;
    p.y += Math.max(-max, Math.min(max, d));
  }

  function clampPaddle(p) {
    p.y = Math.max(padH / 2, Math.min(H - padH / 2, p.y));
  }

  function hit(p, dir) {
    var off = Math.max(-1, Math.min(1, (ball.y - p.y) / (padH / 2)));
    var angle = off * 0.95;
    ball.speed = Math.min(ball.speed * 1.06, W * (mode === "attract" ? 0.6 : 1.05));
    ball.vx = Math.cos(angle) * ball.speed * dir;
    ball.vy = Math.sin(angle) * ball.speed;
    ball.squash = 1;
    ball.wall = false;
    var miss = mode === "attract" ? 0.35 : 0.55;
    left.err = (Math.random() * 2 - 1) * padH * miss;
    right.err = (Math.random() * 2 - 1) * padH * miss;
  }

  function step(dt) {
    if (mode === "serve") {
      wait -= dt;
      if (wait <= 0) {
        mode = "play";
        msgEl.hidden = true;
        serve(Math.random() < 0.5);
      }
    }
    var moving = mode === "attract" || mode === "play";
    if (moving) {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.y < r) { ball.y = r; ball.vy = Math.abs(ball.vy); ball.squash = 0.7; ball.wall = true; }
      if (ball.y > H - r) { ball.y = H - r; ball.vy = -Math.abs(ball.vy); ball.squash = 0.7; ball.wall = true; }
      ball.spin += ball.vx * dt * 0.004;
    }
    ball.squash = Math.max(0, ball.squash - dt * 4);

    if (mode === "attract") {
      track(left, ball.vx < 0, dt);
    } else if (aim !== null) {
      var max = H * 3 * dt;
      left.y += Math.max(-max, Math.min(max, aim - left.y));
    } else {
      left.y += ((keys.down ? 1 : 0) - (keys.up ? 1 : 0)) * H * 1.5 * dt;
    }
    track(right, ball.vx > 0 && (mode === "attract" || ball.x > W * 0.35), dt);
    clampPaddle(left);
    clampPaddle(right);

    if (!moving) return;
    var face = inset + padW;
    if (ball.vx < 0 && ball.x - r < face && ball.x > inset && Math.abs(ball.y - left.y) < padH / 2 + r * 0.6) {
      ball.x = face + r;
      hit(left, 1);
    }
    face = W - inset - padW;
    if (ball.vx > 0 && ball.x + r > face && ball.x < W - inset && Math.abs(ball.y - right.y) < padH / 2 + r * 0.6) {
      ball.x = face - r;
      hit(right, -1);
    }
    if (ball.x < -r || ball.x > W + r) point(ball.x > W);
  }

  function point(youScored) {
    if (mode === "attract") { serve(youScored); return; }
    score[youScored ? 0 : 1]++;
    youEl.textContent = score[0];
    cpuEl.textContent = score[1];
    ball.x = W / 2;
    ball.y = H / 2;
    if (score[0] >= WIN || score[1] >= WIN) {
      mode = "over";
      helpEl.hidden = true;
      if (score[0] >= WIN && winEl) {
        msgEl.hidden = true;
        winEl.hidden = false;
        dubWin();
      } else {
        msgEl.textContent = score[0] >= WIN ? "You win " + score[0] + " to " + score[1] + "!" : "The computer wins " + score[1] + " to " + score[0] + ".";
        msgEl.hidden = false;
      }
      startBtn.textContent = "Play again";
      startBtn.hidden = false;
      return;
    }
    mode = "serve";
    wait = 0.9;
  }

  function roundRect(x, y, w, h, rad) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, rad);
    else ctx.rect(x, y, w, h);
    ctx.fill();
  }

  function draw() {
    if (!W) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    var dash = H / 24;
    for (var y = dash / 2; y < H; y += dash * 2) ctx.fillRect(W / 2 - 1, y, 2, dash);

    ctx.shadowBlur = 18;
    ctx.shadowColor = CYAN;
    ctx.fillStyle = CYAN;
    roundRect(inset, left.y - padH / 2, padW, padH, padW / 2);
    ctx.shadowColor = MAGENTA;
    ctx.fillStyle = MAGENTA;
    roundRect(W - inset - padW, right.y - padH / 2, padW, padH, padW / 2);
    ctx.shadowBlur = 0;

    if (sprite && mode !== "over") {
      var s = r * 2.9;
      var sq = ball.squash * 0.2;
      ctx.save();
      ctx.translate(ball.x, ball.y);
      if (ball.wall) ctx.scale(1 + sq, 1 - sq);
      else ctx.scale(1 - sq, 1 + sq);
      ctx.rotate(Math.sin(ball.spin) * 0.25);
      ctx.drawImage(sprite, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    step(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function shouldRun() {
    return onScreen && !document.hidden && (mode !== "attract" || !still.matches);
  }

  function update() {
    var go = shouldRun();
    if (go && !running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    } else if (!go && running) {
      running = false;
    }
    if (!go && mode === "attract" && still.matches) {
      ball.x = W / 2;
      ball.y = H / 2;
      ball.squash = 0;
      ball.spin = 0;
      left.y = right.y = H / 2;
      draw();
    }
  }

  function start() {
    hideWin();
    dubPrepare();
    score = [0, 0];
    youEl.textContent = "0";
    cpuEl.textContent = "0";
    aim = null;
    mode = "serve";
    wait = 0.9;
    ball.x = W / 2;
    ball.y = H / 2;
    ball.squash = 0;
    msgEl.textContent = "First to " + WIN;
    msgEl.hidden = false;
    scoreEl.hidden = false;
    helpEl.hidden = false;
    closeBtn.hidden = false;
    startBtn.hidden = true;
    box.classList.add("is-playing");
    box.focus({ preventScroll: true });
    update();
  }

  function stop() {
    var hadFocus = box.contains(document.activeElement);
    hideWin();
    mode = "attract";
    aim = null;
    keys.up = keys.down = false;
    scoreEl.hidden = true;
    msgEl.hidden = true;
    helpEl.hidden = true;
    closeBtn.hidden = true;
    startBtn.textContent = "Play Pong";
    startBtn.hidden = false;
    box.classList.remove("is-playing");
    if (hadFocus) startBtn.focus({ preventScroll: true });
    serve(Math.random() < 0.5);
    update();
  }

  function local(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onSkwish(pt) {
    var dx = pt.x - ball.x, dy = pt.y - ball.y;
    return Math.sqrt(dx * dx + dy * dy) < r * 1.7;
  }

  canvas.addEventListener("pointerdown", function (e) {
    var pt = local(e);
    if (mode === "attract") {
      if (onSkwish(pt)) start();
      return;
    }
    if (mode === "over") return;
    aim = pt.y;
    if (e.pointerType !== "mouse") canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", function (e) {
    var pt = local(e);
    if (mode === "attract") {
      canvas.style.cursor = onSkwish(pt) ? "pointer" : "";
      return;
    }
    canvas.style.cursor = "";
    if (e.pointerType === "mouse" || e.buttons || e.pressure) aim = pt.y;
  });

  startBtn.addEventListener("click", start);
  closeBtn.addEventListener("click", stop);

  function keyName(e) {
    var k = e.key;
    if (k === "ArrowUp" || k === "w" || k === "W") return "up";
    if (k === "ArrowDown" || k === "s" || k === "S") return "down";
    return null;
  }

  document.addEventListener("keydown", function (e) {
    if (mode === "attract") return;
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
    if (e.target.closest && e.target.closest("[data-dub-knob]") && e.key !== "Escape") return;
    if (e.key === "Escape") { stop(); return; }
    var k = keyName(e);
    if (!k) return;
    e.preventDefault();
    keys[k] = true;
    aim = null;
  });

  document.addEventListener("keyup", function (e) {
    var k = keyName(e);
    if (k) keys[k] = false;
  });

  document.addEventListener("visibilitychange", update);
  if (still.addEventListener) still.addEventListener("change", update);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[entries.length - 1].isIntersecting;
      update();
    }).observe(box);
  }

  if ("ResizeObserver" in window) new ResizeObserver(measure).observe(box);
  else window.addEventListener("resize", measure);

  function begin() {
    makeSprite();
    measure();
    serve(Math.random() < 0.5);
    box.classList.add("is-live");
    update();
  }

  function ready() {
    if (art.complete && art.naturalWidth) begin();
    else art.addEventListener("load", begin, { once: true });
  }

  // Wait for the page to settle so the first paint stays quick.
  if (document.readyState === "complete") ready();
  else window.addEventListener("load", ready, { once: true });

  // For the tests.
  window.skwishPong = {
    state: function () {
      return {
        mode: mode, score: score.slice(), ball: { x: ball.x, y: ball.y }, left: left.y, right: right.y, running: running, W: W, H: H,
        dub: { win: !!winEl && !winEl.hidden, ready: !!dub.buf, playing: dub.playing, connected: dub.connected, ended: dub.ended, sources: dub.sources, vol: dub.vol, at: dubPos(), length: dub.buf ? dub.buf.duration : 0, title: dub.plate ? dub.plate.title : "", plates: PLATES.map(function (p) { return p.title; }) }
      };
    },
    // Ends a game on the spot: finish(true) is a win, finish(false) a loss.
    finish: function (youWin) {
      if (mode === "attract") return;
      score = youWin ? [WIN - 1, 0] : [0, WIN - 1];
      point(youWin);
    },
    // Jumps the dub plate to just before its end, to test what happens after it.
    nearEnd: function (secs) {
      if (!dub.buf || !dub.playing) return false;
      dubStart(Math.max(0, dub.buf.duration - (secs || 1)));
      return true;
    }
  };
})();
