/* Lecture 3 widget: concatenation and decoding (Section 3.2). A word over {a,...,g} is encoded
   with one of three codes: the lossless code of the example of the notes (a ↦ ∅, b ↦ 0, c ↦ 1,
   d ↦ 00, e ↦ 01, f ↦ 10, g ↦ 11), a prefix code, or a code that is UD but not a prefix code
   (the prefix code with its codewords reversed). The widget lists every word with the same
   encoding, and shows how the decoder of a prefix code reads the bits.
   Usage in the class notes:  %web: l3-parse word=fade
   Draws into every [data-widget="l3-parse"] element. No libraries. */
(function () {
  "use strict";
  var NAME = "l3-parse";
  var LETTERS = ["a", "b", "c", "d", "e", "f", "g"];
  var MAXLEN = 12, SHOW = 12;
  var CODES = [
    { key: "example", label: "code of the example", words: ["", "0", "1", "00", "01", "10", "11"],
      kind: "lossless, not UD" },
    { key: "prefix", label: "a prefix code", words: ["00", "010", "011", "100", "101", "110", "111"],
      kind: "prefix code" },
    { key: "suffix", label: "UD, not prefix", words: ["00", "010", "110", "001", "101", "011", "111"],
      kind: "UD, not a prefix code (00 is a prefix of 001)" }
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
  function cwText(w) { return w === "" ? "∅" : w; }

  // all parses of the bit string s into nonempty codewords: count (exact) and the first few
  function parses(s, words) {
    var n = s.length, cnt = new Array(n + 1), i, j;
    cnt[n] = 1;
    for (i = n - 1; i >= 0; i--) {
      cnt[i] = 0;
      for (j = 0; j < words.length; j++) {
        var w = words[j];
        if (w && s.substr(i, w.length) === w) cnt[i] += cnt[i + w.length];
      }
    }
    var list = [];
    (function dfs(i, acc) {
      if (list.length >= 200) return;
      if (i === n) { list.push(acc.slice()); return; }
      for (var j = 0; j < words.length; j++) {
        var w = words[j];
        if (w && s.substr(i, w.length) === w && cnt[i + w.length] > 0) {
          acc.push(j); dfs(i + w.length, acc); acc.pop();
        }
      }
    })(0, []);
    return { count: cnt[0], list: list };
  }

  function build(host) {
    if (host.getAttribute("data-ready")) return;
    host.setAttribute("data-ready", "1");
    var args = parseArgs(host);
    var word = (args.word || "fade").toLowerCase().replace(/[^a-g]/g, "").slice(0, MAXLEN) || "fade";
    var code = CODES[0];

    host.textContent = "";
    var root = host;                                    // the host is the frame, as in the other widgets
    root.classList.add("l3w", "l3w-pa");
    var ctl = el("div", "l3w-controls");
    root.appendChild(ctl);
    var seg = el("div", "l3w-seg");
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-label", "Code");
    var btns = CODES.map(function (c) {
      var b = el("button", "l3w-btn", c.label);
      b.type = "button";
      b.addEventListener("click", function () { code = c; render(); });
      seg.appendChild(b);
      return b;
    });
    ctl.appendChild(seg);
    var field = el("label", "l3w-field");
    field.appendChild(el("span", "l3w-ctl-name", "word"));
    var input = document.createElement("input");
    input.type = "text";
    input.value = word;
    input.maxLength = MAXLEN;
    input.spellcheck = false;
    input.setAttribute("aria-label", "A word with the letters a to g");
    input.addEventListener("input", function () {
      var w = input.value.toLowerCase().replace(/[^a-g]/g, "").slice(0, MAXLEN);
      if (w !== input.value) input.value = w;
      word = w;
      render();
    });
    field.appendChild(input);
    ctl.appendChild(field);

    var book = el("div", "l3w-scroll");
    root.appendChild(book);
    var enc = el("div", "l3w-pa-enc");
    root.appendChild(enc);
    var listBox = el("div", "l3w-pa-list");
    root.appendChild(listBox);
    var readout = el("p", "l3w-readout");
    readout.setAttribute("aria-live", "polite");
    root.appendChild(readout);

    function segRow(idx, words, cls) {                  // a parse: segments of bits with their letters
      var row = el("div", "l3w-pa-row" + (cls ? " " + cls : ""));
      idx.forEach(function (j, t) {
        var s = el("span", "l3w-pa-seg" + (t % 2 ? " is-odd" : ""));
        s.appendChild(el("span", "l3w-pa-bits", cwText(words[j])));
        s.appendChild(el("span", "l3w-pa-let", LETTERS[j]));
        row.appendChild(s);
      });
      return row;
    }

    function render() {
      btns.forEach(function (b, i) { b.setAttribute("aria-pressed", CODES[i] === code ? "true" : "false"); });
      // codebook
      book.textContent = "";
      var t = el("table", "l3w-table l3w-pa-book");
      var r1 = el("tr"), r2 = el("tr");
      r1.appendChild(el("th", null, "x"));
      r2.appendChild(el("th", null, "f(x)"));
      LETTERS.forEach(function (L, j) {
        r1.appendChild(el("td", "l3w-pa-let", L));
        r2.appendChild(el("td", "l3w-bin", cwText(code.words[j])));
      });
      t.appendChild(r1); t.appendChild(r2);
      book.appendChild(t);
      book.appendChild(el("p", "l3w-pa-kind", code.kind));

      enc.textContent = "";
      listBox.textContent = "";
      if (!word) { readout.textContent = "Type a word with the letters a to g."; return; }
      var idx = word.split("").map(function (c) { return LETTERS.indexOf(c); });
      var bitsStr = idx.map(function (j) { return code.words[j]; }).join("");
      enc.appendChild(el("p", "l3w-pa-head", "The word " + word + " is encoded as " + (bitsStr || "∅") + ":"));
      enc.appendChild(segRow(idx, code.words, "is-true"));

      if (!bitsStr) {
        readout.textContent = "Every letter of this word is a, encoded as ∅: the encoding is empty, as for any word made of a's, so nothing can be decoded.";
        return;
      }
      var P = parses(bitsStr, code.words);
      var hasEmpty = code.words.indexOf("") >= 0;
      var others = P.list.filter(function (pp) {
        return pp.join(",") !== idx.filter(function (j) { return code.words[j] !== ""; }).join(",");
      });
      if (P.count > 1 || hasEmpty) {
        listBox.appendChild(el("p", "l3w-pa-head", hasEmpty ? "Some of the other words with the same encoding:" :
          "Other words with the same encoding" + (P.count - 1 > SHOW ? " (the first " + SHOW + ")" : "") + ":"));
        if (hasEmpty) listBox.appendChild(segRow([0].concat(idx), code.words));
        others.slice(0, hasEmpty ? SHOW - 1 : SHOW).forEach(function (pp) { listBox.appendChild(segRow(pp, code.words)); });
      }
      var msg;
      if (hasEmpty) {
        msg = "The bits " + bitsStr + " split into codewords in " + P.count + " way" + (P.count > 1 ? "s" : "") +
          ", and since a ↦ ∅, any number of a's can be added anywhere: infinitely many words have this encoding, " +
          "so the decoder cannot recover the word. This code is lossless, since its codewords are distinct, but not uniquely decodable.";
      } else if (code.key === "prefix") {
        var steps = [], pos = 0;
        while (pos < bitsStr.length) {
          for (var j = 0; j < code.words.length; j++) {
            if (bitsStr.substr(pos, code.words[j].length) === code.words[j]) { steps.push(code.words[j] + " → " + LETTERS[j]); pos += code.words[j].length; break; }
          }
          if (j === code.words.length) break;
        }
        msg = "Only one word has this encoding. The decoder reads the bits until they form a codeword, outputs its letter, " +
          "and starts again: " + steps.join(", ") + ". No codeword is a prefix of another, so it never has to look ahead.";
      } else {
        msg = "Only one word has this encoding: the code is UD. But reading from the left, the decoder sometimes has to wait: " +
          "after 00, it cannot tell a = 00 from the beginning of d = 001 until it sees more bits. Read from the right, the " +
          "codewords form a prefix code, so the decoder can start from the end.";
      }
      readout.textContent = msg;
    }
    render();
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
