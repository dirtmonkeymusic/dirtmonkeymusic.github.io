// Saves the Bass Threads product list to merch/products.json for /merch-shop/.
// The store's API sends no CORS header, so browsers on dirtmonkey.music can't read it live;
// the page uses this snapshot instead (and still tries live first, in case the store allows it later).
//   node dev/merch-sync.js          (then commit merch/products.json)
const fs = require("fs");
const path = require("path");
const API = "https://dirtmonkey.bassthreadsmerch.com/wp-json/wc/store/v1/products?per_page=100";
// EXCLUDE: merch/exclude.json is the one list of products left off /merch-shop/ (and the iOS app).
// Edit that file, then run this script. It copies the list into products.json as "exclude".
const EXCLUDE = JSON.parse(require("fs").readFileSync(require("path").join(__dirname, "..", "merch", "exclude.json"), "utf8"));
const SKIP = new Set(EXCLUDE.map((x) => Number(x.id)));
const OUT = path.join(__dirname, "..", "merch", "products.json");
(async () => {
  const r = await fetch(API, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error("Store answered " + r.status);
  const list = await r.json();
  const kept = list.filter((p) => !SKIP.has(Number(p.id)));
  console.log("Left off: " + (list.length - kept.length));
  const keep = kept.map((p) => ({
    id: p.id, name: p.name, type: p.type, permalink: p.permalink,
    prices: { price: p.prices.price, currency_prefix: p.prices.currency_prefix, currency_suffix: p.prices.currency_suffix, currency_minor_unit: p.prices.currency_minor_unit, price_range: p.prices.price_range },
    images: (p.images || []).slice(0, 1).map((i) => ({ src: i.src, thumbnail: i.thumbnail, thumbnail_srcset: i.thumbnail_srcset, alt: i.alt })),
    is_in_stock: p.is_in_stock, is_purchasable: p.is_purchasable, has_options: p.has_options
  }));
  const now = new Date();
  const saved = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });
  const missing = EXCLUDE.filter((x) => !list.some((p) => Number(p.id) === Number(x.id)));
  if (missing.length) console.log("Note: excluded IDs not in the store anymore: " + missing.map((x) => x.id).join(", "));
  const out = { saved, exclude: EXCLUDE.map((x) => ({ id: Number(x.id), name: x.name })), products: keep };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log("Saved " + keep.length + " products to merch/products.json");
})().catch((e) => { console.error(e.message); process.exit(1); });
