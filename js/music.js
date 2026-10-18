// The Music page, copied from the app's Music tab:
// 30-second previews for the released songs.
(function () {
  "use strict";

  var LOOKUP_TIMEOUT_MS = 15000;

  // One audio element plays every preview, so only one song plays at a time.
  function previews() {
    var audio = document.querySelector("[data-preview]");
    var status = document.querySelector("[data-track-status]");
    var buttons = document.querySelectorAll(".track .play-btn");
    if (!audio || !buttons.length) return;
    var urls = {};
    var current = null;
    var frame = 0;

    function titleOf(button) {
      return button.closest(".track").querySelector(".track-title").textContent;
    }

    function setRing(button, fraction) {
      button.style.setProperty("--progress", String(Math.max(0, Math.min(1, fraction))));
    }

    function setState(button, state) {
      button.classList.toggle("is-loading", state === "loading");
      button.classList.toggle("is-playing", state === "playing");
      button.setAttribute("aria-pressed", state === "playing" || state === "loading" ? "true" : "false");
      button.closest(".track").classList.toggle("is-current", state !== "idle");
    }

    function tick() {
      if (current && audio.duration) setRing(current, audio.currentTime / audio.duration);
      frame = audio.paused ? 0 : requestAnimationFrame(tick);
    }

    function stop(button) {
      setState(button, "idle");
      setRing(button, 0);
    }

    function lookup(songId) {
      if (urls[songId]) return Promise.resolve(urls[songId]);
      var controller = "AbortController" in window ? new AbortController() : null;
      var timer = setTimeout(function () { if (controller) controller.abort(); }, LOOKUP_TIMEOUT_MS);
      var url = "https://itunes.apple.com/lookup?id=" + encodeURIComponent(songId) + "&country=us&entity=song";
      return fetch(url, controller ? { signal: controller.signal } : {})
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(function (data) {
          var hit = (data.results || []).filter(function (x) { return /^https:\/\//.test(x.previewUrl || ""); })[0];
          if (!hit) throw new Error("no preview");
          urls[songId] = hit.previewUrl;
          return hit.previewUrl;
        })
        .finally(function () { clearTimeout(timer); });
    }

    function play(button) {
      var songId = button.closest(".track").getAttribute("data-song-id");
      if (current && current !== button) {
        audio.pause();
        stop(current);
      }
      current = button;
      setState(button, "loading");
      status.textContent = "Loading the " + titleOf(button) + " preview";
      lookup(songId)
        .then(function (url) {
          if (current !== button) return;
          if (audio.getAttribute("src") !== url) {
            audio.src = url;
            setRing(button, 0);
          }
          return audio.play();
        })
        .catch(function (err) {
          if (current !== button) return;
          if (err && err.name === "AbortError" && audio.getAttribute("src")) return;
          stop(button);
          current = null;
          status.textContent = "The " + titleOf(button) + " preview did not load. Try Spotify or Apple Music.";
        });
    }

    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener("click", function () {
        if (current === button && !audio.paused) {
          audio.pause();
        } else if (current === button && button.classList.contains("is-loading")) {
          audio.pause();
          stop(button);
          current = null;
          status.textContent = "";
        } else {
          play(button);
        }
      });
    });

    audio.addEventListener("playing", function () {
      if (!current) return;
      setState(current, "playing");
      status.textContent = "Playing the " + titleOf(current) + " preview";
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    });
    audio.addEventListener("pause", function () {
      if (!current || audio.ended) return;
      if (current.classList.contains("is-loading")) return;
      setState(current, "paused");
      status.textContent = "Paused " + titleOf(current);
    });
    audio.addEventListener("ended", function () {
      if (!current) return;
      stop(current);
      status.textContent = "The " + titleOf(current) + " preview ended";
      current = null;
    });
    audio.addEventListener("error", function () {
      if (!current) return;
      stop(current);
      status.textContent = "The " + titleOf(current) + " preview did not load. Try Spotify or Apple Music.";
      current = null;
    });
  }

  previews();
})();
