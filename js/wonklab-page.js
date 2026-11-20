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
