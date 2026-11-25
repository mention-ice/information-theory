/* Lecture 3 widget: the universal code f_U of Section 3.7 on a binary sequence xⁿ. The type of
   xⁿ is given by its number k of ones (types numbered k = 0, ..., n, written with
   ⌈log(n+1)⌉ bits); then xⁿ is numbered in its type class in increasing binary order, from 0
   (written with ⌈log C(n,k)⌉ bits), as in Problem 7. The widget compares the length with n
   and with nH(P̂).
   Usage in the class notes:  %web: l3-universal n=100 k=10
   Click a bit, or edit the bits in the text field; "new sequence" draws xⁿ i.i.d. with P(1) = p.
   Draws into every [data-widget="l3-universal"] element. No libraries. */
(function () {
  "use strict";
  var NAME = "l3-universal";
  var SVGNS = "http://www.w3.org/2000/svg";
  var NMIN = 4, NMAX = 256, COLS = 50, CELL = 12;
  var COUNT = 0;

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
  function svg(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function slider(label, min, max, step, value, onInput, show) {
    var wrap = el("label", "l3w-ctl");
    wrap.appendChild(el("span", "l3w-ctl-name", label));
    var input = document.createElement("input");
    input.type = "range"; input.min = min; input.max = max; input.step = step; input.value = value;
    var out = el("output", "l3w-ctl-val", show(value));
    input.addEventListener("input", function () { out.textContent = show(+input.value); onInput(+input.value); });
    wrap.appendChild(input); wrap.appendChild(out);
    return { wrap: wrap, input: input, out: out };
  }
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
  function h2(p) { return (p <= 0 || p >= 1) ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p); }

  // ---- exact integers --------------------------------------------------------------------------
  var BINOM = {};
  function binom(n, k) {                                 // C(n, k) as a BigInt
    if (k < 0 || k > n) return 0n;
    k = Math.min(k, n - k);
    var key = n + "," + k;
    if (BINOM[key] !== undefined) return BINOM[key];
    var r = 1n;
    for (var i = 1; i <= k; i++) r = r * BigInt(n - k + i) / BigInt(i);
    BINOM[key] = r;
    return r;
  }
  function bitLength(x) { return x === 0n ? 0 : x.toString(2).length; }
  function ceilLog2(x) { return x <= 1n ? 0 : bitLength(x - 1n); }    // ⌈log2 x⌉ for x ≥ 1
  function log2Big(x) {
    var b = bitLength(x);
    if (b <= 52) return Math.log2(Number(x));
    return (b - 52) + Math.log2(Number(x >> BigInt(b - 52)));
  }
  // number of xⁿ in its type class, in increasing binary order (0 before 1), from 0
  function rank(bits) {
    var n = bits.length, r = 0n, ones = 0, i;
    for (i = 0; i < n; i++) ones += bits[i];
    for (i = 0; i < n; i++) {
      if (bits[i]) { r += binom(n - i - 1, ones); ones--; }
    }
    return r;
  }
  function toBits(x, len) {
    if (len === 0) return "";
    var s = x.toString(2);
    return s.length >= len ? s : "0".repeat(len - s.length) + s;
  }
  function shortInt(x) {
    var s = x.toString();
    return s.length <= 20 ? s : s.slice(0, 8) + "…" + s.slice(-4) + " (" + s.length + " digits)";
  }

  function build(host) {
    if (host.getAttribute("data-ready")) return;
    host.setAttribute("data-ready", "1");
    var args = parseArgs(host);
    var id = NAME + "-" + (++COUNT);
    var n = Math.max(NMIN, Math.min(NMAX, parseInt(args.n, 10) || 100));
    var k0 = Math.max(0, Math.min(n, parseInt(args.k, 10) || Math.round(n / 10)));
    var p = n ? k0 / n : 0.1;
    var bits = [];
    (function () {                                      // k0 ones at seeded positions
      var r = rng(2026), pos = [], i;
      for (i = 0; i < n; i++) { pos.push(i); bits.push(0); }
      for (i = n - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = pos[i]; pos[i] = pos[j]; pos[j] = t; }
      for (i = 0; i < k0; i++) bits[pos[i]] = 1;
    })();

    host.textContent = "";
    var root = host;                                    // the host is the frame, as in the other widgets
    root.classList.add("l3w", "l3w-un");
    var ctl = el("div", "l3w-controls");
    root.appendChild(ctl);
    var sN = slider("n", NMIN, NMAX, 1, n, function (v) { n = v; draw(); }, function (v) { return String(v); });
    var sP = slider("P(1)", 0, 1, 0.01, p, function (v) { p = v; draw(); }, function (v) { return (+v).toFixed(2); });
    ctl.appendChild(sN.wrap);
    ctl.appendChild(sP.wrap);
    var bNew = el("button", "l3w-btn", "new sequence");
    bNew.type = "button";
    bNew.addEventListener("click", draw);
    ctl.appendChild(bNew);

    var field = el("label", "l3w-field l3w-un-field");
    field.appendChild(el("span", "l3w-ctl-name", "xⁿ ="));
    var input = document.createElement("input");
    input.type = "text";
    input.spellcheck = false;
    input.setAttribute("aria-label", "The bits of the sequence (0 and 1, at most " + NMAX + ")");
    input.setAttribute("inputmode", "numeric");
    field.appendChild(input);
    root.appendChild(field);
    input.addEventListener("input", function () {
      var s = input.value.replace(/[^01]/g, "").slice(0, NMAX);
      if (s.length < 1) return;
      bits = s.split("").map(Number);
      n = bits.length;
      sN.input.value = Math.max(NMIN, n); sN.out.textContent = String(n);
      render(false);
    });

    var fig = el("div", "l3w-figure l3w-un-seq");
    root.appendChild(fig);
    var hint = el("p", "l3w-hint", "Click a bit to flip it.");
    root.appendChild(hint);

    var cw = el("p", "l3w-un-cw");
    root.appendChild(cw);

    var bars = el("div", "l3w-bars");
    bars.setAttribute("role", "img");
    root.appendChild(bars);
    var rows = {};
    [["raw", "without coding", "s-raw"], ["fu", "universal code f_U", null]].forEach(function (r) {
      var name = el("span", "l3w-bar-name", r[1]);
      var track = el("span", "l3w-bar-track");
      var fills = r[2] ? [el("span", "l3w-bar-fill " + r[2])] : [el("span", "l3w-bar-fill s-type"), el("span", "l3w-bar-fill s-index")];
      fills.forEach(function (f) { track.appendChild(f); });
      var mark = el("span", "l3w-bar-mark");
      track.appendChild(mark);
      var val = el("span", "l3w-bar-val");
      bars.appendChild(name); bars.appendChild(track); bars.appendChild(val);
      rows[r[0]] = { fills: fills, mark: mark, val: val, track: track };
    });
    bars.appendChild(el("span", "l3w-bar-name l3w-bar-unit", "bits"));
    var axis = el("span", "l3w-bar-axis");
    var hlabel = el("span", "l3w-bar-hlabel");
    axis.appendChild(hlabel);
    bars.appendChild(axis);
    bars.appendChild(el("span", "l3w-bar-val"));
    var legend = el("ul", "l3w-legend");
    [["s-type", "type, ⌈log(n+1)⌉ bits"], ["s-index", "index in the type class, ⌈log C(n,k)⌉ bits"],
     ["s-H", "n H(P̂), the ideal length of the best i.i.d. code for xⁿ"]].forEach(function (L) {
      var li = el("li");
      var sw = el("span", "l3w-sw l3w-sw-" + L[0]);
      li.appendChild(sw);
      li.appendChild(document.createTextNode(L[1]));
      legend.appendChild(li);
    });
    root.appendChild(legend);
    var readout = el("p", "l3w-readout");
    readout.setAttribute("aria-live", "polite");
    root.appendChild(readout);

    function draw() {                                   // new i.i.d. sequence with P(1) = p
      bits = [];
      for (var i = 0; i < n; i++) bits.push(Math.random() < p ? 1 : 0);
      render(true);
    }

    function render(syncField) {
      if (syncField) input.value = bits.join("");
      // the sequence
      fig.textContent = "";
      var avail = fig.clientWidth || root.clientWidth || 600;
      var cols = Math.min(COLS, n, Math.max(10, Math.floor(avail / 11))), nrows = Math.ceil(n / cols);
      var W = cols * CELL, H = nrows * CELL;
      var s = svg("svg", { viewBox: "-1 -1 " + (W + 2) + " " + (H + 2), role: "img",
        "aria-label": "The sequence xⁿ: " + n + " bits, " + bits.reduce(function (a, b) { return a + b; }, 0) + " ones" });
      s.style.maxWidth = Math.min(38 * 16, (W + 2) * 1.25) + "px";
      lastCols = cols;
      bits.forEach(function (b, i) {
        var x = (i % cols) * CELL, y = Math.floor(i / cols) * CELL;
        var r = svg("rect", { x: x + 1, y: y + 1, width: CELL - 2, height: CELL - 2, rx: 2,
          "class": "l3w-un-bit" + (b ? " is-one" : "") });
        var t = svg("title", {});
        t.textContent = "x" + (i + 1) + " = " + b;
        r.appendChild(t);
        r.addEventListener("click", function () { bits[i] = 1 - bits[i]; render(true); });
        s.appendChild(r);
      });
      fig.appendChild(s);

      // the code
      var k = bits.reduce(function (a, b) { return a + b; }, 0);
      var K = n + 1, lt = ceilLog2(BigInt(K));
      var T = binom(n, k), li = ceilLog2(T), r = rank(bits);
      var tbits = toBits(BigInt(k), lt), ibits = toBits(r, li);
      var nH = n * h2(k / n);
      cw.textContent = "";
      cw.appendChild(el("span", "l3w-un-lbl", "f_U(xⁿ) = "));
      cw.appendChild(el("span", "l3w-un-t", tbits));
      if (li) cw.appendChild(el("span", "l3w-un-i", ibits));
      cw.appendChild(el("span", "l3w-un-len", "  (" + lt + " + " + li + " = " + (lt + li) + " bits)"));

      // the bars
      var xmax = Math.max(n, lt + li) * 1.04;
      rows.raw.fills[0].style.width = (100 * n / xmax) + "%";
      rows.raw.val.textContent = String(n);
      rows.fu.fills[0].style.width = (100 * lt / xmax) + "%";
      rows.fu.fills[1].style.left = "calc(" + (100 * lt / xmax) + "% + 2px)";
      rows.fu.fills[1].style.width = "max(0px, calc(" + (100 * li / xmax) + "% - 2px))";
      rows.fu.fills[1].style.display = li ? "" : "none";
      rows.fu.val.textContent = String(lt + li);
      var left = 100 * nH / xmax;
      [rows.raw, rows.fu].forEach(function (R) { R.mark.style.left = left + "%"; });
      hlabel.style.left = left + "%";
      hlabel.style.transform = left < 22 ? "translateX(-4px)" : left > 78 ? "translateX(calc(-100% + 4px))" : "translateX(-50%)";
      hlabel.textContent = "n H(P̂) = " + nH.toFixed(1);
      rows.raw.track.title = "without coding: " + n + " bits";
      rows.fu.track.title = "f_U: " + lt + " bits for the type and " + li + " bits for the index";
      bars.setAttribute("aria-label", "Lengths in bits: without coding " + n + ", universal code " + (lt + li) +
        " (type " + lt + ", index " + li + "), n H(P̂) " + nH.toFixed(1));

      var bound = (K > 1 ? Math.log2(K) : 0) + nH + 2;
      readout.textContent =
        "xⁿ has k = " + k + " ones, so its type P̂ = [" + ((n - k) / n).toFixed(2) + ", " + (k / n).toFixed(2) +
        "] is type number " + k + " of the K = " + K + " types, written with " + lt + " bits. Its type class has C(" +
        n + "," + k + ") " + (T > 1n ? "≈ 2^" + log2Big(T).toFixed(2) + " sequences" : "= 1 sequence") + ", and xⁿ is number " +
        shortInt(r) + " of them in increasing binary order, written with " + li + " bits. In total, " + (lt + li) +
        " bits instead of n = " + n + ", while n H(P̂) = " + nH.toFixed(1) + " bits and the bound of the notes, (M−1) log(n+1) + n H(P̂) + 2, is " +
        bound.toFixed(1) + " bits. " +
        (k === 0 || k === n ? "A constant sequence costs only the type: its index takes 0 bits."
          : lt + li < n ? "The type costs about log n bits, which a long and skewed sequence easily repays."
          : "When P̂ is close to [1/2, 1/2], nothing can be gained: the type is pure overhead.");
    }
    var lastCols = 0, resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var avail = fig.clientWidth || root.clientWidth || 600;
        if (Math.min(COLS, n, Math.max(10, Math.floor(avail / 11))) !== lastCols) render(false);
      }, 150);
    });
    input.value = bits.join("");
    render(false);
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
