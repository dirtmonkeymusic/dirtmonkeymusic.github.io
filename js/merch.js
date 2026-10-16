// You do not need to edit this file.
// The Merch page draws its cards from the Bass Threads store.
// It shows the saved list in merch-snapshot.js first, then asks the
// store for the live list. If the store answers, the live list replaces
// the saved one. If it does not (store down, or the browser blocks the
// request), the saved list stays. Checkout always happens on Bass Threads.

(function () {
  var STORE = "https://dirtmonkey.bassthreadsmerch.com/";
  var API = STORE + "wp-json/wc/store/v1/products?per_page=100";
  var ACCENTS = ["cyan", "magenta", "mint"];
  var TIMEOUT_MS = 6000;

  var grid = document.getElementById("merch-grid");
  var note = document.getElementById("merch-note");
  if (!grid) return;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function httpsUrl(url) {
    var value = String(url || "").trim();
    return /^https:\/\//i.test(value) ? value : "";
  }

  // Store names arrive with HTML entities, for example Can&#8217;t.
  function decode(text) {
    var doc = new DOMParser().parseFromString("<!doctype html><body>" + String(text || ""), "text/html");
    return doc.body.textContent || "";
  }

  function amount(cents, minorUnit) {
    var unit = Number(minorUnit);
    if (!(unit >= 0)) unit = 2;
    var value = Number(cents) / Math.pow(10, unit);
    if (!isFinite(value)) return "";
    return Math.abs(value - Math.round(value)) < 0.001 ? String(Math.round(value)) : value.toFixed(unit);
  }

  function priceText(prices) {
    if (!prices) return "";
    var prefix = prices.currency_prefix || "";
    var suffix = prices.currency_suffix || "";
    var range = prices.price_range;
    if (range && range.min_amount && range.max_amount && range.min_amount !== range.max_amount) {
      return "From " + prefix + amount(range.min_amount, prices.currency_minor_unit) + suffix;
    }
    var value = amount(prices.price, prices.currency_minor_unit);
    return value ? prefix + value + suffix : "";
  }

  function card(product, index) {
    var link = httpsUrl(product.permalink);
    if (!link) return "";
    var fullName = decode(product.name).trim();
    var presale = /presale/i.test(fullName);
    var name = fullName.replace(/\s*\*?\s*presale\s*\*?\s*/gi, " ").replace(/\s+/g, " ").trim() || fullName;
    var image = (product.images || [])[0] || {};
    var src = httpsUrl(image.thumbnail || image.src);
    var price = priceText(product.prices);
    var accent = ACCENTS[index % ACCENTS.length];
    var art = src
      ? '<img src="' + esc(src) + '" width="600" height="600" loading="lazy" decoding="async" alt="">'
      : '<span class="merch-noimg" aria-hidden="true">Dirt Monkey</span>';
    return (
      '<li><a class="plugin-card merch-card accent-' + accent + '" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' +
        '<div class="plugin-art merch-art">' + art + "</div>" +
        '<div class="plugin-body">' +
          '<div class="plugin-heading">' +
            '<h2 class="merch-name">' + esc(name) + "</h2>" +
            (price ? '<p class="price">' + esc(price) + "</p>" : "") +
          "</div>" +
          (presale ? '<ul class="chips"><li class="chip chip-presale">Presale</li></ul>' : "") +
          '<span class="btn btn-demo merch-go">View item<span class="visually-hidden"> (opens the Bass Threads store in a new tab)</span></span>' +
        "</div>" +
      "</a></li>"
    );
  }

  function render(list, live) {
    var cards = (list || []).map(card).filter(Boolean);
    if (!cards.length) return false;
    grid.innerHTML = cards.join("");
    grid.setAttribute("data-source", live ? "live" : "snapshot");
    if (note) note.hidden = live;
    return true;
  }

  var shown = render(typeof MERCH_SNAPSHOT === "undefined" ? [] : MERCH_SNAPSHOT, false);

  function giveUp() {
    if (shown) return;
    grid.innerHTML =
      '<li class="shop-error merch-error">The merch list did not load. ' +
      '<a href="' + STORE + '" target="_blank" rel="noopener noreferrer">Open the Bass Threads store</a> to see everything.</li>';
    if (note) note.hidden = true;
  }

  if (!("fetch" in window)) return giveUp();

  var controller = "AbortController" in window ? new AbortController() : null;
  var timer = window.setTimeout(function () {
    if (controller) controller.abort();
  }, TIMEOUT_MS);

  fetch(API, {
    credentials: "omit",
    headers: { Accept: "application/json" },
    signal: controller ? controller.signal : undefined
  })
    .then(function (response) {
      if (!response.ok) throw new Error("Store answered " + response.status);
      return response.json();
    })
    .then(function (data) {
      if (!Array.isArray(data) || !render(data, true)) giveUp();
    })
    .catch(giveUp)
    .then(function () {
      window.clearTimeout(timer);
    });
})();
