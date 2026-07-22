/**
 * write_files.js — Writes the production-ready index.html and app.js
 * Run: node write_files.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname);

// ─── INDEX.HTML ────────────────────────────────────────────────────────────────
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PSA Monitoring Dashboard</title>
  <meta name="theme-color" content="#2c3fa7">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"><\/script>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --sb-from:#2c3fa7;--sb-to:#1e2d7d;--sb-text:rgba(255,255,255,.88);
      --sb-text-dim:rgba(255,255,255,.45);--sb-hover-bg:rgba(255,255,255,.08);
      --sb-divider:rgba(255,255,255,.10);--sb-width:276px;
      --canvas:#f0f2f8;--card:#fff;--card-border:#e2e8ef;
      --card-shadow:0 1px 4px rgba(44,63,167,.07),0 2px 12px rgba(0,0,0,.04);
      --text-primary:#111827;--text-secondary:#374151;--text-muted:#6b7280;--text-link:#3b52cb;
      --border:#dde3ef;--border-focus:#3b52cb;
      --ahead-bg:#dcfce7;--ahead-text:#14532d;--ahead-border:#86efac;
      --pending-bg:#fef9c3;--pending-text:#78350f;--pending-border:#fde047;
      --late-bg:#fee2e2;--late-text:#7f1d1d;--late-border:#fca5a5;
      --unknown-bg:#f1f5f9;--unknown-text:#334155;--unknown-border:#cbd5e1;
      --accent:#3b52cb;--accent-light:#eef0fb;
      --font:'Inter',system-ui,-apple-system,sans-serif;
      --r-sm:8px;--r-md:12px;--r-lg:16px;--r-xl:20px;
    }
    html{scroll-behavior:smooth;font-size:15px}
    body{font-family:var(--font);background:var(--canvas);color:var(--text-primary);
         -webkit-font-smoothing:antialiased;overflow:hidden;height:100vh}
    ::-webkit-scrollbar{width:5px;height:5px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:#c5cde8;border-radius:9999px}
    ::-webkit-scrollbar-thumb:hover{background:#a0aac6}

    /* ── STATUS BADGES ── */
    .badge{display:inline-block;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;
           letter-spacing:.03em;white-space:nowrap;border:1.5px solid transparent}
    .badge-ahead  {background:var(--ahead-bg);  color:var(--ahead-text);  border-color:var(--ahead-border)}
    .badge-pending{background:var(--pending-bg);color:var(--pending-text);border-color:var(--pending-border)}
    .badge-late   {background:var(--late-bg);   color:var(--late-text);   border-color:var(--late-border)}
    .badge-unknown{background:var(--unknown-bg);color:var(--unknown-text);border-color:var(--unknown-border)}

    /* ── METRIC TYPE PILL BADGES ── */
    .tag{display:inline-block;padding:2px 9px;border-radius:999px;font-size:10px;font-weight:700;
         letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;border:1.5px solid transparent}
    .tag-financial{background:#d1fae5;color:#064e3b;border-color:#6ee7b7}
    .tag-narrative{background:#ede9fe;color:#3b0764;border-color:#c4b5fd}
    .tag-data     {background:#cffafe;color:#164e63;border-color:#67e8f9}
    .tag-general  {background:#f3f4f6;color:#1f2937;border-color:#d1d5db}

    /* ── NEON GAMING PROGRESS BARS ── */
    .neon-progress-track {
      display: flex; gap: 4px; height: 10px; background: rgba(0,0,0,0.06);
      border-radius: 999px; padding: 2px;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
    }
    .neon-fill {
      height: 100%; border-radius: 999px; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .neon-ahead { background: #10b981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.6); }

    /* ── WARNING CHIPS ── */
    .warn-chip {
      padding: 3px 8px; border-radius: 6px; font-size: 10.5px; font-weight: 800; white-space: nowrap;
      display: inline-flex; align-items: center; gap: 4px; border: 1px solid transparent;
    }
    .warn-pend { background: rgba(234, 179, 8, 0.15); color: #b45309; border-color: rgba(234, 179, 8, 0.3); }
    .warn-late { background: rgba(249, 115, 22, 0.15); color: #c2410c; border-color: rgba(249, 115, 22, 0.3); }
    .warn-over { background: rgba(239, 68, 68, 0.15); color: #b91c1c; border-color: rgba(239, 68, 68, 0.3); }

    /* ── APP SHELL ── */
    #appShell{display:flex;height:100vh;opacity:0;pointer-events:none;transition:opacity .5s ease}
    #appShell.visible{opacity:1;pointer-events:all}

    /* ── SIDEBAR ── */
    #sidebar{width:var(--sb-width);min-width:var(--sb-width);
      background:linear-gradient(180deg,var(--sb-from) 0%,var(--sb-to) 100%);
      display:flex;flex-direction:column;z-index:20;
      box-shadow:4px 0 28px rgba(30,45,125,.28);overflow:hidden;position:relative}
    .sb-logo-area{padding:20px 18px 16px;border-bottom:1px solid var(--sb-divider);
      position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:12px}
    .sb-logo-img-wrap{width:76px;height:76px;border-radius:50%;background:#fff;
      box-shadow:0 4px 22px rgba(0,0,0,.26),0 1px 6px rgba(0,0,0,.14);
      display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
    .sb-logo-img-wrap img{width:68px;height:68px;object-fit:contain;display:block}
    .sb-brand-text{text-align:center}
    .sb-brand-name{font-size:12.5px;font-weight:800;color:#fff;letter-spacing:-.1px;line-height:1.35}
    .sb-brand-sub{font-size:9.5px;color:var(--sb-text-dim);font-weight:500;margin-top:2px;
      text-transform:uppercase;letter-spacing:.07em}

    .sb-profile{padding:11px 14px 10px;border-bottom:1px solid var(--sb-divider);
      display:flex;align-items:center;gap:10px;position:relative;z-index:1}
    .sb-avatar{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.18);
      border:2px solid rgba(255,255,255,.28);display:flex;align-items:center;justify-content:center;
      font-size:13px;font-weight:800;color:#fff;flex-shrink:0}
    .sb-profile-name{font-size:12.5px;font-weight:700;color:#fff;white-space:nowrap;
      overflow:hidden;text-overflow:ellipsis}
    .sb-profile-role{font-size:10px;color:var(--sb-text-dim);margin-top:1px;font-weight:500}
    .sb-section-label{padding:12px 16px 5px;font-size:9.5px;font-weight:700;
      color:var(--sb-text-dim);letter-spacing:.13em;text-transform:uppercase;position:relative;z-index:1}

    #sidebarNav{flex:1;overflow-y:auto;padding:4px 0 16px;position:relative;z-index:1;scrollbar-width:none}
    #sidebarNav::-webkit-scrollbar{display:none}
    .nav-item{display:flex;align-items:center;gap:10px;padding:9px 14px 9px 13px;
      font-size:13px;font-weight:500;color:var(--sb-text);cursor:pointer;
      transition:background .15s,color .15s;user-select:none;min-height:42px;
      border:none;background:none;width:100%;text-align:left;
      border-left:3px solid transparent;border-radius:0 8px 8px 0}
    .nav-item:hover{background:var(--sb-hover-bg)}
    .nav-item.active{background:rgba(255,255,255,.15);border-left-color:#fff;
      color:#fff;font-weight:700}
    .nav-item-icon{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;
      justify-content:center;flex-shrink:0;background:rgba(255,255,255,.10);transition:background .15s}
    .nav-item.active .nav-item-icon{background:rgba(255,255,255,.22)}
    .nav-item-icon svg{width:15px;height:15px;stroke:rgba(255,255,255,.72);fill:none;stroke-width:2}
    .nav-item.active .nav-item-icon svg{stroke:#fff}
    .nav-item-label{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .nav-item-count{flex-shrink:0;font-size:10.5px;font-weight:700;background:rgba(255,255,255,.16);
      color:rgba(255,255,255,.85);border-radius:999px;padding:2px 7px;min-width:22px;text-align:center}
    .nav-item.active .nav-item-count{background:rgba(255,255,255,.32);color:#fff}
    .sb-footer{padding:10px 0;border-top:1px solid var(--sb-divider);position:relative;z-index:1}
    .sb-logout-btn{display:flex;align-items:center;gap:8px;padding:9px 14px 9px 19px;
      font-size:12.5px;font-weight:600;color:rgba(255,255,255,.55);cursor:pointer;
      background:none;border:none;width:100%;transition:background .15s,color .15s;font-family:var(--font)}
    .sb-logout-btn:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.88)}
    .sb-logout-btn svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2}

    /* ── MAIN CONTENT ── */
    #mainArea{flex:1;display:flex;flex-direction:column;min-width:0;background:var(--canvas);overflow:hidden}
    #topHeader{height:58px;background:var(--card);border-bottom:1px solid var(--card-border);
      padding:0 24px;display:flex;align-items:center;justify-content:space-between;
      gap:16px;flex-shrink:0;box-shadow:0 1px 4px rgba(44,63,167,.06);z-index:10}
    .header-left{display:flex;flex-direction:column}
    .header-view-title{font-size:15px;font-weight:700;color:var(--text-primary);line-height:1.2}
    .header-view-sub{font-size:11px;color:var(--text-muted);margin-top:1px}
    .search-wrap{display:flex;align-items:center;gap:8px;background:var(--canvas);
      border:1.5px solid var(--border);border-radius:var(--r-sm);padding:7px 12px;
      flex:1;max-width:320px;transition:border-color .2s,box-shadow .2s}
    .search-wrap:focus-within{border-color:var(--border-focus);box-shadow:0 0 0 3px rgba(59,82,203,.10)}
    .search-wrap svg{width:14px;height:14px;stroke:var(--text-muted);fill:none;stroke-width:2;flex-shrink:0}
    #globalSearch{flex:1;border:none;background:transparent;font-family:var(--font);
      font-size:13px;color:var(--text-primary);outline:none}
    #syncIndicator{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;
      color:var(--text-secondary);background:var(--canvas);border:1.5px solid var(--border);
      border-radius:999px;padding:5px 12px;white-space:nowrap;flex-shrink:0}
    .sync-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
    .sync-dot.online {background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,.5);animation:pulse 2s infinite}
    .sync-dot.loading{background:#f59e0b;animation:pulse 1s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    #contentScroll{flex:1;overflow-y:auto;padding:20px 24px 32px}

    /* ── KPI CARDS — FULL-BLEED GRADIENTS ── */
    .kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:18px}
    .kpi-card{border-radius:var(--r-lg);padding:20px;display:flex;align-items:center;gap:14px;
      transition:transform .2s,box-shadow .2s;cursor:default;position:relative;
      overflow:hidden;border:1.5px solid transparent}
    .kpi-card:hover{transform:translateY(-3px)}
    .kpi-card::after{content:'';position:absolute;top:-24px;right:-24px;width:90px;height:90px;
      border-radius:50%;background:rgba(255,255,255,.13);pointer-events:none}
    .kpi-card::before{content:'';position:absolute;bottom:-28px;left:-16px;width:70px;height:70px;
      border-radius:50%;background:rgba(255,255,255,.07);pointer-events:none}
    
    /* Blue  — Total    */
    .kpi-total  {background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%);
      border-color:rgba(96,165,250,.30);box-shadow:0 4px 20px rgba(37,99,235,.32)}
    /* Emerald   — Compliant */
    .kpi-ahead  {background:linear-gradient(135deg,#064e3b 0%,#059669 55%,#34d399 100%);
      border-color:rgba(52,211,153,.30);box-shadow:0 4px 20px rgba(5,150,105,.28)}
    /* Indigo   — Pending */
    .kpi-pending{background:linear-gradient(135deg,#312e81 0%,#4f46e5 55%,#818cf8 100%);
      border-color:rgba(129,140,248,.30);box-shadow:0 4px 20px rgba(79,70,229,.28)}
    /* Orange   — Late */
    .kpi-late   {background:linear-gradient(135deg,#78350f 0%,#ea580c 55%,#fdba74 100%);
      border-color:rgba(253,186,116,.30);box-shadow:0 4px 20px rgba(234,88,12,.28)}
    /* Red      — Overdue */
    .kpi-overdue{background:linear-gradient(135deg,#7f1d1d 0%,#ef4444 55%,#fca5a5 100%);
      border-color:rgba(252,165,165,.30);box-shadow:0 4px 20px rgba(239,68,68,.28)}

    .kpi-icon-wrap{width:48px;height:48px;border-radius:13px;background:rgba(255,255,255,.18);
      backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .kpi-icon-wrap svg{width:22px;height:22px;stroke:#fff;fill:none;stroke-width:2}
    .kpi-label{font-size:9.5px;font-weight:700;color:rgba(255,255,255,.70);text-transform:uppercase;
      letter-spacing:.09em;margin-bottom:4px}
    .kpi-value{font-size:30px;font-weight:900;color:#fff;line-height:1;letter-spacing:-1px}
    .kpi-sub{font-size:10.5px;color:rgba(255,255,255,.60);margin-top:3px;font-weight:500}

    /* ── BENTO GRID MID TIER ── */
    .bento-mid{display:grid;grid-template-columns:1fr 340px;gap:14px;align-items:start}
    .data-card{background:var(--card);border:1.5px solid var(--card-border);border-radius:var(--r-lg);
      box-shadow:var(--card-shadow);overflow:hidden}
    .data-card-header{padding:14px 18px;border-bottom:1px solid var(--border);
      display:flex;align-items:center;justify-content:space-between;gap:12px}
    .data-card-title{font-size:14px;font-weight:700;color:var(--text-primary)}
    .data-card-sub{font-size:11px;color:var(--text-muted);margin-top:1px}
    .record-badge{font-size:10.5px;font-weight:700;color:var(--text-link);background:var(--accent-light);
      border-radius:999px;padding:3px 10px;white-space:nowrap}

    /* ── TABLE ── */
    .data-table-wrap{overflow-x:auto}
    .data-table{width:100%;border-collapse:collapse;font-size:13px}
    .data-table thead tr{background:#f8f9fc;border-bottom:1.5px solid var(--border)}
    .data-table th{padding:10px 14px;font-size:9.5px;font-weight:700;text-transform:uppercase;
      letter-spacing:.08em;color:var(--text-muted);text-align:left;white-space:nowrap}
    .data-table tbody tr{border-bottom:1px solid #f0f2f8;transition:background .1s}
    .data-table tbody tr:hover{background:#f6f8fd}
    .data-table td{padding:10px 14px;color:var(--text-secondary);line-height:1.4;vertical-align:middle}

    /* Accordion */
    .acc-group-hdr{width:100%;display:flex;align-items:center;gap:10px;padding:11px 14px;
      background:#f4f6fa;border-bottom:1px solid var(--border);border-top:1px solid var(--border);
      font-size:12.5px;font-weight:700;color:var(--text-primary);cursor:pointer;
      transition:background .12s;text-align:left;border-left:none;border-right:none}
    .acc-group-hdr:hover{background:#ebeef7}
    .acc-chevron{width:20px;height:20px;border-radius:5px;background:var(--card-border);
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
      transition:transform .2s,background .15s}
    .acc-chevron svg{width:12px;height:12px;stroke:var(--text-secondary);fill:none;stroke-width:2.5}
    .acc-group-hdr[aria-expanded="true"] .acc-chevron{transform:rotate(180deg);background:var(--accent-light)}
    .acc-group-hdr[aria-expanded="true"] .acc-chevron svg{stroke:var(--accent)}
    .acc-group-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .acc-count{font-size:10.5px;font-weight:700;color:var(--text-muted);background:#e4e8f4;
      border-radius:999px;padding:2px 8px;flex-shrink:0}
    .acc-body{display:none}
    .acc-body.open{display:table-row-group}

    .pic-chip{display:inline-flex;align-items:center;gap:6px}
    .pic-avatar{width:24px;height:24px;border-radius:7px;background:var(--accent-light);color:var(--accent);
      font-size:9.5px;font-weight:800;display:flex;align-items:center;justify-content:center;
      flex-shrink:0;border:1.5px solid #dde3ef}

    /* ── CHARTS COLUMN ── */
    .charts-col{display:flex;flex-direction:column;gap:14px}
    .chart-card{background:var(--card);border:1.5px solid var(--card-border);border-radius:var(--r-lg);
      box-shadow:var(--card-shadow);padding:16px 16px 14px}
    .chart-card-header{display:flex;align-items:center;gap:7px;margin-bottom:2px}
    .chart-card-header svg{width:14px;height:14px;stroke:var(--text-muted);fill:none;stroke-width:2;flex-shrink:0}
    .chart-card-title{font-size:12.5px;font-weight:800;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.05em;}
    .chart-card-sub{font-size:10.5px;color:var(--text-muted);margin-bottom:12px;margin-top:1px}
    .chart-canvas-wrap{position:relative;height:180px}

    /* ── SKELETON LOADERS ── */
    .skeleton{background:linear-gradient(90deg,#eef0f8 25%,#e0e4f0 50%,#eef0f8 75%);
      background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:6px}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    .kpi-skeleton{height:86px;border-radius:var(--r-lg)}
    .table-row-skeleton{height:44px;margin-bottom:2px;border-radius:4px}

    @media(max-width:1100px){.bento-mid{grid-template-columns:1fr}.charts-col{flex-direction:row}.chart-card{flex:1}}
    @media(max-width:700px){:root{--sb-width:0px}#sidebar{display:none}.kpi-grid{grid-template-columns:1fr 1fr}}
  </style>
</head>
<body>

<!-- APP SHELL -->
<div id="appShell">
  <aside id="sidebar">
    <div class="sb-logo-area">
      <div class="sb-logo-img-wrap">
        <img src="./public/PSA_Logo.png" alt="PSA Logo" width="68" height="68" onerror="this.style.display='none'">
      </div>
      <div class="sb-brand-text">
        <div class="sb-brand-name">PSA Monitoring Dashboard</div>
        <div class="sb-brand-sub">Antique Provincial Office</div>
      </div>
    </div>
    <div class="sb-profile">
      <div class="sb-avatar" id="sbAvatar">AD</div>
      <div>
        <div class="sb-profile-name" id="sbName">Admin User</div>
        <div class="sb-profile-role">Dashboard Administrator</div>
      </div>
    </div>
    <div class="sb-section-label">Operation Sheets</div>
    <nav id="sidebarNav"></nav>
    <div class="sb-footer">
      <button class="sb-logout-btn" id="logoutBtn">
        <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sign Out
      </button>
    </div>
  </aside>

  <div id="mainArea">
    <header id="topHeader">
      <div class="header-left">
        <div class="header-view-title" id="headerTitle">Dashboard Overview</div>
        <div class="header-view-sub" id="headerSub">All operation sheets</div>
      </div>
      <div class="search-wrap">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="globalSearch" placeholder="Search reports, months...">
      </div>
      <div id="syncIndicator">
        <span class="sync-dot loading" id="syncDot"></span>
        <span id="syncText">Connecting...</span>
      </div>
    </header>
    <div id="contentScroll">
      <div id="panesContainer"></div>
    </div>
  </div>
</div>
<script src="app.js"><\/script>
</body>
</html>`;

// ─── APP.JS ────────────────────────────────────────────────────────────────────
const JS = `/**
 * PSA Monitoring Dashboard — Dashboard Brain
 */
"use strict";

const API_URL = "https://script.google.com/macros/s/AKfycbwmkxxkowDHENrqNJWNasKLbEX3vBRPZsCqS0dAsidg2HG-UYDo_IUAagBUeqW96HhC/exec";

const MONTH_ORDER = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const State = { allData: [], activeSheet: null, activeSearch: "", openGroups: new Set(), chartInstances: {} };

function esc(str) { return str == null ? "" : String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function fmtDate(v) { if (!v || String(v).trim()==="" || v==="---") return "---"; const s = String(v).trim(); if (/^\\d{1,2}\\/\\d{1,2}\\/\\d{4}$/.test(s)){ const [m,d,y]=s.split("/"); return \`\${m.padStart(2,"0")}/\${d.padStart(2,"0")}/\${y}\`; } const d=new Date(s); if(isNaN(d.getTime())) return s; return \`\${String(d.getMonth()+1).padStart(2,"0")}/\${String(d.getDate()).padStart(2,"0")}/\${d.getFullYear()}\`; }
function resolveSubmittedDate(r) { return r.Date_Submitted || r.DateSubmitted || r["Date Submitted"] || r.Submitted || ""; }
function fuzzyMatch(q, t) { if (!q) return true; const query=q.toLowerCase(), target=(t||"").toLowerCase(); let qi=0; for(let i=0; i<target.length && qi<query.length; i++) if(target[i]===query[qi]) qi++; return qi===query.length; }
function rowSearchText(r) { return \`\${r.ReportName||""} \${r.Month||""} \${r.Department||""} \${r.PersonInCharge||""} \${r.MetricType||""}\`; }
function initials(n) { return (!n || n.trim()==="" || n.trim()==="N/A") ? "AD" : n.trim().split(/\\s+/).map(w=>w[0]).join("").toUpperCase().slice(0,2); }

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
  return \`<span class="badge badge-\${cls}">\${esc(labels[cls])}</span>\`;
}

function metricTagHtml(m) {
  if (!m) return "";
  const mt = m.toLowerCase().trim();
  let cls = "tag-general";
  if (mt.includes("financial") || mt.includes("finance")) cls = "tag-financial";
  else if (mt.includes("narrative")) cls = "tag-narrative";
  else if (mt.includes("data") || mt.includes("statistic")) cls = "tag-data";
  return \`<span class="tag \${cls}">\${esc(m)}</span>\`;
}

const Icons = {
  dashGrid: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>\`,
  folder: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>\`,
  fileText: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>\`,
  checkCircle: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>\`,
  clock: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>\`,
  alertCircle: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>\`,
  chevDown: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>\`,
  searchX: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="8" x2="14" y2="14"/><line x1="14" y1="8" x2="8" y2="14"/></svg>\`,
  wifiOff: \`<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>\`,
  chartPie: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>\`,
  barChart: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>\`,
};

function computeProgress(rows) {
  const total = rows.length;
  const ahead = rows.filter(r => statusClass(r.Status) === "ahead").length;
  const pending = rows.filter(r => statusClass(r.Status) === "pending").length;
  const late = rows.filter(r => statusClass(r.Status) === "late").length;
  const overdue = rows.filter(r => statusClass(r.Status) === "overdue").length;
  const completionPct = total > 0 ? Math.round((ahead / total) * 100) : 0;
  return { total, ahead, pending, late, overdue, completionPct };
}

function renderProgressBarHtml(b) {
  // PURE COMPLETION BAR: No red or yellow mixed in. It only fills with green.
  return \`
    <div style="display:flex; align-items:center; gap:16px; flex:1; justify-content:flex-end;">
      <div style="display:flex; flex-direction:column; gap:6px; width: 100%; max-width: 180px;">
        <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700; color:var(--text-secondary);">
          <span>Completion</span>
          <span style="color:var(--text-primary); font-size:12.5px;">\${b.completionPct}%</span>
        </div>
        <div class="neon-progress-track">
          <div class="neon-fill neon-ahead" style="width:\${b.completionPct}%; box-shadow:\${b.completionPct > 0 ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none'};"></div>
        </div>
      </div>
      <div style="display:flex; gap:6px; min-width: 140px; justify-content:flex-end;">
        \${b.pending > 0 ? \`<span class="warn-chip warn-pend" title="Pending Tasks">\${b.pending} Pend</span>\` : ''}
        \${b.late > 0 ? \`<span class="warn-chip warn-late" title="Late Tasks">\${b.late} Late</span>\` : ''}
        \${b.overdue > 0 ? \`<span class="warn-chip warn-over" title="Overdue Tasks">\${b.overdue} Over</span>\` : ''}
      </div>
    </div>
  \`;
}

async function loadData() {
  setSyncState("loading", "Loading data...");
  renderSkeletons();
  try {
    const res = await fetch(API_URL + "?action=getData");
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    State.allData = json.data || [];
    buildNav();
    renderActivePane();
    setSyncState("online", \`\${State.allData.length} records · Live\`);
  } catch (err) {
    setSyncState("error", "Connection failed");
    document.getElementById("panesContainer").innerHTML = \`<div class="empty-state">\${Icons.wifiOff}<div class="empty-state-title">Could not load data</div><div class="empty-state-sub">\${esc(err.message)}</div></div>\`;
  }
}

function setSyncState(state, text) {
  document.getElementById("syncDot").className = "sync-dot " + state;
  document.getElementById("syncText").textContent = text;
}

function buildNav() {
  const nav = document.getElementById("sidebarNav");
  const sheets = [...new Set(State.allData.map(r => r.Department || r.Sheet || "").filter(Boolean))].sort();
  let html = \`<button class="nav-item active" data-sheet="null"><span class="nav-item-icon">\${Icons.dashGrid}</span><span class="nav-item-label">All Activities</span><span class="nav-item-count">\${State.allData.length}</span></button>\`;
  for (const sheet of sheets) {
    const cnt = State.allData.filter(r => (r.Department || r.Sheet || "") === sheet).length;
    html += \`<button class="nav-item" data-sheet="\${esc(sheet)}"><span class="nav-item-icon">\${Icons.folder}</span><span class="nav-item-label">\${esc(sheet)}</span><span class="nav-item-count">\${cnt}</span></button>\`;
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

  container.innerHTML = \`
    \${kpiHtml}
    <div class="bento-mid">
      <div class="data-card">
        <div class="data-card-header">
          <div>
            <div class="data-card-title">Submission Records</div>
            <div class="data-card-sub">Tracking matrix for \${State.activeSheet || 'all'} operation reports.</div>
          </div>
          <span class="record-badge">\${data.length} records</span>
        </div>
        \${tableHtml}
      </div>
      <div class="charts-col">
        <div class="chart-card">
          <div class="chart-card-header">\${Icons.chartPie}<span class="chart-card-title">Overall Progress</span></div>
          <div class="chart-card-sub">Completion tracking for current view</div>
          <div id="completionWidget" style="margin-top:10px;"></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-header">\${Icons.barChart}<span class="chart-card-title">Monthly Trend</span></div>
          <div class="chart-card-sub">Workload distribution</div>
          <div class="chart-canvas-wrap"><canvas id="chartTrend"></canvas></div>
        </div>
      </div>
    </div>\`;

  wireAccordion();
  initCharts(data);
}

function buildKpiHtml(rows) {
  const { total, ahead, pending: pend, late, overdue, completionPct } = computeProgress(rows);
  return \`
    <div class="kpi-grid">
      <div class="kpi-card kpi-total"><div class="kpi-icon-wrap">\${Icons.fileText}</div><div><div class="kpi-label">Total Reports</div><div class="kpi-value">\${total}</div><div class="kpi-sub">Overall tracking</div></div></div>
      <div class="kpi-card kpi-ahead"><div class="kpi-icon-wrap">\${Icons.checkCircle}</div><div><div class="kpi-label">Completed</div><div class="kpi-value">\${ahead} <span style="font-size:14px;opacity:0.8">(\${completionPct}%)</span></div><div class="kpi-sub">Ahead or on time</div></div></div>
      <div class="kpi-card kpi-pending"><div class="kpi-icon-wrap">\${Icons.clock}</div><div><div class="kpi-label">Pending</div><div class="kpi-value">\${pend}</div><div class="kpi-sub">Awaiting submission</div></div></div>
      <div class="kpi-card kpi-late"><div class="kpi-icon-wrap">\${Icons.alertCircle}</div><div><div class="kpi-label">Late</div><div class="kpi-value">\${late}</div><div class="kpi-sub">Past deadline</div></div></div>
      <div class="kpi-card kpi-overdue"><div class="kpi-icon-wrap">\${Icons.alertCircle}</div><div><div class="kpi-label">Overdue</div><div class="kpi-value">\${overdue}</div><div class="kpi-sub">No submission</div></div></div>
    </div>\`;
}

function buildTableHtml(rows) {
  if (rows.length === 0) return \`<div class="empty-state">\${Icons.searchX}<div class="empty-state-title">No records found</div></div>\`;
  
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

  let html = \`<div class="data-table-wrap"><table class="data-table">
    <thead><tr><th>Report Title</th><th>Month</th><th>Metric/Task</th><th>In-Charge</th><th>Date Submitted</th><th>Deadline</th><th>Status</th></tr></thead>\`;

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
      
      html += \`<tr><td colspan="7" style="padding:16px 24px; background: linear-gradient(90deg, \${fBg} 0%, rgba(255,255,255,0) 100%); border-bottom:1px solid rgba(0,0,0,0.05); border-left:6px solid \${fColor};">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:24px;">
          <div style="font-weight:900; color:var(--text-primary); font-size:15px; min-width: 200px; text-transform: uppercase; letter-spacing: 0.05em;">\${esc(freqName)}</div>
          \${renderProgressBarHtml(fProg)}
        </div>
      </td></tr>\`;
    }

    const itemsToRender = hasCats ? freqData.cats : { [freqName]: freqData.rows };
    
    for (const [catName, catRows] of Object.entries(itemsToRender)) {
      const gName = hasCats ? \`\${freqName} ➔ \${catName}\` : catName;
      const gId = "grp-" + btoa(encodeURIComponent(gName)).replace(/=/g, "");
      const isOpen = State.openGroups.has(gName);
      const cProg = computeProgress(catRows);
      
      html += \`<tr><td colspan="7" style="padding:0">
        <button class="acc-group-hdr" data-group="\${esc(gName)}" aria-expanded="\${isOpen}" aria-controls="\${gId}">
          <span class="acc-chevron">\${Icons.chevDown}</span>
          <span class="acc-group-name" style="flex: 0 0 200px; text-align:left;">\${esc(catName)}</span>
          \${renderProgressBarHtml(cProg)}
        </button></td></tr><tbody class="acc-body\${isOpen ? " open" : ""}" id="\${gId}">\`;

      catRows.forEach(row => {
        const sub = resolveSubmittedDate(row); const dead = row.Deadline || row.DeadlineDate || "";
        html += \`<tr>
          <td style="font-size:11.5px;color:#6b7280;max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">\${esc(gName)}</td>
          <td><div style="font-weight:600;color:#374151">\${esc(row.Month||"—")}</div></td>
          <td>\${metricTagHtml(row.MetricType)}</td>
          <td>\${row.PersonInCharge ? \`<span class="pic-chip"><span class="pic-avatar">\${initials(row.PersonInCharge)}</span><span>\${esc(row.PersonInCharge)}</span></span>\` : '—'}</td>
          <td>\${sub ? \`<span style="font-weight:600">\${fmtDate(sub)}</span>\` : '---'}</td>
          <td>\${dead ? \`<span style="color:#6b7280">\${fmtDate(dead)}</span>\` : '---'}</td>
          <td>\${badgeHtml(row.Status)}</td>
        </tr>\`;
      });
      html += \`</tbody>\`;
    }
  }
  return html + \`</table></div>\`;
}

function wireAccordion() {
  document.querySelectorAll(".acc-group-hdr").forEach(btn => {
    btn.addEventListener("click", () => {
      const grp = btn.dataset.group; const body = document.getElementById(btn.getAttribute("aria-controls")); const isOpen = btn.getAttribute("aria-expanded") === "true";
      if (isOpen) { State.openGroups.delete(grp); btn.setAttribute("aria-expanded", "false"); body.classList.remove("open"); }
      else { State.openGroups.add(grp); btn.setAttribute("aria-expanded", "true"); body.classList.add("open"); }
    });
  });
}

function initCharts(rows) {
  const { ahead, pending: pend, late, overdue, completionPct: compPct } = computeProgress(rows);
  const widget = document.getElementById("completionWidget");
  if (widget) {
    widget.innerHTML = \`
      <div style="display:flex; align-items:baseline; gap:8px; margin-top:8px;">
        <div style="font-size:36px; font-weight:900; color:var(--text-primary); letter-spacing:-1px; line-height:1;">\${compPct}%</div>
        <div style="font-size:13px; color:var(--text-muted); font-weight:700;">Completed</div>
      </div>
      <div class="neon-progress-track" style="margin: 20px 0 16px;">
        <div class="neon-fill neon-ahead" style="width:\${compPct}%; box-shadow:\${compPct > 0 ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none'};"></div>
      </div>
      <div style="display:flex; gap:6px;">
        \${pend > 0 ? \`<span class="warn-chip warn-pend">\${pend} Pending</span>\` : ''}
        \${late > 0 ? \`<span class="warn-chip warn-late">\${late} Late</span>\` : ''}
        \${overdue > 0 ? \`<span class="warn-chip warn-over">\${overdue} Overdue</span>\` : ''}
      </div>
    \`;
  }

  const canvasTrend = document.getElementById("chartTrend");
  if (canvasTrend) {
    const monthMap = {};
    rows.forEach(r => { if (r.Month) monthMap[r.Month] = (monthMap[r.Month]||0) + 1; });
    const sorted = Object.keys(monthMap).sort((a,b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b));
    State.chartInstances.trend = new Chart(canvasTrend, {
      type: "line",
      data: { labels: sorted.length ? sorted.map(m => m.slice(0,3)) : ["-"], datasets: [{ data: sorted.map(m => monthMap[m]), borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.1)", fill: true, tension: 0.4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }
}

function renderSkeletons() {
  document.getElementById("panesContainer").innerHTML = \`<div class="kpi-grid">\${Array(5).fill('<div class="skeleton kpi-skeleton"></div>').join("")}</div>
    <div style="background:#fff;border-radius:16px;padding:16px">\${Array(8).fill('<div class="skeleton table-row-skeleton"></div>').join("")}</div>\`;
}

document.addEventListener("DOMContentLoaded", () => {
  // Immediately show the app shell (login is completely removed)
  document.getElementById("appShell").classList.add("visible");
  
  // Initialize the search bar
  document.getElementById("globalSearch").addEventListener("input", e => { 
    State.activeSearch = e.target.value.trim(); 
    renderActivePane(); 
  });
  
  // Fetch data instantly
  loadData();
});
`;

// Write both files
fs.writeFileSync(path.join(DIR, "index.html"), HTML, "utf8");
fs.writeFileSync(path.join(DIR, "app.js"),     JS,   "utf8");

console.log("index.html →", fs.statSync(path.join(DIR, "index.html")).size, "bytes");
console.log("app.js     →", fs.statSync(path.join(DIR, "app.js")).size, "bytes");
console.log("Done.");