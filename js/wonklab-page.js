// Wonk Lab only. Loaded after js/site.js so the rendered Demo buttons can be relabeled.
(function () {
  Array.prototype.forEach.call(document.querySelectorAll("a.btn-demo"), function (btn) {
    var label = btn.getAttribute("aria-label") || "";
    if (btn.textContent.trim() === "Download Demo" || /^Download Demo:/i.test(label)) {
      btn.textContent = "Download 7-day demo";
      if (/^Download Demo:/i.test(label)) {
        btn.setAttribute("aria-label", label.replace(/^Download Demo:/i, "Download 7-day demo:"));
      } else {
        btn.setAttribute("aria-label", "Download 7-day demo");
      }
    }
  });
})();
