// Builds and encrypts the beta page content (/beta/).
// The source is dev/beta-content.local.html (local only). Its <!-- BETA-CARDS --> line becomes one
// card per plugin, using dev/beta-builds.local.json (local only): a plugin with a build gets its
// version and a Download button, the rest say "Download coming soon". The result is AES-GCM
// encrypted with the content key from dev/beta-codes.local.json into assets/beta/content.enc.
// Used by dev/beta-codes.js (rebuild) and dev/beta-publish.js.
const fs = require("fs");
const path = require("path");
const { webcrypto } = require("crypto");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(__dirname, "beta-content.local.html");
const BUILDS = process.env.DM_BETA_BUILDS || path.join(__dirname, "beta-builds.local.json");
const LOCAL = path.join(__dirname, "beta-codes.local.json");
const BLOB = path.join(ROOT, "assets", "beta", "content.enc");
// The beta lineup, in page order. The End is out.
const PLUGINS = ["Punch", "Updown", "Wonk Factory", "Spaces", "Dip", "Meter", "Frequalizer", "Fizz", "Slammer"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function loadBuilds() {
  return fs.existsSync(BUILDS) ? JSON.parse(fs.readFileSync(BUILDS, "utf8")) : {};
}

function card(name, build) {
  if (!build || !build.url) {
    return `          <li class="beta-card">
            <h3 class="beta-card-name">${esc(name)}</h3>
            <a class="btn btn-demo beta-download is-soon" href="#" aria-disabled="true" data-beta-download="${esc(name)}">Download coming soon</a>
          </li>`;
  }
  const d = new Date(build.date + "T12:00:00");
  const when = MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  const size = build.size ? " · " + Math.max(1, Math.round(build.size / 1e6)) + " MB" : "";
  return `          <li class="beta-card is-ready">
            <h3 class="beta-card-name">${esc(name)}</h3>
            <p class="beta-card-ver">v${esc(build.version)} · ${when}${size}</p>
            <a class="btn btn-demo beta-download" href="${esc(build.url)}" rel="noopener" data-beta-download="${esc(name)}" data-beta-version="${esc(build.version)}">Download</a>
          </li>`;
}

function render(builds) {
  const src = fs.readFileSync(SOURCE, "utf8");
  if (!src.includes("<!-- BETA-CARDS -->")) throw new Error("dev/beta-content.local.html has no <!-- BETA-CARDS --> line");
  return src.replace("<!-- BETA-CARDS -->", PLUGINS.map((n) => card(n, (builds || loadBuilds())[n])).join("\n"));
}

async function encrypt(contentKeyB64, html) {
  const subtle = webcrypto.subtle;
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const key = await subtle.importKey("raw", Buffer.from(contentKeyB64, "base64"), "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(html)));
  fs.mkdirSync(path.dirname(BLOB), { recursive: true });
  fs.writeFileSync(BLOB, Buffer.concat([Buffer.from(iv), Buffer.from(ct)]));
}

// Re-encrypt with the current content key (from dev/beta-codes.local.json unless given).
async function rebuild(contentKeyB64) {
  const key = contentKeyB64 || JSON.parse(fs.readFileSync(LOCAL, "utf8")).contentKey;
  await encrypt(key, render());
  console.log("Encrypted the beta content to assets/beta/content.enc");
}

module.exports = { PLUGINS, BUILDS, loadBuilds, render, rebuild };
