# Dirt Monkey Plugins

This is the website where Dirt Monkey sells plugins and sample packs. It is one long page made of normal files. There is no app to install, no build step, and no database. You can open it on your computer, put it on GitHub Pages for free, and later point your own web address at it.

Right now the page has:

- **Plugins:** Wonk Factory (the flagship synth) on top, then Punch, Updown, The End, Slammer, Spaces, Fizz, and Dub-It. Dip, Meter, and Frequalizer are free, in their own row.
- **The Everything Suite:** every paid plugin in one download, $89 or 10 payments of $8.99. It steps aside while the Founders Suite is on sale.
- **Founders Suite:** a one-time $59 offer (or 6 payments of $9.99) from November 18 to November 30, with a countdown and a waitlist form. No checkout yet.
- **Sample packs:** six placeholder packs (rename them whenever you want). On phones this section is one "Sample packs coming soon" line.
- **How demos work** and an **FAQ**
- Links to Instagram, YouTube, Bandcamp, merch, and 19K

Skwish, the neon monkey, is the mascot at the top of the page.

The page is built so you can grow it into a full artist site later. See "Add more to the site later" near the bottom.

## Look at the site on your computer

In a terminal, inside this folder:

```
python3 -m http.server 8741
```

Then open `http://127.0.0.1:8741` in your browser. Change one thing, save, and refresh the browser to see it.

Double-clicking `index.html` also works for a quick look.

### Preview a date

The page switches between The Everything Suite and the Founders Suite by date. To see what it looks like on another day, add `?now=` to the address:

| Address | What you see |
| --- | --- |
| `http://127.0.0.1:8741/?now=2026-11-19T12:00:00-06:00` | Email-list early access (Everything Suite hidden) |
| `http://127.0.0.1:8741/?now=2026-11-21T12:00:00-06:00` | Open to everyone (Everything Suite hidden) |
| `http://127.0.0.1:8741/?now=2026-12-02T12:00:00-06:00` | Offer over (Founders hidden, Everything Suite back) |

Visitors never see this unless they type it.

## Change prices, descriptions, and buttons

Open `js/products.js`. That file is the whole shop. Plugins are the `PRODUCTS` list. The suites are `BUNDLE` and `FOUNDERS`. Sample packs are the `SAMPLE_PACKS` list further down. Each item is one block.

Change only the words inside the quote marks. Leave the quotes and the commas where they are.

| What you want to change | The line to edit |
| --- | --- |
| Price on the card | `price` |
| Small line under the price (such as a launch price) | `priceNote` |
| The paragraph (two sentences at most) | `description` |
| VST3, AU, Mac, and similar labels | `formats` |
| Card glow color: `cyan`, `magenta`, or `mint` | `accent` |
| Download Demo button | `demoLink` |
| Buy button | `buyLink` |
| Plugin picture | `screenshot`, `shotWidth`, `shotHeight`, `shotSizes` |
| What the picture shows (for screen readers and search) | `shotAlt` |
| Notes for a later product page (not on the card) | `tagline`, `features` |

A paid plugin uses a price like `"$49"`. A free plugin uses `"Free"` and `free: true`. Its card shows an email form instead of Download Demo and Buy. Set `kitFormId` to `"PLACEHOLDER"` until the Kit form exists, and set `kitTags` to the plugin tag plus `source-website` (`free-dip`, `free-meter`, or `free-frequalizer`).

To add a plugin, copy a block in `PRODUCTS`, give it a new `id`, and add that id to `BUNDLE.includes` and `FOUNDERS.includes` if it belongs in the suites. The save line on The Everything Suite adds up the regular prices of the paid plugins in `includes` and subtracts the suite price (right now $164 minus $89, so "Save $75"). Free plugins are not part of that sum.

The name Dub-It is set once, at `DUB_IT_NAME` near the top of the plugin list. Change it there and the card, the suite lists, and the picture description all follow.

If the plugin cards ever go blank, a quote or a comma was deleted. Undo and try again.

You do not need to open `js/site.js` or `css/styles.css`. Those files draw the page.

## The Everything Suite and the Founders Suite

The Everything Suite is the `BUNDLE` block. `price` is `$89` and `payments` is the "or 10 payments of $8.99" line. The save line is worked out from the plugin prices. The Lemon Squeezy link and the Gumroad link are placeholders. A comment in that block says future plugins are included. Leave that sentence off the page.

The Founders Suite is the `FOUNDERS` block. `price` is `$59` and `payments` is the "or 6 payments of $9.99" line. The card also says "One time only, then $89", using the Everything Suite price. It lists the plugins available at launch (`includes`) and names every future plugin as a bonus.

The dates live in that block too, in Central Time:

| When | What the page does |
| --- | --- |
| Before November 18 | Both suites show. Founders counts down to early access and collects emails. |
| November 18 and 19 | Email list only. The Everything Suite hides. Founders counts down to the public open. |
| November 20 to November 30, 11:59 PM CT | Open to everyone. The Everything Suite stays hidden. Founders shows "Closes in". |
| After that | Founders hides. The Everything Suite comes back. |

The menu links for Suite and Founders hide along with their sections.

`count` is the number of founders so far. The "founders so far" line stays hidden while it is `0`. Nothing fetches it. Change the number by hand.

The email form is a placeholder tagged `founders-waitlist` and `source-website`. There is no Founders checkout on the page yet.

## Paste Lemon Squeezy links

Buy buttons already use Lemon Squeezy. A buyer stays on your site. A checkout window opens on top of the page.

1. In Lemon Squeezy, open the product.
2. Copy the checkout link. It usually looks like `https://yourstore.lemonsqueezy.com/checkout/buy/` followed by a long code.
3. Open `js/products.js`.
4. Find the line that says `buyLink` for that plugin.
5. Replace the placeholder, including `https://YOURSTORE.lemonsqueezy.com/buy/PUNCH-PLACEHOLDER`, with the link you copied. Keep the quote marks.

There is a comment above each `buyLink` that says `PASTE THE REAL LEMON SQUEEZY CHECKOUT LINK BELOW`.

The Lemon Squeezy script is already in `index.html` near the bottom (`lemon.js`). Leave that line alone.

## Where demo files go

Put the real demo files in the `downloads` folder. A `.zip` is the usual choice.

Then change `demoLink` in `js/products.js` to match the file name:

```
demoLink: "downloads/Punch-Mac.zip",
```

The files named like `punch-demo-PLACEHOLDER.txt` are stand-ins so the buttons work today. Delete each one after its real file is in place.

A GitHub Releases link also works. Paste the full `https://` address as `demoLink`.

## Plugin screenshots

Each card shows a real screenshot from the `assets/plugins` folder. Every screenshot has a full-size PNG (for example `fizz-ui.png`) and smaller WebP copies next to it (`fizz-ui-360.webp`, `fizz-ui-720.webp`, `fizz-ui-1080.webp`). Phones and laptops pick the smallest copy that still looks sharp, so the page loads fast.

To swap or add a screenshot:

1. Save the PNG in `assets/plugins`, for example `assets/plugins/fizz-ui.png`.
2. Make the WebP copies. This needs Python 3 and Pillow (`pip3 install pillow`):

   ```
   python3 tools/make-images.py assets/plugins/fizz-ui.png
   ```

3. The script prints four lines (`screenshot`, `shotWidth`, `shotHeight`, `shotSizes`). Paste them over the ones in that plugin's block in `js/products.js`.

The script only resizes and re-encodes the picture. It never redraws it. It uses WebP quality 85, which keeps knob labels crisp on resized copies. If a picture is shown at its own size and the knobs look soft, run it again with `--lossless`. The Wonk Factory card does this: its card copy is lossless and its small suite thumbnail is quality 85.

The Slammer and Dub-It pictures are cropped just below the plugin's own title bar, because that bar still shows the old working names. Swap in a fresh export when the plugins show their new names.

The Wonk Factory card picture (`wonk-factory.png`) is a crop of the full window (`wonk-factory-ui.png`): the top-left area with the first two oscillators and Filter 1. The full window is kept for a later product page.

Leave `screenshot` as `""` to show a plain neon drawing instead.

## Sample packs

The Sample Packs section is the `SAMPLE_PACKS` list in `js/products.js`. The six packs there are placeholders. Change the name, the price, and the one-line description the same way you change a plugin.

Buy on a pack does **not** use Lemon Squeezy. It opens a Gumroad or Bandcamp page in a new tab.

1. Copy the link to the pack on Gumroad or Bandcamp.
2. Paste it as that pack's `buyLink`. Keep the quote marks.
3. Set `store` to `Gumroad` or `Bandcamp` so the little label on the card matches.

There is a comment above each pack `buyLink` that says `PASTE THE REAL GUMROAD OR BANDCAMP LINK BELOW`.

The placeholder links look like:

- `https://YOURNAME.gumroad.com/l/NEON-DRUMS-PLACEHOLDER`
- `https://dirtmonkey.bandcamp.com/album/WONK-VOCALS-PLACEHOLDER`

To add another pack, copy one whole block (from `{` through `}`), paste it just before the `];` that ends `SAMPLE_PACKS`, and change the words. Give it a new `id`.

On phones the packs are replaced by one "Sample packs coming soon" line. That line is in `index.html`, in the packs section. When the packs are real, delete that line from `index.html`, and in `css/styles.css` delete the phone rule that hides `.section-packs .pack-grid`.

### Cover art

Each pack shows a neon stand-in until you have artwork.

1. Save the picture in the `assets/packs` folder. Example: `assets/packs/neon-drums.jpg`
2. Change that pack's cover line from

```
cover: ""
```

to

```
cover: "assets/packs/neon-drums.jpg"
```

A square picture fits the card best.

## Change the other words on the page

Open `index.html`.

- The hero lockup is `Sounds of`, then the Dirt Monkey logo, then `Plugins & Sample Packs`. Those words are in `index.html`.
- **How demos work** is marked with a comment that says `EDIT THIS SECTION`. The current sentences are a placeholder.
- **FAQ** answers are drafts. Each one has a yellow label that says `Edit this answer`. Rewrite the answer, then delete that label when you are happy with it. The note above the questions says the same thing.
- Footer links (Instagram, YouTube, Bandcamp, merch, 19K) are at the bottom of `index.html`. The 19K link currently goes to the 19K SoundCloud page. Change that address if you want it to go somewhere else.
- The browser-tab title, the search description, and the share preview text are at the top of `index.html`.

Do not rename the folders `assets`, `css`, `js`, `downloads`, or `tools`. The page looks for those names.

## Search and share previews

The top of `index.html` has the page title, a search description, and the share preview used by Instagram, Discord, iMessage, Slack, and X. The share picture is `assets/share-card.jpg` (1200 by 630, made from the real logo and Skwish).

Share previews and search need the site's full address. It is set to `https://dirtmonkeymusic.github.io/` in these places:

- the top of `index.html` (marked `SITE ADDRESS`)
- `robots.txt`
- `sitemap.xml`

If the site ends up somewhere else (a custom domain, or a repository name after the slash), change the address in all three. `404.html` is the page GitHub shows for a broken link. Its comment explains what to change if the site is not at the top of its domain.

`js/site.js` also writes product details (names, prices, descriptions) for search engines, straight from `js/products.js`. Nothing to edit there.

## Pictures and fonts

- `assets/dirt-monkey-logo-1360.webp`: the Dirt Monkey wordmark in the header, the hero, and the footer. The neon glow is drawn from this same file.
- `assets/dirt-monkey-logo.png`: the full-size original of that wordmark. The page does not load it. Keep it for making new sizes.
- `assets/skwish-cyan.webp` and `assets/skwish-cyan.png`: Skwish, the neon monkey in the hero. Browsers that cannot show WebP get the PNG.
- `assets/favicon-32.png` and `assets/apple-touch-icon.png`: the browser-tab icon and the iPhone home-screen icon.
- `assets/share-card.jpg`: the share preview picture.
- `assets/fonts/jetbrains-mono-latin.woff2`: JetBrains Mono, the only font on the site. It is served from this folder, so the page does not wait on Google Fonts. Its license is `assets/fonts/OFL.txt`.

There is also a file named `.nojekyll`. It looks empty. Leave it in the folder. It tells GitHub Pages not to rearrange your files. On a Mac or Windows computer it may be hidden. That is fine.

## Put the site on GitHub Pages

GitHub Pages hosts the site for free.

1. Go to [github.com](https://github.com) and sign up, or sign in.
2. Click the **+** button, then **New repository**.
3. Name the repository. If you name it exactly `yourusername.github.io` (your real username), the site becomes the front page of `https://yourusername.github.io`. Any other name works too. The address will be `https://yourusername.github.io/the-repository-name`. If you go that way, update the site address (see "Search and share previews").
4. Upload **every** file and folder: `index.html`, `404.html`, `robots.txt`, `sitemap.xml`, `README.md`, `.nojekyll`, `assets`, `css`, `js`, `downloads`, and `tools`. If you only upload `index.html`, the pictures will be missing.
5. Open the repository **Settings**, then **Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Choose the `main` branch and the `/ (root)` folder. Save.
8. Wait a minute and refresh that settings page. GitHub shows the site address at the top. Click it.

When you change a price or a link later, upload the changed file again (or commit it, if you use Git). The live site updates after GitHub finishes, usually within a minute. Visitors may see the old version for up to 10 minutes after that.

## Point your own web address at it later

You can keep the free GitHub address, or send a domain you bought (like `plugins.yourdomain.com`) to this same site.

1. Buy the domain from wherever you like (Cloudflare, Namecheap, Google, and similar).
2. On GitHub, open the repository **Settings**, then **Pages**.
3. In **Custom domain**, type the address you want, such as `www.yourdomain.com`. Save.
4. GitHub shows the DNS records to add. At the company you bought the domain from, add those records.
   - For a `www` address, that is usually a **CNAME** record pointing at `yourusername.github.io`.
   - For a bare address like `yourdomain.com` (no `www`), GitHub asks for four **A** records. They have listed these for a long time: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`. Use whatever GitHub shows you if it is different.
5. Wait. DNS can take a few minutes or a few hours.
6. Back in GitHub Pages, turn on **Enforce HTTPS** once it is offered.
7. Change the site address in `index.html`, `robots.txt`, and `sitemap.xml` to the new domain (see "Search and share previews").

GitHub may add a small file named `CNAME`. Leave that file in place.

## Add more to the site later

The site is one page on purpose. The top of `index.html` has a short map of the sections. The links in the header (Plugins, Suite, Founders, Sample Packs, Demos, FAQ) jump down the page. Suite and Founders hide themselves when their section is hidden.

To add something new, like music, tour dates, or an about blurb:

1. Open `index.html`.
2. Copy a whole `<section> ... </section>` block.
3. Change `id="something"` to a new name, like `id="music"`.
4. In the header nav, add `<a href="#music">Music</a>`.
5. Replace the words inside the copy with the new ones.

If the new part is a list of things for sale, it is easier to add blocks in `js/products.js` (copy a plugin block or a sample-pack block) than to hand-build cards.

Later, if you want separate pages, you can add files like `music.html` next to `index.html` and point a nav link at `music.html` instead of `#music`. You do not need to do that yet. Keep using the same `css/styles.css` so a new page matches this one.
