// Laylo Drop embeds (the "Dirt Monkey Website" Drop, so Laylo counts signups
// from this site). The Drop iframe only shows its form once Laylo's SDK on this
// page hands it the Drop, and the SDK only does that if it is already listening
// when the iframe starts. So the SDK loads first (without holding up the page),
// then each iframe[data-drop-src] gets its src.
(function () {
  "use strict";
  var frames = document.querySelectorAll("iframe[data-drop-src]");
  if (!frames.length) return;
  function go() {
    for (var i = 0; i < frames.length; i++) {
      if (!frames[i].getAttribute("src")) frames[i].src = frames[i].getAttribute("data-drop-src");
    }
  }
  var sdk = document.createElement("script");
  sdk.id = "laylo-sdk";
  sdk.src = "https://embed.laylo.com/laylo-sdk.js";
  sdk.async = true;
  sdk.onload = sdk.onerror = go;
  document.head.appendChild(sdk);
})();
