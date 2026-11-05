/* Lecture 2 widget: the types of length-n sequences over a 3-letter alphabet,
   as points of the simplex P(X), shaded by the size of their type class.
   Usage in the class notes:  %web: l2-simplex n=6
   Draws into every [data-widget="l2-simplex"] element. No libraries. */
(function () {
  "use strict";
  var NAME = "l2-simplex";
  var SVGNS = "http://www.w3.org/2000/svg";
  var NMAX = 40;
  var LOGF = [0];
  for (var i = 1; i <= NMAX + 2; i++) LOGF[i] = LOGF[i - 1] + Math.log2(i);

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
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function frac(k, n) {
    if (k === 0) return "0";
    if (k === n) return "1";
    var g = gcd(k, n);
    return (k / g) + "/" + (n / g);
  }
  function big(log2v) {
    // 2^log2v as an integer or in scientific notation
    if (log2v < 40) return String(Math.round(Math.pow(2, log2v)));
    var l10 = log2v * Math.LN2 / Math.LN10, e = Math.floor(l10);
    return Math.pow(10, l10 - e).toFixed(1) + "·10^" + e;
  }
  function H(p) {
    var h = 0;
    p.forEach(function (x) { if (x > 0) h -= x * Math.log2(x); });
    return h;
  }

  function mount(root) {
    if (root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    var args = parseArgs(root);
    var state = { n: Math.max(1, Math.min(NMAX, parseInt(args.n, 10) || 6)), sel: null };
    root.classList.add("l2w");
    root.innerHTML = "";

    var controls = el("div", "l2w-controls");
    var lab = el("label", "l2w-ctl");
    lab.appendChild(el("span", "l2w-ctl-name", "n"));
    var input = document.createElement("input");
    input.type = "range"; input.min = 1; input.max = NMAX; input.step = 1; input.value = state.n;
    var out = el("output", "l2w-ctl-val", String(state.n));
    input.addEventListener("input", function () { state.n = +input.value; out.textContent = input.value; state.sel = null; draw(); });
    lab.appendChild(input); lab.appendChild(out);
    controls.appendChild(lab);
    root.appendChild(controls);

    var W = 360, Hh = 330, pad = 30;
    var A = [pad, Hh - pad], B = [W - pad, Hh - pad], C = [W / 2, Hh - pad - (W - 2 * pad) * Math.sqrt(3) / 2];
    var box = el("div", "l2w-figure l2w-simplex-figure");
    var s = svg("svg", { viewBox: "0 0 " + W + " " + Hh, role: "img",
      "aria-label": "Types of length-n sequences over {a1, a2, a3}, as points of the triangle P(X)" });
    box.appendChild(s);
    root.appendChild(box);
    var stats = el("dl", "l2w-stats");
    root.appendChild(stats);
    var readout = el("p", "l2w-readout");
    readout.setAttribute("aria-live", "polite");
    root.appendChild(readout);

    function pos(p) {
      return [p[0] * A[0] + p[1] * B[0] + p[2] * C[0], p[0] * A[1] + p[1] * B[1] + p[2] * C[1]];
    }
    function show(t) {
      var n = state.n, p = [t[0] / n, t[1] / n, t[2] / n];
      var lt = LOGF[n] - LOGF[t[0]] - LOGF[t[1]] - LOGF[t[2]];
      readout.textContent = "P̂ = [" + frac(t[0], n) + ", " + frac(t[1], n) + ", " + frac(t[2], n) + "]: |T(P̂)| = " +
        big(lt) + " sequences; (1/n) log|T(P̂)| = " + (lt / n).toFixed(3) + " bit, H(P̂) = " + H(p).toFixed(3) + " bit.";
    }
    function draw() {
      var n = state.n;
      while (s.firstChild) s.removeChild(s.firstChild);
      s.appendChild(svg("polygon", { points: [A, B, C].map(function (v) { return v.join(","); }).join(" "), "class": "l2w-tri" }));
      [["a₁", A, -6, 18, "end"], ["a₂", B, 6, 18, "start"], ["a₃", C, 14, 4, "start"]].forEach(function (L) {
        var t = svg("text", { x: L[1][0] + L[2], y: L[1][1] + L[3], "class": "l2w-lbl", "text-anchor": L[4] });
        t.textContent = L[0];
        s.appendChild(t);
      });
      var maxl = 0;
      for (var m1 = 0; m1 <= n; m1++) for (var m2 = 0; m1 + m2 <= n; m2++)
        maxl = Math.max(maxl, LOGF[n] - LOGF[m1] - LOGF[m2] - LOGF[n - m1 - m2]);
      var r = Math.max(2, Math.min(9, 110 / (n + 2)));
      var best = null, bestl = -1;
      for (var n1 = 0; n1 <= n; n1++) {
        for (var n2 = 0; n1 + n2 <= n; n2++) {
          var t = [n1, n2, n - n1 - n2];
          var lt = LOGF[n] - LOGF[t[0]] - LOGF[t[1]] - LOGF[t[2]];
          if (lt > bestl) { bestl = lt; best = t; }
          var xy = pos([t[0] / n, t[1] / n, t[2] / n]);
          var c = svg("circle", { cx: xy[0].toFixed(1), cy: xy[1].toFixed(1), r: r.toFixed(1), "class": "l2w-pt",
            tabindex: "0" });
          c.style.setProperty("--w", maxl > 0 ? (0.12 + 0.88 * lt / maxl).toFixed(3) : 1);
          (function (tt, node) {
            function pick() {
              state.sel = tt;
              var prev = s.querySelector(".is-sel");
              if (prev) prev.classList.remove("is-sel");
              node.classList.add("is-sel");
              show(tt);
            }
            node.addEventListener("mouseenter", pick);
            node.addEventListener("focus", pick);
            node.addEventListener("click", pick);
          })(t, c);
          if (state.sel && state.sel[0] === t[0] && state.sel[1] === t[1]) c.classList.add("is-sel");
          s.appendChild(c);
        }
      }
      if (!state.sel) {
        state.sel = best;
        var nodes = s.querySelectorAll(".l2w-pt"), idx = 0;
        for (n1 = 0; n1 <= n; n1++) for (n2 = 0; n1 + n2 <= n; n2++) {
          if (n1 === best[0] && n2 === best[1]) nodes[idx].classList.add("is-sel");
          idx++;
        }
      }
      show(state.sel);
      var K = (n + 1) * (n + 2) / 2;
      stats.innerHTML = "";
      [["types Kₙ,₃", String(K)], ["bound (n+1)²", String((n + 1) * (n + 1))],
       ["sequences 3ⁿ", big(n * Math.log2(3))]].forEach(function (row) {
        var d = el("div");
        d.appendChild(el("dt", null, row[0]));
        d.appendChild(el("dd", null, row[1]));
        stats.appendChild(d);
      });
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
