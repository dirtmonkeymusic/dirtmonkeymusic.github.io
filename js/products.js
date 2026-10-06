// ============================================================
//  THE SHOP — edit this file to change plugins, prices, and links.
//
//  Each plugin is one block that starts with { and ends with }.
//  Change the words inside the quotes. Leave the quotes and commas.
//
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
