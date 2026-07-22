/**
 * PSA Monitoring Dashboard — Dashboard Brain
 */
"use strict";

const API_URL = "https://script.google.com/macros/s/AKfycbwmkxxkowDHENrqNJWNasKLbEX3vBRPZsCqS0dAsidg2HG-UYDo_IUAagBUeqW96HhC/exec";

const MONTH_ORDER = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DEPT_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
const darkTooltip = { backgroundColor: '#111827', titleColor: '#fff', bodyColor: '#cbd5e1', padding: 10, cornerRadius: 8 };

const State = { allData: [], activeSheet: null, activeSearch: "", openGroups: new Set(), chartInstances: {}, user: "Admin" };

function esc(str) { return str == null ? "" : String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function fmtDate(v) { if (!v || String(v).trim()==="" || v==="---") return "---"; const s = String(v).trim(); if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)){ const [m,d,y]=s.split("/"); return `${m.padStart(2,"0")}/${d.padStart(2,"0")}/${y}`; } const d=new Date(s); if(isNaN(d.getTime())) return s; return `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}/${d.getFullYear()}`; }
function resolveSubmittedDate(r) { return r.Date_Submitted || r.DateSubmitted || r["Date Submitted"] || r.Submitted || ""; }
function fuzzyMatch(q, t) { if (!q) return true; const query=q.toLowerCase(), target=(t||"").toLowerCase(); let qi=0; for(let i=0; i<target.length && qi<query.length; i++) if(target[i]===query[qi]) qi++; return qi===query.length; }
function rowSearchText(r) { return `${r.ReportName||""} ${r.Month||""} ${r.Department||""} ${r.PersonInCharge||""} ${r.MetricType||""}`; }
function initials(n) { return (!n || n.trim()==="" || n.trim()==="N/A") ? "AD" : n.trim().split(/\s+/).map(w=>w[0]).join("").toUpperCase().slice(0,2); }

function statusClass(s) {
  if (!s) return "unknown";
  const st = s.toLowerCase().trim();
  if (st.includes("ahead") || st.includes("time") || st === "ontime") return "ahead";
  if (st === "pending") return "pending";
  if (st === "late") return "late";
  if (st === "overdue") return "overdue";
  return "unknown";
}

function badgeHtml(s) {
  const cls = statusClass(s);
  const labels = { ahead: "Ahead / On Time", pending: "Pending", late: "Late", overdue: "Overdue", unknown: s || "Unknown" };
  return `<span class="badge badge-${cls}">${esc(labels[cls])}</span>`;
}

function metricTagHtml(m) {
  if (!m) return "";
  const mt = m.toLowerCase().trim();
  let cls = "tag-general";
  if (mt.includes("financial") || mt.includes("finance")) cls = "tag-financial";
  else if (mt.includes("narrative")) cls = "tag-narrative";
  else if (mt.includes("data") || mt.includes("statistic")) {
    cls = mt === "general data" ? "tag-general-data" : "tag-data";
  } else {
    const hash = m.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const dynamicClasses = ["tag-d1", "tag-d2", "tag-d3", "tag-d4", "tag-d5", "tag-d6", "tag-d7", "tag-d8"];
    cls = dynamicClasses[hash % dynamicClasses.length];
  }
  return `<span class="tag ${cls}">${esc(m)}</span>`;
}

const Icons = {
  dashGrid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  fileText: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  checkCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  alertCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  chevDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`,
  searchX: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="8" x2="14" y2="14"/><line x1="14" y1="8" x2="8" y2="14"/></svg>`,
  wifiOff: `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
  chartPie: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>`,
  barChart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
};

function showAppShell() {
  document.getElementById("appShell").classList.add("visible");
}

// Full-Screen Loader helpers
function showFSL(text, sub) {
  const el = document.getElementById("fullScreenLoader");
  if (!el) return;
  document.getElementById("fslText").textContent = text || "Processing...";
  document.getElementById("fslSub").textContent = sub || "Please wait a moment";
  el.classList.add("show");
}
function hideFSL() {
  const el = document.getElementById("fullScreenLoader");
  if (el) el.classList.remove("show");
}

function computeProgress(rows) {
  const total = rows.length;
  const ahead = rows.filter(r => statusClass(r.Status) === "ahead").length;
  const pending = rows.filter(r => statusClass(r.Status) === "pending").length;
  const late = rows.filter(r => statusClass(r.Status) === "late").length;
  const overdue = rows.filter(r => statusClass(r.Status) === "overdue").length;
  const completionPct = total > 0 ? Math.round((ahead / total) * 100) : 0;
  return { total, ahead, pending, late, overdue, completionPct };
}

// Validation Logic
function showErrorToast(msg) {
  const toast = document.getElementById("errorToast");
  document.getElementById("errorToastText").textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

function setUploadModalState(open) {
  const backdrop = document.getElementById("uploadModalBackdrop");
  if (!backdrop) return;
  backdrop.classList.toggle("show", open);
  backdrop.setAttribute("aria-hidden", open ? "false" : "true");
}

function showUploadResultModal(result) {
  const updated = Number(result && result.updated ? result.updated : 0);
  const skipped = Number(result && result.skipped ? result.skipped : 0);
  const errors = Array.isArray(result && result.errors) ? result.errors : [];

  const updatedNode = document.getElementById("uploadUpdatedCount");
  const skippedNode = document.getElementById("uploadSkippedCount");
  const errorNode = document.getElementById("uploadErrorCount");
  const errorsWrap = document.getElementById("uploadErrorsWrap");
  const errorsList = document.getElementById("uploadErrorsList");
  const subtitle = document.getElementById("uploadModalSubtitle");

  if (updatedNode) updatedNode.textContent = String(updated);
  if (skippedNode) skippedNode.textContent = String(skipped);
  if (errorNode) errorNode.textContent = String(errors.length);
  if (subtitle) subtitle.textContent = errors.length > 0 ? "The upload completed with validation errors. Review every line before closing." : "The upload completed successfully.";

  if (errorsWrap && errorsList) {
    errorsList.innerHTML = errors.length > 0
      ? errors.map(err => `<li>${esc(err)}</li>`).join("")
      : `<li style="border-color:rgba(16,185,129,.22);color:#065f46;background:#f0fdf4;">No row-level errors were reported.</li>`;
    errorsWrap.hidden = false;
  }

  setUploadModalState(true);
}

function hideUploadResultModal() {
  setUploadModalState(false);
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function setUploadLoadingState(message) {
  const updatedNode = document.getElementById("uploadUpdatedCount");
  const skippedNode = document.getElementById("uploadSkippedCount");
  const errorNode = document.getElementById("uploadErrorCount");
  const errorsWrap = document.getElementById("uploadErrorsWrap");
  const errorsList = document.getElementById("uploadErrorsList");
  const subtitle = document.getElementById("uploadModalSubtitle");

  if (updatedNode) updatedNode.textContent = "...";
  if (skippedNode) skippedNode.textContent = "...";
  if (errorNode) errorNode.textContent = "...";
  if (subtitle) subtitle.textContent = message || "Uploading CSV...";
  if (errorsWrap && errorsList) {
    errorsList.innerHTML = "";
    errorsWrap.hidden = true;
  }
  setUploadModalState(true);
}

function buildTemplateFileName() {
  const stamp = new Date().toISOString().slice(0, 10);
  return `psa_csv_template_${stamp}.csv`;
}

async function downloadCsvTemplate() {
  const button = document.getElementById("downloadTemplateBtn");
  if (button) button.disabled = true;
  try {
    // window.location natively handles the GAS 302 redirect without triggering CORS
    window.location.href = `${API_URL}?action=downloadTemplate`;
  } catch (error) {
    console.error("Template download failed:", error);
    showErrorToast(`Template download failed: ${error.message}`);
  } finally {
    setTimeout(() => { if (button) button.disabled = false; }, 2000);
  }
}

async function uploadCsvFile(file) {
  const uploadBtn = document.getElementById("uploadDataBtn");
  if (!file) return;

  if (!/\.csv$/i.test(file.name)) {
    showErrorToast("Please choose a .csv file.");
    return;
  }

  if (uploadBtn) uploadBtn.disabled = true;
  showFSL("Processing Data...", "Uploading CSV to server");
  try {
    const csvText = await file.text();
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: csvText
    });

    const rawText = await response.text();
    let result;
    try {
      result = JSON.parse(rawText);
    } catch (parseError) {
      throw new Error(`Upload response was not valid JSON: ${parseError.message}`);
    }

    if (!response.ok) {
      throw new Error((result && result.errors && result.errors[0]) || `Upload failed (${response.status})`);
    }

    hideFSL();
    showUploadResultModal(result || { updated: 0, skipped: 0, errors: ["Upload response was empty."] });
    if (result && Number(result.updated || 0) > 0) {
      await loadData({ silent: true });
    }
  } catch (error) {
    hideFSL();
    console.error("Upload failed:", error);
    const modalUpdated = document.getElementById("uploadUpdatedCount");
    const modalSkipped = document.getElementById("uploadSkippedCount");
    const modalErrors = document.getElementById("uploadErrorCount");
    const modalErrorList = document.getElementById("uploadErrorsList");
    const errorsWrap = document.getElementById("uploadErrorsWrap");
    
    if (modalUpdated) modalUpdated.textContent = 0;
    if (modalSkipped) modalSkipped.textContent = 0;
    if (modalErrors) modalErrors.textContent = 1;
    if (modalErrorList) {
      modalErrorList.innerHTML = `<li style="color: #ef4444;">Upload Error: ${error.message}. Check console.</li>`;
    }
    if (errorsWrap) errorsWrap.hidden = false;
    setUploadModalState(true);
  } finally {
    if (uploadBtn) uploadBtn.disabled = false;
  }
}

function validateDateInput(inputNode) {
  const today = new Date().toISOString().split("T")[0];
  inputNode.setAttribute("max", today);
  const parsedYear = new Date(inputNode.value).getFullYear();
  if (parsedYear < 2020) {
    showErrorToast("Date error: Year must be 2020 or greater.");
    return false;
  }
  return true;
}

function renderProgressBarHtml(b) {
  const pctPend = b.total > 0 ? (b.pending / b.total) * 100 : 0;
  const pctLate = b.total > 0 ? (b.late / b.total) * 100 : 0;
  const pctOver = b.total > 0 ? (b.overdue / b.total) * 100 : 0;
  const isPerfect = b.completionPct === 100;

  return `
    <div style="display:flex; align-items:center; gap:16px; flex:1; justify-content:flex-end;">
      <div style="display:flex; flex-direction:column; gap:6px; width: 100%; max-width: 180px;">
        <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700; color:var(--text-secondary);">
          <span>Completion</span>
          <span style="color:var(--text-primary); font-size:12.5px;">${b.completionPct}%</span>
        </div>
        <div class="seg-progress-track">
          ${b.total === 0 ? '<div class="seg-fill" style="width:100%;background:rgba(0,0,0,0.05)"></div>' : ''}
          ${b.completionPct > 0 ? `<div class="seg-fill seg-ahead ${isPerfect ? 'perfect-glow' : ''}" title="${b.ahead} Completed (${b.completionPct}%)" style="width:${b.completionPct}%; min-width:6px;"></div>` : ''}
          ${pctPend > 0 ? `<div class="seg-fill seg-pend" title="${b.pending} Pending (${pctPend<1?'<1':Math.round(pctPend)}%)" style="width:${pctPend}%; min-width:6px;"></div>` : ''}
          ${pctLate > 0 ? `<div class="seg-fill seg-late" title="${b.late} Late (${pctLate<1?'<1':Math.round(pctLate)}%)" style="width:${pctLate}%; min-width:6px;"></div>` : ''}
          ${pctOver > 0 ? `<div class="seg-fill seg-over" title="${b.overdue} Overdue (${pctOver<1?'<1':Math.round(pctOver)}%)" style="width:${pctOver}%; min-width:6px;"></div>` : ''}
        </div>
      </div>
      <div style="display:flex; gap:6px; min-width: 140px; justify-content:flex-end;">
        ${b.pending > 0 ? `<span class="warn-chip warn-pend" title="Pending Tasks">${b.pending} Pend</span>` : ''}
        ${b.late > 0 ? `<span class="warn-chip warn-late" title="Late Tasks">${b.late} Late</span>` : ''}
        ${b.overdue > 0 ? `<span class="warn-chip warn-over" title="Overdue Tasks">${b.overdue} Over</span>` : ''}
      </div>
    </div>
  `;
}

async function loadData(opts) {
  const silent = !!(opts && opts.silent);
  if (!silent) {
    setSyncState("loading", "Loading data...");
    renderSkeletons();
  }
  try {
    const res = await fetch(API_URL + "?action=getData&nocache=" + Date.now());
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    State.allData = json.data || [];
    buildNav();
    renderActivePane();
    setSyncState("online", `${State.allData.length} records · Live`);
  } catch (err) {
    setSyncState("error", "Connection failed");
    document.getElementById("panesContainer").innerHTML = `<div class="empty-state">${Icons.wifiOff}<div class="empty-state-title">Could not load data</div><div class="empty-state-sub">${esc(err.message)}</div></div>`;
  }
}

function setSyncState(state, text) {
  document.getElementById("syncDot").className = "sync-dot " + state;
  document.getElementById("syncText").textContent = text;
}

function buildNav() {
  const nav = document.getElementById("sidebarNav");
  const sheets = [...new Set(State.allData.map(r => r.Department || r.Sheet || "").filter(Boolean))].sort();
  let html = `<button class="nav-item active" data-sheet="null"><span class="nav-item-icon">${Icons.dashGrid}</span><span class="nav-item-label">All Activities</span><span class="nav-item-count">${State.allData.length}</span></button>`;
  for (const sheet of sheets) {
    const cnt = State.allData.filter(r => (r.Department || r.Sheet || "") === sheet).length;
    html += `<button class="nav-item" data-sheet="${esc(sheet)}"><span class="nav-item-icon">${Icons.folder}</span><span class="nav-item-label">${esc(sheet)}</span><span class="nav-item-count">${cnt}</span></button>`;
  }
  nav.innerHTML = html;
  nav.querySelectorAll(".nav-item[data-sheet]").forEach(btn => {
    btn.addEventListener("click", () => {
      State.activeSheet = btn.dataset.sheet === "null" ? null : btn.dataset.sheet;
      State.openGroups.clear();
      nav.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b === btn));
      renderActivePane();
    });
  });
}

function renderActivePane() {
  const container = document.getElementById("panesContainer");
  let data = State.activeSheet === null ? State.allData : State.allData.filter(r => (r.Department || r.Sheet || "") === State.activeSheet);
  if (State.activeSearch) data = data.filter(r => fuzzyMatch(State.activeSearch, rowSearchText(r)));
  
  document.getElementById("headerTitle").textContent = State.activeSheet || "All Activities";
  
  Object.values(State.chartInstances).forEach(ch => { try { ch.destroy(); } catch(e){} });
  State.chartInstances = {};

  const kpiHtml = buildKpiHtml(data);
  const tableHtml = buildTableHtml(data);
  const isExecutiveView = State.activeSheet === null;

  if (isExecutiveView) {
    // Analytics Hub Layout
    container.innerHTML = `
      ${kpiHtml}
      <div class="analytics-hub">
        <div class="analytics-chart-card">
          <div class="chart-card-header">${Icons.barChart}<span class="chart-card-title">Department Yield</span></div>
          <div class="hub-chart-canvas"><canvas id="chartHorizBar"></canvas></div>
        </div>
        <div class="analytics-chart-card">
          <div class="chart-card-header">${Icons.chartPie}<span class="chart-card-title">Status Distribution</span></div>
          <div class="hub-chart-canvas waffle-container" id="waffleChartContainer"></div>
        </div>
        <div class="analytics-chart-card">
          <div class="chart-card-header">${Icons.barChart}<span class="chart-card-title">Monthly Trend</span></div>
          <div class="hub-chart-canvas"><canvas id="chartVertBar"></canvas></div>
        </div>
      </div>
      <div class="data-card">
        <div class="data-card-header">
          <div><div class="data-card-title">Data Matrix</div><div class="data-card-sub">Executive overview of all submissions</div></div>
        </div>
        <div class="matrix-constrained">${tableHtml}</div>
      </div>
    `;
    initChartsExecutive(data);
  } else {
    // Department Layout
    container.innerHTML = `
      ${kpiHtml}
      <div class="bento-mid">
        <div class="data-card">
          <div class="data-card-header">
            <div>
              <div class="data-card-title">Submission Records</div>
              <div class="data-card-sub">Tracking matrix for ${State.activeSheet || 'all'} operation reports.</div>
            </div>
            <span class="record-badge">${data.length} records</span>
          </div>
          <div class="matrix-constrained">${tableHtml}</div>
        </div>
        <div class="charts-col" style="display:flex; flex-direction:column; gap:14px;">
          <div class="analytics-chart-card">
            <div class="chart-card-header">${Icons.chartPie}<span class="chart-card-title">Status Distribution</span></div>
            <div class="hub-chart-canvas waffle-container" id="waffleChartContainerDept"></div>
          </div>
          <div class="analytics-chart-card">
            <div class="chart-card-header">${Icons.barChart}<span class="chart-card-title">Monthly Trend</span></div>
            <div class="hub-chart-canvas"><canvas id="chartVertBarDept"></canvas></div>
          </div>
        </div>
      </div>`;
    initCharts(data);
  }

  wireAccordion();
}

function buildKpiHtml(rows) {
  const { total, ahead, pending: pend, late, overdue, completionPct } = computeProgress(rows);
  return `
    <div class="kpi-grid">
      <div class="kpi-card kpi-total"><div class="kpi-icon-wrap">${Icons.fileText}</div><div><div class="kpi-label">Total Reports</div><div class="kpi-value">${total}</div><div class="kpi-sub">Overall tracking</div></div></div>
      <div class="kpi-card kpi-ahead"><div class="kpi-icon-wrap">${Icons.checkCircle}</div><div><div class="kpi-label">Completed</div><div class="kpi-value">${ahead} <span style="font-size:14px;opacity:0.8">(${completionPct}%)</span></div><div class="kpi-sub">Ahead or on time</div></div></div>
      <div class="kpi-card kpi-pending"><div class="kpi-icon-wrap">${Icons.clock}</div><div><div class="kpi-label">Pending</div><div class="kpi-value">${pend}</div><div class="kpi-sub">Awaiting submission</div></div></div>
      <div class="kpi-card kpi-late"><div class="kpi-icon-wrap">${Icons.alertCircle}</div><div><div class="kpi-label">Late</div><div class="kpi-value">${late}</div><div class="kpi-sub">Past deadline</div></div></div>
      <div class="kpi-card kpi-overdue"><div class="kpi-icon-wrap">${Icons.alertCircle}</div><div><div class="kpi-label">Overdue</div><div class="kpi-value">${overdue}</div><div class="kpi-sub">No submission</div></div></div>
    </div>`;
}

function buildTableHtml(rows) {
  if (rows.length === 0) return `<div class="empty-state">${Icons.searchX}<div class="empty-state-title">No records found</div></div>`;
  
  const tree = {};
  rows.forEach(r => {
    const k = r.ReportName || "Unnamed";
    const parts = k.split(" ➔ ");
    const freq = parts[0];
    const cat = parts.length > 1 ? parts[1] : null;

    if (!tree[freq]) tree[freq] = { rows: [], cats: {} };
    tree[freq].rows.push(r);
    if (cat) {
      if (!tree[freq].cats[cat]) tree[freq].cats[cat] = [];
      tree[freq].cats[cat].push(r);
    }
  });

  let html = `<div class="data-table-wrap"><table class="data-table">
    <thead><tr><th>Report Title</th><th>Month</th><th>Metric/Task</th><th>In-Charge</th><th>Date Submitted</th><th>Deadline</th><th>Status</th><th>Remarks</th><th>Action</th></tr></thead>`;

  for (const [freqName, freqData] of Object.entries(tree)) {
    const hasCats = Object.keys(freqData.cats).length > 0;
    
    if (hasCats) {
      const fProg = computeProgress(freqData.rows);
      let fColor = "transparent"; let fBg = "rgba(0,0,0,0.02)";
      const fn = freqName.toUpperCase();
      
      if (fn.includes("MONTHLY")) { fColor = "#3b82f6"; fBg = "rgba(59, 130, 246, 0.25)"; }
      else if (fn.includes("QUARTERLY")) { fColor = "#8b5cf6"; fBg = "rgba(139, 92, 246, 0.25)"; }
      else if (fn.includes("SEMESTRAL")) { fColor = "#06b6d4"; fBg = "rgba(6, 182, 212, 0.25)"; }
      else if (fn.includes("ANNUAL")) { fColor = "#f59e0b"; fBg = "rgba(245, 158, 11, 0.25)"; }
      
      html += `<tr><td colspan="9" style="padding:16px 24px; background: linear-gradient(90deg, ${fBg} 0%, rgba(255,255,255,0) 100%); border-bottom:1px solid rgba(0,0,0,0.05); border-left:6px solid ${fColor};">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:24px;">
          <div style="font-weight:900; color:var(--text-primary); font-size:15px; min-width: 200px; text-transform: uppercase; letter-spacing: 0.05em;">${esc(freqName)}</div>
          ${renderProgressBarHtml(fProg)}
        </div>
      </td></tr>`;
    }

    const itemsToRender = hasCats ? freqData.cats : { [freqName]: freqData.rows };
    
    for (const [catName, catRows] of Object.entries(itemsToRender)) {
      const gName = hasCats ? `${freqName} ➔ ${catName}` : catName;
      const gId = "grp-" + btoa(encodeURIComponent(gName)).replace(/=/g, "");
      const isOpen = State.openGroups.has(gName);
      const cProg = computeProgress(catRows);
      
      html += `<tr><td colspan="9" style="padding:0">
        <button class="acc-group-hdr" data-group="${esc(gName)}" aria-expanded="${isOpen}" aria-controls="${gId}">
          <span class="acc-chevron">${Icons.chevDown}</span>
          <span class="acc-group-name" style="flex: 0 0 200px; text-align:left;">${esc(catName)}</span>
          ${renderProgressBarHtml(cProg)}
        </button></td></tr><tbody class="acc-body${isOpen ? " open" : ""}" id="${gId}">`;

      catRows.forEach(row => {
        const sub = resolveSubmittedDate(row); const dead = row.Deadline || row.DeadlineDate || "";
        html += `<tr>
          <td style="font-size:11.5px;color:#6b7280;max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(gName)}</td>
          <td><div style="font-weight:600;color:#374151">${esc(row.Month||"—")}</div></td>
          <td>${metricTagHtml(row.MetricType)}</td>
          <td>${row.PersonInCharge ? `<span class="pic-chip"><span class="pic-avatar">${initials(row.PersonInCharge)}</span><span>${esc(row.PersonInCharge)}</span></span>` : '—'}</td>
          <td>${sub ? `<span style="font-weight:600">${fmtDate(sub)}</span>` : '---'}</td>
          <td>${dead ? `<span style="color:#6b7280">${fmtDate(dead)}</span>` : '---'}</td>
          <td>${badgeHtml(row.Status)}</td>
          <td style="max-width:150px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--text-secondary);" title="${esc(row.Remarks || '')}">${row.Remarks ? esc(row.Remarks) : '—'}</td>
          <td>
            <button class="btn-action secondary" style="padding: 4px 8px; font-size: 11px;" onclick='openEditModal(${JSON.stringify({
              frequency: row.Frequency || freqName,
              category: row.Category || catName,
              task: row.Task || row.MetricType,
              period: row.Period || row.Month,
              submitted: row.Date_Submitted,
              sheet: row.Sheet,
              rowNumber: row.Row,
              dateColumn: row.DateColumn
            }).replace(/'/g, "&#39;")})'>
              Edit
            </button>
          </td>
        </tr>`;
      });
      html += `</tbody>`;
    }
  }
  return html + `</table></div>`;
}

function wireAccordion() {
  document.querySelectorAll(".acc-group-hdr").forEach(btn => {
    btn.addEventListener("click", () => {
      const grp = btn.dataset.group;
      const body = document.getElementById(btn.getAttribute("aria-controls"));
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      
      if (isOpen) {
        State.openGroups.delete(grp);
        btn.setAttribute("aria-expanded", "false");
        body.classList.remove("open");
      } else {
        State.openGroups.add(grp);
        btn.setAttribute("aria-expanded", "true");
        body.classList.add("open");
        setTimeout(() => {
          btn.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 150);
      }
    });
  });
}

function initChartsExecutive(rows) {
  const ctxHoriz = document.getElementById("chartHorizBar");
  const ctxVert = document.getElementById("chartVertBar");
  
  const depts = [...new Set(rows.map(r => r.Department || "Other"))];
  const deptCounts = depts.map(d => rows.filter(r => (r.Department||"Other") === d).length);

  if (ctxHoriz) {
     State.chartInstances.horizBar = new Chart(ctxHoriz, {
        type: 'bar',
        data: { labels: depts.map(d => d.slice(0,10)), datasets: [{ data: deptCounts, backgroundColor: DEPT_COLORS }] },
        options: { indexAxis: "y", plugins: { tooltip: darkTooltip, legend:{display:false} } }
     });
  }

  const statusCounts = [
    rows.filter(r => statusClass(r.Status) === "ahead").length,
    rows.filter(r => statusClass(r.Status) === "pending").length,
    rows.filter(r => statusClass(r.Status) === "late").length,
    rows.filter(r => statusClass(r.Status) === "overdue").length
  ];
  renderWaffleChart("waffleChartContainer", statusCounts[0], statusCounts[1], statusCounts[2], statusCounts[3]);

  if (ctxVert) {
     const monthMap = {};
     rows.forEach(r => { if(r.Month) monthMap[r.Month] = (monthMap[r.Month]||0)+1; });
     const filtered = MONTH_ORDER.filter(m => monthMap[m] !== undefined);
     
     State.chartInstances.vertBar = new Chart(ctxVert, {
        type: 'bar',
        data: { labels: filtered.map(m=>m.slice(0,3)), datasets: [{ data: filtered.map(m=>monthMap[m]), backgroundColor: '#3b82f6', borderRadius: 4 }] },
        options: { plugins: { tooltip: darkTooltip, legend:{display:false} } }
     });
  }
}

function initCharts(rows) {
  const statusCounts = [
    rows.filter(r => statusClass(r.Status) === "ahead").length,
    rows.filter(r => statusClass(r.Status) === "pending").length,
    rows.filter(r => statusClass(r.Status) === "late").length,
    rows.filter(r => statusClass(r.Status) === "overdue").length
  ];
  renderWaffleChart("waffleChartContainerDept", statusCounts[0], statusCounts[1], statusCounts[2], statusCounts[3]);

  const ctxVert = document.getElementById("chartVertBarDept");
  if (ctxVert) {
     const monthMap = {};
     rows.forEach(r => { if(r.Month) monthMap[r.Month] = (monthMap[r.Month]||0)+1; });
     const filtered = MONTH_ORDER.filter(m => monthMap[m] !== undefined);
     
     State.chartInstances.vertBarDept = new Chart(ctxVert, {
        type: 'bar',
        data: { labels: filtered.map(m=>m.slice(0,3)), datasets: [{ data: filtered.map(m=>monthMap[m]), backgroundColor: '#3b82f6', borderRadius: 4 }] },
        options: { plugins: { tooltip: darkTooltip, legend:{display:false} } }
     });
  }
}

function updateCharts() {
  const { horizBar, vertBar, vertBarDept } = State.chartInstances;
  if(horizBar) horizBar.update();
  if(vertBar) vertBar.update();
  if(vertBarDept) vertBarDept.update();
}

function renderWaffleChart(containerId, ahead, pend, late, overdue) {
  const total = ahead + pend + late + overdue;
  const container = document.getElementById(containerId);
  if (!container) return;
  if (total === 0) {
    container.innerHTML = '<div style="color:var(--text-muted);font-size:12px">No data</div>';
    return;
  }
  
  let pAhead = Math.round((ahead / total) * 100);
  let pPend = Math.round((pend / total) * 100);
  let pLate = Math.round((late / total) * 100);
  let pOver = Math.round((overdue / total) * 100);
  
  const diff = 100 - (pAhead + pPend + pLate + pOver);
  if (diff !== 0) {
     const max = Math.max(pAhead, pPend, pLate, pOver);
     if (max === pAhead) pAhead += diff;
     else if (max === pPend) pPend += diff;
     else if (max === pLate) pLate += diff;
     else pOver += diff;
  }

  const dAhead = (ahead > 0 && pAhead === 0) ? "<1" : pAhead;
  const dPend = (pend > 0 && pPend === 0) ? "<1" : pPend;
  const dLate = (late > 0 && pLate === 0) ? "<1" : pLate;
  const dOver = (overdue > 0 && pOver === 0) ? "<1" : pOver;

  let html = '<div class="waffle-grid">';
  for(let i = 0; i < pAhead; i++) html += `<div class="waffle-cell waffle-ahead" title="Ahead (${dAhead}%)"></div>`;
  for(let i = 0; i < pPend; i++) html += `<div class="waffle-cell waffle-pend" title="Pending (${dPend}%)"></div>`;
  for(let i = 0; i < pLate; i++) html += `<div class="waffle-cell waffle-late" title="Late (${dLate}%)"></div>`;
  for(let i = 0; i < pOver; i++) html += `<div class="waffle-cell waffle-over" title="Overdue (${dOver}%)"></div>`;
  html += '</div>';

  html += `
    <div class="waffle-legend">
      <div class="wl-item" title="${ahead} Ahead (${dAhead}%)"><div class="wl-dot waffle-ahead"></div><span>Completed</span><span class="wl-count">${ahead}</span></div>
      <div class="wl-item" title="${pend} Pending (${dPend}%)"><div class="wl-dot waffle-pend"></div><span>Pending</span><span class="wl-count">${pend}</span></div>
      <div class="wl-item" title="${late} Late (${dLate}%)"><div class="wl-dot waffle-late"></div><span>Late</span><span class="wl-count">${late}</span></div>
      <div class="wl-item" title="${overdue} Overdue (${dOver}%)"><div class="wl-dot waffle-over"></div><span>Overdue</span><span class="wl-count">${overdue}</span></div>
    </div>
  `;
  container.innerHTML = html;
}

function renderSkeletons() {
  document.getElementById("panesContainer").innerHTML = `<div class="kpi-grid">${Array(5).fill('<div class="skeleton kpi-skeleton"></div>').join("")}</div>
    <div style="background:#fff;border-radius:16px;padding:16px">${Array(8).fill('<div class="skeleton table-row-skeleton"></div>').join("")}</div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  showAppShell();
  loadData();

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      location.reload();
    });
  }
  
  document.getElementById("globalSearch").addEventListener("input", e => { 
    State.activeSearch = e.target.value.trim(); 
    renderActivePane(); 
  });

  const downloadTemplateBtn = document.getElementById("downloadTemplateBtn");
  if (downloadTemplateBtn) {
    downloadTemplateBtn.addEventListener("click", () => {
      downloadCsvTemplate();
    });
  }

  const uploadDataBtn = document.getElementById("uploadDataBtn");
  const csvFileInput = document.getElementById("csvFileInput");
  if (uploadDataBtn && csvFileInput) {
    uploadDataBtn.addEventListener("click", () => {
      csvFileInput.value = "";
      csvFileInput.click();
    });
    csvFileInput.addEventListener("change", () => {
      const file = csvFileInput.files && csvFileInput.files[0];
      if (file) uploadCsvFile(file);
    });
  }

  const uploadModalBackdrop = document.getElementById("uploadModalBackdrop");
  const uploadModalCloseBtn = document.getElementById("uploadModalCloseBtn");
  const uploadModalDismissBtn = document.getElementById("uploadModalDismissBtn");
  const uploadModalRetryBtn = document.getElementById("uploadModalRetryBtn");
  if (uploadModalBackdrop) {
    uploadModalBackdrop.addEventListener("click", e => {
      if (e.target === uploadModalBackdrop) hideUploadResultModal();
    });
  }
  if (uploadModalCloseBtn) uploadModalCloseBtn.addEventListener("click", hideUploadResultModal);
  if (uploadModalDismissBtn) uploadModalDismissBtn.addEventListener("click", hideUploadResultModal);
  if (uploadModalRetryBtn) {
    uploadModalRetryBtn.addEventListener("click", () => {
      hideUploadResultModal();
      if (csvFileInput) csvFileInput.click();
    });
  }

  const syncBtn = document.getElementById("syncDataBtn");
  if (syncBtn) {
    syncBtn.addEventListener("click", async () => {
      const text = document.getElementById("syncDataText");
      const icon = syncBtn.querySelector(".sync-icon");
      
      syncBtn.disabled = true;
      text.innerText = "Syncing...";
      icon.classList.add("spin");
      
      try {
        await fetch(API_URL + "?action=syncNow&nocache=" + Date.now());
      } catch (e) {
        console.error("Sync failed:", e);
      }
      
      await loadData();
      
      syncBtn.disabled = false;
      text.innerText = "Sync Data";
      icon.classList.remove("spin");
    });
  }
});

let currentEditRecord = null;

window.openEditModal = function(recordData) {
  currentEditRecord = recordData;
  document.getElementById("editModalSubtitle").textContent = `${recordData.task} (${recordData.period})`;
  
  const dateInput = document.getElementById("editDateInput");
  dateInput.value = "";

  const raw = recordData.submitted;
  if (raw && raw !== "---" && raw !== "") {
    let isoString = "";

    // Format 1: MM/DD/YYYY  ← what hierarchyFormatDateValue() produces
    const slashMatch = String(raw).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const [, mm, dd, yyyy] = slashMatch;
      isoString = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }

    // Format 2: already YYYY-MM-DD (ISO)
    if (!isoString && /^\d{4}-\d{2}-\d{2}/.test(String(raw))) {
      isoString = String(raw).slice(0, 10);
    }

    // Format 3: fallback — try generic Date parse (works for RFC 2822, full ISO, etc.)
    if (!isoString) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        isoString = d.toISOString().split("T")[0];
      }
    }

    dateInput.value = isoString;
  }
  
  document.getElementById("editModalBackdrop").classList.add("show");
};

function closeEditModal() {
  document.getElementById("editModalBackdrop").classList.remove("show");
  currentEditRecord = null;
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

document.addEventListener("DOMContentLoaded", () => {
  const editModalCloseBtn = document.getElementById("editModalCloseBtn");
  const editModalCancelBtn = document.getElementById("editModalCancelBtn");
  const editRecordForm = document.getElementById("editRecordForm");

  if (editModalCloseBtn) editModalCloseBtn.addEventListener("click", closeEditModal);
  if (editModalCancelBtn) editModalCancelBtn.addEventListener("click", closeEditModal);
  
  if (editRecordForm) {
    editRecordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentEditRecord) return;

      const recordToSave = currentEditRecord;
      const submittedDateValue = document.getElementById("editDateInput").value;

      closeEditModal();
      showFSL("Saving Record...", "Writing to the live spreadsheet");

      try {
        const payload = {
          action: "updateRecordDirect",
          data: {
            sheet: recordToSave.sheet,
            row: recordToSave.rowNumber,
            dateColumn: recordToSave.dateColumn,
            submittedDate: submittedDateValue
          }
        };

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        
        const rawText = await response.text();
        const result = JSON.parse(rawText);
        
        if (!response.ok || (result.errors && result.errors.length > 0)) {
          throw new Error((result.errors && result.errors[0]) || "Update failed");
        }

        document.getElementById("fslText").textContent = "Syncing Dashboard...";
        document.getElementById("fslSub").textContent = "Refreshing data";
        await loadData({ silent: true });
      } catch (err) {
        console.error(err);
        showErrorToast(`Failed to update: ${err.message}`);
      } finally {
        hideFSL();
      }
    });
  }
});