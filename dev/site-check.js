// Site checks: every page loads on desktop and phone with no errors, no broken
// local links or files, no sideways scroll, JetBrains Mono, and no em dashes.
// Then the home play area: steer Skwish, charge a portal, and warp through it.
// node site-check.js [all|pages|home]
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const { ROOT, ART, LAUNCH, expected404 } = require("./env");
const BASE = process.env.BASE || "http://127.0.0.1:47321";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const only = process.argv[2] || "all";
const results = {};
const ok = (name, cond, extra) => {
  results[name] = cond ? "PASS" : "FAIL";
  console.log((cond ? "PASS " : "FAIL ") + name + (extra !== undefined ? " " + JSON.stringify(extra) : ""));
};

const PAGES = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8")
  .match(/<loc>[^<]+<\/loc>/g)
  .map((l) => new URL(l.slice(5, -6)).pathname)
  .concat(["/404.html", "/tools/beatmap/"]);
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

async function open(b, url, viewport) {
  const p = await b.newPage();
  p.errors = [];
  p.bad = [];
  p.on("console", (m) => { if (m.type() === "error" && !expected404(m)) p.errors.push(m.text()); });
  p.on("pageerror", (e) => p.errors.push("PAGEERROR " + e.message));
  p.on("response", (r) => { if (r.url().startsWith(BASE) && r.status() >= 400) p.bad.push(r.status() + " " + r.url().replace(BASE, "")); });
  p.on("requestfailed", (r) => { if (r.url().startsWith(BASE)) p.bad.push("failed " + r.url().replace(BASE, "")); });
  await p.setViewport(viewport);
  await p.goto(BASE + url, { waitUntil: "networkidle0" });
  await p.evaluate(() => document.fonts.ready);
  return p;
}

(async () => {
  const b = await puppeteer.launch(LAUNCH);

  if (only === "all" || only === "pages") {
    const links = new Set();
    for (const url of PAGES) {
      for (const [name, vp] of [["desktop", DESKTOP], ["phone", PHONE]]) {
        const p = await open(b, url, vp);
        const info = await p.evaluate(() => {
          const body = getComputedStyle(document.body).fontFamily;
          const fontOk = /JetBrains Mono/.test(body) && document.fonts.check('16px "JetBrains Mono"');
          return {
            fontOk,
            body,
            overflow: document.documentElement.scrollWidth - innerWidth,
            dashes: (document.body.innerText + " " + document.title).includes("\u2014"),
            links: [...document.querySelectorAll("a[href]")].map((a) => a.href).filter((h) => h.startsWith(location.origin))
          };
        });
        info.links.forEach((l) => links.add(l.split("#")[0]));
        // The live merch store only answers its own site, so locally the cards come from the snapshot.
        if (url === "/merch/") {
          p.errors = p.errors.filter((e) => !/bassthreadsmerch\.com.*CORS|net::ERR_FAILED/.test(e));
          const cards = await p.$$eval("[data-source] > *", (els) => els.length).catch(() => 0);
          ok(`${url} ${name}: merch cards from snapshot`, cards > 0, cards);
        }
        ok(`${url} ${name}: loads clean`, p.errors.length === 0 && p.bad.length === 0, p.errors.length || p.bad.length ? { errors: p.errors, bad: p.bad } : undefined);
        ok(`${url} ${name}: no sideways scroll`, info.overflow <= 0, info.overflow || undefined);
        ok(`${url} ${name}: JetBrains Mono`, info.fontOk, info.fontOk ? undefined : info.body);
        ok(`${url} ${name}: no em dashes`, !info.dashes);
        await p.close();
      }
    }
    const broken = [];
    for (const l of links) {
      const r = await fetch(l);
      if (!r.ok) broken.push(r.status + " " + l.replace(BASE, ""));
    }
    ok(`local links resolve (${links.size})`, broken.length === 0, broken.length ? broken : undefined);
    const files = execList(ROOT);
    const dashFiles = files.filter((f) => fs.readFileSync(f, "utf8").includes("\u2014")).map((f) => path.relative(ROOT, f));
    ok("no em dashes in source files", dashFiles.length === 0, dashFiles.length ? dashFiles : undefined);
  }

  if (only === "all" || only === "home") {
    // Desktop: arrow keys steer Skwish, parking on a portal charges it, then it warps.
    const p = await open(b, "/", { ...DESKTOP, deviceScaleFactor: 2 });
    await p.screenshot({ path: path.join(ART, "home-desktop-1440.png") });
    const where = () => p.evaluate(() => { const r = document.querySelector("#skwish").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const portal = await p.evaluate(() => { const r = document.querySelector(".portal-play").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const start = await where();
    await p.focus(".arena").catch(() => {});
    // Steer toward the Play portal with the keys.
    const steer = async (ms) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        const s = await where();
        const dx = portal.x - s.x, dy = portal.y - s.y;
        if (Math.hypot(dx, dy) < 18) break;
        const want = [];
        if (Math.abs(dx) > 10) want.push(dx > 0 ? "ArrowRight" : "ArrowLeft");
        if (Math.abs(dy) > 10) want.push(dy > 0 ? "ArrowDown" : "ArrowUp");
        for (const k of want) await p.keyboard.down(k);
        await wait(60);
        for (const k of want) await p.keyboard.up(k);
      }
    };
    await p.keyboard.down("ArrowRight");
    await wait(250);
    await p.keyboard.up("ArrowRight");
    const moved = await where();
    ok("home: arrow keys move Skwish", Math.abs(moved.x - start.x) > 10, { start, moved });
    await steer(6000);
    await p.waitForSelector(".portal-play.is-charging", { timeout: 3000 }).catch(() => {});
    await wait(320);
    const charging = await p.evaluate(() => !!document.querySelector(".portal-play.is-charging"));
    ok("home: parking on Play charges it", charging);
    await p.screenshot({ path: path.join(ART, "home-mid-interaction.png") });
    await p.waitForNavigation({ timeout: 4000 }).catch(() => {});
    ok("home: charged portal warps to /play/", new URL(p.url()).pathname === "/play/", p.url());
    ok("home: no console errors (desktop)", p.errors.length === 0, p.errors.length ? p.errors : undefined);
    await p.close();

    // Phone: tap a portal and Skwish dashes there, then warps.
    const m = await open(b, "/", PHONE);
    await m.screenshot({ path: path.join(ART, "home-mobile-390.png") });
    await m.tap(".portal-music");
    await m.waitForNavigation({ timeout: 6000 }).catch(() => {});
    ok("home: tapping a portal goes there (phone)", new URL(m.url()).pathname === "/music/", m.url());
    ok("home: no console errors (phone)", m.errors.length === 0, m.errors.length ? m.errors : undefined);
    await m.close();

    // Reduced motion: a portal click goes straight there.
    const r = await b.newPage();
    await r.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await r.goto(BASE + "/", { waitUntil: "networkidle0" });
    await Promise.all([r.waitForNavigation({ timeout: 3000 }).catch(() => {}), r.click(".portal-shows")]);
    ok("home: reduced motion goes straight through", new URL(r.url()).pathname === "/shows/", r.url());
    await r.close();
  }

  await b.close();
  const fails = Object.entries(results).filter(([, v]) => v !== "PASS");
  console.log(fails.length ? "FAILED: " + fails.map(([k]) => k).join(", ") : "ALL PASS (" + Object.keys(results).length + " checks)");
})();

// Site source files (html, css, js, md, txt, xml), skipping git, node_modules, and test audio.
function execList(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "tmp-audio", "uploads"].includes(e.name)) continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...execList(f));
    else if (/\.(html|css|js|mjs|md|txt|xml|json|py)$/.test(e.name)) out.push(f);
  }
  return out;
}
