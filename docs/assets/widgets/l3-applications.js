/* Lecture 3 widget: everyday applications of lossless compression, and a demo that compresses a
   text in the browser: the character frequencies, their entropy, the Huffman code of the
   characters, and DEFLATE (zip, gzip, PNG), run by the browser itself (CompressionStream).
   Usage in the class notes, at the end of the last section:
     %web: l3-applications place=end
   With place=end, the widget moves into its own section at the end of the page, after the
   exercises and before the links to the other lectures, and adds "Applications" to the links at
   the top of the page. Without place=end, it stays where the %web line is.
   Draws into every [data-widget="l3-applications"] element. No libraries, no network. */
(function () {
  "use strict";
  var NAME = "l3-applications";
  var COUNT = 0;

  // ---- the examples --------------------------------------------------------------------------
  var APPS = [
    { title: "Zip archives, PNG images, PDF files",
      body: "These formats use DEFLATE, also behind gzip. It replaces repeated strings by pointers " +
            "to earlier copies (Lempel–Ziv coding), then Huffman codes what remains. Only the " +
            "codeword lengths are stored: the decoder rebuilds the codewords as the dyadic code of " +
            "these lengths.",
      refs: [["Huffman code", "#cn-3-4-3"], ["dyadic code", "#cn-3-4-1"]] },
    { title: "Web pages",
      body: "Servers compress HTML, style sheets and scripts with gzip, Brotli or Zstandard, and " +
            "your browser decodes them on the fly. Brotli uses Huffman codes; Zstandard uses " +
            "Huffman codes and tANS, a fast alternative to arithmetic coding.",
      refs: [["Huffman code", "#cn-3-4-3"], ["arithmetic coding", "#p8"]] },
    { title: "Photos (JPEG)",
      body: "JPEG is lossy: it first discards details that the eye barely sees. Its last step is " +
            "lossless: the quantized coefficients are Huffman coded, with tables given by the " +
            "number of codewords of each length, from which the codewords follow as a dyadic code.",
      refs: [["Huffman code", "#cn-3-4-3"], ["dyadic code", "#cn-3-4-1"]] },
    { title: "Music (MP3, AAC)",
      body: "After a lossy step that removes what the ear barely hears, the frequency " +
            "coefficients are Huffman coded with tables picked from a fixed set: codes designed " +
            "for a nearby distribution Q, which cost about D(P‖Q) more bits per symbol.",
      refs: [["Huffman code", "#cn-3-4-3"], ["wrong distribution", "#p5"]] },
    { title: "Lossless audio (FLAC)",
      body: "Each sample is predicted from the previous ones, and the prediction error, usually a " +
            "small number, is encoded with a Rice code, a simple prefix code with short codewords " +
            "for small numbers. A FLAC file typically takes 50 to 70% of the original size.",
      refs: [["prefix codes", "#cn-3-2"]] },
    { title: "Video streaming (H.264, HEVC, AV1)",
      body: "Each block is predicted from pixels already decoded, in the same frame or in other " +
            "frames, and the prediction error is quantized, which is lossy. Then every coefficient " +
            "and coding decision is encoded by adaptive arithmetic coding (CABAC in H.264 and " +
            "HEVC), which updates its probabilities as it goes.",
      refs: [["arithmetic coding", "#p8"], ["universal coding", "#cn-3-7"]] },
    { title: "Fax machines",
      body: "Each scan line of a fax is a sequence of runs of white and black pixels. Group 3 fax encodes the " +
            "run lengths with fixed tables, the Modified Huffman code: frequent run lengths get " +
            "short codewords.",
      refs: [["Huffman code", "#cn-3-4-3"]] },
    { title: "Morse code",
      body: "Already in the 1840s, Morse code gave the shortest codewords to the most frequent " +
            "letters: E = ·, T = −. It is not a prefix code, since E = · is a prefix of I = · ·, " +
            "so operators leave a pause between letters, which makes it decodable.",
      refs: [["prefix and UD codes", "#cn-3-2"]] }
  ];

  // ---- texts of the demo (seeded, so that every visitor sees the same numbers) ----------------
  function rng(seed) {                                   // mulberry32
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var ENGLISH =
    "Information theory tells us how far a file can be compressed without losing a single bit. " +
    "If a source produces letters with probabilities p1, ..., pM, a uniquely decodable code needs " +
    "at least H(P) bits per letter on average, and the Huffman code needs less than one bit more. " +
    "Real compressors do better than coding letters one by one: they also look for repetitions, " +
    "since a word that appeared before can be replaced by a short pointer to its first occurrence. " +
    "This is how zip files, PNG images and most web pages are compressed every day. The more " +
    "regular the text, the shorter its compressed version. A sequence of random letters, on the " +
    "other hand, cannot be compressed by any method: each letter carries its full share of " +
    "information, and no code can beat the entropy.";
  function logText() {
    var r = rng(12), t = 9 * 3600, lines = [];
    var pages = [["/index.html", 5120], ["/lecture3.html", 48213], ["/assets/style.css", 28736],
                 ["/assets/site.js", 17587], ["/assets/widgets/l3-huffman.js", 16787]];
    for (var i = 0; i < 24; i++) {
      t += Math.floor(r() * 4);
      var pg = pages[Math.floor(r() * pages.length)], cached = r() < 0.3;
      var hh = Math.floor(t / 3600), mm = Math.floor(t / 60) % 60, ss = t % 60;
      lines.push("2026-11-12 " + pad2(hh) + ":" + pad2(mm) + ":" + pad2(ss) + " GET " + pg[0] + " " +
                 (cached ? "304 0" : "200 " + pg[1]));
    }
    return lines.join("\n");
  }
  function pad2(v) { return (v < 10 ? "0" : "") + v; }
  function randomText(alphabet, n, seed) {
    var r = rng(seed), s = "";
    for (var i = 0; i < n; i++) s += alphabet[Math.floor(r() * alphabet.length)];
    return s;
  }
  var PRESETS = [
    { key: "english", label: "English text", text: function () { return ENGLISH; } },
    { key: "log", label: "server log", text: logText },
    { key: "random", label: "random letters",
      text: function () { return randomText("abcdefghijklmnopqrstuvwxyz ", 800, 7); } },
    { key: "dna", label: "random DNA",
      text: function () { return randomText("ACGT", 800, 5); } }
  ];

  // ---- helpers ---------------------------------------------------------------------------------
  function parseArgs(el) {
    var out = {};
    (el.getAttribute("data-args") || "").split(/\s+/).forEach(function (kv) {
      var m = kv.match(/^([A-Za-z_][\w-]*)=(.*)$/);
      if (m) out[m[1]] = m[2];
    });
    return out;
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function fmt(x, d) { return x.toFixed(d == null ? 2 : d); }
  function showChar(c) {
    if (c === " ") return "␣ (space)";
    if (c === "\n") return "↵ (new line)";
    if (c === "\t") return "⇥ (tab)";
    return c;
  }

  // Huffman code of the counts, as in the class notes: merge the two least likely groups, with
  // 0 on the more likely branch (ties: a symbol before a group, then the order of first appearance).
  function huffman(items) {                     // items: [{sym, w}] -> {sym: codeword}
    var code = {};
    if (items.length === 1) { code[items[0].sym] = "0"; return code; }
    var nodes = items.map(function (it, i) { return { w: it.w, sym: it.sym, leaf: true, ord: i, step: -1 }; });
    var step = 0;
    function before(a, b) {                     // a sorted before b (more likely first)
      if (a.w !== b.w) return a.w > b.w;
      if (a.leaf !== b.leaf) return a.leaf;
      return a.leaf ? a.ord < b.ord : a.step < b.step;
    }
    while (nodes.length > 1) {
      nodes.sort(function (a, b) { return before(a, b) ? -1 : before(b, a) ? 1 : 0; });
      var y = nodes.pop(), x = nodes.pop();     // x = a_{M-1} (more likely), y = a_M
      nodes.push({ w: x.w + y.w, leaf: false, kids: [x, y], step: step++ });
    }
    (function walk(n, word) {
      if (n.leaf) { code[n.sym] = word; return; }
      walk(n.kids[0], word + "0");
      walk(n.kids[1], word + "1");
    })(nodes[0], "");
    return code;
  }

  function analyse(text) {
    var chars = Array.from(text), n = chars.length;
    var counts = new Map();
    chars.forEach(function (c) { counts.set(c, (counts.get(c) || 0) + 1); });
    var items = [];
    counts.forEach(function (w, sym) { items.push({ sym: sym, w: w }); });
    var code = huffman(items);
    var H = 0, L = 0;
    items.forEach(function (it) {
      var p = it.w / n;
      H -= p * Math.log2(p);
      L += p * code[it.sym].length;
      it.p = p; it.cw = code[it.sym];
    });
    items.sort(function (a, b) { return b.w - a.w; });
    var bytes = new TextEncoder().encode(text);
    return { n: n, M: items.length, H: H, L: L, items: items, bytes: bytes,
             raw: 8 * bytes.length / n, maxLen: Math.max.apply(null, items.map(function (it) { return it.cw.length; })) };
  }

  // DEFLATE size in bytes, computed by the browser; null if CompressionStream is missing.
  function deflateSize(bytes) {
    if (typeof CompressionStream === "undefined" || typeof Response === "undefined") return Promise.resolve(null);
    var format = "deflate-raw", extra = 0, cs;
    try { cs = new CompressionStream(format); }
    catch (e) {
      try { format = "gzip"; extra = 18; cs = new CompressionStream(format); }   // header + trailer
      catch (e2) { return Promise.resolve(null); }
    }
    var stream = new Blob([bytes]).stream().pipeThrough(cs);
    return new Response(stream).arrayBuffer().then(function (buf) { return buf.byteLength - extra; },
                                                   function () { return null; });
  }

  // ---- placement at the end of the page --------------------------------------------------------
  function moveToEnd(root) {                            // true if the widget now has its own section
    if (document.getElementById("applications")) return false;
    var sheet = root.closest(".sheet");
    if (!sheet) return false;
    var pager = sheet.querySelector("nav.pager");
    var sec = el("section", "block");
    sec.id = "applications";
    sec.setAttribute("aria-labelledby", "applications-h");
    var head = el("div", "block-head");
    var h = el("h2", null, "Everyday applications");
    h.id = "applications-h";
    head.appendChild(h);
    head.appendChild(el("p", "block-sub", APPS.length + " examples"));
    sec.appendChild(head);
    sec.appendChild(root);
    if (pager && pager.parentNode === sheet) sheet.insertBefore(sec, pager); else sheet.appendChild(sec);
    var jump = document.querySelector("nav.jump");
    if (jump) {
      var a = el("a", null, "Applications");
      a.href = "#applications";
      jump.appendChild(a);
    }
    return true;
  }

  // ---- build one widget ------------------------------------------------------------------------
  function build(host) {
    if (host.getAttribute("data-ready")) return;
    host.setAttribute("data-ready", "1");
    var args = parseArgs(host);
    var id = NAME + "-" + (++COUNT);
    host.textContent = "";
    var root = el("div", "l3w l3w-app");
    host.appendChild(root);
    // in its own section, the cards need no frame around them
    if (args.place === "end" && moveToEnd(host)) host.classList.add("l3w-app-end");

    root.appendChild(el("p", "l3w-app-intro",
      "Every file you download, every web page, photo and song goes through a lossless code at " +
      "some point, often one of the codes of this lecture."));
    var grid = el("ul", "l3w-app-grid");
    APPS.forEach(function (ap) {
      var li = el("li", "l3w-app-card");
      li.appendChild(el("h3", "l3w-app-title", ap.title));
      li.appendChild(el("p", "l3w-app-body", ap.body));
      var refs = el("p", "l3w-app-refs");
      ap.refs.forEach(function (r, i) {
        if (i) refs.appendChild(document.createTextNode(" · "));
        var a = el("a", null, r[0]);
        a.href = r[1];
        refs.appendChild(a);
      });
      li.appendChild(refs);
      grid.appendChild(li);
    });
    root.appendChild(grid);

    // demo
    var demo = el("div", "l3w-app-demo");
    root.appendChild(demo);
    demo.appendChild(el("h3", "l3w-app-dtitle", "Try it: compress a text"));
    demo.appendChild(el("p", "l3w-hint",
      "Pick a text or type your own. The Huffman code is built for the character frequencies of " +
      "the text; DEFLATE, the method of zip files, is run by your browser."));
    var ctl = el("div", "l3w-controls");
    var seg = el("div", "l3w-seg");
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-label", "Example texts");
    var btns = {};
    PRESETS.forEach(function (pr) {
      var b = el("button", "l3w-btn", pr.label);
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () { area.value = pr.text(); select(pr.key); update(); });
      btns[pr.key] = b;
      seg.appendChild(b);
    });
    ctl.appendChild(seg);
    demo.appendChild(ctl);
    function select(key) {
      Object.keys(btns).forEach(function (k) { btns[k].setAttribute("aria-pressed", k === key ? "true" : "false"); });
    }
    var area = document.createElement("textarea");
    area.className = "l3w-app-text";
    area.rows = 6;
    area.spellcheck = false;
    area.id = id + "-text";
    area.setAttribute("aria-label", "Text to compress");
    demo.appendChild(area);

    var bars = el("div", "l3w-bars");
    bars.setAttribute("role", "img");
    demo.appendChild(bars);
    var readout = el("p", "l3w-readout");
    readout.setAttribute("aria-live", "polite");
    demo.appendChild(readout);
    var tabWrap = el("div", "l3w-scroll");
    demo.appendChild(tabWrap);

    var ROWS = [
      { key: "raw", label: "no compression (UTF-8)", cls: "s-raw" },
      { key: "huff", label: "Huffman code of the characters", cls: "s-huff" },
      { key: "defl", label: "DEFLATE (zip, gzip, PNG)", cls: "s-defl" }
    ];
    var rowEls = {};
    ROWS.forEach(function (r) {
      var name = el("span", "l3w-bar-name", r.label);
      var track = el("span", "l3w-bar-track");
      var fill = el("span", "l3w-bar-fill " + r.cls);
      var mark = el("span", "l3w-bar-mark");
      track.appendChild(fill);
      track.appendChild(mark);
      var val = el("span", "l3w-bar-val");
      bars.appendChild(name); bars.appendChild(track); bars.appendChild(val);
      rowEls[r.key] = { fill: fill, mark: mark, val: val, track: track };
    });
    var axis = el("span", "l3w-bar-axis");
    var hlabel = el("span", "l3w-bar-hlabel");
    bars.appendChild(el("span", "l3w-bar-name l3w-bar-unit", "bits per character"));
    bars.appendChild(axis);
    bars.appendChild(el("span", "l3w-bar-val"));
    axis.appendChild(hlabel);

    var timer = null, token = 0;
    area.addEventListener("input", function () {
      select(null);
      clearTimeout(timer);
      timer = setTimeout(update, 250);
    });

    function setBar(key, value, xmax, title) {
      var r = rowEls[key];
      if (value == null) {
        r.fill.style.width = "0";
        r.val.textContent = "–";
        r.track.title = title;
        return;
      }
      r.fill.style.width = (100 * value / xmax) + "%";
      r.val.textContent = fmt(value);
      r.track.title = title;
    }

    function update() {
      var text = area.value;
      var my = ++token;
      tabWrap.textContent = "";
      if (!text.length) {
        ["raw", "huff", "defl"].forEach(function (k) { setBar(k, null, 1, ""); rowEls[k].mark.style.display = "none"; });
        hlabel.textContent = "";
        readout.textContent = "Type or paste a text.";
        bars.setAttribute("aria-label", "No text");
        return;
      }
      var A = analyse(text);
      var Lh = A.M === 1 ? 1 : A.L;
      draw(A, Lh, undefined);
      readout.textContent = message(A, Lh, undefined);
      table(A);
      deflateSize(A.bytes).then(function (z) {
        if (my !== token) return;
        var d = z == null ? null : 8 * z / A.n;
        draw(A, Lh, d, z);
        readout.textContent = message(A, Lh, d, z);
      });
    }

    function draw(A, Lh, d, z) {
      var xmax = Math.max(8, A.raw, d || 0);
      xmax = Math.ceil(xmax);
      setBar("raw", A.raw, xmax, A.bytes.length + " bytes for " + A.n + " characters: " + fmt(A.raw) + " bits per character");
      setBar("huff", Lh, xmax, "Huffman code of the " + A.M + " characters: " + fmt(Lh) + " bits per character (the table is not counted)");
      if (d === undefined) {
        setBar("defl", null, xmax, "computing…");
        rowEls.defl.val.textContent = "…";
      } else if (d === null) {
        setBar("defl", null, xmax, "not available in this browser");
        rowEls.defl.val.textContent = "n/a";
      } else {
        setBar("defl", d, xmax, z + " bytes: " + fmt(d) + " bits per character, everything included");
      }
      var left = (100 * A.H / xmax) + "%";
      ["raw", "huff", "defl"].forEach(function (k) {
        rowEls[k].mark.style.display = "";
        rowEls[k].mark.style.left = left;
      });
      var pc = 100 * A.H / xmax;
      hlabel.style.left = left;
      hlabel.style.transform = pc < 22 ? "translateX(-4px)" : pc > 78 ? "translateX(calc(-100% + 4px))" : "translateX(-50%)";
      hlabel.textContent = "entropy H(P̂) = " + fmt(A.H);
      bars.setAttribute("aria-label", "Bits per character: no compression " + fmt(A.raw) + ", Huffman code " +
        fmt(Lh) + (d ? ", DEFLATE " + fmt(d) : "") + ", entropy of the character frequencies " + fmt(A.H));
    }

    function message(A, Lh, d, z) {
      var s = A.M === 1 ?
        A.n + " characters, all the same: H(P̂) = 0, and a code for single characters still needs 1 bit per character. " :
        A.n + " characters, " + A.M + " different ones. Their frequencies P̂ have the entropy H(P̂) = " +
        fmt(A.H) + " bits. The Huffman code for P̂ needs " + fmt(Lh) + " bits per character, within one bit " +
        "of H(P̂) as for any distribution (Section 3.5), plus a table of its codewords. ";
      if (d === undefined) return s + "DEFLATE: computing…";
      if (d === null) return s + "This browser cannot run DEFLATE here (no CompressionStream).";
      s += "DEFLATE needs " + z + " bytes, " + fmt(d) + " bits per character, everything included. ";
      if (A.M === 1) {
        s += "It stores the character once, then a pointer that copies it: a longer run would cost almost nothing more.";
      } else if (d < A.H - 0.05) {
        s += "This is below H(P̂): DEFLATE also uses repetitions, i.e., the dependence between " +
             "characters, which a code for single characters cannot see.";
      } else {
        s += "This is not below H(P̂): the text has few long repetitions, " +
             (A.n < 3000 ? "and on a short text DEFLATE pays for its own tables. " : ". ") +
             "Try the server log, or paste a longer text.";
      }
      return s;
    }

    function table(A) {
      tabWrap.appendChild(el("p", "l3w-app-cap", "The most frequent characters and their Huffman codewords" +
        (A.maxLen > 0 ? " (the rarest ones get up to " + A.maxLen + " bits):" : ":")));
      var t = el("table", "l3w-table l3w-app-tab");
      var hr = el("tr");
      ["character", "frequency", "codeword"].forEach(function (h) { hr.appendChild(el("th", null, h)); });
      t.appendChild(hr);
      A.items.slice(0, 8).forEach(function (it) {
        var tr = el("tr");
        tr.appendChild(el("td", "l3w-app-ch", showChar(it.sym)));
        tr.appendChild(el("td", null, fmt(100 * it.p, 1) + "%"));
        tr.appendChild(el("td", "l3w-bin", it.cw));
        t.appendChild(tr);
      });
      tabWrap.appendChild(t);
    }

    area.value = PRESETS[0].text();
    select(PRESETS[0].key);
    update();
  }

  function init() {
    var hosts = document.querySelectorAll('[data-widget="' + NAME + '"]');
    for (var i = 0; i < hosts.length; i++) {
      try { build(hosts[i]); }
      catch (e) { if (window.console) console.error(NAME, e); }
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
