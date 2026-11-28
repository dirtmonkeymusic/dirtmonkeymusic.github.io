// Wonk Lab only (thewonklab.com). Loaded after js/products.js and before js/site.js.
// Leaves js/products.js (and therefore /plugins/) unchanged.
(function () {
  if (typeof PRODUCTS === "undefined") return;
  // thewonklab.com serves the store at its root; anywhere else it sits under /wonklab/.
  var BASE = /(^|\.)thewonklab\.com$/.test(location.hostname) ? "" : "/wonklab";

  var SHOTS = {
    wonk:        { file: "wonk-factory", width: 1600, height: 1211, sizes: [360, 720, 1080] },
    punch:       { file: "punch",        width: 1600, height: 1561, sizes: [360, 720, 1080] },
    updown:      { file: "updown",       width: 1600, height: 1290, sizes: [360, 720, 1080] },
    "the-end":   { file: "the-end",      width: 1600, height: 1210, sizes: [360, 720, 1080] },
    slammer:     { file: "slammer",      width: 1600, height: 1686, sizes: [360, 720, 1080] },
    spaces:      { file: "spaces",       width: 1600, height: 1367, sizes: [360, 720, 1080] },
    fizz:        { file: "fizz",         width: 1600, height: 1842, sizes: [360, 720, 1080] },
    "dub-it":    { file: "dub-it",       width: 1600, height: 1203, sizes: [360, 720, 1080] },
    dip:         { file: "dip",          width: 1600, height: 1561, sizes: [360, 720, 1080] },
    meter:       { file: "meter",        width: 1600, height: 1366, sizes: [360, 720, 1080] },
    frequalizer: { file: "frequalizer",  width: 1600, height: 1391, sizes: [360, 720, 1080] },
    balancer:    { file: "balancer",     width: 1600, height: 996,  sizes: [360, 720, 1080] }
  };

  var PRICES = { wonk: "$50", updown: "$20", punch: "$10", slammer: "$10", spaces: "$10", fizz: "$10", "dub-it": "$10", balancer: "$15" };
  // Meter, Frequalizer and Dip are free (DIRT, Nov 28). Meter keeps its free card from js/products.js.

  // Temporary short card copy until DIRT sends his own.
  var DESCRIPTIONS = {
    wonk: "The flagship polyphonic synth.",
    punch: "A one-knob punch and loudness plugin with a HEAT meter.",
    updown: "A tempo-synced riser and downlifter.",
    slammer: "A clipper that slams your mix to a clean 0 dB ceiling.",
    spaces: "A spring-first reverb that blends spring, plate, and room.",
    fizz: "Five flavors of grit, split across three bands.",
    "dub-it": "From crisp digital repeats to dark dub throws, all on one knob.",
    dip: "Draw a ducking curve that plays in time with your track.",
    meter: "Waveform, spectrum, and loudness at a glance.",
    frequalizer: "A clean, fast 8-band EQ with a little wonk built in.",
    balancer: "Last on your master: gently pulls your mix toward a finished, balanced tone."
  };

  // Balancer (DIRT, Nov 28: $15). Not in js/products.js, so it is added here for Wonk Lab only.
  if (!PRODUCTS.some(function (p) { return p.id === "balancer"; })) {
    var after = PRODUCTS.findIndex(function (p) { return p.id === "updown"; });
    PRODUCTS.splice(after < 0 ? PRODUCTS.length : after + 1, 0, {
      id: "balancer",
      name: "Balancer",
      price: "$15",
      features: [
        "Listens to your mix and smooths it toward a finished-master curve.",
        "Trims harsh or boomy moments, lifts dull spots a little.",
        "Leaves your level alone, so A/B is honest.",
        "Bass Safe keeps your low end untouched.",
        "Light on CPU."
      ],
      formats: "VST3, AU, Mac, Windows",
      accent: "cyan",
      demoLink: "downloads/balancer-demo-PLACEHOLDER.txt",
      shotAlt: "Balancer interface: tone display with input, output and target curves, cut and lift bars, and Bass Safe, Tone, Mix, Detail, Top End and Output knobs",
      featured: false
    });
  }

  // Remove The End from this page only.
  for (var i = PRODUCTS.length - 1; i >= 0; i--) {
    if (PRODUCTS[i].id === "the-end") PRODUCTS.splice(i, 1);
  }

  // The Everything Suite on Wonk Lab (DIRT, Nov 20): $100 outright, or rent-to-own $10/mo for 10 months.
  // Must match CATALOG.suite in the license worker (src/store.js).
  if (typeof BUNDLE !== "undefined") {
    BUNDLE.price = "$100";
    BUNDLE.payments = "rent-to-own: $10/mo for 10 months, then it's yours";
    BUNDLE.description = "Every Dirt Monkey plugin, Mac and Windows, in one license.";
    BUNDLE.includes = ["wonk", "updown", "punch", "slammer", "spaces", "fizz", "dub-it", "balancer"];
    BUNDLE.buyLink = BASE + "/buy/?p=suite";
    BUNDLE.rtoLink = BASE + "/buy/?p=suite&plan=rto";
    BUNDLE.gumroadLink = "";
  }

  PRODUCTS.forEach(function (product) {
    var shot = SHOTS[product.id];
    if (shot) {
      product.screenshot = "assets/wonklab/shots/" + shot.file + ".webp";
      product.shotWidth = shot.width;
      product.shotHeight = shot.height;
      product.shotSizes = shot.sizes.slice();
    }

    if (DESCRIPTIONS[product.id]) {
      product.description = DESCRIPTIONS[product.id];
    }

    // Wonk Lab prices (DIRT, Nov 20). Must match CATALOG in the license worker (src/store.js).
    if (PRICES[product.id]) {
      product.price = PRICES[product.id];
      product.priceNote = "";
    }

    // Buy opens the Wonk Lab checkout page (Stripe or PayPal, TEST MODE until DIRT says go live).
    if (!product.free) {
      product.buyLink = BASE + "/buy/?p=" + encodeURIComponent(product.id);
    }
  });
})();
