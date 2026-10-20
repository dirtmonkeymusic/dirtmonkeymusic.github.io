// Publish a new beta build of one plugin to /beta/ in one command.
//
//   node dev/beta-publish.js "Wonk Factory" ~/DMBuilds/_suite/work1020/pkgs/wonkfactory.pkg --version 1.0.3
//   node dev/beta-publish.js "Wonk Factory" --url "https://www.dropbox.com/scl/fi/.../Wonk%20Factory.pkg?rlkey=...&dl=0"
//   node dev/beta-publish.js list
// Add --push to commit and push the new assets/beta/content.enc to gh main (otherwise it only commits locally
// when --commit is given, and prints the push command).
//
// How it stays "always newest": the installer is copied over the same file in the Dropbox folder
// "~/Dropbox/DM Beta Builds" (DM_BETA_DIR to change it), e.g. "Wonk Factory.pkg". Dropbox keeps a file's
// shared link when the file is replaced, so the Download link never changes. The link (made once per
// plugin with --url) and the version live in dev/beta-builds.local.json (local only), and only ever
// reach the site inside the encrypted beta content.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { PLUGINS, BUILDS, loadBuilds, rebuild } = require("./beta-render");

const ROOT = path.join(__dirname, "..");
const DIR = process.env.DM_BETA_DIR || path.join(os.homedir(), "Dropbox", "DM Beta Builds");

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
}
// Dropbox share links download directly with dl=1.
function directLink(url) {
  const u = new URL(url);
  if (/(^|\.)dropbox\.com$/.test(u.hostname)) u.searchParams.set("dl", "1");
  return u.toString();
}
function git(...a) { return execFileSync("git", a, { cwd: ROOT, stdio: ["ignore", "pipe", "inherit"] }).toString().trim(); }

(async () => {
  const [plugin, maybeFile] = process.argv.slice(2);
  const builds = loadBuilds();
  if (!plugin || plugin === "list") {
    for (const n of PLUGINS) {
      const b = builds[n];
      console.log(n.padEnd(14) + (b ? "v" + b.version + "  " + b.date + "  " + (b.url ? "link set" : "NO LINK YET") : "coming soon"));
    }
    return;
  }
  if (!PLUGINS.includes(plugin)) throw new Error("Unknown plugin " + plugin + ". One of: " + PLUGINS.join(", "));
  const b = builds[plugin] || {};
  const file = maybeFile && !maybeFile.startsWith("--") ? maybeFile : null;
  const version = arg("--version");
  const url = arg("--url");
  if (file) {
    if (!version || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Give the new version: --version 1.2.3");
    if (!fs.existsSync(file)) throw new Error("No file at " + file);
    fs.mkdirSync(DIR, { recursive: true });
    const dest = path.join(DIR, plugin + path.extname(file));
    fs.copyFileSync(file, dest);
    b.version = version;
    b.size = fs.statSync(dest).size;
    b.date = new Date().toISOString().slice(0, 10);
    b.file = dest;
    console.log("Copied to " + dest + " (" + Math.round(b.size / 1e6) + " MB). Dropbox uploads it in the background.");
  }
  if (url) b.url = directLink(url);
  if (!b.version) throw new Error("No build yet for " + plugin + ". Give a file and --version first.");
  builds[plugin] = b;
  fs.writeFileSync(BUILDS, JSON.stringify(builds, null, 2) + "\n");
  if (!b.url) {
    console.log("\nOne-time step for " + plugin + ": in Dropbox, open \"DM Beta Builds\", click Share on \"" + path.basename(b.file || plugin) + "\", copy the link, then run:\n  node dev/beta-publish.js \"" + plugin + "\" --url \"<the link>\"\nUntil then the card stays \"Download coming soon\".");
  }
  await rebuild();
  if (process.argv.includes("--commit") || process.argv.includes("--push")) {
    git("add", "assets/beta/content.enc");
    git("commit", "-m", "Beta: " + plugin + " v" + b.version);
    console.log("Committed: " + git("log", "--oneline", "-1"));
  }
  if (process.argv.includes("--push")) {
    git("fetch", "gh");
    git("merge", "--ff-only", "gh/main");
    git("push", "gh", "HEAD:main");
    console.log("Pushed. /beta/ shows " + plugin + " v" + b.version + " in about a minute.");
  } else {
    console.log("Not pushed. To go live: node dev/beta-publish.js \"" + plugin + "\" --push   (or commit assets/beta/content.enc and push)");
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
