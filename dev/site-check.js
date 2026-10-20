// Site checks: every page loads on desktop and phone with no errors, no broken
// local links or files, no sideways scroll, JetBrains Mono, and no em dashes.
// Then the launch: only Merch and Shows linked, no visible link to a hidden page, /signup/ still works.
// Then the home page: no top links, the countdown, the Laylo signup, the one-click buttons, Monkey Pong (attract mode, a game, Esc, reduced motion), and the dub plate win player.
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
  .concat(["/404.html", "/tools/beatmap/", "/signup/", "/merch/", "/beta/"]);
// Live but not linked for now (Merch links open the Bass Threads store instead of /merch/). The launch pages must not show a link to any of them.
const HIDDEN = ["/merch/", "/plugins/", "/music/", "/app/", "/play/", "/signup/", "/tools/", "/beta/"];
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
    for (const url of PAGES.filter((u) => u !== "/404.html" && u !== "/privacy/" && u !== "/tools/beatmap/" && u !== "/beta/")) {
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
    ok("/signup/: still works, with the same Laylo embed", suEmbed.length === 1 && suEmbed[0] === "https://embed.laylo.com/?dropId=01b4e6e5-95f4-49a2-90f8-6c67811d9a8c&color=&minimal=&theme=dark&customTitle=&background=transparent&emailPlusSms=false", suEmbed);
    const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
    ok("/signup/ is not in the sitemap", !/\/signup\//.test(sitemap));
    const files = execList(ROOT);
    const dashFiles = files.filter((f) => fs.readFileSync(f, "utf8").includes("\u2014")).map((f) => path.relative(ROOT, f));
    ok("no em dashes in source files", dashFiles.length === 0, dashFiles.length ? dashFiles : undefined);
    // Kept off the site for now: the old mascot name (spelled in pieces so this file passes too),
    // any mention of an upcoming record, and the old release date. Checks every served file's text and every file name.
    const HUSH = new RegExp(["s", "k", "w", "i", "s", "h"].join(""), "i");
    // Only what gets pushed (and so served): files git tracks or has staged.
    const tracked = new Set(require("child_process").execFileSync("git", ["ls-files"], { cwd: ROOT }).toString().split("\n").filter(Boolean));
    const hushText = files.filter((f) => tracked.has(path.relative(ROOT, f))).filter((f) => {
      const t = fs.readFileSync(f, "utf8");
      const rec = ["a", "l", "b", "u", "m"].join("");
      const links = new RegExp("https://(music\\.apple\\.com/us|[a-z0-9-]+\\.bandcamp\\.com)/" + rec + "/", "gi");
      return HUSH.test(t) || new RegExp("no" + "v(ember)?\\.? 1" + "3", "i").test(t) || new RegExp(rec, "i").test(t.replace(links, ""));
    }).map((f) => path.relative(ROOT, f));
    ok("hidden name: no served file mentions it", hushText.length === 0, hushText.length ? hushText : undefined);
    const allNames = (function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => [".git", "node_modules", "tmp-audio", "uploads"].includes(e.name) ? [] : e.isDirectory() ? walk(path.join(dir, e.name)) : [path.relative(ROOT, path.join(dir, e.name))]); })(ROOT);
    const hushNames = allNames.filter((n) => tracked.has(n) && HUSH.test(n));
    // Beta tester page: exists, noindex, out of the sitemap, and no other file links to it.
    {
      const betaHtml = fs.existsSync(path.join(ROOT, "beta", "index.html")) ? fs.readFileSync(path.join(ROOT, "beta", "index.html"), "utf8") : "";
      ok("/beta/: exists and is noindex", /<meta name="robots" content="noindex">/.test(betaHtml), betaHtml.length);
      ok("/beta/: not in the sitemap", !/\/beta\//.test(sitemap));
      const linkers = files.filter((f) => tracked.has(path.relative(ROOT, f)) && !path.relative(ROOT, f).startsWith("beta/") && !path.relative(ROOT, f).startsWith("dev/") && path.relative(ROOT, f) !== "js/beta.js").filter((f) => /["'(=]\/beta\/?["')#?]|dirtmonkey\.music\/beta/.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(ROOT, f));
      ok("/beta/: nothing links to it", linkers.length === 0, linkers.length ? linkers : undefined);
      // Locked: the served page and its script carry none of the beta content, and the blob is not plain text.
      const betaJs = fs.readFileSync(path.join(ROOT, "js", "beta.js"), "utf8");
      const blob = fs.readFileSync(path.join(ROOT, "assets", "beta", "content.enc"));
      const leaks = [betaHtml, betaJs, blob.toString("latin1")].filter((t) => /Download coming soon|FILL-IN|data-beta-download|What to tell us|Welcome to the beta|dropbox\.com|Wonk Factory|Frequalizer/i.test(t)).length;
      ok("/beta/: locked page shows no beta content, footer is Privacy only", leaks === 0 && /enter your invite code/.test(betaHtml) && /<footer[\s\S]*<a href="\/privacy\/">Privacy<\/a>[\s\S]*<\/footer>/.test(betaHtml) && (betaHtml.split("<footer")[1].match(/<a /g) || []).length === 1, leaks);
      const keys = JSON.parse(fs.readFileSync(path.join(ROOT, "beta", "keys.json"), "utf8"));
      ok("/beta/: keys.json holds no names or codes", keys.iterations >= 200000 && Object.keys(keys.keys).length > 0 && !/MONKEY-|"name"|Test/.test(JSON.stringify(keys)), Object.keys(keys.keys).length);
    }
    // App Store pages: one contact email, and the progress tip says what lives where.
    const contact = ["support/index.html", "support.html", "privacy/index.html"].map((f) => [f, fs.readFileSync(path.join(ROOT, f), "utf8")]);
    ok("support and privacy: one contact email", contact.every(([f, t]) => t.includes("dirtmonkey@mail.grokbot.com") && !/gmail\.com/i.test(t)) && contact.filter(([f]) => f.startsWith("support")).every(([f, t]) => (t.match(/mailto:([^"]+)"/g) || []).every((m) => m === 'mailto:dirtmonkey@mail.grokbot.com"') && /saved on your phone/.test(t) && /stored in iCloud/.test(t)), contact.map(([f]) => f));
    const formats = [...fs.readFileSync(path.join(ROOT, "js", "products.js"), "utf8").matchAll(/name: "([^"]+)"[\s\S]*?formats: "([^"]+)"/g)].map((m) => [m[1], m[2]]);
    ok("products: only Meter lists Standalone, The End is VST3 and AU", formats.filter(([n, f]) => /Standalone/.test(f)).map(([n]) => n).join() === "Meter" && formats.some(([n, f]) => n === "The End" && f === "VST3, AU, Mac, Windows coming"), formats.filter(([n, f]) => /Standalone/.test(f) || n === "The End"));
    ok("hidden name: no served file name has it", hushNames.length === 0 && allNames.includes("assets/monkey-cyan.png"), hushNames.length ? hushNames : undefined);
  }

  if (only === "all" || only === "home") {
    const st = (p) => p.evaluate(() => window.monkeyPong.state());
    // Desktop: the paddles play on their own, every section has a link, and clicking the monkey starts Pong.
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
    ok("home: signup is the minimal Laylo embed, clipped, with the required line", JSON.stringify(su2.src) === JSON.stringify(["https://embed.laylo.com/?dropId=01b4e6e5-95f4-49a2-90f8-6c67811d9a8c&color=3dfff2&minimal=true&theme=dark&customTitle=&background=transparent&emailPlusSms=false"]) && su2.clip === "hidden" && su2.legal === "By submitting my information, I agree to receive recurring automated messages to the contact information provided and to Laylo's Terms of Service, Cookie Policy and Privacy Policy. Msg & data rates may apply. Reply STOP to cancel." && su2.extra === 0 && /JetBrains Mono/.test(su2.font), su2);
    // The Drop frame only shows its form once Laylo's SDK hands it the Drop (js/laylo-drop.js).
    let dropForm = {};
    for (let i = 0; i < 40 && !dropForm.input; i++) {
      const fr = p.frames().find((f) => /embed\.laylo\.com\/\?dropId=01b4e6e5-95f4-49a2-90f8-6c67811d9a8c/.test(f.url()));
      dropForm = fr ? await fr.evaluate(() => ({ input: !!document.querySelector("input"), buttons: [...document.querySelectorAll("button")].map((x) => x.textContent.trim()).filter(Boolean).slice(0, 4) })).catch(() => ({})) : {};
      if (!dropForm.input) await wait(250);
    }
    const sdk = await p.evaluate(() => !!document.querySelector("script#laylo-sdk[src=\"https://embed.laylo.com/laylo-sdk.js\"]"));
    ok("home: the signup is the Dirt Monkey Website Drop, and its form shows", dropForm.input && sdk, { ...dropForm, sdk });
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
    const musicCard = await music.evaluate(() => ({ card: document.querySelectorAll(".upcoming").length, title: document.title, h1: document.querySelector("h1").textContent.trim() }));
    await music.close();
    ok("music: no upcoming release card, neutral title", musicCard.card === 0 && musicCard.title === "Dirt Monkey Music" && musicCard.h1 === "Dirt Monkey Music", musicCard);
    const a1 = await st(p);
    await wait(400);
    const a2 = await st(p);
    ok("home: attract mode moves the monkey", a1.mode === "attract" && a2.running && Math.abs(a2.ball.x - a1.ball.x) > 20, { a1, a2 });
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
    ok("home: clicking the monkey starts Pong", (await st(p)).mode !== "attract");
    const first = await p.evaluate(() => ({ msg: document.querySelector("[data-pong-msg]").textContent, help: document.querySelector(".help-keys").textContent }));
    ok("home: Pong is first to 3", first.msg === "First to 3" && /First to 3\./.test(first.help), first);
    // Keys move the left paddle.
    const before = (await st(p)).left;
    await p.keyboard.down("ArrowDown");
    await wait(300);
    await p.keyboard.up("ArrowDown");
    ok("home: arrow keys move the paddle", (await st(p)).left - before > 20, { before, after: (await st(p)).left });
    // Mouse follows: aim the paddle at the monkey (missing now and then) until a few points are in, then take the shot mid game.
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

    // Phone: tap the monkey to play, drag to move, and the links still work.
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
    ok("home: tapping the monkey starts Pong (phone)", (await st(m)).mode !== "attract");
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
      await w.evaluate(() => window.monkeyPong.finish(false));
      await wait(3000);
      const lose = (await st(w)).dub;
      ok("dub: a loss plays nothing", !lose.win && !lose.playing && !lose.connected && lose.sources === 0, lose);
      // A win: the track plays through the gain node.
      await w.click(".pong-start");
      await wait(200);
      ok("dub: a game fetches one dub plate", fx.length >= 1 && fx.every((u) => /^\/assets\/pong\/fx\d\.bin$/.test(u)), fx);
      await w.evaluate(() => window.monkeyPong.finish(true));
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
      await w.evaluate(() => window.monkeyPong.nearEnd(1));
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
      await w.evaluate(() => window.monkeyPong.finish(true));
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

    // Reduced motion: the monkey stays still until someone asks for a game.
    const r = await b.newPage();
    await r.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await r.setViewport(DESKTOP);
    await r.goto(BASE + "/", { waitUntil: "networkidle0" });
    await wait(500);
    const r1 = await st(r);
    await wait(400);
    const r2 = await st(r);
    ok("home: reduced motion keeps the monkey still", !r2.running && r1.ball.x === r2.ball.x && Math.abs(r2.ball.x - r2.W / 2) < 1, { r1, r2 });
    const hum = await r.$eval(".home-countdown-unit strong", (e) => getComputedStyle(e).animationName);
    ok("home: reduced motion stops the countdown glow pulse", hum === "none", hum);
    await r.click(".pong-start");
    await wait(1500);
    ok("home: reduced motion can still play on request", (await st(r)).running);
    await r.keyboard.press("Escape");
    await wait(100);
    ok("home: reduced motion goes still again after Esc", !(await st(r)).running);

    // The monkey always shows: even when his art fails to load the first time (a flaky
    // phone connection), Pong retries it and draws him on the court.
    for (const vp of [PHONE, DESKTOP]) {
      const f = await b.newPage();
      await f.setViewport(vp);
      await f.setRequestInterception(true);
      let tries = 0;
      f.on("request", (q) => (/\/assets\/monkey-cyan\./.test(q.url()) && tries++ === 0 ? q.abort() : q.continue()));
      await f.goto(BASE + "/", { waitUntil: "load" });
      await f.$eval(".pong", (e) => e.scrollIntoView({ block: "center" }));
      await wait(2500);
      const seen = await f.evaluate(() => {
        const s = window.monkeyPong.state();
        const c = document.querySelector(".pong-canvas");
        const k = c.width / s.W, R = Math.round(Math.min(s.W, s.H) * 0.1 * k);
        const d = c.getContext("2d").getImageData(Math.max(0, Math.round(s.ball.x * k) - R), Math.max(0, Math.round(s.ball.y * k) - R), 2 * R, 2 * R).data;
        let n = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 200) n++;
        return { head: s.head, running: s.running, live: document.querySelector(".pong").classList.contains("is-live"), solid: n };
      });
      ok("home: the monkey shows after a failed first load (" + (vp.isMobile ? "phone" : "desktop") + ")", tries >= 2 && seen.head === "sprite" && seen.running && seen.live && seen.solid > 100, { tries, ...seen });
      await f.close();
    }
    await r.close();
  }

  // Beta: a wrong code is turned away, the Test code (from the local, gitignored code list) unlocks the
  // nine plugin cards, and the next visit gets straight in.
  if (only === "all" || only === "beta") {
    const localCodes = path.join(__dirname, "beta-codes.local.json");
    const test = fs.existsSync(localCodes) ? (JSON.parse(fs.readFileSync(localCodes, "utf8")).testers || []).find((t) => t.name === "Test") : null;
    const bp = await open(b, "/beta/", PHONE);
    await bp.type("[data-beta-code]", "MONKEY-WRONG1");
    await bp.click("[data-beta-unlock]");
    await bp.waitForFunction(() => !document.querySelector("[data-beta-error]").hidden, { timeout: 15000 }).catch(() => {});
    const wrong = await bp.evaluate(() => ({ err: document.querySelector("[data-beta-error]").hidden ? "" : document.querySelector("[data-beta-error]").textContent, shown: !document.querySelector("[data-beta-content]").hidden }));
    ok("/beta/: a wrong code is turned away", wrong.err === "That code didn't work. Check it and try again." && !wrong.shown, wrong);
    if (!test) ok("/beta/: Test code unlocks (needs dev/beta-codes.local.json)", false);
    else {
      await bp.$eval("[data-beta-code]", (e) => { e.value = ""; });
      await bp.type("[data-beta-code]", test.code.toLowerCase());
      await bp.click("[data-beta-unlock]");
      await bp.waitForFunction(() => !document.querySelector("[data-beta-content]").hidden, { timeout: 20000 }).catch(() => {});
      const got = await bp.evaluate(() => ({ shown: !document.querySelector("[data-beta-content]").hidden, locked: !document.querySelector("[data-beta-lock]").hidden, cards: [...document.querySelectorAll("[data-beta-download]")].map((a) => a.dataset.betaDownload), text: document.querySelector("[data-beta-content]").innerText, mail: [...document.querySelectorAll("[data-beta-content] a[href^=mailto]")].map((a) => a.href) }));
      ok("/beta/: Test code unlocks the content", got.shown && !got.locked && got.cards.join() === "Punch,Updown,Wonk Factory,Spaces,Dip,Meter,Frequalizer,Fizz,Slammer" && !/The End/.test(got.text) && /What to tell us/.test(got.text) && got.mail.every((m) => m === "mailto:dirtmonkey@mail.grokbot.com") && !got.text.includes("\u2014"), { cards: got.cards, mail: got.mail });
      await bp.goto(BASE + "/beta/", { waitUntil: "networkidle0" });
      await bp.waitForFunction(() => !document.querySelector("[data-beta-content]").hidden, { timeout: 20000 }).catch(() => {});
      ok("/beta/: a returning tester gets straight in", await bp.evaluate(() => !document.querySelector("[data-beta-content]").hidden));
    }
    await bp.close();
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
