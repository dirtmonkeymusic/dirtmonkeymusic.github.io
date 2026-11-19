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
    if (cat.paypal_client_id) loadPayPal(cat);
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
  // PayPal JS SDK: PayPal + Venmo buttons. Orders are created and captured by the license server
  // (same order, email, key and webhook flow as the redirect). The client id is PayPal's public id.
  function loadPayPal(cat) {
    var src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(cat.paypal_client_id) +
      "&currency=USD&intent=capture&components=buttons&enable-funding=venmo&disable-funding=card,credit,paylater";
    // Sandbox testing only: ?buyer-country=US makes Venmo show on desktop. PayPal ignores this outside sandbox, so we only pass it there.
    if (cat.paypal_env === "sandbox" && /^[A-Z]{2}$/.test(q.get("buyer-country") || "")) src += "&buyer-country=" + q.get("buyer-country");
    var s = document.createElement("script");
    s.src = src; s.async = true; s.setAttribute("data-namespace", "paypalSDK");
    var timer = setTimeout(function () { s.onload = null; }, 10000); // too slow: keep the redirect button
    s.onload = function () { clearTimeout(timer); try { renderPayPal(); } catch (e) { /* keep redirect fallback */ } };
    s.onerror = function () { clearTimeout(timer); };
    document.head.appendChild(s);
  }
  function renderPayPal() {
    var sdk = window.paypalSDK, box = $("paypal-buttons");
    if (!sdk || !sdk.Buttons) return;
    var via = "paypal", shown = 0;
    [[sdk.FUNDING.PAYPAL, "paypal"], [sdk.FUNDING.VENMO, "venmo"]].forEach(function (f) {
      var el = document.createElement("div");
      el.className = "pp-btn pp-" + f[1];
      var b = sdk.Buttons({
        fundingSource: f[0],
        style: { layout: "vertical", shape: "pill", height: 44, label: "pay" },
        createOrder: function () {
          via = f[1]; $("msg").textContent = "Opening " + (f[1] === "venmo" ? "Venmo" : "PayPal") + "…";
          return fetch(API + "/v1/store/checkout", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ product: q.get("p"), provider: "paypal", sdk: true, email: $("email").value.trim() || undefined })
          }).then(function (r) { return r.json().then(function (j) {
            if (!r.ok || !j.id) throw new Error(r.status === 429 ? "Too many tries. Wait a minute and try again." : "Checkout could not start. Try again in a minute.");
            return j.id;
          }); });
        },
        onApprove: function (data) {
          $("msg").textContent = "Confirming your payment…";
          return fetch(API + "/v1/store/paypal/capture", {
            method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: data.orderID })
          }).then(function (r) { return r.json(); }).then(function (j) {
            location.href = "/wonklab/thanks/?via=" + via + "&status=" + encodeURIComponent(j.status || "error");
          }).catch(function () { location.href = "/wonklab/thanks/?via=" + via + "&status=pending"; });
        },
        onCancel: function () { $("msg").textContent = "Checkout cancelled. Nothing was charged."; },
        onError: function (err) { $("msg").textContent = (err && err.message && err.message.length < 120) ? err.message : "PayPal had a problem. Try again, or pay with card."; }
      });
      if (b.isEligible()) { box.appendChild(el); b.render(el); shown++; }
    });
    if (shown) { box.hidden = false; $("pay-paypal").hidden = true; $("pay-paypal").style.display = "none"; } // SDK buttons replace the redirect button
  }

  $("pay-stripe").addEventListener("click", function () { go("stripe"); });
  $("pay-paypal").addEventListener("click", function () { go("paypal"); }); // redirect fallback
})();
