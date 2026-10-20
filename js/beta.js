// The hidden beta page (/beta/). Name and email (both required) open the Download for Mac and
// Download for PC buttons. Versions and links come from /beta/latest.json (dev/beta-publish.js
// writes it). Testers can untick plugins: all ticked gets the full suite installer, otherwise one
// installer per ticked plugin (latest[platform].plugins[name]). Each download, and each "Send feedback" note, is logged to LOG_URL.
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
  var all = who.querySelector("[data-beta-all]");
  var picks = Array.prototype.slice.call(who.querySelectorAll("[data-beta-pick]"));
  var files = who.querySelector("[data-beta-files]");
  var filesList = who.querySelector("[data-beta-files-list]");
  var latest = {};

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
  function direct(url) {
    // Direct download: Dropbox dl=1 serves the file itself, no preview page.
    try { var u = new URL(url); if (/(^|\.)dropbox\.com$/.test(u.hostname)) u.searchParams.set("dl", "1"); return u.toString(); } catch (x) { return url; }
  }
  function chosen() { return picks.filter(function (c) { return c.checked; }).map(function (c) { return c.value; }); }
  function fill() {
    var sel = chosen(), suite = sel.length === picks.length;
    all.checked = suite;
    all.indeterminate = sel.length > 0 && !suite;
    Array.prototype.forEach.call(links, function (a) {
      var p = a.dataset.betaPlatform, b = latest[p] || {}, per = b.plugins || {};
      var ver = who.querySelector('[data-beta-ver="' + p + '"]');
      var useSuite = suite && b.url && b.version;
      var have = sel.filter(function (n) { return per[n] && per[n].url; });
      a.removeAttribute("target");
      a.dataset.betaVersion = useSuite ? b.version : have.map(function (n) { return per[n].version; }).filter(function (v, i, l) { return l.indexOf(v) === i; }).join("/");
      if (useSuite) {
        a.href = direct(b.url);
        a.classList.remove("is-soon");
        var d = b.date ? new Date(b.date + "T12:00:00") : null;
        ver.textContent = "v" + b.version + (d ? " · " + MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear() : "") + (b.size ? " · " + Math.max(1, Math.round(b.size / 1e6)) + " MB" : "");
      } else if (have.length) {
        a.href = "#";
        a.classList.remove("is-soon");
        var mb = have.reduce(function (t, n) { return t + (per[n].size || 0); }, 0);
        ver.textContent = have.length + (have.length === 1 ? " plugin" : " plugins") + (a.dataset.betaVersion ? " · v" + a.dataset.betaVersion : "") + (mb ? " · " + Math.max(1, Math.round(mb / 1e6)) + " MB" : "") + (have.length < sel.length ? " · " + (sel.length - have.length) + " not ready yet" : "");
      } else {
        a.href = "#";
        a.classList.add("is-soon");
        ver.textContent = sel.length ? "Coming soon" : "Pick at least one plugin";
      }
    });
    refresh();
  }
  // One installer per ticked plugin. Browsers block a burst of downloads, so they start one at a time
  // in hidden frames, and a list of direct links shows in case any is blocked.
  function many(p) {
    var per = (latest[p] || {}).plugins || {}, sel = chosen();
    filesList.textContent = "";
    sel.forEach(function (n, i) {
      var li = document.createElement("li");
      if (per[n] && per[n].url) {
        var url = direct(per[n].url), link = document.createElement("a");
        link.className = "text-link"; link.href = url; link.setAttribute("download", ""); link.textContent = n;
        li.appendChild(link);
        setTimeout(function () {
          var f = document.createElement("iframe");
          f.hidden = true; f.src = url;
          document.body.appendChild(f);
          setTimeout(function () { f.remove(); }, 60000);
        }, i * 1200);
      } else { li.className = "soon"; li.textContent = n + " (not ready yet)"; }
      filesList.appendChild(li);
    });
    files.hidden = false;
  }

  fetch("/beta/latest.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { latest = j || {}; fill(); }).catch(function () {});
  all.addEventListener("change", function () { picks.forEach(function (c) { c.checked = all.checked; }); fill(); });
  picks.forEach(function (c) { c.addEventListener("change", fill); });

  name.addEventListener("input", refresh);
  email.addEventListener("input", refresh);

  Array.prototype.forEach.call(links, function (a) {
    a.addEventListener("click", function (e) {
      if (a.classList.contains("is-soon")) { e.preventDefault(); return; }
      if (!refresh()) { e.preventDefault(); nag(); return; }
      // Feedback typed but not sent yet goes along with the download.
      var text = note.value.trim(), sel = chosen();
      var suite = a.getAttribute("href") !== "#";
      if (!suite) { e.preventDefault(); many(a.dataset.betaPlatform); }
      send({ kind: "download", platform: LABEL[a.dataset.betaPlatform], version: a.dataset.betaVersion || "", plugins: suite ? "Full suite" : sel.join(", "), message: text });
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
