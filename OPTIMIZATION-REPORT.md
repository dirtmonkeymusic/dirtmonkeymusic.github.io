# Dirt Monkey site: optimization report

Audit date: October 13, 2026. This is a review only. No site code was changed.

## Plain-English summary

The site is in good shape. It loads quickly, works on phones, and passes Google's automated accessibility, best-practice, and search checks with perfect scores. The things worth doing fall into five groups:

1. **Finish the placeholders before launch.** Draft FAQ labels, the refund policy, demo files that are text files, Buy links that go nowhere, "Placeholder" tags on the email forms, and the $XX sample packs make the site look unfinished. This matters more than anything else on the list.
2. **Make the pictures lighter.** The plugin screenshots are about four times bigger than they need to be for the size they appear on screen. Smaller copies in a modern format (WebP) would cut the page from about 2.3 MB to under 1 MB. The artwork itself stays the same; only the file size changes.
3. **Make the Founders deal and The Everything Suite read clearly together.** From November 18 to 30, the $79 Founders Suite gives more than the $119 Everything Suite, and both show at once. Buyers could pay more for less. The countdown also needs one message for "email list only" days and another for "open to everyone" days. Hide the "0 founders so far" counter until the number is worth showing.
4. **Make sharing and search work.** The page title is just "Dirt Monkey". Links shared on Instagram, Discord, or iMessage won't show a proper preview picture yet.
5. **Make phone taps easier.** The menu links at the top are small to tap on a phone, and the menu takes up a lot of the screen.

The rest is polish: trust details (system requirements, license terms, support email, audio demos), a few wording fixes on the cards, and code tidying to make it easier to add Fizz and Delay later.

## Scores (Lighthouse 12.8.2)

| | Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- | --- |
| Mobile | 94 | 100 | 100 | 100 |
| Desktop | 100 | 100 | 100 | 100 |

| Metric | Mobile | Desktop |
| --- | --- | --- |
| First Contentful Paint | 2.3 s | 0.7 s |
| Largest Contentful Paint | 2.7 s (the Skwish monkey image) | 0.7 s (the logo) |
| Total Blocking Time | 0 ms | 0 ms |
| Cumulative Layout Shift | 0 | 0 |
| Speed Index | 2.3 s | 0.7 s |
| Page weight | 2,311 KiB | 2,311 KiB |

How this was measured: Lighthouse ran against the local preview server (`python3 -m http.server`) in headless Chrome. Mobile used Lighthouse's default phone emulation with slow 4G and CPU throttling. Desktop used the desktop preset. The local server does not compress files or send cache headers, so Lighthouse's "enable text compression" and "cache policy" warnings come from the test server. GitHub Pages compresses text files and sends a 10-minute cache header on its own.

The perfect accessibility and SEO scores cover automated checks only. They don't check share previews, structured data, tap-target size in the menu, or whether the copy is finished. Those are covered below.

Report files: `lighthouse-mobile.png` (summary screenshot), `lighthouse-mobile-report.html`, `lighthouse-desktop-report.html`.

## Top priorities in order

| # | Item | Impact | Section |
| --- | --- | --- | --- |
| 1 | Remove or finish every visible placeholder before publishing | High | 5.1 |
| 2 | Resize plugin screenshots and serve WebP with `srcset` and lazy loading | High | 1.1, 1.2 |
| 3 | Settle how the Founders Suite and The Everything Suite are shown together from Nov 18 to 30 | High | 5.2 |
| 4 | Give the countdown one message per phase and hide the zero founders count | High | 5.3, 5.4 |
| 5 | Make the Kit forms respond when someone signs up, and add the consent line from the email spec | High | 4.1, 5.7 |
| 6 | Fix the page title, meta description, and share preview (Open Graph and Twitter card) | High | 3.1 to 3.3 |
| 7 | Make phone menu links at least 44 px tall and shrink the sticky header on phones | High | 2.1, 2.2 |
| 8 | Add trust signals: system requirements line, license terms, support email, privacy note, audio demos | High | 5.9 |
| 9 | Self-host JetBrains Mono, speed up the hero image, resize the logo | Medium | 1.3, 1.4 |
| 10 | Add Product/Offer structured data, put the brand in the h1, add canonical, sitemap, and robots | Medium | 3.4 to 3.7 |
| 11 | Move card accent colors into `products.js` and remove dead code | Medium | 6.2, 6.3 |

---

## 1. Performance

### 1.1 Plugin screenshots are much larger than they display

- **Issue:** The page loads about 2.2 MB of PNG images. Cards show screenshots at about 310 to 360 CSS pixels wide, but most files are 1,640 to 1,920 pixels wide (Spaces is 392 KB, Frequalizer 335 KB, Dip 227 KB, Punch 222 KB). Lighthouse estimates 1.6 MB of waste on mobile and 2.0 MB on desktop. The `srcset` in `site.js` lists only one size, so the browser can't pick a smaller one.
- **Fix:** For each screenshot, make two resized copies: about 720 px wide (enough for 2x screens) and about 1,080 px wide (3x phones). Save them as WebP and keep the PNG as a fallback in `<picture>`, or list the sizes in `srcset`. This is a resize and re-encode only. The artwork is not redrawn or cropped. Measured on these files at 720 px wide: high-quality WebP (quality 85) totals about 320 KB for everything the page loads, down from about 2.2 MB. Lossless WebP totals about 930 KB if pixel-exact output matters more than size. Check small UI text (knob labels) side by side before switching to lossy. AVIF works too and is a little smaller, but WebP already captures most of the gain.
- **Impact:** High (mobile data and load time).

### 1.2 No lazy loading on cards or thumbnails

- **Issue:** None of the 9 card images or the 12 Everything Suite and Founders thumbnails has `loading="lazy"` or `decoding="async"`. On a phone, every screenshot starts downloading on page load, even though only the hero is visible.
- **Fix:** Add `loading="lazy" decoding="async"` to every card and thumbnail image except the hero logo and monkey. Wonk Factory can load normally because it is the first card. Give thumbnails `sizes="150px"` once smaller copies exist, so they use the small file.
- **Impact:** High on mobile, low on desktop.

### 1.3 Hero image and logo

- **Issue:** The largest element on the first phone screen is the Skwish monkey (`skwish-cyan.png`, 512 × 512, 215 KB). It is preloaded but lacks `fetchpriority="high"`, which Lighthouse flags. The logo PNG is 2,801 px wide (110 KB) but appears at most 680 px wide. The same file is also the CSS mask for the glow layers.
- **Fix:** Add `fetchpriority="high"` to the monkey image. Losslessly re-saving the monkey PNG takes it from 215 KB to about 136 KB with identical pixels; WebP takes it to about 60 to 85 KB. Export the logo at 1,360 px wide (2x of 680): about 57 KB as PNG or 32 KB as WebP with transparency. Point both the `<img>` and the CSS `mask-image` at the new file so the neon look stays the same.
- **Impact:** Medium (mobile LCP is 2.7 s; target is under 2.5 s).

### 1.4 JetBrains Mono font loading

- **Issue:** The Google Fonts stylesheet blocks rendering, costing about 0.8 s on throttled mobile because the browser opens two extra connections (fonts.googleapis.com, then fonts.gstatic.com). The font itself is fine: one variable WOFF2 file, about 32 KB, with `display=swap` already set.
- **Fix:** Self-host the JetBrains Mono variable WOFF2 (Latin subset) in `assets/fonts/`. Declare it with `@font-face` and `font-display: swap`, and add `<link rel="preload" as="font" type="font/woff2" crossorigin>`. One file covers weights 400, 500, 700, and 800. Remove the Google Fonts links. JetBrains Mono stays the only font. Layout shift is already 0, so no fallback tuning is needed.
- **Impact:** Medium (mobile FCP is 2.3 s; this is the biggest single blocking request).

### 1.5 CSS and JavaScript weight

- **Issue:** `styles.css` is 22 KB, `site.js` 30 KB, and `products.js` 17 KB, all unminified. Lighthouse estimates 19 KB of savings from minifying.
- **Fix:** No build step needed. GitHub Pages compresses these files to about 15 KB total. Removing dead code (6.2) helps more than minifying.
- **Impact:** Low.

### 1.6 Glow, blur, and animation cost on phones

- **Issue:** Lighthouse measured 0 ms of blocking time and flagged no animation problems. Low-end phones are the risk:
  - The sticky header uses `backdrop-filter: blur(16px)`, which repaints the area behind it on every scroll frame.
  - The hero monkey floats forever (`floaty`) over a `blur(18px)` glow and a `drop-shadow`.
  - The logo appears three times (header, hero, footer), each with masked layers and stacked `drop-shadow` filters.
- **Fix:** All three keep the current look:
  - At 720 px wide or less, give the header a near-solid background (for example `rgba(7, 6, 10, 0.94)`) without `backdrop-filter`. It looks the same on the dark page.
  - Add `will-change: transform` to `.skwish-stage`. Pause the float animation when the hero scrolls out of view (IntersectionObserver).
  - Leave the logo glow alone; it is static and paints once.

  Reduced motion already turns off the float animation. Test once on a real older Android phone.
- **Impact:** Medium on low-end phones, low elsewhere.

### 1.7 Third-party and caching notes

- **Issue:** Lemon Squeezy's `lemon.js` loads on every visit, but it is small (about 2 KB) and deferred. GitHub Pages sets a fixed 10-minute cache.
- **Fix:** Nothing required. After replacing a file under the same name, visitors may see the old version for up to 10 minutes.
- **Impact:** Low.

---

## 2. Mobile layout and touch targets

Checked at 390 × 844 (iPhone 14 size): no horizontal scrolling, cards fill the width with even margins, and form inputs and buttons are 48 px tall. The email field uses a 16 px font, so iPhones won't zoom in when it's tapped.

### 2.1 Menu links are too small to tap

- **Issue:** On a phone, each top menu link (Plugins, Suite, Founders, Sample Packs, Demos, FAQ) is only 15 px tall, with some as narrow as 20 px. The common minimum is 44 × 44 px (Apple) and 24 × 24 px (WCAG 2.2). Lighthouse passed them only because of the spacing between links.
- **Fix:** Give `nav a` vertical padding so each link is at least 44 px tall, for example `display: inline-flex; align-items: center; min-height: 44px; padding: 0 6px`. The text size and look stay the same.
- **Impact:** High.

### 2.2 Sticky header takes 96 px on phones

- **Issue:** On phones, the header stacks the logo over two rows of menu links and stays pinned while scrolling. It covers about 11% of an 844 px screen the whole time.
- **Fix:** At 720 px wide or less, either let the header scroll away (not sticky) or keep it to one row: the logo plus a horizontally scrollable menu. Then update `scroll-padding-top` to match.
- **Impact:** Medium.

### 2.3 The phone page is very long

- **Issue:** The full page is about 15,900 px tall on a phone. Plugins take 6,850 px, the six placeholder sample packs take 3,800 px, and the Founders section repeats the same six thumbnails The Everything Suite already shows.
- **Fix:**
  - Hide the sample packs until they're real, or collapse them to a single "Sample packs coming soon" line.
  - On phones, replace the Founders thumbnail strip with one line: "Everything in The Everything Suite, plus every future plugin."
  - Optionally add a small jump row under the Plugins heading: Paid, Free, Suite, Founders.

  Card style stays uniform.
- **Impact:** Medium.

---

## 3. SEO and sharing

### 3.1 Page title

- **Issue:** The title is just "Dirt Monkey". That gives search results and browser tabs nothing to match on, such as "plugins", "synth", or "free".
- **Fix:** For example: `Dirt Monkey: Audio Plugins & Sample Packs (Wonk Factory, The End, free Meter)`. Keep it around 60 characters.
- **Impact:** High.

### 3.2 Meta description is out of date

- **Issue:** It names only Punch, Updown, and Wonk Factory, and doesn't mention the free plugins.
- **Fix:** For example: "Mac VST3 and AU plugins by Dirt Monkey: Wonk Factory, the flagship monophonic synth, plus The End, Punch, Spaces, and more. Get Dip, Meter, and Frequalizer free."
- **Impact:** Medium.

### 3.3 Share previews (Open Graph and Twitter)

- **Issue:** `og:image` is a relative path (`assets/skwish-cyan.png`). Instagram, Discord, iMessage, Slack, and X need a full `https://` address, so shared links show no picture or a broken one. The image is also a 512 px square, and there's no `og:url`, `og:site_name`, image width and height, or `twitter:card`.
- **Fix:**
  - Make a 1200 × 630 share image from the existing logo and Skwish art on the dark background, without redrawing them.
  - Once the web address is final, use absolute URLs.
  - Add `og:url`, `og:site_name`, `og:image:width`, `og:image:height`, `og:image:alt`, `twitter:card` set to `summary_large_image`, `twitter:title`, `twitter:description`, and `twitter:image`.
- **Impact:** High (much discovery will come from shared links).

### 3.4 Structured data (Product and Offer)

- **Issue:** There is no structured data, so search engines read prices and products only from text that JavaScript builds.
- **Fix:** Add a JSON-LD `Organization` block with name, logo, and `sameAs` links to Instagram, YouTube, Bandcamp, and SoundCloud. Add one `Product` (or `SoftwareApplication` with `operatingSystem: "macOS"`) per plugin, each with an `Offer`: price, `priceCurrency: "USD"`, availability, and `price: "0"` for the free ones. To keep it from drifting, `site.js` could generate it from `products.js`; Google reads JSON-LD that JavaScript adds. Star ratings in search results require real reviews, so don't expect them.
- **Impact:** Medium.

### 3.5 The h1 doesn't contain the brand as text

- **Issue:** The main heading is "Plugins & Sample Packs". "Dirt Monkey" appears only as the logo image's alt text, outside the heading.
- **Fix:** Put a visually hidden "Dirt Monkey" inside the `h1`, or wrap the whole lockup in the `h1`. Nothing changes on screen.
- **Impact:** Medium.

### 3.6 Canonical URL, sitemap, robots, and 404 page

- **Issue:** There's no `<link rel="canonical">`, `sitemap.xml`, `robots.txt`, or `404.html`. Once a custom domain is added, the same page lives at two addresses (github.io and the domain).
- **Fix:** After the domain is chosen, add the canonical tag. Add a one-line `robots.txt` that points to `sitemap.xml`, and a small sitemap. Add a `404.html` in the same style that links back home. GitHub Pages uses it automatically.
- **Impact:** Medium for canonical, low for the rest.

### 3.7 Content only exists after JavaScript runs

- **Issue:** Every card, price, suite, and Founders block is built by JavaScript. Google runs JavaScript, but some other crawlers, link previewers, and AI search tools may not, and anyone with JavaScript off sees only the hero and an error line.
- **Fix:** Keep the no-build setup but add a short static fallback inside `<noscript>`: plugin names, prices, and one line each. Later, the planned product pages (for example `plugins/meter.html`) can be plain HTML.
- **Impact:** Medium to low.

### 3.8 Alt text and icons

- **Issue:** Card images use generic alt text such as "Wonk Factory plugin". The favicon is the full 215 KB monkey PNG, and there's no Apple touch icon.
- **Fix:**
  - Use descriptive alt text, for example "Wonk Factory interface: two wavetable oscillators and Filter 1" and "Meter interface: waveform, spectrum, and loudness meters".
  - Leave the suite thumbnails at `alt=""`, since the plugin name is printed under each one.
  - Add a 32 × 32 favicon and a 180 × 180 `apple-touch-icon` cut from the existing monkey.
- **Impact:** Low.

### 3.9 Future product pages

- **Issue:** Searches like "free LUFS meter plugin Mac" or "free 8-band EQ plugin" need a page about that plugin. One long page competes poorly.
- **Fix:** When the planned plugin pages (Meter, Dip, Frequalizer) are built, give each its own title, description, share image, and structured data.
- **Impact:** Medium, later.

---

## 4. Accessibility

### 4.1 Kit signup placeholders give no response

- **Issue:** Pressing "Get it free" or "Get early access" does nothing visible, by design for now. A real visitor, or a screen-reader user, gets no feedback and may think the site is broken. The forms also set `novalidate`, so a mistyped email gets no error.
- **Fix:** Until Kit is connected, show a short message in an `aria-live="polite"` area, such as "Signups open soon." Once Kit is live, use Kit's success message from the spec: "Almost there! Check your inbox (and spam) to confirm. Your download link is in that email." Add a simple email check with error text linked through `aria-describedby`.
- **Impact:** High (accessibility and conversion).

### 4.2 Form labels

- **Issue:** Each email field has a real, visually hidden `<label>` reading "Email", so it is accessible. With four forms on the page, though, a screen-reader forms list shows four identical "Email" fields.
- **Fix:** Use specific hidden labels, such as "Email for the free Dip download" and "Email for Founders early access".
- **Impact:** Low.

### 4.3 Button names don't match their visible words

- **Issue:** Lighthouse flagged this, though the check carries no score weight. The visible "Download Demo" buttons are named "Download Wonk Factory demo" (and so on) for assistive tech, and "Buy the suite" is named "Buy The Everything Suite". Voice-control users who say "click Download Demo" may not hit the button. The "Buy" card buttons pass because their names start with "Buy".
- **Fix:** Start each name with the visible words, for example `aria-label="Download Demo: Wonk Factory"` and `aria-label="Buy the suite: The Everything Suite"`.
- **Impact:** Medium.

### 4.4 Contrast with the neon palette

- **Issue:** Measured ratios all pass WCAG AA (4.5:1 for body text):

  | Text | Background | Ratio |
  | --- | --- | --- |
  | Grey body text | Page and card | 5.5 to 5.7 |
  | Dark text on magenta Buy buttons | Magenta | 6.1 |
  | Cyan | Page | 16.2 |
  | "Windows coming" chip | Card | 16.1 |
  | Email placeholder text | Field | 5.7 |

  Lighthouse can't measure the gradient price text because its color is transparent. Its lightest-contrast end (yellow `#ffe56a`) is 15.4:1, so it passes.
- **Fix:** Nothing required. When adding colors later, keep neon text on the dark background only, and never put white text on cyan or mint fills.
- **Impact:** Low.

### 4.5 Focus states

- **Issue:** It passes: every link, button, field, and FAQ question gets a 2 px cyan outline with a 3 px gap when reached by keyboard (16:1 against the background). The card hover lift has no keyboard equivalent.
- **Fix:** Optionally mirror the hover glow with `.plugin-card:focus-within`.
- **Impact:** Low.

### 4.6 Reduced motion

- **Issue:** It passes: with "reduce motion" on, the float animation, transitions, and smooth scrolling are off. The countdown still ticks every second; that's text, not motion, so it's fine.
- **Fix:** Optionally add `role="timer"` to the countdown. It stays quiet by default, so screen readers won't announce every second.
- **Impact:** Low.

### 4.7 Heading structure

- **Issue:** "Free plugins" is an `h3`, the same level as the plugin names around it, and the paid cards have no group heading. Screen-reader users who jump by heading can't tell the groups apart.
- **Fix:** Add a visually hidden `h3` "Paid plugins" and keep `h3` "Free plugins". Make plugin names `h4`; they're styled by class, so the look doesn't change. Other sections (Suite, Founders, Packs, Demos, FAQ) are structured correctly.
- **Impact:** Low.

---

## 5. Conversion and design polish

### 5.1 Placeholders that would hurt trust if published

- **Issue:** Visitors would currently see:
  - "Edit this answer" labels and "These answers are drafts" in the FAQ
  - A refund policy that says "Write your real refund rule here"
  - Download Demo buttons that download small `.txt` placeholder files
  - Buy links to `YOURSTORE.lemonsqueezy.com`
  - "PLACEHOLDER" tags on all four email forms
  - Six sample packs at `$XX` with stand-in covers
  - Placeholder copy in "How demos work"
- **Fix:** Finish or hide each before publishing. Hide the sample-pack section until real packs exist; the hero can still say "Plugins & Sample Packs". In "How demos work", state the real demo limitation (for example "Goes silent for a moment every 60 seconds").
- **Impact:** High.

### 5.2 Founders Suite and The Everything Suite conflict from Nov 18 to 30

- **Issue:** During the Founders window, the $79 Founders Suite includes all paid plugins plus every future plugin. The $119 Everything Suite's Buy button is still live right above it. Someone could pay $40 more for less, then ask for a refund.
- **Fix:**
  - **During the window:** either put Founders above The Everything Suite, or replace the suite's Buy with "During Founders week, get the Founders Suite instead."
  - **After 11:59 PM CT on Nov 30:** hide the Founders section automatically (the page already knows the end time) and bring the suite back to normal.
- **Impact:** High.

### 5.3 Countdown phases need their own messages

- **Issue:** The countdown has two states: "Early access opens in" until Nov 18, then "Closes in" until Nov 30. From Nov 18 to 20 the deal is for the email list only, but public visitors will read "Closes in" with no way to buy. Two timing details:
  - **Opening time:** the countdown reaches zero at midnight CT on Nov 18 (1:00 AM ET). The Nov 18 broadcast should go out at that moment, or the opening hour in `products.js` should match the planned send time.
  - **Time zone mismatch:** the email spec says the deal ends "11:59 PM ET", but the site uses 11:59 PM CT, as requested. CT is one hour later. Use the same time zone in the Kit emails and on the site.
- **Fix:** Four states, driven by the dates already in `products.js`:
  1. **Before Nov 18:** "Early access opens in…" plus the waitlist form.
  2. **Nov 18 to 20:** "Email list early access is live. Join the list to get the link." Show a countdown to the Nov 20 public open.
  3. **Nov 20 to 30:** "Closes in…" plus the Founders checkout button, when it exists.
  4. **After the close:** hide the section.
- **Impact:** High.

### 5.4 "0 founders so far" works against you

- **Issue:** A zero counter tells visitors nobody has joined.
- **Fix:** Add a config threshold, for example show the count only once it reaches 25. Below that, hide the line. Never show a made-up number.
- **Impact:** High.

### 5.5 Hero clarity

- **Issue:** The hero is strong visually and should stay. It doesn't tell a new visitor there are free plugins or that a one-time Founders deal is coming, and "Browse everything" is the only call to action.
- **Fix:** Keep the logo lockup and monkey as they are. Under the button, add one small line or a second outline button, such as "Get 3 free plugins" (jumping to the Free row). Before Nov 30, also add a small date pill, such as "Founders Suite · Nov 18".
- **Impact:** Medium.

### 5.6 Card hierarchy and copy

- **Issue:**
  - **Description lengths vary.** Updown's is one short sentence, while Punch's runs four sentences and ends with a knob list. Uneven text makes the rows uneven.
  - **"A VST" on Updown.** The card says "A VST for sweeps, risers, and downfalls", but it also ships as AU.
  - **Soft flagship picture.** The Wonk Factory card is the flagship but has the lowest-resolution picture: a 583 px crop from a 1,124 px window, slightly soft on Retina screens.
- **Fix:**
  - Trim Punch to two sentences and move the knob list to its `features` list in `products.js`.
  - Change Updown to "A plugin for sweeps, risers, and downfalls."
  - Keep Wonk Factory's description as the flagship monophonic synth. It could be trimmed to two sentences without losing "flagship" or "monophonic".
  - Ask the plugin team for a 2x export of the new Wonk Factory window (about 2,248 × 1,640) and crop the same top-left area. The art stays the same; only the resolution goes up.
- **Impact:** Medium.

### 5.7 Free plugins row

- **Issue:** The separate row works well. Each card repeats the same note, and the consent line from the email spec is missing: "You'll get the download plus occasional news on DMS plugins, including Founders early access. Unsubscribe anytime." That line sets expectations, and email law and good practice expect it.
- **Fix:** Add one line under the "Free plugins" heading: "Enter your email and the download link arrives in your inbox." Put the spec's consent line under each "Get it free" button. Optionally add the first-name field the spec mentions.
- **Impact:** High for the consent line, medium for the rest.

### 5.8 Calls to action

- **Issue:** Paid cards are clear: an outlined Download Demo and a magenta Buy. The Everything Suite offers "Buy the suite" plus a plain "Gumroad" button, and two checkouts with an unexplained label can cause hesitation.
- **Fix:** Rename the second button "Also on Gumroad", or remove it if Lemon Squeezy is the main checkout. Optionally show the price on Buy buttons ("Buy · $20").
- **Impact:** Low to medium.

### 5.9 Trust signals

- **Issue:** System requirements (Mac, Apple silicon and Intel, macOS 11+) appear only inside a draft FAQ answer. There's also no:
  - license terms (how many computers, free updates)
  - support contact
  - privacy note, even though the site will collect emails
  - "about Dirt Monkey" line
  - way to hear the plugins before downloading

  Audio and video demos are usually the biggest driver of plugin sales.
- **Fix:**
  - Put one line under the Plugins heading: "Mac (Apple silicon and Intel), macOS 11 or newer, VST3 and AU. Windows coming."
  - Write the real refund and license answers.
  - Add a support email in the footer and a short privacy note.
  - Add a one-line artist bio with links.
  - Add short before/after audio or click-to-play YouTube clips to the cards. Load the videos only when tapped, to keep the page fast.
- **Impact:** High.

---

## 6. Code health and GitHub Pages readiness

### 6.1 Ready for GitHub Pages

- **Issue:** None blocking. The site is plain static files with relative paths and a `.nojekyll` file, and has no build step. It works at `username.github.io` or `username.github.io/repo-name`.
- **Fix:** When a custom domain is added, keep the `CNAME` file, turn on "Enforce HTTPS", and switch share-image and canonical URLs to the domain.
- **Impact:** Low.

### 6.2 Dead code and unused files

- **Issue:**
  - `site.js` still has SVG drawings for Punch, Updown, and Wonk Factory, which are no longer shown because every plugin has a screenshot.
  - `setupVideo()` looks for a video that isn't on the page.
  - CSS for `.tagline`, `.features`, and `.system` is unused.
  - `skwish-magenta.png` and `skwish-loop.mp4` (about 395 KB) are in the repo but never loaded.
  - Free plugins carry `demoLink` and `buyLink` values that point to files that don't exist; `dip-demo-PLACEHOLDER.txt` is unused.
  - `wonk-factory-ui.png` is unused by design and kept for later product pages.
- **Fix:** Remove the unused drawings, but keep the generic fallback for a future plugin without a screenshot. Remove `setupVideo` and the unused CSS, and blank out the free plugins' demo and buy fields. Keep the spare Skwish files only if you plan to use them. None of this affects visitors' download size except the small amount of JavaScript.
- **Impact:** Low.

### 6.3 Accent colors live in `site.js`

- **Issue:** Each card's accent color (cyan, magenta, mint) comes from a list in `site.js` keyed by plugin id. A new plugin like Fizz or Delay falls back to cyan unless someone edits `site.js`. That works against "a new plugin is just a new `products.js` entry".
- **Fix:** Add an `accent` field to each plugin in `products.js` and read it in `site.js`, with cyan as the default.
- **Impact:** Medium.

### 6.4 Image workflow for new plugins

- **Issue:** Once 1.1 is done, each plugin needs a few image sizes. Doing that by hand each time invites mistakes.
- **Fix:** Pick a naming pattern, such as `name-720.webp`, `name-1080.webp`, and `name.png`, plus `shotWidth` and `shotHeight` in `products.js`. Add a short README section, or a tiny optional script that makes the sizes. The site itself still needs no build.
- **Impact:** Low.

### 6.5 Hosting installers

- **Issue:** Real demo and free-plugin installers will be large. GitHub caps single files at 100 MB, suggests keeping Pages sites under 1 GB, and has a soft 100 GB per month bandwidth limit.
- **Fix:** Upload installers as GitHub Release assets, as the email spec already plans, and keep them out of the repo.
- **Impact:** Medium, at launch.

### 6.6 Kit hookup is close

- **Issue:** The placeholder forms already use `name="email_address"`, the field name Kit's HTML embed uses. The `data-kit-form-id` and `data-kit-tags` attributes are notes only.
- **Fix:** When the forms exist in Kit, either paste Kit's embed code in place of each placeholder, or point the existing form's `action` at Kit's form URL and remove the no-submit handler. Set tags (`free-dip`, `free-meter`, `free-frequalizer`, `founders-waitlist`, `source-website`) in each Kit form's settings. Remove the "Placeholder" tag at the same time.
- **Impact:** Medium.

### 6.7 README nav list

- **Issue:** The README's last section lists only four menu links (Plugins, Sample Packs, Demos, FAQ). The page now also has Suite and Founders.
- **Fix:** Update that sentence.
- **Impact:** Low.

---

## What was checked and passed

- No horizontal scrolling at 390 px. Cards, forms, suite, and Founders all fit.
- No layout shift (CLS 0), because every card image has width and height.
- No long JavaScript tasks (TBT 0 ms).
- Contrast passes AA everywhere text sits on the dark backgrounds.
- Keyboard focus outline on every interactive element, and a working skip link.
- Reduced-motion support.
- Real `<label>` on each email field, and 16 px inputs (no iPhone zoom).
- `lang="en"`, viewport meta tag, theme color, and FAQ built with `details`/`summary`.
- Prices match `products.js`, The Everything Suite saving ($51) is calculated from paid plugins only, and free plugins are left out of the suite and Founders lists.
- Countdown targets are correct: Nov 18, 2026 12:00 AM CT (06:00 UTC) and Nov 30, 2026 11:59 PM CT (05:59 UTC on Dec 1).
