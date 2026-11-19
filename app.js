/* Nelli Tools — EMI, currency (via denelli-api), bill split, age, units. */
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
  function emiCalc() {
    var P = parseFloat($("nt-emi-p").value) || 0;
    var annual = parseFloat($("nt-emi-r").value) || 0;
    var n = parseInt($("nt-emi-n").value, 10) || 0;
    if (P <= 0 || n <= 0) {
      $("nt-emi-emi").textContent = "—"; $("nt-emi-int").textContent = "—";
      $("nt-emi-tot").textContent = "—"; $("nt-emi-table").innerHTML = "";
      $("nt-emi-mixp").style.width = "0"; $("nt-emi-mixi").style.width = "0";
      return;
    }
    var r = annual / 1200;
    var emi;
    if (r === 0) { emi = P / n; }
    else {
      var f = Math.pow(1 + r, n);
      emi = P * r * f / (f - 1);
    }
    var total = emi * n;
    var interest = total - P;
    $("nt-emi-emi").textContent = "₹" + fmt(Math.round(emi));
    $("nt-emi-int").textContent = "₹" + fmt(Math.round(interest));
    $("nt-emi-tot").textContent = "₹" + fmt(Math.round(total));
    var pp = total > 0 ? (P / total) * 100 : 0;
    $("nt-emi-mixp").style.width = pp + "%";
    $("nt-emi-mixi").style.width = (100 - pp) + "%";

    // year-wise amortization
    var bal = P, rows = ["<tr><th>Year</th><th>Principal paid</th><th>Interest paid</th><th>Balance</th></tr>"];
    var year = 1, yP = 0, yI = 0;
    for (var m = 1; m <= n; m++) {
      var intPart = bal * r;
      var prinPart = emi - intPart;
      if (prinPart > bal) { prinPart = bal; }
      bal -= prinPart;
      yP += prinPart; yI += intPart;
      if (m % 12 === 0 || m === n) {
        rows.push("<tr><td>" + year + "</td><td>₹" + fmt(Math.round(yP)) +
          "</td><td>₹" + fmt(Math.round(yI)) + "</td><td>₹" + fmt(Math.round(Math.max(bal, 0))) + "</td></tr>");
        year++; yP = 0; yI = 0;
      }
    }
    $("nt-emi-table").innerHTML = rows.join("");
  }
  ["nt-emi-p", "nt-emi-r", "nt-emi-n"].forEach(function (id) {
    $(id).addEventListener("input", emiCalc);
  });

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
    if (!rates) { $("nt-cur-out").textContent = "—"; return; }
    var amt = parseFloat($("nt-cur-amt").value) || 0;
    var f = $("nt-cur-from").value, t = $("nt-cur-to").value;
    var rf = f === "INR" ? 1 : rates[f];
    var rt = t === "INR" ? 1 : rates[t];
    if (!rf || !rt) { $("nt-cur-out").textContent = "—"; return; }
    var inINR = amt / rf;
    var out = inINR * rt;
    $("nt-cur-out").textContent = fmt(out, 4) + " " + t;
    var unit = (1 / rf) * rt;
    $("nt-cur-rate").textContent = "1 " + f + " = " + fmt(unit, 4) + " " + t;
  }
  function loadRates() {
    var note = $("nt-cur-note");
    var API = "https://shamilhabeebnelli.github.io/denelli-api/api/v1/currency/inr.json";
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
      var dm = /(\d{1,2} \w{3} \d{4})/.exec(json.source_date || "");
      if (dm) rateDate = dm[1];
      var rebuilt = (json.generated_at || "").replace(/:\d{2} IST$/, " IST");
      try { localStorage.setItem("ntRatesV1", JSON.stringify({ r: r, at: json.generated_at })); } catch (e) {}
      useRates(r, "latest snapshot · rates dated " + rateDate + " · rebuilt " + (rebuilt || "recently") + " · denelli-api");
    }).catch(function () {
      var cached = null;
      try { cached = JSON.parse(localStorage.getItem("ntRatesV1") || "null"); } catch (e) {}
      if (cached && cached.r) {
        useRates(cached.r, "offline — showing cached rates from " + (cached.at || "earlier"));
      } else {
        note.textContent = "rates unavailable right now — check your connection and reload";
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
    $("nt-sp-each").textContent = "₹" + fmt(Math.ceil(tot / n));
    $("nt-sp-tipt").textContent = "₹" + fmt(Math.round(tipAmt));
    $("nt-sp-tot").textContent = "₹" + fmt(Math.round(tot));
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
      $("nt-age-main").textContent = "—"; return;
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
    if (isNaN(v)) { $("nt-un-out").textContent = "—"; return; }
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
  loadRates();
  splitCalc();
  ageCalc();
  fillUnitSelects();
  unitCalc();
})();
