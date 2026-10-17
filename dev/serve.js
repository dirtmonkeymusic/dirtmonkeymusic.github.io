// A static server for the site with Range requests, so video seeking works
// like it does on the real host (python's http.server cannot do ranges).
// node serve.js [port]   (default 47322)
const http = require("http");
const fs = require("fs");
const path = require("path");
const { ROOT } = require("./env");

const PORT = Number(process.argv[2] || process.env.PORT || 47322);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
  ".m4a": "audio/mp4", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".webm": "video/webm", ".txt": "text/plain", ".xml": "application/xml",
  ".woff2": "font/woff2"
};

http.createServer((req, res) => {
  let file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) {
    res.writeHead(404, { "Content-Type": "text/html" });
    return res.end(fs.readFileSync(path.join(ROOT, "404.html")));
  }
  const size = fs.statSync(file).size;
  const head = { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Accept-Ranges": "bytes" };
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
  if (m) {
    const start = m[1] ? Number(m[1]) : size - Number(m[2]);
    const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start >= size) return res.writeHead(416, { "Content-Range": "bytes */" + size }).end();
    res.writeHead(206, { ...head, "Content-Range": "bytes " + start + "-" + end + "/" + size, "Content-Length": end - start + 1 });
    if (req.method === "HEAD") return res.end();
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...head, "Content-Length": size });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(file).pipe(res);
}).listen(PORT, "127.0.0.1", () => console.log("http://127.0.0.1:" + PORT + "/"));
