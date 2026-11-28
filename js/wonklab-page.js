// Wonk Lab only. Loaded after js/site.js so the rendered Demo buttons can be relabeled.
(function () {
  Array.prototype.forEach.call(document.querySelectorAll("a.btn-demo"), function (btn) {
    var label = btn.getAttribute("aria-label") || "";
    if (btn.textContent.trim() === "Download Demo" || /^Download Demo:/i.test(label)) {
      btn.textContent = "Download 7-day demo";
      if (/^Download Demo:/i.test(label)) {
        btn.setAttribute("aria-label", label.replace(/^Download Demo:/i, "Download 7-day demo:"));
      } else {
        btn.setAttribute("aria-label", "Download 7-day demo");
      }
    }
  });
})();

// Wonk Lab only: rent-to-own on The Everything Suite card (drawn by js/site.js from BUNDLE).
(function () {
  var root = document.getElementById("suite-root");
  if (!root || typeof BUNDLE === "undefined" || !BUNDLE.rtoLink) return;
  var actions = root.querySelector(".suite-actions");
  if (!actions) return;
  var buy = actions.querySelector(".btn-buy");
  if (buy) { buy.textContent = "Buy it: " + BUNDLE.price; buy.classList.remove("lemonsqueezy-button"); }
  var rto = document.createElement("a");
  rto.className = "btn btn-demo";
  rto.href = BUNDLE.rtoLink;
  rto.textContent = "Rent-to-own: $10/mo";
  rto.setAttribute("aria-label", "Rent-to-own The Everything Suite: $10 a month for 10 months, then it's yours");
  actions.appendChild(rto);
  var terms = document.createElement("p");
  terms.className = "suite-rto-terms";
  terms.textContent = "Rent-to-own: after 10 payments it's yours forever. Stop paying and the plugins lock until you pick it back up. Everything you've paid still counts.";
  actions.parentNode.appendChild(terms);
})();

// Wonk Lab only: free plugins (Dip, Frequalizer, Meter). Email in, download link emailed out by the
// license server (POST /v1/free), so a fake email gets nothing. Replaces the Kit placeholder forms.
(function () {
  var API = "https://license.dirtmonkey.music/v1/free";
  var forms = document.querySelectorAll("#plugin-free .kit-form");
  Array.prototype.forEach.call(forms, function (form) {
    var input = form.querySelector(".kit-email");
    if (!input) return;
    var plugin = input.id.replace(/^kit-email-/, "");
    var label = form.querySelector(".kit-placeholder-label");
    if (label) label.remove();
    form.removeAttribute("data-kit-placeholder");
    form.setAttribute("action", API);
    var note = form.querySelector(".kit-note");
    var btn = form.querySelector("button[type=submit]");
    var opt = document.createElement("label");
    opt.className = "free-optin";
    opt.innerHTML = '<input type="checkbox" name="updates"> Email me when new plugins drop';
    form.insertBefore(opt, btn);
    var noteText = "We email you the download link.";
    if (note) { note.textContent = noteText; note.setAttribute("role", "status"); note.setAttribute("aria-live", "polite"); }
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var email = input.value.trim();
      if (!input.checkValidity() || !email) { if (note) note.textContent = "That email doesn't look right."; input.focus(); return; }
      btn.disabled = true;
      if (note) note.textContent = "Sending…";
      fetch(API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email, plugin: plugin, updates: opt.querySelector("input").checked })
      }).then(function (res) {
        if (res.ok) {
          form.classList.add("is-sent");
          if (note) note.textContent = "Check your inbox for the download link (and your spam folder, just in case).";
          btn.textContent = "Sent!";
          return;
        }
        btn.disabled = false;
        if (note) note.textContent = res.status === 400 ? "That email doesn't look right." : res.status === 429 ? "Too many tries. Wait a minute and try again." : "Couldn't send right now. Try again in a minute.";
      }).catch(function () {
        btn.disabled = false;
        if (note) note.textContent = "Couldn't send right now. Try again in a minute.";
      });
    });
  });
})();
