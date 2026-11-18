// Wonk Lab only. Loaded from /wonklab/ after js/products.js and before js/site.js.
// Leaves js/products.js (and therefore /plugins/) unchanged.
(function () {
  if (typeof PRODUCTS === "undefined") return;

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
    frequalizer: { file: "frequalizer",  width: 1600, height: 1391, sizes: [360, 720, 1080] }
  };

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
    frequalizer: "A clean, fast 8-band EQ with a little wonk built in."
  };

  // Remove The End from this page only.
  for (var i = PRODUCTS.length - 1; i >= 0; i--) {
    if (PRODUCTS[i].id === "the-end") PRODUCTS.splice(i, 1);
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

    if (product.id === "wonk") {
      product.price = "$50";
      product.priceNote = "";
    }

    // Meter is a paid $10 plugin on Wonk Lab (still free on /plugins/).
    if (product.id === "meter") {
      product.free = false;
      product.price = "$10";
      product.kitFormId = "";
      product.kitTags = "";
      product.demoLink = "downloads/meter-demo-PLACEHOLDER.txt";
      product.buyLink = "https://YOURSTORE.lemonsqueezy.com/buy/METER-PLACEHOLDER";
    }
  });
})();
