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
        '<text x="32" y="52" fill="#f6f2fb" font-family="Fredoka, Outfit, sans-serif" font-size="26" font-weight="700">' + title + "</text>" +
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
      '<text x="504" y="48" text-anchor="middle" fill="#071016" font-family="Outfit, sans-serif" font-size="13" font-weight="700">LIVE</text>' +
      '<rect x="548" y="28" width="72" height="30" rx="15" fill="none" stroke="#6d6478"/>' +
      '<text x="584" y="48" text-anchor="middle" fill="#8d8498" font-family="Outfit, sans-serif" font-size="12" font-weight="700">RENDER</text>' +
      knob(196, 214, 78, "#3dfff2", -50) +
      '<text x="196" y="330" text-anchor="middle" fill="#d9fff8" font-family="Outfit, sans-serif" font-size="15" font-weight="700" letter-spacing="1.5">PUNCH</text>' +
      knob(430, 196, 40, "#ff2bd6", -20) +
      '<text x="430" y="268" text-anchor="middle" fill="#ffd0f3" font-family="Outfit, sans-serif" font-size="13" font-weight="700">HPF</text>' +
      knob(548, 196, 40, "#d6ff4a", -80) +
      '<text x="548" y="268" text-anchor="middle" fill="#f3ffc4" font-family="Outfit, sans-serif" font-size="13" font-weight="700">DRY/WET</text>';
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
      '<text x="32" y="84" fill="#ffb3ea" font-family="Outfit, sans-serif" font-size="14" font-weight="600">SWEEPS · RISERS · DOWNFALLS</text>' +
      '<path d="M48 300 C 150 290, 210 230, 300 150 S 430 70, 470 64" fill="none" stroke="#ff2bd6" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M70 96 C 160 110, 230 190, 340 250 S 520 330, 560 336" fill="none" stroke="#3dfff2" stroke-width="4" stroke-linecap="round" opacity="0.9"/>' +
      '<polygon points="470,52 492,78 454,74" fill="#ff2bd6"/>' +
      '<polygon points="572,336 548,322 556,352" fill="#3dfff2"/>' +
      '<text x="392" y="128" fill="#ffd0f3" font-family="Outfit, sans-serif" font-size="13" font-weight="700">RISER</text>' +
      '<text x="250" y="292" fill="#d9fff8" font-family="Outfit, sans-serif" font-size="13" font-weight="700">DOWNFALL</text>' +
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
      '<text x="140" y="368" text-anchor="middle" fill="#f3ffc4" font-family="Outfit, sans-serif" font-size="12" font-weight="700">POSITION</text>' +
      knob(320, 318, 28, "#ff2bd6", -10) +
      '<text x="320" y="368" text-anchor="middle" fill="#ffd0f3" font-family="Outfit, sans-serif" font-size="12" font-weight="700">WARP</text>' +
      knob(500, 318, 28, "#3dfff2", -70) +
      '<text x="500" y="368" text-anchor="middle" fill="#d9fff8" font-family="Outfit, sans-serif" font-size="12" font-weight="700">LEVEL</text>';
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

  function artFor(product) {
    var shot = String(product.screenshot || "").trim();
    if (shot) {
      return '<img src="' + esc(safeUrl(shot)) + '" alt="' + esc(product.name) + ' plugin">';
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

  function renderProducts() {
    var grid = document.getElementById("plugin-grid");
    if (!grid) return;
    if (typeof PRODUCTS === "undefined" || !PRODUCTS.length) {
      grid.innerHTML = '<p class="shop-error">The plugin list did not load. Open js/products.js and check for a missing quote or comma.</p>';
      return;
    }

    grid.innerHTML = PRODUCTS.map(function (product) {
      var accent = ACCENTS[product.id] || "cyan";
      var demo = safeUrl(product.demoLink);
      var buy = safeUrl(product.buyLink);
      var remoteDemo = /^https?:\/\//i.test(demo);
      var system = String(product.system || "").trim();
      return (
        '<article class="plugin-card accent-' + accent + '" id="' + esc(product.id) + '">' +
          '<div class="plugin-art">' + artFor(product) + "</div>" +
          '<div class="plugin-body">' +
            '<div class="plugin-heading">' +
              "<h3>" + esc(product.name) + "</h3>" +
              '<p class="price">' + esc(product.price) + "</p>" +
            "</div>" +
            '<p class="desc">' + esc(product.description) + "</p>" +
            '<ul class="chips">' + chips(product.formats) + "</ul>" +
            (system ? '<p class="system">' + esc(system) + "</p>" : "") +
            '<div class="plugin-actions">' +
              '<a class="btn btn-demo" href="' + esc(demo) + '"' + (remoteDemo ? "" : " download") +
                ' aria-label="Download ' + esc(product.name) + ' demo">Download Demo</a>' +
              '<a class="btn btn-buy lemonsqueezy-button" href="' + esc(buy) + '"' +
                ' aria-label="Buy ' + esc(product.name) + '">Buy</a>' +
            "</div>" +
          "</div>" +
        "</article>"
      );
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
  setupVideo();
  bindCheckout();
  window.addEventListener("load", bindCheckout);
})();
