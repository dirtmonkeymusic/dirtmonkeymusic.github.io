// Skwish Pong on the home page.
// Two neon paddles bounce Skwish back and forth on their own, like a
// screensaver. Click or tap Skwish (or Play Pong) to take the left paddle:
// mouse, a finger, the arrow keys, or W and S. First to 5. Esc or X stops it.
// With reduced motion, Skwish sits still until someone asks for a game.
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
      msgEl.textContent = score[0] >= WIN ? "You win " + score[0] + " to " + score[1] + "!" : "The computer wins " + score[1] + " to " + score[0] + ".";
      msgEl.hidden = false;
      helpEl.hidden = true;
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
      return { mode: mode, score: score.slice(), ball: { x: ball.x, y: ball.y }, left: left.y, right: right.y, running: running, W: W, H: H };
    }
  };
})();
