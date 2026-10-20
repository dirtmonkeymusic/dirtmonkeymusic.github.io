// Cloudflare Worker: the beta download log for /beta/.
// POST /log   body: JSON {kind: "download" or "feedback", name, email, platform (Mac or PC), version, plugins ("Full suite" or "Punch, Dip"), message, ts}   (sent as text/plain by js/beta.js)
// GET  /export.csv?token=ADMIN_TOKEN   every download, newest first, as CSV
// GET  /list?token=ADMIN_TOKEN         the same, as a simple HTML table
// Storage: the KV namespace bound as BETA_LOG. ADMIN_TOKEN is a Worker secret (wrangler secret put ADMIN_TOKEN).
const ORIGIN = "https://dirtmonkey.music";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const cors = { "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const clip = (s, n) => String(s || "").trim().slice(0, n);

async function all(env) {
  const rows = [];
  let cursor;
  do {
    const page = await env.BETA_LOG.list({ prefix: "dl:", cursor });
    for (const k of page.keys) { const v = await env.BETA_LOG.get(k.name, "json"); if (v) rows.push(v); }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return rows.sort((a, b) => (a.ts < b.ts ? 1 : -1));
}
const csvCell = (s) => '"' + String(s).replace(/"/g, '""') + '"';
const html = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method === "POST" && url.pathname === "/log") {
      let d;
      try { d = JSON.parse(await req.text()); } catch (e) { return new Response("bad json", { status: 400, headers: cors }); }
      const row = { ts: new Date().toISOString(), clientTs: clip(d.ts, 40), kind: d.kind === "feedback" ? "feedback" : "download", name: clip(d.name, 120), email: clip(d.email, 200).toLowerCase(), platform: d.platform === "PC" ? "PC" : d.platform === "Mac" ? "Mac" : "", version: clip(d.version, 20), plugins: clip(d.plugins, 300), message: clip(d.message, 4000) };
      if (!row.name || !EMAIL.test(row.email) || (row.kind === "download" ? !row.platform : !row.message)) return new Response("missing fields", { status: 400, headers: cors });
      await env.BETA_LOG.put("dl:" + row.ts + ":" + crypto.randomUUID().slice(0, 8), JSON.stringify(row));
      return new Response("ok", { headers: cors });
    }
    if (req.method === "GET" && (url.pathname === "/export.csv" || url.pathname === "/list")) {
      if (!env.ADMIN_TOKEN || url.searchParams.get("token") !== env.ADMIN_TOKEN) return new Response("Not allowed", { status: 403 });
      const rows = await all(env);
      if (url.pathname === "/export.csv") {
        const body = ["timestamp,kind,name,email,platform,version,plugins,message"].concat(rows.map((r) => [r.ts, r.kind, r.name, r.email, r.platform, r.version, r.plugins, r.message].map(csvCell).join(","))).join("\n") + "\n";
        return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="beta-downloads.csv"' } });
      }
      const tr = rows.map((r) => "<tr><td>" + [r.ts, r.kind, r.name, r.email, r.platform, r.version, r.plugins, r.message].map(html).join("</td><td>") + "</td></tr>").join("");
      return new Response('<!doctype html><meta name="robots" content="noindex"><title>Beta downloads</title><style>body{font:14px ui-monospace,Menlo,monospace;background:#07060a;color:#f4f0f8;padding:20px}td,th{padding:4px 10px;border-bottom:1px solid #333;text-align:left}</style><h1>Beta downloads (' + rows.length + ')</h1><table><tr><th>Time (UTC)</th><th>Kind</th><th>Name</th><th>Email</th><th>Platform</th><th>Version</th><th>Plugins</th><th>Feedback</th></tr>' + tr + "</table>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    return new Response("Not found", { status: 404 });
  }
};
