/* Lecture 5 widget: repetition codes over the binary symmetric channel BSC(p) (Section 5.1,
   Problem 1). Each message bit is sent n times (n odd) and the decoder takes a majority vote,
   so the rate is 1/n and the error probability is
     P_e(n) = sum_{j > n/2} C(n, j) p^j (1 - p)^(n - j).
   The chart shows these points (rate on the horizontal axis, error probability on a log
   scale) for n = 1, 3, ..., 31, with the capacity C = 1 - H_2(p) of Section 5.3: at every
   rate below C, long codes have error probabilities as small as desired; at no rate above.
   Below the chart, eight message bits go through the channel in the browser.
   Usage in the class notes:  %web: l5-repetition p=0.1
   Draws into every [data-widget="l5-repetition"] element. No libraries. */
(function () {
  "use strict";
  var NAME = "l5-repetition";
  var SVGNS = "http://www.w3.org/2000/svg";
  var NMAX = 31, BITS = 8, TARGET = -6;          // longest code shown; message bits; 10^-6
  var LN10 = Math.LN10;

  function parseArgs(node) {
    var out = {};
    (node.getAttribute("data-args") || "").split(/\s+/).forEach(function (kv) {
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
  function svg(tag, attrs, text) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function slider(label, min, max, step, value, onInput, show) {
    var wrap = el("label", "l5w-ctl");
    wrap.appendChild(el("span", "l5w-ctl-name", label));
    var input = document.createElement("input");
    input.type = "range"; input.min = min; input.max = max; input.step = step; input.value = value;
    var out = el("output", "l5w-ctl-val", show(value));
    input.addEventListener("input", function () { out.textContent = show(+input.value); onInput(+input.value); });
    wrap.appendChild(input); wrap.appendChild(out);
    wrap.input = input; wrap.output = out;
    return wrap;
  }
  function rng(seed) {                        // mulberry32
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
  var LNFACT = [0];
  function lnFact(m) {
    while (LNFACT.length <= m) LNFACT.push(LNFACT[LNFACT.length - 1] + Math.log(LNFACT.length));
    return LNFACT[m];
  }
  function logAdd(a, b) {
    if (a === -Infinity) return b;
    if (b === -Infinity) return a;
    var m = Math.max(a, b);
    return m + Math.log(Math.exp(a - m) + Math.exp(b - m));
  }
  function log10Pe(n, p) {                    // log10 of P(more than n/2 of the n copies flipped), n odd
    var lp = Math.log(p), lq = Math.log1p(-p), acc = -Infinity;
    for (var j = (n + 1) / 2; j <= n; j++) acc = logAdd(acc, lnFact(n) - lnFact(j) - lnFact(n - j) + j * lp + (n - j) * lq);
    return acc / LN10;
  }
  function nFor(p, l10) {                     // smallest odd n with P_e(n) <= 10^l10 (P_e decreases with n)
    if (log10Pe(1, p) <= l10) return 1;
    var lo = 0, hi = 1;                       // n = 2m + 1
    while (log10Pe(2 * hi + 1, p) > l10) { lo = hi; hi *= 2; if (hi > 1e5) return Infinity; }
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (log10Pe(2 * mid + 1, p) > l10) lo = mid; else hi = mid; }
    return 2 * hi + 1;
  }
  var SUP = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  function sup(k) { return String(k).split("").map(function (c) { return SUP[c]; }).join(""); }
  function fmtP(l10) {                        // a probability given by its log10
    if (l10 >= -2) return Math.pow(10, l10).toFixed(3);
    var e = Math.floor(l10), m = Math.pow(10, l10 - e);
    if (m >= 9.95) { m = 1; e += 1; }
    return m.toFixed(1) + " × 10" + sup(e);
  }

  function mount(root) {
    if (root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    var args = parseArgs(root);
    var p0 = parseFloat(args.p);
    var state = { p: (p0 >= 0.01 && p0 <= 0.45) ? Math.round(p0 * 100) / 100 : 0.1, ni: 1, seed: 22 };
    root.classList.add("l5w", "l5w-rep");
    root.textContent = "";

    var controls = el("div", "l5w-controls");
    var pS = slider("p", 0.01, 0.45, 0.01, state.p, function (v) { state.p = v; draw(); },
      function (v) { return v.toFixed(2); });
    pS.input.setAttribute("aria-label", "Crossover probability p of the binary symmetric channel");
    var nS = slider("n", 0, (NMAX - 1) / 2, 1, state.ni, function (v) { state.ni = v; draw(); },
      function (v) { return String(2 * v + 1); });
    nS.input.setAttribute("aria-label", "Number n of copies of each bit");
    controls.appendChild(pS);
    controls.appendChild(nS);
    root.appendChild(controls);

    var box = el("div", "l5w-figure");
    var s = svg("svg", { role: "img", "aria-label": "Error probability against the rate of the repetition codes, with the capacity" });
    box.appendChild(s);
    root.appendChild(box);

    var legend = el("ul", "l5w-legend");
    function legendItem(kind, cls, text) {
      var li = el("li");
      var sw = svg("svg", { "class": "l5w-sw", viewBox: "0 0 26 10", "aria-hidden": "true" });
      if (kind === "dot") sw.appendChild(svg("circle", { cx: 13, cy: 5, r: 3.6, "class": "l5w-mark " + cls }));
      else if (kind === "zone") sw.appendChild(svg("rect", { x: 1, y: 0, width: 24, height: 10, "class": cls }));
      else sw.appendChild(svg("line", { x1: 1, y1: 5, x2: 25, y2: 5, "class": "l5w-line " + cls }));
      li.appendChild(sw);
      li.appendChild(document.createTextNode(text));
      legend.appendChild(li);
    }
    legendItem("dot", "s-b", "repetition codes, n = 1, 3, …, " + NMAX + ": rate 1/n");
    legendItem("line", "s-limit s-dash", "capacity C = 1 − H₂(p)");
    legendItem("zone", "l5w-zone", "rates where long codes make Pₑ as small as desired");
    root.appendChild(legend);
    var readout = el("p", "l5w-readout");
    readout.setAttribute("aria-live", "polite");
    root.appendChild(readout);

    // eight bits through the channel
    var demo = el("div", "l5w-demo");
    var dhead = el("div", "l5w-controls");
    dhead.appendChild(el("span", "l5w-dtitle", "Eight bits through the channel"));
    var bSend = el("button", "l5w-btn", "send again");
    bSend.type = "button";
    dhead.appendChild(bSend);
    demo.appendChild(dhead);
    var dscroll = el("div", "l5w-scroll");
    var grid = el("div", "l5w-rep-grid");
    dscroll.appendChild(grid);
    demo.appendChild(dscroll);
    var dnote = el("p", "l5w-readout");
    dnote.setAttribute("aria-live", "polite");
    demo.appendChild(dnote);
    root.appendChild(demo);
    bSend.addEventListener("click", function () { state.seed = (Math.imul(state.seed, 1103515245) + 12345) >>> 0; draw(); });

    var lastW = 0;
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var w = Math.round(box.clientWidth);
        if (w && Math.abs(w - lastW) > 8) draw();
      }).observe(box);
    }

    function showDemo(n, p) {
      // the same uniforms for every (p, n): a larger p only adds flips, a larger n only adds copies
      var r = rng(state.seed), msg = [], U = [], i, j;
      for (i = 0; i < BITS; i++) {
        msg.push(r() < 0.5 ? 0 : 1);
        var u = [];
        for (j = 0; j < NMAX; j++) u.push(r());
        U.push(u);
      }
      grid.textContent = "";
      ["bit", "received copies", "vote"].forEach(function (t) { grid.appendChild(el("span", "l5w-rep-h", t)); });
      var wrongBits = 0, flips = 0;
      for (i = 0; i < BITS; i++) {
        var copies = el("span", "l5w-bin l5w-rep-bits"), ones = 0;
        for (j = 0; j < n; j++) {
          var f = U[i][j] < p, b = msg[i] ^ (f ? 1 : 0);
          ones += b; flips += f ? 1 : 0;
          copies.appendChild(el("span", f ? "l5w-err" : null, String(b)));
        }
        var dec = ones * 2 > n ? 1 : 0, bad = dec !== msg[i];
        if (bad) wrongBits++;
        grid.appendChild(el("span", "l5w-bin l5w-rep-msg", String(msg[i])));
        grid.appendChild(copies);
        var v = el("span", "l5w-bin l5w-rep-dec");
        v.appendChild(el("span", bad ? "l5w-err" : null, String(dec)));
        v.appendChild(document.createTextNode(bad ? " ✗" : " ✓"));
        grid.appendChild(v);
      }
      dnote.textContent = flips + " of the " + BITS * n + " copies flipped (" + (BITS * n * p).toFixed(1) +
        " on average); after the votes, " + wrongBits + " of the " + BITS + " bits " +
        (wrongBits === 1 ? "is" : "are") + " wrong (" + (BITS * Math.pow(10, log10Pe(n, p))).toFixed(2) + " on average).";
    }

    function draw() {
      var p = state.p, n = 2 * state.ni + 1, C = 1 - h2(p);
      var pts = [], m;
      for (m = 1; m <= NMAX; m += 2) pts.push({ n: m, R: 1 / m, l: log10Pe(m, p) });
      var minL = Math.min.apply(null, pts.map(function (q) { return q.l; }));
      var span = Math.max(3, Math.ceil(-minL)), stepD = span <= 8 ? 1 : span <= 16 ? 2 : span <= 30 ? 5 : 10;
      var lo = -Math.ceil(span / stepD) * stepD;

      lastW = Math.round(box.clientWidth) || 560;
      var W = Math.max(300, Math.min(600, lastW));
      var Hh = W < 420 ? 250 : 290, L = 54, Rm = 14, T = 12, B = 36;
      function X(r) { return L + r * (W - L - Rm); }
      function Y(l) { return T + (l / lo) * (Hh - T - B); }
      s.setAttribute("viewBox", "0 0 " + W + " " + Hh);
      while (s.firstChild) s.removeChild(s.firstChild);

      s.appendChild(svg("rect", { x: X(0).toFixed(1), y: T, width: Math.max(0, X(C) - X(0)).toFixed(1), height: Hh - T - B, "class": "l5w-zone" }));
      var g;
      for (g = 0; g >= lo; g -= stepD) {
        s.appendChild(svg("line", { x1: L, y1: Y(g).toFixed(1), x2: W - Rm, y2: Y(g).toFixed(1), "class": g === lo ? "l5w-axis" : "l5w-grid" }));
        s.appendChild(svg("text", { x: L - 6, y: (Y(g) + 4).toFixed(1), "class": "l5w-tick", "text-anchor": "end" }, g === 0 ? "1" : "10" + sup(g)));
      }
      for (g = 0; g <= 1.0001; g += 0.2) {
        s.appendChild(svg("line", { x1: X(g).toFixed(1), y1: Hh - B, x2: X(g).toFixed(1), y2: Hh - B + 4, "class": "l5w-axis" }));
        s.appendChild(svg("text", { x: X(g).toFixed(1), y: Hh - B + 16, "class": "l5w-tick", "text-anchor": "middle" }, String(+g.toFixed(1))));
      }
      s.appendChild(svg("line", { x1: L, y1: T, x2: L, y2: Hh - B, "class": "l5w-axis" }));
      s.appendChild(svg("text", { x: ((L + W - Rm) / 2).toFixed(1), y: Hh - 3, "class": "l5w-lbl", "text-anchor": "middle" }, "rate R (bits per channel use)"));
      var ym = ((T + Hh - B) / 2).toFixed(1);
      s.appendChild(svg("text", { x: 11, y: ym, "class": "l5w-lbl l5w-ylbl", "text-anchor": "middle", transform: "rotate(-90 11 " + ym + ")" }, "error probability (log scale)"));

      // capacity
      s.appendChild(svg("line", { x1: X(C).toFixed(1), y1: T, x2: X(C).toFixed(1), y2: Hh - B, "class": "l5w-line s-limit s-dash" }));
      var right = C < 0.62;
      s.appendChild(svg("text", { x: (X(C) + (right ? 6 : -6)).toFixed(1), y: T + 14, "class": "l5w-lbl", "text-anchor": right ? "start" : "end" }, "C = " + C.toFixed(3)));

      // repetition codes
      var d = "";
      pts.forEach(function (q, i) { d += (i ? "L" : "M") + X(q.R).toFixed(1) + " " + Y(q.l).toFixed(1); });
      s.appendChild(svg("path", { d: d, "class": "l5w-line s-b l5w-rep-path" }));
      pts.forEach(function (q) {
        s.appendChild(svg("circle", { cx: X(q.R).toFixed(1), cy: Y(q.l).toFixed(1), r: 2.8, "class": "l5w-mark s-b l5w-dot" }));
      });
      var cur = pts[state.ni];
      s.appendChild(svg("polyline", { points: L + "," + Y(cur.l).toFixed(1) + " " + X(cur.R).toFixed(1) + "," + Y(cur.l).toFixed(1) + " " +
        X(cur.R).toFixed(1) + "," + (Hh - B), "class": "l5w-cursor" }));
      s.appendChild(svg("circle", { cx: X(cur.R).toFixed(1), cy: Y(cur.l).toFixed(1), r: 5.5, "class": "l5w-mark s-b" }));
      var lab = "n = " + n, lx = X(cur.R) + 9, anchor = "start";
      if (lx > W - Rm - 40) { lx = X(cur.R) - 9; anchor = "end"; }
      s.appendChild(svg("text", { x: lx.toFixed(1), y: (Y(cur.l) - 8).toFixed(1), "class": "l5w-lbl", "text-anchor": anchor }, lab));

      var nT = nFor(p, TARGET);
      var txt = "Each bit sent n = " + n + (n === 1 ? " time (no code)" : " times") + ": rate " +
        (n === 1 ? "1" : "1/" + n + " = " + (1 / n).toFixed(3)) + " bit per channel use, error probability " +
        fmtP(cur.l) + (n === 1 ? " = p. " : " after the majority vote. ");
      txt += isFinite(nT) ? "Reaching 10" + sup(TARGET) + " by repetition takes n = " + nT + ", a rate of " +
        (1 / nT).toFixed(nT > 200 ? 4 : 3) + ". " : "";
      txt += "Yet the capacity of the BSC(" + p.toFixed(2) + ") is C = 1 − H₂(" + p.toFixed(2) + ") = " + C.toFixed(3) +
        ": at every rate below C, long codes reach error probabilities as small as desired (Section 5.5), and at no rate above C (Section 5.4).";
      readout.textContent = txt;
      showDemo(n, p);
    }
    draw();
  }

  function init() {
    var nodes = document.querySelectorAll('[data-widget="' + NAME + '"]');
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
