// Paths for the dev test scripts. Override any of them with an environment variable.
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CHROME_GUESSES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium"
];
const CHROME = process.env.CHROME || CHROME_GUESSES.find((p) => fs.existsSync(p));
// Scratch screenshots and downloads.
const SHOT = process.env.SHOT || path.join(os.tmpdir(), "dmsite-shot");
// Screenshots worth keeping.
const ART = process.env.ART || path.join(os.homedir(), "DMBuilds", "DMSite-shots");
// Test audio from make_test_track.py (kept out of git).
const AUDIO = process.env.AUDIO || path.join(ROOT, "tmp-audio");
// Child processes (tools/make-beatmap.js) find ffmpeg on PATH; fall back to the one npm install puts here.
const FFMPEG_DIR = path.join(__dirname, "node_modules", "ffmpeg-static");
if (fs.existsSync(path.join(FFMPEG_DIR, "ffmpeg"))) process.env.PATH += path.delimiter + FFMPEG_DIR;
fs.mkdirSync(SHOT, { recursive: true });
fs.mkdirSync(ART, { recursive: true });

const LAUNCH = {
  executablePath: CHROME,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"]
};

// 404s for the background video files are not counted as errors (bg-test.js
// blocks them on purpose to check the still stands in).
const OPTIONAL = /\/assets\/play\/genre-snob-bg/;
const expected404 = (m) => OPTIONAL.test((m.location() && m.location().url) || "");

module.exports = { ROOT, CHROME, SHOT, ART, AUDIO, LAUNCH, expected404 };
