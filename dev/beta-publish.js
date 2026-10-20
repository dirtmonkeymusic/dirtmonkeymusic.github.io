// Publish a new beta build to /beta/ in one command.
//
//   node dev/beta-publish.js --platform mac path/to/DirtMonkeyBeta.pkg --version 1.0.3 --push
//   node dev/beta-publish.js --platform pc  path/to/DirtMonkeyBeta.zip --version 1.0.3 --push
//   node dev/beta-publish.js --platform mac --url "<Dropbox share link>"   (once per platform)
//   node dev/beta-publish.js list
// The installer is copied over the same file in "~/Dropbox/DM Beta Builds" (DM_BETA_DIR to change it):
// "Dirt Monkey Beta (Mac).pkg" or "Dirt Monkey Beta (PC).zip" (the extension follows your file).
// Dropbox keeps a file's share link when the file is replaced, so the link never changes.
// beta/latest.json gets the new version, date and size (and the link), then is committed.
// --push also fetches, fast-forwards and pushes to gh main. Without it, nothing leaves the Mac.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const LATEST = process.env.DM_BETA_LATEST || path.join(ROOT, "beta", "latest.json");
const DIR = process.env.DM_BETA_DIR || path.join(os.homedir(), "Dropbox", "DM Beta Builds");
const NAMES = { mac: "Mac", pc: "PC" };

function arg(n) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; }
function directLink(url) {
  const u = new URL(url);
  if (/(^|\.)dropbox\.com$/.test(u.hostname)) u.searchParams.set("dl", "1");
  return u.toString();
}
function git(...a) { return execFileSync("git", a, { cwd: ROOT, stdio: ["ignore", "pipe", "inherit"] }).toString().trim(); }

const latest = JSON.parse(fs.readFileSync(LATEST, "utf8"));
if (process.argv[2] === "list" || process.argv.length <= 2) {
  for (const p of ["mac", "pc"]) {
    const b = latest[p] || {};
    console.log(NAMES[p].padEnd(4) + (b.version ? "v" + b.version + "  " + b.date + "  " + (b.url ? "link set" : "NO LINK YET") : "coming soon"));
  }
  process.exit(0);
}
const platform = (arg("--platform") || "").toLowerCase();
if (!NAMES[platform]) { console.error("Use --platform mac or --platform pc"); process.exit(1); }
const known = new Set(["--platform", "--version", "--url"]);
const file = process.argv.slice(2).find((a, i, all) => !a.startsWith("--") && !known.has(all[i - 1]));
const version = arg("--version");
const url = arg("--url");
const b = latest[platform] || {};
if (file) {
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) { console.error("Give the new version: --version 1.2.3"); process.exit(1); }
  if (!fs.existsSync(file)) { console.error("No file at " + file); process.exit(1); }
  fs.mkdirSync(DIR, { recursive: true });
  const dest = path.join(DIR, "Dirt Monkey Beta (" + NAMES[platform] + ")" + path.extname(file));
  fs.copyFileSync(file, dest);
  b.version = version;
  b.size = fs.statSync(dest).size;
  b.date = new Date().toISOString().slice(0, 10);
  console.log("Copied to " + dest + " (" + Math.round(b.size / 1e6) + " MB). Dropbox uploads it in the background.");
  if (b.url) console.log("Wait for Dropbox to finish syncing before you tell testers.");
}
if (url) b.url = directLink(url);
latest[platform] = b;
fs.writeFileSync(LATEST, JSON.stringify(latest, null, 2) + "\n");
console.log("beta/latest.json: " + NAMES[platform] + " v" + (b.version || "?") + (b.url ? "" : " (no link yet, the button says Coming soon)"));
if (!b.url) console.log('One-time step: in Dropbox, open "DM Beta Builds", Share the ' + NAMES[platform] + ' file, copy the link, then run:\n  node dev/beta-publish.js --platform ' + platform + ' --url "<the link>"');
if (process.argv.includes("--push") || process.argv.includes("--commit")) {
  git("add", path.relative(ROOT, LATEST));
  git("commit", "-m", "Beta: " + NAMES[platform] + " v" + b.version);
  console.log("Committed: " + git("log", "--oneline", "-1"));
}
if (process.argv.includes("--push")) {
  git("fetch", "gh");
  git("merge", "--ff-only", "gh/main");
  git("push", "gh", "HEAD:main");
  console.log("Pushed. /beta/ shows " + NAMES[platform] + " v" + b.version + " in about a minute.");
} else {
  console.log("Not pushed. Add --push to go live.");
}
