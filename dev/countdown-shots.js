// Desktop and phone screenshots of the home page countdown.
// node countdown-shots.js
const puppeteer = require("puppeteer-core");
const path = require("path");
const { ART, LAUNCH } = require("./env");
const BASE = process.env.BASE || "http://127.0.0.1:47321";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOTS = [
  ["home-countdown.png", { width: 1440, height: 900, deviceScaleFactor: 1 }],
  ["home-countdown-mobile.png", { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }]
];

(async () => {
  const b = await puppeteer.launch(LAUNCH);
  for (const [file, viewport] of SHOTS) {
    const p = await b.newPage();
    await p.setViewport(viewport);
    await p.goto(BASE + "/", { waitUntil: "networkidle0" });
    await p.evaluate(() => document.fonts.ready);
    await wait(1200);
    await p.screenshot({ path: path.join(ART, file) });
    console.log("saved " + path.join(ART, file));
    await p.close();
  }
  await b.close();
})();
