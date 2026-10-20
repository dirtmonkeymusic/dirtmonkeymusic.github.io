// End-to-end test of /beta/ downloads, on the Mac only (changes nothing that gets committed).
// Builds a throwaway copy of the content with one fake Wonk Factory build (DM_BETA_BUILDS = a temp file),
// unlocks with the Test code, checks the name and email gate, the log rows (dev/beta-log-server.js on a
// spare port) and the feedback box, takes screenshots, then rebuilds the real content again.
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
const tmpBuilds = path.join(os.tmpdir(), "beta-builds.test.json");
const logFile = path.join(__dirname, "beta-log.local.jsonl");
const FAKE = "https://www.dropbox.com/scl/fi/TESTONLY/Wonk%20Factory.pkg?dl=1";
const results = [];
const ok = (n, c, x) => { results.push([n, !!c]); console.log((c ? "PASS " : "FAIL ") + n + (x !== undefined ? " " + JSON.stringify(x) : "")); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const node = process.execPath;

(async () => {
  const code = JSON.parse(fs.readFileSync(path.join(__dirname, "beta-codes.local.json"), "utf8")).testers.find((t) => t.name === "Test").code;
  fs.writeFileSync(tmpBuilds, JSON.stringify({ "Wonk Factory": { version: "1.0.3", url: FAKE, size: 142889782, date: "2026-10-20" } }));
  execFileSync(node, [path.join(__dirname, "beta-codes.js"), "rebuild"], { env: { ...process.env, DM_BETA_BUILDS: tmpBuilds }, stdio: "inherit" });
  const before = fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf8") : null;
  if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
  const log = spawn(node, [path.join(__dirname, "beta-log-server.js"), String(LOGPORT)], { stdio: "ignore" });
  await wait(500);
  const b = await puppeteer.launch(LAUNCH);
  try {
    for (const [label, vp, shot] of [["desktop", { width: 1440, height: 900 }, SHOT], ["phone", { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, SHOT.replace(/\.png$/, "-mobile.png")]]) {
      const ctx = await b.createBrowserContext();
      const p = await ctx.newPage();
      await p.setViewport(vp);
      await p.evaluateOnNewDocument((u) => { window.DM_BETA_LOG_URL = u; }, "http://127.0.0.1:" + LOGPORT + "/log");
      await p.setRequestInterception(true);
      const hits = [];
      p.on("request", (r) => { if (r.url().startsWith("https://www.dropbox.com/scl/fi/TESTONLY")) { hits.push(r.url()); r.respond({ status: 200, contentType: "text/plain", body: "test" }); } else r.continue(); });
      await p.goto(BASE + "/beta/", { waitUntil: "networkidle0" });
      await p.type("[data-beta-code]", code);
      await p.click("[data-beta-unlock]");
      await p.waitForFunction(() => !document.querySelector("[data-beta-content]").hidden, { timeout: 20000 });
      const cards = await p.$$eval(".beta-card", (els) => els.map((e) => [e.querySelector(".beta-card-name").textContent, e.querySelector(".beta-download").textContent.trim(), (e.querySelector(".beta-card-ver") || {}).textContent || ""]));
      const wf = cards.find((c) => c[0] === "Wonk Factory");
      ok(label + ": Wonk Factory shows its build, the rest are coming soon", wf[1] === "Download" && /v1\.0\.3 · Oct 20, 2026 · 143 MB/.test(wf[2]) && cards.filter((c) => c[1] === "Download coming soon").length === 8, wf);
      const sel = '.beta-download[data-beta-download="Wonk Factory"]';
      ok(label + ": download starts gated", await p.$eval(sel, (a) => a.classList.contains("is-gated") && a.getAttribute("aria-disabled") === "true"));
      await p.click(sel);
      await wait(300);
      ok(label + ": no name or email, so no download and a hint", hits.length === 0 && await p.$eval("[data-beta-who-error]", (e) => !e.hidden));
      await p.type("[data-beta-name]", "Test Tester");
      await p.type("[data-beta-email]", "not-an-email");
      ok(label + ": a bad email keeps it gated", await p.$eval(sel, (a) => a.classList.contains("is-gated")));
      await p.$eval("[data-beta-email]", (e) => { e.value = ""; });
      await p.type("[data-beta-email]", "tester@example.com");
      ok(label + ": name and email open the download", await p.$eval(sel, (a) => !a.classList.contains("is-gated")));
      if (label === "desktop") {
        await p.type("[data-beta-feedback]", "Love the wobble. Can we get a darker preset?");
        await p.click("[data-beta-send]");
        await wait(300);
        ok(label + ": feedback sends and says thanks", await p.$eval("[data-beta-sent]", (e) => !e.hidden && e.textContent === "Thanks! We got it."));
        await p.$eval("[data-beta-sent]", (e) => { e.hidden = true; });
        await p.$eval("[data-beta-name]", (e) => e.scrollIntoView({ block: "start" }));
        await p.screenshot({ path: shot, fullPage: true });
      }
      await Promise.all([p.waitForRequest((r) => r.url().startsWith("https://www.dropbox.com/scl/fi/TESTONLY"), { timeout: 5000 }).catch(() => null), p.click(sel)]);
      await wait(800);
      ok(label + ": the download link was followed", hits.length === 1, hits);
      if (label === "phone") {
        await p.goto(BASE + "/beta/", { waitUntil: "networkidle0" });
        await p.waitForFunction(() => !document.querySelector("[data-beta-content]").hidden, { timeout: 20000 });
        const kept = await p.evaluate(() => [document.querySelector("[data-beta-name]").value, document.querySelector("[data-beta-email]").value]);
        ok(label + ": name and email are remembered", kept[0] === "Test Tester" && kept[1] === "tester@example.com", kept);
        await p.$eval("[data-beta-name]", (e) => e.scrollIntoView({ block: "start" }));
        await p.screenshot({ path: shot, fullPage: true });
      }
      await ctx.close();
    }
    await wait(500);
    const csv = execFileSync("curl", ["-s", "http://127.0.0.1:" + LOGPORT + "/export.csv?token=local"]).toString();
    console.log(csv);
    const lines = csv.trim().split("\n");
    ok("log: header, 2 downloads and 1 feedback", lines[0] === "timestamp,kind,name,email,plugin,version,message" && lines.filter((l) => l.includes('"download","Test Tester","tester@example.com","Wonk Factory","1.0.3"')).length === 2 && lines.filter((l) => l.includes('"feedback","Test Tester","tester@example.com","",""') && l.includes("darker preset")).length === 1, lines.length);
    ok("log: no access without the token", execFileSync("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", "http://127.0.0.1:" + LOGPORT + "/export.csv"]).toString() === "403");
  } finally {
    await b.close();
    log.kill();
    fs.unlinkSync(tmpBuilds);
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    if (before !== null) fs.writeFileSync(logFile, before);
    execFileSync(node, [path.join(__dirname, "beta-codes.js"), "rebuild"], { stdio: "inherit" });
  }
  const bad = results.filter((r) => !r[1]);
  console.log(bad.length ? "FAILED: " + bad.map((r) => r[0]).join(", ") : "ALL PASS (" + results.length + " checks)");
  process.exit(bad.length ? 1 : 0);
})();
