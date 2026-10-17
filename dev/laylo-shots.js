// Desktop screenshots of the Laylo signup and the Music page SKWISH card.
// node laylo-shots.js
const puppeteer = require("puppeteer-core");
const path = require("path");
const { ART, LAUNCH } = require("./env");
const BASE = process.env.BASE || "http://127.0.0.1:47321";

(async () => {
  const b = await puppeteer.launch(LAUNCH);
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await p.goto(BASE + "/#signup", { waitUntil: "networkidle0" });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => document.querySelector("#signup").scrollIntoView({ block: "center" }));
  await new Promise((r) => setTimeout(r, 600));
  await p.screenshot({ path: path.join(ART, "signup-laylo.png") });
  await p.goto(BASE + "/music/", { waitUntil: "networkidle0" });
  await p.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 600));
  await p.screenshot({ path: path.join(ART, "music-laylo.png") });
  await b.close();
})();
