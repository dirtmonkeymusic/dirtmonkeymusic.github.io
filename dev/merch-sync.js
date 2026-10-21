// Saves the Bass Threads product list to merch/products.json for /merch-shop/.
// The store's API sends no CORS header, so browsers on dirtmonkey.music can't read it live;
// the page uses this snapshot instead (and still tries live first, in case the store allows it later).
//   node dev/merch-sync.js          (then commit merch/products.json)
const fs = require("fs");
const path = require("path");
const API = "https://dirtmonkey.bassthreadsmerch.com/wp-json/wc/store/v1/products?per_page=100";
// EXCLUDE: products left off /merch-shop/ (matched on the name). js/merch-shop.js has the same rule for live loads.
const EXCLUDE = [/can(?:'|\u2019|&#8217;|&#039;)?t\s+kickflip/i];
const OUT = path.join(__dirname, "..", "merch", "products.json");
(async () => {
  const r = await fetch(API, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error("Store answered " + r.status);
  const list = await r.json();
  const kept = list.filter((p) => !EXCLUDE.some((re) => re.test(p.name)));
  console.log("Left off: " + (list.length - kept.length));
  const keep = kept.map((p) => ({
    id: p.id, name: p.name, type: p.type, permalink: p.permalink,
    prices: { price: p.prices.price, currency_prefix: p.prices.currency_prefix, currency_suffix: p.prices.currency_suffix, currency_minor_unit: p.prices.currency_minor_unit, price_range: p.prices.price_range },
    images: (p.images || []).slice(0, 1).map((i) => ({ src: i.src, thumbnail: i.thumbnail, alt: i.alt })),
    is_in_stock: p.is_in_stock, is_purchasable: p.is_purchasable, has_options: p.has_options
  }));
  const now = new Date();
  const saved = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });
  const out = { saved, products: keep };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log("Saved " + keep.length + " products to merch/products.json");
})().catch((e) => { console.error(e.message); process.exit(1); });
