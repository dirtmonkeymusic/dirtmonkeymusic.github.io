// End-to-end test of /beta/, on the Mac only (changes nothing that gets committed).
// Serves a fake beta/latest.json (Mac v1.0.3, PC v1.0.2), checks the name and email gate, the log rows
// (dev/beta-log-server.js on a spare port) and the feedback box, and takes screenshots.
// Also runs dev/beta-publish.js against temp copies to check it writes the manifest right.
// node dev/beta-flow-test.js [screenshot.png]
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, execFileSync } = require("child_process");
const puppeteer = require("puppeteer-core");
const { LAUNCH } = require("./env");

const BASE = process.env.BASE || "http://127.0.0.1:47321";
const LOGPORT = 47331;
const SHOT = process.argv[2] || path.join(os.tmpdir(), "beta-flow.png");
const logFile = path.join(__dirname, "beta-log.local.jsonl");
const MAC = "https://www.dropbox.com/scl/fi/TESTONLY/Dirt%20Monkey%20Beta%20(Mac).pkg?dl=1";
const PC = "https://www.dropbox.com/scl/fi/TESTONLY/Dirt%20Monkey%20Beta%20(PC).zip?dl=1";
const PURL = (n) => "https://www.dropbox.com/scl/fi/TESTONLY/" + encodeURIComponent(n) + "%20Beta%20(Mac).pkg?dl=1";
const FAKE = { mac: { version: "1.0.3", url: MAC.replace("dl=1", "dl=0"), size: 142889782, date: "2026-10-20", plugins: { Punch: { version: "1.0.3", url: PURL("Punch").replace("dl=1", "dl=0"), size: 9e6, date: "2026-10-20" }, Dip: { version: "1.0.3", url: PURL("Dip"), size: 8e6, date: "2026-10-20" } } }, pc: { version: "1.0.2", url: PC, size: 98000000, date: "2026-10-19" } };
const results = [];
const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? "PASS " : "FAIL ") + n + (x !== undefined ? " " + JSON.stringify(x) : "")); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const node = process.execPath;

(async () => {
  // beta-publish.js on temp copies
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "betapub-"));
  const man = path.join(tmp, "latest.json"), inst = path.join(tmp, "build.pkg");
  fs.copyFileSync(path.join(__dirname, "..", "beta", "latest.json"), man);
  fs.writeFileSync(inst, Buffer.alloc(2e6));
  const env = { ...process.env, DM_BETA_LATEST: man, DM_BETA_DIR: path.join(tmp, "dropbox") };
  execFileSync(node, [path.join(__dirname, "beta-publish.js"), "--platform", "mac", inst, "--version", "2.0.1"], { env, stdio: "ignore" });
  execFileSync(node, [path.join(__dirname, "beta-publish.js"), "--platform", "mac", "--url", "https://www.dropbox.com/scl/fi/x/a.pkg?rlkey=k&dl=0"], { env, stdio: "ignore" });
  execFileSync(node, [path.join(__dirname, "beta-publish.js"), "--platform", "mac", "--plugin", "wonk factory", inst, "--version", "2.0.2"], { env, stdio: "ignore" });
  execFileSync(node, [path.join(__dirname, "beta-publish.js"), "--platform", "mac", "--plugin", "Wonk Factory", "--url", "https://www.dropbox.com/scl/fi/y/w.pkg?dl=0"], { env, stdio: "ignore" });
  const m = JSON.parse(fs.readFileSync(man, "utf8"));
  const wf = m.mac.plugins["Wonk Factory"] || {};
  ok("beta-publish --plugin adds a per-plugin entry and keeps the suite", wf.version === "2.0.2" && /dl=1/.test(wf.url) && m.mac.version === "2.0.1" && fs.existsSync(path.join(tmp, "dropbox", "Wonk Factory Beta (Mac).pkg")), m.mac.plugins);
  ok("beta-publish writes version, size, date, dl=1 link, and copies to Dropbox", m.mac.version === "2.0.1" && m.mac.size === 2e6 && /dl=1/.test(m.mac.url) && !m.pc.version && fs.existsSync(path.join(tmp, "dropbox", "Dirt Monkey Beta (Mac).pkg")), m.mac);

  const before = fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf8") : null;
  if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
  const log = spawn(node, [path.join(__dirname, "beta-log-server.js"), String(LOGPORT)], { stdio: "ignore" });
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
        if (r.url().endsWith("/beta/latest.json")) return r.respond({ status: 200, contentType: "application/json", body: JSON.stringify(FAKE) });
        if (r.url().startsWith("https://www.dropbox.com/")) { hits.push(r.url()); return r.respond({ status: 204, body: "" }); }
        r.continue();
      });
      await p.goto(BASE + "/beta/", { waitUntil: "networkidle0" });
      const vers = await p.$$eval("[data-beta-ver]", (e) => e.map((x) => x.textContent));
      ok(label + ": versions shown by the buttons", /^v1\.0\.3/.test(vers[0]) && /^v1\.0\.2/.test(vers[1]), vers);
      await p.click('[data-beta-platform="mac"]');
      await wait(300);
      ok(label + ": no name or email, Mac download blocked with a message", hits.length === 0 && await p.$eval("[data-beta-who-error]", (e) => !e.hidden));
      await p.type("[data-beta-name]", "Test Tester");
      await p.type("[data-beta-email]", "not-an-email");
      await p.click('[data-beta-platform="pc"]');
      await wait(300);
      ok(label + ": bad email still blocked", hits.length === 0);
      await p.click("[data-beta-email]", { clickCount: 3 });
      await p.keyboard.press("Backspace");
      ok(label + ": name only (email optional) opens the buttons", await p.$eval('[data-beta-platform="mac"]', (a) => a.getAttribute("aria-disabled") === "false") && await p.$eval("[data-beta-email]", (e) => /stay up to date/.test(e.placeholder)));
      await p.click("[data-beta-email]", { clickCount: 3 });
      await p.type("[data-beta-email]", "test@example.com");
      await p.type("[data-beta-feedback]", "Love the knobs.");
      await p.click("[data-beta-send]");
      await wait(300);
      ok(label + ": feedback before download says thanks and clears", await p.$eval("[data-beta-sent]", (e) => !e.hidden) && await p.$eval("[data-beta-feedback]", (e) => e.value === ""));
      const pagesBefore = (await ctx.pages()).length;
      const attrs = await p.$$eval("[data-beta-platform]", (e) => e.map((a) => [a.href, a.target, a.hasAttribute("download")]));
      ok(label + ": buttons are direct dl=1 links, same tab", attrs.every((x) => /[?&]dl=1(&|$)/.test(x[0]) && !x[1] && x[2]), attrs);
      ok(label + ": note says Please don't share this link.", await p.$eval(".beta-noshare", (e) => e.textContent.trim() === "Please don't share this link." && e.offsetParent !== null));
      await p.click('[data-beta-platform="mac"]');
      await wait(400);
      await p.click('[data-beta-platform="pc"]');
      await wait(400);
      await p.type("[data-beta-feedback]", "PC install was smooth.");
      await p.click("[data-beta-send]");
      await wait(600);
      ok(label + ": both downloads go to their Dropbox links", hits.includes(MAC) && hits.includes(PC), hits);
      // Untick all but Punch and Dip: Mac gets two staggered per-plugin downloads plus a fallback list.
      await p.click("[data-beta-all]");
      for (const n of ["Punch", "Dip"]) await p.click('[data-beta-pick][value="' + n + '"]');
      const macVer = await p.$eval('[data-beta-ver="mac"]', (e) => e.textContent);
      const pcSoon = await p.$eval('[data-beta-platform="pc"]', (a) => a.classList.contains("is-soon"));
      const n0 = hits.length;
      await p.click('[data-beta-platform="mac"]');
      await wait(3000);
      const got = hits.slice(n0);
      const list = await p.$$eval("[data-beta-files-list] a", (e) => e.map((a) => a.href));
      ok(label + ": picked plugins download one each, staggered, direct, with a list", /^2 plugins/.test(macVer) && pcSoon && got.length === 2 && got.every((u) => /dl=1/.test(u)) && list.length === 2 && await p.$eval("[data-beta-files]", (e) => !e.hidden), { macVer, got, list });
      ok(label + ": no new tab or window opened", (await ctx.pages()).length === pagesBefore);
      const rows = fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
      const dl = rows.filter((r) => r.kind === "download");
      ok(label + ": log has name, email, platform, version, time per download", dl.length === 3 && dl[2].plugins === "Punch, Dip" && dl[0].plugins === "Full suite" && dl[0].platform === "Mac" && dl[0].version === "1.0.3" && dl[1].platform === "PC" && dl[1].version === "1.0.2" && dl.every((r) => r.name === "Test Tester" && r.email === "test@example.com" && r.ts), dl);
      ok(label + ": both feedback notes logged with name and email", rows.filter((r) => r.kind === "feedback").map((r) => r.message).join("|") === "Love the knobs.|PC install was smooth.", rows);
      await p.click("[data-beta-all]");
      await p.evaluate(() => { document.querySelector("[data-beta-files]").hidden = true; document.querySelector("[data-beta-sent]").hidden = true; window.scrollTo(0, 0); });
      await p.screenshot({ path: shot, fullPage: true });
      await ctx.close();
    }
  } finally {
    await b.close();
    log.kill();
    if (before !== null) fs.writeFileSync(logFile, before); else if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const fails = results.filter((r) => !r[1]).length;
  console.log(results.length - fails + "/" + results.length + " passed");
  process.exit(fails ? 1 : 0);
})();
