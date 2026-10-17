// Desktop and phone screenshots of the Laylo embed on the home page Sign up section.
// node embed-shots.js
const puppeteer = require("puppeteer-core");
const path = require("path");
const { ART, LAUNCH } = require("./env");
const BASE = process.env.BASE || "http://127.0.0.1:47321";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOTS = [
  ["signup-embed.png", { width: 1440, height: 900, deviceScaleFactor: 1 }],
  ["signup-embed-mobile.png", { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }]
];

(async () => {
  const b = await puppeteer.launch(LAUNCH);
  for (const [file, viewport] of SHOTS) {
    const p = await b.newPage();
    await p.setViewport(viewport);
    await p.goto(BASE + "/", { waitUntil: "networkidle0" });
    await p.evaluate(() => document.fonts.ready);
    // Scroll in so the lazy iframe loads, then give Laylo time to draw.
    await p.evaluate(() => document.querySelector("#signup .laylo-embed").scrollIntoView({ block: "center" }));
    await p.waitForNetworkIdle({ idleTime: 800, timeout: 20000 }).catch(() => {});
    await wait(2500);
    await p.evaluate(() => document.querySelector("#signup .laylo-embed").scrollIntoView({ block: "center" }));
    await wait(400);
    await p.screenshot({ path: path.join(ART, file) });
    console.log("saved " + path.join(ART, file));
    await p.close();
  }
  await b.close();
})();
