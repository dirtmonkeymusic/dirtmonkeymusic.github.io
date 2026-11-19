// Wonk Lab checkout (/wonklab/buy/?p=<id>) and thanks (/wonklab/thanks/) pages.
// Prices and test mode come from the license server; Stripe or PayPal hosts the actual payment page.
(function () {
  var API = "https://license.dirtmonkey.music";
  var root = document.getElementById("checkout");
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var q = new URLSearchParams(location.search);

  function money(cents) { return "$" + (cents / 100).toFixed(cents % 100 ? 2 : 0); }

  fetch(API + "/v1/store/products").then(function (r) { return r.json(); }).then(function (cat) {
    if (cat.test_mode) $("test-banner").hidden = false;
    if (root.dataset.page !== "buy") return;
    var p = (cat.products || []).filter(function (x) { return x.id === q.get("p"); })[0];
    if (!p) { $("p-name").textContent = "That plugin isn't for sale here."; $("pay-stripe").hidden = $("pay-paypal").hidden = true; return; }
    $("p-name").textContent = p.name;
    $("p-price").textContent = money(p.cents);
    $("p-limit").textContent = cat.machine_limit || 2;
    document.title = p.name + " checkout — Wonk Lab";
    if (q.get("cancelled")) $("msg").textContent = "Checkout cancelled. Nothing was charged.";
  }).catch(function () {
    if (root.dataset.page === "buy") $("p-name").textContent = "Checkout is offline. Try again in a minute.";
  });

  if (root.dataset.page === "thanks") {
    if (q.get("status") === "error") { $("t-title").textContent = "Something went wrong"; $("t-body").textContent = "Your payment did not go through, or we could not confirm it. If you were charged, email us and we will sort it out."; }
    if (q.get("status") === "pending") { $("t-title").textContent = "Payment pending"; $("t-body").textContent = "PayPal is still confirming the payment. Your key arrives by email as soon as it clears."; }
    return;
  }

  function go(provider) {
    var btns = [$("pay-stripe"), $("pay-paypal")];
    btns.forEach(function (b) { b.disabled = true; });
    $("msg").textContent = "Opening " + (provider === "paypal" ? "PayPal" : "secure card checkout") + "…";
    var email = $("email").value.trim();
    fetch(API + "/v1/store/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ product: q.get("p"), provider: provider, email: email || undefined })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); }).then(function (res) {
      if (res.ok && res.j.url) { location.href = res.j.url; return; }
      btns.forEach(function (b) { b.disabled = false; });
      $("msg").textContent = res.status === 503 ? "This payment option isn't switched on yet." : res.status === 429 ? "Too many tries. Wait a minute and try again." : "Checkout could not start. Try again in a minute.";
    }).catch(function () {
      btns.forEach(function (b) { b.disabled = false; });
      $("msg").textContent = "Checkout could not start. Check your connection and try again.";
    });
  }
  $("pay-stripe").addEventListener("click", function () { go("stripe"); });
  $("pay-paypal").addEventListener("click", function () { go("paypal"); });
})();
