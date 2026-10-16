# Handoff

Where things stand, so work can pick up on another machine. Nothing has been published or deployed, and DNS has not been touched.

## Run it

```
python3 -m http.server 47321 --bind 127.0.0.1
```

Open http://127.0.0.1:47321/ (home) and http://127.0.0.1:47321/play/ (the game). Add `?debug` to `/play/` for the test hook (`window.skwishDrop`).

## Home page: done

- Gamified Skwish navigation (the home play area), with a portal for every page, including the Play portal for the game.
- The Play pill in every nav, plus /play/ in the sitemap.
- Last Lighthouse mobile run on home: 98 performance, 100 for everything else.

Nothing is left open from the home page asks.

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
- Life bar: starts at 50. Misses cost more on harder difficulties. When it empties, the music fades, FAILED shows, and the stage fails.
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
- Real track swap-in (still waiting on Patrick's file): it needs only the audio file, BPM, and offset. Missing charts are made from the audio in the game.
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

## What's left

1. **Fix one test, not the game.** "After nudge the same late presses are on time" in `dev/ddr-test.js` (the `late` case) fails because the test's autoplay times its presses from `songTime()`, which already includes the new offset. Time the presses from `heard()` and the note times instead.
2. **Finish the test pass.** Run the `holds` (speed-4 part), `reduce`, and `shots` cases of `dev/ddr-test.js`. Then run `dev/track-test.js`, `dev/tool-test.js`, `dev/score-chart.js`, and the home page and site checks again.
3. **Review the in-game screenshots.** Nobody has looked at mid-game desktop or mobile screenshots of the arrow version yet. Check the judgment and combo placement, the hold bodies, the life bar next to the toolbar on phones, and the pads.
4. **Lighthouse mobile on /play/.** It must stay at 95 or above. It was 97 before the DDR rework and has not been rerun since.
5. **Screenshots for the report.** Save the start screen with the difficulty picker, mid-game on desktop, mid-game on mobile with the pads (`skwish-ddr-mobile.png` already exists on the old machine only), results with an FC badge, and the calibration screen.
6. **Tuning, if wanted.** Life starts at 50, so about 5 straight misses fail Skwished and 7 fail Normal. Raise the start or lower `MISS_LIFE` in `js/rhythm.js` if that feels too harsh.
7. **Real track.** When Patrick sends it, follow the note at the top of `js/beatmap.js`, or run `node tools/make-beatmap.js --mix ... --kick ... --snare ... --bass ... --write`.

## About `dev/`

The test scripts were copied from a scratch folder on the old machine, so they still use its paths. Before running them:

- install `puppeteer-core` and set the Chrome path (`/usr/bin/google-chrome`);
- `make_test_track.py` needs numpy and ffmpeg, and writes test audio to `tmp-audio/` (keep that folder out of git);
- `gen_charts.py` rewrites the placeholder charts in `js/beatmap.js` in place.

Do not commit `uploads/` or `tmp-audio/`.
