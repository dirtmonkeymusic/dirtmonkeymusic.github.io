// The home page countdown, between the logo and the section buttons.
// Edit these two lines:
//   COUNTDOWN_LABEL   The words above the numbers. Leave it "" for no words.
//   COUNTDOWN_TARGET  The moment it counts down to. Keep the time zone on the end
//                     (-05:00 is US Eastern in winter, EST; -04:00 is summer, EDT).
// When the moment passes, the countdown hides itself.
// Preview another moment with ?now=, for example /?now=2026-11-02T11:59:50-05:00
var COUNTDOWN_LABEL = "";
var COUNTDOWN_TARGET = "2026-11-02T12:00:00-05:00";

(function () {
  var root = document.querySelector("[data-home-countdown]");
  if (!root) return;
  var target = Date.parse(COUNTDOWN_TARGET);
  var label = root.querySelector("[data-countdown-label]");
  var fields = {};
  ["days", "hours", "minutes", "seconds"].forEach(function (unit) {
    fields[unit] = root.querySelector('[data-unit="' + unit + '"]');
  });

  var match = /[?&]now=([^&#]+)/.exec(window.location.search);
  var preview = match ? Date.parse(decodeURIComponent(match[1])) : NaN;
  var clockOffset = isFinite(preview) ? preview - Date.now() : 0;

  if (label) {
    label.textContent = COUNTDOWN_LABEL;
    label.hidden = !COUNTDOWN_LABEL;
  }

  function pad2(n) {
    n = Math.floor(n);
    return n < 10 ? "0" + n : String(n);
  }

  var timer = 0;
  function tick() {
    var left = Math.floor((target - (Date.now() + clockOffset)) / 1000);
    if (!isFinite(target) || left <= 0) {
      root.hidden = true;
      window.clearInterval(timer);
      return false;
    }
    fields.days.textContent = pad2(left / 86400);
    fields.hours.textContent = pad2((left % 86400) / 3600);
    fields.minutes.textContent = pad2((left % 3600) / 60);
    fields.seconds.textContent = pad2(left % 60);
    root.setAttribute("aria-label", (COUNTDOWN_LABEL ? COUNTDOWN_LABEL + ": " : "") +
      fields.days.textContent + " days, " + fields.hours.textContent + " hours, " +
      fields.minutes.textContent + " minutes, " + fields.seconds.textContent + " seconds");
    return true;
  }

  if (tick()) timer = window.setInterval(tick, 1000);

  window.homeCountdown = {
    state: function () {
      return {
        hidden: root.hidden,
        label: label ? label.textContent : "",
        target: COUNTDOWN_TARGET,
        days: fields.days.textContent,
        hours: fields.hours.textContent,
        minutes: fields.minutes.textContent,
        seconds: fields.seconds.textContent
      };
    }
  };
})();
