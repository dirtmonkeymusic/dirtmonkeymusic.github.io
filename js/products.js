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
//  system       Computers it runs on.
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
//  screenshot   Leave the quotes empty ("") to keep the neon picture.
//               For a real screenshot: save the image in the assets
//               folder, then write assets/punch.png here.
//
//  id           Short internal name (lowercase, no spaces).
//               punch, updown, and wonk have their own neon pictures.
//               You can leave the ids as they are.
//
//  If the plugin list ever goes blank, you probably deleted a quote
//  or a comma. Undo and try again.
// ============================================================

const PRODUCTS = [
  {
    id: "punch",
    name: "Punch",
    price: "$XX",
    description: "One-knob effect for a mix, bus, or group. It lifts the front of hits, fills the body with parallel compression, adds a little tape thickness, and doesn't turn the level down. Knobs: PUNCH, HPF, DRY/WET, plus live and render quality.",
    formats: "VST3, Audio Unit, Mac, Windows coming",
    system: "Apple silicon and Intel. macOS 11 or newer.",
    demoLink: "downloads/punch-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/PUNCH-PLACEHOLDER",
    screenshot: ""
  },
  {
    id: "updown",
    name: "Updown",
    price: "$XX",
    description: "A VST for sweeps, risers, and downfalls.",
    formats: "VST, Mac, Windows coming",
    system: "Mac. Windows coming.",
    demoLink: "downloads/updown-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/UPDOWN-PLACEHOLDER",
    screenshot: ""
  },
  {
    id: "wonk",
    name: "Wonk Factory",
    price: "$XX",
    description: "A wavetable synth.",
    formats: "VST3, Mac, Windows coming",
    system: "Mac. Windows coming.",
    demoLink: "downloads/wonk-factory-demo-PLACEHOLDER.txt",
    // PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW.
    buyLink: "https://YOURSTORE.lemonsqueezy.com/buy/WONK-FACTORY-PLACEHOLDER",
    screenshot: ""
  }
];

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
