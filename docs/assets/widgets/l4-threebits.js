/* Lecture 4 widget: three fair bits encoded with one bit (Section 4.1, Problem 1).
   The eight blocks x^3, the bit sent, the reconstruction and its wrong bits, for "keep the
   first bit", the majority vote, or two reconstruction words chosen by the reader; the
   encoder sends the index of the closer word (ties: the word of index 0). The distortion D_3
   is compared with the best one-bit encoder of three bits (1/4, Problem 1) and with long
   blocks at the same rate 1/3 (D(1/3), about 0.174, Section 4.5).
   Usage in the class notes:  %web: l4-threebits
   Draws into every [data-widget="l4-threebits"] element. No libraries. */
(function () {
  "use strict";
  var NAME = "l4-threebits";
  var MODES = [
    { key: "first", label: "keep the first bit", c: [[0, 0, 0], [1, 0, 0]] },
    { key: "major", label: "majority vote", c: [[0, 0, 0], [1, 1, 1]] },
    { key: "own", label: "your own words", c: null }
  ];
  var SUB = ["₀", "₁"];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function h2(p) { return (p <= 0 || p >= 1) ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p); }
  var D_LONG = (function () {                  // D(1/3) for fair bits: H_2(D) = 2/3, D < 1/2
    var lo = 0, hi = 0.5;
    for (var i = 0; i < 60; i++) { var m = (lo + hi) / 2; if (h2(m) < 2 / 3) lo = m; else hi = m; }
    return (lo + hi) / 2;
  })();
  function bitsOf(x) { return [(x >> 2) & 1, (x >> 1) & 1, x & 1]; }
  function dist(a, b) { return (a[0] ^ b[0]) + (a[1] ^ b[1]) + (a[2] ^ b[2]); }
  function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }
  function frac(num, den) {
    if (num === 0) return "0";
    var g = gcd(num, den);
    return den / g === 1 ? String(num / g) : (num / g) + "/" + (den / g);
  }

  function mount(host) {
    if (host.getAttribute("data-ready")) return;
    host.setAttribute("data-ready", "1");
    host.classList.add("l4w", "l4w-tb");
    host.textContent = "";
    var state = { mode: "major", c: [[0, 0, 0], [1, 1, 1]] };

    // encoder choice
    var controls = el("div", "l4w-controls");
    var seg = el("div", "l4w-seg");
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-label", "Encoder");
    var btns = {};
    MODES.forEach(function (m) {
      var b = el("button", "l4w-btn", m.label);
      b.type = "button";
      b.addEventListener("click", function () {
        state.mode = m.key;
        if (m.c) state.c = [m.c[0].slice(), m.c[1].slice()];
        update();
      });
      btns[m.key] = b;
      seg.appendChild(b);
    });
    controls.appendChild(seg);
    host.appendChild(controls);

    // the two reconstruction words, editable
    var words = el("div", "l4w-tb-words");
    var wordBtns = [[], []];
    [0, 1].forEach(function (b) {
      var row = el("div", "l4w-tb-word");
      row.appendChild(el("span", "l4w-tb-wname", "g₃(" + b + ") ="));
      for (var i = 0; i < 3; i++) {
        (function (i) {
          var bt = el("button", "l4w-tb-bit");
          bt.type = "button";
          bt.addEventListener("click", function () {
            state.c[b][i] ^= 1;
            state.mode = "own";
            update();
          });
          wordBtns[b].push(bt);
          row.appendChild(bt);
        })(i);
      }
      words.appendChild(row);
    });
    host.appendChild(words);
    host.appendChild(el("p", "l4w-hint",
      "The decoder outputs one of these two reconstruction words; click a bit to change it. " +
      "The encoder sends the index of the word closer to x³."));

    // the eight blocks
    var wrap = el("div", "l4w-scroll");
    var table = el("table", "l4w-table l4w-tb-table");
    var thead = el("thead"), hr = el("tr");
    ["block x³", "bit sent", "reconstruction", "wrong bits"].forEach(function (t) {
      var th = el("th", null, t);
      th.scope = "col";
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tbody = el("tbody"), rows = [];
    for (var x = 0; x < 8; x++) {
      var tr = el("tr");
      var cx = el("td", "l4w-bin"), cf = el("td", "l4w-bin"), cr = el("td", "l4w-bin"), ce = el("td");
      cx.textContent = bitsOf(x).join("");
      tr.appendChild(cx); tr.appendChild(cf); tr.appendChild(cr); tr.appendChild(ce);
      tbody.appendChild(tr);
      rows.push({ f: cf, r: cr, e: ce });
    }
    table.appendChild(tbody);
    var tfoot = el("tfoot"), fr = el("tr");
    var ftot = el("td", "l4w-tb-total");
    ftot.colSpan = 3;
    ftot.textContent = "total";
    var fval = el("td", "l4w-tb-total");
    fr.appendChild(ftot); fr.appendChild(fval);
    tfoot.appendChild(fr);
    table.appendChild(tfoot);
    wrap.appendChild(table);
    host.appendChild(wrap);

    // distortions compared
    var bars = el("div", "l4w-bars");
    bars.setAttribute("role", "img");
    var BARS = [
      { key: "this", label: "this code, D₃", cls: "s-a" },
      { key: "best3", label: "best one-bit code of 3 bits (Problem 1)", cls: "s-ink" },
      { key: "long", label: "long blocks at the rate 1/3, D(1/3)", cls: "s-c" }
    ];
    var barEls = {};
    BARS.forEach(function (b) {
      var name = el("span", "l4w-bar-name", b.label);
      var track = el("span", "l4w-bar-track");
      var fill = el("span", "l4w-bar-fill " + b.cls);
      track.appendChild(fill);
      var val = el("span", "l4w-bar-val");
      bars.appendChild(name); bars.appendChild(track); bars.appendChild(val);
      barEls[b.key] = { fill: fill, val: val };
    });
    bars.appendChild(el("span", "l4w-bar-name l4w-tb-unit", "distortion (bit error rate)"));
    var axis = el("span", "l4w-bar-axis");
    [0, 0.1, 0.2, 0.3, 0.4, 0.5].forEach(function (t) {
      var s = el("span", null, String(t));
      s.style.left = (t / 0.5 * 100) + "%";
      axis.appendChild(s);
    });
    bars.appendChild(axis);
    bars.appendChild(el("span", "l4w-bar-val"));
    host.appendChild(bars);

    var readout = el("p", "l4w-readout");
    readout.setAttribute("aria-live", "polite");
    host.appendChild(readout);

    function setBar(key, v, text) {
      barEls[key].fill.style.width = Math.min(100, v / 0.5 * 100) + "%";
      barEls[key].val.textContent = text;
    }

    function update() {
      Object.keys(btns).forEach(function (k) { btns[k].setAttribute("aria-pressed", k === state.mode ? "true" : "false"); });
      var c = state.c;
      [0, 1].forEach(function (b) {
        for (var i = 0; i < 3; i++) {
          var bt = wordBtns[b][i];
          bt.textContent = String(c[b][i]);
          bt.setAttribute("aria-label", "Bit " + (i + 1) + " of g₃(" + b + "), now " + c[b][i] + ": click to flip");
        }
      });
      var total = 0;
      for (var x = 0; x < 8; x++) {
        var xb = bitsOf(x);
        var d0 = dist(xb, c[0]), d1 = dist(xb, c[1]);
        var f = d1 < d0 ? 1 : 0, rec = c[f], e = Math.min(d0, d1);
        total += e;
        rows[x].f.textContent = String(f);
        var r = rows[x].r;
        r.textContent = "";
        for (var i = 0; i < 3; i++) {
          var sp = el("span", rec[i] !== xb[i] ? "l4w-err" : null, String(rec[i]));
          r.appendChild(sp);
        }
        rows[x].e.textContent = String(e);
      }
      fval.textContent = String(total);
      var D3 = total / 24, k = dist(c[0], c[1]);
      setBar("this", D3, D3.toFixed(3));
      setBar("best3", 0.25, "0.250");
      setBar("long", D_LONG, D_LONG.toFixed(3));
      var txt = "In total, " + total + " bits are wrong in the 8 equally likely blocks, " + frac(total, 8) +
        " per block on average, so D₃ = " + frac(total, 24) + (total % 24 ? " ≈ " + D3.toFixed(3) : "") +
        " at the rate R₃ = 1/3. ";
      if (k === 0) {
        txt += "The two words are equal, so the bit sent is useless: the decoder always outputs the same word.";
      } else {
        txt += "The two words differ in " + k + (k === 1 ? " bit. " : " bits. ");
        txt += D3 <= 0.25 + 1e-12
          ? "No one-bit encoder of three bits does better (Problem 1), but long blocks reach about " + D_LONG.toFixed(3) + " at the same rate."
          : "The majority vote does better, 1/4, and long blocks reach about " + D_LONG.toFixed(3) + " at the same rate.";
      }
      readout.textContent = txt;
    }
    update();
  }

  function init() {
    var nodes = document.querySelectorAll('[data-widget="' + NAME + '"]');
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
