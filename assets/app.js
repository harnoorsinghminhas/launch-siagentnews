/* SI Agent News · siagentnews.com
   Every node is built with createElement/textContent: no innerHTML, so the page runs under
   require-trusted-types-for 'script'. Stories are server-rendered in index.html. */
(function () {
"use strict";

var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var NS = "http://www.w3.org/2000/svg";
var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var store = {
  get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* private mode: fine */ } },
  del: function (k) { try { window.localStorage.removeItem(k); } catch (e) { /* fine */ } }
};
function h(tag, attrs, kids) {
  var el = document.createElement(tag);
  if (attrs) Object.keys(attrs).forEach(function (k) {
    var v = attrs[k];
    if (v == null || v === false) return;
    if (k === "class") el.className = v;
    else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : String(v));
  });
  (kids || []).forEach(function (c) {
    if (c == null || c === false) return;
    el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  });
  return el;
}
function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
function icon(id) {
  var s = document.createElementNS(NS, "svg"), u = document.createElementNS(NS, "use");
  s.setAttribute("aria-hidden", "true"); u.setAttribute("href", "#" + id); s.appendChild(u); return s;
}

/* ---------- sliders: snap scroll + buttons + arrow keys ---------- */
function slider(box, onChange) {
  var cur = 0, raf = 0;
  function items() { return Array.prototype.slice.call(box.children).filter(function (c) { return c.nodeType === 1 && !c.hidden; }); }
  function index() {
    var it = items(); if (!it.length) return 0;
    var base = it[0].offsetLeft, best = 0, d = Infinity;
    it.forEach(function (c, i) { var x = Math.abs(c.offsetLeft - base - box.scrollLeft); if (x < d) { d = x; best = i; } });
    if (box.scrollLeft + box.clientWidth >= box.scrollWidth - 2) best = it.length - 1;
    return best;
  }
  function go(i) {
    var it = items(); if (!it.length) return;
    i = Math.max(0, Math.min(it.length - 1, i));
    box.scrollTo({ left: it[i].offsetLeft - it[0].offsetLeft, behavior: REDUCED ? "auto" : "smooth" });
    if (i !== cur) { cur = i; if (onChange) onChange(cur, it.length); }
  }
  box.addEventListener("scroll", function () {
    if (raf) return;
    raf = window.requestAnimationFrame(function () { raf = 0; var i = index(); if (i !== cur) { cur = i; if (onChange) onChange(cur, items().length); } });
  }, { passive: true });
  box.addEventListener("keydown", function (e) {
    if (e.target !== box) return;
    if (e.key === "ArrowRight") { go(index() + 1); e.preventDefault(); }
    if (e.key === "ArrowLeft") { go(index() - 1); e.preventDefault(); }
  });
  return { go: go, index: index, count: function () { return items().length; },
           reset: function () { cur = 0; box.scrollTo({ left: 0 }); if (onChange) onChange(0, items().length); } };
}
function wireCtrl(box, prev, next, count, label) {
  var sl = slider(box, upd);
  function upd(i, n) {
    n = n == null ? sl.count() : n; i = i == null ? sl.index() : i;
    count.textContent = n ? (i + 1) + " / " + n : "";
    prev.disabled = i <= 0; next.disabled = i >= n - 1;
  }
  prev.addEventListener("click", function () { sl.go(sl.index() - 1); });
  next.addEventListener("click", function () { sl.go(sl.index() + 1); });
  upd(0, sl.count());
  return { sl: sl, upd: upd };
}

/* ---------- stories: filter by stamp ---------- */
var stories = wireCtrl($("#storyRow"), $("#stPrev"), $("#stNext"), $("#stCount"));
var vTabs = $$(".tab", $("#vTabs"));
vTabs.forEach(function (b) {
  b.addEventListener("click", function () {
    var f = b.getAttribute("data-f");
    vTabs.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    $$(".story", $("#storyRow")).forEach(function (c) { c.hidden = !(f === "all" || c.getAttribute("data-v") === f); });
    stories.sl.reset();
  });
});

/* ---------- call it: private guesses, saved on this device only ---------- */
var CK = "sian_calls";
function loadCalls() { try { var o = JSON.parse(store.get(CK) || "{}"); return o && typeof o === "object" && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } }
var calls = loadCalls();
var callRow = $("#callRow");
wireCtrl(callRow, $("#cPrev"), $("#cNext"), $("#cCount"));
function refreshCalls() {
  var n = Object.keys(calls).filter(function (k) { return calls[k] && calls[k].g; }).length;
  $("#openN").textContent = n; $("#openS").textContent = n === 1 ? "" : "s";
}
$$(".callc", callRow).forEach(function (card) {
  var id = card.getAttribute("data-id"), msg = $(".saved", card);
  var saved = calls[id];
  if (saved) {
    var g = $('input[name="g-' + id + '"][value="' + saved.g + '"]', card); if (g) g.checked = true;
    var c = $('input[name="c-' + id + '"][value="' + saved.c + '"]', card); if (c) c.checked = true;
    msg.textContent = "Saved on this device.";
  }
  function save() {
    var g = $('input[name="g-' + id + '"]:checked', card), c = $('input[name="c-' + id + '"]:checked', card);
    if (!g) return;
    calls[id] = { g: g.value, c: c ? c.value : "1", t: new Date().toISOString().slice(0, 10) };
    store.set(CK, JSON.stringify(calls));
    msg.textContent = "Saved on this device. Private. Scored when it resolves.";
    refreshCalls();
  }
  $$("input", card).forEach(function (i) { i.addEventListener("change", save); });
});
$("#clearCalls").addEventListener("click", function () {
  calls = {}; store.del(CK);
  $$(".callc", callRow).forEach(function (card) {
    $$('input[name^="g-"]', card).forEach(function (i) { i.checked = false; });
    var c1 = $('input[name^="c-"][value="1"]', card); if (c1) c1.checked = true;
    $(".saved", card).textContent = "";
  });
  refreshCalls();
});
refreshCalls();

/* ---------- sign-up: email first, optional profile, then the welcome gift ---------- */
var API = "https://acp9reat3l.execute-api.us-east-1.amazonaws.com/signal/request-link";
var SITE = "siagentnews.com";
var LANDING_RE = /^\/[A-Za-z0-9._~!$&'()*+,;=:@%\/-]{0,199}$/;   // same shape the API accepts
var EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;
var ROLES = ["Journalist or researcher", "Team manager", "Marketing lead", "Founder or CEO", "Engineering lead", "Security lead", "Finance and investing", "Policy and legal", "Product manager"];
function payload(email, hp, profile) {
  // The request-link schema is strict: only email, hp, site, landing_path, tz, query, profile are sent.
  var b = { email: email, hp: hp || "", site: SITE };
  if (LANDING_RE.test(location.pathname)) b.landing_path = location.pathname;
  try { var tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz && tz.length <= 40) b.tz = tz; } catch (e) { /* no zone: the API falls back */ }
  var q = location.search;
  if (q && q.length <= 2048 && /[?&](utm_[a-z]+|ref)=/i.test(q)) b.query = q;   // campaign attribution only
  if (profile) b.profile = profile;
  return b;
}
function post(body) {
  var ctl = window.AbortController ? new AbortController() : null, timer = ctl ? window.setTimeout(function () { ctl.abort(); }, 15000) : 0;
  return fetch(API, { method: "POST", mode: "cors", credentials: "omit", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
    .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { window.clearTimeout(timer); return { status: r.status, code: j && j.error }; }); },
          function () { window.clearTimeout(timer); return { status: 0, code: "network" }; });
}
function errText(res) {
  var s = res.status, c = res.code;
  if (s === 400 && c === "invalid_email") return "That email address doesn't look right. Check it for a typo?";
  if (s === 400 && c === "invalid_profile") return "We couldn't save that. Letters, spaces, hyphens and apostrophes work best in a name.";
  if (s === 400) return "Something in the form didn't go through. Please try again.";
  if (s === 415) return "Your browser sent the form in a format we can't read. Refresh the page and try again.";
  if (s === 429) return "Lots of sign-ups from your network just now. Wait a minute, then try again.";
  if (s === 403) return "Sign-up only works on our own site. Open siagentnews.com and try again.";
  if (s >= 500) return "Our sign-up desk hit a snag. Please try again in a moment.";
  return "We couldn't reach the sign-up desk. Check your connection and try again.";
}
function validEmail(v) { return v.length <= 254 && EMAIL_RE.test(v); }

$$(".js-join").forEach(function (form, n) {
  var em = form.querySelector('input[type="email"]'), hp = form.querySelector('input[name="website"]'), err = $(".js-err", form);
  var btn = form.querySelector('button[type="submit"]'), flow = $(".js-flow", form.parentNode), busy = false;
  em.addEventListener("blur", function () {   // inline validation on blur, never only on submit
    var v = em.value.trim();
    if (v && !validEmail(v)) { err.textContent = "That email address doesn't look right yet."; em.setAttribute("aria-invalid", "true"); }
    else { err.textContent = ""; em.removeAttribute("aria-invalid"); }
  });
  em.addEventListener("input", function () { if (em.getAttribute("aria-invalid") && validEmail(em.value.trim())) { err.textContent = ""; em.removeAttribute("aria-invalid"); } });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    var v = em.value.trim();
    if (!validEmail(v)) { err.textContent = "Please enter your email address, like name@example.com."; em.setAttribute("aria-invalid", "true"); em.focus(); return; }
    busy = true; btn.disabled = true; var label = btn.textContent; btn.textContent = "Sending…"; err.textContent = "";
    post(payload(v, hp ? hp.value : "")).then(function (res) {
      busy = false; btn.disabled = false; btn.textContent = label;
      if (res.status === 200) { form.hidden = true; stepProfile(flow, v, n); return; }
      err.textContent = errText(res);
      if (res.code === "invalid_email") { em.setAttribute("aria-invalid", "true"); em.focus(); }
    });
  });
});

function stepProfile(flow, email, n) {
  flow.hidden = false; clear(flow);
  var head = h("h3", { tabindex: "-1" }, ["You're in. Make it yours?"]);
  var name = h("input", { id: "nm" + n, name: "name", type: "text", autocomplete: "given-name", maxlength: "40" });
  var sel = h("select", { id: "rl" + n, name: "role" }, [h("option", { value: "" }, ["Choose from the list"])].concat(ROLES.map(function (r) { return h("option", { value: r }, [r]); })));
  var cad = [["daily", "Every weekday"], ["weekly", "Weekly case file"]].map(function (c) {
    return h("label", { class: "chk" }, [h("input", { type: "radio", name: "cadence" + n, value: c[0] }), h("span", {}, [c[1]])]);
  });
  var perr = h("p", { class: "err", role: "alert" });
  var save = h("button", { class: "btn sm", type: "submit" }, ["Save and pick my gift"]);
  var skip = h("button", { class: "notnow", type: "button" }, ["Not now"]);
  var f = h("form", { novalidate: true }, [
    h("div", { class: "f-grid" }, [
      h("div", {}, [h("label", { for: "nm" + n }, ["First name"]), name]),
      h("div", {}, [h("label", { for: "rl" + n }, ["Your role"]), sel]),
      h("fieldset", { class: "seg-pick f-full" }, [h("legend", { class: "f-l" }, ["How often"])].concat(cad))
    ]),
    perr,
    h("div", { class: "f-actions" }, [save, skip])
  ]);
  flow.appendChild(h("p", { class: "ok-line", role: "status" }, [h("span", {}, ["Check your inbox: we sent a link to confirm ", h("b", {}, [email]), ". Tap it to start your free weekly case file."])]));
  flow.appendChild(head);
  flow.appendChild(h("p", { class: "s" }, ["All optional. Skip anything."]));
  flow.appendChild(f);
  head.focus();
  skip.addEventListener("click", function () { stepGift(flow, n, false); });
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var prof = {}, nm = name.value.trim(), c = f.querySelector('input[name="cadence' + n + '"]:checked');
    if (nm) prof.name = nm;
    if (sel.value && ROLES.indexOf(sel.value) > -1) prof.role = sel.value;
    if (c) prof.cadence = c.value;
    if (!Object.keys(prof).length) { stepGift(flow, n, false); return; }
    if (/[<>]/.test(nm)) { perr.textContent = "Please leave out < and > in your name."; return; }
    save.disabled = true; perr.textContent = "";
    post(payload(email, "", prof)).then(function (res) {
      save.disabled = false;
      if (res.status === 200) stepGift(flow, n, true);
      else perr.textContent = errText(res);
    });
  });
}

/* gifts: icons only here (the mascot lives on About, Submit a rumor and 404); all are delivered by email */
var GIFTS = [
  { id: "alien", t: "Your own alien", ic: "i-star", d: "Your colour, your name on a badge. A profile picture that levels up." },
  { id: "wall", t: "Alien-crew wallpaper pack", ic: "i-img", d: "Phone and desktop sizes." },
  { id: "song", t: "Your theme song", ic: "i-note", d: "An original track with your name in it. Yours once, to keep." },
  { id: "audio", t: "A 3-minute audio brief", ic: "i-wave", d: "On a topic you pick, in our broadcast voice." },
  { id: "chapter", t: "A free book chapter", ic: "i-book", d: "Your pick from the 21-book library." }
];
function stepGift(flow, n, saved) {
  clear(flow);
  var head = h("h3", { tabindex: "-1" }, ["Pick your welcome gift."]);
  var out = h("div", { class: "gift-out", "aria-live": "polite" });
  var row = h("div", { class: "snap gift-row", role: "radiogroup", "aria-label": "Welcome gifts", tabindex: "-1" });
  GIFTS.forEach(function (g) {
    var inp = h("input", { type: "radio", name: "gift" + n, value: g.id });
    inp.addEventListener("change", function () {
      store.set("sian_gift", g.id);
      out.textContent = "Chosen: " + g.t + ". It arrives by email once you confirm your address. You can pick another any time before then.";
    });
    row.appendChild(h("label", { class: "gcard" }, [inp, h("span", { class: "gc" }, [h("span", { class: "art" }, [icon(g.ic)]), h("b", {}, [g.t]), h("span", { class: "when" }, ["Made for you"]), h("span", { class: "d" }, [g.d])])]));
  });
  if (saved) flow.appendChild(h("p", { class: "ok-line", role: "status" }, [h("span", {}, ["Saved. We sent you a fresh confirm link, so tap the newest email."])]));
  flow.appendChild(head);
  flow.appendChild(h("p", { class: "s" }, ["One now, on us. Every extra newsletter you join later unlocks another, like stickers."]));
  flow.appendChild(row);
  flow.appendChild(out);
  flow.appendChild(h("p", { class: "unlocks" }, ["At 1,000 members, a bonus drop for everyone. At 10,000, a bigger one. No random prizes: every drop goes to every member."]));
  flow.appendChild(h("div", { class: "f-actions" }, [h("a", { class: "btn sm", href: "#rumor" }, ["Read the rumor of the week"]), h("a", { class: "notnow", href: "#plans" }, ["See Pro, $7.99 founding"])]));
  head.focus();
}

/* ---------- reservation checkout preview: one screen, four lines, fixed order ---------- */
var INSIDER = "Reservation holders are insiders: first access to new features, products and prices, sneak peeks by email, and notes from the build room.";
var TIERS = {
  pro: { n: "Pro", get: ["Every case file in full: who reports it, how many outlets, what settles it", "The full hourly radio-style brief", "Three lanes in full text, plus your call-it history"], list: "$9.99/mo", found: "$7.99/mo", yr: "$99/yr at launch, $79/yr founding", save: "$2/mo · $24/yr · 20%", dep: "$9.99" },
  max: { n: "MAX", get: ["Everything in Pro, every lane in full text", "Morning and evening deep dives (learning, no news)", "All 24 white papers and the member forum"], list: "$19.99/mo", found: "$14.99/mo", yr: "$199/yr at launch, $149/yr founding", save: "$5/mo · $60/yr · 25%", dep: "$29" },
  ultra: { n: "Ultra", get: ["Everything in MAX", "The 21-book library and training by job title", "The full Defense Playbook and the insider circle"], list: "$99.99/mo", found: "$69.99/mo", yr: "$999/yr at launch, $699/yr founding", save: "$30/mo · $360/yr · 30%", dep: "$99" }
};
var dlg = $("#checkout"), lastBtn = null;
function openDlg() { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
function closeDlg() { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); }
$$(".js-reserve").forEach(function (b) {
  b.addEventListener("click", function () {
    var T = TIERS[b.getAttribute("data-tier")]; if (!T) return; lastBtn = b;
    var g = clear($("#coGet")); T.get.forEach(function (x) { g.appendChild(h("li", {}, [x])); });
    $("#coStatus").textContent = "";
    $("#co-h").textContent = "Reserve " + T.n;
    var pr = clear($("#coPrice"));
    pr.appendChild(document.createTextNode("Launch price " + T.list + " · founding ")); pr.appendChild(h("b", {}, [T.found]));
    pr.appendChild(document.createTextNode(", locked while you stay subscribed")); pr.appendChild(h("br")); pr.appendChild(h("span", { class: "small" }, [T.yr]));
    $("#coSave").textContent = T.save;
    $("#coPay").textContent = "Reserve for " + T.dep;
    $("#coRefund").textContent = "4. Refundable on request before launch only. This " + T.dep + " deposit reserves the founding price; it is not a subscription payment. The price shown is the price you pay at checkout.";
    $("#coInsider").textContent = INSIDER;
    openDlg();
  });
});
$("#coPay").addEventListener("click", function () { $("#coStatus").textContent = "Preview build: Stripe's hosted checkout (test mode first) connects here. No payment was taken."; });
$("#coClose").addEventListener("click", closeDlg);
dlg.addEventListener("close", function () { if (lastBtn) lastBtn.focus(); });
})();
