// ============================================================
//  THE SHOP: edit this file to change what you sell.
//
//  There are four parts in this file:
//    PRODUCTS      the plugins (Lemon Squeezy checkout on this site)
//    BUNDLE        The Everything Suite
//    FOUNDERS      the one-time Founders Suite
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
//  priceNote    Optional small line under the price, such as a
//               launch price. Leave it out to show nothing.
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
//  description  What the card says. Two sentences at most.
//               Keep it as one line in this file.
//  formats      Short labels, separated by commas.
//  accent       Card glow color: "cyan", "magenta", or "mint".
//               Leave it out for cyan.
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
//  screenshot   Picture on the card: the full-size PNG in
//               assets/plugins. Leave the quotes empty ("") to use
//               a plain neon drawing.
//  shotWidth    Width of that PNG in pixels.
//  shotHeight   Height of that PNG in pixels.
//  shotSizes    Widths of the smaller WebP copies next to the PNG
//               (fizz-ui-360.webp, fizz-ui-720.webp, ...).
//               tools/make-images.py makes them and prints these
//               three lines for you. Leave it out to use the PNG.
//  shotAlt      What the picture shows, for screen readers and search.
//  featured     true adds a "Flagship synth" label on that card and
//               puts it on its own row above the others.
//  tagline      Not shown on the card. Kept for a later product page.
//  features     Not shown on the card. Kept for a later product page.
//
//  id           Short internal name (lowercase, no spaces).
//               You can leave the ids as they are.
//
//  If the plugin list ever goes blank, you probably deleted a quote
//  or a comma. Undo and try again.
// ============================================================

// Dub Echo may be renamed (for example to "Dub-it").
// Change the name here and every place on the page follows.
const DUB_ECHO_NAME = "Dub Echo";

const PRODUCTS = [
  {
    id: "wonk",
    name: "Wonk Factory",
    tagline: "A wavetable synth.",
    price: "$49",
    priceNote: "$39 for the first 14 days of launch",
    description: "The flagship monophonic synth. Three wavetable oscillators with Wonk control, plus sub and noise, two filters, space reverb, shift, two drives, modulators with an LFO editor, clipper, EQ, amp envelope, vibrato, and bend.",
    formats: "VST3, AU, Mac, Windows coming",
    accent: "mint",
    demoLink: "downloads/wonk-factory-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/WONK-FACTORY-PLACEHOLDER",
    // A crop of assets/plugins/wonk-factory-ui.png (the full window).
    // Its WebP copies are lossless so the knobs stay sharp.
    screenshot: "assets/plugins/wonk-factory.png",
    shotWidth: 583,
    shotHeight: 407,
    shotSizes: [360, 583],
    shotAlt: "Wonk Factory interface: two wavetable oscillators and Filter 1",
    featured: true
  },
  {
    id: "punch",
    name: "Punch",
    tagline: "A one-knob cherry on top for punch and loudness.",
    price: "$15",
    description: "A one-knob cherry on top for punch and loudness, with a HEAT meter. Put it on a mix, bus, or group.",
    features: [
      "One big PUNCH knob for punch and loudness.",
      "HEAT meter that shows how hard it's working.",
      "Mix, Low Cut, and Quality controls."
    ],
    formats: "VST3, AU, Mac, Windows coming",
    accent: "cyan",
    demoLink: "downloads/punch-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/PUNCH-PLACEHOLDER",
    screenshot: "assets/plugins/punch-ui.png",
    shotWidth: 820,
    shotHeight: 800,
    shotSizes: [360, 720, 820],
    shotAlt: "Punch interface: HEAT meter, a big PUNCH knob, and a dry/wet Mix slider",
    featured: false
  },
  {
    id: "updown",
    name: "Updown",
    tagline: "Tempo-synced riser and downlifter generator.",
    price: "$25",
    description: "Tempo-synced riser and downlifter generator. Set the length in bars, then shape it with Noise, Tone, Wash, and Spice.",
    formats: "VST3, AU, Mac, Windows coming",
    accent: "magenta",
    demoLink: "downloads/updown-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/UPDOWN-PLACEHOLDER",
    screenshot: "assets/plugins/updown-ui.png",
    shotWidth: 1960,
    shotHeight: 1580,
    shotSizes: [360, 720, 1080],
    shotAlt: "Updown interface: Noise and Tone knobs around a big down arrow, with Length, Wash, and Spice below",
    featured: false
  },
  {
    id: "the-end",
    name: "The End",
    price: "$15",
    description: "The last plugin on your master. A 4-band limiter with auto Balance that gets you loud, clean, and balanced.",
    features: [
      "4-band limiting.",
      "Clean, Punchy and Loud styles plus Advanced page.",
      "Auto Balance with Amount, Tone and Focus.",
      "True-peak ceiling and LUFS meter.",
      "Light on CPU."
    ],
    formats: "VST3, AU, Mac, Windows coming, Standalone",
    accent: "mint",
    demoLink: "downloads/the-end-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/THE-END-PLACEHOLDER",
    screenshot: "assets/plugins/the-end-ui.png",
    shotWidth: 1640,
    shotHeight: 1240,
    shotSizes: [360, 720, 1080],
    shotAlt: "The End interface: 4-band limiter with style buttons, Balance knobs, and a loudness meter",
    featured: false
  },
  {
    id: "clipper",
    name: "Banana Clip",
    tagline: "A simple clipper with a clean 0 dB ceiling.",
    price: "$15",
    description: "A simple clipper that slams your mix to a clean 0 dB ceiling, with a CRUNCH knob for extra high-end bite.",
    features: [
      "Two big knobs: INPUT (drive) and CRUNCH (extra high-end bite).",
      "Clean 0 dB ceiling.",
      "TAIL and SHAPE knobs.",
      "Dry/wet slider for parallel clipping.",
      "Output meter that runs purple to red up to 0 dB."
    ],
    formats: "VST3, AU, Mac, Windows coming",
    accent: "cyan",
    demoLink: "downloads/clipper-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/CLIPPER-PLACEHOLDER",
    screenshot: "assets/plugins/banana-clip-ui.png",
    shotWidth: 1640,
    shotHeight: 1728,
    shotSizes: [360, 720, 1080],
    shotAlt: "Banana Clip interface: output meter, Input and Crunch knobs, Tail and Shape knobs, and a dry/wet slider",
    featured: false
  },
  {
    id: "spaces",
    name: "Spaces",
    tagline: "A spring-first reverb that stays out of the way of your mix.",
    price: "$15",
    description: "A spring-first reverb. Blend spring, plate, and room from one triangle pad, with six spring types and ducking to keep the tail behind your mix.",
    features: [
      "Triangle pad that blends Spring, Plate and Room in one move.",
      "Spring engine with six spring types plus Tension, Drip and Decay.",
      "Ducking that pulls the reverb down while the dry signal plays.",
      "3-band EQ on the wet signal only, plus Width.",
      "Size, Pre-delay, Mix, Input and Output controls."
    ],
    formats: "VST3, AU, Mac, Windows coming",
    accent: "mint",
    demoLink: "downloads/spaces-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/SPACES-PLACEHOLDER",
    screenshot: "assets/plugins/spaces-ui.png",
    shotWidth: 1920,
    shotHeight: 1640,
    shotSizes: [360, 720, 1080],
    shotAlt: "Spaces interface: triangle pad blending Spring, Plate, and Room, with spring and EQ controls",
    featured: false
  },
  {
    id: "fizz",
    name: "Fizz",
    tagline: "Five flavors of grit, split across three bands, with one knob to rule them.",
    price: "$15",
    description: "Five flavors of grit, split across three bands, with one knob to rule them. Pick Tape, Diode, Tube, Overdrive, or Noise, then drag the band splits.",
    features: [
      "Tape, Diode, Tube, Overdrive, and Noise modes.",
      "3 bands with draggable splits and per-band gain.",
      "One Drive knob.",
      "Built-in mid/side."
    ],
    formats: "VST3, AU, Mac, Windows coming",
    accent: "magenta",
    demoLink: "downloads/fizz-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/FIZZ-PLACEHOLDER",
    screenshot: "assets/plugins/fizz-ui.png",
    shotWidth: 1640,
    shotHeight: 1120,
    shotSizes: [360, 720, 1080],
    shotAlt: "Fizz interface: five mode buttons, three bands with draggable splits, and a Drive knob with a mid/side slider",
    featured: false
  },
  {
    id: "dub-echo",
    name: DUB_ECHO_NAME,
    tagline: "From crisp digital repeats to dark, gritty dub throws, all on one knob.",
    price: "$15",
    description: "From crisp digital repeats to dark, gritty dub throws, all on one knob. Push the feedback past 100% and add Wobble and Spring.",
    features: [
      "Clean-to-Dub knob.",
      "Feedback EQ.",
      "Feedback past 100%.",
      "Wobble plus Spring.",
      "Synced or free time.",
      "Width."
    ],
    formats: "VST3, AU, Mac, Windows coming",
    accent: "cyan",
    demoLink: "downloads/dub-echo-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/DUB-ECHO-PLACEHOLDER",
    screenshot: "assets/plugins/dub-echo-ui.png",
    shotWidth: 1920,
    shotHeight: 1412,
    shotSizes: [360, 720, 1080],
    shotAlt: DUB_ECHO_NAME + " interface: Echo and Dub knobs, a synced time grid, and a feedback EQ",
    featured: false
  },
  {
    id: "dip",
    name: "Dip",
    tagline: "Draw the duck.",
    price: "Free",
    free: true,
    // PLACEHOLDER Kit form for the Dip download.
    // Paste the real form ID from Kit (Publish, then Embed) over PLACEHOLDER.
    // Tags on that form: free-dip and source-website.
    kitFormId: "PLACEHOLDER",
    kitTags: "free-dip, source-website",
    description: "Draw the duck, or start from curve presets like Kick Duck and Triplet Bounce. Shape it, save your own, and it plays on every kick in time with your track.",
    features: [
      "Three modes: SIDECHAIN, LOOP (tempo-locked pump, no sidechain needed), and ENVELOPE (follows sidechain level).",
      "SHAPES menu with curve presets like Kick Duck and Triplet Bounce, and room to save your own.",
      "Draw freehand or drag points. Diamonds bend the curve. Double-click adds or removes a point.",
      "DEPTH, LENGTH (synced or ms), SENSITIVITY, HPF, and SMOOTHING.",
      "Live sidechain waveform behind the curve.",
      "Dry/wet and bypass."
    ],
    formats: "VST3, AU, Mac, Windows coming",
    accent: "magenta",
    screenshot: "assets/plugins/dip-ui.png",
    shotWidth: 1640,
    shotHeight: 1600,
    shotSizes: [360, 720, 1080],
    shotAlt: "Dip interface: a drawn ducking curve over the sidechain waveform, with Depth, Length, and Sensitivity knobs",
    featured: false
  },
  {
    id: "meter",
    name: "Meter",
    price: "Free",
    free: true,
    // PLACEHOLDER Kit form for the Meter download.
    // Paste the real form ID from Kit (Publish, then Embed) over PLACEHOLDER.
    // Tags on that form: free-meter and source-website.
    // The public name may change later. Keep this id as "meter".
    kitFormId: "PLACEHOLDER",
    kitTags: "free-meter, source-website",
    description: "A dead-simple meter for your master. Waveform, spectrum, and loudness at a glance, with no menus or setup.",
    features: [
      "Sub-focused waveform with transient flashes.",
      "Smooth spectrum analyzer with speed knob.",
      "Average and Loudness readouts over a time you choose (3s up to the whole song).",
      "L/R peak meters with peak hold.",
      "Very light on CPU."
    ],
    formats: "VST3, AU, Mac, Windows coming, Standalone",
    accent: "cyan",
    screenshot: "assets/plugins/meter-ui.png",
    shotWidth: 820,
    shotHeight: 800,
    shotSizes: [360, 720, 820],
    shotAlt: "Meter interface: waveform, spectrum, and levels with Average and Loudness readouts",
    featured: false
  },
  {
    id: "frequalizer",
    name: "Frequalizer",
    price: "Free",
    free: true,
    // PLACEHOLDER Kit form for the Frequalizer download.
    // Paste the real form ID from Kit (Publish, then Embed) over PLACEHOLDER.
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
    accent: "magenta",
    screenshot: "assets/plugins/frequalizer-ui.png",
    shotWidth: 1640,
    shotHeight: 1600,
    shotSizes: [360, 720, 1080],
    shotAlt: "Frequalizer interface: 8-band EQ curve with glowing band dots over a live analyzer",
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
//  The page hides this suite while the Founders Suite is open
//  (FOUNDERS.opens to FOUNDERS.closes) and shows it the rest
//  of the time.
//
//  The "Save $X vs. buying separately" line is not written here.
//  The page adds up the regular prices of the paid plugins in
//  `includes` and subtracts `price`. Free plugins are not in this
//  list and are not part of that sum. Add a paid plugin to PRODUCTS
//  and to `includes`, and the save line updates.
//
//  payments     Optional "or ..." line under the price.
// ============================================================

const BUNDLE = {
  id: "everything-suite",
  name: "The Everything Suite",
  price: "$89",
  payments: "10 payments of $8.99",
  description: "Every Dirt Monkey plugin in one download.",
  includes: ["wonk", "punch", "updown", "the-end", "clipper", "spaces", "fizz", "dub-echo"],
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
//
//  includes     The plugins available at launch. Future plugins
//               are a bonus and are described in the copy.
//  count        Founders so far. The line stays hidden while this
//               is 0. Nothing on the site fetches it.
//
//  Dates are America/Chicago. The page goes through four phases:
//    before `opens`             "Early access opens in" countdown
//    `opens` to `publicOpen`    email list only, counts down to
//                               the public open
//    `publicOpen` to `closes`   open to everyone, "Closes in"
//    after `closes`             Founders hidden, suite back
// ============================================================

const FOUNDERS = {
  id: "founders",
  name: "Founders Suite",
  price: "$59",
  payments: "6 payments of $9.99",
  includes: ["wonk", "punch", "updown", "the-end", "clipper", "spaces", "fizz", "dub-echo"],
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
  // Opens to everyone.
  publicOpen: { year: 2026, month: 11, day: 20, hour: 0, minute: 0, second: 0 },
  // Last moment of the offer. 11:59 PM CT.
  closes: { year: 2026, month: 11, day: 30, hour: 23, minute: 59, second: 0 }
};

// ============================================================
//  SAMPLE PACKS
//
//  These six cards are placeholders. Rename them when you are ready.
//  On phones the section shows one "Sample packs coming soon" line
//  instead of the cards.
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
