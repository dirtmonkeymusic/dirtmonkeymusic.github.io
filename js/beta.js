// The hidden beta page (/beta/). Name and email (both required) open the Download for Mac and
// Download for PC buttons. Versions and links come from /beta/latest.json (dev/beta-publish.js
// writes it). Each download, and each "Send feedback" note, is logged to LOG_URL.
(function () {
  "use strict";
  var WHO = "dm-beta-who";
  // EDIT: where downloads and feedback are logged (dev/beta-log-worker/README.md). Empty means no logging yet.
  // It will look like "https://dm-beta-log.<you>.workers.dev/log".
  var LOG_URL = "";
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var LABEL = { mac: "Mac", pc: "PC" };
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var who = document.querySelector("[data-beta-who]");
  if (!who) return;
  var name = who.querySelector("[data-beta-name]");
  var email = who.querySelector("[data-beta-email]");
  var err = who.querySelector("[data-beta-who-error]");
  var note = who.querySelector("[data-beta-feedback]");
  var sent = who.querySelector("[data-beta-sent]");
  var links = who.querySelectorAll("[data-beta-platform]");

  try {
    var saved = JSON.parse(localStorage.getItem(WHO) || "null");
    if (saved) { name.value = saved.name || ""; email.value = saved.email || ""; }
  } catch (e) {}

  function good() { return name.value.trim().length > 0 && EMAIL.test(email.value.trim()); }
  function refresh() {
    var ok = good();
    Array.prototype.forEach.call(links, function (a) {
      var ready = !a.classList.contains("is-soon");
      a.classList.toggle("is-gated", ready && !ok);
      a.setAttribute("aria-disabled", ready && ok ? "false" : "true");
    });
    if (ok) err.hidden = true;
    return ok;
  }
  function nag() { err.hidden = false; (name.value.trim() ? email : name).focus(); }
  function send(row) {
    row.name = name.value.trim();
    row.email = email.value.trim();
    row.ts = new Date().toISOString();
    try { localStorage.setItem(WHO, JSON.stringify({ name: row.name, email: row.email })); } catch (x) {}
    var to = window.DM_BETA_LOG_URL || LOG_URL;
    if (to && navigator.sendBeacon) navigator.sendBeacon(to, new Blob([JSON.stringify(row)], { type: "text/plain" }));
  }

  // Versions and links from the manifest. A platform with no build says "Coming soon".
  fetch("/beta/latest.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (latest) {
    Array.prototype.forEach.call(links, function (a) {
      var p = a.dataset.betaPlatform, b = latest[p] || {};
      var ver = who.querySelector('[data-beta-ver="' + p + '"]');
      if (!b.url || !b.version) return;
      // Direct download: Dropbox dl=1 serves the file itself, no preview page, same tab.
      try { var u = new URL(b.url); if (/(^|\.)dropbox\.com$/.test(u.hostname)) u.searchParams.set("dl", "1"); a.href = u.toString(); } catch (x) { a.href = b.url; }
      a.removeAttribute("target");
      a.dataset.betaVersion = b.version;
      a.classList.remove("is-soon");
      var d = b.date ? new Date(b.date + "T12:00:00") : null;
      ver.textContent = "v" + b.version + (d ? " · " + MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear() : "") + (b.size ? " · " + Math.max(1, Math.round(b.size / 1e6)) + " MB" : "");
    });
    refresh();
  }).catch(function () {});

  name.addEventListener("input", refresh);
  email.addEventListener("input", refresh);

  Array.prototype.forEach.call(links, function (a) {
    a.addEventListener("click", function (e) {
      if (a.classList.contains("is-soon")) { e.preventDefault(); return; }
      if (!refresh()) { e.preventDefault(); nag(); return; }
      // Feedback typed but not sent yet goes along with the download.
      var text = note.value.trim();
      send({ kind: "download", platform: LABEL[a.dataset.betaPlatform], version: a.dataset.betaVersion || "", message: text });
      if (text) { note.value = ""; sent.hidden = false; }
    });
  });

  // Send feedback: before or after a download. It never blocks the downloads.
  who.addEventListener("submit", function (e) {
    e.preventDefault();
    sent.hidden = true;
    if (!refresh()) { nag(); return; }
    var text = note.value.trim();
    if (!text) { note.focus(); return; }
    send({ kind: "feedback", platform: "", version: "", message: text });
    note.value = "";
    sent.hidden = false;
  });

  refresh();
})();
