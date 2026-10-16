// The beatmap maker page. The listening and chart-making is in /js/chart-maker.js,
// the same code tools/make-beatmap.js and the game use.

(function () {
  var form = document.querySelector("[data-form]");
  if (!form || !window.ChartMaker) return;

  var ROLES = ["mix", "kick", "snare", "bass", "hats"];
  var LANE_COLORS = ["#ff2bd6", "#3dfff2", "#3dfff2", "#ff2bd6"];
  var statusEl = form.querySelector("[data-status]");
  var goBtn = form.querySelector("[data-go]");
  var audioEl = form.querySelector("[data-audio]");
  var resultEl = document.querySelector("[data-result]");
  var statsEl = resultEl.querySelector("[data-stats]");
  var preview = resultEl.querySelector("[data-preview]");
  var blockEl = resultEl.querySelector("[data-block]");
  var listenBtn = resultEl.querySelector("[data-listen]");
  var copyBtn = resultEl.querySelector("[data-copy]");
  var downloadBtn = resultEl.querySelector("[data-download]");
  var whereEl = resultEl.querySelector("[data-where]");
  var levelEl = resultEl.querySelector("[data-level]");

  var ctx = null;
  var decoded = {};
  var result = null;
  var block = "";
  var playing = null;
  var raf = 0;

  function say(text, bad) {
    statusEl.textContent = text;
    statusEl.classList.toggle("is-bad", !!bad);
  }

  function audio() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    return ctx;
  }

  function seconds(s) {
    var m = Math.floor(s / 60);
    var r = Math.round(s - m * 60);
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function decode(role, file) {
    var note = form.querySelector('[data-note="' + role + '"]');
    note.dataset.original = note.dataset.original || note.textContent;
    note.className = "file-note";
    note.textContent = "Reading " + file.name + "...";
    return file.arrayBuffer()
      .then(function (data) {
        return new Promise(function (resolve, reject) { audio().decodeAudioData(data, resolve, reject); });
      })
      .then(function (buf) {
        decoded[role] = { name: file.name, buf: buf };
        note.className = "file-note is-ready";
        note.textContent = file.name + ", " + seconds(buf.duration) + (buf.numberOfChannels > 1 ? ", stereo" : ", mono");
      })
      .catch(function () {
        delete decoded[role];
        note.className = "file-note is-bad";
        note.textContent = "Could not read " + file.name + ". Try a WAV or MP3.";
        throw new Error("bad file");
      });
  }

  form.addEventListener("change", function (event) {
    var input = event.target;
    var role = input.dataset && input.dataset.role;
    if (!role) return;
    delete decoded[role];
    if (!input.files || !input.files[0]) {
      var note = form.querySelector('[data-note="' + role + '"]');
      if (note.dataset.original) {
        note.className = "file-note";
        note.textContent = note.dataset.original;
      }
      return;
    }
    if (role === "mix" && !audioEl.value) audioEl.value = "/assets/audio/" + input.files[0].name.replace(/\s+/g, "-").toLowerCase();
    decode(role, input.files[0]).catch(function () {});
  });

  function mono(buf) {
    var channels = [];
    for (var c = 0; c < buf.numberOfChannels; c++) channels.push(buf.getChannelData(c));
    return ChartMaker.toMono(channels);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    stop();
    var pending = ROLES.map(function (role) {
      var input = form.querySelector('[data-role="' + role + '"]');
      var file = input.files && input.files[0];
      if (!file || (decoded[role] && decoded[role].name === file.name)) return Promise.resolve();
      return decode(role, file);
    });
    goBtn.disabled = true;
    say("Reading the audio...");
    Promise.all(pending)
      .then(function () {
        if (!Object.keys(decoded).length) throw new Error("Pick the full track, a stem, or both first.");
        say("Listening for the hits...");
        return new Promise(function (resolve) { setTimeout(resolve, 30); });
      })
      .then(function () {
        var stems = {};
        ROLES.slice(1).forEach(function (r) { if (decoded[r]) stems[r] = mono(decoded[r].buf); });
        var bpm = form.querySelector("[data-bpm]").value;
        var offset = form.querySelector("[data-offset]").value;
        result = ChartMaker.analyze({
          sampleRate: ctx.sampleRate,
          mix: decoded.mix ? mono(decoded.mix.buf) : null,
          stems: stems,
          bpm: bpm ? Number(bpm) : null,
          offset: offset === "" ? null : Number(offset)
        });
        result.givenBpm = !!bpm;
        result.givenOffset = offset !== "";
        var from = ROLES.filter(function (r) { return decoded[r]; }).map(function (r) { return decoded[r].name; }).join(", ");
        block = ChartMaker.trackBlock(result, { audio: audioEl.value.trim(), credit: form.querySelector("[data-credit]").value.trim(), from: from });
        show();
        say("Done. " + ChartMaker.ORDER.map(function (d) { return result.charts[d].length + " " + d; }).join(", ") + " arrows. Check them with Play with clicks.");
      })
      .catch(function (err) {
        say(err && err.message && err.message !== "bad file" ? err.message : "One of the files could not be read.", true);
      })
      .then(function () { goBtn.disabled = false; });
  });

  function stat(label, value, sub, warn) {
    var d = document.createElement("div");
    if (warn) d.className = "is-warn";
    var dt = document.createElement("dt");
    dt.textContent = label;
    var dd = document.createElement("dd");
    dd.textContent = value;
    if (sub) {
      var s = document.createElement("small");
      s.textContent = sub;
      dd.appendChild(s);
    }
    d.appendChild(dt);
    d.appendChild(dd);
    statsEl.appendChild(d);
  }

  function dropList() {
    var out = [];
    var at = 0;
    result.sections.forEach(function (s) {
      if (s.type === "drop") out.push({ from: at, to: at + s.bars });
      at += s.bars;
    });
    return { drops: out, bars: at };
  }

  function show() {
    statsEl.textContent = "";
    var off = Math.abs(result.bpmGuess - result.bpm) > 0.1;
    stat("BPM", String(result.bpm), result.givenBpm ? (off ? "It sounds like " + result.bpmGuess + ". Check the session tempo." : "Matches what it hears") : "Guessed from the audio", result.givenBpm && off);
    stat("Offset", result.offset + " s", result.givenOffset ? "It sounds like " + result.offsetGuess + " s" : "Guessed from the audio");
    var d = dropList();
    stat("Length", seconds(result.duration), d.bars + " bars");
    ChartMaker.ORDER.forEach(function (name) {
      var c = result.charts[name];
      var holds = c.filter(function (n) { return n.length > 2; }).length;
      stat(name.charAt(0).toUpperCase() + name.slice(1), String(c.length), (holds ? holds + " holds, " : "") + "from " + result.source);
    });
    stat("Drops", String(d.drops.length), d.drops.map(function (x) { return "bars " + (x.from + 1) + " to " + x.to; }).join(", ") || "None found, so Skwish stays calm");
    blockEl.value = block;
    var where = audioEl.value.trim() || "/assets/audio/";
    whereEl.textContent = where;
    resultEl.hidden = false;
    drawPreview(-1);
    resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function drawPreview(playhead) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = preview.clientWidth;
    var h = preview.clientHeight;
    if (preview.width !== Math.round(w * dpr)) {
      preview.width = Math.round(w * dpr);
      preview.height = Math.round(h * dpr);
    }
    var g = preview.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#07060a";
    g.fillRect(0, 0, w, h);
    if (!result) return;
    var spb = 60 / result.bpm;
    var len = Math.max(result.duration, 1);
    var x = function (t) { return 8 + (t / len) * (w - 16); };
    var d = dropList();
    g.fillStyle = "rgba(255,43,214,0.16)";
    d.drops.forEach(function (dr) {
      var a = x(result.offset + dr.from * 4 * spb);
      g.fillRect(a, 0, x(result.offset + dr.to * 4 * spb) - a, h);
    });
    g.fillStyle = "rgba(255,255,255,0.06)";
    for (var b = 0; b <= d.bars; b += 4) g.fillRect(Math.round(x(result.offset + b * 4 * spb)), 0, 1, h);
    var row = (h - 20) / 4;
    chart().forEach(function (n) {
      var a = x(result.offset + n[0] * spb);
      g.fillStyle = LANE_COLORS[n[1]];
      if (n[2]) {
        g.globalAlpha = 0.55;
        g.fillRect(a, 10 + n[1] * row + row * 0.35, Math.max(2, x(result.offset + (n[0] + n[2]) * spb) - a), row * 0.3);
        g.globalAlpha = 1;
      }
      g.fillRect(a - 1, 10 + n[1] * row + row * 0.2, 2, row * 0.6);
    });
    if (playhead >= 0) {
      g.fillStyle = "#d6ff4a";
      g.fillRect(x(playhead) - 1, 0, 2, h);
    }
  }

  // Play the track with a short tick on every note.
  function listen() {
    if (playing) return stop();
    var c = audio();
    c.resume();
    var out = c.createGain();
    out.connect(c.destination);
    var start = c.currentTime + 0.15;
    var sources = [];
    var music = decoded.mix ? [decoded.mix] : ROLES.slice(1).filter(function (r) { return decoded[r]; }).map(function (r) { return decoded[r]; });
    music.forEach(function (m) {
      var s = c.createBufferSource();
      s.buffer = m.buf;
      var v = c.createGain();
      v.gain.value = decoded.mix ? 0.8 : 0.5;
      s.connect(v);
      v.connect(out);
      s.start(start);
      sources.push(s);
    });
    var spb = 60 / result.bpm;
    var seen = {};
    chart().forEach(function (n) {
      if (seen[n[0]]) return;
      seen[n[0]] = true;
      var t = start + result.offset + n[0] * spb;
      var o = c.createOscillator();
      var e = c.createGain();
      o.frequency.value = n[0] % 4 === 0 ? 2200 : 1600;
      e.gain.setValueAtTime(0.0001, t);
      e.gain.exponentialRampToValueAtTime(0.35, t + 0.002);
      e.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      o.connect(e);
      e.connect(out);
      o.start(t);
      o.stop(t + 0.05);
    });
    playing = { out: out, sources: sources, start: start };
    listenBtn.textContent = "Stop";
    listenBtn.setAttribute("aria-pressed", "true");
    (function tick() {
      if (!playing) return;
      var now = c.currentTime - playing.start;
      drawPreview(Math.max(0, now));
      if (now > result.duration + 0.2) return stop();
      raf = requestAnimationFrame(tick);
    })();
  }

  function stop() {
    if (!playing) return;
    playing.sources.forEach(function (s) { try { s.stop(); } catch (e) {} });
    playing.out.disconnect();
    playing = null;
    cancelAnimationFrame(raf);
    listenBtn.textContent = "Play with clicks";
    listenBtn.setAttribute("aria-pressed", "false");
    drawPreview(-1);
  }

  function chart() {
    return (result && result.charts[levelEl.value]) || [];
  }

  listenBtn.addEventListener("click", listen);
  levelEl.addEventListener("change", function () {
    if (playing) {
      stop();
      listen();
    } else {
      drawPreview(-1);
    }
  });

  copyBtn.addEventListener("click", function () {
    var done = function () { say("Copied. Paste it over the TRACK part of js/beatmap.js."); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(block).then(done, function () { blockEl.select(); document.execCommand("copy"); done(); });
    } else {
      blockEl.select();
      document.execCommand("copy");
      done();
    }
  });

  downloadBtn.addEventListener("click", function () {
    fetch("/js/beatmap.js", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error();
        return r.text();
      })
      .then(function (text) {
        var file = new Blob([ChartMaker.spliceBeatmap(text, block)], { type: "text/javascript" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = "beatmap.js";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        say("Downloaded beatmap.js. Put it at js/beatmap.js.");
      })
      .catch(function () {
        say("Could not open js/beatmap.js from here, so copy the track block instead.", true);
      });
  });

  window.addEventListener("resize", function () { if (result) drawPreview(-1); });
})();
