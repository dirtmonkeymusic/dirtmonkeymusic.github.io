// The Shows page, copied from the app's Shows tab: tour dates load live from
// Bandsintown. The last good answer is kept in localStorage. If Bandsintown
// can't be reached, the page keeps the dates written in shows/index.html.
(function () {
  "use strict";

  // The Bandsintown app_id from the app (AppConfig.swift). It is a read-only key.
  var APP_ID = "058fd24518baf942ef190187dc32fd1e";
  var ARTIST = "Dirt Monkey";
  var ARTIST_PAGE = "https://www.bandsintown.com/a/1202070";
  var BASE = "https://rest.bandsintown.com/artists/" + encodeURIComponent(ARTIST);
  var CACHE_KEY = "dm.bandsintown.v1";
  var FRESH_MS = 5 * 60 * 1000;          // use the saved answer without asking again
  var STALE_MS = 7 * 24 * 60 * 60 * 1000; // still better than the fallback if Bandsintown is down
  var TIMEOUT_MS = 15000;
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  var list = document.querySelector("[data-gig-list]");
  if (!list) return;
  var statusEl = document.querySelector("[data-bit-status]");

  function now() {
    var param = new URLSearchParams(location.search).get("now");
    var at = param ? new Date(param) : new Date();
    return isNaN(at) ? new Date() : at;
  }

  function httpsUrl(value) {
    try {
      var url = new URL(String(value || ""));
      return url.protocol === "https:" ? url : null;
    } catch (e) {
      return null;
    }
  }

  // Adds trigger=track / rsvp_going / notify_me to a Bandsintown link, like the app.
  function withTrigger(link, trigger) {
    var url = httpsUrl(link) || new URL(ARTIST_PAGE);
    url.searchParams.set("trigger", trigger);
    return url.href;
  }

  // Bandsintown times are the venue's wall clock ("2026-10-31T21:00:00"), so read the parts as is.
  function parts(datetime) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(datetime || ""));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3], h = +m[4], mi = +m[5];
    return {
      year: y, month: mo, day: d,
      dow: DAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()],
      time: ((h % 12) || 12) + ":" + (mi < 10 ? "0" : "") + mi + " " + (h < 12 ? "AM" : "PM"),
      // Drop a show by midday the day after, wherever the viewer is.
      ends: Date.UTC(y, mo - 1, d + 1, 18)
    };
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function link(className, href, text, label) {
    var a = el("a", className, text);
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    if (label) a.setAttribute("aria-label", label);
    return a;
  }

  function cityLine(venue) {
    var second = venue.region || venue.country || "";
    return [venue.city, second].filter(Boolean).join(", ") || venue.location || "";
  }

  function gigRow(event) {
    var when = parts(event.datetime);
    var venue = event.venue || {};
    var place = cityLine(venue);
    var headline = String(event.title || "").trim() || venue.name || place || "Dirt Monkey";
    var offers = Array.isArray(event.offers) ? event.offers : [];
    var offer = offers.filter(function (o) { return String(o.type).toLowerCase() === "tickets"; })[0] || offers[0];
    var tickets = (offer && httpsUrl(offer.url)) || httpsUrl(event.url) || new URL(ARTIST_PAGE);
    var lineup = (event.lineup || []).filter(Boolean).join(" · ");

    var li = el("li", "gig");
    var date = el("p", "gig-date");
    date.appendChild(el("span", "gig-month", MONTHS[when.month - 1]));
    date.appendChild(document.createTextNode(" "));
    date.appendChild(el("span", "gig-day", String(when.day)));
    date.appendChild(document.createTextNode(" "));
    date.appendChild(el("span", "gig-dow", when.dow));
    li.appendChild(date);

    var body = el("div", "gig-body");
    body.appendChild(el("h3", "gig-venue", headline));
    if (place) body.appendChild(el("p", "gig-city", place));
    if (lineup) body.appendChild(el("p", "gig-lineup", lineup));
    body.appendChild(el("p", "gig-when",
      when.dow + ", " + MONTHS[when.month - 1] + " " + when.day + ", " + when.year + " · " + when.time));

    var actions = el("div", "gig-actions");
    var where = place || headline;
    actions.appendChild(link("btn btn-buy gig-tix", tickets.href, "Tickets", "Tickets for " + where + ", " + MONTHS[when.month - 1] + " " + when.day));
    if (httpsUrl(event.url)) {
      var rsvp = offers.length ? "RSVP" : "Notify me";
      actions.appendChild(link("gig-rsvp", withTrigger(event.url, offers.length ? "rsvp_going" : "notify_me"), rsvp, rsvp + " for " + where + ", " + MONTHS[when.month - 1] + " " + when.day));
    }
    body.appendChild(actions);
    li.appendChild(body);
    return li;
  }

  function upcoming(events) {
    var at = now().getTime();
    return events.filter(function (e) {
      var p = parts(e && e.datetime);
      return p && p.ends > at;
    });
  }

  function countText(n) {
    return n === 0 ? "No upcoming shows" : n === 1 ? "1 upcoming show" : n + " upcoming shows";
  }

  function renderArtist(artist) {
    if (!artist) return;
    var followers = Number(artist.tracker_count);
    if (followers > 0) {
      document.querySelector("[data-bit-followers]").textContent = followers.toLocaleString("en-US") + " followers on Bandsintown";
    }
    var photo = httpsUrl(artist.thumb_url) || httpsUrl(artist.image_url);
    if (photo) {
      var avatar = document.querySelector("[data-bit-avatar]");
      var img = new Image();
      img.onload = function () { avatar.src = photo.href; avatar.classList.add("is-photo"); };
      img.src = photo.href;
    }
    var follow = document.querySelector("[data-bit-follow]");
    if (follow && httpsUrl(artist.url)) follow.href = withTrigger(artist.url, "track");
  }

  function render(snapshot) {
    var events = upcoming(snapshot.events || []);
    var frag = document.createDocumentFragment();
    events.forEach(function (e) { frag.appendChild(gigRow(e)); });
    list.textContent = "";
    list.appendChild(frag);
    document.querySelector("[data-bit-count]").textContent = countText(events.length);
    var empty = document.querySelector("[data-shows-empty]");
    if (empty) empty.hidden = events.length > 0;
    renderArtist(snapshot.artist || (snapshot.events[0] && snapshot.events[0].artist));
  }

  // The fallback list: count what site.js left visible.
  function showFallback() {
    var left = list.querySelectorAll(".gig:not([hidden])").length;
    document.querySelector("[data-bit-count]").textContent = countText(left);
    statusEl.textContent = "Bandsintown did not answer, so these are the saved dates. ";
    statusEl.appendChild(link("text-link", ARTIST_PAGE, "See Dirt Monkey on Bandsintown"));
  }

  function readCache() {
    try {
      var saved = JSON.parse(localStorage.getItem(CACHE_KEY));
      return saved && Array.isArray(saved.events) && typeof saved.at === "number" ? saved : null;
    } catch (e) {
      return null;
    }
  }

  function writeCache(snapshot) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot)); } catch (e) { /* private mode */ }
  }

  function getJSON(url, signal) {
    return fetch(url, { signal: signal, headers: { Accept: "application/json" }, cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("Bandsintown HTTP " + r.status);
        return r.json();
      });
  }

  function download() {
    var controller = "AbortController" in window ? new AbortController() : null;
    var signal = controller ? controller.signal : undefined;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, TIMEOUT_MS);
    var q = "?app_id=" + APP_ID;
    // The artist record only adds the photo and follower count, so don't fail without it.
    var artist = getJSON(BASE + q, signal).catch(function () { return null; });
    return getJSON(BASE + "/events" + q, signal)
      .then(function (events) {
        if (!Array.isArray(events)) throw new Error("Bandsintown: " + ((events && (events.message || events.errorMessage)) || "unexpected answer"));
        return artist.then(function (a) {
          return { at: Date.now(), events: events, artist: a && a.name ? a : null };
        });
      })
      .finally(function () { clearTimeout(timer); });
  }

  var cached = readCache();
  var age = cached ? Date.now() - cached.at : Infinity;
  if (cached && age < FRESH_MS) {
    render(cached);
    list.setAttribute("data-source", "cache");
    return;
  }

  list.setAttribute("aria-busy", "true");
  download()
    .then(function (snapshot) {
      writeCache(snapshot);
      render(snapshot);
      list.setAttribute("data-source", "live");
    })
    .catch(function () {
      if (cached && age < STALE_MS) {
        render(cached);
        list.setAttribute("data-source", "stale");
      } else {
        showFallback();
        list.setAttribute("data-source", "fallback");
      }
    })
    .finally(function () { list.removeAttribute("aria-busy"); });
})();
