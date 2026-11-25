/* Lecture 3 widget: bits per source symbol when blocks of n symbols of a binary i.i.d. source
   P = [1-p, p] are encoded at once, against n (log scale):
     optimal lossless codes (1/n) L*(P^n) (exact, with BigInt), Huffman codes (1/n) L*_UD(P^n)
     (n <= 16), the Shannon code for P^n, the universal code of the notes, H(P) and H(P) + 1/n.
   Usage in the class notes:  %web: l3-rate p=0.11
   Draws into every [data-widget="l3-rate"] element. No libraries. */
(function () {
  "use strict";
  var NAME = "l3-rate";
  var SVGNS = "http://www.w3.org/2000/svg";
  var NS = [];
  (function () {
    var n;
    for (n = 1; n <= 16; n++) NS.push(n);
    [20, 24, 28, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 448, 512,
     640, 768, 896, 1024].forEach(function (v) { NS.push(v); });
  })();
  var NHUFF = 16;
  var COUNT = 0;
  var SERIES = [
    { key: "huff", label: "Huffman code, (1/n) L̄*_UD(Pⁿ), for n ≤ 16", cls: "s-huff" },
    { key: "shan", label: "Shannon code for Pⁿ", cls: "s-shan" },
    { key: "univ", label: "universal code f_U", cls: "s-univ" },
    { key: "star", label: "best lossless code, (1/n) L̄*(Pⁿ)", cls: "s-star" },
    { key: "H", label: "entropy H(P)", cls: "s-H" },
    { key: "bound", label: "H(P) + 1/n", cls: "s-bound" }
  ];

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
  function svg(tag, attrs, text) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
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
    return wrap;
  }
  function h2(p) { return (p <= 0 || p >= 1) ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p); }

  // ---- exact parts, independent of p (computed once) -----------------------------------
  var HEXBITS = { "1": 1, "2": 2, "3": 2, "4": 3, "5": 3, "6": 3, "7": 3 };
  function bitLength(x) {
    if (x === 0n) return 0;
    var h = x.toString(16);
    return (h.length - 1) * 4 + (HEXBITS[h[0]] || 4);
  }
  function log2Big(x) {                      // log2 of a positive BigInt, as a float
    var b = bitLength(x);
    if (b <= 52) return Math.log2(Number(x));
    return (b - 52) + Math.log2(Number(x >> BigInt(b - 52)));
  }
  function F(m) {                            // sum of floor(log2 i) for i = 1..m
    if (m <= 0n) return 0n;
    var t = BigInt(bitLength(m) - 1), p = 1n << t;
    return (t - 2n) * p + 2n + t * (m - p + 1n);
  }
  var TABLE = null;
  function table() {
    if (TABLE) return TABLE;
    TABLE = {};
    NS.forEach(function (n) {
      var C = 1n, R = 0n, row = [];
      for (var k = 0; k <= n; k++) {
        // the 2^n sequences sorted by decreasing probability (p < 1/2): k ones occupy the ranks R+1..R+C
        var d = F(R + C) - F(R);
        row.push({ lC: log2Big(C), cC: bitLength(C - 1n), lD: d > 0n ? log2Big(d) : -Infinity, C: n <= NHUFF ? Number(C) : 0 });
        R += C;
        C = C * BigInt(n - k) / BigInt(k + 1);
      }
      TABLE[n] = row;
    });
    return TABLE;
  }

  function huffmanLength(n, p) {             // expected length of a Huffman code for P^n
    var row = table()[n], leaves = [];
    for (var k = n; k >= 0; k--) {           // increasing probabilities when p < 1/2
      var q = Math.pow(p, k) * Math.pow(1 - p, n - k);
      for (var j = 0; j < row[k].C; j++) leaves.push(q);
    }
    leaves.sort(function (a, b) { return a - b; });
    var merged = new Float64Array(leaves.length), i = 0, mi = 0, mn = 0, total = 0;
    function pop() {
      if (i < leaves.length && (mi >= mn || leaves[i] <= merged[mi])) return leaves[i++];
      return merged[mi++];
    }
    for (var s = 0; s < leaves.length - 1; s++) {
      var v = pop() + pop();
      merged[mn++] = v;
      total += v;
    }
    return total;
  }

  function compute(p) {
    var lp = Math.log2(p), lq = Math.log2(1 - p), out = {};
    NS.forEach(function (n) {
      var row = table()[n], star = 0, shan = 0, univ = 0;
      for (var k = 0; k <= n; k++) {
        var ls = k * lp + (n - k) * lq;      // log2 of the probability of one sequence with k ones
        var pk = Math.pow(2, row[k].lC + ls);  // probability of the type class
        if (row[k].lD > -Infinity) star += Math.pow(2, row[k].lD + ls);
        shan += pk * Math.max(0, Math.ceil(-ls - 1e-9));
        univ += pk * row[k].cC;
      }
      univ += bitLength(BigInt(n));          // ceil(log2(n+1)) bits for the type
      out[n] = { star: star / n, shan: shan / n, univ: univ / n, huff: n <= NHUFF ? huffmanLength(n, p) / n : null };
    });
    return out;
  }

  function mount(root) {
    if (root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    var args = parseArgs(root);
    var p0 = parseFloat(args.p);
    if (!(p0 > 0 && p0 < 1)) p0 = 0.11;
    if (p0 > 0.5) p0 = 1 - p0;
    var state = { p: Math.max(0.01, Math.min(0.5, Math.round(p0 * 100) / 100)), ni: NS.indexOf(8), data: null };
    var uid = ++COUNT;
    root.classList.add("l3w", "l3w-rt");
    root.innerHTML = "";
    var controls = el("div", "l3w-controls");
    var nSlider = slider("n", 0, NS.length - 1, 1, state.ni, function (v) { state.ni = v; draw(); },
      function (v) { return String(NS[v]); });
    controls.appendChild(slider("P(1) = p", 0.01, 0.5, 0.01, state.p, function (v) {
      state.p = Math.round(v * 100) / 100; state.data = null; draw();
    }, function (v) { return v.toFixed(2); }));
    controls.appendChild(nSlider);
    root.appendChild(controls);
    var box = el("div", "l3w-figure");
    var s = svg("svg", { role: "img", "aria-label": "Expected codeword length per source symbol against the block length n" });
    box.appendChild(s);
    root.appendChild(box);
    var legend = el("ul", "l3w-legend");
    SERIES.forEach(function (sr) {
      var li = el("li", sr.cls);
      var sw = svg("svg", { "class": "l3w-sw", viewBox: "0 0 26 10", "aria-hidden": "true" });
      sw.appendChild(svg("line", { x1: 1, y1: 5, x2: 25, y2: 5, "class": "l3w-line " + sr.cls }));
      li.appendChild(sw);
      li.appendChild(document.createTextNode(sr.label));
      legend.appendChild(li);
    });
    root.appendChild(legend);
    var readout = el("p", "l3w-readout");
    readout.setAttribute("aria-live", "polite");
    root.appendChild(readout);

    var lastW = 0, geom = null;
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var w = Math.round(box.clientWidth);
        if (w && Math.abs(w - lastW) > 8) draw();
      }).observe(box);
    }
    // pointer on the chart: move the cursor to the nearest block length
    function pick(ev) {
      if (!geom) return;
      var rect = s.getBoundingClientRect();
      if (!rect.width) return;
      var x = (ev.clientX - rect.left) * geom.W / rect.width;
      var lg = (x - geom.L) / (geom.W - geom.L - geom.R) * 10;
      var best = 0;
      NS.forEach(function (n, k) { if (Math.abs(Math.log2(n) - lg) < Math.abs(Math.log2(NS[best]) - lg)) best = k; });
      if (best !== state.ni) {
        state.ni = best;
        var inp = nSlider.querySelector("input"), out = nSlider.querySelector("output");
        inp.value = best; out.textContent = String(NS[best]);
        draw();
      }
    }
    s.addEventListener("pointermove", pick);
    s.addEventListener("pointerdown", pick);

    function draw() {
      if (!state.data) state.data = compute(state.p);
      var data = state.data, Hp = h2(state.p);
      lastW = Math.round(box.clientWidth) || 560;
      var W = Math.max(300, Math.min(600, lastW));
      var Hh = W < 420 ? 240 : 280, L = 46, R = 12, T = 12, B = 34;
      geom = { W: W, L: L, R: R };
      var yMax = 1.2;
      NS.forEach(function (n) {
        var d = data[n];
        [d.shan, d.univ, d.huff].forEach(function (v) { if (v != null && n >= 2) yMax = Math.max(yMax, Math.min(1.6, v)); });
      });
      yMax = Math.ceil(yMax * 10 - 1e-9) / 10;
      function X(n) { return L + Math.log2(n) / 10 * (W - L - R); }
      function Y(v) { return T + (1 - v / yMax) * (Hh - T - B); }
      s.setAttribute("viewBox", "0 0 " + W + " " + Hh);
      while (s.firstChild) s.removeChild(s.firstChild);
      var clipId = "l3rt-clip-" + uid;
      var defs = svg("defs", {}), cp = svg("clipPath", { id: clipId });
      cp.appendChild(svg("rect", { x: L, y: T - 3, width: W - L - R, height: Hh - T - B + 3 }));
      defs.appendChild(cp);
      s.appendChild(defs);
      var plot = svg("g", { "clip-path": "url(#" + clipId + ")" });
      // grid and axes
      for (var g = 0; g <= yMax + 1e-9; g += 0.2) {
        s.appendChild(svg("line", { x1: L, y1: Y(g).toFixed(1), x2: W - R, y2: Y(g).toFixed(1), "class": g ? "l3w-grid" : "l3w-axis" }));
        s.appendChild(svg("text", { x: L - 6, y: (Y(g) + 4).toFixed(1), "class": "l3w-tick", "text-anchor": "end" }, (+g.toFixed(1)).toString()));
      }
      [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024].forEach(function (n) {
        if (W < 420 && [2, 8, 32, 128, 512].indexOf(n) >= 0) return;
        s.appendChild(svg("line", { x1: X(n).toFixed(1), y1: Hh - B, x2: X(n).toFixed(1), y2: Hh - B + 4, "class": "l3w-axis" }));
        s.appendChild(svg("text", { x: X(n).toFixed(1), y: Hh - B + 16, "class": "l3w-tick", "text-anchor": "middle" }, String(n)));
      });
      s.appendChild(svg("text", { x: ((L + W - R) / 2).toFixed(1), y: Hh - 3, "class": "l3w-lbl", "text-anchor": "middle" }, "block length n (log scale)"));
      var ym = ((T + Hh - B) / 2).toFixed(1);
      s.appendChild(svg("text", { x: 10, y: ym, "class": "l3w-lbl l3w-ylbl", "text-anchor": "middle", transform: "rotate(-90 10 " + ym + ")" }, "bits per symbol"));
      // H(P) + 1/n and H(P)
      var dB = "";
      for (var j = 0; j <= 200; j++) {
        var nn = Math.pow(2, j / 20);
        dB += (j ? "L" : "M") + X(nn).toFixed(1) + " " + Y(Hp + 1 / nn).toFixed(1);
      }
      s.appendChild(plot);
      plot.appendChild(svg("path", { d: dB, "class": "l3w-line s-bound" }));
      plot.appendChild(svg("line", { x1: L, y1: Y(Hp).toFixed(1), x2: W - R, y2: Y(Hp).toFixed(1), "class": "l3w-line s-H" }));
      // the codes
      ["star", "univ", "shan", "huff"].forEach(function (key) {
        var d = "", first = true;
        NS.forEach(function (n) {
          var v = data[n][key];
          if (v == null) return;
          d += (first ? "M" : "L") + X(n).toFixed(1) + " " + Y(v).toFixed(1);
          first = false;
        });
        plot.appendChild(svg("path", { d: d, "class": "l3w-line s-" + key }));
      });
      // the chosen n: cursor and markers
      var n0 = NS[state.ni], v0 = data[n0];
      s.appendChild(svg("line", { x1: X(n0).toFixed(1), y1: T, x2: X(n0).toFixed(1), y2: Hh - B, "class": "l3w-cursor" }));
      ["star", "univ", "shan", "huff"].forEach(function (key) {
        if (v0[key] == null || v0[key] > yMax) return;
        s.appendChild(svg("circle", { cx: X(n0).toFixed(1), cy: Y(v0[key]).toFixed(1), r: 4, "class": "l3w-mark s-" + key }));
      });
      var parts = ["n = " + n0 + ": best lossless code " + v0.star.toFixed(3)];
      if (v0.huff != null) parts.push("Huffman code " + v0.huff.toFixed(3));
      parts.push("Shannon code " + v0.shan.toFixed(3));
      parts.push("universal code " + v0.univ.toFixed(3));
      readout.textContent = parts.join(", ") + " bits per symbol, against H(P) = " + Hp.toFixed(3) + " and H(P) + 1/n = " +
        (Hp + 1 / n0).toFixed(3) + ". The best lossless codes stay below H(P), the UD codes above it, and all tend to H(P)" +
        (v0.huff == null ? "; the Huffman codes are computed for n \u2264 " + NHUFF + "." : ".");
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
