/* Lecture 2 widget: the binary sequences of length n, grouped into type classes.
   Usage in the class notes:  %web: l2-type-classes n=4 q=0.5
   Draws into every [data-widget="l2-type-classes"] element. No libraries. */
(function () {
  "use strict";
  var NAME = "l2-type-classes";

  function parseArgs(el) {
    var out = {};
    (el.getAttribute("data-args") || "").split(/\s+/).forEach(function (kv) {
      var m = kv.match(/^([A-Za-z_][\w-]*)=(.*)$/);
      if (m) out[m[1]] = m[2];
    });
    return out;
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function frac(k, n) {
    if (k === 0) return "0";
    if (k === n) return "1";
    var g = gcd(k, n);
    return (k / g) + "/" + (n / g);
  }
  function binom(n, k) {
    var r = 1;
    for (var i = 1; i <= k; i++) r = r * (n - k + i) / i;
    return Math.round(r);
  }
  function fmt(p) {
    if (p === 0) return "0";
    if (p >= 0.001) return p.toFixed(p >= 0.1 ? 3 : 4).replace(/0+$/, "").replace(/\.$/, "");
    return p.toExponential(1).replace("e", "·10^");
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function slider(label, min, max, step, value, onInput, show) {
    var wrap = el("label", "l2w-ctl");
    var name = el("span", "l2w-ctl-name", label);
    var input = document.createElement("input");
    input.type = "range"; input.min = min; input.max = max; input.step = step; input.value = value;
    var out = el("output", "l2w-ctl-val", show(value));
    input.addEventListener("input", function () { out.textContent = show(+input.value); onInput(+input.value); });
    wrap.appendChild(name); wrap.appendChild(input); wrap.appendChild(out);
    return wrap;
  }

  function mount(root) {
    if (root.getAttribute("data-ready")) return;
    root.setAttribute("data-ready", "1");
    var args = parseArgs(root);
    var state = {
      n: Math.max(1, Math.min(6, parseInt(args.n, 10) || 4)),
      q: Math.max(0, Math.min(1, parseFloat(args.q) || 0.5))
    };
    root.classList.add("l2w");
    root.innerHTML = "";
    var controls = el("div", "l2w-controls");
    controls.appendChild(slider("n", 1, 6, 1, state.n, function (v) { state.n = v; draw(); }, function (v) { return String(v); }));
    controls.appendChild(slider("Q(1) = q", 0, 1, 0.05, state.q, function (v) { state.q = Math.round(v * 100) / 100; draw(); }, function (v) { return v.toFixed(2); }));
    root.appendChild(controls);
    var scroller = el("div", "l2w-scroll");
    var grid = el("div", "l2w-tc-grid");
    scroller.appendChild(grid);
    root.appendChild(scroller);
    var caption = el("p", "l2w-readout");
    caption.setAttribute("aria-live", "polite");
    root.appendChild(caption);

    function draw() {
      var n = state.n, q = state.q;
      grid.innerHTML = "";
      grid.style.setProperty("--cols", n + 1);
      var classes = [];
      for (var k = 0; k <= n; k++) classes.push([]);
      for (var x = 0; x < (1 << n); x++) {
        var s = "", ones = 0;
        for (var i = n - 1; i >= 0; i--) { var b = (x >> i) & 1; s += b; ones += b; }
        classes[ones].push(s);
      }
      var seqProb = [], classProb = [], maxSeq = 0, maxClass = 0;
      for (k = 0; k <= n; k++) {
        seqProb[k] = Math.pow(q, k) * Math.pow(1 - q, n - k);
        classProb[k] = binom(n, k) * seqProb[k];
        maxSeq = Math.max(maxSeq, seqProb[k]);
        maxClass = Math.max(maxClass, classProb[k]);
      }
      for (k = 0; k <= n; k++) {
        var col = el("div", "l2w-tc-col" + (classProb[k] >= maxClass * (1 - 1e-9) ? " is-top" : ""));
        var head = el("div", "l2w-tc-head");
        head.appendChild(el("span", null, "P̂ ="));
        head.appendChild(el("span", "l2w-tc-type", "[" + frac(n - k, n) + ", " + frac(k, n) + "]"));
        col.appendChild(head);
        var list = el("ul", "l2w-tc-list");
        classes[k].forEach(function (s) {
          var li = el("li", "l2w-tc-seq" + (q !== 0.5 && seqProb[k] >= maxSeq * (1 - 1e-9) ? " is-top" : ""), s);
          li.style.setProperty("--w", maxSeq > 0 ? (seqProb[k] / maxSeq).toFixed(3) : 0);
          list.appendChild(li);
        });
        col.appendChild(list);
        var foot = el("dl", "l2w-tc-foot");
        [["|T|", String(binom(n, k))], ["Qⁿ(xⁿ)", fmt(seqProb[k])], ["Qⁿ(T)", fmt(classProb[k])]].forEach(function (r) {
          foot.appendChild(el("dt", null, r[0]));
          foot.appendChild(el("dd", null, r[1]));
        });
        col.appendChild(foot);
        grid.appendChild(col);
      }
      var sizes = [];
      for (k = 0; k <= n; k++) sizes.push(binom(n, k));
      var kTop = classProb.indexOf(maxClass);
      caption.textContent = "The " + (n + 1) + " type classes partition the 2" + sup(n) + " = " + (1 << n) +
        " sequences: " + sizes.join(" + ") + " = " + (1 << n) + ". Under Q = [" + (1 - q).toFixed(2) + ", " + q.toFixed(2) +
        "], every sequence of a class has the same probability (shading). " +
        (q === 0.5 ? "All sequences are equally likely. " :
          "The most likely sequence (orange) is " + (q < 0.5 ? "0" : "1").repeat(n) + ". ") +
        "The most likely class (blue frame) is P̂ = [" + frac(n - kTop, n) + ", " + frac(kTop, n) + "], with probability " +
        fmt(maxClass) + ".";
    }
    draw();
  }
  function sup(n) {
    var d = "⁰¹²³⁴⁵⁶⁷⁸⁹";
    return String(n).split("").map(function (c) { return d[+c]; }).join("");
  }
  function init() {
    var nodes = document.querySelectorAll('[data-widget="' + NAME + '"]');
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
