/*!
 * New Democracy — 2026 Endorsements directory
 *
 * Drop into a Squarespace Code Block:
 *
 *   <div id="nd-endorsements" data-sheet="GOOGLE_SHEET_CSV_URL"></div>
 *   <script src="https://YOUR-ORG.github.io/nd-endorsements/embed/nd-endorsements.js" defer></script>
 *
 * Options (data attributes on the container):
 *   data-sheet   Published-to-web CSV URL of the "Website" tab. If missing or
 *                unreachable, the bundled data/endorsements.csv is used instead.
 *   data-images  Base URL for headshots. Defaults to ../images/headshots/ next to this script.
 *
 * Sheet columns (header names are matched loosely, extra columns are ignored):
 *   Name, Seat (e.g. CO-08, IA-SEN, OH Gov), Status (Incumbent/Open/Challenger),
 *   Party (blank = Democrat), Show (Yes/No), Result, Photo URL, Website
 */
(function () {
  "use strict";

  var script = document.currentScript;
  var scriptBase = script ? script.src.replace(/[^/]*$/, "") : "";

  var STATES = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
    CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
    HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
    KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
    MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
    MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
    NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
    ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
    RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
    TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
    WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia"
  };

  var OFFICES = [
    { key: "senate", label: "U.S. Senate" },
    { key: "governor", label: "Governor" },
    { key: "house", label: "U.S. House" }
  ];

  var CSS = [
    "#nd-endorsements{--nd-navy:#000644;--nd-red:#FF3744;--nd-blue:#009FE9;--nd-purple:#803C97;--nd-white:#fff;",
    "font-family:Montserrat,'Helvetica Neue',Arial,sans-serif;color:var(--nd-navy);max-width:1200px;margin:0 auto;text-align:left}",
    "#nd-endorsements *,#nd-endorsements *::before,#nd-endorsements *::after{box-sizing:border-box}",

    /* Filter bar */
    "#nd-endorsements .nde-bar{background:var(--nd-navy);border-radius:25px;padding:22px 24px;margin:0 0 36px;display:flex;flex-wrap:wrap;gap:16px 20px;align-items:flex-end}",
    "#nd-endorsements .nde-field{display:flex;flex-direction:column;gap:8px;min-width:0}",
    "#nd-endorsements .nde-field--office{flex:1 1 420px}",
    "#nd-endorsements .nde-field--state{flex:0 1 220px}",
    "#nd-endorsements .nde-field--search{flex:1 1 200px}",
    "#nd-endorsements .nde-label{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--nd-white);opacity:.85;margin:0;line-height:1}",
    "#nd-endorsements .nde-chips{display:flex;flex-wrap:wrap;gap:10px}",
    "#nd-endorsements .nde-chip{appearance:none;-webkit-appearance:none;cursor:pointer;font:inherit;font-size:15px;font-weight:900;line-height:1;letter-spacing:0;text-transform:none;",
    "padding:12px 16px;border-radius:6.4px;border:2px solid var(--nd-white);background:transparent;color:var(--nd-white);box-shadow:none;transition:transform .12s,box-shadow .12s,background .12s;margin:0}",
    "#nd-endorsements .nde-chip[aria-pressed=true]{background:var(--nd-red);border-color:var(--nd-red);box-shadow:4px 4px 0 0 var(--nd-white);transform:translate(-2px,-2px)}",
    "#nd-endorsements .nde-chip .nde-count{font-weight:700;opacity:.8;margin-left:6px;font-size:13px}",
    "#nd-endorsements .nde-select,#nd-endorsements .nde-search{appearance:none;-webkit-appearance:none;width:100%;font:inherit;font-size:15px;font-weight:700;color:var(--nd-navy);background-color:var(--nd-white);",
    "border:2px solid var(--nd-white);border-radius:6.4px;padding:11px 14px;margin:0;line-height:1.2;height:auto;box-shadow:none;outline:none}",
    "#nd-endorsements .nde-select{padding-right:38px;cursor:pointer;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23000644' stroke-width='2.5' fill='none'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 14px center}",
    "#nd-endorsements .nde-select:focus-visible,#nd-endorsements .nde-search:focus-visible,#nd-endorsements .nde-chip:focus-visible{outline:3px solid var(--nd-blue);outline-offset:2px}",
    "#nd-endorsements .nde-search::placeholder{color:#6b6f93;font-weight:600}",

    /* Summary line */
    "#nd-endorsements .nde-summary{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin:-16px 4px 28px;font-size:15px;font-weight:700}",
    "#nd-endorsements .nde-reset{appearance:none;background:none;border:0;padding:0;margin:0;font:inherit;font-size:14px;font-weight:800;color:var(--nd-red);cursor:pointer;text-decoration:underline;text-underline-offset:3px}",

    /* Sections */
    "#nd-endorsements .nde-section{margin:0 0 48px}",
    "#nd-endorsements .nde-heading{font-family:inherit;font-size:clamp(26px,3.4vw,36px);font-weight:900;line-height:1.1;color:var(--nd-red);margin:0 0 6px;padding:0;letter-spacing:0;text-transform:none}",
    "#nd-endorsements .nde-stripes{display:flex;gap:5px;margin:0 0 22px}",
    "#nd-endorsements .nde-stripes span{display:block;height:6px;width:34px;border-radius:3px}",
    "#nd-endorsements .nde-stripes span:nth-child(1){background:var(--nd-red)}",
    "#nd-endorsements .nde-stripes span:nth-child(2){background:var(--nd-purple)}",
    "#nd-endorsements .nde-stripes span:nth-child(3){background:var(--nd-blue)}",

    /* Cards (mirrors the Champions page cards) */
    "#nd-endorsements .nde-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:22px;margin:0;padding:0;list-style:none}",
    "#nd-endorsements .nde-card{background:var(--nd-blue);border:10px solid var(--nd-navy);border-radius:25px;padding:12px 12px 16px;display:flex;flex-direction:column;align-items:center;text-align:center;margin:0;",
    "transition:transform .15s ease,box-shadow .15s ease}",
    "#nd-endorsements .nde-photo{width:100%;aspect-ratio:4/5;border:6px solid var(--nd-white);border-radius:10%;overflow:hidden;background:var(--nd-navy);position:relative;margin:0 0 12px}",
    "#nd-endorsements .nde-photo img{display:block;width:100%;height:100%;object-fit:cover;margin:0;padding:0;border:0;max-width:none}",
    "#nd-endorsements .nde-initials{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:900;color:var(--nd-white)}",
    "#nd-endorsements .nde-name{font-family:inherit;font-size:17px;font-weight:900;line-height:1.2;color:var(--nd-navy);margin:0 0 4px;padding:0;letter-spacing:0;text-transform:none}",
    "#nd-endorsements .nde-seat{font-size:14px;font-weight:700;line-height:1.3;color:var(--nd-navy);margin:0;padding:0}",
    "#nd-endorsements .nde-tags{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:10px 0 0}",
    "#nd-endorsements .nde-tag{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;line-height:1;padding:6px 8px;border-radius:4px;background:var(--nd-navy);color:var(--nd-white)}",
    "#nd-endorsements .nde-tag--win{background:var(--nd-red)}",
    "#nd-endorsements .nde-tag--ind{background:var(--nd-white);color:var(--nd-navy)}",
    "#nd-endorsements .nde-btn{display:inline-block;margin:14px 0 0;padding:10px 16px;border-radius:6.4px;background:var(--nd-red);color:var(--nd-white)!important;font-size:14px;font-weight:900;line-height:1;text-decoration:none!important;",
    "box-shadow:4px 4px 0 0 var(--nd-white);transition:transform .12s,box-shadow .12s}",
    "#nd-endorsements .nde-card-spacer{flex:1 1 auto}",

    "#nd-endorsements .nde-empty,#nd-endorsements .nde-status{text-align:center;font-size:18px;font-weight:700;padding:48px 16px;margin:0}",
    "#nd-endorsements .nde-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}",

    "@media (max-width:640px){",
    "#nd-endorsements .nde-bar{padding:18px 16px;border-radius:18px}",
    "#nd-endorsements .nde-field--state,#nd-endorsements .nde-field--search,#nd-endorsements .nde-field--office{flex:1 1 100%}",
    "#nd-endorsements .nde-chip{font-size:14px;padding:10px 12px}",
    "#nd-endorsements .nde-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}",
    "#nd-endorsements .nde-card{border-width:7px;border-radius:18px;padding:8px 8px 12px}",
    "#nd-endorsements .nde-photo{border-width:4px}",
    "#nd-endorsements .nde-name{font-size:15px}",
    "#nd-endorsements .nde-seat{font-size:13px}",
    "}",
    "@media (hover:hover){",
    "#nd-endorsements .nde-chip:not([aria-pressed=true]):hover{background:rgba(255,255,255,.12)}",
    "#nd-endorsements .nde-card:hover{transform:translate(-3px,-3px);box-shadow:6px 6px 0 0 var(--nd-red)}",
    "#nd-endorsements .nde-btn:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 0 var(--nd-white)}",
    "}",
    "@media (prefers-reduced-motion:reduce){#nd-endorsements *{transition:none!important}}"
  ].join("");

  // ---------- helpers ----------

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === "text") node.textContent = attrs[k];
        else if (k === "class") node.className = attrs[k];
        else node.setAttribute(k, attrs[k]);
      }
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function slugify(name) {
    return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function ordinal(n) {
    var s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // RFC 4180-ish CSV parser (quoted fields, escaped quotes, CRLF).
  function parseCSV(text) {
    var rows = [], row = [], field = "", i = 0, q = false;
    text = text.replace(/^﻿/, "");
    while (i < text.length) {
      var c = text[i];
      if (q) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } else q = false;
        } else field += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += c;
      i++;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  var HEADER_ALIASES = {
    name: ["name", "candidatename", "candidate"],
    seat: ["seat", "race", "district"],
    status: ["status", "incumbent"],
    party: ["party"],
    show: ["show", "showonsite", "display", "visible"],
    result: ["result", "results", "electionresults", "electionresult"],
    photo: ["photourl", "photo", "headshot", "image"],
    website: ["website", "websiteurl", "url", "link"]
  };

  function toRecords(rows) {
    if (!rows.length) return [];
    var header = rows[0].map(function (h) { return h.toLowerCase().replace(/[^a-z]/g, ""); });
    var idx = {};
    Object.keys(HEADER_ALIASES).forEach(function (key) {
      idx[key] = -1;
      HEADER_ALIASES[key].some(function (alias) {
        var i = header.indexOf(alias);
        if (i > -1) { idx[key] = i; return true; }
        return false;
      });
    });
    return rows.slice(1).map(function (r) {
      var o = {};
      Object.keys(idx).forEach(function (k) { o[k] = idx[k] > -1 ? (r[idx[k]] || "").trim() : ""; });
      return o;
    });
  }

  function describe(rec) {
    var seat = rec.seat.toUpperCase().replace(/\s+/g, " ").trim();
    var st = seat.slice(0, 2);
    var office, label, order = 0;
    if (/SEN/.test(seat)) {
      office = "senate"; label = STATES[st] || st;
    } else if (/GOV/.test(seat)) {
      office = "governor"; label = STATES[st] || st;
    } else {
      office = "house";
      var m = seat.match(/^([A-Z]{2})[\s-]*(\d+|AL)$/);
      if (m) {
        label = m[2] === "AL" ? m[1] + "-AL" : m[1] + "-" + ("0" + parseInt(m[2], 10)).slice(-2);
        order = m[2] === "AL" ? 0 : parseInt(m[2], 10);
      } else label = seat;
    }
    var district = office === "house"
      ? (order ? (STATES[st] || st) + "’s " + ordinal(order) + " District" : (STATES[st] || st) + " At-Large")
      : (STATES[st] || st) + (office === "senate" ? " U.S. Senate" : " Governor");
    return { office: office, state: st, stateName: STATES[st] || st, label: label, order: order, district: district };
  }

  function isYes(v) { return !/^(no|n|false|0|hide|hidden)$/i.test(v || ""); }

  // ---------- main ----------

  function init(root) {
    if (root.getAttribute("data-nde-ready")) return;
    root.setAttribute("data-nde-ready", "1");

    if (!document.getElementById("nde-styles")) {
      document.head.appendChild(el("style", { id: "nde-styles", text: CSS }));
    }
    if (!document.getElementById("nde-font")) {
      document.head.appendChild(el("link", {
        id: "nde-font", rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&display=swap"
      }));
    }

    var imageBase = root.getAttribute("data-images") || scriptBase + "../images/headshots/";
    var fallbackCSV = root.getAttribute("data-fallback") || scriptBase + "../data/endorsements.csv";
    var sheetURL = root.getAttribute("data-sheet");

    root.innerHTML = "";
    var status = el("p", { class: "nde-status", role: "status", text: "Loading endorsements…" });
    root.appendChild(status);

    function load(url) {
      return fetch(url, { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error(r.status + " " + url);
        return r.text();
      }).then(function (t) {
        var recs = toRecords(parseCSV(t)).filter(function (r) { return r.name && r.seat; });
        if (!recs.length) throw new Error("no rows in " + url);
        return recs;
      });
    }

    var source = sheetURL && !/GOOGLE_SHEET_CSV_URL/.test(sheetURL) ? load(sheetURL).catch(function (e) {
      if (window.console) console.warn("[nd-endorsements] sheet failed, using bundled data:", e);
      return load(fallbackCSV);
    }) : load(fallbackCSV);

    source.then(function (recs) {
      var people = recs.filter(function (r) { return isYes(r.show); }).map(function (r) {
        var d = describe(r);
        for (var k in d) r[k] = d[k];
        r.slug = slugify(r.name);
        r.search = (r.name + " " + r.label + " " + r.stateName + " " + r.district).toLowerCase();
        return r;
      });
      people.sort(function (a, b) {
        return a.stateName.localeCompare(b.stateName) || a.order - b.order || a.name.localeCompare(b.name);
      });
      root.removeChild(status);
      render(root, people, imageBase);
    }).catch(function (e) {
      status.textContent = "Sorry — endorsements could not be loaded right now.";
      if (window.console) console.error("[nd-endorsements]", e);
    });
  }

  function render(root, people, imageBase) {
    var state = readHash();

    // Filter bar
    var chipsWrap = el("div", { class: "nde-chips", role: "group", "aria-label": "Filter by race" });
    var chipDefs = [{ key: "all", label: "All Races" }].concat(OFFICES);
    var chips = chipDefs.map(function (o) {
      var count = el("span", { class: "nde-count" });
      var b = el("button", { type: "button", class: "nde-chip", "data-office": o.key }, [document.createTextNode(o.label), count]);
      b._count = count;
      b.addEventListener("click", function () { state.office = o.key; update(true); });
      chipsWrap.appendChild(b);
      return b;
    });

    var select = el("select", { class: "nde-select", id: "nde-state", "aria-label": "Filter by state" });
    select.addEventListener("change", function () { state.state = select.value; update(true); });

    var search = el("input", { class: "nde-search", id: "nde-search", type: "search", placeholder: "Search by name or district", autocomplete: "off" });
    search.addEventListener("input", function () { state.q = search.value; update(false); });

    var bar = el("div", { class: "nde-bar" }, [
      el("div", { class: "nde-field nde-field--office" }, [el("p", { class: "nde-label", text: "Race" }), chipsWrap]),
      el("div", { class: "nde-field nde-field--state" }, [el("label", { class: "nde-label", for: "nde-state", text: "State" }), select]),
      el("div", { class: "nde-field nde-field--search" }, [el("label", { class: "nde-label", for: "nde-search", text: "Search" }), search])
    ]);

    var summaryText = el("span", { "aria-live": "polite" });
    var reset = el("button", { type: "button", class: "nde-reset", text: "Clear filters" });
    reset.addEventListener("click", function () { state = { office: "all", state: "", q: "" }; search.value = ""; update(true); });
    var summary = el("div", { class: "nde-summary" }, [summaryText, reset]);

    var results = el("div", { class: "nde-results" });
    root.appendChild(bar);
    root.appendChild(summary);
    root.appendChild(results);

    // Build every card once; filtering just moves them between sections.
    people.forEach(function (p) { p.card = buildCard(p, imageBase); });

    function matches(p, ignoreOffice, ignoreState) {
      if (!ignoreOffice && state.office !== "all" && p.office !== state.office) return false;
      if (!ignoreState && state.state && p.state !== state.state) return false;
      if (state.q && p.search.indexOf(state.q.toLowerCase().trim()) === -1) return false;
      return true;
    }

    function update(pushHash) {
      // Office chip counts respect the state + search filters.
      chips.forEach(function (b) {
        var key = b.getAttribute("data-office");
        var n = people.filter(function (p) { return matches(p, true, false) && (key === "all" || p.office === key); }).length;
        b._count.textContent = n;
        b.setAttribute("aria-pressed", String(state.office === key));
      });

      // State dropdown lists states that have candidates for the chosen race.
      var counts = {};
      people.forEach(function (p) { if (matches(p, false, true)) counts[p.state] = (counts[p.state] || 0) + 1; });
      var codes = Object.keys(counts).sort(function (a, b) { return (STATES[a] || a).localeCompare(STATES[b] || b); });
      if (state.state && !counts[state.state]) codes.push(state.state);
      select.innerHTML = "";
      select.appendChild(el("option", { value: "", text: "All States" }));
      codes.forEach(function (c) {
        select.appendChild(el("option", { value: c, text: (STATES[c] || c) + " (" + (counts[c] || 0) + ")" }));
      });
      select.value = state.state;

      // Sections
      results.innerHTML = "";
      var total = 0;
      OFFICES.forEach(function (o) {
        if (state.office !== "all" && state.office !== o.key) return;
        var list = people.filter(function (p) { return p.office === o.key && matches(p); });
        if (!list.length) return;
        total += list.length;
        var grid = el("ul", { class: "nde-grid" });
        list.forEach(function (p) { grid.appendChild(p.card); });
        results.appendChild(el("section", { class: "nde-section", "aria-label": o.label }, [
          el("h2", { class: "nde-heading", text: o.label }),
          el("div", { class: "nde-stripes", "aria-hidden": "true" }, [el("span"), el("span"), el("span")]),
          grid
        ]));
      });
      if (!total) results.appendChild(el("p", { class: "nde-empty", text: "No endorsed candidates match those filters." }));

      var where = state.state ? " in " + (STATES[state.state] || state.state) : "";
      summaryText.textContent = total + " endorsed candidate" + (total === 1 ? "" : "s") + where;
      reset.style.display = state.office !== "all" || state.state || state.q ? "" : "none";

      if (pushHash) writeHash(state);
    }

    search.value = state.q;
    update(false);
    window.addEventListener("hashchange", function () {
      var h = readHash();
      if (h.office !== state.office || h.state !== state.state) { h.q = state.q; state = h; update(false); }
    });
  }

  function buildCard(p, imageBase) {
    var photo = el("div", { class: "nde-photo" });
    var initials = p.name.replace(/^Dr\.?\s+/i, "").split(/\s+/).map(function (w) { return w[0]; });
    var fallback = el("span", { class: "nde-initials", "aria-hidden": "true", text: (initials[0] + (initials[initials.length - 1] || "")).toUpperCase() });
    var img = el("img", {
      src: p.photo || imageBase + p.slug + ".jpg",
      alt: p.name,
      loading: "lazy",
      decoding: "async",
      width: "480",
      height: "600"
    });
    img.addEventListener("error", function () { photo.removeChild(img); photo.appendChild(fallback); });
    photo.appendChild(img);

    var tags = el("div", { class: "nde-tags" });
    if (p.result && !/^lost/i.test(p.result)) tags.appendChild(el("span", { class: "nde-tag nde-tag--win", text: p.result }));
    if (/^incumbent/i.test(p.status)) tags.appendChild(el("span", { class: "nde-tag", text: "Incumbent" }));
    if (/^ind/i.test(p.party)) tags.appendChild(el("span", { class: "nde-tag nde-tag--ind", text: "Independent" }));

    var children = [
      photo,
      el("h3", { class: "nde-name", text: p.name }),
      el("p", { class: "nde-seat", title: p.district, text: p.label }),
      tags.childNodes.length ? tags : null,
      el("span", { class: "nde-card-spacer" })
    ];
    if (/^https?:\/\//i.test(p.website)) {
      children.push(el("a", { class: "nde-btn", href: p.website, target: "_blank", rel: "noopener", text: "Learn More" }, [
        el("span", { class: "nde-sr", text: " about " + p.name })
      ]));
    }
    return el("li", { class: "nde-card" }, children);
  }

  function readHash() {
    var out = { office: "all", state: "", q: "" };
    var h = (location.hash || "").replace(/^#/, "");
    h.split("&").forEach(function (part) {
      var kv = part.split("=");
      if (kv[0] === "race" && /^(senate|house|governor)$/.test(kv[1])) out.office = kv[1];
      if (kv[0] === "state" && /^[A-Za-z]{2}$/.test(kv[1] || "")) out.state = kv[1].toUpperCase();
    });
    return out;
  }

  function writeHash(state) {
    var parts = [];
    if (state.office !== "all") parts.push("race=" + state.office);
    if (state.state) parts.push("state=" + state.state);
    var h = parts.length ? "#" + parts.join("&") : " ";
    if (history.replaceState) history.replaceState(null, "", h === " " ? location.pathname + location.search : h);
  }

  function boot() {
    var roots = document.querySelectorAll("#nd-endorsements");
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
