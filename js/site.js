// You do not need to edit this file.
// Prices, descriptions, and links live in products.js.
// Page wording (hero, FAQ, footer) lives in index.html.
//
// Preview a date: add ?now= to the address, for example
//   index.html?now=2026-11-21T12:00:00-06:00
// The Founders countdown and the suite/Founders switch then act as if
// it were that moment. Visitors never see this unless they type it.

(function () {
  var ACCENTS = ["cyan", "magenta", "mint"];

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function safeUrl(url) {
    var value = String(url || "").trim();
    if (/^\s*javascript:/i.test(value)) return "#";
    return value;
  }

  function money(value) {
    var text = String(value == null ? "" : value).trim();
    if (/^free$/i.test(text)) return 0;
    var n = parseFloat(text.replace(/[^0-9.]/g, ""));
    return isFinite(n) ? n : 0;
  }

  function dollars(amount) {
    var rounded = Math.round(amount * 100) / 100;
    if (Math.abs(rounded - Math.round(rounded)) < 0.001) return "$" + Math.round(rounded);
    return "$" + rounded.toFixed(2);
  }

  function isFreePlugin(product) {
    if (!product) return false;
    if (product.free === true) return true;
    var text = String(product.price == null ? "" : product.price).trim();
    return /^free$/i.test(text) || text === "$0" || text === "0";
  }

  function priceLabel(product) {
    return isFreePlugin(product) ? "Free" : String(product.price || "");
  }

  function accentOf(product) {
    var accent = String(product.accent || "").trim().toLowerCase();
    return ACCENTS.indexOf(accent) === -1 ? "cyan" : accent;
  }

  function findProduct(id) {
    var found = null;
    (typeof PRODUCTS === "undefined" ? [] : PRODUCTS).forEach(function (item) {
      if (item.id === id) found = item;
    });
    return found;
  }

  function paidIncluded(ids) {
    return (ids || []).map(findProduct).filter(function (product) {
      return product && !isFreePlugin(product);
    });
  }

  function suiteSaveNote(bundle) {
    var sum = 0;
    paidIncluded(bundle.includes).forEach(function (product) {
      sum += money(product.price);
    });
    var save = sum - money(bundle.price);
    if (!(save > 0)) return "";
    return "Save " + dollars(save) + " vs. buying separately";
  }

  function listNames(products) {
    var names = products.map(function (product) { return product.name; });
    if (names.length < 3) return names.join(" and ");
    return names.slice(0, -1).join(", ") + ", and " + names[names.length - 1];
  }

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function monthName(month) {
    return MONTHS[(Number(month) || 1) - 1] || "";
  }

  function clockLabel(part, zoneLabel) {
    var hour = Number(part.hour) || 0;
    var minute = Number(part.minute) || 0;
    var suffix = hour >= 12 ? "PM" : "AM";
    var h12 = hour % 12 || 12;
    var mm = minute < 10 ? "0" + minute : String(minute);
    return h12 + ":" + mm + " " + suffix + (zoneLabel ? " " + zoneLabel : "");
  }

  function dateLabel(part) {
    return monthName(part.month) + " " + part.day + ", " + part.year;
  }

  function dayLabel(part) {
    return monthName(part.month) + " " + part.day;
  }

  // Wall-clock time in a named zone, as a UTC millisecond timestamp.
  function zonedInstant(part, timeZone) {
    var utcGuess = Date.UTC(part.year, part.month - 1, part.day, part.hour || 0, part.minute || 0, part.second || 0);
    var dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });
    var map = {};
    dtf.formatToParts(new Date(utcGuess)).forEach(function (piece) {
      if (piece.type !== "literal") map[piece.type] = piece.value;
    });
    var asUtc = Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour, +map.minute, +map.second);
    return utcGuess - (asUtc - utcGuess);
  }

  var clockOffset = (function () {
    var match = /[?&]now=([^&#]+)/.exec(window.location.search);
    if (!match) return 0;
    var at = Date.parse(decodeURIComponent(match[1]));
    return isFinite(at) ? at - Date.now() : 0;
  })();

  function now() {
    return Date.now() + clockOffset;
  }

  function kitForm(opts) {
    var emailId = "kit-email-" + opts.id;
    var formId = opts.formId || "PLACEHOLDER";
    var tags = String(opts.tags || "");
    return (
      "<!-- PLACEHOLDER Kit embed. Form ID: " + esc(formId) + ". Tags: " + esc(tags) + ". Replace this whole form with the Kit inline embed. It does not submit anywhere yet. -->" +
      '<form class="kit-form" action="#kit-placeholder" method="post" novalidate' +
        ' data-kit-placeholder="true"' +
        ' data-kit-form-id="' + esc(formId) + '"' +
        ' data-kit-tags="' + esc(tags) + '"' +
        ' data-kit-source="source-website">' +
        '<p class="kit-placeholder-label">Placeholder</p>' +
        '<label class="kit-label" for="' + esc(emailId) + '">Email</label>' +
        '<input class="kit-email" id="' + esc(emailId) + '" type="email" name="email_address" autocomplete="email" inputmode="email" placeholder="you@email.com" required>' +
        '<button class="btn btn-buy" type="submit">' + esc(opts.button || "Get it free") + "</button>" +
        '<p class="kit-note">' + esc(opts.note || "") + "</p>" +
      "</form>"
    );
  }

  // Shown only for a plugin with no screenshot yet.
  function genericArt(name) {
    return (
      '<svg viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
        '<rect width="640" height="400" rx="28" fill="#100814"/>' +
        '<rect x="10" y="10" width="620" height="380" rx="20" fill="#0b0710" stroke="#3dfff2" stroke-opacity="0.55" stroke-width="2"/>' +
        '<text x="32" y="52" fill="#f6f2fb" font-family="JetBrains Mono, ui-monospace, monospace" font-size="26" font-weight="700">' + esc(name).toUpperCase() + "</text>" +
        '<circle cx="320" cy="220" r="70" fill="none" stroke="#3dfff2" stroke-width="3"/>' +
        '<circle cx="320" cy="220" r="40" fill="none" stroke="#ff2bd6" stroke-width="3"/>' +
        '<circle cx="320" cy="220" r="8" fill="#d6ff4a"/>' +
      "</svg>"
    );
  }

  // The PNG is the fallback. The WebP copies sit next to it as name-720.webp.
  function shotImg(product, opts) {
    var shot = String(product.screenshot || "").trim();
    var width = Number(product.shotWidth) || 0;
    var height = Number(product.shotHeight) || 0;
    var base = shot.replace(/\.(png|jpe?g|webp)$/i, "");
    var srcset = (product.shotSizes || [])
      .map(Number)
      .filter(function (w) { return w > 0; })
      .map(function (w) { return safeUrl(base + "-" + w + ".webp") + " " + w + "w"; })
      .join(", ");
    return (
      '<img src="' + esc(safeUrl(shot)) + '"' +
        (srcset ? ' srcset="' + esc(srcset) + '" sizes="' + esc(opts.sizes) + '"' : "") +
        (width && height ? ' width="' + width + '" height="' + height + '"' : "") +
        ' loading="lazy" decoding="async"' +
        ' alt="' + esc(opts.alt) + '">'
    );
  }

  function chips(formats) {
    return String(formats || "")
      .split(",")
      .map(function (part) { return part.trim(); })
      .filter(Boolean)
      .map(function (label) {
        var soon = /coming/i.test(label);
        return '<li class="chip' + (soon ? " chip-soon" : "") + '">' + esc(label) + "</li>";
      })
      .join("");
  }

  function coverFrame(accent, inner) {
    return (
      '<svg viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
        '<rect width="640" height="640" fill="#120816"/>' +
        '<rect x="18" y="18" width="604" height="604" rx="36" fill="#0b0710" stroke="' + accent + '" stroke-opacity="0.7" stroke-width="3"/>' +
        inner +
      "</svg>"
    );
  }

  function coverArt(id, name, accent) {
    if (id === "neon-drums") {
      var dots = "";
      for (var i = 0; i < 18; i++) {
        var a = (i / 18) * Math.PI * 2;
        dots +=
          '<circle cx="' + (320 + Math.cos(a) * 220).toFixed(1) +
          '" cy="' + (330 + Math.sin(a) * 220).toFixed(1) +
          '" r="6" fill="#3dfff2"/>';
      }
      return coverFrame("#3dfff2",
        dots +
        '<circle cx="320" cy="330" r="156" fill="none" stroke="#3dfff2" stroke-width="10"/>' +
        '<circle cx="320" cy="330" r="96" fill="none" stroke="#ff2bd6" stroke-width="5"/>' +
        '<circle cx="320" cy="330" r="26" fill="#d6ff4a"/>' +
        '<line x1="168" y1="150" x2="448" y2="246" stroke="#d6ff4a" stroke-width="10" stroke-linecap="round"/>' +
        '<line x1="196" y1="500" x2="470" y2="412" stroke="#ff2bd6" stroke-width="10" stroke-linecap="round"/>'
      );
    }
    if (id === "wonk-vocals") {
      var bars = "";
      var heights = [48, 90, 140, 220, 280, 160, 320, 200, 120, 260, 80, 180, 300, 110, 70, 210, 250, 130];
      for (var v = 0; v < heights.length; v++) {
        var h = heights[v];
        bars +=
          '<rect x="' + (64 + v * 28) + '" y="' + (330 - h / 2) + '" width="14" height="' + h +
          '" rx="7" fill="' + (v % 3 === 0 ? "#ff2bd6" : "#3dfff2") + '"/>';
      }
      return coverFrame("#ff2bd6", bars);
    }
    if (id === "sub-growl") {
      var low = "";
      var high = "";
      for (var x = 70; x <= 570; x += 8) {
        var y = 390 + Math.sin((x - 70) / 78) * 78;
        var cmd = x === 70 ? "M" : "L";
        low += cmd + x + " " + y.toFixed(1) + " ";
        high += cmd + x + " " + (y - 150).toFixed(1) + " ";
      }
      return coverFrame("#d6ff4a",
        '<path d="' + low + '" fill="none" stroke="#d6ff4a" stroke-width="18" stroke-linecap="round"/>' +
        '<path d="' + high + '" fill="none" stroke="#ff2bd6" stroke-width="4" stroke-linecap="round"/>'
      );
    }
    if (id === "jungle-dust") {
      var blocks = "";
      var on = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0];
      var n = 0;
      for (var row = 0; row < 4; row++) {
        for (var col = 0; col < 8; col++) {
          if (!on[n % on.length]) { n++; continue; }
          blocks +=
            '<rect x="' + (78 + col * 64) + '" y="' + (150 + row * 108) + '" width="36" height="72" rx="8" fill="' +
            ((row + col) % 2 ? "#ff2bd6" : "#3dfff2") + '"/>';
          n++;
        }
      }
      return coverFrame("#ff2bd6", blocks);
    }
    if (id === "riser-lab") {
      return coverFrame("#3dfff2",
        '<path d="M90 500 C 180 480, 240 390, 320 300 S 470 140, 540 110" fill="none" stroke="#3dfff2" stroke-width="8" stroke-linecap="round"/>' +
        '<path d="M120 530 C 220 500, 280 420, 360 340 S 500 190, 560 160" fill="none" stroke="#ff2bd6" stroke-width="4" stroke-linecap="round" opacity="0.85"/>' +
        '<polygon points="540,86 572,128 516,124" fill="#d6ff4a"/>' +
        '<circle cx="180" cy="200" r="8" fill="#ff2bd6"/>' +
        '<circle cx="250" cy="160" r="5" fill="#3dfff2"/>' +
        '<circle cx="430" cy="240" r="6" fill="#d6ff4a"/>'
      );
    }
    if (id === "night-market") {
      return coverFrame("#d6ff4a",
        '<circle cx="180" cy="220" r="54" fill="none" stroke="#d6ff4a" stroke-width="6"/>' +
        '<circle cx="430" cy="250" r="80" fill="none" stroke="#ff2bd6" stroke-width="6"/>' +
        '<circle cx="300" cy="420" r="36" fill="#3dfff2"/>' +
        '<rect x="360" y="390" width="120" height="18" rx="9" fill="#d6ff4a" transform="rotate(-18 420 399)"/>' +
        '<rect x="140" y="360" width="90" height="14" rx="7" fill="#ff2bd6" transform="rotate(24 185 367)"/>' +
        '<circle cx="500" cy="160" r="14" fill="#3dfff2"/>' +
        '<circle cx="150" cy="480" r="10" fill="#ff2bd6"/>' +
        '<path d="M240 140 C 280 180, 300 160, 340 200" fill="none" stroke="#d6ff4a" stroke-width="4" stroke-linecap="round"/>'
      );
    }
    return coverFrame(accent === "magenta" ? "#ff2bd6" : accent === "mint" ? "#d6ff4a" : "#3dfff2",
      '<circle cx="320" cy="280" r="110" fill="none" stroke="' + (accent === "magenta" ? "#ff2bd6" : "#3dfff2") + '" stroke-width="6"/>' +
      '<circle cx="320" cy="280" r="16" fill="#d6ff4a"/>' +
      '<text x="320" y="470" text-anchor="middle" fill="#f6f2fb" font-family="JetBrains Mono, ui-monospace, monospace" font-size="36" font-weight="700">' + esc(name) + "</text>"
    );
  }

  function renderPacks() {
    var grid = document.getElementById("pack-grid");
    if (!grid) return;
    if (typeof SAMPLE_PACKS === "undefined" || !SAMPLE_PACKS.length) {
      grid.innerHTML = '<p class="shop-error">The sample pack list did not load. Open js/products.js and check SAMPLE_PACKS for a missing quote or comma.</p>';
      return;
    }

    grid.innerHTML = SAMPLE_PACKS.map(function (pack, index) {
      var accent = ACCENTS[index % ACCENTS.length];
      var buy = safeUrl(pack.buyLink);
      var store = String(pack.store || "Buy").trim();
      var cover = String(pack.cover || "").trim();
      var art = cover
        ? '<img src="' + esc(safeUrl(cover)) + '" loading="lazy" decoding="async" alt="' + esc(pack.name) + ' cover art">'
        : '<div aria-hidden="true">' + coverArt(pack.id, pack.name, accent) + "</div>";
      return (
        '<article class="plugin-card pack-card accent-' + accent + '" id="pack-' + esc(pack.id) + '">' +
          '<div class="plugin-art">' + art + "</div>" +
          '<div class="plugin-body">' +
            '<div class="plugin-heading">' +
              "<h3>" + esc(pack.name) + "</h3>" +
              '<p class="price">' + esc(pack.price) + "</p>" +
            "</div>" +
            '<p class="desc">' + esc(pack.description) + "</p>" +
            '<ul class="chips"><li class="chip chip-store">' + esc(store) + "</li></ul>" +
            '<div class="plugin-actions">' +
              '<a class="btn btn-buy" href="' + esc(buy) + '" target="_blank" rel="noopener noreferrer"' +
                ' aria-label="Buy ' + esc(pack.name) + " on " + esc(store) + '">Buy</a>' +
            "</div>" +
          "</div>" +
        "</article>"
      );
    }).join("");
  }

  var CARD_SIZES = "(max-width: 720px) 92vw, (max-width: 980px) 46vw, 340px";
  var THUMB_SIZES = "(max-width: 980px) 23vw, 130px";

  function pluginCard(product) {
    var free = isFreePlugin(product);
    var demo = safeUrl(product.demoLink);
    var buy = safeUrl(product.buyLink);
    var remoteDemo = /^https?:\/\//i.test(demo);
    var hasShot = String(product.screenshot || "").trim().length > 0;
    var art = hasShot
      ? shotImg(product, {
          sizes: CARD_SIZES,
          alt: product.shotAlt || product.name + " interface"
        })
      : '<div aria-hidden="true">' + genericArt(product.name) + "</div>";
    return (
      '<article class="plugin-card accent-' + accentOf(product) + '" id="' + esc(product.id) + '">' +
        '<div class="plugin-art' + (hasShot ? " is-photo" : "") + '">' + art + "</div>" +
        '<div class="plugin-body">' +
          (product.featured ? '<p class="flag-badge">Flagship synth</p>' : "") +
          '<div class="plugin-heading">' +
            "<h3>" + esc(product.name) + "</h3>" +
            '<p class="price' + (free ? " is-free" : "") + '">' + esc(priceLabel(product)) + "</p>" +
          "</div>" +
          (product.priceNote ? '<p class="price-note">' + esc(product.priceNote) + "</p>" : "") +
          '<p class="desc">' + esc(product.description) + "</p>" +
          '<ul class="chips">' + chips(product.formats) + "</ul>" +
          '<div class="plugin-actions">' +
            (free
              ? kitForm({
                  id: product.id,
                  formId: product.kitFormId,
                  tags: product.kitTags,
                  button: "Get it free",
                  note: "The download link arrives in the confirmation email."
                })
              : (
                '<a class="btn btn-demo" href="' + esc(demo) + '"' + (remoteDemo ? "" : " download") +
                  ' aria-label="Download Demo: ' + esc(product.name) + '">Download Demo</a>' +
                '<a class="btn btn-buy lemonsqueezy-button" href="' + esc(buy) + '"' +
                  ' aria-label="Buy ' + esc(product.name) + '">Buy</a>'
              )) +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function renderProducts() {
    var feature = document.getElementById("plugin-feature");
    var grid = document.getElementById("plugin-grid");
    if (!grid) return;
    if (typeof PRODUCTS === "undefined" || !PRODUCTS.length) {
      grid.innerHTML = '<p class="shop-error">The plugin list did not load. Open js/products.js and check for a missing quote or comma.</p>';
      return;
    }

    var featured = [];
    var paid = [];
    var free = [];
    PRODUCTS.forEach(function (product) {
      if (product.featured && !featured.length) featured.push(product);
      else if (isFreePlugin(product)) free.push(product);
      else paid.push(product);
    });
    if (feature) feature.innerHTML = featured.map(pluginCard).join("");
    grid.innerHTML = paid.map(pluginCard).join("");
    var freeWrap = document.getElementById("plugin-free-wrap");
    var freeGrid = document.getElementById("plugin-free");
    if (freeGrid) freeGrid.innerHTML = free.map(pluginCard).join("");
    if (freeWrap) freeWrap.hidden = free.length === 0;
  }

  function thumbs(ids) {
    return paidIncluded(ids).map(function (product) {
      var hasShot = String(product.screenshot || "").trim().length > 0;
      var img = hasShot ? shotImg(product, { sizes: THUMB_SIZES, alt: "" }) : "";
      return '<li><div class="suite-thumb">' + img + "</div><p>" + esc(product.name) + "</p></li>";
    }).join("");
  }

  function paymentsLine(item) {
    return item.payments ? '<p class="suite-payments">or ' + esc(item.payments) + "</p>" : "";
  }

  function renderSuite() {
    var root = document.getElementById("suite-root");
    if (!root || typeof BUNDLE === "undefined") return;
    var buy = safeUrl(BUNDLE.buyLink);
    var gumroad = safeUrl(BUNDLE.gumroadLink);
    var saveNote = suiteSaveNote(BUNDLE);
    root.innerHTML =
      '<div class="suite-card">' +
        '<div class="section-heading">' +
          '<p class="eyebrow">One download</p>' +
          "<h2>" + esc(BUNDLE.name) + "</h2>" +
          '<p class="lede">' + esc(BUNDLE.description) + "</p>" +
        "</div>" +
        '<ul class="suite-plugins">' + thumbs(BUNDLE.includes) + "</ul>" +
        '<div class="suite-offer">' +
          '<p class="price">' + esc(BUNDLE.price) + "</p>" +
          paymentsLine(BUNDLE) +
          (saveNote ? '<p class="suite-save">' + esc(saveNote) + "</p>" : "") +
          '<div class="suite-actions">' +
            '<a class="btn btn-buy lemonsqueezy-button" href="' + esc(buy) + '"' +
              ' aria-label="Buy the suite: ' + esc(BUNDLE.name) + '">Buy the suite</a>' +
            (gumroad ? '<a class="btn btn-gumroad" href="' + esc(gumroad) + '" target="_blank" rel="noopener noreferrer"' +
              ' aria-label="Gumroad: ' + esc(BUNDLE.name) + '">Gumroad</a>' : "") +
          "</div>" +
        "</div>" +
      "</div>";
  }

  function renderFounders() {
    var root = document.getElementById("founders-root");
    if (!root || typeof FOUNDERS === "undefined") return;
    var zone = FOUNDERS.zoneLabel || "CT";
    var count = Math.floor(Number(FOUNDERS.count));
    var ids = FOUNDERS.includes || (typeof BUNDLE === "undefined" ? [] : BUNDLE.includes);
    var lineup = paidIncluded(ids);
    var after = typeof BUNDLE === "undefined" ? "" : String(BUNDLE.price || "");
    root.innerHTML =
      '<div class="suite-card founders-card">' +
        '<div class="section-heading">' +
          '<p class="eyebrow">One time only</p>' +
          "<h2>" + esc(FOUNDERS.name) + "</h2>" +
          '<p class="lede">Every plugin available at launch, in one download.</p>' +
        "</div>" +
        '<ul class="suite-plugins founders-plugins">' + thumbs(ids) + "</ul>" +
        '<p class="founders-lineup">' + lineup.length + " plugins at launch: " + esc(listNames(lineup)) + ".</p>" +
        '<p class="founders-bonus"><strong>Bonus:</strong> every future Dirt Monkey plugin, free, for life.</p>' +
        '<div class="suite-offer">' +
          '<p class="price">' + esc(FOUNDERS.price) + "</p>" +
          paymentsLine(FOUNDERS) +
          '<p class="suite-save">One time only' + (after ? ", then " + esc(after) : "") + ".</p>" +
        "</div>" +
        '<ul class="founders-facts">' +
          "<li>Email list early access: " + esc(dayLabel(FOUNDERS.opens) + " to " + dayLabel(dayBefore(FOUNDERS.publicOpen))) + ".</li>" +
          "<li>Open to everyone: " + esc(dayLabel(FOUNDERS.publicOpen) + " to " + dayLabel(FOUNDERS.closes)) + ".</li>" +
          "<li>Ends " + esc(dateLabel(FOUNDERS.closes) + " at " + clockLabel(FOUNDERS.closes, zone)) + ".</li>" +
        "</ul>" +
        '<div class="founders-countdown" data-founders-countdown role="timer">' +
          '<p class="founders-countdown-label" data-countdown-label>Early access opens in</p>' +
          '<div class="countdown-units" data-countdown-units>' +
            '<p class="countdown-unit"><strong data-unit="days">00</strong><span>Days</span></p>' +
            '<p class="countdown-unit"><strong data-unit="hours">00</strong><span>Hours</span></p>' +
            '<p class="countdown-unit"><strong data-unit="minutes">00</strong><span>Minutes</span></p>' +
            '<p class="countdown-unit"><strong data-unit="seconds">00</strong><span>Seconds</span></p>' +
          "</div>" +
        "</div>" +
        '<p class="founders-message" data-countdown-message></p>' +
        (count > 0 ? '<p class="founders-count"><strong>' + esc(String(count)) + "</strong> founders so far</p>" : "") +
        kitForm({
          id: FOUNDERS.id,
          formId: FOUNDERS.kitFormId,
          tags: FOUNDERS.kitTags,
          button: "Get early access",
          note: "Join the list for the " + dayLabel(FOUNDERS.opens) + " early access. No checkout on this page."
        }) +
      "</div>";
  }

  function dayBefore(part) {
    var d = new Date(Date.UTC(part.year, part.month - 1, part.day) - 86400000);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  }

  function pad2(n) {
    n = Math.max(0, Math.floor(n));
    return (n < 10 ? "0" : "") + n;
  }

  // Phases: soon (before opens), early (email list only), open (everyone), ended.
  function foundersTimes() {
    var zone = FOUNDERS.timeZone || "America/Chicago";
    return {
      opens: zonedInstant(FOUNDERS.opens, zone),
      publicOpen: zonedInstant(FOUNDERS.publicOpen, zone),
      closes: zonedInstant(FOUNDERS.closes, zone)
    };
  }

  function foundersPhase(times, at) {
    if (at < times.opens) return "soon";
    if (at < times.publicOpen) return "early";
    if (at < times.closes) return "open";
    return "ended";
  }

  function setHidden(selector, hidden) {
    Array.prototype.forEach.call(document.querySelectorAll(selector), function (el) {
      el.hidden = hidden;
    });
  }

  // While Founders is on sale, The Everything Suite steps aside.
  function applyPhase(phase) {
    var founders = phase !== "ended";
    var suite = phase === "soon" || phase === "ended";
    setHidden("#founders", !founders);
    setHidden('nav a[href="#founders"]', !founders);
    setHidden("#suite", !suite);
    setHidden('nav a[href="#suite"]', !suite);
  }

  function startCountdown() {
    if (typeof FOUNDERS === "undefined") return;
    var times = foundersTimes();
    var zone = FOUNDERS.zoneLabel || "CT";
    var root = document.querySelector("[data-founders-countdown]");
    var label = document.querySelector("[data-countdown-label]");
    var message = document.querySelector("[data-countdown-message]");
    var note = document.querySelector("#founders .kit-note");
    var fields = {
      days: document.querySelector('[data-unit="days"]'),
      hours: document.querySelector('[data-unit="hours"]'),
      minutes: document.querySelector('[data-unit="minutes"]'),
      seconds: document.querySelector('[data-unit="seconds"]')
    };
    var copy = {
      soon: {
        label: "Early access opens in",
        target: times.opens,
        message: "Join the email list to get in first on " + dayLabel(FOUNDERS.opens) + ".",
        note: "Join the list for the " + dayLabel(FOUNDERS.opens) + " early access. No checkout on this page."
      },
      early: {
        label: "Opens to everyone in",
        target: times.publicOpen,
        message: "Email list early access is live. Join the list to get the link.",
        note: "The early access link comes by email. No checkout on this page."
      },
      open: {
        label: "Closes in",
        target: times.closes,
        message: "Open to everyone until " + dayLabel(FOUNDERS.closes) + " at " + clockLabel(FOUNDERS.closes, zone) + ".",
        note: "Join the list and the Founders link comes by email. No checkout on this page."
      }
    };
    var current = "";
    var timer = 0;

    function tick() {
      var at = now();
      var phase = foundersPhase(times, at);
      if (phase !== current) {
        current = phase;
        applyPhase(phase);
        if (phase === "ended") {
          window.clearInterval(timer);
          return;
        }
        if (label) label.textContent = copy[phase].label;
        if (message) message.textContent = copy[phase].message;
        if (note) note.textContent = copy[phase].note;
      }
      if (phase === "ended" || !root) return;
      var totalSeconds = Math.floor(Math.max(0, copy[phase].target - at) / 1000);
      if (fields.days) fields.days.textContent = pad2(totalSeconds / 86400);
      if (fields.hours) fields.hours.textContent = pad2((totalSeconds % 86400) / 3600);
      if (fields.minutes) fields.minutes.textContent = pad2((totalSeconds % 3600) / 60);
      if (fields.seconds) fields.seconds.textContent = pad2(totalSeconds % 60);
    }

    tick();
    if (current !== "ended") timer = window.setInterval(tick, 1000);
  }

  // Product and offer data for search engines, built from products.js.
  function addStructuredData() {
    if (typeof PRODUCTS === "undefined") return;
    var canonical = document.querySelector('link[rel="canonical"]');
    var base = canonical ? canonical.href : window.location.href.split(/[?#]/)[0];
    function abs(path) {
      try { return new URL(path, base).href; } catch (e) { return path; }
    }
    var graph = PRODUCTS.map(function (product) {
      var item = {
        "@type": "SoftwareApplication",
        name: product.name,
        description: product.description,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "macOS",
        url: abs("#" + product.id),
        offers: {
          "@type": "Offer",
          price: String(money(priceLabel(product))),
          priceCurrency: "USD",
          url: abs("#" + product.id)
        },
        publisher: { "@type": "Organization", name: "Dirt Monkey" }
      };
      if (product.screenshot) item.image = abs(product.screenshot);
      return item;
    });
    var script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
    document.head.appendChild(script);
  }

  function pauseHeroOffscreen() {
    var stage = document.querySelector(".skwish-stage");
    if (!stage || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        stage.classList.toggle("is-offscreen", !entry.isIntersecting);
      });
    }).observe(stage);
  }

  function bindKitForms() {
    var forms = document.querySelectorAll(".kit-form");
    Array.prototype.forEach.call(forms, function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
      });
    });
  }

  function bindCheckout() {
    if (typeof window.createLemonSqueezy === "function") {
      window.createLemonSqueezy();
    }
  }

  renderProducts();
  renderSuite();
  renderFounders();
  renderPacks();
  bindKitForms();
  startCountdown();
  addStructuredData();
  pauseHeroOffscreen();
  bindCheckout();
  window.addEventListener("load", bindCheckout);
})();
