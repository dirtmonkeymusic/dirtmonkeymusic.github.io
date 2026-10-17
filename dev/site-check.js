// Site checks: every page loads on desktop and phone with no errors, no broken
// local links or files, no sideways scroll, JetBrains Mono, and no em dashes.
// Then the home page: the section links, and Skwish Pong (attract mode, a game, Esc, reduced motion).
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
    const st = (p) => p.evaluate(() => window.skwishPong.state());
    // Desktop: the paddles play on their own, every section has a link, and clicking Skwish starts Pong.
    const p = await open(b, "/", DESKTOP);
    await wait(1200);
    await p.screenshot({ path: path.join(ART, "home2-desktop.png") });
    const links = await p.$$eval(".home-links a", (as) => as.map((a) => a.getAttribute("href")));
    ok("home: only Merch, Shows, and Sign up", JSON.stringify(links) === JSON.stringify(["/merch/", "/shows/", "#signup"]), links);
    const nav = await p.$$eval(".site-nav a", (as) => as.map((a) => a.getAttribute("href")));
    ok("home: nav is Merch, Shows, Sign up", JSON.stringify(nav) === JSON.stringify(["/merch/", "/shows/", "/#signup"]), nav);
    const a1 = await st(p);
    await wait(400);
    const a2 = await st(p);
    ok("home: attract mode moves Skwish", a1.mode === "attract" && a2.running && Math.abs(a2.ball.x - a1.ball.x) > 20, { a1, a2 });
    const shift = await p.evaluate(() => new Promise((res) => {
      let total = 0;
      new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) total += e.value; })).observe({ type: "layout-shift", buffered: true });
      setTimeout(() => res(total), 300);
    }));
    ok("home: no layout shift", shift < 0.01, shift);
    const rect = await p.$eval(".pong-canvas", (c) => { const r = c.getBoundingClientRect(); return { x: r.left, y: r.top }; });
    const s = await st(p);
    await p.mouse.click(rect.x + s.ball.x, rect.y + s.ball.y);
    await wait(100);
    ok("home: clicking Skwish starts Pong", (await st(p)).mode !== "attract");
    // Keys move the left paddle.
    const before = (await st(p)).left;
    await p.keyboard.down("ArrowDown");
    await wait(300);
    await p.keyboard.up("ArrowDown");
    ok("home: arrow keys move the paddle", (await st(p)).left - before > 20, { before, after: (await st(p)).left });
    // Mouse follows: aim the paddle at Skwish (missing now and then) until a few points are in, then take the shot mid game.
    for (let i = 0; i < 400; i++) {
      const g = await st(p);
      if (g.score[0] + g.score[1] >= 3 && g.mode === "play" && g.ball.x > g.W * 0.3) break;
      await p.mouse.move(rect.x + 200, rect.y + g.ball.y + (i % 60 < 12 ? g.H * 0.3 : 0));
      await wait(50);
    }
    const mid = await st(p);
    ok("home: Pong is on", mid.mode === "play" || mid.mode === "serve", mid);
    await p.screenshot({ path: path.join(ART, "home2-pong.png") });
    await p.keyboard.press("Escape");
    await wait(100);
    ok("home: Esc goes back to attract mode", (await st(p)).mode === "attract" && await p.$eval("[data-pong-score]", (e) => e.hidden));
    await p.click(".pong-start");
    await wait(100);
    await p.click(".pong-close");
    await wait(100);
    ok("home: Play Pong and X work", (await st(p)).mode === "attract");
    await Promise.all([p.waitForNavigation({ timeout: 4000 }).catch(() => {}), p.click('.home-links a[href="/shows/"]')]);
    ok("home: links go straight to their page", new URL(p.url()).pathname === "/shows/", p.url());
    ok("home: no console errors (desktop)", p.errors.length === 0, p.errors.length ? p.errors : undefined);
    await p.close();

    // Phone: tap Skwish to play, drag to move, and the links still work.
    const m = await open(b, "/", PHONE);
    await wait(1200);
    await m.screenshot({ path: path.join(ART, "home2-mobile.png") });
    const mr = await m.$eval(".pong-canvas", (c) => { const r = c.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY }; });
    await m.evaluate((y) => scrollTo(0, y - 100), mr.y);
    await wait(200);
    const mrect = await m.$eval(".pong-canvas", (c) => { const r = c.getBoundingClientRect(); return { x: r.left, y: r.top }; });
    const ms = await st(m);
    await m.touchscreen.tap(mrect.x + ms.ball.x, mrect.y + ms.ball.y);
    await wait(100);
    ok("home: tapping Skwish starts Pong (phone)", (await st(m)).mode !== "attract");
    await m.touchscreen.touchStart(mrect.x + 40, mrect.y + 40);
    await m.touchscreen.touchMove(mrect.x + 40, mrect.y + ms.H - 40);
    await wait(400);
    await m.touchscreen.touchEnd();
    ok("home: dragging moves the paddle (phone)", (await st(m)).left > ms.H * 0.6, await st(m));
    await m.tap(".pong-close");
    await m.evaluate(() => scrollTo(0, 0));
    await Promise.all([m.waitForNavigation({ timeout: 4000 }).catch(() => {}), m.tap('.home-links a[href="/merch/"]')]);
    ok("home: tapping a link goes there (phone)", new URL(m.url()).pathname === "/merch/", m.url());
    ok("home: no console errors (phone)", m.errors.length === 0, m.errors.length ? m.errors : undefined);
    await m.close();

    // Reduced motion: Skwish stays still until someone asks for a game.
    const r = await b.newPage();
    await r.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await r.setViewport(DESKTOP);
    await r.goto(BASE + "/", { waitUntil: "networkidle0" });
    await wait(500);
    const r1 = await st(r);
    await wait(400);
    const r2 = await st(r);
    ok("home: reduced motion keeps Skwish still", !r2.running && r1.ball.x === r2.ball.x && Math.abs(r2.ball.x - r2.W / 2) < 1, { r1, r2 });
    await r.click(".pong-start");
    await wait(1500);
    ok("home: reduced motion can still play on request", (await st(r)).running);
    await r.keyboard.press("Escape");
    await wait(100);
    ok("home: reduced motion goes still again after Esc", !(await st(r)).running);
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
