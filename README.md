# Dirt Monkey

This is the Dirt Monkey website, made for the address **https://dirtmonkey.music**. It is made of normal files. There is no app to install, no build step, and no database.

## Site map

| Address | File | What is on it |
| --- | --- | --- |
| `/` | `index.html` | The bubble logo and the Skwish play area, with a glowing portal for each section, then the email signup |
| `/plugins/` | `plugins/index.html` | The whole plugin shop: plugins, The Everything Suite, the Founders Suite, sample packs, how demos work, and the FAQ |
| `/music/` | `music/index.html` | SKWISH, the new album on 19K, out November 13, 2026. Listen links are placeholders until release day. |
| `/shows/` | `shows/index.html` | Fall 2026 dates: Richmond, VA (Oct 31), Sacramento (Nov 7), Orlando (Nov 8), Port Charlotte, FL (Nov 21). Ticket links are placeholders. |
| `/merch/` | `merch/index.html` | Merch cards from the Bass Threads store, plus a Shop all merch button |
| `/app/` | `app/index.html` | The Dirt Monkey iPhone app, coming November 2 |
| `/play/` | `play/index.html` | Skwish Drop, a bass-drop rhythm game starring Skwish |
| `/privacy/` | `privacy/index.html` | The app privacy policy, exactly as written |
| `/#signup` | `index.html` | The email signup (a Kit placeholder form) |

The header on every page links to Plugins, Music, Shows, Merch, App, Play (a glowing pill), and Sign up. The footer links to Instagram, YouTube, Bandcamp, 19K, and the privacy policy.

The plugin shop has:

- **Plugins:** Wonk Factory (the flagship synth) on top, then Punch, Updown, The End, Slammer, Spaces, Fizz, and Dub-It. Dip, Meter, and Frequalizer are free, in their own row.
- **The Everything Suite:** every paid plugin in one download, $89 or 10 payments of $8.99. It steps aside while the Founders Suite is on sale.
- **Founders Suite:** a one-time $59 offer (or 6 payments of $9.99) from November 18 to November 30, with a countdown and a waitlist form. No checkout yet.
- **Sample packs:** six placeholder packs (rename them whenever you want). On phones this section is one "Sample packs coming soon" line.
- **How demos work** and an **FAQ**

Skwish, the neon monkey, is the mascot. On the home page he is a character you can steer.

## The home page play area

The home page is the logo and a neon play area. Seven portals sit around Skwish: Plugins, Music, Shows, Merch, App, Play, and Sign up. `js/play.js` runs it. Nothing to install, and no outside code.

- **Steer Skwish:** arrow keys or WASD on a computer (the arrow keys steer once you click or tab into the play area, so they still scroll the page otherwise). Click any empty spot and he walks there. On a phone, tap a spot or drag him.
- **Jump into a section:** park Skwish on a portal. Its ring fills up while he shrinks into it, then the screen warps to that page. Clicking or tapping a portal sends him dashing over first.
- **Skwish reacts:** he leans into turns, flips to face the way he runs, and turns his head to watch the mouse. Portals wobble and glow on hover. Poke Skwish and he squishes.
- **Two secrets** (the counter under the play area shows how many you have found): poke Skwish five times fast for a spin, and type the Konami code (up, up, down, down, left, right, left, right, B, A) for Wonk mode, which cycles the colors. Type the code again to switch it off.
- **Sound:** short synth blips made in the browser (no sound files). Off until the visitor presses **Sound off** to turn it on. The choice is remembered.
- **Moving between pages:** in browsers that support it, the old page shrinks away and the new one pops in. The header stays put.

Nobody has to play. The menu at the top of every page is always there, every portal is a normal link, and Tab plus Enter works on them. If a visitor's device asks for reduced motion, Skwish stops bobbing, nothing spins or warps, and a portal goes straight to its page.

To move a portal, change its `--x` and `--y` in `css/styles.css` (look for `.portal-plugins`). There is one set for computers and one for phones.

## Skwish Drop, the game at /play/

An arrow rhythm game in the browser, in the style of a dance-pad game. Arrows rise up four lanes (left, down, up, right) to target arrows at the top, in time with a bass beat. `js/rhythm.js` runs it (plain JavaScript, a canvas, and the Web Audio API, with no outside code). `js/beatmap.js` holds the song and the charts.

**How to play**

- Pick a difficulty (**Easy**, **Normal**, **Hard**, or **Skwished**), then press **Start**. A short count-in plays, then the arrows start rising.
- Press the matching arrow the moment it lands on its target. On a computer use the **arrow keys** or **A S W D** (A left, S down, W up, D right). On a phone or tablet, tap the four big pads at the bottom. Two arrows at once is a jump: hit both.
- Timing is judged **Marvelous**, **Perfect**, **Great**, or **Good**, from dead on to a bit off. Great and Good also say if you were early or late. An arrow that goes by is a **Miss**. Pressing with no arrow there costs nothing.
- **Holds** (Hard and Skwished): an arrow with a tail. Press on the head and keep holding until the tail runs out for an **OK**. Let go too soon and it is **NG**.
- The **life bar** fills with good hits and drains with misses. Empty means the stage fails. Easy is the most forgiving.
- The **combo** counts hits in a row. At 25 the lanes pulse with the beat, at 50 Skwish dances harder and the targets glow, at 100 the edges light up, and at 200 the combo goes rainbow. The drops turn it all up.
- At the end you get a score out of 1,000,000, a grade (S, A, B, C, or D), and a full combo badge if nothing was missed (Marvelous, Perfect, Great, or plain full combo, by your worst hit). Each difficulty keeps its own best score in the browser on that device.
- **Retry** starts the song over at once: the button in the corner while playing, on the pause screen, on the results screen, or the **R** key when paused or on results.
- **Speed** (1x to 4x) sets how fast the arrows scroll. It does not change the music.
- **Offset and Calibrate:** if hits feel late or early on a device, press **Calibrate** and tap along with 16 clicks. The game measures the delay and saves it. The **-5** and **+5** buttons fine-tune it, and the results screen offers a **Nudge offset** button when your hits were on average 15 ms or more off.
- **Esc** or **P** pauses (so does switching tabs). **M** or the **Sound** button turns the sound on and off.
- If a visitor's device asks for reduced motion, the screen does not shake or flash and Skwish bounces without spinning. The game plays the same.

**The placeholder beat.** The music right now is an original beat that the browser makes on the spot (kick, snare, hats, sub bass, and a wobble bass), so there is no sound file and nothing copyrighted. It is 140 BPM and about 53 seconds long, with two drops. It keeps playing until the real track is set up.

### Swap in the real track

`js/beatmap.js` has two parts: `track` (the real song) and `placeholder` (the beat above). The game plays the track as soon as `track.audio` has a file in it. Three lines are enough:

1. Put the file in the site, for example `assets/audio/skwish-drop.mp3`. MP3 or WAV both work. One steady tempo, start to finish.
2. In `track`, set `audio: "/assets/audio/skwish-drop.mp3"`, `bpm` to the tempo (for example `145`), and `offset` to the seconds from the very start of the file to beat 1 of bar 1 (`0` if the file starts right on it).
3. Open `/play/`. With no charts listed, the game listens to the track when Start is pressed (well under a second) and makes all four charts and the drops itself.

Not sure of the BPM or offset? Set either one to `"auto"` (or leave it out) and the game, or the beatmap maker below, works it out from the audio.

**Try a track without editing anything:** open `/play/?audio=/assets/audio/skwish-drop.mp3&bpm=145&offset=0`. Leave out `bpm` or `offset` to have them guessed. Each track keeps its own best scores. If the file is missing or will not play, the game says so under the Start button and plays the placeholder beat instead.

### Make cleaner charts from the stems

The charts the game makes from the full track are good. Charts made from the stems are better, because a kick stem has nothing but kicks in it. The beatmap maker does this, and it can also guess the BPM and offset (it was right to the hundredth of a BPM and within a few milliseconds on test tracks from 141 to 150 BPM).

- **In a browser, no install:** run the site on your computer (see below) and open `http://127.0.0.1:8741/tools/beatmap/`. Pick the full track and any stems (kick, snare, bass, hats), press **Make the beatmap**, then **Play with clicks** to hear a tick on every arrow (pick which difficulty to hear and see). If the ticks sit on the hits, it is right. **Download beatmap.js** gives you the whole file with the new track in it. Put it at `js/beatmap.js`.
- **In a terminal:** needs Node. WAV works as is. MP3 needs [ffmpeg](https://ffmpeg.org).

```
node tools/make-beatmap.js --mix skwish-drop.wav --kick kick.wav --snare snare.wav --bass bass.wav --bpm 145 --write
```

`--write` puts the result straight into `js/beatmap.js`. Leave it off to print the track block instead. Leave out `--bpm` or add `--offset 0.12` as needed. It always makes all four difficulties. `--audio` sets the address the game loads (it defaults to `/assets/audio/` plus the mix's file name).

Export the stems from the same session as the full track, all starting at the same moment, so they line up. Each difficulty uses more of the music: Easy follows the kick and snare on quarter notes, Normal adds the bass and 8th notes, Hard goes to 16th notes, and Skwished adds the hats and more jumps. Kicks land on the left and right arrows, snares on up and down. On Hard and Skwished, long kick and bass notes become holds. The loudest, busiest long stretches become the drops, where Skwish goes wild.

The charts it writes are plain lines in `js/beatmap.js` (`charts: { easy: [...], normal: [...], hard: [...], skwished: [...] }`), so any arrow can be moved or deleted by hand. A tap arrow is `[beat, lane]` and a hold is `[beat, lane, beats]`: beat 0 is beat 1 of bar 1, `4.5` is the "and" right after beat 4, and lanes are 0 left, 1 down, 2 up, 3 right. Delete a chart and the game makes that one from the audio. Players set their own offset in the game. `inputOffsetMs` adds to it for everyone, so only change it if every hit feels late (raise it, try 30) or early (lower it) on most devices.

The listening code is `js/chart-maker.js`. The game, the page, and the terminal tool all share it, so they give the same charts.

## Look at the site on your computer

In a terminal, inside this folder:

```
python3 -m http.server 8741
```

Then open `http://127.0.0.1:8741` in your browser. Change one thing, save, and refresh the browser to see it.

Use the command above instead of double-clicking `index.html`. Every page loads its pictures and styles from the top of the site (addresses that start with `/`), and those only work through a web server.

### Preview a date

The plugin page switches between The Everything Suite and the Founders Suite by date, and the shows page drops each show the morning after. To see what a page looks like on another day, add `?now=` to the address:

| Address | What you see |
| --- | --- |
| `http://127.0.0.1:8741/plugins/?now=2026-11-19T12:00:00-06:00` | Email-list early access (Everything Suite hidden) |
| `http://127.0.0.1:8741/plugins/?now=2026-11-21T12:00:00-06:00` | Open to everyone (Everything Suite hidden) |
| `http://127.0.0.1:8741/plugins/?now=2026-12-02T12:00:00-06:00` | Offer over (Founders hidden, Everything Suite back) |
| `http://127.0.0.1:8741/shows/?now=2026-12-01T12:00:00-05:00` | Every show is over, so the page says "New dates coming soon" |

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

The shop links under the header on the plugin page (Suite and Founders) hide along with their sections.

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

The Lemon Squeezy script is already in `plugins/index.html` near the bottom (`lemon.js`). Leave that line alone.

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

On phones the packs are replaced by one "Sample packs coming soon" line. That line is in `plugins/index.html`, in the packs section. When the packs are real, delete that line from `plugins/index.html`, and in `css/styles.css` delete the phone rule that hides `.section-packs .pack-grid`.

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

## Change the other words on the site

Each page is the `index.html` inside its folder. Look for comments that say `EDIT`.

- **Game (`play/index.html`, `js/beatmap.js`):** the start screen words are in the page. The track, tempo, offset, and charts are in `js/beatmap.js`. The line under the Start button is `credit` in the track.
- **Home (`index.html`):** the logo, the play area (one portal per section, each a normal link), and the email signup. The words under the play area are the steering hints.
- **Plugins (`plugins/index.html`):** **How demos work** is marked `EDIT THIS SECTION`; the sentences are a placeholder. **FAQ** answers are drafts with a yellow `Edit this answer` label. Rewrite each answer, then delete its label.
- **Music (`music/index.html`):** when SKWISH is out, replace the two "link coming November 13" placeholders with real links. The comment above them shows the line to paste.
- **Shows (`shows/index.html`):** one block per show. Swap "Tickets coming soon" for a ticket link and "Venue to be announced" for the venue. Each block has `data-show-date` (the show day) and `data-show-tz` (the city's time zone). A show drops off the list at 6 AM local time the next morning. When none are left, the page says "New dates coming soon".
- **App (`app/index.html`):** when the app is live, replace the App Store placeholder with the real link. The comment above it shows the line to paste.
- **Privacy (`privacy/index.html`):** this is the policy file exactly as it was supplied. It keeps its own simple style and has no site header. Replace the whole file when a final version is ready.
- **Header and footer:** copied on every page. If you change a nav link or a footer link, change it on every page.
- **Email signup:** the form on the home page is a Kit placeholder tagged `newsletter` and `source-website`. Replace the whole form with the Kit inline embed. It does not send anywhere yet.

Do not rename the folders `assets`, `css`, `js`, `downloads`, or `tools`. The pages look for those names.

## Merch cards

The Merch page shows a card for each product in the Bass Threads store (WooCommerce). Each card shows the picture, the name, and the price, plus a Presale label when the name says Presale. A card opens that product on Bass Threads in a new tab. Checkout always happens on Bass Threads. The store is never embedded in this site.

When the page opens, `js/merch.js` shows the saved list in `js/merch-snapshot.js` right away, then asks the store for the live list at:

```
https://dirtmonkey.bassthreadsmerch.com/wp-json/wc/store/v1/products?per_page=100
```

If the store answers, the live list replaces the saved one. If it does not, the saved list stays, with a small "Prices as of" line under it.

Right now the store does not allow other websites to read that list (it sends no `Access-Control-Allow-Origin` header), so browsers block the request and the saved list is what visitors see. The browser console shows one blocked-request error on the Merch page. To make the cards live, ask Bass Threads to allow `https://dirtmonkey.music` to read the Store API (a CORS setting on their WordPress site). Nothing on this site needs to change after that.

To refresh the saved list, open the address above in a browser, copy everything it shows, and paste it over the list in `js/merch-snapshot.js` (between `[` and `];`). Update the date in the comment at the top of that file and in the "Prices as of" line in `merch/index.html`. Prices in that list are in cents: `"4500"` is $45.

## Search and share previews

Every page has its own title, search description, and share preview (used by Instagram, Discord, iMessage, Slack, and X) at the top of its `index.html`. The share picture is `assets/share-card.jpg` (1200 by 630, made from the real logo and Skwish).

Share previews and search need the site's full address. It is `https://dirtmonkey.music/` in these places:

- the top of every page (`canonical`, `og:url`, `og:image`, and `twitter:image`), and the JSON-LD block on the home page
- `robots.txt`
- `sitemap.xml` (one line per page)
- `CNAME` (the domain alone, `dirtmonkey.music`)

If the address ever changes, change it in all of those. `404.html` is the page GitHub shows for a broken link.

`js/site.js` also writes product details (names, prices, descriptions) for search engines on the plugin page, straight from `js/products.js`. Nothing to edit there.

## Pictures and fonts

- `assets/dirt-monkey-logo-1360.webp`: the Dirt Monkey wordmark in the header, at the top of the home page, and in the footer. The neon glow is drawn from this same file.
- `assets/dirt-monkey-logo.png`: the full-size original of that wordmark. The page does not load it. Keep it for making new sizes.
- `assets/skwish-cyan.webp` and `assets/skwish-cyan.png`: Skwish, the neon monkey in the home page play area and on the App page. Browsers that cannot show WebP get the PNG.
- `assets/favicon-32.png` and `assets/apple-touch-icon.png`: the browser-tab icon and the iPhone home-screen icon. `favicon.ico` at the top is the same icon, for pages (like the privacy policy) that do not name one.
- `assets/share-card.jpg`: the share preview picture.
- `assets/fonts/jetbrains-mono-latin.woff2`: JetBrains Mono, the only font on the site. It is served from this folder, so the page does not wait on Google Fonts. Its license is `assets/fonts/OFL.txt`.

There is also a file named `.nojekyll`. It looks empty. Leave it in the folder. It tells GitHub Pages not to rearrange your files. On a Mac or Windows computer it may be hidden. That is fine.

## Put the site on GitHub Pages

GitHub Pages hosts the site for free.

1. Go to [github.com](https://github.com) and sign up, or sign in.
2. Click the **+** button, then **New repository**.
3. Name the repository. If you name it exactly `yourusername.github.io` (your real username), the site becomes the front page of `https://yourusername.github.io`. Any other name works too. The address will be `https://yourusername.github.io/the-repository-name`. If you go that way, update the site address (see "Search and share previews").
4. Upload **every** file and folder: `index.html`, `404.html`, `CNAME`, `favicon.ico`, `robots.txt`, `sitemap.xml`, `README.md`, `.nojekyll`, the page folders (`plugins`, `music`, `shows`, `merch`, `app`, `privacy`), and `assets`, `css`, `js`, `downloads`, and `tools`. If you only upload `index.html`, the other pages and the pictures will be missing.
5. Open the repository **Settings**, then **Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Choose the `main` branch and the `/ (root)` folder. Save.
8. Wait a minute and refresh that settings page. GitHub shows the site address at the top. Click it.

When you change a price or a link later, upload the changed file again (or commit it, if you use Git). The live site updates after GitHub finishes, usually within a minute. Visitors may see the old version for up to 10 minutes after that.

## Connect dirtmonkey.music

The site is already set up for `https://dirtmonkey.music`: every page, `robots.txt`, and `sitemap.xml` use that address, and the `CNAME` file holds `dirtmonkey.music`. GitHub Pages reads that file to know which domain the site belongs to. Nothing has been published and no DNS has been changed yet.

When you are ready to go live:

1. Publish the site on GitHub Pages (see above).
2. On GitHub, open the repository **Settings**, then **Pages**. **Custom domain** should already say `dirtmonkey.music` because of the `CNAME` file. If not, type it and save.
3. At the company you bought the domain from, add the DNS records GitHub shows. For a bare address like `dirtmonkey.music`, GitHub asks for four **A** records. They have listed these for a long time: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`. Use whatever GitHub shows you if it is different. To make `www.dirtmonkey.music` work too, add a **CNAME** record for `www` pointing at your `yourusername.github.io` address.
4. Wait. DNS can take a few minutes or a few hours.
5. Back in GitHub Pages, turn on **Enforce HTTPS** once it is offered.

Leave the `CNAME` file in place.

## Add a page later

Each page is a folder with an `index.html` inside, so its address is the folder name (`/music/`, `/shows/`, and so on).

1. Copy a page folder, such as `music`, and rename it (for example `about`).
2. Change the words inside, and the title, description, and addresses at the top (`https://dirtmonkey.music/about/`).
3. Add `<a href="/about/">About</a>` to the header nav on every page.
4. Add the address to `sitemap.xml`.

Keep using `/css/styles.css` so a new page matches the rest of the site.
