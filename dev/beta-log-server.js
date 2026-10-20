// Local stand-in for dev/beta-log-worker (same API) so /beta/ downloads can be tested on the Mac.
// node dev/beta-log-server.js [port]   (default 47330). Writes dev/beta-log.local.jsonl. Token: local.
const http = require("http");
const fs = require("fs");
const path = require("path");
const PORT = Number(process.argv[2] || 47330);
const FILE = path.join(__dirname, "beta-log.local.jsonl");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const rows = () => (fs.existsSync(FILE) ? fs.readFileSync(FILE, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []).reverse();
http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
  if (req.method === "POST" && url.pathname === "/log") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let d; try { d = JSON.parse(body); } catch (e) { return res.writeHead(400, cors).end("bad json"); }
      const row = { ts: new Date().toISOString(), clientTs: String(d.ts || ""), kind: d.kind === "feedback" ? "feedback" : "download", name: String(d.name || "").trim(), email: String(d.email || "").trim().toLowerCase(), platform: d.platform === "PC" ? "PC" : d.platform === "Mac" ? "Mac" : "", version: String(d.version || ""), message: String(d.message || "").trim().slice(0, 4000) };
      if (!row.name || !EMAIL.test(row.email) || (row.kind === "download" ? !row.platform : !row.message)) return res.writeHead(400, cors).end("missing fields");
      fs.appendFileSync(FILE, JSON.stringify(row) + "\n");
      res.writeHead(200, cors).end("ok");
    });
    return;
  }
  if (url.searchParams.get("token") !== "local") return res.writeHead(403).end("Not allowed");
  if (url.pathname === "/export.csv") {
    const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
    return res.writeHead(200, { "Content-Type": "text/csv" }).end(["timestamp,kind,name,email,platform,version,message"].concat(rows().map((r) => [r.ts, r.kind, r.name, r.email, r.platform, r.version, r.message].map(q).join(","))).join("\n") + "\n");
  }
  if (url.pathname === "/list") return res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(rows(), null, 1));
  res.writeHead(404).end();
}).listen(PORT, "127.0.0.1", () => console.log("beta log on http://127.0.0.1:" + PORT));
