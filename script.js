// Configuration
const ADMIN_PASSWORD = "admin123";

// App state
const state = {
  products: [],
  fees: [],
  limits: [],
  tiers: [],
  filters: { search: "", category: "", segment: "" }
};

// Utility: CSV parsing (simple, expects clean CSV without quoted commas)
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    const cells = line.split(",");
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = (cells[i] ?? "").trim());
    return obj;
  });
}

// Utility: CSV export
function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const out = [headers.join(",")];
  rows.forEach(r => {
    const line = headers.map(h => (r[h] ?? "")).join(",");
    out.push(line);
  });
  return out.join("\n");
}

// Load initial data from /data folder (optional; you can start empty)
async function initData() {
  try {
    const [p, f, l, t] = await Promise.all([
      fetch("data/products.csv").then(r => r.ok ? r.text() : ""),
      fetch("data/fees.csv").then(r => r.ok ? r.text() : ""),
      fetch("data/limits.csv").then(r => r.ok ? r.text() : ""),
      fetch("data/interest_tiers.csv").then(r => r.ok ? r.text() : "")
    ]);
    if (p) state.products = parseCsv(p);
    if (f) state.fees = parseCsv(f);
    if (l) state.limits = parseCsv(l);
    if (t) state.tiers = parseCsv(t);
  } catch (e) {
    console.warn("Init data skipped:", e);
  }
}

// Filtered products
function getFilteredProducts() {
  const { search, category, segment } = state.filters;
  return state.products.filter(p => {
    const matchesSearch =
      !search ||
      (p.product_name || "").toLowerCase().includes(search) ||
      (p.product_type || "").toLowerCase().includes(search) ||
      (p.product_id || "").toLowerCase().includes(search);
    const matchesCategory = !category || (p.category === category);
    const matchesSegment = !segment || (p.segment === segment);
    return matchesSearch && matchesCategory && matchesSegment;
  });
}

// Renderers
function renderCategoryPanel(categoryKey, elementId) {
  const container = document.getElementById(elementId);
  container.innerHTML = "";
  const products = getFilteredProducts().filter(p => {
    if (categoryKey === "Individual Products") return p.category === "Individual Products";
    if (categoryKey === "Corporate Products") return p.category === "Corporate Products";
    if (categoryKey === "TD") return p.category === "TD";
    if (categoryKey === "Extra") return p.category === "Extra";
    return false;
  });

  products.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    const header = document.createElement("div");
    header.innerHTML = `
      <h3>${p.product_name} <span class="badge">${p.product_id}</span></h3>
      <div class="small">Type: ${p.product_type || "-"} | Segment: ${p.segment || "-"} | Effective: ${p.effective_date || "-"}</div>
    `;

    const grid = document.createElement("div");
    grid.className = "grid-2";

    // Fees table
    const fees = state.fees.filter(f => f.product_id === p.product_id);
    const feesHtml = `
      <h4>Fees</h4>
      <table class="table">
        <thead>
          <tr><th>Fee Name</th><th>Currency</th><th>Amount</th><th>Fee</th><th>Frequency</th><th>Condition</th></tr>
        </thead>
        <tbody>
          ${fees.map(f => `
            <tr>
              <td>${f.fee_name || "-"}</td>
              <td>${f.currency || "-"}</td>
              <td>${f.amount || "-"}</td>
              <td>${f.fee || "-"}</td>
              <td>${f.frequency || "-"}</td>
              <td>${f.condition || "-"}</td>
            </tr>
          `).join("") || `<tr><td colspan="6" class="small">No fees</td></tr>`}
        </tbody>
      </table>
    `;

    // Limits table
    const limits = state.limits.filter(l => l.product_id === p.product_id);
    const limitsHtml = `
      <h4>Transaction Limits</h4>
      <table class="table">
        <thead>
          <tr><th>Channel</th><th>Limit Type</th><th>Amount</th><th>Currency</th><th>Conditions</th><th>Tax Status</th></tr>
        </thead>
        <tbody>
          ${limits.map(l => `
            <tr>
              <td>${l.channel || "-"}</td>
              <td>${l.limit_type || "-"}</td>
              <td>${l.amount || "-"}</td>
              <td>${l.currency || "-"}</td>
              <td>${l.conditions || "-"}</td>
              <td>${l.tax_status || "-"}</td>
            </tr>
          `).join("") || `<tr><td colspan="6" class="small">No limits</td></tr>`}
        </tbody>
      </table>
    `;

    // Interest tiers table
    const tiers = state.tiers.filter(t => t.product_id === p.product_id);
    const tiersHtml = `
      <h4>Interest Tiers</h4>
      <table class="table">
        <thead>
          <tr>
            <th>Tier</th><th>Operator</th><th>Value</th><th>Currency</th><th>Rate</th><th>Payout Freq</th>
            <th>Conditions</th><th>Deposit</th><th>Withdrawal</th><th>Early Closure</th><th>Min Balance</th>
          </tr>
        </thead>
        <tbody>
          ${tiers.map(t => `
            <tr>
              <td>${t.tier || "-"}</td>
              <td>${t.operator || "-"}</td>
              <td>${t.value || "-"}</td>
              <td>${t.currency || "-"}</td>
              <td>${t.rate || "-"}</td>
              <td>${t.payout_frequency || "-"}</td>
              <td>${t.conditions || "-"}</td>
              <td>${t.deposit_condition || "-"}</td>
              <td>${t.withdrawal_condition || "-"}</td>
              <td>${t.early_closure || "-"}</td>
              <td>${t.minimum_balance || "-"}</td>
            </tr>
          `).join("") || `<tr><td colspan="11" class="small">No tiers</td></tr>`}
        </tbody>
      </table>
    `;

    grid.innerHTML = feesHtml + limitsHtml + tiersHtml;
    card.appendChild(header);
    card.appendChild(grid);
    container.appendChild(card);
  });

  if (!products.length) {
    container.innerHTML = `<div class="small">No products match your filters.</div>`;
  }
}

function renderAll() {
  renderCategoryPanel("Individual Products", "individual");
  renderCategoryPanel("Corporate Products", "corporate");
  renderCategoryPanel("TD", "td");
  renderCategoryPanel("Extra", "extra");
  renderAdminEditList();
}

// Admin: inline edit list
function renderAdminEditList() {
  const adminList = document.getElementById("adminEditList");
  if (!adminList) return;
  adminList.innerHTML = "";
  state.products.forEach((p, idx) => {
    const row = document.createElement("div");
    row.className = "inline-edit";
    row.innerHTML = `
      <input value="${p.product_id}" data-field="product_id" data-idx="${idx}" />
      <input value="${p.category || ""}" data-field="category" data-idx="${idx}" />
      <input value="${p.product_name || ""}" data-field="product_name" data-idx="${idx}" />
      <input value="${p.product_type || ""}" data-field="product_type" data-idx="${idx}" />
      <input value="${p.segment || ""}" data-field="segment" data-idx="${idx}" />
      <input value="${p.effective_date || ""}" data-field="effective_date" data-idx="${idx}" />
    `;
    adminList.appendChild(row);
  });
}

// Event wiring
function wireEvents() {
  // Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });

  // Filters
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const segmentFilter = document.getElementById("segmentFilter");

  let debounce;
  searchInput.addEventListener("input", e => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      state.filters.search = e.target.value.trim().toLowerCase();
      renderAll();
    }, 120);
  });
  categoryFilter.addEventListener("change", e => {
    state.filters.category = e.target.value;
    renderAll();
  });
  segmentFilter.addEventListener("change", e => {
    state.filters.segment = e.target.value;
    renderAll();
  });

  // Admin auth
  const loginBtn = document.getElementById("adminLoginBtn");
  loginBtn.addEventListener("click", () => {
    const pwd = document.getElementById("adminPassword").value;
    if (pwd === ADMIN_PASSWORD) {
      document.getElementById("adminAuth").classList.add("hidden");
      document.getElementById("adminPanel").classList.remove("hidden");
    } else {
      alert("Wrong password");
    }
  });

  // Admin inline edit live update
  document.getElementById("admin").addEventListener("input", e => {
    const field = e.target.dataset.field;
    const idx = e.target.dataset.idx;
    if (field && idx !== undefined) {
      state.products[idx][field] = e.target.value;
      renderAll();
    }
  });

  // Bulk import
  document.getElementById("bulkImportBtn").addEventListener("click", async () => {
    const files = {
      products: document.getElementById("productsFile").files[0],
      fees: document.getElementById("feesFile").files[0],
      limits: document.getElementById("limitsFile").files[0],
      tiers: document.getElementById("tiersFile").files[0]
    };
    const reader = file => new Promise(res => {
      if (!file) return res(null);
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.readAsText(file);
    });

    const [p, f, l, t] = await Promise.all([reader(files.products), reader(files.fees), reader(files.limits), reader(files.tiers)]);
    if (p) state.products = parseCsv(p);
    if (f) state.fees = parseCsv(f);
    if (l) state.limits = parseCsv(l);
    if (t) state.tiers = parseCsv(t);

    renderAll();
    alert("Import complete");
  });

  // Download JSON
  document.getElementById("downloadJsonBtn").addEventListener("click", () => {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_data.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  // Download merged Products CSV (edited)
  document.getElementById("downloadCsvBtn").addEventListener("click", () => {
    const csv = toCsv(state.products);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products.csv";
    a.click();
    URL.revokeObjectURL(url);
  });
}

// Boot
(async function start() {
  await initData();
  wireEvents();
  renderAll();
})();
