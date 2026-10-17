// Launch page with the clipped Laylo signup: full-page desktop and phone shots, a close-up of the signup,
// and a check that Laylo's field and button sit fully inside the clip window at each width.
// node launch2-shots.js
const puppeteer = require("puppeteer-core");
const path = require("path");
const { ART, LAUNCH } = require("./env");
const BASE = process.env.BASE || "http://127.0.0.1:47321";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const SHOTS = [["launch2-desktop.png", DESKTOP, true], ["launch2-mobile.png", PHONE, false]];
let failed = 0;

// Where Laylo's form sits inside the clip window, in page pixels.
async function fit(p) {
  const t0 = Date.now();
  let f;
  while (Date.now() - t0 < 20000 && !(f = p.frames().find((x) => x.url().startsWith("https://embed.laylo.com/")))) await wait(250);
  if (!f) return { error: "no Laylo frame" };
  await f.waitForSelector("form button[type=submit]", { timeout: 15000 });
  await wait(1500);
  const inner = await f.evaluate(() => {
    const r = (e) => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right }; };
    // The first visible thing under the form (Laylo's own fine print) must stay below the clip.
    const formBottom = document.querySelector("form").getBoundingClientRect().bottom;
    const below = [...document.querySelectorAll("body *")].filter((e) => !e.closest("form") && e.getClientRects().length && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().top >= formBottom).map((e) => [e.getBoundingClientRect().top, e.tagName + "." + e.className]).sort((a, b) => a[0] - b[0]);
    return { next: below.length ? below[0][0] : Infinity, nextEl: below.length ? below[0][1] : "", form: r(document.querySelector("form")), field: r(document.querySelector("form input[type=tel], form input[type=email]")), button: r(document.querySelector("form button[type=submit]")) };
  });
  const outer = await p.evaluate(() => {
    const box = document.querySelector(".home-signup-frame").getBoundingClientRect();
    const fr = document.querySelector(".home-signup-frame iframe").getBoundingClientRect();
    return { box: { top: box.top, bottom: box.bottom, left: box.left, right: box.right }, frame: { top: fr.top, left: fr.left } };
  });
  const form = { top: outer.frame.top + inner.form.top, bottom: outer.frame.top + inner.form.bottom, left: outer.frame.left + inner.form.left, right: outer.frame.left + inner.form.right };
  const inside = form.top >= outer.box.top && form.bottom <= outer.box.bottom && form.left >= outer.box.left && form.right <= outer.box.right;
  const hidesRest = outer.frame.top + inner.next >= outer.box.bottom;
  const slack = { top: Math.round(form.top - outer.box.top), bottom: Math.round(outer.box.bottom - form.bottom) };
  return { inside: inside && hidesRest, slack, finePrintGap: Math.round(outer.frame.top + inner.next - outer.box.bottom), nextEl: inner.nextEl.slice(0, 60), centered: Math.round((form.left - outer.box.left) - (outer.box.right - form.right)), box: outer.box };
}

(async () => {
  const b = await puppeteer.launch(LAUNCH);
  for (const [file, viewport, closeup] of SHOTS) {
    const p = await b.newPage();
    await p.setViewport(viewport);
    await p.goto(BASE + "/", { waitUntil: "networkidle0" });
    await p.evaluate(() => document.fonts.ready);
    const r = await fit(p);
    const good = r.inside && r.slack.top >= 2 && r.slack.bottom >= 2 && Math.abs(r.centered) <= 2;
    if (!good) failed++;
    console.log((good ? "ok   " : "FAIL ") + file + ": Laylo field and button inside the clip, centered", JSON.stringify(r));
    // Other widths: the field must stay inside the clip everywhere.
    for (const w of viewport.width > 600 ? [1024, 768] : [320, 360, 430]) {
      await p.setViewport({ ...viewport, width: w });
      await wait(2500);
      const rw = await fit(p);
      const ok = rw.inside && rw.slack.top >= 2 && rw.slack.bottom >= 2;
      if (!ok) failed++;
      console.log((ok ? "ok   " : "FAIL ") + `  at ${w}px wide`, JSON.stringify({ ...rw.slack, finePrintGap: rw.finePrintGap, nextEl: rw.nextEl }));
    }
    await p.setViewport(viewport);
    await wait(2500);
    if (closeup) {
      const box = await p.evaluate(() => { const e = document.querySelector(".home-signup").getBoundingClientRect(); return { x: e.left, y: e.top + scrollY, w: e.width, h: e.height }; });
      await p.setViewport({ ...viewport, deviceScaleFactor: 2 });
      await wait(2500);
      await p.screenshot({ path: path.join(ART, "launch2-signup.png"), clip: { x: box.x - 40, y: box.y - 28, width: box.w + 80, height: box.h + 56 }, captureBeyondViewport: false });
      console.log("saved " + path.join(ART, "launch2-signup.png"));
      await p.setViewport(viewport);
      await wait(2000);
    }
    // Full page: grow the viewport to the page height first so Laylo's frame repaints (puppeteer's fullPage leaves it blank).
    await p.evaluate(() => scrollTo(0, 0));
    const height = await p.evaluate(() => document.documentElement.scrollHeight);
    await p.setViewport({ ...viewport, height });
    await wait(4000);
    await p.screenshot({ path: path.join(ART, file), captureBeyondViewport: false });
    console.log("saved " + path.join(ART, file));
    await p.close();
  }
  await b.close();
  process.exitCode = failed ? 1 : 0;
})();
