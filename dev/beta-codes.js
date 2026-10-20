// Invite codes for the hidden beta page (/beta/).
// The beta content (dev/beta-content.local.html, local only) is encrypted with AES-GCM under one
// random content key into assets/beta/content.enc. Each invite code gets its own copy of that key,
// wrapped with a key made from the code (PBKDF2-SHA256, per-code salt), in beta/keys.json.
// keys.json is keyed by a slow hash of the code (PBKDF2 with a shared salt), so it holds no names
// and no codes. Names, codes and the content key live only in dev/beta-codes.local.json (gitignored).
//
//   node dev/beta-codes.js add "Name"     new code for Name (prints it)
//   node dev/beta-codes.js list           names and codes
//   node dev/beta-codes.js revoke "Name"  removes Name's code from keys.json
//   node dev/beta-codes.js rebuild        re-encrypts the content after you edit it
//   node dev/beta-codes.js rotate         new content key for everyone left (use after a revoke)
// Then commit beta/keys.json and assets/beta/content.enc, and push.
const fs = require("fs");
const path = require("path");
const { webcrypto } = require("crypto");
const subtle = webcrypto.subtle;

const ROOT = path.join(__dirname, "..");
const LOCAL = path.join(__dirname, "beta-codes.local.json");
const KEYS = path.join(ROOT, "beta", "keys.json");
const BLOB = path.join(ROOT, "assets", "beta", "content.enc");
const ITER = 200000;
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

const b64 = (u8) => Buffer.from(u8).toString("base64");
const unb64 = (s) => new Uint8Array(Buffer.from(s, "base64"));
const rand = (n) => webcrypto.getRandomValues(new Uint8Array(n));
const hex = (u8) => Buffer.from(u8).toString("hex");

// Same as js/beta.js: upper case, letters and digits only, "MONKEY-" in front.
function normalize(code) {
  let s = String(code).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.indexOf("MONKEY") === 0) s = s.slice(6);
  return "MONKEY-" + s;
}

async function pbkdf2(code, salt, bits) {
  const base = await subtle.importKey("raw", new TextEncoder().encode(normalize(code)), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITER }, base, bits));
}

async function aes(raw, use) {
  return subtle.importKey("raw", raw, "AES-GCM", false, [use]);
}

function loadLocal() {
  if (fs.existsSync(LOCAL)) return JSON.parse(fs.readFileSync(LOCAL, "utf8"));
  return { contentKey: b64(rand(32)), testers: [] };
}
function saveLocal(local) { fs.writeFileSync(LOCAL, JSON.stringify(local, null, 2) + "\n"); }
function loadKeys() {
  if (fs.existsSync(KEYS)) return JSON.parse(fs.readFileSync(KEYS, "utf8"));
  return { v: 1, iterations: ITER, lookupSalt: b64(rand(16)), keys: {} };
}
function saveKeys(keys) {
  fs.mkdirSync(path.dirname(KEYS), { recursive: true });
  fs.writeFileSync(KEYS, JSON.stringify(keys, null, 2) + "\n");
}

async function entryFor(code, contentKey, keys) {
  const id = hex(await pbkdf2(code, unb64(keys.lookupSalt), 128));
  const salt = rand(16), iv = rand(12);
  const wrapKey = await aes(await pbkdf2(code, salt, 256), "encrypt");
  const wrapped = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, wrapKey, unb64(contentKey)));
  return [id, { salt: b64(salt), iv: b64(iv), key: b64(wrapped) }];
}

async function rebuild(local) {
  // The cards and the encryption live in dev/beta-render.js (shared with dev/beta-publish.js).
  await require("./beta-render").rebuild(local.contentKey);
}

function newCode(taken) {
  for (;;) {
    const r = rand(6);
    const code = "MONKEY-" + [...r].map((b) => ALPHABET[b % ALPHABET.length]).join("");
    if (!taken.has(code)) return code;
  }
}

(async () => {
  const [cmd, name] = process.argv.slice(2);
  const fresh = !fs.existsSync(LOCAL);
  const local = loadLocal();
  const keys = loadKeys();
  if (cmd === "add") {
    if (!name) throw new Error('Usage: node dev/beta-codes.js add "Name"');
    if (local.testers.some((t) => t.name === name)) throw new Error(name + " already has a code. Revoke it first.");
    const code = newCode(new Set(local.testers.map((t) => t.code)));
    const [id, entry] = await entryFor(code, local.contentKey, keys);
    keys.keys[id] = entry;
    local.testers.push({ name, code, id, added: new Date().toISOString().slice(0, 10) });
    saveKeys(keys);
    saveLocal(local);
    if (fresh || !fs.existsSync(BLOB)) await rebuild(local);
    console.log(name + ": " + code);
  } else if (cmd === "list") {
    local.testers.forEach((t) => console.log(t.name + "\t" + t.code + "\t" + t.added));
    if (!local.testers.length) console.log("No codes yet.");
  } else if (cmd === "revoke") {
    const t = local.testers.find((x) => x.name === name);
    if (!t) throw new Error("No code for " + name);
    delete keys.keys[t.id];
    local.testers = local.testers.filter((x) => x !== t);
    saveKeys(keys);
    saveLocal(local);
    console.log("Revoked " + name + ". To lock out anyone who already unlocked with it, run: node dev/beta-codes.js rotate");
  } else if (cmd === "rebuild") {
    saveLocal(local);
    await rebuild(local);
  } else if (cmd === "rotate") {
    local.contentKey = b64(rand(32));
    keys.lookupSalt = keys.lookupSalt || b64(rand(16));
    keys.keys = {};
    for (const t of local.testers) {
      const [id, entry] = await entryFor(t.code, local.contentKey, keys);
      keys.keys[id] = entry;
      t.id = id;
    }
    saveKeys(keys);
    saveLocal(local);
    await rebuild(local);
    console.log("New content key. Rewrapped " + local.testers.length + " codes.");
  } else {
    console.log('Usage: node dev/beta-codes.js add "Name" | list | revoke "Name" | rebuild | rotate');
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
