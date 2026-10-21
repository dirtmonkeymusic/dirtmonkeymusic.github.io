// Hidden Patreon page (/patreon/wonk-c3hbol/): Wonk Factory only.
// Reads the Wonk Factory entries in /beta/latest.json (beta-publish.js --plugin "Wonk Factory" keeps them
// current). Name is required, email optional. Each download and each feedback note goes to the beta log,
// tagged plugins "Wonk Factory (Patreon)" so it is easy to spot in the list.
(function () {
  "use strict";
  var WHO = "dm-beta-who";
  var LOG_URL = "https://dm-beta-log.dirtmonkeymusic.workers.dev/log";
  var PLUGIN = "Wonk Factory";
  var TAG = "Wonk Factory (Patreon)";
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var LABEL = { mac: "Mac", pc: "PC" };
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var who = document.querySelector("[data-pw-who]");
  if (!who) return;
  var name = who.querySelector("[data-pw-name]");
  var email = who.querySelector("[data-pw-email]");
  var err = who.querySelector("[data-pw-error]");
  var note = who.querySelector("[data-pw-feedback]");
  var sent = who.querySelector("[data-pw-sent]");
  var links = who.querySelectorAll("[data-pw-platform]");

  try {
    var saved = JSON.parse(localStorage.getItem(WHO) || "null");
    if (saved) { name.value = saved.name || ""; email.value = saved.email || ""; }
  } catch (e) {}

  function good() { var em = email.value.trim(); return name.value.trim().length > 0 && (!em || EMAIL.test(em)); }
  function refresh() {
    var ok = good();
    Array.prototype.forEach.call(links, function (a) {
      var ready = !a.classList.contains("is-soon");
      a.classList.toggle("is-gated", ready && !ok);
      a.setAttribute("aria-disabled", ready && ok ? "false" : "true");
    });
    if (ok) { err.hidden = true; name.removeAttribute("aria-invalid"); email.removeAttribute("aria-invalid"); }
    return ok;
  }
  function nag() {
    err.hidden = false;
    var noName = !name.value.trim();
    name.setAttribute("aria-invalid", noName ? "true" : "false");
    email.setAttribute("aria-invalid", noName ? "false" : "true");
    (noName ? name : email).focus();
  }
  function send(row) {
    row.name = name.value.trim();
    row.email = email.value.trim();
    row.plugins = TAG;
    row.ts = new Date().toISOString();
    try { localStorage.setItem(WHO, JSON.stringify({ name: row.name, email: row.email })); } catch (x) {}
    var to = window.DM_BETA_LOG_URL || LOG_URL;
    if (to && navigator.sendBeacon) navigator.sendBeacon(to, new Blob([JSON.stringify(row)], { type: "text/plain" }));
  }
  function direct(url) {
    // Direct download: Dropbox dl=1 serves the file itself, no preview page.
    try { var u = new URL(url); if (/(^|\.)dropbox\.com$/.test(u.hostname)) u.searchParams.set("dl", "1"); return u.toString(); } catch (x) { return url; }
  }

  fetch("/beta/latest.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (latest) {
    Array.prototype.forEach.call(links, function (a) {
      var p = a.dataset.pwPlatform, b = ((latest[p] || {}).plugins || {})[PLUGIN] || {};
      var ver = who.querySelector('[data-pw-ver="' + p + '"]');
      if (!b.url || !b.version) return;
      a.href = direct(b.url);
      a.removeAttribute("target");
      a.dataset.pwVersion = b.version;
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
      var text = note.value.trim();
      send({ kind: "download", platform: LABEL[a.dataset.pwPlatform], version: a.dataset.pwVersion || "", message: text });
      if (text) { note.value = ""; sent.hidden = false; }
    });
  });
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
