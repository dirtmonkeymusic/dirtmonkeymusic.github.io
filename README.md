# Dirt Monkey Plugins

This is the website where Dirt Monkey sells plugins. It is a folder of normal files. There is no app to install, no build step, and no database. You can open it on your computer, put it on GitHub Pages for free, and later point your own web address at it.

The pages are:

- **Punch** — one-knob effect for a mix, bus, or group
- **Updown** — sweeps, risers, and downfalls
- **Wonk Factory** — wavetable synth

Skwish, the neon monkey, is the mascot in the top of the page.

## Look at the site on your computer

Double-click `index.html`. It opens in your browser.

Change one thing, save, and refresh the browser to see it.

## Change prices, descriptions, and buttons

Open `js/products.js`. That is the whole shop. Each plugin is one block.

Change only the words inside the quote marks. Leave the quotes and the commas where they are.

| What you want to change | The line to edit |
| --- | --- |
| Price on the card | `price` |
| The paragraph | `description` |
| VST3, AU, Mac, and similar labels | `formats` |
| Mac / Windows line | `system` |
| Download Demo button | `demoLink` |
| Buy button | `buyLink` |
| Plugin picture | `screenshot` |

Prices are `$XX` on purpose. Replace that with the real price, like `"$49"`.

If the plugin cards ever go blank, a quote or a comma was deleted. Undo and try again.

You do not need to open `js/site.js` or `css/styles.css`. Those files draw the page.

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

The files named `punch-demo-PLACEHOLDER.txt`, `updown-demo-PLACEHOLDER.txt`, and `wonk-factory-demo-PLACEHOLDER.txt` are stand-ins so the buttons work today. Delete them after the real files are in place.

A GitHub Releases link also works. Paste the full `https://` address as `demoLink`.

## Drop in real plugin screenshots

Each card shows a neon stand-in picture until you have a screenshot.

1. Save the screenshot in the `assets` folder. Example: `assets/punch.png`
2. In `js/products.js`, change that plugin's screenshot line from

```
screenshot: ""
```

to

```
screenshot: "assets/punch.png"
```

Leave the quotes empty if you want to keep the neon picture.

## Change the other words on the page

Open `index.html`.

- The tagline under the logo is `Plugins by Dirt Monkey`. The line under that is editable too.
- **How demos work** is marked with a comment that says `EDIT THIS SECTION`. The current sentences are a placeholder.
- **FAQ** answers are drafts. Each one has a yellow label that says `Edit this answer`. Rewrite the answer, then delete that label when you are happy with it. The note above the questions says the same thing.
- Footer links (Instagram, YouTube, Bandcamp, merch, 19K) are at the bottom of `index.html`. The 19K link currently goes to the 19K SoundCloud page. Change that address if you want it to go somewhere else.

Do not rename the folders `assets`, `css`, `js`, or `downloads`. The page looks for those names.

## Pictures and the moving monkey

- `assets/dirt-monkey-logo.png` — the Dirt Monkey logo in the header and the top of the page
- `assets/skwish-cyan.png` and `assets/skwish-magenta.png` — Skwish
- `assets/skwish-loop.mp4` — the short glowing loop behind Skwish

The still picture shows if the video cannot play. You can leave these files alone.

There is also a file named `.nojekyll`. It looks empty. Leave it in the folder. It tells GitHub Pages not to rearrange your files. On a Mac or Windows computer it may be hidden. That is fine.

## Put the site on GitHub Pages

GitHub Pages hosts the site for free.

1. Go to [github.com](https://github.com) and sign up, or sign in.
2. Click the **+** button, then **New repository**.
3. Name the repository. If you name it exactly `yourusername.github.io` (your real username), the site becomes the front page of `https://yourusername.github.io`. Any other name works too. The address will be `https://yourusername.github.io/the-repository-name`.
4. Upload **every** file and folder: `index.html`, `README.md`, `.nojekyll`, `assets`, `css`, `js`, and `downloads`. If you only upload `index.html`, the pictures will be missing.
5. Open the repository **Settings**, then **Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Choose the `main` branch and the `/ (root)` folder. Save.
8. Wait a minute and refresh that settings page. GitHub shows the site address at the top. Click it.

When you change a price or a link later, upload the changed file again (or commit it, if you use Git). The live site updates after GitHub finishes, usually within a minute.

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

You do not change the website files to do this, except that GitHub may add a small file named `CNAME`. Leave that file in place.
