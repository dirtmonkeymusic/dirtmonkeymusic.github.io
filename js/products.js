// ============================================================
//  THE SHOP — edit this file to change what you sell.
//
//  There are two lists in this file:
//    PRODUCTS      the plugins (Lemon Squeezy checkout on this site)
//    SAMPLE_PACKS  the packs (Buy opens Gumroad or Bandcamp)
//
//  Each item is one block that starts with { and ends with }.
//  Change the words inside the quotes. Leave the quotes and commas.
//  To add another one, copy a whole block, paste it before the ];
//  and change the words. Give it a new id (lowercase, no spaces).
//
//  PLUGIN FIELDS
//  name         Plugin name on the card.
//  price        What shoppers see. Example: "$49"
//  description  A short paragraph. Keep it as one line in this file.
//  formats      Short labels, separated by commas.
//  system       Extra computer note under the tags.
//               "Mac. Windows coming." is not shown. The tags
//               already say that. A more specific note still shows.
//  demoLink     Where "Download Demo" goes.
//               Put the file in the downloads folder, then write
//               downloads/YourFile.zip
//               A full https link (such as a GitHub Releases link)
//               also works. Paste the whole link.
//  buyLink      Where "Buy" goes. Paste the Lemon Squeezy checkout
//               link between the quotes. It usually looks like:
//               https://yourstore.lemonsqueezy.com/checkout/buy/abc123
//               The Buy button opens that checkout on top of this
//               site, so people do not leave the page.
//  screenshot   Picture on the card. These are stand-in screenshots.
//               Swap the file in assets/plugins, or change this path.
//               Leave the quotes empty ("") to use the neon drawing.
//  shotWidth    Width of that picture in pixels.
//  shotHeight   Height of that picture in pixels.
//               Update both if you swap in a new file.
//  featured     true adds a "Flagship synth" label on that card.
//               The card is the same size as the others. Put the
//               flagship first in this list if you want it first.
//  tagline      Not shown on the card. The description is what shoppers see.
//  features     Kept for a later product page. Not shown on the card.
//
//  id           Short internal name (lowercase, no spaces).
//               You can leave the ids as they are.
//
//  If the plugin list ever goes blank, you probably deleted a quote
//  or a comma. Undo and try again.
// ============================================================

const PRODUCTS = [
  {
    id: "wonk",
    name: "Wonk Factory",
    tagline: "A wavetable synth.",
    price: "$50",
    description: "The flagship monophonic synth. Three wavetable oscillators with Wonk control, plus sub and noise, two filters, space reverb, shift, two drives, modulators with an LFO editor, clipper, EQ, amp envelope, vibrato, and bend.",
    formats: "VST3, AU, Mac, Windows coming",
    system: "Mac. Windows coming.",
    demoLink: "downloads/wonk-factory-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/WONK-FACTORY-PLACEHOLDER",
    // Placeholder screenshot. Replace the file, or paste a new path.
    screenshot: "assets/plugins/wonk-factory.png",
    shotWidth: 1680,
    shotHeight: 1226,
    featured: true
  },
  {
    id: "punch",
    name: "Punch",
    price: "$20",
    description: "One-knob effect for a mix, bus, or group. It lifts the front of hits, fills the body with parallel compression, adds a little tape thickness, and doesn't turn the level down. Knobs: PUNCH, HPF, DRY/WET, plus live and render quality.",
    formats: "VST3, AU, Mac, Windows coming",
    system: "Mac. Windows coming.",
    demoLink: "downloads/punch-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/PUNCH-PLACEHOLDER",
    // Placeholder screenshot. Replace the file, or paste a new path.
    screenshot: "assets/plugins/punch.png",
    shotWidth: 1640,
    shotHeight: 1600,
    featured: false
  },
  {
    id: "updown",
    name: "Updown",
    price: "$20",
    description: "A VST for sweeps, risers, and downfalls.",
    formats: "VST3, AU, Mac, Windows coming",
    system: "Mac. Windows coming.",
    demoLink: "downloads/updown-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/UPDOWN-PLACEHOLDER",
    // Placeholder screenshot. Replace the file, or paste a new path.
    screenshot: "assets/plugins/updown.png",
    shotWidth: 980,
    shotHeight: 920,
    featured: false
  },
  {
    id: "clipper",
    name: "Banana Clip",
    tagline: "A dead-simple clipper that gets loud without going over 0 dB.",
    price: "$20",
    description: "A dead-simple clipper that gets tracks and drums loud. INPUT drives it, JUICE adds crunch, and it never goes over 0 dB.",
    features: [
      "Two big knobs, INPUT (drive) and JUICE (high-end crunch).",
      "Hard 0 dB ceiling so it never clips your master.",
      "Dry/wet slider for parallel clipping.",
      "Back panel with release, soft/hard knee, and live/render oversampling up to 128x.",
      "Output meter that runs purple to red up to 0 dB."
    ],
    formats: "VST3, AU, Mac, Windows coming",
    system: "Mac. Windows coming.",
    demoLink: "downloads/clipper-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/CLIPPER-PLACEHOLDER",
    screenshot: "assets/plugins/banana-clip-ui.png",
    shotWidth: 1640,
    shotHeight: 1600,
    featured: false
  },
  {
    id: "dip",
    name: "Dip",
    tagline: "Draw the duck.",
    price: "$20",
    description: "Draw the duck. Sketch the shape of the dip and it plays on every kick, in time with your track.",
    features: [
      "Three modes: SIDECHAIN, LOOP (tempo-locked pump, no sidechain needed), and ENVELOPE (follows sidechain level).",
      "Draw freehand and it snaps to a smooth curve with 3 to 20 draggable points.",
      "DEPTH, LENGTH (synced or ms), SENSITIVITY, plus up to 20 ms lookahead.",
      "Live sidechain waveform behind the curve with a neon dot riding the dip.",
      "Dry/wet and bypass."
    ],
    formats: "VST3, AU, Mac, Windows coming",
    system: "Mac. Windows coming.",
    demoLink: "downloads/dip-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/DIP-PLACEHOLDER",
    screenshot: "assets/plugins/dip-ui.png",
    shotWidth: 1640,
    shotHeight: 1600,
    featured: false
  },
  {
    id: "spaces",
    name: "Spaces",
    tagline: "A spring-first reverb that stays out of the way of your mix.",
    price: "$30",
    description: "A spring-first reverb. Blend spring, plate, and room from one triangle pad, with ducking to keep the tail behind your mix.",
    features: [
      "Triangle pad that blends Spring, Plate and Room in one move.",
      "Spring engine with three spring types plus Tension, Drip and Decay.",
      "Ducking that pulls the reverb down while the dry signal plays.",
      "3-band EQ on the wet signal only, plus Width.",
      "Size, Pre-delay, Mix, Input and Output controls."
    ],
    formats: "VST3, AU, Mac, Windows coming",
    system: "Mac. Windows coming.",
    demoLink: "downloads/spaces-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/SPACES-PLACEHOLDER",
    screenshot: "assets/plugins/spaces-ui.png",
    shotWidth: 1920,
    shotHeight: 1720,
    featured: false
  }
];

// ============================================================
//  FULL SUITE
//
//  One bundle of every plugin. Prices and links are placeholders.
//  Future plugins are included in this bundle when they ship.
//  Do not put that sentence on the page. It is only a note here.
//  The suite price will be revisited as plugins are added.
// ============================================================

const BUNDLE = {
  id: "full-suite",
  name: "The Full Suite",
  price: "$80",
  saveNote: "Save $80 vs. buying separately",
  description: "Every Dirt Monkey plugin in one download.",
  includes: ["wonk", "punch", "updown", "clipper", "dip", "spaces"],
  // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
  buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/FULL-SUITE-PLACEHOLDER",
  // PASTE THE REAL GUMROAD LINK BELOW.
  gumroadLink: "https://YOURNAME.gumroad.com/l/FULL-SUITE-PLACEHOLDER"
};

// ============================================================
//  SAMPLE PACKS
//
//  These six cards are placeholders. Rename them when you are ready.
//
//  name         Name on the card.
//  price        What shoppers see. Example: "$29"
//  description  One short line.
//  store        Gumroad or Bandcamp. This word shows on the card.
//  buyLink      The real pack page. Buy opens this in a new tab.
//               Gumroad links look like:
//                 https://yourname.gumroad.com/l/your-pack
//               Bandcamp links look like:
//                 https://dirtmonkey.bandcamp.com/album/your-pack
//  cover        Leave the quotes empty ("") to keep the neon picture.
//               For real cover art: save the image in assets/packs,
//               then write assets/packs/neon-drums.jpg here.
//
//  id           Short internal name. Each pack needs its own.
// ============================================================

const SAMPLE_PACKS = [
  {
    id: "neon-drums",
    name: "Neon Drums",
    price: "$XX",
    description: "Kicks, snares, and hats with a little dirt on them.",
    store: "Gumroad",
    // PASTE THE REAL GUMROAD OR BANDCAMP LINK BELOW.
    buyLink: "https://YOURNAME.gumroad.com/l/NEON-DRUMS-PLACEHOLDER",
    cover: ""
  },
  {
    id: "wonk-vocals",
    name: "Wonk Vocals",
    price: "$XX",
    description: "Chops, phrases, and mouth sounds for the wonky bits.",
    store: "Bandcamp",
    // PASTE THE REAL GUMROAD OR BANDCAMP LINK BELOW.
    buyLink: "https://dirtmonkey.bandcamp.com/album/WONK-VOCALS-PLACEHOLDER",
    cover: ""
  },
  {
    id: "sub-growl",
    name: "Sub & Growl",
    price: "$XX",
    description: "Sub notes, growls, and bass texture.",
    store: "Gumroad",
    // PASTE THE REAL GUMROAD OR BANDCAMP LINK BELOW.
    buyLink: "https://YOURNAME.gumroad.com/l/SUB-GROWL-PLACEHOLDER",
    cover: ""
  },
  {
    id: "jungle-dust",
    name: "Jungle Dust",
    price: "$XX",
    description: "Breaks and percussion with some jungle in the swing.",
    store: "Bandcamp",
    // PASTE THE REAL GUMROAD OR BANDCAMP LINK BELOW.
    buyLink: "https://dirtmonkey.bandcamp.com/album/JUNGLE-DUST-PLACEHOLDER",
    cover: ""
  },
  {
    id: "riser-lab",
    name: "Riser Lab",
    price: "$XX",
    description: "Sweeps, impacts, and downfalls.",
    store: "Gumroad",
    // PASTE THE REAL GUMROAD OR BANDCAMP LINK BELOW.
    buyLink: "https://YOURNAME.gumroad.com/l/RISER-LAB-PLACEHOLDER",
    cover: ""
  },
  {
    id: "night-market",
    name: "Night Market",
    price: "$XX",
    description: "Foley, ear candy, and small noisy things.",
    store: "Bandcamp",
    // PASTE THE REAL GUMROAD OR BANDCAMP LINK BELOW.
    buyLink: "https://dirtmonkey.bandcamp.com/album/NIGHT-MARKET-PLACEHOLDER",
    cover: ""
  }
];
