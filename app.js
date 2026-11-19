/* EMI Calculator â EMI, currency (via keraladaily), bill split, age, units. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function fmt(n, d) {
    if (d === undefined) d = 2;
    return Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: 0 });
  }

  /* ---------- tabs ---------- */
  document.querySelectorAll("#nt-nav .nt-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll("#nt-nav .nt-tab").forEach(function (t) { t.classList.toggle("nt-active", t === tab); });
      document.querySelectorAll(".nt-tool").forEach(function (s) {
        s.classList.toggle("nt-show", s.id === "nt-" + tab.getAttribute("data-nttool"));
      });
    });
  });

  /* ---------- EMI ---------- */
  function emiInputs() {
    var base = parseFloat($("nt-emi-p").value) || 0;
    var ins = parseFloat($("nt-emi-ins").value) || 0;
    var sc = parseFloat($("nt-emi-sc").value) || 0;
    var dbd = parseFloat($("nt-emi-dbd").value) || 0;
    var pc = parseFloat($("nt-emi-pc").value) || 0;
    var cc = parseFloat($("nt-emi-cc").value) || 0;
    return {
      base: base, ins: ins, sc: sc, dbd: dbd, pc: pc, cc: cc,
      upfront: sc + dbd + pc + cc,
      P: base + ins,
      annual: parseFloat($("nt-emi-r").value) || 0,
      n: parseInt($("nt-emi-n").value, 10) || 0
    };
  }
  function emiCompute(P, annual, n) {
    var r = annual / 1200, emi;
    if (r === 0) { emi = P / n; }
    else {
      var f = Math.pow(1 + r, n);
      emi = P * r * f / (f - 1);
    }
    var total = emi * n;
    var rows = [], bal = P, year = 1, yP = 0, yI = 0;
    for (var m = 1; m <= n; m++) {
      var intPart = bal * r;
      var prinPart = emi - intPart;
      if (prinPart > bal) { prinPart = bal; }
      bal -= prinPart;
      yP += prinPart; yI += intPart;
      if (m % 12 === 0 || m === n) {
        rows.push({ year: year, p: yP, i: yI, bal: Math.max(bal, 0) });
        year++; yP = 0; yI = 0;
      }
    }
    return { emi: emi, total: total, interest: total - P, rows: rows };
  }
  function emiCalc() {
    var inp = emiInputs();
    if (inp.P <= 0 || inp.n <= 0) {
      $("nt-emi-emi").textContent = "â"; $("nt-emi-int").textContent = "â";
      $("nt-emi-tot").textContent = "â"; $("nt-emi-table").innerHTML = "";
      $("nt-emi-up").textContent = "â"; $("nt-emi-loan").textContent = "â";
      $("nt-emi-mixp").style.width = "0"; $("nt-emi-mixi").style.width = "0";
      return;
    }
    var c = emiCompute(inp.P, inp.annual, inp.n);
    $("nt-emi-emi").textContent = "â¹" + fmt(Math.round(c.emi));
    $("nt-emi-int").textContent = "â¹" + fmt(Math.round(c.interest));
    $("nt-emi-tot").textContent = "â¹" + fmt(Math.round(c.total));
    $("nt-emi-up").textContent = "â¹" + fmt(Math.round(inp.upfront));
    $("nt-emi-loan").textContent = "â¹" + fmt(Math.round(inp.P));
    var pp = c.total > 0 ? (inp.P / c.total) * 100 : 0;
    $("nt-emi-mixp").style.width = pp + "%";
    $("nt-emi-mixi").style.width = (100 - pp) + "%";

    // year-wise amortization
    var rows = ["<tr><th>Year</th><th>Principal paid</th><th>Interest paid</th><th>Balance</th></tr>"];
    c.rows.forEach(function (rw) {
      rows.push("<tr><td>" + rw.year + "</td><td>â¹" + fmt(Math.round(rw.p)) +
        "</td><td>â¹" + fmt(Math.round(rw.i)) + "</td><td>â¹" + fmt(Math.round(rw.bal)) + "</td></tr>");
    });
    $("nt-emi-table").innerHTML = rows.join("");
  }
  ["nt-emi-p", "nt-emi-r", "nt-emi-n", "nt-emi-sc", "nt-emi-dbd", "nt-emi-pc", "nt-emi-cc", "nt-emi-ins"].forEach(function (id) {
    $(id).addEventListener("input", emiCalc);
  });

  /* ---------- EMI PDF ---------- */
  function pdfDoc(ops) {
    function esc(s) { return String(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }
    var stream = "";
    ops.forEach(function (op) {
      if (op[0] === "T") { stream += "BT /" + (op[4] ? "F2" : "F1") + " " + op[2] + " Tf " + op[1] + " " + op[3] + " Td (" + esc(op[5]) + ") Tj ET\n"; }
      else if (op[0] === "R") { if (op[5] != null) { stream += op[5] + " g " + op[1] + " " + op[2] + " " + op[3] + " " + op[4] + " re f 0 g\n"; } stream += "0.8 w " + op[1] + " " + op[2] + " " + op[3] + " " + op[4] + " re S\n"; }
      else if (op[0] === "L") { stream += "0.6 w " + op[1] + " " + op[2] + " m " + op[3] + " " + op[4] + " l S\n"; }
    });
    var objs = [null,
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 6 0 R >> >> /Contents 5 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      "<< /Length " + stream.length + " >>\nstream\n" + stream + "endstream",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
    ];
    var pdf = "%PDF-1.4\n", offsets = [0];
    for (var i = 1; i <= 6; i++) {
      offsets[i] = pdf.length;
      pdf += i + " 0 obj\n" + objs[i] + "\nendobj\n";
    }
    var xref = pdf.length;
    pdf += "xref\n0 7\n0000000000 65535 f \n";
    for (i = 1; i <= 6; i++) {
      pdf += ("0000000000" + offsets[i]).slice(-10) + " 00000 n \n";
    }
    pdf += "trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";
    return pdf;
  }
  function emiPdf() {
    var inp = emiInputs();
    if (inp.P <= 0 || inp.n <= 0) { return; }
    var c = emiCompute(inp.P, inp.annual, inp.n);
    var rs = function (x) { return "Rs " + fmt(Math.round(x)); };
    var when = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
    var ops = [], L = 40, R = 555, W = R - L;
    function T(x, size, y, bold, s) { ops.push(["T", x, size, y, bold ? 1 : 0, s]); }
    function box(yTop, yBot, fill) { ops.push(["R", L, yBot, W, yTop - yBot, fill != null ? fill : null]); }
    function hline(y, x1, x2) { ops.push(["L", x1 == null ? L : x1, y, x2 == null ? R : x2, y]); }
    function vline(x, yTop, yBot) { ops.push(["L", x, yTop, x, yBot]); }

    T(L, 16, 806, 1, "EMI Calculator - customer quote");
    T(L, 9, 790, 0, "denelli - " + when + " IST");

    /* Highlight box: EMI + downpayment, prominent */
    box(770, 700, 0.96);
    var mid = L + W / 2;
    vline(mid, 770, 700);
    T(L + 12, 8, 754, 0, "MONTHLY EMI");
    T(L + 12, 20, 722, 1, rs(c.emi));
    T(mid + 12, 8, 754, 0, "DOWNPAYMENT (UPFRONT)");
    T(mid + 12, 20, 722, 1, rs(inp.upfront));

    /* Loan details box */
    box(680, 590, null);
    ops.push(["R", L, 656, W, 24, 0.90]);
    T(L + 8, 11, 664, 1, "Loan details");
    T(L + 8, 10, 638, 0, "Loan amount: " + rs(inp.base));
    T(L + 8, 10, 622, 0, "Interest: " + inp.annual + "% per year    Tenure: " + inp.n + " months");
    T(L + 8, 10, 606, 0, "Insurance (financed, added to loan): " + rs(inp.ins) + "    Loan incl. insurance: " + rs(inp.P));

    /* Charges box */
    box(572, 502, null);
    ops.push(["R", L, 548, W, 24, 0.90]);
    T(L + 8, 11, 556, 1, "Charges in downpayment (upfront, not in EMI)");
    T(L + 8, 10, 530, 0, "Service charge (SC): " + rs(inp.sc) + "    DBD: " + rs(inp.dbd));
    T(L + 8, 10, 514, 0, "Processing charge (PC): " + rs(inp.pc) + "    Card charge (CC): " + rs(inp.cc));

    /* Totals line */
    T(L, 11, 482, 1, "Total interest: " + rs(c.interest) + "    Total payment (EMI x " + inp.n + "): " + rs(c.total));

    /* Amortization table with grid */
    var maxRows = Math.min(c.rows.length, 24);
    var rowH = 15, tTop = 462, tBot = tTop - rowH * (maxRows + 1);
    var c0 = L, c1 = L + 60, c2 = L + 225, c3 = L + 390;
    box(tTop, tBot, null);
    ops.push(["R", L, tTop - rowH, W, rowH, 0.90]);
    T(c0 + 6, 9, tTop - 11, 1, "Year");
    T(c1 + 6, 9, tTop - 11, 1, "Principal paid");
    T(c2 + 6, 9, tTop - 11, 1, "Interest paid");
    T(c3 + 6, 9, tTop - 11, 1, "Balance");
    var y = tTop - rowH;
    for (var r = 0; r < maxRows; r++) {
      var rw = c.rows[r];
      hline(y);
      T(c0 + 6, 9, y - 11, 0, "Year " + rw.year);
      T(c1 + 6, 9, y - 11, 0, rs(rw.p));
      T(c2 + 6, 9, y - 11, 0, rs(rw.i));
      T(c3 + 6, 9, y - 11, 0, rs(rw.bal));
      y -= rowH;
    }
    vline(c1, tTop, tBot); vline(c2, tTop, tBot); vline(c3, tTop, tBot);
    var noteY = tBot - 16;
    if (c.rows.length > maxRows) { T(L, 8, noteY, 0, "Showing first " + maxRows + " of " + c.rows.length + " years; the app shows every year."); noteY -= 12; }
    T(L, 8, noteY - 4, 0, "Insurance is financed into the loan above. SC, DBD, PC and CC are upfront, not in the EMI.");
    T(L, 8, noteY - 16, 0, "Made with EMI Calculator - denelli - copyright strictly prohibited");

    var blob = new Blob([pdfDoc(ops)], { type: "application/pdf" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "emi-quote-emi-calculator.pdf";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  $("nt-emi-pdf").addEventListener("click", emiPdf);

  /* ---------- Room size & AC ---------- */
  function acCalc() {
    var l = parseFloat($("nt-ac-l").value) || 0;
    var w = parseFloat($("nt-ac-w").value) || 0;
    var inM = $("nt-ac-unit").value === "m";
    var sqft = l * w * (inM ? 10.7639 : 1);
    if (sqft <= 0) {
      $("nt-ac-area").textContent = "â"; $("nt-ac-ton").textContent = "â";
      $("nt-ac-btu").textContent = "â"; $("nt-ac-note").textContent = "";
      return;
    }
    var sqm = sqft / 10.7639;
    // Sizing chart from Haier India's guide: up to 120 sq ft = 1 ton, 120-180 = 1.5 ton, 180-300 = 2 ton; extended above that.
    var pick;
    if (sqft <= 120) { pick = 1; }
    else if (sqft <= 180) { pick = 1.5; }
    else if (sqft <= 300) { pick = 2; }
    else if (sqft <= 400) { pick = 2.5; }
    else { pick = 3; }
    $("nt-ac-area").textContent = fmt(Math.round(sqft)) + " sq ft (" + sqm.toFixed(1) + " mÂ²)";
    $("nt-ac-ton").textContent = pick + " ton" + (sqft > 400 ? " (or split units)" : "");
    $("nt-ac-btu").textContent = "â" + fmt(pick * 12000) + " BTU/hr";
    $("nt-ac-note").textContent = "Chart: up to 120 sq ft = 1 ton, 120-180 = 1.5 ton, 180-300 = 2 ton (Haier India guide). Go a size up for top floor, harsh sunlight, more than 3 people or heat-making appliances. Floor area alone is not an exact cooling load - confirm with the brand chart before quoting.";
  }
  ["nt-ac-l", "nt-ac-w"].forEach(function (id) { $(id).addEventListener("input", acCalc); });
  $("nt-ac-unit").addEventListener("change", acCalc);

  /* ---------- Currency ---------- */
  var rates = null; // {CODE: one_inr_buys}
  var CODES = ["INR", "USD", "EUR", "GBP", "AED", "SAR", "QAR", "KWD", "BHD", "OMR",
               "JPY", "CNY", "AUD", "CAD", "SGD", "MYR", "THB", "CHF", "ZAR", "PKR",
               "BDT", "LKR", "NPR"];
  function fillCurrencySelects() {
    var from = $("nt-cur-from"), to = $("nt-cur-to");
    from.innerHTML = ""; to.innerHTML = "";
    CODES.forEach(function (c) {
      if (c !== "INR" && !rates[c]) return;
      var o1 = document.createElement("option"); o1.value = c; o1.textContent = c; from.appendChild(o1);
      var o2 = document.createElement("option"); o2.value = c; o2.textContent = c; to.appendChild(o2);
    });
    from.value = "INR"; to.value = rates.USD ? "USD" : "INR";
  }
  function curConvert() {
    if (!rates) { $("nt-cur-out").textContent = "â"; return; }
    var amt = parseFloat($("nt-cur-amt").value) || 0;
    var f = $("nt-cur-from").value, t = $("nt-cur-to").value;
    var rf = f === "INR" ? 1 : rates[f];
    var rt = t === "INR" ? 1 : rates[t];
    if (!rf || !rt) { $("nt-cur-out").textContent = "â"; return; }
    var inINR = amt / rf;
    var out = inINR * rt;
    $("nt-cur-out").textContent = fmt(out, 4) + " " + t;
    var unit = (1 / rf) * rt;
    $("nt-cur-rate").textContent = "1 " + f + " = " + fmt(unit, 4) + " " + t;
  }
  function loadRates() {
    var note = $("nt-cur-note");
    var API = "https://shamilhabeebnelli.github.io/keraladaily/api/v1/currency/inr.json";
    function useRates(r, label) {
      rates = r;
      fillCurrencySelects();
      curConvert();
      note.textContent = label;
    }
    fetch(API, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("http " + res.status);
      return res.json();
    }).then(function (json) {
      var r = { INR: 1 };
      Object.keys(json.data.rates).forEach(function (k) { r[k] = json.data.rates[k].one_inr_buys; });
      var rateDate = "date unknown";
      var dm = /(\d{1,2} \w{3} \d{4})/.exec(json.source_date || (json.data && json.data.source_date) || "");
      if (dm) rateDate = dm[1];
      var rebuilt = (json.generated_at || "").replace(/:\d{2} IST$/, " IST");
      try { localStorage.setItem("ntRatesV1", JSON.stringify({ r: r, at: json.generated_at })); } catch (e) {}
      useRates(r, "latest snapshot Â· rates dated " + rateDate + " Â· rebuilt " + (rebuilt || "recently") + " Â· keraladaily");
    }).catch(function () {
      var cached = null;
      try { cached = JSON.parse(localStorage.getItem("ntRatesV1") || "null"); } catch (e) {}
      if (cached && cached.r) {
        useRates(cached.r, "offline â showing cached rates from " + (cached.at || "earlier"));
      } else {
        note.textContent = "rates unavailable right now â check your connection and reload";
      }
    });
  }
  ["nt-cur-amt", "nt-cur-from", "nt-cur-to"].forEach(function (id) {
    $(id).addEventListener("input", curConvert);
  });

  /* ---------- Bill split ---------- */
  function splitCalc() {
    var amt = parseFloat($("nt-sp-amt").value) || 0;
    var tip = parseFloat($("nt-sp-tip").value) || 0;
    var n = parseInt($("nt-sp-n").value, 10) || 1;
    var tipAmt = amt * tip / 100;
    var tot = amt + tipAmt;
    $("nt-sp-each").textContent = "â¹" + fmt(Math.ceil(tot / n));
    $("nt-sp-tipt").textContent = "â¹" + fmt(Math.round(tipAmt));
    $("nt-sp-tot").textContent = "â¹" + fmt(Math.round(tot));
  }
  ["nt-sp-amt", "nt-sp-tip", "nt-sp-n"].forEach(function (id) {
    $(id).addEventListener("input", splitCalc);
  });

  /* ---------- Age ---------- */
  function ageCalc() {
    var v = $("nt-age-dob").value;
    if (!v) return;
    var dob = new Date(v + "T00:00:00");
    var now = new Date();
    if (isNaN(dob) || dob > now) {
      $("nt-age-main").textContent = "â"; return;
    }
    var y = now.getFullYear() - dob.getFullYear();
    var m = now.getMonth() - dob.getMonth();
    var d = now.getDate() - dob.getDate();
    if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    $("nt-age-main").textContent = y + "y " + m + "m " + d + "d";
    var days = Math.floor((now - dob) / 86400000);
    $("nt-age-days").textContent = fmt(days, 0);
    $("nt-age-wd").textContent = dob.toLocaleDateString("en-IN", { weekday: "long" });
    var next = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      next = new Date(now.getFullYear() + 1, dob.getMonth(), dob.getDate());
    }
    var toNext = Math.ceil((next - now) / 86400000);
    $("nt-age-next").textContent = toNext === 0 ? "Birthday is today!" :
      "Next birthday in " + toNext + " day" + (toNext === 1 ? "" : "s") +
      " (" + next.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) + ")";
  }
  $("nt-age-dob").addEventListener("input", ageCalc);

  /* ---------- Units ---------- */
  var UNITS = {
    length: { km: 1000, m: 1, cm: 0.01, mi: 1609.344, ft: 0.3048, "in": 0.0254 },
    weight: { kg: 1, g: 0.001, lb: 0.45359237, oz: 0.0283495231 },
    temp: { C: "C", F: "F", K: "K" },
  };
  function fillUnitSelects() {
    var cat = $("nt-un-cat").value;
    var from = $("nt-un-from"), to = $("nt-un-to");
    from.innerHTML = ""; to.innerHTML = "";
    Object.keys(UNITS[cat]).forEach(function (u) {
      var o1 = document.createElement("option"); o1.value = u; o1.textContent = u; from.appendChild(o1);
      var o2 = document.createElement("option"); o2.value = u; o2.textContent = u; to.appendChild(o2);
    });
    to.selectedIndex = Math.min(1, to.options.length - 1);
  }
  function toC(v, u) { return u === "C" ? v : u === "F" ? (v - 32) * 5 / 9 : v - 273.15; }
  function fromC(v, u) { return u === "C" ? v : u === "F" ? v * 9 / 5 + 32 : v + 273.15; }
  function unitCalc() {
    var cat = $("nt-un-cat").value;
    var f = $("nt-un-from").value, t = $("nt-un-to").value;
    var v = parseFloat($("nt-un-val").value);
    if (isNaN(v)) { $("nt-un-out").textContent = "â"; return; }
    var out;
    if (cat === "temp") { out = fromC(toC(v, f), t); }
    else { out = v * UNITS[cat][f] / UNITS[cat][t]; }
    $("nt-un-out").textContent = fmt(out, 4) + " " + t;
  }
  ["nt-un-cat", "nt-un-from", "nt-un-to", "nt-un-val"].forEach(function (id) {
    $(id).addEventListener("input", function () {
      if (id === "nt-un-cat") fillUnitSelects();
      unitCalc();
    });
  });

  /* ---------- init ---------- */
  emiCalc();
  acCalc();
  loadRates();
  splitCalc();
  ageCalc();
  fillUnitSelects();
  unitCalc();
})();
