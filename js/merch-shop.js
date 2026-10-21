// /merch-shop/ (hidden page). Draws the Bass Threads products: photo, name, price, and a SOLD OUT
// or PRESALE badge. Tries the store's Store API live first; the store sends no CORS header today,
// so browsers fall back to the saved list in /merch/products.json (node dev/merch-sync.js).
// Buy: in-stock simple items add straight to the Bass Threads cart (?add-to-cart=<id>);
// items with sizes or options, and sold-out items, open the product page.
(function () {
  "use strict";
  var STORE = "https://dirtmonkey.bassthreadsmerch.com/";
  var API = STORE + "wp-json/wc/store/v1/products?per_page=100";
  var SNAPSHOT = "/merch/products.json";
  var ACCENTS = ["cyan", "magenta", "mint"];
  var grid = document.getElementById("shop-grid");
  var note = document.getElementById("shop-note");
  if (!grid) return;

  function esc(v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function https(u) { u = String(u || "").trim(); return /^https:\/\//i.test(u) ? u : ""; }
  // Names arrive with HTML entities, for example Can&#8217;t. Dashes become plain hyphens.
  function decode(t) {
    var d = new DOMParser().parseFromString("<!doctype html><body>" + String(t || ""), "text/html");
    return (d.body.textContent || "").replace(/[\u2013\u2014]/g, "-");
  }
  function amount(c, u) { u = Number(u); if (!(u >= 0)) u = 2; var v = Number(c) / Math.pow(10, u); if (!isFinite(v)) return ""; return Math.abs(v - Math.round(v)) < 0.001 ? String(Math.round(v)) : v.toFixed(u); }
  function price(p) {
    if (!p) return "";
    var pre = p.currency_prefix || "", suf = p.currency_suffix || "", r = p.price_range;
    if (r && r.min_amount && r.max_amount && r.min_amount !== r.max_amount) return "From " + pre + amount(r.min_amount, p.currency_minor_unit) + suf;
    var v = amount(p.price, p.currency_minor_unit);
    return v ? pre + v + suf : "";
  }
  function buyLink(p) {
    var simple = p.type === "simple" && !p.has_options;
    if (simple && p.is_in_stock && p.is_purchasable && p.id) return { href: STORE + "?add-to-cart=" + encodeURIComponent(p.id), text: "Buy" };
    if (!p.is_in_stock) return { href: https(p.permalink), text: "View item" };
    return { href: https(p.permalink), text: "Choose options" };
  }
  function card(p, i) {
    var full = decode(p.name).trim();
    var presale = /presale/i.test(full);
    var name = full.replace(/\s*\*?\s*presale\s*\*?\s*/gi, " ").replace(/\s+/g, " ").trim() || full;
    var soldout = !p.is_in_stock;
    var img = (p.images || [])[0] || {};
    var src = https(img.src || img.thumbnail);
    var buy = buyLink(p);
    if (!buy.href) return "";
    var badge = presale ? '<span class="shop-badge shop-badge-presale">Presale</span>' : soldout ? '<span class="shop-badge shop-badge-soldout">Sold out</span>' : "";
    var pr = price(p.prices);
    return '<li><div class="plugin-card merch-card shop-card accent-' + ACCENTS[i % ACCENTS.length] + (soldout ? " is-soldout" : "") + '" data-id="' + esc(p.id) + '">' +
      '<div class="plugin-art merch-art">' + badge + (src ? '<img src="' + esc(src) + '" width="600" height="600" loading="lazy" decoding="async" alt="' + esc(name) + '">' : '<span class="merch-noimg" aria-hidden="true">Dirt Monkey</span>') + "</div>" +
      '<div class="plugin-body"><div class="plugin-heading"><h2 class="merch-name">' + esc(name) + "</h2>" + (pr ? '<p class="price">' + esc(pr) + "</p>" : "") + "</div>" +
      '<a class="btn btn-demo merch-go shop-buy" href="' + esc(buy.href) + '" target="_blank" rel="noopener noreferrer">' + esc(buy.text) + '<span class="visually-hidden"> ' + esc(name) + " (opens the Bass Threads store in a new tab)</span></a>" +
      "</div></div></li>";
  }
  function render(list, source, saved) {
    var cards = (list || []).map(card).filter(Boolean);
    if (!cards.length) return false;
    grid.innerHTML = cards.join("");
    grid.setAttribute("data-source", source);
    if (note) { note.hidden = source === "live"; note.textContent = saved ? "Prices as of " + saved + ". The store has the latest prices and sizes." : ""; }
    return true;
  }
  function giveUp() {
    grid.innerHTML = '<li class="shop-error merch-error">The merch list did not load. <a href="' + STORE + '" target="_blank" rel="noopener noreferrer">Open the Bass Threads store</a> to see everything.</li>';
  }
  function snapshot() {
    return fetch(SNAPSHOT, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { if (!render(d.products, "snapshot", d.saved)) giveUp(); }).catch(giveUp);
  }
  var ctl = "AbortController" in window ? new AbortController() : null;
  var t = setTimeout(function () { if (ctl) ctl.abort(); }, 5000);
  fetch(API, { credentials: "omit", headers: { Accept: "application/json" }, signal: ctl ? ctl.signal : undefined })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (d) { clearTimeout(t); if (!Array.isArray(d) || !render(d, "live")) return snapshot(); })
    .catch(function () { clearTimeout(t); return snapshot(); });
})();
