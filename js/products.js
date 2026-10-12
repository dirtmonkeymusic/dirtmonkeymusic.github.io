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
//  price        What shoppers see. Example: "$49". Write "Free"
//               for a plugin that has no checkout.
//  free         true on a free plugin. The card shows Free and a
//               Kit email form instead of Download Demo and Buy.
//               Leave this off (or false) for a paid plugin.
//  kitFormId    The Kit form ID. Leave "PLACEHOLDER" until the
//               real form exists. One form per free plugin.
//  kitTags      Tags for that Kit form, separated by commas.
//               Free plugins use free-dip, free-meter, or
//               free-frequalizer, plus source-website.
//               A new free plugin is a new block in this list.
//               Copy Dip and change the id, name, picture, and tags.
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
    price: "$60",
    description: "The flagship monophonic synth. Three wavetable oscillators with Wonk control, plus sub and noise, two filters, space reverb, shift, two drives, modulators with an LFO editor, clipper, EQ, amp envelope, vibrato, and bend.",
    formats: "VST3, AU, Mac, Windows coming",
    system: "Mac. Windows coming.",
    demoLink: "downloads/wonk-factory-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/WONK-FACTORY-PLACEHOLDER",
    // Placeholder screenshot. Replace the file, or paste a new path.
    screenshot: "assets/plugins/wonk-factory.png",
    shotWidth: 583,
    shotHeight: 407,
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
    price: "$30",
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
    id: "the-end",
    name: "The End",
    price: "$20",
    description: "The last plugin on your master. A 4-band limiter with auto Balance that gets you loud, clean, and balanced.",
    features: [
      "4-band limiting.",
      "Clean, Punchy and Loud styles plus Advanced page.",
      "Auto Balance with Amount, Tone and Focus.",
      "True-peak ceiling and LUFS meter.",
      "Light on CPU."
    ],
    formats: "VST3, AU, Mac, Windows coming, Standalone",
    system: "Mac. Windows coming.",
    demoLink: "downloads/the-end-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/THE-END-PLACEHOLDER",
    screenshot: "assets/plugins/the-end-ui.png",
    shotWidth: 1640,
    shotHeight: 1240,
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
    price: "Free",
    free: true,
    // PLACEHOLDER Kit form for the Dip download.
    // Paste the real form ID from Kit (Publish → Embed) over PLACEHOLDER.
    // Tags on that form: free-dip and source-website.
    kitFormId: "PLACEHOLDER",
    kitTags: "free-dip, source-website",
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
    price: "$20",
    description: "A spring-first reverb. Blend spring, plate, and room from one triangle pad, with six spring types and ducking to keep the tail behind your mix.",
    features: [
      "Triangle pad that blends Spring, Plate and Room in one move.",
      "Spring engine with six spring types plus Tension, Drip and Decay.",
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
    shotHeight: 1640,
    featured: false
  },
  {
    id: "meter",
    name: "Meter",
    price: "Free",
    free: true,
    // PLACEHOLDER Kit form for the Meter download.
    // Paste the real form ID from Kit (Publish → Embed) over PLACEHOLDER.
    // Tags on that form: free-meter and source-website.
    // The public name may change later. Keep this id as "meter".
    kitFormId: "PLACEHOLDER",
    kitTags: "free-meter, source-website",
    description: "A dead-simple meter for your master. Waveform, spectrum, and loudness at a glance, with no menus or setup.",
    features: [
      "Sub-focused waveform with transient flashes.",
      "Smooth spectrum analyzer with speed knob.",
      "RMS and integrated LUFS over a chosen window.",
      "L/R peak meters with peak hold.",
      "Very light on CPU."
    ],
    formats: "VST3, AU, Mac, Windows coming, Standalone",
    system: "Mac. Windows coming.",
    demoLink: "downloads/meter-demo-PLACEHOLDER.txt",
    buyLink: "",
    screenshot: "assets/plugins/meter-ui.png",
    shotWidth: 820,
    shotHeight: 800,
    featured: false
  },
  {
    id: "frequalizer",
    name: "Frequalizer",
    price: "Free",
    free: true,
    // PLACEHOLDER Kit form for the Frequalizer download.
    // Paste the real form ID from Kit (Publish → Embed) over PLACEHOLDER.
    // Tags on that form: free-frequalizer and source-website.
    kitFormId: "PLACEHOLDER",
    kitTags: "free-frequalizer, source-website",
    description: "A clean, fast 8-band EQ with a little wonk built in. Drag the glowing dots to shape your sound, with dynamic bands, mid/side, and linear phase.",
    features: [
      "8 draggable bands up to 48 dB/oct.",
      "TAME resonance smoothing.",
      "Dynamic bands and per-band Stereo/Mid/Side.",
      "WONK tempo-synced movement plus SPREAD.",
      "Linear phase mode and live analyzer."
    ],
    formats: "VST3, AU, Mac, Windows coming",
    system: "Mac. Windows coming.",
    demoLink: "downloads/frequalizer-demo-PLACEHOLDER.txt",
    buyLink: "",
    screenshot: "assets/plugins/frequalizer-ui.png",
    shotWidth: 1640,
    shotHeight: 1600,
    featured: false
  }
];

// ============================================================
//  THE EVERYTHING SUITE
//
//  One bundle of every plugin. Checkout links are placeholders.
//  Future plugins are included in this bundle when they ship.
//  Do not put that sentence on the page. It is only a note here.
//
//  The "Save $X vs. buying separately" line is not written here.
//  The page adds up the paid plugins in `includes` and subtracts
//  `price`. Free plugins are not in this list and are not part
//  of that sum. Add a paid plugin to PRODUCTS and to `includes`,
//  and the save line updates.
// ============================================================

const BUNDLE = {
  id: "everything-suite",
  name: "The Everything Suite",
  price: "$119",
  description: "Every Dirt Monkey plugin in one download.",
  includes: ["wonk", "punch", "updown", "the-end", "clipper", "spaces"],
  // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
  buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/FULL-SUITE-PLACEHOLDER",
  // PASTE THE REAL GUMROAD LINK BELOW.
  gumroadLink: "https://YOURNAME.gumroad.com/l/FULL-SUITE-PLACEHOLDER"
};

// ============================================================
//  FOUNDERS SUITE
//
//  A one-time offer. No checkout on the page yet.
//  The email form is a placeholder until the Kit form exists.
//  count is a placeholder. Change the number here when you
//  have a real total. Nothing on the site fetches it.
//
//  Dates are America/Chicago. The countdown uses `opens` until
//  that moment, then counts down to `closes`.
// ============================================================

const FOUNDERS = {
  id: "founders",
  name: "Founders Suite",
  price: "$79",
  // PLACEHOLDER. No backend yet. This is the number on the page.
  count: 0,
  // PLACEHOLDER Kit form for the Founders waitlist.
  // Tags: founders-waitlist and source-website.
  kitFormId: "PLACEHOLDER",
  kitTags: "founders-waitlist, source-website",
  timeZone: "America/Chicago",
  zoneLabel: "CT",
  // Email list early access.
  opens: { year: 2026, month: 11, day: 18, hour: 0, minute: 0, second: 0 },
  // Opens to everyone. Shown in the copy, not as its own countdown.
  publicOpen: { year: 2026, month: 11, day: 20, hour: 0, minute: 0, second: 0 },
  // Last moment of the offer. 11:59 PM CT.
  closes: { year: 2026, month: 11, day: 30, hour: 23, minute: 59, second: 0 }
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
