// Full-page desktop and phone screenshots of the launch home page (logo, countdown, Laylo signup, Pong, Merch and Shows).
// node launch-shots.js
const puppeteer = require("puppeteer-core");
const path = require("path");
const { ART, LAUNCH } = require("./env");
const BASE = process.env.BASE || "http://127.0.0.1:47321";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOTS = [
  ["launch-desktop.png", { width: 1440, height: 900, deviceScaleFactor: 1 }],
  ["launch-mobile.png", { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }]
];

(async () => {
  const b = await puppeteer.launch(LAUNCH);
  for (const [file, viewport] of SHOTS) {
    const p = await b.newPage();
    await p.setViewport(viewport);
    await p.goto(BASE + "/", { waitUntil: "networkidle0" });
    await p.evaluate(() => document.fonts.ready);
    // The Laylo embed is lazy: scroll to it, then give Laylo's inner frame time to draw its form.
    await p.$eval("#signup", (e) => e.scrollIntoView());
    const t0 = Date.now();
    while (Date.now() - t0 < 15000 && !p.frames().some((f) => f.url().startsWith("https://embed.laylo.com/"))) await wait(250);
    await wait(4000);
    // Full page: grow the viewport to the page height first and let Laylo's frame repaint,
    // since puppeteer's own fullPage resize catches the embed before it redraws (blank box).
    await p.evaluate(() => scrollTo(0, 0));
    const height = await p.evaluate(() => document.documentElement.scrollHeight);
    await p.setViewport({ ...viewport, height });
    await wait(4000);
    await p.screenshot({ path: path.join(ART, file), captureBeyondViewport: false });
    console.log("saved " + path.join(ART, file));
    await p.close();
  }
  await b.close();
})();
