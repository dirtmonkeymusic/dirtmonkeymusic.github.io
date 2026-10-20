// The hidden beta page (/beta/). The page content is encrypted (AES-GCM) in
// /assets/beta/content.enc. Each invite code unwraps the content key from
// /beta/keys.json (PBKDF2-SHA256 from the code). A good code is remembered on
// this device, so testers get straight in next time. Codes: dev/beta-codes.js.
(function () {
  "use strict";
  var STORE = "dm-beta-code";
  var WHO = "dm-beta-who";
  // EDIT: where each download is logged (name, email, plugin, version, time). Empty means no logging yet.
  // See dev/beta-log-worker/README.md. It will look like "https://dm-beta-log.<you>.workers.dev/log".
  var LOG_URL = "";
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var form = document.querySelector("[data-beta-form]");
  var input = document.querySelector("[data-beta-code]");
  var button = document.querySelector("[data-beta-unlock]");
  var error = document.querySelector("[data-beta-error]");
  var lock = document.querySelector("[data-beta-lock]");
  var out = document.querySelector("[data-beta-content]");
  if (!form || !window.crypto || !crypto.subtle) return;
  var subtle = crypto.subtle;
  var keysP = null, blobP = null;

  function unb64(s) {
    var bin = atob(s), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  function hex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }
  // Same as dev/beta-codes.js: upper case, letters and digits only, "MONKEY-" in front.
  function normalize(code) {
    var s = String(code).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (s.indexOf("MONKEY") === 0) s = s.slice(6);
    return "MONKEY-" + s;
  }
  function pbkdf2(code, salt, iterations, bits) {
    return subtle.importKey("raw", new TextEncoder().encode(normalize(code)), "PBKDF2", false, ["deriveBits"]).then(function (base) {
      return subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt, iterations: iterations }, base, bits);
    });
  }
  function getKeys() {
    keysP = keysP || fetch("/beta/keys.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error("keys"); return r.json(); });
    return keysP;
  }
  function getBlob() {
    blobP = blobP || fetch("/assets/beta/content.enc", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error("content"); return r.arrayBuffer(); });
    return blobP;
  }

  function unlock(code) {
    var keys;
    return getKeys().then(function (k) {
      keys = k;
      return pbkdf2(code, unb64(keys.lookupSalt), keys.iterations, 128);
    }).then(function (id) {
      var entry = keys.keys[hex(id)];
      if (!entry) throw new Error("bad code");
      return pbkdf2(code, unb64(entry.salt), keys.iterations, 256).then(function (raw) {
        return subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
      }).then(function (wrapKey) {
        return subtle.decrypt({ name: "AES-GCM", iv: unb64(entry.iv) }, wrapKey, unb64(entry.key));
      });
    }).then(function (contentKey) {
      return Promise.all([subtle.importKey("raw", contentKey, "AES-GCM", false, ["decrypt"]), getBlob()]);
    }).then(function (both) {
      var blob = new Uint8Array(both[1]);
      return subtle.decrypt({ name: "AES-GCM", iv: blob.slice(0, 12) }, both[0], blob.slice(12));
    }).then(function (plain) {
      return new TextDecoder().decode(plain);
    });
  }

  function show(html) {
    out.innerHTML = html;
    out.hidden = false;
    lock.hidden = true;
    document.body.classList.add("is-unlocked");
    gateDownloads();
  }

  // Downloads need a name and a working email. Each download is logged (when LOG_URL is set).
  function gateDownloads() {
    var who = out.querySelector("[data-beta-who]");
    if (!who) return;
    var name = who.querySelector("[data-beta-name]");
    var email = who.querySelector("[data-beta-email]");
    var err = who.querySelector("[data-beta-who-error]");
    var links = out.querySelectorAll(".beta-download:not(.is-soon)");
    try {
      var saved = JSON.parse(localStorage.getItem(WHO) || "null");
      if (saved) { name.value = saved.name || ""; email.value = saved.email || ""; }
    } catch (e) {}
    function good() { return name.value.trim().length > 0 && EMAIL.test(email.value.trim()); }
    function refresh() {
      var ok = good();
      for (var i = 0; i < links.length; i++) {
        links[i].classList.toggle("is-gated", !ok);
        links[i].setAttribute("aria-disabled", ok ? "false" : "true");
      }
      if (ok) err.hidden = true;
      return ok;
    }
    name.addEventListener("input", refresh);
    email.addEventListener("input", refresh);
    var note = who.querySelector("[data-beta-feedback]");
    var sent = who.querySelector("[data-beta-sent]");
    function send(row) {
      try { localStorage.setItem(WHO, JSON.stringify({ name: row.name, email: row.email })); } catch (x) {}
      var to = window.DM_BETA_LOG_URL || LOG_URL;
      if (to && navigator.sendBeacon) navigator.sendBeacon(to, new Blob([JSON.stringify(row)], { type: "text/plain" }));
    }
    // Send feedback: works before or after a download, and never blocks the downloads.
    who.addEventListener("submit", function (e) {
      e.preventDefault();
      sent.hidden = true;
      if (!refresh()) { err.hidden = false; (name.value.trim() ? email : name).focus(); return; }
      var text = note.value.trim();
      if (!text) { note.focus(); return; }
      send({ kind: "feedback", name: name.value.trim(), email: email.value.trim(), message: text, ts: new Date().toISOString() });
      note.value = "";
      sent.hidden = false;
    });
    Array.prototype.forEach.call(links, function (a) {
      a.addEventListener("click", function (e) {
        if (!refresh()) {
          e.preventDefault();
          err.hidden = false;
          (name.value.trim() ? email : name).focus();
          return;
        }
        // Any feedback typed but not sent yet rides along with the download.
        var text = note.value.trim();
        send({ kind: "download", name: name.value.trim(), email: email.value.trim(), plugin: a.dataset.betaDownload, version: a.dataset.betaVersion || "", message: text, ts: new Date().toISOString() });
        if (text) { note.value = ""; sent.hidden = false; }
      });
    });
    refresh();
  }

  function attempt(code, quiet) {
    button.disabled = true;
    error.hidden = true;
    return unlock(code).then(function (html) {
      try { localStorage.setItem(STORE, normalize(code)); } catch (e) {}
      show(html);
    }, function () {
      if (quiet) {
        try { localStorage.removeItem(STORE); } catch (e) {}
      } else {
        error.hidden = false;
        input.focus();
        input.select();
      }
    }).then(function () { button.disabled = false; });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (input.value.trim()) attempt(input.value, false);
  });

  var saved = null;
  try { saved = localStorage.getItem(STORE); } catch (e) {}
  if (saved) attempt(saved, true);

  // For the tests.
  window.dmBeta = { unlock: unlock, normalize: normalize };
})();
