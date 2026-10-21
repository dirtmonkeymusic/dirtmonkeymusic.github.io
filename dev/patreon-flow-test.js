// End-to-end test of the hidden Patreon Wonk Factory page, on the Mac only (changes nothing committed).
// Serves a fake beta/latest.json, checks the name gate, direct downloads, the log rows (tagged
// "Wonk Factory (Patreon)", via dev/beta-log-server.js on a spare port) and feedback, and takes screenshots.
// node dev/patreon-flow-test.js [screenshot.png]
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const puppeteer = require("puppeteer-core");
const { LAUNCH } = require("./env");

const BASE = process.env.BASE || "http://127.0.0.1:47321";
const PAGE = "/patreon/wonk-c3hbol/";
const LOGPORT = 47332;
const SHOT = process.argv[2] || path.join(os.tmpdir(), "patreon-flow.png");
const logFile = path.join(__dirname, "beta-log.local.jsonl");
const MAC = "https://www.dropbox.com/scl/fi/TESTONLY/Wonk%20Factory%20Beta%20(Mac).pkg?dl=1";
const PC = "https://www.dropbox.com/scl/fi/TESTONLY/Wonk%20Factory%20Beta%20(PC).zip?dl=1";
const FAKE = { mac: { version: "9.9.9", url: "x", size: 1, date: "2026-10-20", plugins: { "Wonk Factory": { version: "1.0.1", url: MAC.replace("dl=1", "dl=0"), size: 142905213, date: "2026-10-21" } } },
  pc: { version: "9.9.9", url: "x", size: 1, date: "2026-10-20", plugins: { "Wonk Factory": { version: "1.0.1", url: PC, size: 130930889, date: "2026-10-21" } } } };
const results = [];
const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? "PASS " : "FAIL ") + n + (x !== undefined ? " " + JSON.stringify(x) : "")); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const before = fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf8") : null;
  const log = spawn(process.execPath, [path.join(__dirname, "beta-log-server.js"), String(LOGPORT)], { stdio: "ignore" });
  await wait(500);
  const b = await puppeteer.launch(LAUNCH);
  try {
    for (const [label, vp, shot] of [["desktop", { width: 1440, height: 900 }, SHOT], ["phone", { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, SHOT.replace(/\.png$/, "-mobile.png")]]) {
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
      const ctx = await b.createBrowserContext();
      const p = await ctx.newPage();
      await p.setViewport(vp);
      await p.evaluateOnNewDocument((u) => { window.DM_BETA_LOG_URL = u; }, "http://127.0.0.1:" + LOGPORT + "/log");
      await p.setRequestInterception(true);
      const hits = [];
      p.on("request", (r) => {
        if (r.url().includes("dm-beta-log.dirtmonkeymusic.workers.dev")) { hits.push("REAL LOG " + r.url()); return r.abort(); }
        if (r.url().endsWith("/beta/latest.json")) return r.respond({ status: 200, contentType: "application/json", body: JSON.stringify(FAKE) });
        if (r.url().startsWith("https://www.dropbox.com/")) { hits.push(r.url()); return r.respond({ status: 204, body: "" }); }
        r.continue();
      });
      await p.goto(BASE + PAGE, { waitUntil: "networkidle0" });
      const vers = await p.$$eval("[data-pw-ver]", (e) => e.map((x) => x.textContent));
      ok(label + ": Wonk Factory version, date, size by each button (not the suite)", /^v1\.0\.1 · Oct 21, 2026 · 143 MB$/.test(vers[0]) && /^v1\.0\.1 · Oct 21, 2026 · 131 MB$/.test(vers[1]), vers);
      await p.click('[data-pw-platform="mac"]');
      await wait(300);
      ok(label + ": no name, download blocked with a message", hits.length === 0 && await p.$eval("[data-pw-error]", (e) => !e.hidden));
      await p.type("[data-pw-name]", "Patron Tester");
      await p.type("[data-pw-email]", "nope");
      await p.click('[data-pw-platform="pc"]');
      await wait(300);
      ok(label + ": bad email blocked", hits.length === 0);
      await p.click("[data-pw-email]", { clickCount: 3 });
      await p.keyboard.press("Backspace");
      ok(label + ": name only opens the buttons (email optional)", await p.$eval('[data-pw-platform="mac"]', (a) => a.getAttribute("aria-disabled") === "false"));
      await p.type("[data-pw-email]", "patron@example.com");
      await p.type("[data-pw-feedback]", "Wonky in the best way.");
      await p.click("[data-pw-send]");
      await wait(300);
      const attrs = await p.$$eval("[data-pw-platform]", (e) => e.map((a) => [a.href, a.target, a.hasAttribute("download")]));
      ok(label + ": buttons are direct dl=1 links, same tab", attrs.every((x) => /[?&]dl=1(&|$)/.test(x[0]) && !x[1] && x[2]), attrs);
      const n0 = (await ctx.pages()).length;
      await p.click('[data-pw-platform="mac"]');
      await wait(400);
      await p.click('[data-pw-platform="pc"]');
      await wait(600);
      ok(label + ": both download the Wonk Factory files, no new tab", hits.includes(MAC) && hits.includes(PC) && (await ctx.pages()).length === n0 && !hits.some((h) => h.startsWith("REAL LOG")), hits);
      const rows = fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
      const dl = rows.filter((r) => r.kind === "download");
      ok(label + ": log rows tagged Wonk Factory (Patreon), with name, email, platform, version", dl.length === 2 && dl[0].platform === "Mac" && dl[1].platform === "PC" && rows.every((r) => r.plugins === "Wonk Factory (Patreon)" && r.name === "Patron Tester" && r.email === "patron@example.com" && r.ts) && dl.every((r) => r.version === "1.0.1"), rows);
      ok(label + ": feedback logged", rows.some((r) => r.kind === "feedback" && r.message === "Wonky in the best way."));
      await p.evaluate(() => { document.querySelector("[data-pw-sent]").hidden = true; document.querySelector("[data-pw-email]").value = ""; window.scrollTo(0, 0); });
      await p.screenshot({ path: shot, fullPage: true });
      await ctx.close();
    }
  } finally {
    await b.close();
    log.kill();
    if (before !== null) fs.writeFileSync(logFile, before); else if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
  }
  const fails = results.filter((r) => !r[1]).length;
  console.log(results.length - fails + "/" + results.length + " passed");
  process.exit(fails ? 1 : 0);
})();
