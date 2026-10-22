// "What's new" for Wonk Factory on /beta/ and /patreon/wonk-c3hbol/.
// Reads the notes array on the Wonk Factory entries in /beta/latest.json (mac first, then pc).
// beta-publish.js --plugin "Wonk Factory" --notes "a; b; c" sets it. No notes: the block stays hidden.
(function () {
  var box = document.querySelector("[data-wonk-notes]");
  if (!box) return;
  fetch("/beta/latest.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (latest) {
    var pick = function (p) { var e = ((latest[p] || {}).plugins || {})["Wonk Factory"] || {}; return Array.isArray(e.notes) && e.notes.length ? e : null; };
    var e = pick("mac") || pick("pc");
    if (!e) return;
    var ul = box.querySelector("ul");
    e.notes.slice(0, 6).forEach(function (n) {
      if (typeof n !== "string" || !n.trim()) return;
      var li = document.createElement("li");
      li.textContent = n.trim();
      ul.appendChild(li);
    });
    if (!ul.children.length) return;
    var v = box.querySelector("[data-wonk-notes-ver]");
    if (v && e.version) v.textContent = "v" + e.version;
    box.hidden = false;
  }).catch(function () {});
})();
