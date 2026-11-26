/* Lecture 5 widget: random codes over the binary symmetric channel BSC(p) (Section 5.5).
   The M = 2^k codewords of n bits are drawn i.i.d. uniform, at the rate R = k/n, and the
   decoder picks the codeword closest to the received word (maximum likelihood, Problem 7;
   ties broken at random). If the sent codeword is at distance d from the received word, the
   M - 1 others are independent of it and at distances B ~ Bin(n, 1/2), so the error
   probability averaged over the codebooks is exactly
     1 - sum_d P(Bin(n, p) = d) [(1 - a_d)^M - (1 - a_d - b_d)^M] / (M b_d),
   with a_d = P(B < d) and b_d = P(B = d) (computed with logarithms, for M = 2^(nR)). The chart
   shows it against R for several n, with the capacity C = 1 - H_2(p): as n grows, it tends to
   0 below C and to 1 above C. For n <= 64 and at most 2^18 codewords, one codebook is drawn
   in the browser: the distances from a received word to all the codewords, and the error
   rate of this codebook on many transmissions.
   Usage in the class notes:  %web: l5-random-code   (optional: p=0.1 n=32 R=0.3)
   Draws into every [data-widget="l5-random-code"] element. No libraries. */
(function () {
  "use strict";
  var NAME = "l5-random-code";
  var SVGNS = "http://www.w3.org/2000/svg";
  var NS = [8, 16, 24, 32, 48, 64, 128, 256, 512, 1024];
  var KMAX_DRAW = 18, NMAX_DRAW = 64, BUDGET = 2e7, TMIN = 40, TMAX = 2000;
  var LN2 = Math.LN2;

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
  function popcount(x) {
    x = x - ((x >>> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
    return Math.imul((x + (x >>> 4)) & 0x0F0F0F0F, 0x01010101) >>> 24;
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
  function group(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
  var SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  function pow2(k) {                          // "2¹⁰ = 1 024", or "2³⁰⁰" when large
    var e = String(k).split("").map(function (c) { return SUP[+c]; }).join("");
    return "2" + e + (k <= 20 ? " = " + group(Math.pow(2, k)) : "");
  }

  // ---- error probability averaged over the random codebooks -----------------------------------
  var TAB = {};
  function tables(n) {                        // B ~ Bin(n, 1/2): ln P(B = d) and ln P(B >= d)
    if (TAB[n]) return TAB[n];
    var lnB = [], d;
    for (d = 0; d <= n; d++) lnB.push(lnFact(n) - lnFact(d) - lnFact(n - d) - n * LN2);
    var lnLt = [], acc = -Infinity;           // ln P(B < d)
    for (d = 0; d <= n; d++) { lnLt.push(acc); acc = logAdd(acc, lnB[d]); }
    var lnGe = [], tacc = -Infinity;
    for (d = n; d >= 0; d--) { tacc = logAdd(tacc, lnB[d]); lnGe[d] = tacc; }
    for (d = 0; d <= n; d++) if (lnLt[d] < Math.log(0.5)) lnGe[d] = Math.log1p(-Math.exp(lnLt[d]));
    TAB[n] = { lnB: lnB, lnGe: lnGe };
    return TAB[n];
  }
  // ln P(correct | the sent codeword is at distance d), from ln b_d, ln(1 - a_d) and ln M
  function lnPcorrect(lnb, lnge, lnM) {
    var u = lnge === 0 ? 0 : -Math.exp(lnM + Math.log(-lnge));      // ln (1 - a)^M
    var r = lnb - lnge, lnc;                                        // c = -ln(1 - b/(1 - a))
    if (r < -20) lnc = r;
    else if (r >= -1e-15) lnc = Infinity;                           // d = n: 1 - a - b = 0
    else lnc = Math.log(-Math.log1p(-Math.exp(r)));
    var lnMc = lnM + lnc;
    var term = lnMc < -20 ? lnMc : Math.log(-Math.expm1(-Math.exp(lnMc)));   // ln(1 - e^{-Mc})
    return u + term - lnM - lnb;
  }
  function avgError(n, p, R) {
    var t = tables(n), lnM = n * R * LN2, lp = Math.log(p), lq = Math.log1p(-p), ok = 0;
    for (var d = 0; d <= n; d++) {
      var lw = lnFact(n) - lnFact(d) - lnFact(n - d) + d * lp + (n - d) * lq;
      if (lw < -50) continue;
      ok += Math.exp(lw + lnPcorrect(t.lnB[d], t.lnGe[d], lnM));
    }
    return Math.min(1, Math.max(0, 1 - ok));
  }
  var CURVES = {};
  function curve(n, p) {                      // average error probability at R = 0, 0.01, ..., 1
    var key = n + ":" + p;
    if (CURVES[key]) return CURVES[key];
    var c = [];
    for (var i = 0; i <= 100; i++) c.push(avgError(n, p, i / 100));
    CURVES[key] = c;
    return c;
  }

  // ---- one codebook drawn in the browser -------------------------------------------------------
  function drawCodebook(n, k, seed) {
    var r = rng(seed), K = Math.pow(2, k), lo = new Uint32Array(K), hi = new Uint32Array(K);
    var mlo = n >= 32 ? 0xFFFFFFFF : (Math.pow(2, n) - 1), mhi = n > 32 ? (n >= 64 ? 0xFFFFFFFF : Math.pow(2, n - 32) - 1) : 0;
    for (var j = 0; j < K; j++) {
      lo[j] = ((r() * 4294967296) >>> 0) & mlo;
      hi[j] = ((r() * 4294967296) >>> 0) & mhi;
    }
    return { n: n, k: k, K: K, lo: lo, hi: hi, two: n > 32 };
  }
  function noise(r, n, p) {
    var lo = 0, hi = 0;
    for (var i = 0; i < n; i++) if (r() < p) { if (i < 32) lo |= (1 << i); else hi |= (1 << (i - 32)); }
    return [lo >>> 0, hi >>> 0];
  }
  // one transmission: the sent index, the received word, the decoded index (random tie-breaking)
  function transmit(cb, p, r, keepHist) {
    var w = Math.floor(r() * cb.K), z = noise(r, cb.n, p);
    var yl = (cb.lo[w] ^ z[0]) >>> 0, yh = (cb.hi[w] ^ z[1]) >>> 0;
    var dw = popcount(z[0]) + popcount(z[1]);
    var best = 1e9, ties = 0, pick = -1, minWrong = 1e9, hist = keepHist ? new Uint32Array(cb.n + 1) : null;
    var lo = cb.lo, hi = cb.hi, K = cb.K, j, d;
    for (j = 0; j < K; j++) {
      d = cb.two ? popcount((lo[j] ^ yl) >>> 0) + popcount((hi[j] ^ yh) >>> 0) : popcount((lo[j] ^ yl) >>> 0);
      if (hist) hist[d]++;
      if (j !== w && d < minWrong) minWrong = d;
      if (d < best) { best = d; ties = 1; pick = j; }
      else if (d === best) { ties++; if (r() * ties < 1) pick = j; }
    }
    return { w: w, z: z, yl: yl, yh: yh, dw: dw, best: best, ties: ties, pick: pick, minWrong: minWrong, hist: hist };
  }
  function bitString(lo, hi, n) {             // bit i of the word is bit i of (lo, hi)
    var s = "";
    for (var i = 0; i < n; i++) s += (i < 32 ? (lo >>> i) & 1 : (hi >>> (i - 32)) & 1);
    return s;
  }

  function mount(root) {
    if (root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    var args = parseArgs(root);
    var p0 = parseFloat(args.p), n0 = NS.indexOf(parseInt(args.n, 10)), r0 = parseFloat(args.R);
    var state = {
      p: (p0 >= 0.01 && p0 <= 0.45) ? Math.round(p0 * 100) / 100 : 0.1,
      ni: n0 >= 0 ? n0 : NS.indexOf(32),
      R: (r0 >= 0.02 && r0 <= 1) ? Math.round(r0 * 100) / 100 : 0.3,
      seed: 2026, cb: null, cbKey: "", busy: false, shown: null, rate: null, T: 0
    };
    var pending = null;
    root.classList.add("l5w", "l5w-rc");
    root.textContent = "";

    var controls = el("div", "l5w-controls");
    var pS = slider("p", 0.01, 0.45, 0.01, state.p, function (v) { state.p = v; draw(); },
      function (v) { return v.toFixed(2); });
    pS.input.setAttribute("aria-label", "Crossover probability p of the binary symmetric channel");
    var nS = slider("n", 0, NS.length - 1, 1, state.ni, function (v) { state.ni = v; draw(); },
      function (v) { return String(NS[v]); });
    nS.input.setAttribute("aria-label", "Block length n");
    var rS = slider("rate", 0.02, 1, 0.01, state.R, function (v) { state.R = v; draw(); },
      function (v) { return v.toFixed(2); });
    rS.input.setAttribute("aria-label", "Rate R of the code");
    controls.appendChild(pS); controls.appendChild(nS); controls.appendChild(rS);
    root.appendChild(controls);

    var box = el("div", "l5w-figure");
    var s = svg("svg", { role: "img", "aria-label": "Error probability of random codes against the rate, for several block lengths, with the capacity" });
    box.appendChild(s);
    root.appendChild(box);
    var legend = el("ul", "l5w-legend");
    function legendItem(ul, kind, cls, text) {
      var li = el("li");
      var sw = svg("svg", { "class": "l5w-sw", viewBox: "0 0 26 10", "aria-hidden": "true" });
      if (kind === "dot") sw.appendChild(svg("circle", { cx: 13, cy: 5, r: 3.6, "class": "l5w-mark " + cls }));
      else if (kind === "ring") sw.appendChild(svg("circle", { cx: 13, cy: 5, r: 3.8, "class": cls }));
      else if (kind === "rect") sw.appendChild(svg("rect", { x: 4, y: 0, width: 18, height: 10, "class": cls }));
      else sw.appendChild(svg("line", { x1: 1, y1: 5, x2: 25, y2: 5, "class": cls }));
      li.appendChild(sw);
      li.appendChild(document.createTextNode(text));
      ul.appendChild(li);
    }
    legendItem(legend, "line", "l5w-line s-a", "random codes of length n, averaged over the codebooks");
    legendItem(legend, "line", "l5w-faint", "other lengths, from 8 to 1024");
    legendItem(legend, "line", "l5w-line s-limit", "n → ∞: 0 below C, 1 above C");
    legendItem(legend, "dot", "s-b", "the codebook drawn below");
    root.appendChild(legend);
    var readout = el("p", "l5w-readout");
    readout.setAttribute("aria-live", "polite");
    root.appendChild(readout);

    // one codebook, drawn in the browser
    var demo = el("div", "l5w-demo");
    var dhead = el("div", "l5w-controls");
    dhead.appendChild(el("span", "l5w-dtitle", "One codebook, drawn in your browser"));
    var bSend = el("button", "l5w-btn", "another transmission");
    bSend.type = "button";
    var bBook = el("button", "l5w-btn", "another codebook");
    bBook.type = "button";
    dhead.appendChild(bSend);
    dhead.appendChild(bBook);
    demo.appendChild(dhead);
    demo.appendChild(el("p", "l5w-hint", "The decoder picks the codeword closest to the received word (maximum likelihood, " +
      "Problem 7). The typicality decoder of the proof looks for the codewords at a distance close to np instead: it is " +
      "easier to analyze and reaches the same rates as n → ∞."));
    var hbox = el("div", "l5w-figure l5w-hide-off");
    var hs = svg("svg", { role: "img", "aria-label": "Number of codewords at each distance from the received word" });
    hbox.appendChild(hs);
    demo.appendChild(hbox);
    var hlegend = el("ul", "l5w-legend l5w-hide-off");
    legendItem(hlegend, "rect", "l5w-rc-bar", "other codewords (count, log scale)");
    legendItem(hlegend, "dot", "s-a", "the sent codeword");
    legendItem(hlegend, "ring", "l5w-rc-ring", "the decoded one, if wrong");
    legendItem(hlegend, "line", "l5w-line s-limit s-dash", "average count, (M − 1) P(Bin(n, ½) = d)");
    legendItem(hlegend, "rect", "l5w-rc-zone", "as close as the sent codeword: a wrong codeword here is an error");
    demo.appendChild(hlegend);
    var dscroll = el("div", "l5w-scroll l5w-hide-off");
    var seqs = el("div", "l5w-rc-seqs");
    dscroll.appendChild(seqs);
    demo.appendChild(dscroll);
    var dnote = el("p", "l5w-readout");
    dnote.setAttribute("aria-live", "polite");
    demo.appendChild(dnote);
    root.appendChild(demo);
    var tr = rng(7);
    bSend.addEventListener("click", function () { if (state.cb) { state.shown = transmit(state.cb, state.p, tr, true); showDemo(); } });
    bBook.addEventListener("click", function () { state.seed = (Math.imul(state.seed, 1103515245) + 12345) >>> 0; state.cbKey = ""; draw(); });

    var lastW = 0;
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var w = Math.round(box.clientWidth);
        if (w && Math.abs(w - lastW) > 8) draw();
      }).observe(box);
    }

    function params() {
      var n = NS[state.ni], k = Math.max(1, Math.min(n, Math.ceil(n * state.R - 1e-9)));
      return { n: n, k: k, Rn: k / n, p: state.p, C: 1 - h2(state.p) };
    }

    function showDemo() {
      var P = params(), n = P.n, k = P.k;
      seqs.textContent = "";
      while (hs.firstChild) hs.removeChild(hs.firstChild);
      if (state.busy) {
        dnote.textContent = "Drawing a codebook of " + pow2(k) + " words and sending messages…";
        bSend.disabled = true; bBook.disabled = true;
        return;
      }
      if (!state.cb) {
        demo.classList.add("l5w-off");
        dnote.textContent = (n > NMAX_DRAW ? "Blocks of n = " + n + " bits are too long to draw here" :
          "A codebook of " + pow2(k) + " words is too large to draw here") +
          ": take n ≤ " + NMAX_DRAW + " and at most 2¹⁸ codewords (nR ≤ 18) to see one. The curves above are exact for every n.";
        bSend.disabled = true; bBook.disabled = true;
        return;
      }
      demo.classList.remove("l5w-off");
      bSend.disabled = false; bBook.disabled = false;
      var sh = state.shown, cb = state.cb, K = cb.K;

      // histogram of the distances from the received word
      var W = Math.max(300, Math.min(600, Math.round(hbox.clientWidth) || 560));
      var Hh = W < 420 ? 200 : 220, L = 54, Rm = 14, T = 12, B = 46;
      var top = Math.max(1, Math.ceil(Math.log10(K)));
      function X(d) { return L + (d + 0.5) / (n + 1) * (W - L - Rm); }
      function Y(c) { return T + (top - Math.log10(Math.max(c, 0.5))) / (top + 0.3) * (Hh - T - B); }
      hs.setAttribute("viewBox", "0 0 " + W + " " + Hh);
      var bw = Math.max(1, (W - L - Rm) / (n + 1) - 1);
      hs.appendChild(svg("rect", { x: (X(0) - bw / 2 - 0.5).toFixed(1), y: T, width: (X(sh.dw) - X(0) + bw + 1).toFixed(1),
        height: Hh - T - B, "class": "l5w-rc-zone" }));
      var g;
      for (g = 0; g <= top; g++) {
        hs.appendChild(svg("line", { x1: L, y1: Y(Math.pow(10, g)).toFixed(1), x2: W - Rm, y2: Y(Math.pow(10, g)).toFixed(1), "class": "l5w-grid" }));
        hs.appendChild(svg("text", { x: L - 6, y: (Y(Math.pow(10, g)) + 4).toFixed(1), "class": "l5w-tick", "text-anchor": "end" },
          g <= 3 ? group(Math.pow(10, g)) : "10" + SUP[g]));
      }
      hs.appendChild(svg("line", { x1: L, y1: Hh - B, x2: W - Rm, y2: Hh - B, "class": "l5w-axis" }));
      var tickStep = n <= 16 ? 2 : n <= 32 ? 4 : 8;
      for (g = 0; g <= n; g += tickStep) {
        hs.appendChild(svg("line", { x1: X(g).toFixed(1), y1: Hh - B, x2: X(g).toFixed(1), y2: Hh - B + 4, "class": "l5w-axis" }));
        hs.appendChild(svg("text", { x: X(g).toFixed(1), y: Hh - B + 16, "class": "l5w-tick", "text-anchor": "middle" }, String(g)));
      }
      hs.appendChild(svg("text", { x: ((L + W - Rm) / 2).toFixed(1), y: Hh - 3, "class": "l5w-lbl", "text-anchor": "middle" },
        "distance d from the received word (bits)"));
      var ym = ((T + Hh - B) / 2).toFixed(1);
      hs.appendChild(svg("text", { x: 11, y: ym, "class": "l5w-lbl l5w-ylbl", "text-anchor": "middle", transform: "rotate(-90 11 " + ym + ")" }, "codewords"));
      var d;
      for (d = 0; d <= n; d++) {
        var c = sh.hist[d] - (d === sh.dw ? 1 : 0);
        if (c > 0) hs.appendChild(svg("rect", { x: (X(d) - bw / 2).toFixed(1), y: Y(c).toFixed(1), width: bw.toFixed(1),
          height: Math.max(0.5, Y(0.5) - Y(c)).toFixed(1), "class": "l5w-rc-bar" }));
      }
      var t = tables(n), path = "", started = false;
      for (d = 0; d <= n; d++) {
        var ex = (K - 1) * Math.exp(t.lnB[d]);
        if (ex < 0.3) { started = false; continue; }
        path += (started ? "L" : "M") + X(d).toFixed(1) + " " + Y(ex).toFixed(1);
        started = true;
      }
      if (path) hs.appendChild(svg("path", { d: path, "class": "l5w-line s-limit s-dash" }));
      // the sent codeword, and the decoded one if it differs
      hs.appendChild(svg("circle", { cx: X(sh.dw).toFixed(1), cy: Y(1).toFixed(1), r: 5, "class": "l5w-mark s-a" }));
      hs.appendChild(svg("text", { x: X(sh.dw).toFixed(1), y: (Y(1) - 9).toFixed(1), "class": "l5w-lbl", "text-anchor": "middle" }, "sent"));
      if (sh.pick !== sh.w) {
        hs.appendChild(svg("circle", { cx: X(sh.best).toFixed(1), cy: Y(1).toFixed(1), r: 8.5, "class": "l5w-rc-ring" }));
        hs.appendChild(svg("text", { x: X(sh.best).toFixed(1), y: (Y(1) + 22).toFixed(1), "class": "l5w-lbl", "text-anchor": "middle" }, "decoded"));
      }

      // the words
      var xs = bitString(cb.lo[sh.w], cb.hi[sh.w], n), ys = bitString(sh.yl, sh.yh, n);
      function row(name, str, ref) {
        var nm = el("span", "l5w-rc-name", name), v = el("span", "l5w-bin l5w-rc-bits");
        for (var i = 0; i < str.length; i++) v.appendChild(el("span", ref && str[i] !== ref[i] ? "l5w-err" : null, str[i]));
        seqs.appendChild(nm); seqs.appendChild(v);
      }
      row("codeword xⁿ(w)", xs, null);
      row("received yⁿ", ys, xs);
      if (sh.pick !== sh.w) row("decoded xⁿ(ŵ)", bitString(cb.lo[sh.pick], cb.hi[sh.pick], n), xs);

      var others = group(K - 1) + (K - 1 === 1 ? " other codeword" : " others"), txt;
      txt = "The channel flipped " + sh.dw + " of the " + n + " bits (" + (n * P.p).toFixed(1) + " on average): the received word is at distance " +
        sh.dw + " from the sent codeword, and the closest of the " + others + " is at distance " + sh.minWrong + ". ";
      if (sh.pick === sh.w) txt += sh.ties > 1 ? "A tie, won by the sent codeword: decoded correctly. " : "Decoded correctly. ";
      else txt += sh.best < sh.dw ? "A wrong codeword is closer: decoding error. " : "A tie, lost by the sent codeword: decoding error. ";
      txt += "On " + group(state.T) + " transmissions, this codebook errs with probability " + state.rate.toFixed(3) +
        ", against " + avgError(n, P.p, P.Rn).toFixed(3) + " on average over the codebooks" +
        (P.Rn < P.C ? ": most codebooks are good." : ". Above the capacity, it tends to 1 as n grows, for every codebook.");
      dnote.textContent = txt;
    }

    function draw() {
      var P = params(), n = P.n, k = P.k;
      // codebook in the browser (drawn after a short pause, so that the sliders stay smooth)
      var key = n + ":" + k + ":" + P.p + ":" + state.seed;
      if (n <= NMAX_DRAW && k <= KMAX_DRAW) {
        if (state.cbKey !== key) {
          clearTimeout(pending);
          state.cb = null; state.busy = true; state.rate = null;
          pending = setTimeout(function () {
            var cb = drawCodebook(n, k, state.seed), r = rng(state.seed ^ 0x9E3779B9);
            var T = Math.max(TMIN, Math.min(TMAX, Math.round(BUDGET / (cb.K * (cb.two ? 2 : 1))))), err = 0;
            for (var i = 0; i < T; i++) {
              var o = transmit(cb, P.p, r, false);
              err += o.dw > o.best ? 1 : 1 - 1 / o.ties;
            }
            state.cb = cb; state.cbKey = key; state.T = T; state.rate = err / T;
            state.shown = transmit(cb, P.p, tr, true);
            state.busy = false;
            draw();
          }, k >= 14 ? 160 : 40);
        }
      } else {
        clearTimeout(pending);
        state.cb = null; state.cbKey = ""; state.busy = false; state.rate = null;
      }
      showDemo();

      lastW = Math.round(box.clientWidth) || 560;
      var W = Math.max(300, Math.min(600, lastW));
      var Hh = W < 420 ? 240 : 270, L = 54, Rm = 14, T = 12, B = 36;
      function X(r) { return L + r * (W - L - Rm); }
      function Y(v) { return T + (1 - v) * (Hh - T - B); }
      s.setAttribute("viewBox", "0 0 " + W + " " + Hh);
      while (s.firstChild) s.removeChild(s.firstChild);
      var g;
      for (g = 0; g <= 1.0001; g += 0.25) {
        s.appendChild(svg("line", { x1: L, y1: Y(g).toFixed(1), x2: W - Rm, y2: Y(g).toFixed(1), "class": g ? "l5w-grid" : "l5w-axis" }));
        s.appendChild(svg("text", { x: L - 6, y: (Y(g) + 4).toFixed(1), "class": "l5w-tick", "text-anchor": "end" }, String(g)));
      }
      for (g = 0; g <= 1.0001; g += 0.2) {
        s.appendChild(svg("line", { x1: X(g).toFixed(1), y1: Hh - B, x2: X(g).toFixed(1), y2: Hh - B + 4, "class": "l5w-axis" }));
        s.appendChild(svg("text", { x: X(g).toFixed(1), y: Hh - B + 16, "class": "l5w-tick", "text-anchor": "middle" }, String(+g.toFixed(1))));
      }
      s.appendChild(svg("line", { x1: L, y1: T, x2: L, y2: Hh - B, "class": "l5w-axis" }));
      s.appendChild(svg("text", { x: ((L + W - Rm) / 2).toFixed(1), y: Hh - 3, "class": "l5w-lbl", "text-anchor": "middle" }, "rate R (bits per channel use)"));
      var ym = ((T + Hh - B) / 2).toFixed(1);
      s.appendChild(svg("text", { x: 11, y: ym, "class": "l5w-lbl l5w-ylbl", "text-anchor": "middle", transform: "rotate(-90 11 " + ym + ")" }, "error probability"));

      function pathOf(c) {
        var d = "";
        for (var i = 0; i <= 100; i++) d += (i ? "L" : "M") + X(i / 100).toFixed(1) + " " + Y(c[i]).toFixed(1);
        return d;
      }
      NS.forEach(function (m, i) { if (i !== state.ni) s.appendChild(svg("path", { d: pathOf(curve(m, P.p)), "class": "l5w-faint" })); });
      s.appendChild(svg("path", { d: "M" + X(0) + " " + Y(0).toFixed(1) + "L" + X(P.C).toFixed(1) + " " + Y(0).toFixed(1) +
        "L" + X(P.C).toFixed(1) + " " + Y(1).toFixed(1) + "L" + X(1) + " " + Y(1).toFixed(1), "class": "l5w-line s-limit l5w-rc-step" }));
      var left = P.C > 0.2;                    // above the curves on the left of C, or below them on the right
      s.appendChild(svg("text", { x: (X(P.C) + (left ? -6 : 6)).toFixed(1), y: (left ? Y(0.9) + 4 : Y(0.1) + 4).toFixed(1),
        "class": "l5w-lbl", "text-anchor": left ? "end" : "start" }, "C = " + P.C.toFixed(3)));
      s.appendChild(svg("path", { d: pathOf(curve(n, P.p)), "class": "l5w-line s-a" }));
      var e = avgError(n, P.p, P.Rn);
      s.appendChild(svg("line", { x1: X(P.Rn).toFixed(1), y1: Hh - B, x2: X(P.Rn).toFixed(1), y2: Y(e).toFixed(1), "class": "l5w-cursor" }));
      s.appendChild(svg("circle", { cx: X(P.Rn).toFixed(1), cy: Y(e).toFixed(1), r: 5, "class": "l5w-mark s-a" }));
      if (state.cb && state.rate !== null) s.appendChild(svg("circle", { cx: X(P.Rn).toFixed(1), cy: Y(state.rate).toFixed(1), r: 4, "class": "l5w-mark s-b" }));

      readout.textContent = "Random codes of n = " + n + " bits at the rate R = " + k + "/" + n + " = " + P.Rn.toFixed(3) + ": M = " + pow2(k) +
        " codewords. Averaged over the codebooks, the closest-codeword decoder errs with probability " + e.toFixed(3) +
        ". The capacity of the BSC(" + P.p.toFixed(2) + ") is C = 1 − H₂(" + P.p.toFixed(2) + ") = " + P.C.toFixed(3) +
        ": as n grows, the error probability tends to 0 at every rate below C (Section 5.5) and to 1 at every rate above C (the strong converse, Section 5.4).";
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
