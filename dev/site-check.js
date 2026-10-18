// Site checks: every page loads on desktop and phone with no errors, no broken
// local links or files, no sideways scroll, JetBrains Mono, and no em dashes.
// Then the launch: only Merch and Shows linked, no visible link to a hidden page, /signup/ still works.
// Then the home page: no top links, the countdown, the Laylo signup, the one-click buttons, Skwish Pong (attract mode, a game, Esc, reduced motion), and the dub plate win player.
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
  .concat(["/404.html", "/tools/beatmap/", "/signup/", "/merch/"]);
// Live but not linked for now (Merch links open the Bass Threads store instead of /merch/). The launch pages must not show a link to any of them.
const HIDDEN = ["/merch/", "/plugins/", "/music/", "/app/", "/play/", "/signup/", "/tools/"];
const STORE = "https://dirtmonkey.bassthreadsmerch.com/";
const LAUNCH_PAGES = ["/", "/shows/", "/privacy/"];
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };
const PHONE = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

async function open(b, url, viewport) {
  const p = await b.newPage();
  p.errors = [];
  p.bad = [];
  // Console messages from inside the Laylo embed (and its Cloudflare Turnstile check) are theirs, not ours.
  // The site sends no CSP, so a report-only CSP notice always comes from a third-party frame.
  const fromLaylo = (m) => /^https:\/\/([^/]+\.)?(laylo\.com|challenges\.cloudflare\.com)\//.test((m.location() && m.location().url) || "") || /report-only Content Security Policy/.test(m.text());
  p.on("console", (m) => { if (m.type() === "error" && !expected404(m) && !fromLaylo(m)) p.errors.push(m.text()); });
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
    // Launch: every nav is just Merch and Shows, and the launch pages show no link to a hidden page.
    for (const url of PAGES.filter((u) => u !== "/404.html" && u !== "/privacy/" && u !== "/tools/beatmap/")) {
      const p = await open(b, url, DESKTOP);
      const nav = await p.$$eval(".site-nav a", (as) => as.map((a) => a.getAttribute("href")));
      // Home has no top links (its Merch and Shows buttons sit under Pong).
      if (url === "/") {
        ok(`${url}: no top nav links`, nav.length === 0, nav);
        await p.close();
        continue;
      }
      ok(`${url}: nav is only Merch and Shows`, JSON.stringify(nav) === JSON.stringify([STORE, "/shows/"]), nav);
      const merch = await p.$$eval(".site-nav a", (as) => as.filter((a) => a.textContent.trim() === "Merch").map((a) => [a.target, a.rel]));
      ok(`${url}: nav Merch opens the store in a new tab`, JSON.stringify(merch) === JSON.stringify([["_blank", "noopener"]]), merch);
      await p.close();
    }
    for (const url of LAUNCH_PAGES) {
      for (const [name, vp] of [["desktop", DESKTOP], ["phone", PHONE]]) {
        const p = await open(b, url, vp);
        const seen = await p.evaluate(() => [...document.querySelectorAll("a[href]")]
          .filter((a) => a.getClientRects().length && getComputedStyle(a).visibility !== "hidden")
          .map((a) => new URL(a.href, location.href))
          .filter((u) => u.origin === location.origin)
          .map((u) => u.pathname));
        const hits = seen.filter((path) => HIDDEN.some((h) => path.startsWith(h)));
        ok(`${url} ${name}: no visible link to a hidden page`, hits.length === 0, hits.length ? hits : undefined);
        await p.close();
      }
    }
    // Link previews say just "Dirt Monkey", with the wordless share card, and no old tagline anywhere.
    for (const url of LAUNCH_PAGES) {
      const html = await (await fetch(BASE + url)).text();
      const meta = (k) => { const m = html.match(new RegExp('<meta (?:property|name)="?' + k.replace(/:/g, ":") + '"? content="([^"]*)"')); return m ? m[1] : null; };
      const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
      const good = (url === "/privacy/" ? /^Dirt Monkey/.test(title) : title === "Dirt Monkey") && meta("og:title") === "Dirt Monkey" && meta("twitter:title") === "Dirt Monkey" && meta("og:site_name") === "Dirt Monkey" && meta("og:image:alt") === "Dirt Monkey" && /share-card-2\.jpg$/.test(meta("og:image") || "") && !/name="?description|og:description|twitter:description/.test(html) && !/Sounds of|Sample Packs|Plugins &amp;/i.test(html);
      ok(`${url}: preview is just Dirt Monkey`, good, { title, og: meta("og:title"), img: meta("og:image") });
    }
    // Plugin update feeds: /updates/<Plugin>.json, each valid JSON with a x.y.z version,
    // reachable URL-encoded (spaces as %20), and not linked from any page.
    {
      const dir = path.join(ROOT, "updates");
      const feeds = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
      const bad = [];
      for (const f of feeds) {
        let j = null;
        try { j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch (e) { bad.push(f + ": " + e.message); continue; }
        if (!/^\d+\.\d+\.\d+$/.test(j.version || "")) bad.push(f + ": version " + j.version);
        if (!/^https:\/\//.test(j.url || "")) bad.push(f + ": url " + j.url);
        if (typeof j.notes !== "string") bad.push(f + ": notes");
        const r = await fetch(BASE + "/updates/" + encodeURIComponent(f.slice(0, -5)) + ".json");
        if (!r.ok) bad.push(f + ": HTTP " + r.status);
        else { try { if ((await r.json()).version !== j.version) bad.push(f + ": served version differs"); } catch (e) { bad.push(f + ": served JSON " + e.message); } }
      }
      ok(`updates: ${feeds.length} plugin feeds parse, have x.y.z versions, and load URL-encoded`, feeds.length >= 11 && bad.length === 0, bad.length ? bad : feeds.map((f) => f.slice(0, -5)));
      const linked = execList(ROOT).filter((f) => f.endsWith(".html") && /\/updates\//.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(ROOT, f));
      ok("updates: no page links to /updates/", linked.length === 0, linked.length ? linked : undefined);
    }
    const home = await open(b, "/", PHONE);
    const priv = await home.$$eval('.site-footer a[href="/privacy/"]', (as) => as.filter((a) => a.getClientRects().length).length);
    await home.close();
    ok("home: footer links to Privacy", priv === 1, priv);
    const su = await open(b, "/signup/", PHONE);
    const suEmbed = await su.$$eval("iframe[data-laylo-embed]", (fs) => fs.map((f) => f.src));
    await su.close();
    ok("/signup/: still works, with the same Laylo embed", suEmbed.length === 1 && suEmbed[0] === "https://laylo.com/dirtmonkey/profile/embed?theme=dark&background=transparent", suEmbed);
    const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
    ok("/signup/ is not in the sitemap", !/\/signup\//.test(sitemap));
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
    ok("home: buttons are only Merch and Shows", JSON.stringify(links) === JSON.stringify([STORE, "/shows/"]), links);
    const merchBtn = await p.$$eval(".home-links a", (as) => as.filter((a) => a.textContent.trim() === "Merch").map((a) => [a.target, a.rel]));
    ok("home: Merch button opens the store in a new tab", JSON.stringify(merchBtn) === JSON.stringify([["_blank", "noopener"]]), merchBtn);
    const nav = await p.$$eval(".site-header a", (as) => as.filter((a) => /merch|shows/i.test(a.textContent)).map((a) => a.getAttribute("href")));
    ok("home: no Merch or Shows labels at the top", nav.length === 0 && (await p.$$(".site-nav")).length === 0, nav);
    // The buttons are plain links: nothing on the page cancels a first click.
    const plain = await p.$$eval(".home-links a", (as) => as.map((a) => {
      let seen = null;
      const stop = (e) => { seen = e.defaultPrevented; e.preventDefault(); };
      window.addEventListener("click", stop, { once: true });
      a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      return { text: a.textContent.trim(), cancelled: seen };
    }));
    ok("home: no script cancels a click on Merch or Shows", plain.length === 2 && plain.every((x) => x.cancelled === false), plain);
    // Merch: a single click opens the store in a new tab.
    const tab = new Promise((res) => b.once("targetcreated", (t) => res(t)));
    await p.click('.home-links a[href="' + STORE + '"]');
    const t = await Promise.race([tab, wait(5000).then(() => null)]);
    for (let i = 0; t && i < 40 && !t.url().startsWith("http"); i++) await wait(125);
    ok("home: one click on Merch opens the store in a new tab", !!t && t.url().startsWith(STORE), t ? t.url() : "no tab");
    if (t) { const tp = await t.page(); if (tp) await tp.close(); }
    await p.bringToFront();
    await wait(300);
    // Launch order: logo, countdown, the signup, Pong, the buttons, then the footer.
    const order = await p.evaluate(() => [".home-logo", "[data-home-countdown]", "#signup iframe", ".home-signup-legal", ".pong", ".home-links", ".site-footer"].map((q) => document.querySelector(q).getBoundingClientRect().top + scrollY));
    ok("home: logo, countdown, signup, Pong, buttons, then footer", order.every((y, i) => i === 0 || y > order[i - 1]), order);
    // Signup: Laylo's minimal embed clipped to the field and button, with Laylo's required line under it and nothing else.
    const su2 = await p.evaluate(() => {
      const box = document.querySelector("#signup");
      return {
        src: [...box.querySelectorAll("iframe[data-laylo-embed]")].map((f) => f.src),
        clip: getComputedStyle(box.querySelector(".home-signup-frame")).overflow,
        legal: box.querySelector(".home-signup-legal").textContent.trim(),
        extra: box.querySelectorAll("h1, h2, h3, img, form, a").length,
        font: getComputedStyle(box.querySelector(".home-signup-legal")).fontFamily
      };
    });
    ok("home: signup is the minimal Laylo embed, clipped, with the required line", JSON.stringify(su2.src) === JSON.stringify(["https://laylo.com/dirtmonkey/profile/embed?theme=dark&background=transparent&minimal=true&customColor=3dfff2"]) && su2.clip === "hidden" && su2.legal === "By submitting my information, I agree to receive recurring automated messages to the contact information provided and to Laylo's Terms of Service, Cookie Policy and Privacy Policy. Msg & data rates may apply. Reply STOP to cancel." && su2.extra === 0 && /JetBrains Mono/.test(su2.font), su2);
    // Countdown: four neon units between the logo and the signup, ticking.
    const cd = await p.evaluate(() => {
      const el = document.querySelector("[data-home-countdown]");
      const r = el.getBoundingClientRect();
      const logo = document.querySelector(".home-logo").getBoundingClientRect();
      const btns = document.querySelector("#signup").getBoundingClientRect();
      return { st: window.homeCountdown.state(), top: r.top, bottom: r.bottom, logo: logo.bottom, btns: btns.top, font: getComputedStyle(el.querySelector("strong")).fontFamily };
    });
    await wait(1100);
    const cd2 = await p.evaluate(() => window.homeCountdown.state());
    ok("home: countdown shows between the logo and the signup", !cd.st.hidden && cd.top >= cd.logo && cd.bottom <= cd.btns && /JetBrains Mono/.test(cd.font) && cd.st.target === "2026-11-02T12:00:00-05:00", cd);
    ok("home: countdown ticks", cd2.seconds !== cd.st.seconds || cd2.minutes !== cd.st.minutes, { cd: cd.st, cd2 });
    // ?now= previews another moment. Loading takes a few seconds, so allow for that.
    const secs = (st) => ((+st.days * 24 + +st.hours) * 60 + +st.minutes) * 60 + +st.seconds;
    for (const [at, want] of [["2026-11-01T12:00:00-05:00", 86400], ["2026-11-02T11:59:50-05:00", 10], ["2026-11-02T12:00:00-05:00", 0], ["2026-12-01T00:00:00-05:00", 0]]) {
      const q = await open(b, "/?now=" + encodeURIComponent(at), PHONE);
      const qs = await q.evaluate(() => ({ st: window.homeCountdown.state(), shown: document.querySelector("[data-home-countdown]").offsetHeight > 0, overflow: document.documentElement.scrollWidth - innerWidth }));
      const left = secs(qs.st);
      ok(`home: countdown at ${at} ${want ? "shows about " + want + "s left" : "is hidden"}`, want ? !qs.st.hidden && qs.shown && left <= want && left > want - 6 && qs.overflow <= 0 : qs.st.hidden && !qs.shown, qs);
      await q.close();
    }
    const z = await open(b, "/?now=" + encodeURIComponent("2026-11-02T11:59:57-05:00"), DESKTOP);
    await wait(3500);
    const zs = await z.evaluate(() => ({ st: window.homeCountdown.state(), shown: document.querySelector("[data-home-countdown]").offsetHeight > 0 }));
    ok("home: countdown hides itself when it reaches zero", zs.st.hidden && !zs.shown, zs);
    await z.close();
    const music = await open(b, "/music/", DESKTOP);
    const albumLinks = await music.$$eval(".upcoming-actions a", (as) => as.map((a) => [a.textContent.trim(), a.href, a.target]));
    await music.close();
    ok("music: Pre-save and Notify me go to Laylo", albumLinks.length === 2 && albumLinks.every((l) => l[1] === "https://laylo.com/dirtmonkey" && l[2] === "_blank"), albumLinks);
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
    const first = await p.evaluate(() => ({ msg: document.querySelector("[data-pong-msg]").textContent, help: document.querySelector(".help-keys").textContent }));
    ok("home: Pong is first to 3", first.msg === "First to 3" && /First to 3\./.test(first.help), first);
    // Keys move the left paddle.
    const before = (await st(p)).left;
    await p.keyboard.down("ArrowDown");
    await wait(300);
    await p.keyboard.up("ArrowDown");
    ok("home: arrow keys move the paddle", (await st(p)).left - before > 20, { before, after: (await st(p)).left });
    // Mouse follows: aim the paddle at Skwish (missing now and then) until a few points are in, then take the shot mid game.
    for (let i = 0; i < 400; i++) {
      const g = await st(p);
      if (g.score[0] + g.score[1] >= 2 && g.mode === "play" && g.ball.x > g.W * 0.3) break;
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
    await Promise.all([m.waitForNavigation({ timeout: 4000 }).catch(() => {}), m.tap('.home-links a[href="/shows/"]')]);
    ok("home: tapping a link goes there (phone)", new URL(m.url()).pathname === "/shows/", m.url());
    ok("home: no console errors (phone)", m.errors.length === 0, m.errors.length ? m.errors : undefined);
    await m.close();

    // Dub plates: nothing loads with the page; a win plays one random track once
    // through Web Audio; a loss plays nothing; the page has no audio element or .mp3.
    {
      const fx = [];
      const w = await open(b, "/", DESKTOP);
      w.on("request", (r) => { if (/\/assets\/pong\//.test(r.url())) fx.push(r.url().replace(BASE, "")); });
      const html = await (await fetch(BASE + "/")).text();
      const js = await (await fetch(BASE + "/js/pong.js")).text();
      ok("dub: no .mp3 or <audio> in the page", !/\.mp3/i.test(html) && !/<audio/i.test(html) && !/\.mp3/i.test(js) && !/createObjectURL|new Audio|mediaSession/.test(js) && (await w.$$("audio, video")).length === 0);
      await wait(800);
      ok("dub: nothing is fetched with the page", fx.length === 0, fx);
      // A loss: nothing plays.
      await w.click(".pong-start");
      await wait(200);
      await w.evaluate(() => window.skwishPong.finish(false));
      await wait(3000);
      const lose = (await st(w)).dub;
      ok("dub: a loss plays nothing", !lose.win && !lose.playing && !lose.connected && lose.sources === 0, lose);
      // A win: the track plays through the gain node.
      await w.click(".pong-start");
      await wait(200);
      ok("dub: a game fetches one dub plate", fx.length >= 1 && fx.every((u) => /^\/assets\/pong\/fx\d\.bin$/.test(u)), fx);
      await w.evaluate(() => window.skwishPong.finish(true));
      for (let i = 0; i < 60 && !(await st(w)).dub.playing; i++) await wait(250);
      const win = (await st(w)).dub;
      const ui = await w.evaluate(() => ({
        title: document.querySelector(".pong-win-title").textContent.trim(),
        credit: document.querySelector("[data-dub-credit]").textContent.trim(),
        font: getComputedStyle(document.querySelector("[data-dub-credit]")).fontFamily,
        audio: document.querySelectorAll("audio, video, a[href*='fx'], a[download]").length
      }));
      ok("dub: a win plays the track through the gain node", win.win && win.playing && win.connected && win.sources === 1 && win.length > 60, win);
      ok("dub: win headline and credit", ui.title === "You won. Now enjoy this top secret Dirt Monkey dub plate." && ui.credit === "Now playing: " + win.title + " - Dirt Monkey (unreleased)" && win.plates.includes(win.title) && /JetBrains Mono/.test(ui.font) && ui.audio === 0, { ui, title: win.title });
      ok("dub: the pool is the five tracks", JSON.stringify(win.plates) === JSON.stringify(["FREAK", "RAVE TIME", "FABRICATION FLIP", "AGE OF LOVE FLIP", "6 FT DEEP"]), win.plates);
      ok("dub: plays at full volume, with no volume knob", win.gain === 1 && (await w.$$("[data-dub-knob], .dub-knob")).length === 0 && !/dm-pong-volume/.test(await w.evaluate(() => Object.keys(localStorage).join(","))), win.gain);
      await wait(1500);
      await w.screenshot({ path: path.join(ART, "pong-win.png") });
      // Pause and resume pick up where it was.
      await w.click("[data-dub-play]");
      const paused = (await st(w)).dub;
      await wait(700);
      const still2 = (await st(w)).dub;
      await w.click("[data-dub-play]");
      await wait(500);
      const resumed = (await st(w)).dub;
      ok("dub: pause and resume", !paused.playing && Math.abs(still2.at - paused.at) < 0.05 && resumed.playing && resumed.at >= paused.at && resumed.at < paused.at + 1.5, { paused: paused.at, resumed: resumed.at });
      // At the end it stops: no loop and no new source.
      await w.evaluate(() => window.skwishPong.nearEnd(1));
      const before = (await st(w)).dub.sources;
      await wait(3000);
      const after = (await st(w)).dub;
      const again = await w.$eval("[data-dub-again]", (e) => !e.hidden && e.textContent.trim());
      const glow = await w.$eval(".pong-start", (e) => !e.hidden && e.textContent.trim() === "Play again" && e.classList.contains("is-glowing") && getComputedStyle(e).animationName !== "none");
      ok("dub: when it ends, nothing else starts", after.ended && !after.playing && !after.connected && after.sources === before, { before, after });
      ok("dub: after the end it says play again, with Play again glowing", again === "Play again to hear another one." && glow, again);
      // Esc stops it and a new game drops it.
      await w.click(".pong-start");
      await wait(200);
      await w.evaluate(() => window.skwishPong.finish(true));
      for (let i = 0; i < 60 && !(await st(w)).dub.playing; i++) await wait(250);
      const pre = (await st(w)).dub.playing;
      await w.keyboard.press("Escape");
      await wait(200);
      const esc = (await st(w)).dub;
      ok("dub: Esc stops the music", pre && !esc.playing && !esc.connected && !esc.win, esc);
      ok("dub: no console errors", w.errors.length === 0, w.errors.length ? w.errors : undefined);
      await w.close();
    }

    // Easier computer: a casual bot player should win most games (dev/pong-sim.js plays 60 quick games headless).
    {
      const sim = JSON.parse(require("child_process").execFileSync(process.execPath, [path.join(__dirname, "pong-sim.js"), "60", path.join(ROOT, "js", "pong.js"), "casual"]).toString());
      ok("pong: a casual player wins most games", sim.wins / sim.games >= 0.5 && sim.avgPoints[1] > 0.5, sim);
    }

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
    const hum = await r.$eval(".home-countdown-unit strong", (e) => getComputedStyle(e).animationName);
    ok("home: reduced motion stops the countdown glow pulse", hum === "none", hum);
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
