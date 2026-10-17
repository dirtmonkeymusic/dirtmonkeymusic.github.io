# Handoff

Where things stand, so work can pick up on another machine. Nothing has been published or deployed, and DNS has not been touched.

## Run it

```
python3 -m http.server 47321 --bind 127.0.0.1
```

Open http://127.0.0.1:47321/ (home) and http://127.0.0.1:47321/play/ (the game). Add `?debug` to `/play/` for the test hook (`window.skwishDrop`).

## Home page: done

- Simplified on 2026-10-16: the steerable Skwish, portals, and secrets are gone. Now it is the logo, a neon button for each section (including Play), and Skwish Pong (`js/pong.js`): attract mode on its own, a quick game to 5 when Skwish or Play Pong is clicked, Esc or X to stop, and a still Skwish for reduced motion.
- The Play pill in every nav, plus /play/ in the sitemap.
- Lighthouse mobile on home: 99 performance, 100 for everything else (three runs).

## Skwish DDR game: done

All of this is committed and pushed to main.

- Four arrow lanes (left, down, up, right). Arrows rise to targets at the top.
- Controls: arrow keys or A S W D on a keyboard. On phones, four big tap pads at the bottom (multi-touch).
- Judgments: Marvelous ±22.5 ms, Perfect ±45, Great ±90, Good ±135, and Miss. Great and Good also show EARLY or LATE. The popups are neon, and Marvelous gets a moving gradient.
- Combo effects:
  - at 25 the lanes pulse;
  - at 50 Skwish dances harder and the targets glow;
  - at 100 the edges glow with cycling color and throw particles;
  - at 200 the combo number goes rainbow;
  - drops amplify all of it, with a bigger glow;
  - milestone shouts appear at 50, 100, 200, and so on.
- Life bar: starts at 50. Misses cost more on harder difficulties. On Hard and Skwished, when it empties, the music fades, FAILED shows, and the stage fails. Easy fails the same way after 15 misses in a row, and Normal after 10.
- Difficulties: Easy, Normal, Hard, and Skwished, each with its own chart. The placeholder charts are in `js/beatmap.js` and were made by `dev/gen_charts.py`. Hold arrows appear on Hard and Skwished, with a 0.2 s re-press grace.
- Scoring and results:
  - scores run to 1,000,000, with S/A/B/C/D grades;
  - full combo badges come in Marvelous, Perfect, Great, and plain tiers;
  - each difficulty keeps its own best score in localStorage;
  - results also show average timing, with a "Nudge offset" button.
- Retry: the toolbar button during play, the pause and results screens, and the R key.
- Speed: 1x to 4x, saved between visits.
- Timing offset: -5 and +5 buttons, plus a Calibrate screen where you tap along with 16 clicks and the median sets the offset.
- Reduced motion: no shake, flashes, or rotation.
- The real track is in: "Genre Snob" by Dirt Monkey, `assets/audio/genre-snob.m4a` (AAC 160 kbps, 2.2 MB), 140 BPM, offset 0. The start screen says "Now playing Genre Snob". The placeholder beat plays only if the file cannot load.
- Another track swap-in still needs only the audio file, BPM, and offset. Missing charts are made from the audio in the game.
  - `js/chart-maker.js`, `tools/make-beatmap.js`, and `/tools/beatmap/` all make the four charts with holds now.
  - Drop detection uses energy above the sub plus hit density, so long sub notes no longer look like drops.
- README: covers how to play and the charts format.

### Tests that passed

These ran on this machine with puppeteer against Chrome.

- Perfect autoplay clears every difficulty with an S and a full combo badge. Hard counts 20 of 20 holds, and per-difficulty bests are saved.
- An early release gives NG and a skipped arrow gives a Miss, so there is no full combo badge.
- The life bar drains, and the stage fails.
- R retries from both the results and pause screens. The toolbar Retry and Esc to pause also work.
- Calibration with taps 32 ms late measured +32 ms.
- Results read 40 ms late presses as "+44 ms late", and the Nudge button moves the offset.
- Mobile at 390x844 with real touch events: pads score hits, and the toolbar buttons are 44 px tall.
- No console errors in any of the runs.

## Shows and Music: copied from the app

- Done on 2026-10-16 (committed locally, not pushed). /shows/ loads live from Bandsintown (`js/shows.js`, 5-minute localStorage cache, 15 s timeout, the page's own dates as the fallback). /music/ has the SKWISH countdown card, the six released songs with iTunes 30-second previews (`js/music.js`), and the Connect links.
- Both Bandsintown and iTunes Lookup allow browser requests (CORS `*`), so both work live.
- Test: `node dev/appcopy-shots.js` (29 checks, needs internet). Lighthouse mobile: Shows 99, Music 97.

## What's left

Done on 2026-10-16 (committed locally, not pushed):

- The `late` test now presses as each note is heard, so it passes; the game was not changed for it.
- Full test pass: `ddr-test.js all` (35 of 35), `track-test.js`, `tool-test.js`, `score-chart.js`, and the new `site-check.js` (91 of 91) all pass with no console errors.
- In-game screenshots reviewed. Fixed: on phones, missed arrows no longer fly over the life bar, and hold bodies stop at the tap pads. The faded combo number no longer shows through the results screen.
- Lighthouse mobile: home 98 / 100 / 100 / 100, /play/ 96 / 100 / 100 / 100 (accessibility was 97 until the "No best yet" text on the selected difficulty got more contrast).
- Report screenshots are in `~/DMBuilds/DMSite-shots/` (`dev/report-shots.js` and `dev/site-check.js` make them).

Still open:

1. **Tuning, if wanted.** Life starts at 50, so 5 straight misses fail Hard and Skwished, 7 fail Normal, and 9 fail Easy. To soften it, raise the start or lower `MISS_LIFE` in `js/rhythm.js`. See the recommendation in `~/DMBuilds/DMSite-shots/REPORT.md`.
2. **Real track: done.** Genre Snob is in, with hand-tuned charts from `dev/genre_snob_charts.js` (it runs the beatmap maker on band-split stems, then shapes each section). If Patrick sends real stems, add them to that script's `toolBlock()` for cleaner notes.

## About `dev/`

The test scripts now find their paths on their own (see `dev/env.js`), so they run on any machine with Chrome:

```
cd dev && npm install                      # puppeteer-core, plus an ffmpeg for the test audio
python3 -m http.server 47321 --bind 127.0.0.1   # from the repo root, in another terminal
node ddr-test.js all                       # the game (or one case: clear, fail, holds, late, calibrate, shots, mobile, reduce)
node site-check.js                         # every page on desktop and phone, plus home page Pong
node report-shots.js                       # report screenshots
python3 make_test_track.py                 # needs numpy; writes tmp-audio/ (then track-test.js, tool-test.js, score-chart.js)
```

- Chrome is found in the usual Mac and Linux places. Set `CHROME` to point somewhere else.
- Screenshots worth keeping go to `~/DMBuilds/DMSite-shots/` (set `ART` to change it). Scratch files go to the system temp folder (`SHOT`).
- `make_test_track.py` uses ffmpeg from your PATH, or the one `npm install` puts in `dev/node_modules`.
- `genre_snob_charts.js` remakes the Genre Snob charts from `~/DMBuilds/DMSite-shots/genre-snob.wav` (or a path you give it). `song-shots.js` takes the song-*.png screenshots.
- `make_play_art.js` makes the web-size Genre Snob art in `assets/play/genre-snob/` from DIRT's full-res layers in `~/DMBuilds/DMSite-shots/art/` (it only scales, crops, and re-encodes). `art-shots.js` takes the art-*.png screenshots and checks the theme.
- The Genre Snob look (cover, dancer, coins, gold palette, background video) is the `theme` block in `js/beatmap.js`. It only applies while that song is the track.
- The background video: `make_play_bg.js` copies the four silent visualizer files from `~/DMBuilds/DMSite-shots/bg/` into `assets/play/genre-snob/` and grabs a still from each. Nothing loads until Start; reduced motion and Save-Data get the still only. Python's server can't seek inside a video, so test it with `node serve.js` (port 47322, with Range support, like GitHub Pages), then `node bg-test.js` (sync through start, pause, a jump, turning the screen, and retry; the still for reduced motion and for a failed video; and the bg-*.png screenshots).
- `gen_charts.py` rewrites the placeholder charts in `js/beatmap.js` in place. Run as is, it writes the same charts that are there now.

Do not commit `uploads/`, `tmp-audio/`, or `node_modules/` (all three are in `.gitignore`).
