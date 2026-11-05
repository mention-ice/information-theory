/* Lecture 2 widget: probabilities of the binary type classes under Q^n,
   on a linear scale (concentration) or a log scale (exponent -D(P^||Q)),
   with the typical set when eps is given.
   Usage in the class notes:  %web: l2-concentration q=0.3 n=50 [eps=0.2] [scale=log]
   Draws into every [data-widget="l2-concentration"] element. No libraries. */
(function () {
  "use strict";
  var NAME = "l2-concentration";
  var SVGNS = "http://www.w3.org/2000/svg";
  var NS = [5, 10, 20, 50, 100, 200, 500, 1000];
  var LOGF = [0];
  for (var i = 1; i <= 1000; i++) LOGF[i] = LOGF[i - 1] + Math.log2(i);

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
  function h2(t) { return (t <= 0 || t >= 1) ? 0 : -t * Math.log2(t) - (1 - t) * Math.log2(1 - t); }
  function D2(t, q) {
    var d = 0;
    if (t > 0) d += t * Math.log2(t / q);
    if (t < 1) d += (1 - t) * Math.log2((1 - t) / (1 - q));
    return d;
  }
  function fmtP(p) {
    if (p >= 0.001) return p.toFixed(3);
    if (p === 0) return "0";
    return p.toExponential(1).replace("e", "·10^");
  }
  function slider(label, min, max, step, value, onInput, show) {
    var wrap = el("label", "l2w-ctl");
    wrap.appendChild(el("span", "l2w-ctl-name", label));
    var input = document.createElement("input");
    input.type = "range"; input.min = min; input.max = max; input.step = step; input.value = value;
    var out = el("output", "l2w-ctl-val", show(value));
    input.addEventListener("input", function () { out.textContent = show(+input.value); onInput(+input.value); });
    wrap.appendChild(input); wrap.appendChild(out);
    return wrap;
  }

  function mount(root) {
    if (root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    var args = parseArgs(root);
    var n0 = parseInt(args.n, 10) || 50, ni = 0;
    NS.forEach(function (v, k) { if (Math.abs(v - n0) < Math.abs(NS[ni] - n0)) ni = k; });
    var state = {
      ni: ni,
      q: Math.max(0.05, Math.min(0.95, parseFloat(args.q) || 0.3)),
      eps: args.eps != null ? Math.max(0.02, Math.min(0.9, parseFloat(args.eps) || 0.2)) : null,
      log: args.scale === "log"
    };
    root.classList.add("l2w");
    root.innerHTML = "";
    var controls = el("div", "l2w-controls");
    controls.appendChild(slider("n", 0, NS.length - 1, 1, state.ni, function (v) { state.ni = v; draw(); },
      function (v) { return String(NS[v]); }));
    controls.appendChild(slider("Q(1) = q", 0.05, 0.95, 0.05, state.q, function (v) { state.q = Math.round(v * 100) / 100; draw(); },
      function (v) { return v.toFixed(2); }));
    if (state.eps != null) {
      controls.appendChild(slider("ε", 0.05, 0.5, 0.05, state.eps, function (v) { state.eps = v; draw(); },
        function (v) { return v.toFixed(2); }));
    }
    var tog = el("div", "l2w-toggle");
    tog.setAttribute("role", "group");
    tog.setAttribute("aria-label", "Vertical scale");
    var bLin = el("button", null, "probability"), bLog = el("button", null, "(1/n) log probability");
    [bLin, bLog].forEach(function (b, k) {
      b.type = "button";
      b.addEventListener("click", function () { state.log = k === 1; draw(); });
      tog.appendChild(b);
    });
    controls.appendChild(tog);
    root.appendChild(controls);

    var W = 560, Hh = 260, L = 46, R = 14, T = 14, Bm = 34;
    var box = el("div", "l2w-figure");
    var s = svg("svg", { role: "img",
      "aria-label": "Probability of each binary type class under the i.i.d. source" });
    box.appendChild(s);
    root.appendChild(box);
    var stats = el("dl", "l2w-stats");
    root.appendChild(stats);

    function X(t) { return L + t * (W - L - R); }

    var lastW = 0;
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var w = Math.round(box.clientWidth);
        if (w && Math.abs(w - lastW) > 8) draw();
      }).observe(box);
    }
    function draw() {
      var n = NS[state.ni], q = state.q, log = state.log;
      lastW = Math.round(box.clientWidth) || 560;
      W = Math.max(300, Math.min(560, lastW));
      Hh = W < 420 ? 230 : 260;
      s.setAttribute("viewBox", "0 0 " + W + " " + Hh);
      bLin.setAttribute("aria-pressed", String(!log));
      bLog.setAttribute("aria-pressed", String(log));
      while (s.firstChild) s.removeChild(s.firstChild);
      // log2 of the class probabilities
      var lp = [], maxlp = -Infinity, kTop = 0;
      for (var k = 0; k <= n; k++) {
        var v = LOGF[n] - LOGF[k] - LOGF[n - k] + (k ? k * Math.log2(q) : 0) + (n - k ? (n - k) * Math.log2(1 - q) : 0);
        lp.push(v);
        if (v > maxlp) { maxlp = v; kTop = k; }
      }
      var ymin, ymax, Y;
      if (log) {
        ymax = 0;
        ymin = -Math.max(D2(0, q), D2(1, q));
        ymin = Math.floor(ymin * 2) / 2;
        Y = function (v) { return T + (ymax - v) / (ymax - ymin) * (Hh - T - Bm); };
      } else {
        ymax = Math.pow(2, maxlp) * 1.08; ymin = 0;
        Y = function (v) { return T + (ymax - v) / (ymax - ymin) * (Hh - T - Bm); };
      }
      // typical band
      var lo = null, hi = null;
      if (state.eps != null) {
        var half = state.eps * Math.min(q, 1 - q);
        lo = q - half; hi = q + half;
        s.appendChild(svg("rect", { x: X(lo).toFixed(1), y: T, width: (X(hi) - X(lo)).toFixed(1), height: Hh - T - Bm, "class": "l2w-band" }));
      }
      // axes
      s.appendChild(svg("line", { x1: L, y1: Hh - Bm, x2: W - R, y2: Hh - Bm, "class": "l2w-axis" }));
      s.appendChild(svg("line", { x1: L, y1: T, x2: L, y2: Hh - Bm, "class": "l2w-axis" }));
      [0, 0.25, 0.5, 0.75, 1].forEach(function (t) {
        s.appendChild(svg("line", { x1: X(t), y1: Hh - Bm, x2: X(t), y2: Hh - Bm + 4, "class": "l2w-axis" }));
        var tx = svg("text", { x: X(t), y: Hh - Bm + 16, "class": "l2w-tick", "text-anchor": "middle" });
        tx.textContent = String(t);
        s.appendChild(tx);
      });
      var xl = svg("text", { x: (L + W - R) / 2, y: Hh - 3, "class": "l2w-lbl", "text-anchor": "middle" });
      xl.textContent = "P̂(1) = k/n";
      s.appendChild(xl);
      var yt = log ? [ymin, ymin / 2, 0] : [0, ymax / 1.08 / 2, ymax / 1.08];
      yt.forEach(function (v) {
        var tx = svg("text", { x: L - 6, y: Y(v) + 4, "class": "l2w-tick", "text-anchor": "end" });
        tx.textContent = log ? v.toFixed(1) : (v < 0.01 && v > 0 ? v.toExponential(0) : v.toFixed(2));
        s.appendChild(tx);
        s.appendChild(svg("line", { x1: L - 3, y1: Y(v), x2: L, y2: Y(v), "class": "l2w-axis" }));
      });
      // q marker
      s.appendChild(svg("line", { x1: X(q), y1: T, x2: X(q), y2: Hh - Bm, "class": "l2w-qline" }));
      var qt = svg("text", { x: X(q) + 4, y: T + 10, "class": "l2w-tick" });
      qt.textContent = "q";
      s.appendChild(qt);
      if (log) {
        // -D(P^||Q) curve
        var d = "";
        for (var j = 0; j <= 200; j++) {
          var t = j / 200;
          d += (j ? "L" : "M") + X(t).toFixed(1) + " " + Y(-D2(t, q)).toFixed(1);
        }
        s.appendChild(svg("path", { d: d, "class": "l2w-curve" }));
        var r = Math.max(1.4, Math.min(3.5, 60 / n));
        for (k = 0; k <= n; k++) {
          s.appendChild(svg("circle", { cx: X(k / n).toFixed(1), cy: Y(lp[k] / n).toFixed(1), r: r.toFixed(1), "class": "l2w-dot" }));
        }
      } else {
        var bw = Math.max(0.6, (W - L - R) / (n + 1) * 0.8);
        for (k = 0; k <= n; k++) {
          var p = Math.pow(2, lp[k]);
          if (Y(0) - Y(p) < 0.3) continue;
          s.appendChild(svg("rect", { x: (X(k / n) - bw / 2).toFixed(2), y: Y(p).toFixed(2), width: bw.toFixed(2),
            height: (Y(0) - Y(p)).toFixed(2), "class": "l2w-bar" + (k === kTop ? " is-top" : "") }));
        }
      }
      // numbers
      var rows = [["most likely class", "k/n = " + kTop + "/" + n + ", probability " + fmtP(Math.pow(2, maxlp))]];
      if (log) {
        rows.push(["curve", "−D(P̂‖Q); dots: (1/n) log Qⁿ(T(P̂)) = −D + (1/n) log γₙ"]);
      }
      if (state.eps != null) {
        var pt = 0, lsize = -Infinity;
        for (k = 0; k <= n; k++) {
          var t2 = k / n;
          if (t2 >= lo - 1e-12 && t2 <= hi + 1e-12) {
            pt += Math.pow(2, lp[k]);
            var lc = LOGF[n] - LOGF[k] - LOGF[n - k];
            lsize = lsize === -Infinity ? lc : Math.max(lsize, lc) + Math.log2(1 + Math.pow(2, Math.min(lsize, lc) - Math.max(lsize, lc)));
          }
        }
        var H = h2(q);
        rows.push(["typical set", lsize === -Infinity ? "empty for this n" :
          "probability " + fmtP(pt) + "; (1/n) log|Tε| = " + (lsize / n).toFixed(3) + " bit"]);
        rows.push(["compare", "H(Q) = " + H.toFixed(3) + ", (1±ε)H(Q) = " + ((1 - state.eps) * H).toFixed(3) + " … " + ((1 + state.eps) * H).toFixed(3)]);
      }
      stats.innerHTML = "";
      rows.forEach(function (row) {
        var dv = el("div");
        dv.appendChild(el("dt", null, row[0]));
        dv.appendChild(el("dd", null, row[1]));
        stats.appendChild(dv);
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
