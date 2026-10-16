// You do not need to edit this file.
// The home page play area: steer Skwish into a glowing portal to open
// that section. Every portal is also a normal link, and the menu at the
// top always works, so nobody has to play to get around.
//
//   Keyboard  arrow keys or WASD (arrows steer once the play area is in use)
//   Mouse     click anywhere in the play area and Skwish walks there
//   Touch     tap a spot, or drag Skwish
//   Portals   park on one for a moment, or click it, to jump in
//
// Sound stays off until the visitor presses the Sound button.

(function () {
  var arena = document.getElementById("arena");
  var skwish = document.getElementById("skwish");
  if (!arena || !skwish) return;

  var body = skwish.querySelector(".skwish-body");
  var portals = Array.prototype.slice.call(arena.querySelectorAll(".portal"));
  var warpEl = document.querySelector("[data-warp]");
  var toastEl = document.querySelector("[data-toast]");
  var secretsEl = document.querySelector("[data-secrets]");
  var soundBtn = document.querySelector("[data-sound]");
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

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

  // ---------- sound (tiny synth, no files)

  var audio = null;
  var soundOn = store("dm-sound") === "on";

  function setSound(on) {
    soundOn = on;
    store("dm-sound", on ? "on" : "off");
    if (soundBtn) {
      soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
      soundBtn.textContent = on ? "Sound on" : "Sound off";
    }
  }

  function tone(freq, length, opts) {
    if (!soundOn) return;
    opts = opts || {};
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      var at = audio.currentTime + (opts.delay || 0);
      var osc = audio.createOscillator();
      var gain = audio.createGain();
      osc.type = opts.type || "square";
      osc.frequency.setValueAtTime(freq, at);
      if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, at + length);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(opts.volume || 0.05, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(at);
      osc.stop(at + length + 0.02);
    } catch (e) {
      soundOn = false;
    }
  }

  var sfx = {
    hover: function () { tone(880, 0.06, { type: "triangle", volume: 0.035 }); },
    boing: function () { tone(220, 0.22, { type: "sine", to: 520, volume: 0.08 }); },
    charge: function () { tone(330, 0.7, { type: "sawtooth", to: 990, volume: 0.025 }); },
    warp: function () { tone(1200, 0.5, { type: "sawtooth", to: 90, volume: 0.05 }); },
    secret: function () {
      [523, 659, 784, 1047].forEach(function (f, i) {
        tone(f, 0.14, { type: "square", volume: 0.04, delay: i * 0.09 });
      });
    }
  };

  if (soundBtn) {
    setSound(soundOn);
    soundBtn.addEventListener("click", function () {
      setSound(!soundOn);
      if (soundOn) sfx.hover();
    });
  }

  // ---------- toast and secrets

  var toastTimer = 0;
  function toast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.classList.add("is-on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove("is-on");
    }, 3600);
  }

  var found = (store("dm-secrets") || "").split(",").filter(Boolean);
  function showSecrets() {
    if (secretsEl) secretsEl.textContent = String(found.length);
  }
  function findSecret(id, text) {
    if (found.indexOf(id) === -1) {
      found.push(id);
      store("dm-secrets", found.join(","));
    }
    showSecrets();
    sfx.secret();
    toast("Secret " + found.length + " of 2: " + text);
  }
  showSecrets();

  function sparks(x, y, count) {
    if (calm()) return;
    var holder = document.createElement("div");
    holder.className = "sparks";
    holder.style.left = x + "px";
    holder.style.top = y + "px";
    for (var i = 0; i < count; i++) {
      var s = document.createElement("span");
      var angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      var reach = 50 + Math.random() * 70;
      s.style.setProperty("--dx", Math.cos(angle) * reach + "px");
      s.style.setProperty("--dy", Math.sin(angle) * reach + "px");
      s.className = "spark spark-" + (i % 3);
      holder.appendChild(s);
    }
    arena.appendChild(holder);
    window.setTimeout(function () { holder.remove(); }, 900);
  }

  // ---------- geometry
  // Skwish's position is an offset from where CSS first puts him.

  var origin = { x: 0, y: 0 };
  var box = { w: 0, h: 0 };
  var half = 0;
  var centers = [];
  var pos = { x: 0, y: 0 };
  var vel = { x: 0, y: 0 };

  function measure() {
    var a = arena.getBoundingClientRect();
    var s = skwish.getBoundingClientRect();
    box.w = a.width;
    box.h = a.height;
    half = s.width / 2;
    origin.x = s.left - a.left + half - pos.x;
    origin.y = s.top - a.top + s.height / 2 - pos.y;
    centers = portals.map(function (p) {
      var r = p.getBoundingClientRect();
      return {
        x: r.left - a.left + r.width / 2 - origin.x,
        y: r.top - a.top + r.height / 2 - origin.y,
        r: r.width / 2
      };
    });
    clamp();
  }

  function clamp() {
    var pad = half * 0.6;
    pos.x = Math.max(pad - origin.x, Math.min(box.w - pad - origin.x, pos.x));
    pos.y = Math.max(pad - origin.y, Math.min(box.h - pad - origin.y, pos.y));
  }

  // ---------- input

  var keys = {};
  var playing = false;
  var target = null;
  var dragging = null;
  var look = null;
  var warping = false;

  var KEYMAP = {
    arrowup: "up", w: "up",
    arrowdown: "down", s: "down",
    arrowleft: "left", a: "left",
    arrowright: "right", d: "right"
  };

  function typing(el) {
    return el && (el.isContentEditable || /^(input|textarea|select|button)$/i.test(el.tagName));
  }

  var KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  var konamiAt = 0;

  document.addEventListener("keydown", function (event) {
    var key = String(event.key || "").toLowerCase();

    konamiAt = key === KONAMI[konamiAt] ? konamiAt + 1 : (key === KONAMI[0] ? 1 : 0);
    if (konamiAt === KONAMI.length) {
      konamiAt = 0;
      toggleWonk();
    }

    if (event.ctrlKey || event.metaKey || event.altKey || warping) return;
    if (typing(event.target) && event.target !== arena) return;
    var dir = KEYMAP[key];
    if (!dir) return;
    var isArrow = key.indexOf("arrow") === 0;
    if (isArrow && !playing && document.activeElement !== arena) return;
    if (!isArrow && !inView) return;
    playing = true;
    event.preventDefault();
    keys[dir] = true;
    target = null;
    wake();
  });

  document.addEventListener("keyup", function (event) {
    var dir = KEYMAP[String(event.key || "").toLowerCase()];
    if (dir) keys[dir] = false;
  });

  window.addEventListener("blur", function () { keys = {}; });

  arena.addEventListener("focus", function () { playing = true; });

  document.addEventListener("pointerdown", function (event) {
    if (!arena.contains(event.target)) {
      playing = false;
      keys = {};
    }
  });

  function arenaPoint(event) {
    var a = arena.getBoundingClientRect();
    return { x: event.clientX - a.left - origin.x, y: event.clientY - a.top - origin.y };
  }

  // Tap or click an empty spot: Skwish walks there.
  arena.addEventListener("click", function (event) {
    if (warping || event.target.closest(".portal") || event.target.closest(".skwish")) return;
    playing = true;
    target = arenaPoint(event);
    wake();
  });

  // Drag Skwish. A short press without moving is a poke.
  var pokes = [];
  skwish.addEventListener("pointerdown", function (event) {
    if (warping) return;
    playing = true;
    dragging = { id: event.pointerId, moved: 0, last: arenaPoint(event) };
    try { skwish.setPointerCapture(event.pointerId); } catch (e) {}
    event.preventDefault();
  });

  skwish.addEventListener("pointermove", function (event) {
    if (!dragging || dragging.id !== event.pointerId) return;
    var p = arenaPoint(event);
    dragging.moved += Math.abs(p.x - dragging.last.x) + Math.abs(p.y - dragging.last.y);
    dragging.last = p;
    if (dragging.moved > 6) {
      target = p;
      wake();
    }
  });

  function endDrag(event) {
    if (!dragging || dragging.id !== event.pointerId) return;
    var wasPoke = dragging.moved <= 6;
    dragging = null;
    if (wasPoke) poke();
  }
  skwish.addEventListener("pointerup", endDrag);
  skwish.addEventListener("pointercancel", function () { dragging = null; });

  function poke() {
    sfx.boing();
    skwish.classList.remove("is-poked");
    void skwish.offsetWidth;
    skwish.classList.add("is-poked");
    var now = Date.now();
    pokes = pokes.filter(function (t) { return now - t < 2500; });
    pokes.push(now);
    if (pokes.length >= 5) {
      pokes = [];
      spin();
    }
  }

  // Secret 1: poke Skwish five times fast.
  function spin() {
    skwish.classList.remove("is-spinning");
    void skwish.offsetWidth;
    skwish.classList.add("is-spinning");
    window.setTimeout(function () { skwish.classList.remove("is-spinning"); }, 1400);
    sparks(origin.x + pos.x, origin.y + pos.y, 18);
    findSecret("spin", "the Skwish spin. Poke him five times any time.");
  }

  // Secret 2: the Konami code turns Wonk mode on and off.
  function toggleWonk() {
    var on = !document.documentElement.classList.contains("is-wonk");
    document.documentElement.classList.toggle("is-wonk", on);
    if (on) {
      sparks(origin.x + pos.x, origin.y + pos.y, 24);
      findSecret("wonk", "Wonk mode. Enter the code again to switch it off.");
    } else {
      toast("Wonk mode off.");
    }
  }

  // Skwish turns to watch the mouse.
  document.addEventListener("pointermove", function (event) {
    if (event.pointerType !== "mouse" || warping) return;
    look = arenaPoint(event);
    wake();
  }, { passive: true });

  portals.forEach(function (portal, index) {
    portal.addEventListener("pointerenter", function () { sfx.hover(); });
    portal.addEventListener("focus", function () { sfx.hover(); });
    portal.addEventListener("click", function (event) {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (warping) return;
      if (calm()) return go(portal);
      measure();
      target = { x: centers[index].x, y: centers[index].y, portal: index, dash: true };
      wake();
    });
  });

  // ---------- warp to a section

  function go(portal) {
    var href = portal.getAttribute("href");
    var hash = href.indexOf("#") > -1 ? href.slice(href.indexOf("#")) : "";
    var samePage = hash && href.split("#")[0] === window.location.pathname;
    if (samePage) {
      var section = document.querySelector(hash);
      if (section) section.scrollIntoView({ behavior: calm() ? "auto" : "smooth" });
      var field = section && section.querySelector("input");
      if (field) field.focus({ preventScroll: true });
      if (window.history && history.replaceState) history.replaceState(null, "", hash);
      return true;
    }
    window.location.href = href;
    return false;
  }

  function warp(index) {
    var portal = portals[index];
    if (calm()) {
      if (go(portal)) reset();
      return;
    }
    warping = true;
    keys = {};
    target = null;
    vel.x = vel.y = 0;
    sfx.warp();
    var r = portal.getBoundingClientRect();
    portal.classList.add("is-entered");
    skwish.classList.add("is-warping");
    sparks(origin.x + centers[index].x, origin.y + centers[index].y, 14);
    if (warpEl) {
      warpEl.style.setProperty("--wx", r.left + r.width / 2 + "px");
      warpEl.style.setProperty("--wy", r.top + r.height / 2 + "px");
      warpEl.className = "warp is-on " + (portal.className.match(/accent-\w+/) || [""])[0];
    }
    window.setTimeout(function () {
      if (go(portal)) window.setTimeout(reset, 250);
    }, 620);
  }

  function reset() {
    warping = false;
    pos.x = pos.y = 0;
    vel.x = vel.y = 0;
    charge = 0;
    charging = -1;
    portals.forEach(function (p) {
      p.classList.remove("is-entered", "is-charging");
      p.style.removeProperty("--charge");
    });
    skwish.classList.remove("is-warping", "is-moving");
    if (warpEl) warpEl.className = "warp";
    render();
  }

  // Coming back with the Back button shows a fresh play area.
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) reset();
  });

  // ---------- the loop (it sleeps when nothing moves)

  var running = false;
  var last = 0;
  var tilt = 0;
  var face = 1;
  var charge = 0;
  var charging = -1;
  var CHARGE_SECONDS = 0.75;

  function wake() {
    if (running) return;
    running = true;
    last = 0;
    window.requestAnimationFrame(frame);
  }

  function frame(time) {
    var dt = last ? Math.min(0.05, (time - last) / 1000) : 1 / 60;
    last = time;
    var busy = step(dt);
    render();
    if (busy) window.requestAnimationFrame(frame);
    else running = false;
  }

  function step(dt) {
    if (warping) return false;
    var scale = Math.max(0.75, Math.min(1.2, box.w / 900));
    var top = 380 * scale;
    var want = { x: 0, y: 0 };
    var ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    var iy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);

    if (ix || iy) {
      var len = Math.sqrt(ix * ix + iy * iy);
      want.x = (ix / len) * top;
      want.y = (iy / len) * top;
    } else if (target) {
      var dx = target.x - pos.x;
      var dy = target.y - pos.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var speed = target.dash ? top * 2.6 : (dragging ? top * 2.2 : top);
      if (dist < 4) {
        var arrived = target;
        target = null;
        pos.x = arrived.x;
        pos.y = arrived.y;
        vel.x = vel.y = 0;
        if (arrived.portal != null) {
          warp(arrived.portal);
          return false;
        }
      } else {
        var pace = Math.min(speed, dist * 9);
        want.x = (dx / dist) * pace;
        want.y = (dy / dist) * pace;
      }
    }

    if (calm()) {
      vel.x = want.x;
      vel.y = want.y;
    } else {
      var ease = Math.min(1, dt * 10);
      vel.x += (want.x - vel.x) * ease;
      vel.y += (want.y - vel.y) * ease;
    }
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
    clamp();

    var moving = Math.abs(vel.x) + Math.abs(vel.y) > 8;
    skwish.classList.toggle("is-moving", moving && !calm());

    // Lean into the run, or turn to watch the mouse.
    var tiltTo = 0;
    var faceTo = face;
    if (moving) {
      tiltTo = Math.max(-16, Math.min(16, vel.x * 0.045));
      if (Math.abs(vel.x) > 20) faceTo = vel.x < 0 ? -1 : 1;
    } else if (look) {
      var lx = look.x - pos.x;
      var ly = look.y - pos.y;
      tiltTo = Math.max(-10, Math.min(10, lx / 30)) + Math.max(-6, Math.min(6, ly / 40)) * (lx < 0 ? -1 : 1);
      if (Math.abs(lx) > 50) faceTo = lx < 0 ? -1 : 1;
    }
    if (calm()) tiltTo = 0;
    tilt += (tiltTo - tilt) * Math.min(1, dt * 8);
    face += (faceTo - face) * Math.min(1, dt * 9);

    // Park on a portal to charge it up.
    var on = -1;
    if (!(target && target.dash)) {
      centers.forEach(function (c, i) {
        var ox = c.x - pos.x;
        var oy = c.y - pos.y;
        if (Math.sqrt(ox * ox + oy * oy) < c.r * 0.7) on = i;
      });
    }
    if (on !== charging) {
      if (charging > -1) {
        portals[charging].classList.remove("is-charging");
        portals[charging].style.removeProperty("--charge");
      }
      charging = on;
      charge = 0;
      if (on > -1) {
        portals[on].classList.add("is-charging");
        sfx.charge();
      }
    }
    if (charging > -1) {
      charge += dt / CHARGE_SECONDS;
      portals[charging].style.setProperty("--charge", Math.min(1, charge).toFixed(3));
      if (charge >= 1) {
        warp(charging);
        return false;
      }
    }

    var settling = Math.abs(tiltTo - tilt) > 0.2 || Math.abs(faceTo - face) > 0.01;
    return moving || !!target || ix !== 0 || iy !== 0 || charging > -1 || settling;
  }

  function render() {
    skwish.style.transform = "translate3d(" + pos.x.toFixed(1) + "px," + pos.y.toFixed(1) + "px,0)";
    if (body) {
      var flip = Math.abs(face) < 0.15 ? (face < 0 ? -0.15 : 0.15) : face;
      // Shrinks while a portal charges, as if it is pulling him in.
      var pull = charging > -1 && !calm() ? 1 - 0.45 * Math.min(1, charge) : 1;
      body.style.transform = "rotate(" + tilt.toFixed(2) + "deg) scale(" + (flip * pull).toFixed(3) + "," + pull.toFixed(3) + ")";
    }
  }

  // ---------- start

  var inView = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        inView = entry.isIntersecting;
        arena.classList.toggle("is-offscreen", !inView);
        if (!inView) {
          playing = false;
          keys = {};
        }
      });
    }).observe(arena);
  }

  measure();
  window.addEventListener("resize", function () {
    measure();
    render();
  });
  arena.classList.add("is-ready");
})();
