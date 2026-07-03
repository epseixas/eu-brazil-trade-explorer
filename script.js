
let DATA;
let selectedState;
let rankingMetric = "exports";

let charts = {};

const fmtUSD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1
});

const fmtFullUSD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

function money(value) {
  return fmtUSD.format(value);
}

function moneyFull(value) {
  return fmtFullUSD.format(value);
}

function pct(part, total) {
  if (!total) return "—";
  return (part / total * 100).toFixed(1) + "%";
}

fetch("data/dashboard_data.json")
  .then(r => r.json())
  .then(data => {
    DATA = data;
    selectedState = DATA.states[0].state;
    initControls();
    renderAll();
  });

function initControls() {
  const stateSelect = document.getElementById("stateSelect");
  stateSelect.innerHTML = DATA.states
    .slice()
    .sort((a,b) => a.state.localeCompare(b.state))
    .map(s => `<option value="${s.state}">${s.state}</option>`)
    .join("");
  stateSelect.value = selectedState;
  stateSelect.addEventListener("change", e => {
    selectedState = e.target.value;
    renderAll();
  });

  const metricSelect = document.getElementById("metricSelect");
  metricSelect.addEventListener("change", e => {
    rankingMetric = e.target.value;
    renderStateTable();
  });
}

function renderAll() {
  renderNationalKpis();
  renderStateTable();
  renderNationalMonthly();
  renderStateProfile();
  renderNationalProducts();
}

function renderNationalKpis() {
  const o = DATA.overview;
  const cards = [
    ["Exports to EU", o.exports, "Brazilian exports to the EU as one bloc"],
    ["Imports from EU", o.imports, "Brazilian imports from the EU as one bloc"],
    ["Total trade", o.total_trade, "Exports + imports"],
    ["Trade balance", o.balance, "Exports - imports"]
  ];

  document.getElementById("nationalKpis").innerHTML = cards.map(([label, value, sub]) => `
    <div class="kpi">
      <div class="label">${label}</div>
      <div class="value">${money(value)}</div>
      <div class="sub">${sub}</div>
    </div>
  `).join("");
}

function renderStateTable() {
  const metricLabels = {
    exports: "exports to the EU",
    imports: "imports from the EU",
    total_trade: "total trade with the EU",
    balance: "trade balance with the EU"
  };
  document.getElementById("rankingSub").textContent = `Ranked by ${metricLabels[rankingMetric]}.`;

  const rows = DATA.states.slice().sort((a,b) => b[rankingMetric] - a[rankingMetric]);

  document.querySelector("#stateTable tbody").innerHTML = rows.map((r, i) => `
    <tr data-state="${r.state}" class="${r.state === selectedState ? "active" : ""}">
      <td>${i + 1}</td>
      <td>${r.state}</td>
      <td>${money(r.exports)}</td>
      <td>${money(r.imports)}</td>
      <td>${money(r.balance)}</td>
    </tr>
  `).join("");

  document.querySelectorAll("#stateTable tbody tr").forEach(tr => {
    tr.addEventListener("click", () => {
      selectedState = tr.dataset.state;
      document.getElementById("stateSelect").value = selectedState;
      renderAll();
    });
  });
}

function makeChart(id, config) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), config);
}

function renderNationalMonthly() {
  const months = DATA.national_month.map(d => d.month);
  makeChart("nationalMonthlyChart", {
    type: "line",
    data: {
      labels: months,
      datasets: [
        { label: "Exports", data: DATA.national_month.map(d => d.exports), tension: .25 },
        { label: "Imports", data: DATA.national_month.map(d => d.imports), tension: .25 }
      ]
    },
    options: chartOptions()
  });
}

function renderStateProfile() {
  const s = DATA.states.find(x => x.state === selectedState);
  document.getElementById("stateTitle").textContent = `${s.state} and the European Union`;

  document.getElementById("stateKpis").innerHTML = [
    ["Exports to EU", s.exports, `${pct(s.exports, DATA.overview.exports)} of Brazil's exports to the EU`],
    ["Imports from EU", s.imports, `${pct(s.imports, DATA.overview.imports)} of Brazil's imports from the EU`],
    ["Total trade", s.total_trade, `${pct(s.total_trade, DATA.overview.total_trade)} of Brazil–EU trade`],
    ["Balance", s.balance, s.balance >= 0 ? "Surplus with the EU" : "Deficit with the EU"]
  ].map(([label, value, sub]) => `
    <div class="kpi">
      <div class="label">${label}</div>
      <div class="value">${money(value)}</div>
      <div class="sub">${sub}</div>
    </div>
  `).join("");

  const monthly = DATA.state_month.filter(d => d.state === selectedState).sort((a,b) => a.month - b.month);

  makeChart("stateMonthlyChart", {
    type: "line",
    data: {
      labels: monthly.map(d => d.month),
      datasets: [
        { label: "Exports", data: monthly.map(d => d.exports), tension: .25 },
        { label: "Imports", data: monthly.map(d => d.imports), tension: .25 }
      ]
    },
    options: chartOptions()
  });

  const sp = DATA.state_products.filter(d => d.state === selectedState);

  const topExports = sp.slice().sort((a,b) => b.exports - a.exports).slice(0, 5);
  makeChart("stateExportsChart", {
    type: "bar",
    data: {
      labels: topExports.map(d => d.label),
      datasets: [{ label: "Exports", data: topExports.map(d => d.exports) }]
    },
    options: horizontalOptions()
  });

  const topImports = sp.slice().sort((a,b) => b.imports - a.imports).slice(0, 5);
  makeChart("stateImportsChart", {
    type: "bar",
    data: {
      labels: topImports.map(d => d.label),
      datasets: [{ label: "Imports", data: topImports.map(d => d.imports) }]
    },
    options: horizontalOptions()
  });
}

function renderNationalProducts() {
  const topExports = DATA.products.slice().sort((a,b) => b.exports - a.exports).slice(0, 8);
  makeChart("nationalExportsChart", {
    type: "bar",
    data: {
      labels: topExports.map(d => d.label),
      datasets: [{ label: "Exports", data: topExports.map(d => d.exports) }]
    },
    options: horizontalOptions()
  });

  const topImports = DATA.products.slice().sort((a,b) => b.imports - a.imports).slice(0, 8);
  makeChart("nationalImportsChart", {
    type: "bar",
    data: {
      labels: topImports.map(d => d.label),
      datasets: [{ label: "Imports", data: topImports.map(d => d.imports) }]
    },
    options: horizontalOptions()
  });
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${moneyFull(ctx.raw)}`
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: value => money(value)
        }
      }
    }
  };
}

function horizontalOptions() {
  return {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => moneyFull(ctx.raw)
        }
      }
    },
    scales: {
      x: {
        ticks: {
          callback: value => money(value)
        }
      },
      y: {
        ticks: {
          callback: function(value) {
            const label = this.getLabelForValue(value);
            return label.length > 42 ? label.slice(0, 42) + "…" : label;
          }
        }
      }
    }
  };
}
