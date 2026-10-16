const puppeteer = require("puppeteer-core");
const fs = require("fs");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const path = require("path");
const { SHOT, ART, AUDIO, LAUNCH } = require("./env");
const BASE = process.env.BASE || "http://127.0.0.1:47321";
const A = AUDIO + "/";
(async () => {
  const b = await puppeteer.launch(LAUNCH);
  const out = {};
  for (const [name, vp] of [["desktop", { width: 1280, height: 900, deviceScaleFactor: 2 }], ["mobile", { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
    const p = await b.newPage();
    const errors = [];
    p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    p.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
    await p.setViewport(vp);
    const dl = path.join(SHOT, "dl-" + name); fs.rmSync(dl, { recursive: true, force: true }); fs.mkdirSync(dl);
    const cdp = await p.target().createCDPSession();
    await cdp.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: dl });
    await p.goto(BASE + "/tools/beatmap/", { waitUntil: "networkidle0" });
    if (name === "desktop") await p.screenshot({ path: path.join(SHOT, "tool-empty.png"), fullPage: true });
    // nothing picked
    await p.click("[data-go]"); await wait(300);
    out[name + "Empty"] = await p.$eval("[data-status]", (e) => e.textContent);
    for (const [role, f] of [["mix", "mix.mp3"], ["kick", "kick.wav"], ["snare", "snare.wav"], ["bass", "bass.wav"]]) {
      const input = await p.$(`[data-role="${role}"]`); await input.uploadFile(A + f);
    }
    await wait(2500);
    out[name + "Notes"] = await p.$$eval(".file-note", (els) => els.map((e) => e.textContent));
    out[name + "Audio"] = await p.$eval("[data-audio]", (e) => e.value);
    if (name === "mobile") { await p.type("[data-bpm]", "145"); }
    const t0 = Date.now();
    await p.click("[data-go]");
    await p.waitForFunction(() => !document.querySelector("[data-result]").hidden, { timeout: 30000 });
    out[name + "Ms"] = Date.now() - t0;
    out[name + "Status"] = await p.$eval("[data-status]", (e) => e.textContent);
    out[name + "Stats"] = await p.$$eval("[data-stats] div", (els) => els.map((e) => e.innerText.replace(/\n/g, " | ")));
    const block = await p.$eval("[data-block]", (e) => e.value);
    out[name + "BlockHead"] = block.split("\n").slice(0, 8).join("\n");
    await p.click("[data-download]"); await wait(1500);
    const files = fs.readdirSync(dl);
    if (files.length) {
      const text = fs.readFileSync(dl + "/" + files[0], "utf8");
      const BM = new Function(text + "\nreturn BEATMAP;")();
      out[name + "Download"] = { file: files[0], trackNotes: Object.keys(BM.track.charts).map((k) => k + ' ' + BM.track.charts[k].length).join(', '), audio: BM.track.audio, placeholderNotes: Object.keys(BM.placeholder.charts).map((k) => k + ' ' + BM.placeholder.charts[k].length).join(', ') };
    } else out[name + "Download"] = "none";
    await p.click("[data-listen]"); await wait(1500);
    out[name + "Listen"] = await p.$eval("[data-listen]", (e) => e.textContent + " " + e.getAttribute("aria-pressed"));
    await p.addStyleTag({ content: ".site-header{position:static !important}" });
    await p.screenshot({ path: path.join(SHOT, "beatmap-maker-" + name + ".png"), fullPage: true });
    await p.click("[data-listen]"); await wait(200);
    out[name + "Stopped"] = await p.$eval("[data-listen]", (e) => e.textContent);
    out[name + "Overflow"] = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    out[name + "Small"] = await p.evaluate(() => [...document.querySelectorAll("a,button,input,select")].filter((e) => e.getClientRects().length && e.getBoundingClientRect().height < 44 && !e.classList.contains("skip") && !e.closest("ol")).map((e) => e.tagName + ":" + (e.textContent || e.id).trim().slice(0, 20) + ":" + Math.round(e.getBoundingClientRect().height)));
    out[name + "Errors"] = errors;
    await p.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
