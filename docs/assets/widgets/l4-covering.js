/* Lecture 4 widget: random codes for fair bits with the Hamming distortion (Section 4.4.2,
   covering lemma; Problem 9). A codebook of K = 2^k codewords, i.i.d. uniform on {0,1}^n, is
   used at the rate R = k/n; x^n is encoded by the index of a closest codeword. The distortion
   averaged over the random codebook is computed exactly,
     E[ min_j d_n(x^n, Xhat^n(j)) ] = sum_{t=1}^{n} P(Bin(n,1/2) >= t)^K,
   and plotted against R(D) = 1 - H_2(D), with D on the horizontal axis as in the notes.
   For codebooks of at most 2^16 words and n <= 64, one codebook is drawn in the browser: a
   random block, its closest codeword and the index sent, and the distortion of this codebook
   on 200 random blocks.
   Usage in the class notes:  %web: l4-covering
   Draws into every [data-widget="l4-covering"] element. No libraries. */
(function () {
  "use strict";
  var NAME = "l4-covering";
  var SVGNS = "http://www.w3.org/2000/svg";
  var NS = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024];
  var KMAX_DRAW = 16, NMAX_DRAW = 64, BLOCKS = 200;
  var LN2 = Math.LN2;
  var COUNT = 0;

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
    var wrap = el("label", "l4w-ctl");
    wrap.appendChild(el("span", "l4w-ctl-name", label));
    var input = document.createElement("input");
    input.type = "range"; input.min = min; input.max = max; input.step = step; input.value = value;
    var out = el("output", "l4w-ctl-val", show(value));
    input.addEventListener("input", function () { out.textContent = show(+input.value); onInput(+input.value); });
    wrap.appendChild(input); wrap.appendChild(out);
    wrap.input = input; wrap.output = out;
    return wrap;
  }
  function h2(p) { return (p <= 0 || p >= 1) ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p); }
  function dOfR(R) {                          // D(R) for fair bits: H_2(D) = 1 - R, D in [0, 1/2]
    if (R >= 1) return 0;
    if (R <= 0) return 0.5;
    var lo = 0, hi = 0.5;
    for (var i = 0; i < 60; i++) { var m = (lo + hi) / 2; if (h2(m) < 1 - R) lo = m; else hi = m; }
    return (lo + hi) / 2;
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
  function popcount(x) {
    x = x - ((x >>> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    return Math.imul((x + (x >>> 4)) & 0x0F0F0F0F, 0x01010101) >>> 24;
  }
  function logAdd(a, b) {
    if (a === -Infinity) return b;
    if (b === -Infinity) return a;
    var m = Math.max(a, b);
    return m + Math.log(Math.exp(a - m) + Math.exp(b - m));
  }

  // ---- exact average distortion of random codes of length n --------------------------------
  var LNFACT = [0];
  function lnFact(m) {
    while (LNFACT.length <= m) LNFACT.push(LNFACT[LNFACT.length - 1] + Math.log(LNFACT.length));
    return LNFACT[m];
  }
  var CACHE = {};
  function curve(n) {                          // D_k for k = 0..n (natural logs inside)
    if (CACHE[n]) return CACHE[n];
    var lnTerm = [], t;
    for (t = 0; t <= n; t++) lnTerm.push(lnFact(n) - lnFact(t) - lnFact(n - t) - n * LN2);
    var lnCdf = [], acc = -Infinity;           // ln P(Bin <= t)
    for (t = 0; t <= n; t++) { acc = logAdd(acc, lnTerm[t]); lnCdf.push(acc); }
    var lnTail = [], tacc = -Infinity;         // ln P(Bin >= t), t = 0..n
    for (t = n; t >= 0; t--) { tacc = logAdd(tacc, lnTerm[t]); lnTail[t] = tacc; }
    // for t = 1..n: g_t = -ln P(Bin >= t) = -ln(1 - P(Bin <= t-1)), kept as ln g_t
    var lng = [];
    for (t = 1; t <= n; t++) {
      var lc = lnCdf[t - 1], g;
      if (lc < Math.log(0.5)) g = -Math.log1p(-Math.exp(lc));
      else g = -lnTail[t];
      lng.push(g > 0 ? Math.log(g) : -Infinity);
    }
    var D = [];
    for (var k = 0; k <= n; k++) {
      var s = 0, lnK = k * LN2;
      for (t = 0; t < n; t++) {
        var e = lnK + lng[t];                  // ln(K g_t); the term is P(min >= t+1) = exp(-K g_t)
        if (e > 50) break;                     // the next terms are smaller still
        s += Math.exp(-Math.exp(e));
      }
      D.push(s / n);
    }
    CACHE[n] = D;
    return D;
  }

  // ---- one codebook drawn in the browser -------------------------------------------------------
  function drawCodebook(n, k, seed) {
    var r = rng(seed), K = 1 << k, lo = new Uint32Array(K), hi = new Uint32Array(K);
    var mlo = n >= 32 ? 0xFFFFFFFF : (Math.pow(2, n) - 1), mhi = n > 32 ? (n >= 64 ? 0xFFFFFFFF : Math.pow(2, n - 32) - 1) : 0;
    for (var j = 0; j < K; j++) {
      lo[j] = (r() * 4294967296) >>> 0 & mlo;
      hi[j] = (r() * 4294967296) >>> 0 & mhi;
    }
    return { n: n, k: k, K: K, lo: lo, hi: hi, mlo: mlo >>> 0, mhi: mhi >>> 0, r: rng(seed ^ 0x9E3779B9) };
  }
  function block(cb) { return [(cb.r() * 4294967296) >>> 0 & cb.mlo, (cb.r() * 4294967296) >>> 0 & cb.mhi]; }
  function closest(cb, x) {
    var best = 0, bd = 1e9, lo = cb.lo, hi = cb.hi, xl = x[0], xh = x[1];
    for (var j = 0; j < cb.K; j++) {
      var d = popcount((lo[j] ^ xl) >>> 0) + popcount((hi[j] ^ xh) >>> 0);
      if (d < bd) { bd = d; best = j; if (!d) break; }
    }
    return { j: best, d: bd };
  }
  function bitString(lo, hi, n) {             // bit i of the block is bit i of (lo, hi)
    var s = "";
    for (var i = 0; i < n; i++) s += (i < 32 ? (lo >>> i) & 1 : (hi >>> (i - 32)) & 1);
    return s;
  }
  function binary(j, k) {
    var s = "";
    for (var i = k - 1; i >= 0; i--) s += (j >>> i) & 1;
    return s || "∅";
  }
  function group(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  var SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  function pow2(k) {                           // "2¹⁶ = 65 536", or "2⁶⁴" when large
    var e = String(k).split("").map(function (c) { return SUP[+c]; }).join("");
    return "2" + e + (k <= 20 ? " = " + group(Math.pow(2, k)) : "");
  }

  function mount(root) {
    if (root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    var args = parseArgs(root);
    var n0 = parseInt(args.n, 10), r0 = parseFloat(args.R);
    var state = {
      ni: NS.indexOf(NS.indexOf(n0) >= 0 ? n0 : 32),
      R: (r0 > 0 && r0 < 1) ? r0 : 0.5,
      seed: 20261118, cb: null, cbKey: "", sample: null, busy: false
    };
    var pending = null;
    var uid = ++COUNT;
    root.classList.add("l4w", "l4w-cv");
    root.textContent = "";

    var controls = el("div", "l4w-controls");
    var nSlider = slider("n", 0, NS.length - 1, 1, state.ni, function (v) { state.ni = v; draw(); },
      function (v) { return String(NS[v]); });
    var rSlider = slider("rate", 0.02, 0.98, 0.01, state.R, function (v) { state.R = v; draw(); },
      function (v) { return v.toFixed(2); });
    controls.appendChild(nSlider);
    controls.appendChild(rSlider);
    root.appendChild(controls);

    var box = el("div", "l4w-figure");
    var s = svg("svg", { role: "img", "aria-label": "Distortion and rate of random codes of length n for fair bits, with the rate-distortion function" });
    box.appendChild(s);
    root.appendChild(box);
    var legend = el("ul", "l4w-legend");
    [["s-limit", "R(D) = 1 − H₂(D): long blocks"], ["s-a", "random codes of length n, averaged over the codebooks"]].forEach(function (it) {
      var li = el("li");
      var sw = svg("svg", { "class": "l4w-sw", viewBox: "0 0 26 10", "aria-hidden": "true" });
      sw.appendChild(svg("line", { x1: 1, y1: 5, x2: 25, y2: 5, "class": "l4w-line " + it[0] }));
      li.appendChild(sw);
      li.appendChild(document.createTextNode(it[1]));
      legend.appendChild(li);
    });
    root.appendChild(legend);
    var readout = el("p", "l4w-readout");
    readout.setAttribute("aria-live", "polite");
    root.appendChild(readout);

    // one codebook, drawn in the browser
    var demo = el("div", "l4w-cv-demo");
    var dhead = el("div", "l4w-controls");
    var bNew = el("button", "l4w-btn", "another block");
    bNew.type = "button";
    var bBook = el("button", "l4w-btn", "another codebook");
    bBook.type = "button";
    dhead.appendChild(el("span", "l4w-cv-dtitle", "One codebook, drawn in your browser"));
    dhead.appendChild(bNew);
    dhead.appendChild(bBook);
    demo.appendChild(dhead);
    var dbody = el("div", "l4w-scroll");
    var seqs = el("div", "l4w-cv-seqs");
    dbody.appendChild(seqs);
    demo.appendChild(dbody);
    var dnote = el("p", "l4w-readout");
    dnote.setAttribute("aria-live", "polite");
    demo.appendChild(dnote);
    root.appendChild(demo);
    bNew.addEventListener("click", function () { if (state.cb) { state.sample = sampleOne(); showDemo(); } });
    bBook.addEventListener("click", function () { state.seed = (state.seed * 1103515245 + 12345) >>> 0; state.cbKey = ""; draw(); });

    function sampleOne() {
      var x = block(state.cb), c = closest(state.cb, x);
      return { x: x, j: c.j, d: c.d };
    }
    function showDemo() {
      var n = NS[state.ni], k = Math.ceil(n * state.R - 1e-9);
      seqs.textContent = "";
      if (state.busy) {
        dnote.textContent = "Drawing a codebook of " + pow2(k) + " words…";
        bNew.disabled = true; bBook.disabled = true;
        return;
      }
      if (!state.cb) {
        demo.classList.add("l4w-cv-off");
        dnote.textContent = (n > NMAX_DRAW ? "Blocks of n = " + n + " bits are too long to show here" :
          "A codebook of " + pow2(k) + " words is too large to draw here") +
          ": take n ≤ " + NMAX_DRAW + " and indices of at most " + KMAX_DRAW + " bits to see one. The curve above is exact for every n.";
        bNew.disabled = true; bBook.disabled = true;
        return;
      }
      demo.classList.remove("l4w-cv-off");
      bNew.disabled = false; bBook.disabled = false;
      var sm = state.sample, cb = state.cb;
      var xs = bitString(sm.x[0], sm.x[1], n), cs = bitString(cb.lo[sm.j], cb.hi[sm.j], n);
      function row(name, str, mark) {
        var nm = el("span", "l4w-cv-name", name), v = el("span", "l4w-bin l4w-cv-bits");
        for (var i = 0; i < str.length; i++) {
          var wrong = mark && str[i] !== xs[i];
          v.appendChild(el("span", wrong ? "l4w-err" : null, str[i]));
        }
        seqs.appendChild(nm); seqs.appendChild(v);
      }
      row("block xⁿ", xs, false);
      row("closest codeword", cs, true);
      var nm = el("span", "l4w-cv-name", "index sent (" + k + " bits)"), v = el("span", "l4w-bin l4w-cv-bits l4w-cv-index", binary(sm.j, k));
      seqs.appendChild(nm); seqs.appendChild(v);
      dnote.textContent = "This block: " + sm.d + " wrong bits out of " + n + " (" + (sm.d / n).toFixed(3) + "). " +
        "This codebook on " + BLOCKS + " random blocks: distortion " + state.cbAvg.toFixed(3) +
        ", close to the average over the codebooks, " + curve(n)[k].toFixed(3) + ": most codebooks are good.";
    }

    var lastW = 0;
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var w = Math.round(box.clientWidth);
        if (w && Math.abs(w - lastW) > 8) draw();
      }).observe(box);
    }

    function draw() {
      var n = NS[state.ni], k = Math.max(0, Math.min(n, Math.ceil(n * state.R - 1e-9))), Rn = k / n;
      var D = curve(n), Dk = D[k], Dlim = dOfR(Rn);
      // codebook in the browser (drawn after a short pause, so that the sliders stay smooth)
      var key = n + ":" + k + ":" + state.seed;
      if (n <= NMAX_DRAW && k <= KMAX_DRAW) {
        if (state.cbKey !== key) {
          clearTimeout(pending);
          state.cb = null; state.busy = true;
          pending = setTimeout(function () {
            state.cb = drawCodebook(n, k, state.seed);
            state.cbKey = key;
            var tot = 0;
            for (var b = 0; b < BLOCKS; b++) tot += closest(state.cb, block(state.cb)).d;
            state.cbAvg = tot / (BLOCKS * n);
            state.sample = sampleOne();
            state.busy = false;
            showDemo();
          }, k >= 12 ? 160 : 40);
        }
      } else {
        clearTimeout(pending);
        state.cb = null; state.cbKey = ""; state.busy = false;
      }
      showDemo();

      lastW = Math.round(box.clientWidth) || 560;
      var W = Math.max(300, Math.min(600, lastW));
      var Hh = W < 420 ? 250 : 290, L = 54, Rm = 14, T = 12, B = 36;
      function X(d) { return L + d / 0.5 * (W - L - Rm); }
      function Y(r) { return T + (1 - r) * (Hh - T - B); }
      s.setAttribute("viewBox", "0 0 " + W + " " + Hh);
      while (s.firstChild) s.removeChild(s.firstChild);
      var g;
      for (g = 0; g <= 1.0001; g += 0.25) {
        s.appendChild(svg("line", { x1: L, y1: Y(g).toFixed(1), x2: W - Rm, y2: Y(g).toFixed(1), "class": g ? "l4w-grid" : "l4w-axis" }));
        s.appendChild(svg("text", { x: L - 6, y: (Y(g) + 4).toFixed(1), "class": "l4w-tick", "text-anchor": "end" }, String(+g.toFixed(2))));
      }
      for (g = 0; g <= 0.5001; g += 0.1) {
        s.appendChild(svg("line", { x1: X(g).toFixed(1), y1: Hh - B, x2: X(g).toFixed(1), y2: Hh - B + 4, "class": "l4w-axis" }));
        s.appendChild(svg("text", { x: X(g).toFixed(1), y: Hh - B + 16, "class": "l4w-tick", "text-anchor": "middle" }, String(+g.toFixed(1))));
      }
      s.appendChild(svg("line", { x1: L, y1: T, x2: L, y2: Hh - B, "class": "l4w-axis" }));
      s.appendChild(svg("text", { x: ((L + W - Rm) / 2).toFixed(1), y: Hh - 3, "class": "l4w-lbl", "text-anchor": "middle" }, "distortion D (fraction of wrong bits)"));
      var ym = ((T + Hh - B) / 2).toFixed(1);
      s.appendChild(svg("text", { x: 11, y: ym, "class": "l4w-lbl l4w-ylbl", "text-anchor": "middle", transform: "rotate(-90 11 " + ym + ")" }, "rate R (bits per symbol)"));
      // R(D)
      var dl = "";
      for (var j = 0; j <= 200; j++) {
        var dd = 0.5 * j / 200;
        dl += (j ? "L" : "M") + X(dd).toFixed(1) + " " + Y(1 - h2(dd)).toFixed(1);
      }
      s.appendChild(svg("path", { d: dl, "class": "l4w-line s-limit" }));
      // random codes: points (D_k, k/n)
      var dr = "";
      for (var kk = 0; kk <= n; kk++) dr += (kk ? "L" : "M") + X(D[kk]).toFixed(1) + " " + Y(kk / n).toFixed(1);
      s.appendChild(svg("path", { d: dr, "class": "l4w-line s-a" }));
      if (n <= 32) {
        for (kk = 0; kk <= n; kk++) s.appendChild(svg("circle", { cx: X(D[kk]).toFixed(1), cy: Y(kk / n).toFixed(1), r: 2.2, "class": "l4w-mark s-a l4w-cv-dot" }));
      }
      // the chosen rate: gap in distortion at the same rate
      s.appendChild(svg("line", { x1: X(Dlim).toFixed(1), y1: Y(Rn).toFixed(1), x2: X(Dk).toFixed(1), y2: Y(Rn).toFixed(1), "class": "l4w-cursor" }));
      s.appendChild(svg("circle", { cx: X(Dlim).toFixed(1), cy: Y(Rn).toFixed(1), r: 4.5, "class": "l4w-mark s-hollow s-limit" }));
      s.appendChild(svg("circle", { cx: X(Dk).toFixed(1), cy: Y(Rn).toFixed(1), r: 5, "class": "l4w-mark s-a" }));

      readout.textContent = "n = " + n + ", indices of k = " + k + " bits, so R = k/n = " + Rn.toFixed(3) + " and K = " +
        pow2(k) + " random codewords. On average, the closest codeword differs from xⁿ in " +
        (Dk * n).toFixed(2) + " of the " + n + " bits: D = " + Dk.toFixed(3) + ". At the same rate, long blocks reach D(R) = " +
        Dlim.toFixed(3) + (n >= 512 ? ": random codes come close, as the covering lemma predicts." : "; increase n to close the gap.");
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
