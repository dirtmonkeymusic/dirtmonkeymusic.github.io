// You do not need to edit this file.
// Prices, descriptions, and links live in products.js.
// Page wording (hero, FAQ, footer) lives in index.html.

(function () {
  var ACCENTS = {
    punch: "cyan",
    updown: "magenta",
    wonk: "mint"
  };

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

  function ticks(cx, cy, inner, outer, count, start, end, color) {
    var marks = "";
    for (var i = 0; i < count; i++) {
      var t = count === 1 ? 0 : i / (count - 1);
      var deg = start + (end - start) * t;
      var rad = (deg * Math.PI) / 180;
      var x1 = cx + Math.cos(rad) * inner;
      var y1 = cy + Math.sin(rad) * inner;
      var x2 = cx + Math.cos(rad) * outer;
      var y2 = cy + Math.sin(rad) * outer;
      marks +=
        '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) +
        '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
        '" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round"/>';
    }
    return marks;
  }

  function frame(id, title, accent, inner) {
    return (
      '<svg viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
        '<rect width="640" height="400" rx="28" fill="#100814"/>' +
        '<rect x="10" y="10" width="620" height="380" rx="20" fill="#0b0710" stroke="' + accent + '" stroke-opacity="0.55" stroke-width="2"/>' +
        '<text x="32" y="52" fill="#f6f2fb" font-family="JetBrains Mono, ui-monospace, monospace" font-size="26" font-weight="700">' + title + "</text>" +
        inner +
      "</svg>"
    );
  }

  function knob(cx, cy, r, accent, angle) {
    var rad = (angle * Math.PI) / 180;
    var x2 = cx + Math.cos(rad) * (r * 0.62);
    var y2 = cy + Math.sin(rad) * (r * 0.62);
    return (
      ticks(cx, cy, r + 10, r + 18, 11, 140, 400, "#3a3344") +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r + 4) + '" fill="none" stroke="#241c2c" stroke-width="8"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#140c1a" stroke="' + accent + '" stroke-width="3"/>' +
      '<line x1="' + cx + '" y1="' + cy + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + accent + '" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="' + accent + '"/>'
    );
  }

  function punchArt() {
    var inner =
      '<rect x="468" y="28" width="72" height="30" rx="15" fill="#3dfff2"/>' +
      '<text x="504" y="48" text-anchor="middle" fill="#071016" font-family="JetBrains Mono, ui-monospace, monospace" font-size="13" font-weight="700">LIVE</text>' +
      '<rect x="548" y="28" width="72" height="30" rx="15" fill="none" stroke="#6d6478"/>' +
      '<text x="584" y="48" text-anchor="middle" fill="#8d8498" font-family="JetBrains Mono, ui-monospace, monospace" font-size="12" font-weight="700">RENDER</text>' +
      knob(196, 214, 78, "#3dfff2", -50) +
      '<text x="196" y="330" text-anchor="middle" fill="#d9fff8" font-family="JetBrains Mono, ui-monospace, monospace" font-size="15" font-weight="700" letter-spacing="1.5">PUNCH</text>' +
      knob(430, 196, 40, "#ff2bd6", -20) +
      '<text x="430" y="268" text-anchor="middle" fill="#ffd0f3" font-family="JetBrains Mono, ui-monospace, monospace" font-size="13" font-weight="700">HPF</text>' +
      knob(548, 196, 40, "#d6ff4a", -80) +
      '<text x="548" y="268" text-anchor="middle" fill="#f3ffc4" font-family="JetBrains Mono, ui-monospace, monospace" font-size="13" font-weight="700">DRY/WET</text>';
    var bars = "";
    for (var i = 0; i < 28; i++) {
      var lit = i < 18;
      var hot = i >= 15 && i < 18;
      var h = 16 + (i % 4) * 6;
      bars +=
        '<rect x="' + (360 + i * 9) + '" y="' + (348 - h) + '" width="6" height="' + h + '" rx="2" fill="' +
        (hot ? "#ff2bd6" : lit ? "#3dfff2" : "#2a2433") + '"/>';
    }
    return frame("punch", "PUNCH", "#3dfff2", inner + bars);
  }

  function updownArt() {
    var inner =
      '<text x="32" y="84" fill="#ffb3ea" font-family="JetBrains Mono, ui-monospace, monospace" font-size="14" font-weight="500">SWEEPS · RISERS · DOWNFALLS</text>' +
      '<path d="M48 300 C 150 290, 210 230, 300 150 S 430 70, 470 64" fill="none" stroke="#ff2bd6" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M70 96 C 160 110, 230 190, 340 250 S 520 330, 560 336" fill="none" stroke="#3dfff2" stroke-width="4" stroke-linecap="round" opacity="0.9"/>' +
      '<polygon points="470,52 492,78 454,74" fill="#ff2bd6"/>' +
      '<polygon points="572,336 548,322 556,352" fill="#3dfff2"/>' +
      '<text x="392" y="128" fill="#ffd0f3" font-family="JetBrains Mono, ui-monospace, monospace" font-size="13" font-weight="700">RISER</text>' +
      '<text x="250" y="292" fill="#d9fff8" font-family="JetBrains Mono, ui-monospace, monospace" font-size="13" font-weight="700">DOWNFALL</text>' +
      '<rect x="586" y="110" width="8" height="190" rx="4" fill="#241c2c"/>' +
      '<rect x="586" y="168" width="8" height="70" rx="4" fill="#ff2bd6"/>' +
      '<circle cx="590" cy="168" r="11" fill="#ff2bd6" stroke="#1a0610" stroke-width="3"/>';
    return frame("updown", "UPDOWN", "#ff2bd6", inner);
  }

  function wonkArt() {
    var waves = "";
    for (var i = 0; i < 8; i++) {
      var d = "";
      var yBase = 168 + i * 7;
      var amp = 28 - i * 1.2;
      for (var x = 36; x <= 600; x += 10) {
        var y = yBase + Math.sin(x / 42 + i * 0.45) * amp;
        d += (x === 36 ? "M" : "L") + x + " " + y.toFixed(1) + " ";
      }
      var color = i % 2 === 0 ? "#d6ff4a" : "#ff2bd6";
      waves +=
        '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2.2" opacity="' +
        (0.95 - i * 0.08).toFixed(2) + '"/>';
    }
    var grid = "";
    for (var g = 0; g < 5; g++) {
      var gy = 120 + g * 32;
      grid += '<line x1="36" y1="' + gy + '" x2="604" y2="' + gy + '" stroke="#d6ff4a" stroke-opacity="0.12"/>';
    }
    var inner =
      grid +
      waves +
      knob(140, 318, 28, "#d6ff4a", -35) +
      '<text x="140" y="368" text-anchor="middle" fill="#f3ffc4" font-family="JetBrains Mono, ui-monospace, monospace" font-size="12" font-weight="700">POSITION</text>' +
      knob(320, 318, 28, "#ff2bd6", -10) +
      '<text x="320" y="368" text-anchor="middle" fill="#ffd0f3" font-family="JetBrains Mono, ui-monospace, monospace" font-size="12" font-weight="700">WARP</text>' +
      knob(500, 318, 28, "#3dfff2", -70) +
      '<text x="500" y="368" text-anchor="middle" fill="#d9fff8" font-family="JetBrains Mono, ui-monospace, monospace" font-size="12" font-weight="700">LEVEL</text>';
    return frame("wonk", "WONK FACTORY", "#d6ff4a", inner);
  }

  function genericArt(name) {
    return frame(
      "generic",
      esc(name).toUpperCase(),
      "#3dfff2",
      '<circle cx="320" cy="220" r="70" fill="none" stroke="#3dfff2" stroke-width="3"/>' +
      '<circle cx="320" cy="220" r="40" fill="none" stroke="#ff2bd6" stroke-width="3"/>' +
      '<circle cx="320" cy="220" r="8" fill="#d6ff4a"/>'
    );
  }

  function artFor(product, sizes) {
    var shot = String(product.screenshot || "").trim();
    if (shot) {
      var width = Number(product.shotWidth) || 0;
      var height = Number(product.shotHeight) || 0;
      var src = esc(safeUrl(shot));
      var srcset = width ? ' srcset="' + src + " " + width + 'w"' : "";
      var sizeAttr = sizes ? ' sizes="' + sizes + '"' : "";
      var dims = (width && height) ? ' width="' + width + '" height="' + height + '"' : "";
      return '<img src="' + src + '"' + srcset + sizeAttr + dims + ' alt="' + esc(product.name) + ' plugin">';
    }
    var svg;
    if (product.id === "punch") svg = punchArt();
    else if (product.id === "updown") svg = updownArt();
    else if (product.id === "wonk") svg = wonkArt();
    else svg = genericArt(product.name);
    return '<div aria-hidden="true">' + svg + "</div>";
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

  var PACK_ACCENTS = ["cyan", "magenta", "mint"];

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
      var accent = PACK_ACCENTS[index % PACK_ACCENTS.length];
      var buy = safeUrl(pack.buyLink);
      var store = String(pack.store || "Buy").trim();
      var cover = String(pack.cover || "").trim();
      var art = cover
        ? '<img src="' + esc(safeUrl(cover)) + '" alt="' + esc(pack.name) + ' cover art">'
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

  function pluginCard(product) {
    var accent = ACCENTS[product.id] || "cyan";
    var demo = safeUrl(product.demoLink);
    var buy = safeUrl(product.buyLink);
    var remoteDemo = /^https?:\/\//i.test(demo);
    var system = String(product.system || "").trim();
    var tagsAlreadySayIt = /^mac\.?\s*windows coming\.?$/i.test(system);
    var hasShot = String(product.screenshot || "").trim().length > 0;
    var sizes = "(max-width: 720px) 92vw, (max-width: 980px) 46vw, 340px";
    return (
      '<article class="plugin-card accent-' + accent + '" id="' + esc(product.id) + '">' +
        '<div class="plugin-art' + (hasShot ? " is-photo" : "") + '">' + artFor(product, sizes) + "</div>" +
        '<div class="plugin-body">' +
          (product.featured ? '<p class="flag-badge">Flagship synth</p>' : "") +
          '<div class="plugin-heading">' +
            "<h3>" + esc(product.name) + "</h3>" +
            '<p class="price">' + esc(product.price) + "</p>" +
          "</div>" +
          '<p class="desc">' + esc(product.description) + "</p>" +
          '<ul class="chips">' + chips(product.formats) + "</ul>" +
          (!tagsAlreadySayIt && system ? '<p class="system">' + esc(system) + "</p>" : "") +
          '<div class="plugin-actions">' +
            '<a class="btn btn-demo" href="' + esc(demo) + '"' + (remoteDemo ? "" : " download") +
              ' aria-label="Download ' + esc(product.name) + ' demo">Download Demo</a>' +
            '<a class="btn btn-buy lemonsqueezy-button" href="' + esc(buy) + '"' +
              ' aria-label="Buy ' + esc(product.name) + '">Buy</a>' +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function renderProducts() {
    var grid = document.getElementById("plugin-grid");
    if (!grid) return;
    if (typeof PRODUCTS === "undefined" || !PRODUCTS.length) {
      grid.innerHTML = '<p class="shop-error">The plugin list did not load. Open js/products.js and check for a missing quote or comma.</p>';
      return;
    }

    grid.innerHTML = PRODUCTS.map(function (product) {
      return pluginCard(product);
    }).join("");
  }

  function bindCheckout() {
    if (typeof window.createLemonSqueezy === "function") {
      window.createLemonSqueezy();
    }
  }

  function setupVideo() {
    var video = document.querySelector(".skwish-video");
    if (!video) return;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      video.hidden = true;
      return;
    }
    video.muted = true;
    video.play().catch(function () {
      video.hidden = true;
    });
    video.addEventListener("error", function () {
      video.hidden = true;
    });
  }

  renderProducts();
  renderPacks();
  setupVideo();
  bindCheckout();
  window.addEventListener("load", bindCheckout);
})();
