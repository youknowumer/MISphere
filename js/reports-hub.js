/* ==========================================================================
   DashView — Reports hub
   --------------------------------------------------------------------------
   The Reports screen: a defined report library, an animated export tray, a
   drag-and-drop import drawer that profiles a file before you use it, a
   custom report builder and an activity history.

   • Every report states what it is (source, contents, scope, refresh, access)
     — the "Definition" panel on each card — and whether its data is ready.
   • Exports run through one job pipeline (Collect → Build → Deliver). The
     progress shown is tied to the real runner: a job only turns green when a
     file was actually produced, and fails with a reason when it was not.
   • Import reads CSV / TSV / XLSX / XLS / JSON locally in the browser (nothing
     is uploaded), profiles every column (type, completeness, uniqueness,
     range), flags quality problems and can hand the file to Data Studio or turn
     it straight into a PDF / Excel / CSV report.
   • Activity is stored in this browser only (localStorage), never sent anywhere.

   Report runners live in js/dashboard-pro.js (window.DVReportRunners).
   ========================================================================== */
(function () {
  'use strict';

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(function () {
    var root = document.getElementById('view-reports');
    if (!root) return;

    /* ── helpers ───────────────────────────────────────────────────────────── */
    var RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
    var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
    var toast = function (m) { if (window.showToast) window.showToast(m); };
    var can = function (perm) { return window.DVAuth && window.DVAuth.can ? window.DVAuth.can(perm) : true; };
    var wait = function (ms) { return new Promise(function (r) { setTimeout(r, RM ? 0 : ms); }); };
    var nextFrame = function (fn) { requestAnimationFrame(function () { requestAnimationFrame(fn); }); };
    function fmtNum(n) { return (Number(n) || 0).toLocaleString(); }
    function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'report'; }
    function today() { return new Date().toISOString().slice(0, 10); }
    function bytes(n) { if (n < 1024) return n + ' B'; if (n < 1048576) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB'; return (n / 1048576).toFixed(1) + ' MB'; }
    function ago(ts) {
      var s = Math.max(0, (Date.now() - ts) / 1000);
      if (s < 45) return 'just now';
      if (s < 3600) return Math.round(s / 60) + ' min ago';
      if (s < 86400) return Math.round(s / 3600) + ' h ago';
      if (s < 86400 * 7) return Math.round(s / 86400) + ' d ago';
      return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    function loadJSON(key, fb) { try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fb : v; } catch (e) { return fb; } }
    function saveJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
    function connected() { return !!(window.DVOdoo && window.DVOdoo.isConnected && window.DVOdoo.isConnected()); }
    function countUp(el, to, ms) {
      if (!el) return;
      to = Number(to) || 0;
      if (RM || to < 2) { el.textContent = fmtNum(to); return; }
      var t0 = null; ms = ms || 700;
      function step(t) {
        if (t0 == null) t0 = t;
        var p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmtNum(Math.round(to * e));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    var ICON = {
      download: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 20h16"/></svg>',
      upload: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m0 0 4 4m-4-4L8 7M4 20h16"/></svg>',
      plus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
      star: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
      chevron: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
      close: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
      check: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path class="rp-draw" d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
      cross: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path class="rp-draw" d="M6 6l12 12M18 6 6 18"/></svg>',
      file: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
      studio: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
      warn: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20zM12 10v4m0 3v.01"/></svg>',
      empty: '<svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="8" width="38" height="48" rx="5"/><path d="M18 20h22M18 28h22M18 36h12"/><circle cx="46" cy="44" r="10" fill="var(--paper)"/><path d="M46 39v5l3 2"/></svg>'
    };

    ICON.save = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/></svg>';
    ICON.trash = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
    ICON.edit = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/></svg>';

    /* ── report definitions ────────────────────────────────────────────────────
       Each report states exactly what it is, so nobody has to guess what a
       file will contain. `needs` is the data it reads from; `ready` is checked
       live. */
    var REPORTS = [
      { id: 'sales-overview', title: 'Sales Overview Report', cat: 'Sales', fmt: 'CSV', action: 'csv', src: 'overview', needs: 'odoo', needsLabel: 'Odoo connected',
        desc: 'Revenue, orders and recent activity from your connected Odoo.',
        def: { source: 'Odoo — Overview snapshot', includes: ['Company & currency', 'Period KPIs', 'Monthly revenue & orders', 'Recent orders'], scope: 'Selected company and period (30D / 90D / 1Y)', refresh: 'Live — read at the moment you generate', access: 'Admin, Manager' } },
      { id: 'monthly-sales', title: 'Monthly Sales Summary', cat: 'Sales', fmt: 'PDF', action: 'pdf-overview', needs: 'odoo', needsLabel: 'Odoo connected',
        desc: 'Board-ready PDF with KPIs, charts, an AI-written narrative and a dashboard snapshot.',
        def: { source: 'Odoo — Overview + AI insights', includes: ['Cover & report contents', 'KPI tiles', 'Charts', 'AI insights (or rule-based fallback)', 'Dashboard snapshot', 'Order table'], scope: 'Selected company and period', refresh: 'Live — AI narrative written when you generate', access: 'Admin, Manager' } },
      { id: 'orders-workbook', title: 'Recent Orders Workbook', cat: 'Sales', fmt: 'XLSX', action: 'xlsx', needs: 'orders', needsLabel: 'Orders loaded from Odoo',
        desc: 'The latest confirmed sales orders as an Excel file.',
        def: { source: 'Odoo — Recent sales orders', includes: ['Order', 'Customer', 'Status', 'Revenue', 'Date'], scope: 'Latest orders shown on Overview', refresh: 'Live — read at the moment you generate', access: 'Admin, Manager (hidden from Sales Rep)' } },
      { id: 'people-directory', title: 'People Directory Report', cat: 'People', fmt: 'CSV', action: 'csv', src: 'people', needs: 'people', needsLabel: 'People added or synced',
        desc: 'Headcount, department, contract type and the hiring pipeline.',
        def: { source: 'People workspace', includes: ['Name & contact', 'Role & department', 'Status & contract', 'Start date', 'Open tasks', 'Hiring pipeline'], scope: 'Everyone in the directory, plus candidates', refresh: 'Live — read at the moment you generate', access: 'Everyone with export permission' } },
      { id: 'task-completion', title: 'Task Completion Report', cat: 'Tasks', fmt: 'CSV', action: 'csv', src: 'tasks', needs: 'tasks', needsLabel: 'At least one task',
        desc: 'Every assigned task with owner, priority, status, due date and target progress.',
        def: { source: 'Task assignments', includes: ['Task & owner', 'Priority & status', 'Due date & overdue flag', 'Odoo target & progress', 'Notes & timestamps'], scope: 'Tasks matching the filters currently set on Task assignments', refresh: 'Live — read at the moment you generate', access: 'Everyone with export permission' } },
      { id: 'current-screen', title: 'Current Screen as PDF', cat: 'Other', fmt: 'PDF', action: 'pdf', needs: 'none', needsLabel: 'Always available',
        desc: 'Prints whichever tab is open — Finance, Marketing or any board — to PDF.',
        def: { source: 'The tab currently on screen', includes: ['Exactly what is visible', 'Print-optimised layout'], scope: 'Open the tab you want first, then generate', refresh: 'Snapshot of the screen', access: 'Everyone' } }
    ];
    var CATS = ['All', 'Sales', 'People', 'Tasks', 'Other', 'Saved'];
    var FMT_COLOR = { PDF: '#e5654f', XLSX: '#4fb477', CSV: '#5b8fae', JSON: '#c89b4a' };

    /* Analytics reports: built here from the live Overview / People / Task data, with KPIs, a chart and a data table, in
       PDF, Excel or CSV. The older reports above keep their single format and their runners in js/dashboard-pro.js. */
    var A_FMTS = ['PDF', 'XLSX', 'CSV'];
    REPORTS.forEach(function (r) { r.formats = [r.fmt]; });
    REPORTS.push(
      { id: 'revenue-trend', title: 'Revenue Trend Analysis', cat: 'Sales', fmt: 'PDF', formats: A_FMTS, action: 'analytics', build: 'trend', needsLabel: 'Monthly revenue loaded from Odoo',
        desc: 'Month-by-month revenue, orders and average order value, with growth against the prior month.',
        def: { source: 'Odoo — Overview trend', includes: ['Revenue & orders per month', 'Average order value', 'Change vs prior month', 'Best month', 'Revenue chart'], scope: 'The months shown on Overview for the selected company', refresh: 'Live — read at the moment you generate', access: 'Admin, Manager' } },
      { id: 'category-mix', title: 'Revenue by Category', cat: 'Sales', fmt: 'PDF', formats: A_FMTS, action: 'analytics', build: 'category', needsLabel: 'Category revenue loaded from Odoo',
        desc: 'Which product categories earn the revenue, with share and cumulative share to show concentration.',
        def: { source: 'Odoo — Overview categories', includes: ['Revenue per category', 'Share of revenue', 'Cumulative share', 'Top-3 concentration', 'Category chart'], scope: 'The selected company and period on Overview', refresh: 'Live — read at the moment you generate', access: 'Admin, Manager' } },
      { id: 'top-customers', title: 'Top Customers Report', cat: 'Sales', fmt: 'PDF', formats: A_FMTS, action: 'analytics', build: 'customers', needsLabel: 'Top customers loaded from Odoo',
        desc: 'Your biggest customers by revenue and how much of the total each one carries.',
        def: { source: 'Odoo — Overview top customers', includes: ['Rank & customer', 'Revenue', 'Share of listed revenue', 'Dependence on the #1 customer', 'Customer chart'], scope: 'Top customers for the selected company and period', refresh: 'Live — read at the moment you generate', access: 'Admin, Manager' } },
      { id: 'workforce-summary', title: 'Workforce by Department', cat: 'People', fmt: 'PDF', formats: A_FMTS, action: 'analytics', build: 'workforce', needsLabel: 'People added or synced',
        desc: 'Headcount, people on leave and open workload for every department.',
        def: { source: 'People workspace', includes: ['Headcount per department', 'On leave', 'Open tasks & tasks per person', 'Share of headcount', 'Headcount chart'], scope: 'Everyone in the directory', refresh: 'Live — read at the moment you generate', access: 'Everyone with export permission' } },
      { id: 'hiring-funnel', title: 'Hiring Funnel Report', cat: 'People', fmt: 'PDF', formats: A_FMTS, action: 'analytics', build: 'hiring', needsLabel: 'At least one candidate',
        desc: 'Candidates at every stage, step-to-step conversion and which sources bring people in.',
        def: { source: 'People workspace — hiring pipeline', includes: ['Candidates per stage', 'Step conversion', 'Hired and rejected rates', 'Source × stage table', 'Funnel chart'], scope: 'Every candidate in the pipeline', refresh: 'Live — read at the moment you generate', access: 'Everyone with export permission' } },
      { id: 'task-performance', title: 'Task Performance by Assignee', cat: 'Tasks', fmt: 'PDF', formats: A_FMTS, action: 'analytics', build: 'taskPerf', needsLabel: 'At least one task',
        desc: 'Completion rate, overdue work and high-priority load for each person.',
        def: { source: 'Task assignments', includes: ['Tasks, done, in progress, to do', 'Overdue & high-priority open', 'Completion rate', 'Workload chart'], scope: 'All tasks, grouped by assignee (Odoo assignees included)', refresh: 'Live — read at the moment you generate', access: 'Everyone with export permission' } },
      { id: 'overdue-tasks', title: 'Overdue Tasks Register', cat: 'Tasks', fmt: 'PDF', formats: A_FMTS, action: 'analytics', build: 'overdue', needsLabel: 'At least one overdue task',
        desc: 'Every task past its due date, oldest first, with owner, priority and days overdue.',
        def: { source: 'Task assignments', includes: ['Task & owner', 'Priority & status', 'Due date', 'Days overdue', 'Overdue-by-owner chart'], scope: 'Open tasks whose due date has passed', refresh: 'Live — read at the moment you generate', access: 'Everyone with export permission' } }
    );
    REPORTS.sort(function (a, b) { return CATS.indexOf(a.cat) - CATS.indexOf(b.cat); }); /* stable: keeps the order inside each category */

    function isReady(r) {
      try {
        if (r.tpl) return r.ready();
        if (r.build) return !!(ANALYTICS[r.build] && ANALYTICS[r.build].ready());
      } catch (e) { return false; }
      if (r.needs === 'none') return true;
      if (r.needs === 'odoo') return connected();
      var R = window.DVReportRunners && window.DVReportRunners.ready;
      if (R && R[r.needs]) { try { return !!R[r.needs](); } catch (e) { return false; } }
      return true;
    }

    /* ── activity history ──────────────────────────────────────────────────────── */
    var HKEY = 'dv_report_history_v1', FKEY = 'dv_report_favs_v1', TKEY = 'dv_report_templates_v1', PKEY = 'dv_report_fmt_v1';
    var history = loadJSON(HKEY, []); if (!Array.isArray(history)) history = [];
    var favs = loadJSON(FKEY, []); if (!Array.isArray(favs)) favs = [];
    var templates = loadJSON(TKEY, []); if (!Array.isArray(templates)) templates = [];
    templates = templates.filter(function (t) { return t && t.id && t.name && t.src && Array.isArray(t.cols); });
    var picks = loadJSON(PKEY, {}); if (!picks || typeof picks !== 'object' || Array.isArray(picks)) picks = {};
    function addHistory(h) {
      h.id = 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      h.at = Date.now();
      history.unshift(h);
      if (history.length > 60) history.length = 60;
      saveJSON(HKEY, history);
      renderStats(); renderActivity(true); renderGrid(false);
      if ((h.kind === 'import' || h.kind === 'builder') && window.WS && window.WS.log) { try { window.WS.log(h.kind === 'import' ? 'imported' : 'exported', h.title, (h.status === 'ok' ? '' : 'Failed — ') + (h.note || h.fmt || '')); } catch (e) {} }
    }
    function lastRun(id) { for (var i = 0; i < history.length; i++) if (history[i].reportId === id && history[i].status === 'ok') return history[i]; return null; }
    function runCount(id) { return history.filter(function (h) { return h.reportId === id && h.status === 'ok'; }).length; }

    /* ── shell markup ────────────────────────────────────────────────────────── */
    root.innerHTML =
      '<div class="rp-head">'
      + '<div class="rp-head-text"><p class="rp-eyebrow reports-eyebrow">Business reporting</p><h1>Reports</h1>'
      + '<p>Defined, repeatable exports from your workspace — plus import any file to profile it and turn it into a report.</p></div>'
      + '<div class="rp-head-actions">'
      + '<button class="btn btn-outline btn-sm rp-btn" id="rpImportBtn" type="button" data-require-perm="importExport">' + ICON.upload + '<span>Import data</span></button>'
      + '<button class="btn btn-signal btn-sm rp-btn" id="newReportBtn" type="button">' + ICON.plus + '<span>New report</span></button>'
      + '</div></div>'
      + '<div class="reports-context rp-context" aria-label="Report generation guidance"><span class="reports-context-mark" aria-hidden="true">i</span><p><strong>Prepared for decisions.</strong> Every generated report records its date, company and filters, and each report below defines its source, contents and scope. Imported files are read in this browser only.</p></div>'
      + '<div class="rp-stats" id="rpStats" aria-label="Reporting summary"></div>'
      + '<div class="rp-tabs" role="tablist" id="rpTabs" aria-label="Reports sections"><button role="tab" id="rpTabLibrary" aria-controls="rpLibrary" tabindex="0" class="rp-tab active" data-tab="library" aria-selected="true">Library</button><button role="tab" id="rpTabActivity" aria-controls="rpActivity" tabindex="-1" class="rp-tab" data-tab="activity" aria-selected="false">Activity <span class="rp-tab-count" id="rpActCount"></span></button><i class="rp-tab-ink" aria-hidden="true"></i></div>'
      + '<div class="rp-pane active" id="rpLibrary" role="tabpanel" aria-labelledby="rpTabLibrary">'
      + '<div class="rp-toolbar"><label class="rp-search"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="rpSearch" type="search" placeholder="Search reports" autocomplete="off" aria-label="Search reports"/></label>'
      + '<div class="rp-chips" id="rpCats" role="group" aria-label="Category"></div>'
      + '<div class="rp-seg" id="rpFmt" role="group" aria-label="Format"><button data-fmt="" class="active">All</button><button data-fmt="PDF">PDF</button><button data-fmt="XLSX">XLSX</button><button data-fmt="CSV">CSV</button></div></div>'
      + '<div class="reports-grid rp-grid" id="reportsGrid"></div></div>'
      + '<div class="rp-pane" id="rpActivity" role="tabpanel" aria-labelledby="rpTabActivity" hidden><div class="rp-insights" id="rpInsights"></div><div class="rp-toolbar"><div class="rp-seg" id="rpActFilter" role="group" aria-label="Activity type"><button data-k="" class="active">All</button><button data-k="export">Exports</button><button data-k="import">Imports</button></div><span class="rp-spacer"></span>'
      + '<button class="btn btn-outline btn-sm rp-btn" id="rpActExport" type="button">' + ICON.download + '<span>Export log (CSV)</span></button><button class="btn btn-ghost btn-sm rp-btn" id="rpActClear" type="button">Clear</button></div>'
      + '<div class="rp-activity" id="rpActList"></div></div>'
      + '<div class="rp-dropveil" id="rpVeil" aria-hidden="true"><div class="rp-veil-card"><div class="rp-veil-ico">' + ICON.upload + '</div><strong>Drop to import</strong><span>CSV · TSV · XLSX · XLS · JSON — read locally, never uploaded</span></div></div>';

    /* tray, import drawer and builder live at body level so they float above every tab */
    var tray = document.createElement('div');
    tray.className = 'rp-tray'; tray.id = 'rpTray'; tray.hidden = true;
    tray.setAttribute('role', 'region'); tray.setAttribute('aria-label', 'Report exports');
    tray.innerHTML = '<div class="rp-tray-head"><span class="rp-tray-title" id="rpTrayTitle">Exports</span><button class="rp-iconbtn" id="rpTrayMin" type="button" aria-label="Collapse">' + ICON.chevron + '</button><button class="rp-iconbtn" id="rpTrayClear" type="button" aria-label="Dismiss finished">' + ICON.close + '</button></div><div class="rp-tray-body" id="rpTrayBody" aria-live="polite"></div>';
    document.body.appendChild(tray);

    var drawer = document.createElement('div');
    drawer.className = 'rp-drawer-wrap'; drawer.id = 'rpDrawer'; drawer.hidden = true;
    drawer.innerHTML = '<div class="rp-scrim" data-close></div><aside class="rp-drawer" role="dialog" aria-modal="true" aria-labelledby="rpDrawerTitle"><header class="rp-drawer-head"><div><p class="rp-eyebrow">Import</p><h2 id="rpDrawerTitle">Import &amp; profile data</h2></div><button class="rp-iconbtn" data-close type="button" aria-label="Close">' + ICON.close + '</button></header><div class="rp-drawer-body" id="rpDrawerBody"></div></aside>';
    document.body.appendChild(drawer);

    var builder = document.createElement('div');
    builder.className = 'modal-overlay rp-builder'; builder.id = 'rpBuilder';
    builder.innerHTML = '<div class="modal-card modal-card-wide rp-builder-card" role="dialog" aria-modal="true" aria-labelledby="rpBuilderTitle"><button class="modal-close" id="rpBuilderClose" type="button" aria-label="Close">' + ICON.close + '</button><p class="rp-eyebrow">Custom report</p><h3 id="rpBuilderTitle">Build a report</h3><div id="rpBuilderBody"></div></div>';
    document.body.appendChild(builder);

    /* ── stats strip ─────────────────────────────────────────────────────────── */
    var statsEl = $('#rpStats'), statsDrawn = false;
    function renderStats() {
      var readyN = REPORTS.filter(isReady).length;
      var okAll = history.filter(function (h) { return h.status === 'ok'; }).length, rate = history.length ? Math.round(okAll / history.length * 100) : 0;
      var exp = history.filter(function (h) { return h.kind !== 'import' && h.status === 'ok'; }).length;
      var imp = history.filter(function (h) { return h.kind === 'import' && h.status === 'ok'; }).length;
      var vals = [
        { k: 'Reports in library', v: REPORTS.length + templates.length, s: templates.length ? templates.length + ' saved by you' : 'Defined and repeatable' },
        { k: 'Ready to run now', v: readyN, s: readyN === REPORTS.length ? 'All data sources available' : (REPORTS.length - readyN) + ' waiting for data', tone: readyN === REPORTS.length ? 'good' : 'warn' },
        { k: 'Files generated', v: exp, s: exp ? 'Last ' + ago((history.filter(function (h) { return h.kind !== 'import' && h.status === 'ok'; })[0] || {}).at || Date.now()) + ' · ' + rate + '% success' : 'None yet' },
        { k: 'Files imported', v: imp, s: imp ? 'Last ' + ago((history.filter(function (h) { return h.kind === 'import' && h.status === 'ok'; })[0] || {}).at || Date.now()) : 'None yet' }
      ];
      statsEl.innerHTML = vals.map(function (x, i) {
        return '<div class="rp-stat' + (x.tone ? ' is-' + x.tone : '') + '" style="--i:' + i + '"><span class="rp-stat-k">' + esc(x.k) + '</span><b class="rp-stat-v" data-to="' + x.v + '">' + (statsDrawn ? fmtNum(x.v) : '0') + '</b><span class="rp-stat-s">' + esc(x.s) + '</span></div>';
      }).join('');
      if (!statsDrawn) { $$('.rp-stat-v', statsEl).forEach(function (el) { countUp(el, el.getAttribute('data-to')); }); statsDrawn = true; }
    }

    /* ── library: filters + cards ──────────────────────────────────────────────── */
    var F = { q: '', cat: 'All', fmt: '' };
    function savedAsReport(t) {
      var loader = SRC_LOADERS[t.src], ready = function () { try { return t.src === 'imported' ? !!imported : !!(loader && loader().rows.length); } catch (e) { return false; } };
      var defs = {}; try { loader().columns.forEach(function (c) { defs[c.key] = c.label; }); } catch (e) {}
      var p = t.plan || {}, parts = [];
      if (p.group) parts.push('grouped by ' + (defs[p.group] || p.group));
      if ((p.filters || []).length) parts.push(p.filters.length + ' filter' + (p.filters.length === 1 ? '' : 's'));
      if (p.sort && p.sort.col && !p.group) parts.push('sorted by ' + (defs[p.sort.col] || p.sort.col));
      if (p.limit) parts.push('top ' + p.limit);
      return { id: 'tpl-' + t.id, tpl: t, title: t.name, cat: 'Saved', fmt: t.fmt, formats: [t.fmt], ready: ready,
        needsLabel: t.src === 'imported' ? 'The imported file (import it again)' : (t.srcLabel || 'Source data'),
        desc: 'Your custom report from ' + (t.srcLabel || 'your data') + (parts.length ? ' — ' + parts.join(', ') : '') + '.',
        def: { source: t.srcLabel || t.src, includes: p.group ? ['Grouped summary'] : t.cols.map(function (k) { return defs[k] || k; }).slice(0, 10), scope: parts.length ? parts.join(', ') : 'All rows, chosen columns', refresh: 'Live — read at the moment you generate', access: 'Everyone with export permission' } };
    }
    function allReports() { return REPORTS.concat(templates.map(savedAsReport)); }
    function pickOf(r) { var f = picks[r.id]; return r.formats.indexOf(f) > -1 ? f : r.fmt; }
    function renderCats() {
      var all = allReports();
      if (F.cat !== 'All' && !all.some(function (r) { return r.cat === F.cat; })) F.cat = 'All';
      $('#rpCats').innerHTML = CATS.map(function (c) {
        var n = c === 'All' ? all.length : all.filter(function (r) { return r.cat === c; }).length;
        return n ? '<button type="button" data-cat="' + c + '" class="rp-chip' + (F.cat === c ? ' active' : '') + '" aria-pressed="' + (F.cat === c) + '">' + c + '<em>' + n + '</em></button>' : '';
      }).join('');
    }
    function visibleReports() {
      var q = F.q.toLowerCase();
      return allReports().filter(function (r) {
        if (F.cat !== 'All' && r.cat !== F.cat) return false;
        if (F.fmt && r.formats.indexOf(F.fmt) === -1) return false;
        return !q || (r.title + ' ' + r.desc + ' ' + r.cat + ' ' + r.formats.join(' ') + ' ' + r.def.includes.join(' ')).toLowerCase().indexOf(q) > -1;
      }).sort(function (a, b) { return (favs.indexOf(b.id) > -1) - (favs.indexOf(a.id) > -1); });
    }
    function cardHtml(r, i) {
      var ok = isReady(r), fmt = pickOf(r), last = lastRun(r.id), n = runCount(r.id), fav = favs.indexOf(r.id) > -1, col = FMT_COLOR[fmt] || FMT_COLOR.CSV;
      var ext = fmt === 'PDF' && r.action === 'pdf' ? 'pdf (print)' : fmt.toLowerCase();
      return '<article class="report-card rp-card' + (ok ? '' : ' is-waiting') + '" data-id="' + esc(r.id) + '" style="--i:' + i + ';--fmt:' + col + '">'
        + '<span class="rp-card-bar"><i></i></span>'
        + '<div class="rp-card-top"><div class="report-card-icon rp-fmt" aria-hidden="true">' + fmt + '</div>'
        + '<div class="rp-card-tags"><span class="rp-tag">' + esc(r.cat) + '</span><span class="rp-state ' + (ok ? 'ok' : 'wait') + '"><i></i>' + (ok ? 'Ready' : 'Needs data') + '</span></div>'
        + '<button class="rp-star' + (fav ? ' on' : '') + '" type="button" data-fav="' + esc(r.id) + '" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Unpin ' : 'Pin ') + esc(r.title) + '">' + ICON.star + '</button></div>'
        + '<h3 class="report-card-title">' + esc(r.title) + '</h3>'
        + '<p class="report-card-desc">' + esc(r.desc) + '</p>'
        + (ok ? '' : '<p class="rp-need">' + ICON.warn + '<span>Needs: ' + esc(r.needsLabel) + '</span></p>')
        + '<button class="rp-def-toggle" type="button" data-def="' + esc(r.id) + '" aria-expanded="false">Definition ' + ICON.chevron + '</button>'
        + '<div class="rp-def"><div class="rp-def-inner"><dl>'
        + '<dt>Source</dt><dd>' + esc(r.def.source) + '</dd>'
        + '<dt>Includes</dt><dd class="rp-incl">' + r.def.includes.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</dd>'
        + '<dt>Scope</dt><dd>' + esc(r.def.scope) + '</dd>'
        + '<dt>Freshness</dt><dd>' + esc(r.def.refresh) + '</dd>'
        + '<dt>Access</dt><dd>' + esc(r.def.access) + '</dd>'
        + '<dt>File name</dt><dd class="mono">dashview-' + slugify(r.title) + '-' + today() + '.' + ext + '</dd>'
        + '</dl></div></div>'
        + '<div class="report-card-meta rp-meta"><span>' + (last ? 'Last generated ' + ago(last.at) : 'Never generated') + '</span>' + (n ? '<span>' + n + ' run' + (n === 1 ? '' : 's') + '</span>' : '') + '</div>'
        + '<div class="report-card-actions rp-card-actions">'
        + (r.formats.length > 1 ? '<div class="rp-fmtpick" role="group" aria-label="Output format">' + r.formats.map(function (f) { return '<button type="button" data-pick="' + esc(r.id) + '|' + f + '" class="' + (f === fmt ? 'active' : '') + '" aria-pressed="' + (f === fmt) + '">' + f + '</button>'; }).join('') + '</div>' : '')
        + '<button class="btn btn-outline btn-sm rp-run" type="button" data-run="' + (r.action || 'custom') + '" data-rid="' + esc(r.id) + '">' + ICON.download + '<span>Generate</span></button>'
        + (r.tpl ? '<button class="rp-iconbtn" type="button" data-tpl-edit="' + esc(r.tpl.id) + '" aria-label="Edit ' + esc(r.title) + '" title="Edit in builder">' + ICON.edit + '</button><button class="rp-iconbtn rp-danger" type="button" data-tpl-del="' + esc(r.tpl.id) + '" aria-label="Delete ' + esc(r.title) + '" title="Delete saved report">' + ICON.trash + '</button>' : '')
        + '</div>'
        + '</article>';
    }
    function renderGrid(animate) {
      var grid = $('#reportsGrid'), list = visibleReports();
      grid.classList.toggle('rp-noanim', animate === false);
      if (!list.length) {
        grid.innerHTML = '<div class="rp-empty">' + ICON.empty + '<strong>No reports match</strong><span>Try another category or clear the search.</span><button class="btn btn-outline btn-sm" type="button" id="rpResetFilters">Reset filters</button></div>';
        return;
      }
      var open = $$('.rp-card.open', grid).map(function (c) { return c.getAttribute('data-id'); });
      var running = $$('.rp-card.is-running', grid).map(function (c) { return c.getAttribute('data-id'); });
      grid.innerHTML = list.map(cardHtml).join('');
      open.forEach(function (id) { var c = $('.rp-card[data-id="' + id + '"]', grid); if (c) { c.classList.add('open'); $('.rp-def-toggle', c).setAttribute('aria-expanded', 'true'); } });
      running.forEach(function (id) { markCard(id, true); });
    }
    function markCard(id, on) {
      var c = $('.rp-card[data-id="' + id + '"]'); if (!c) return;
      c.classList.toggle('is-running', on);
      var b = $('.rp-run', c); if (b) b.disabled = on;
      var s = b && $('span', b); if (s) s.textContent = on ? 'Generating…' : 'Generate';
    }

    /* ── export tray + job pipeline ────────────────────────────────────────────── */
    var jobs = {}, jobSeq = 0;
    var STEP_TEXT = { csv: ['Collecting data', 'Writing CSV', 'Delivering file'], xlsx: ['Collecting data', 'Building workbook', 'Delivering file'], pdf: ['Collecting data', 'Composing PDF', 'Delivering file'] };
    function trayCounts() {
      var run = 0; Object.keys(jobs).forEach(function (k) { if (jobs[k].state === 'running') run++; });
      $('#rpTrayTitle').textContent = run ? 'Exporting · ' + run + ' running' : 'Exports';
      tray.hidden = !Object.keys(jobs).length;
    }
    function addJob(o) {
      var id = 'j' + (++jobSeq), kind = String(o.fmt || 'csv').toLowerCase();
      var steps = STEP_TEXT[kind] || STEP_TEXT.csv;
      var el = document.createElement('div');
      el.className = 'rp-job'; el.setAttribute('data-state', 'running'); el.style.setProperty('--fmt', FMT_COLOR[o.fmt] || FMT_COLOR.CSV);
      el.innerHTML = '<div class="rp-job-ico">' + esc(o.fmt) + '</div><div class="rp-job-main"><div class="rp-job-title">' + esc(o.title) + '</div><div class="rp-job-sub" id="' + id + 's">' + steps[0] + '…</div><div class="rp-bar"><i id="' + id + 'b"></i></div>'
        + '<ol class="rp-steps">' + steps.map(function (s, i) { return '<li class="' + (i === 0 ? 'active' : '') + '"><b></b><span>' + s.split(' ')[0] + '</span></li>'; }).join('') + '</ol></div>'
        + '<div class="rp-job-state"><span class="rp-spin" aria-hidden="true"></span></div>';
      $('#rpTrayBody').insertBefore(el, $('#rpTrayBody').firstChild);
      tray.classList.remove('min');
      var job = { id: id, el: el, steps: steps, state: 'running', sub: $('#' + id + 's', el), bar: $('#' + id + 'b', el), dots: $$('.rp-steps li', el) };
      jobs[id] = job; trayCounts();
      return job;
    }
    function setStep(job, i) {
      job.dots.forEach(function (d, k) { d.classList.toggle('done', k < i); d.classList.toggle('active', k === i); });
      job.sub.textContent = job.steps[i] + '…';
    }
    function setBar(job, pct, ms, ease) {
      job.bar.style.transition = RM ? 'none' : 'width ' + (ms || 400) + 'ms ' + (ease || 'cubic-bezier(.2,.7,.2,1)');
      job.bar.style.width = pct + '%';
    }
    function finishJob(job, ok, msg) {
      job.state = ok ? 'done' : 'failed';
      job.el.setAttribute('data-state', job.state);
      job.dots.forEach(function (d) { d.classList.remove('active'); d.classList.toggle('done', ok); });
      setBar(job, 100, 300);
      job.sub.textContent = msg;
      $('.rp-job-state', job.el).innerHTML = ok ? ICON.check : ICON.cross;
      trayCounts();
      if (ok) setTimeout(function () { dismiss(job); }, 9000);
    }
    function dismiss(job) {
      if (!job || !jobs[job.id] || job.state === 'running') return;
      if (job.el.matches(':hover')) { setTimeout(function () { dismiss(job); }, 3000); return; }
      job.el.classList.add('leaving');
      setTimeout(function () { if (job.el.parentNode) job.el.parentNode.removeChild(job.el); delete jobs[job.id]; trayCounts(); }, RM ? 0 : 260);
    }
    $('#rpTrayClear').addEventListener('click', function () { Object.keys(jobs).forEach(function (k) { dismiss(jobs[k]); }); });
    $('#rpTrayMin').addEventListener('click', function () { tray.classList.toggle('min'); $('#rpTrayMin').setAttribute('aria-label', tray.classList.contains('min') ? 'Expand' : 'Collapse'); });

    /* o: { title, fmt, run:()=>true|false|Promise, hint, reportId, kind, rows } */
    function runJob(o) {
      var job = addJob(o), timer = null;
      function log(status, note) {
        try { addHistory({ kind: o.kind || 'export', reportId: o.reportId || '', title: o.title, fmt: o.fmt, rows: o.rows, status: status, note: note }); } catch (e) { /* bookkeeping must never turn a delivered file into a failure */ }
      }
      setBar(job, 6, 200);
      return wait(520).then(function () {
        setStep(job, 1); setBar(job, 34, 380);
        return wait(380);
      }).then(function () {
        setBar(job, 90, 14000, 'cubic-bezier(.08,.55,.2,1)'); /* creeps while the real work runs */
        return Promise.race([
          Promise.resolve().then(o.run),
          new Promise(function (_, rej) { timer = setTimeout(function () { rej(new Error('This is taking too long — try again.')); }, 120000); })
        ]);
      }).then(function (res) {
        clearTimeout(timer);
        if (res === false) throw new Error(o.hint || 'Nothing was exported.');
        setStep(job, 2); setBar(job, 97, 260);
        return wait(420);
      }).then(function () {
        finishJob(job, true, 'Downloaded · ' + new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }));
        log('ok', o.note);
        return true;
      }, function (err) {
        clearTimeout(timer);
        var m = (err && err.message) || 'Could not generate the report.';
        finishJob(job, false, m);
        log('failed', m);
        return false;
      });
    }

    function runReport(r) {
      var fmt = pickOf(r);
      markCard(r.id, true);
      var o = { title: r.title, fmt: fmt, reportId: r.id, kind: 'export', hint: isReady(r) ? 'The report could not be produced.' : 'Needs ' + String(r.needsLabel || 'data').toLowerCase() + '.' };
      if (r.build) { o.run = function () { return analyticsRun(r, fmt, o); }; }
      else if (r.tpl) { o.kind = 'builder'; o.run = function () { return templateRun(r.tpl, o); }; }
      else {
        var runner = window.DVReportRunners && window.DVReportRunners[r.action];
        if (!runner) { markCard(r.id, false); toast('This report is not available in this build.'); return; }
        var slug = 'dashview-' + slugify(r.title) + '-' + today();
        o.run = function () { return runner(r.src, slug, r.title); };
      }
      runJob(o).then(function () { markCard(r.id, false); renderStats(); });
    }

    /* ── report sources (builder + import) ──────────────────────────────────── */
    var imported = null; /* { name, size, columns:[{key,type,...}], rows, file, at } — held in memory for this session */
    function peopleSource() {
      var HR = window.DVHR;
      if (HR && HR.live && HR.live() && HR.employees) {
        var emps = HR.employees();
        return { columns: [['name', 'Name'], ['job', 'Job'], ['dept', 'Department'], ['manager', 'Manager'], ['email', 'Email'], ['open', 'Open tasks', 'number'], ['overdue', 'Overdue tasks', 'number'], ['leave', 'On time off']].map(function (c) { return { key: c[0], label: c[1], type: c[2] || 'text' }; }),
          rows: emps.map(function (e) { var o = {}; Object.keys(e).forEach(function (k) { o[k] = e[k]; }); o.leave = e.leave ? 'Yes' : 'No'; return o; }) };
      }
      var WS = window.WS; if (!WS) return { columns: [], rows: [] };
      return { columns: [['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], ['role', 'Role'], ['dept', 'Department'], ['statusL', 'Status'], ['type', 'Contract'], ['start', 'Start date'], ['open', 'Open tasks', 'number']].map(function (c) { return { key: c[0], label: c[1], type: c[2] || 'text' }; }),
        rows: WS.people().map(function (e) { var o = {}; Object.keys(e).forEach(function (k) { o[k] = e[k]; }); o.statusL = WS.L.personStatus[e.status] || e.status; o.open = WS.openTasksFor(e.id).length; return o; }) };
    }
    function tasksSource() {
      var WS = window.WS; if (!WS) return { columns: [], rows: [] };
      var byId = {}; WS.people().forEach(function (p) { byId[p.id] = p.name; });
      return { columns: [['title', 'Task'], ['who', 'Assigned to'], ['pri', 'Priority'], ['st', 'Status'], ['due', 'Due date'], ['late', 'Overdue'], ['notes', 'Notes']].map(function (c) { return { key: c[0], label: c[1], type: 'text' }; }),
        rows: WS.tasks().map(function (t) { return { title: t.title, who: byId[t.assigneeId] || 'Unassigned', pri: WS.L.priority[t.priority] || t.priority, st: WS.L.status[t.status] || t.status, due: t.due || '', late: WS.isOverdue(t) ? 'Yes' : 'No', notes: t.notes || '' }; }) };
    }
    function ordersSource() {
      var o = (window.DASHVIEW_OV && window.DASHVIEW_OV.ORDERS) || [];
      return { columns: [['id', 'Order'], ['customer', 'Customer'], ['state', 'Status'], ['revenue', 'Revenue', 'number'], ['date', 'Date']].map(function (c) { return { key: c[0], label: c[1], type: c[2] || 'text' }; }), rows: o };
    }
    function importedType(c) {
      if (/^(number|currency|percent)$/.test(c.type)) return 'number';
      if (c.type === 'date' && imported) {
        /* only treat the column as dates when every value really parses — otherwise Excel would get blanks */
        imported.dateOk = imported.dateOk || {};
        if (imported.dateOk[c.key] === undefined) {
          var ok = true, rows = imported.rows, lim = Math.min(rows.length, 2000);
          for (var i = 0; i < lim; i++) { var v = rows[i][c.key]; if (v !== '' && v != null && isNaN(Date.parse(v))) { ok = false; break; } }
          imported.dateOk[c.key] = ok;
        }
        return imported.dateOk[c.key] ? 'date' : 'text';
      }
      return 'text';
    }
    function importedSource() {
      if (!imported) return { columns: [], rows: [] };
      return { columns: imported.columns.map(function (c) { return { key: c.key, label: c.key, type: importedType(c) }; }), rows: imported.rows };
    }
    var SRC_LOADERS = { orders: ordersSource, people: peopleSource, tasks: tasksSource, imported: importedSource };
    var SRC_LABELS = { orders: 'Sales orders', people: 'People', tasks: 'Tasks', imported: 'Imported file' };
    function sources() {
      return [
        { id: 'orders', label: 'Sales orders', hint: 'From Odoo overview', load: ordersSource },
        { id: 'people', label: 'People', hint: 'Directory & status', load: peopleSource },
        { id: 'tasks', label: 'Tasks', hint: 'Assignments', load: tasksSource },
        { id: 'imported', label: 'Imported file', hint: imported ? imported.name : 'Import one first', load: importedSource, disabled: !imported }
      ].map(function (s) { s.count = s.disabled ? 0 : s.load().rows.length; return s; });
    }
    function toNum(v) {
      if (typeof v === 'number') return isFinite(v) ? v : null;
      if (v == null || v === '') return null;
      if (window.Studio && Studio.toNumber) { var n = Studio.toNumber(v); return n == null || isNaN(n) ? null : n; }
      var x = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isNaN(x) ? null : x;
    }

    /* ── report plan: filter → group → sort → limit ───────────────────────────────
       One pure function so the builder preview, the file and a saved report always agree
       (also exposed as DVReportsHub.plan for tests). Rows are never mutated. */
    var OPS = [['contains', 'contains'], ['eq', 'is'], ['ne', 'is not'], ['gt', '>'], ['gte', '≥'], ['lt', '<'], ['lte', '≤'], ['empty', 'is empty'], ['notempty', 'is not empty']];
    var OP_TEXT = { contains: 'contains', eq: '=', ne: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=', empty: 'is empty', notempty: 'is not empty' };
    var AGGS = [['count', 'Count of rows'], ['sum', 'Sum of'], ['avg', 'Average of'], ['min', 'Lowest of'], ['max', 'Highest of']];
    var AGG_WORD = { sum: 'Sum of', avg: 'Average of', min: 'Lowest of', max: 'Highest of' };
    var LIMITS = [0, 10, 25, 50, 100, 500];
    function isBlank(v) { return v === '' || v == null; }
    function kindOf(def) { var t = def && def.type; return t === 'number' || t === 'percent' ? 'number' : t === 'date' ? 'date' : 'text'; }
    function cmpBy(kind, a, b) {
      if (kind === 'number') { var x = toNum(a), y = toNum(b); if (x != null && y != null) return x - y; }
      else if (kind === 'date') { var dx = Date.parse(a), dy = Date.parse(b); if (!isNaN(dx) && !isNaN(dy)) return dx - dy; }
      return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
    }
    function condMatches(row, c, def) {
      var v = row[c.col], blank = isBlank(v);
      if (c.op === 'empty') return blank;
      if (c.op === 'notempty') return !blank;
      if (isBlank(c.val)) return true;                       /* an unfinished condition filters nothing */
      if (blank) return c.op === 'ne';
      var kind = kindOf(def), val = String(c.val).trim();
      if (c.op === 'contains') return String(v).toLowerCase().indexOf(val.toLowerCase()) > -1;
      if (c.op === 'eq' || c.op === 'ne') {
        var same;
        if (kind === 'number' && toNum(v) != null && toNum(val) != null) same = toNum(v) === toNum(val);
        else if (kind === 'date' && !isNaN(Date.parse(v)) && !isNaN(Date.parse(val))) same = Date.parse(v) === Date.parse(val);
        else same = String(v).trim().toLowerCase() === val.toLowerCase();
        return c.op === 'eq' ? same : !same;
      }
      var d = cmpBy(kind, v, val);
      return c.op === 'gt' ? d > 0 : c.op === 'gte' ? d >= 0 : c.op === 'lt' ? d < 0 : d <= 0;
    }
    function applyPlan(data, plan, cols) {
      plan = plan || {};
      var defs = {}; data.columns.forEach(function (c) { defs[c.key] = c; });
      var rows = data.rows, notes = [];
      var conds = (plan.filters || []).filter(function (c) { return c && defs[c.col] && (c.op === 'empty' || c.op === 'notempty' || !isBlank(c.val)); });
      if (conds.length) {
        rows = rows.filter(function (r) { return conds.every(function (c) { return condMatches(r, c, defs[c.col]); }); });
        conds.forEach(function (c) { notes.push('Filter: ' + defs[c.col].label + ' ' + OP_TEXT[c.op] + (c.op === 'empty' || c.op === 'notempty' ? '' : ' ' + c.val)); });
      }
      var filteredCount = rows.length, columns, measure = null, g = plan.group && defs[plan.group] ? defs[plan.group] : null;
      if (g) {
        var agg = AGG_WORD[plan.agg] && defs[plan.aggCol] ? plan.agg : 'count', ac = agg === 'count' ? null : defs[plan.aggCol];
        var map = Object.create(null), list = [];
        rows.forEach(function (r) {
          var k = isBlank(r[g.key]) ? '(blank)' : String(r[g.key]), a = map[k];
          if (!a) { a = map[k] = { k: k, n: 0, sum: 0, cnt: 0, min: null, max: null }; list.push(a); }
          a.n++;
          if (ac) { var x = toNum(r[ac.key]); if (x != null) { a.cnt++; a.sum += x; if (a.min == null || x < a.min) a.min = x; if (a.max == null || x > a.max) a.max = x; } }
        });
        var val = function (a) { return agg === 'sum' ? (a.cnt ? a.sum : null) : agg === 'avg' ? (a.cnt ? a.sum / a.cnt : null) : agg === 'min' ? a.min : agg === 'max' ? a.max : null; };
        var totalN = rows.length, totalSum = 0, negative = false;
        list.forEach(function (a) { var v = val(a); if (v != null) { totalSum += v; if (v < 0) negative = true; } });
        var hasShare = agg === 'count' || (agg === 'sum' && totalSum > 0 && !negative);
        var mLabel = ac ? AGG_WORD[agg] + ' ' + ac.label : '';
        columns = [{ key: '__g', label: g.label, type: 'text' }, { key: '__n', label: 'Rows', type: 'number' }];
        if (ac) columns.push({ key: '__m', label: mLabel, type: 'number', noTotal: agg !== 'sum' });
        if (hasShare) columns.push({ key: '__s', label: agg === 'sum' ? 'Share of total' : 'Share of rows', type: 'percent' });
        rows = list.map(function (a) {
          var v = val(a), o = { __g: a.k, __n: a.n };
          if (ac) o.__m = v == null ? null : Math.round(v * 100) / 100;
          if (hasShare) o.__s = agg === 'sum' ? Math.round(v / totalSum * 1000) / 10 : Math.round(a.n / (totalN || 1) * 1000) / 10;
          return o;
        });
        var mk = ac ? '__m' : '__n', asc = plan.sort && plan.sort.dir === 'asc';
        rows.sort(function (a, b) { var x = a[mk], y = b[mk]; if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return asc ? x - y : y - x; });
        measure = { key: mk, label: ac ? mLabel : 'Rows' };
        notes.push('Grouped by ' + g.label + ' · ' + (ac ? mLabel : 'Count of rows') + (asc ? ' (smallest first)' : ' (largest first)'));
      } else {
        columns = data.columns.filter(function (c) { return !cols || cols.indexOf(c.key) > -1; });
        var s = plan.sort && defs[plan.sort.col];
        if (s) {
          var kind = kindOf(s), dir = plan.sort.dir === 'asc' ? 1 : -1;
          rows = rows.slice().sort(function (a, b) {
            var x = a[s.key], y = b[s.key], bx = isBlank(x), by = isBlank(y);
            if (bx || by) return bx && by ? 0 : bx ? 1 : -1;     /* empty cells always last */
            return dir * cmpBy(kind, x, y);
          });
          notes.push('Sorted by ' + s.label + (dir === 1 ? ' (low to high)' : ' (high to low)'));
        }
      }
      var lim = Number(plan.limit) || 0;
      if (lim > 0 && rows.length > lim) { rows = rows.slice(0, lim); notes.push((g ? 'Top ' + lim + ' groups' : 'First ' + lim + ' rows')); }
      return { columns: columns, rows: rows, notes: notes, sourceCount: data.rows.length, filteredCount: filteredCount, grouped: !!g, measure: measure };
    }

    /* ── chart image for PDF / Excel (browser canvas; skipped silently where unavailable) ─── */
    var canvasOK = (function () { try { if (/jsdom/i.test(navigator.userAgent || '')) return false; var c = document.createElement('canvas'); return !!(c.getContext && c.getContext('2d')); } catch (e) { return false; } })();
    function clipTxt(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
    function compactNum(n) {
      var a = Math.abs(n);
      if (a >= 1e9) return (n / 1e9).toFixed(1) + 'B';
      if (a >= 1e6) return (n / 1e6).toFixed(1) + 'M';
      if (a >= 1e4) return (n / 1e3).toFixed(1) + 'K';
      return n.toLocaleString('en-US', { maximumFractionDigits: a < 100 && n % 1 ? 1 : 0 });
    }
    function chartImage(title, items, o) {
      o = o || {};
      items = (items || []).filter(function (it) { return it && isFinite(Number(it.value)); }).slice(0, o.max || 12);
      if (!canvasOK || !items.length) return null;
      try {
        var W = 1000, n = items.length, vertical = !!o.vertical, H = vertical ? 520 : Math.max(320, Math.min(760, 120 + n * 44));
        var c = document.createElement('canvas'); c.width = W; c.height = H;
        var g = c.getContext('2d'); if (!g) return null;
        var INK = '#1c2321', MUT = '#6b7570', GRID = '#e3dccb', ACC = '#e8a33d', FONT = 'Helvetica, Arial, sans-serif';
        var fmtV = function (v) { return o.pct ? v.toFixed(1) + '%' : compactNum(v); };
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
        g.textAlign = 'left'; g.fillStyle = INK; g.font = '700 22px ' + FONT; g.fillText(clipTxt(title, 70), 36, 42);
        if (o.subtitle) { g.fillStyle = MUT; g.font = '400 14px ' + FONT; g.fillText(clipTxt(o.subtitle, 110), 36, 66); }
        var max = Math.max.apply(null, items.map(function (it) { return Math.max(0, Number(it.value)); })) || 1, i;
        if (vertical) {
          var L = 78, R = 30, T = 100, Bm = 74, pw = W - L - R, ph = H - T - Bm, slot = pw / n, bw = Math.min(64, slot * 0.62);
          for (i = 0; i <= 4; i++) {
            var gy = T + ph - ph * i / 4;
            g.strokeStyle = GRID; g.lineWidth = 1; g.beginPath(); g.moveTo(L, gy); g.lineTo(W - R, gy); g.stroke();
            g.fillStyle = MUT; g.font = '12px ' + FONT; g.textAlign = 'right'; g.fillText(fmtV(max * i / 4), L - 10, gy + 4);
          }
          items.forEach(function (it, k) {
            var v = Math.max(0, Number(it.value)), h = ph * v / max, x = L + slot * k + (slot - bw) / 2, y = T + ph - h;
            g.fillStyle = ACC; g.fillRect(x, y, bw, h);
            g.textAlign = 'center'; g.fillStyle = INK; g.font = '600 12px ' + FONT; g.fillText(fmtV(Number(it.value)), x + bw / 2, y - 7);
            g.fillStyle = MUT; g.font = '12px ' + FONT; g.fillText(clipTxt(it.label, 9), x + bw / 2, T + ph + 24);
          });
        } else {
          var LB = 280, RB = 110, top = 96, rowH = (H - top - 24) / n, bh = Math.min(26, rowH * 0.62);
          items.forEach(function (it, k) {
            var v = Math.max(0, Number(it.value)), w = (W - LB - RB) * v / max, y = top + rowH * k + (rowH - bh) / 2;
            g.textAlign = 'left'; g.fillStyle = INK; g.font = '13px ' + FONT; g.fillText(clipTxt(it.label, 34), 36, y + bh / 2 + 4);
            g.fillStyle = GRID; g.fillRect(LB, y, W - LB - RB, bh);
            g.fillStyle = ACC; g.fillRect(LB, y, Math.max(2, w), bh);
            g.fillStyle = INK; g.font = '600 13px ' + FONT; g.fillText(fmtV(Number(it.value)), LB + Math.max(2, w) + 10, y + bh / 2 + 4);
          });
        }
        g.textAlign = 'left';
        return { title: title, subtitle: o.subtitle || '', image: c.toDataURL('image/png'), width: W, height: H };
      } catch (e) { return null; }
    }

    /* Build the file for the chosen source / columns / plan / format and download it. Resolves true. */
    function fieldType(t) { return t === 'number' || t === 'percent' || t === 'date' ? t : 'text'; }
    function fmtCellByType(v, type) {
      if (v == null || v === '') return '';
      if (typeof v === 'number') return type === 'percent' ? v.toFixed(1) + '%' : v.toLocaleString('en-US', { maximumFractionDigits: 2 });
      return String(v);
    }
    function workspaceName() {
      try { var p = JSON.parse(localStorage.getItem('dashview_profile') || '{}'); return String(p.company || p.org || p.workspace || '').trim() || 'DashView workspace'; } catch (e) { return 'DashView workspace'; }
    }
    function csvDownload(slug, table) {
      var lib = window.DVFmt && window.DVFmt.csv ? window.DVFmt : window.WS;
      if (!lib) return Promise.reject(new Error('The CSV writer did not load.'));
      lib.download(slug + '.csv', lib.csv(table));
      return Promise.resolve(true);
    }
    function generateFrom(srcDef, cols, fmt, title, withSummary, plan) {
      var data = srcDef.load(), res = applyPlan(data, plan, cols);
      if (!res.columns.length) return Promise.reject(new Error('Choose at least one column.'));
      if (!data.rows.length) return Promise.reject(new Error('There are no rows to export.'));
      if (!res.rows.length) return Promise.reject(new Error('No rows match the filters — loosen them and try again.'));
      var seen = {}, fields = res.columns.map(function (c) { var n = c.label, k = 2; while (seen[n.toLowerCase()]) n = c.label + ' (' + k++ + ')'; seen[n.toLowerCase()] = 1; return { key: c.key, name: n, type: fieldType(c.type), noTotal: !!c.noTotal }; });
      var rows = res.rows.map(function (r) {
        var o = {};
        fields.forEach(function (f) { var v = r[f.key]; o[f.name] = f.type === 'number' || f.type === 'percent' ? toNum(v) : (v instanceof Date ? v.toISOString().slice(0, 10) : (v == null ? '' : String(v))); });
        return o;
      });
      var slug = 'dashview-' + slugify(title) + '-' + today();
      if (fmt === 'CSV') return csvDownload(slug, [fields.map(function (f) { return f.name; })].concat(rows.map(function (r) { return fields.map(function (f) { return r[f.name] == null ? '' : r[f.name]; }); })));
      var E = window.DVReportEngine; if (!E) return Promise.reject(new Error('The report engine did not load.'));
      var filtered = res.filteredCount !== res.sourceCount, kpis = [];
      if (res.grouped) {
        var top = res.rows[0], mk = res.measure.key;
        kpis.push({ label: 'Groups', value: fmtNum(rows.length) }, { label: 'Source rows summarised', value: fmtNum(res.filteredCount) });
        if (top) kpis.push({ label: 'Top group', value: String(top.__g), hint: res.measure.label + ': ' + fmtCellByType(top[mk], 'number') });
      } else {
        kpis.push({ label: 'Rows', value: fmtNum(rows.length), hint: filtered ? 'of ' + fmtNum(res.sourceCount) + ' in the source' : '' }, { label: 'Columns', value: String(fields.length) });
        fields.filter(function (f) { return f.type === 'number'; }).slice(0, 2).forEach(function (f) {
          var s = 0, any = false; rows.forEach(function (r) { if (r[f.name] != null) { s += r[f.name]; any = true; } });
          if (any) kpis.push({ label: 'Total ' + f.name, value: s.toLocaleString('en-US', { maximumFractionDigits: 2 }) });
        });
      }
      var chart = null;
      if (res.grouped) chart = chartImage('Top groups — ' + res.measure.label, res.rows.slice(0, 10).map(function (r) { return { label: r.__g, value: r[res.measure.key] }; }), { subtitle: res.notes[res.notes.length - 1] });
      var srcName = srcDef.id === 'imported' && imported ? imported.name : srcDef.label;
      var payload = {
        title: title, workbookName: title, sourceFileName: srcName, companyName: workspaceName(), generatedAt: new Date(),
        filteredRows: rows.length, totalRows: res.grouped ? rows.length : Math.max(res.sourceCount, rows.length),
        filtersSummary: ['Source: ' + srcName].concat(res.grouped ? [] : ['Columns: ' + fields.length + ' of ' + data.columns.length]).concat(res.notes).concat(res.grouped ? ['Summarises ' + fmtNum(res.filteredCount) + ' source rows'] : []),
        includeKpis: !!withSummary, kpis: withSummary ? kpis : [], includeCharts: !!chart, charts: chart ? [chart] : [], includePivot: false, includeData: true,
        fields: fields.map(function (f) { return { name: f.name, type: f.type, noTotal: f.noTotal }; }), rows: rows, formatCell: fmtCellByType
      };
      return (fmt === 'PDF' ? E.generatePdfReport(payload) : E.generateExcelReport(payload)).then(function () { return true; });
    }

    /* ── analytics reports: each builder returns a spec { title, source, period, scope, filters, fields, rows, kpis, chart, pivot } ── */
    function ovd() { return window.DASHVIEW_OV || {}; }
    function n0(v) { var n = Number(v); return isFinite(n) ? n : 0; }
    function r2(n) { return Math.round(n * 100) / 100; }
    function shareOf(a, b) { return b ? a / b * 100 : 0; }
    function money(n) { return (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
    function signed(p) { return (p >= 0 ? '+' : '') + p.toFixed(1) + '%'; }
    function flds(list) { return list.map(function (x) { return { name: x[0], type: x[1], noTotal: !!x[2] }; }); }
    function tally(list, keyFn) { var m = Object.create(null), order = []; list.forEach(function (x) { var k = keyFn(x); if (!m[k]) { m[k] = []; order.push(k); } m[k].push(x); }); return order.map(function (k) { return { key: k, items: m[k] }; }); }
    function needWS() { if (!window.WS) throw new Error('The workspace did not load — refresh the page and try again.'); return window.WS; }
    function daysLate(due) { var d = new Date(due + 'T00:00:00'), t = new Date(); t.setHours(0, 0, 0, 0); return isNaN(d.getTime()) ? 0 : Math.max(0, Math.round((t - d) / 864e5)); }

    var ANALYTICS = {
      trend: {
        ready: function () { var o = ovd(); return !!((o.MONTHS || []).length && (o.REVENUE || []).length); },
        build: function () {
          var o = ovd(), m = o.MONTHS || [], rev = o.REVENUE || [], cnt = o.ORDERS_M || [];
          if (!m.length || !rev.length) throw new Error('No monthly revenue yet — connect Odoo and let Overview load first.');
          var rows = m.map(function (label, i) {
            var R = n0(rev[i]), C = n0(cnt[i]), prev = i ? n0(rev[i - 1]) : 0;
            return { 'Month': String(label), 'Revenue': R, 'Orders': C, 'Average order value': C ? r2(R / C) : null, 'Change vs prior month': i && prev > 0 ? r2((R - prev) / prev * 100) : null };
          });
          var tot = 0, ord = 0; rows.forEach(function (r) { tot += r.Revenue; ord += r.Orders; });
          var best = rows.slice().sort(function (a, b) { return b.Revenue - a.Revenue; })[0], last = rows[rows.length - 1], chg = last['Change vs prior month'];
          var kpis = [{ label: 'Revenue · ' + rows.length + ' months', value: money(tot) }, { label: 'Orders', value: money(ord) }, { label: 'Average per month', value: money(tot / rows.length) }, { label: 'Best month', value: best.Month, hint: money(best.Revenue) + ' revenue', tone: 'good' }];
          if (chg != null) kpis.push({ label: 'Latest month vs prior', value: money(last.Revenue), change: signed(chg), hint: last.Month, tone: chg >= 0 ? 'good' : 'warn' });
          return { title: 'Revenue Trend Analysis', source: 'Odoo — Overview trend', period: 'Last ' + rows.length + ' months', scope: 'Amounts are in the company currency selected on Overview', filters: ['Months: ' + rows[0].Month + ' to ' + last.Month],
            fields: flds([['Month', 'text'], ['Revenue', 'number'], ['Orders', 'number'], ['Average order value', 'number', true], ['Change vs prior month', 'percent']]), rows: rows, kpis: kpis,
            chart: { title: 'Monthly revenue', items: rows.map(function (r) { return { label: r.Month, value: r.Revenue }; }), vertical: true, subtitle: rows[0].Month + ' to ' + last.Month } };
        }
      },
      category: {
        ready: function () { var o = ovd(); return !!((o.CATS || []).length && (o.CAT_REV || []).length); },
        build: function () {
          var o = ovd(), L = o.CATS || [], V = o.CAT_REV || [];
          if (!L.length || !V.length) throw new Error('No category revenue yet — connect Odoo and let Overview load first.');
          var items = L.map(function (l, i) { return { l: String(l), v: n0(V[i]) }; }).sort(function (a, b) { return b.v - a.v; });
          var tot = 0; items.forEach(function (it) { tot += it.v; });
          var cum = 0, rows = items.map(function (it) { cum += it.v; return { 'Category': it.l, 'Revenue': it.v, 'Share of revenue': r2(shareOf(it.v, tot)), 'Cumulative share': r2(shareOf(cum, tot)) }; });
          var top3 = rows.slice(0, 3).reduce(function (s, r) { return s + r.Revenue; }, 0), top = rows[0];
          return { title: 'Revenue by Category', source: 'Odoo — Overview categories', period: 'Range selected on Overview', scope: 'Amounts are in the company currency selected on Overview', filters: ['Categories: ' + rows.length],
            fields: flds([['Category', 'text'], ['Revenue', 'number'], ['Share of revenue', 'percent'], ['Cumulative share', 'percent']]), rows: rows,
            kpis: [{ label: 'Categories', value: String(rows.length) }, { label: 'Total revenue', value: money(tot) }, { label: 'Top category', value: top.Category, hint: top['Share of revenue'].toFixed(1) + '% of revenue', tone: top['Share of revenue'] > 50 ? 'warn' : 'good' }, { label: 'Top 3 share', value: shareOf(top3, tot).toFixed(1) + '%', hint: shareOf(top3, tot) > 80 ? 'Revenue is concentrated' : 'Reasonably spread', tone: shareOf(top3, tot) > 80 ? 'warn' : 'info' }],
            chart: { title: 'Revenue by category', items: rows.slice(0, 10).map(function (r) { return { label: r.Category, value: r.Revenue }; }), subtitle: 'Top ' + Math.min(10, rows.length) + ' of ' + rows.length + ' categories' } };
        }
      },
      customers: {
        ready: function () { var o = ovd(); return !!((o.TOP_L || []).length && (o.TOP_V || []).length); },
        build: function () {
          var o = ovd(), L = o.TOP_L || [], V = o.TOP_V || [];
          if (!L.length || !V.length) throw new Error('No customer revenue yet — connect Odoo and let Overview load first.');
          var tot = 0; V.forEach(function (v) { tot += n0(v); });
          var rows = L.map(function (l, i) { return { 'Rank': String(i + 1), 'Customer': String(l), 'Revenue': n0(V[i]), 'Share of listed revenue': r2(shareOf(n0(V[i]), tot)) }; });
          var first = rows[0]['Share of listed revenue'];
          return { title: 'Top Customers Report', source: 'Odoo — Overview top customers', period: 'Range selected on Overview', scope: 'Top ' + rows.length + ' customers; shares are of the customers listed', filters: ['Customers listed: ' + rows.length],
            fields: flds([['Rank', 'text'], ['Customer', 'text'], ['Revenue', 'number'], ['Share of listed revenue', 'percent']]), rows: rows,
            kpis: [{ label: 'Customers listed', value: String(rows.length) }, { label: 'Revenue from these customers', value: money(tot) }, { label: 'Largest customer', value: rows[0].Customer, hint: first.toFixed(1) + ' % of listed revenue', tone: first > 40 ? 'warn' : 'good' }],
            chart: { title: 'Revenue by customer', items: rows.map(function (r) { return { label: r.Customer, value: r.Revenue }; }), subtitle: 'Top ' + rows.length + ' customers' } };
        }
      },
      workforce: {
        ready: function () { try { return peopleSource().rows.length > 0; } catch (e) { return false; } },
        build: function () {
          var src = peopleSource();
          if (!src.rows.length) throw new Error('No people yet — add or sync people first.');
          var groups = tally(src.rows, function (r) { return String(r.dept || '').trim() || 'Unassigned'; });
          var total = src.rows.length, leaveAll = 0, openAll = 0;
          var rows = groups.map(function (g) {
            var leave = 0, open = 0; g.items.forEach(function (r) { if (r.leave === 'Yes' || r.statusL === 'On leave') leave++; open += n0(r.open); });
            leaveAll += leave; openAll += open;
            return { 'Department': g.key, 'Headcount': g.items.length, 'On leave': leave, 'Open tasks': open, 'Open tasks per person': r2(open / g.items.length), 'Share of headcount': r2(shareOf(g.items.length, total)) };
          }).sort(function (a, b) { return b.Headcount - a.Headcount || a.Department.localeCompare(b.Department); });
          var big = rows[0];
          return { title: 'Workforce by Department', source: 'People workspace', period: 'As of ' + today(), scope: 'Everyone in the directory', filters: ['Departments: ' + rows.length],
            fields: flds([['Department', 'text'], ['Headcount', 'number'], ['On leave', 'number'], ['Open tasks', 'number'], ['Open tasks per person', 'number', true], ['Share of headcount', 'percent']]), rows: rows,
            kpis: [{ label: 'Headcount', value: fmtNum(total) }, { label: 'Departments', value: String(rows.length) }, { label: 'Largest department', value: big.Department, hint: big['Share of headcount'].toFixed(1) + '% of headcount' }, { label: 'On leave', value: String(leaveAll), tone: leaveAll ? 'info' : 'good' }, { label: 'Open tasks per person', value: r2(openAll / total).toLocaleString('en-US'), hint: fmtNum(openAll) + ' open in total' }],
            chart: { title: 'Headcount by department', items: rows.slice(0, 12).map(function (r) { return { label: r.Department, value: r.Headcount }; }), subtitle: fmtNum(total) + ' people' } };
        }
      },
      hiring: {
        ready: function () { return !!(window.WS && window.WS.hires().length); },
        build: function () {
          var WS = needWS(), H = WS.hires();
          if (!H.length) throw new Error('No candidates yet — add candidates to the hiring pipeline first.');
          var flow = ['applied', 'screening', 'interview', 'offer', 'hired'], total = H.length, L = WS.L.stage;
          var now = {}; WS.STAGES.forEach(function (s) { now[s] = 0; }); H.forEach(function (h) { now[h.stage] = (now[h.stage] || 0) + 1; });
          var reached = flow.map(function (s, i) { return H.filter(function (h) { return h.stage !== 'rejected' && flow.indexOf(h.stage) >= i; }).length; });
          var rows = WS.STAGES.map(function (s) {
            var i = flow.indexOf(s);
            return { 'Stage': L[s] || s, 'Candidates now': now[s] || 0, 'Share of candidates': r2(shareOf(now[s] || 0, total)), 'Reached this stage or later': i > -1 ? reached[i] : null, 'Step conversion': i > 0 ? (reached[i - 1] ? r2(reached[i] / reached[i - 1] * 100) : null) : null };
          });
          var cols = ['Source'].concat(WS.STAGES.map(function (s) { return L[s] || s; })).concat(['Total']);
          var bySrc = tally(H, function (h) { return String(h.source || '').trim() || 'Unknown'; }).sort(function (a, b) { return b.items.length - a.items.length; });
          var prows = bySrc.map(function (g) { var o = { 'Source': g.key, 'Total': g.items.length }; WS.STAGES.forEach(function (s) { o[L[s] || s] = g.items.filter(function (h) { return h.stage === s; }).length; }); return o; });
          var gt = { 'Source': 'Grand total', 'Total': total }; WS.STAGES.forEach(function (s) { gt[L[s] || s] = now[s] || 0; }); prows.push(gt);
          var inProc = total - (now.hired || 0) - (now.rejected || 0), topSrc = bySrc[0];
          return { title: 'Hiring Funnel Report', source: 'People workspace — hiring pipeline', period: 'As of ' + today(), scope: 'Every candidate in the pipeline', filters: ['Candidates: ' + total],
            fields: flds([['Stage', 'text'], ['Candidates now', 'number'], ['Share of candidates', 'percent'], ['Reached this stage or later', 'number', true], ['Step conversion', 'percent']]), rows: rows, pivot: { columns: cols, rows: prows },
            kpis: [{ label: 'Candidates', value: fmtNum(total) }, { label: 'In process', value: String(inProc) }, { label: 'Hired', value: String(now.hired || 0), hint: shareOf(now.hired || 0, total).toFixed(1) + '% of candidates', tone: 'good' }, { label: 'Rejected', value: String(now.rejected || 0), hint: shareOf(now.rejected || 0, total).toFixed(1) + '% of candidates' }, { label: 'Top source', value: topSrc.key, hint: topSrc.items.length + ' candidate' + (topSrc.items.length === 1 ? '' : 's') }],
            chart: { title: 'Candidates by stage', items: rows.map(function (r) { return { label: r.Stage, value: r['Candidates now'] }; }), subtitle: fmtNum(total) + ' candidates' } };
        }
      },
      taskPerf: {
        ready: function () { return !!(window.WS && window.WS.tasks().length); },
        build: function () {
          var WS = needWS(), T = WS.tasks();
          if (!T.length) throw new Error('No tasks yet — create a task first.');
          var groups = tally(T, function (t) { var a = WS.assigneeOf(t); return a ? a.name : 'Unassigned'; });
          var rows = groups.map(function (g) {
            var done = 0, active = 0, todo = 0, late = 0, hp = 0;
            g.items.forEach(function (t) { if (t.status === 'done') done++; else if (t.status === 'progress' || t.status === 'review') active++; else todo++; if (WS.isOverdue(t)) late++; if (t.status !== 'done' && (t.priority === 'urgent' || t.priority === 'high')) hp++; });
            return { 'Assignee': g.key, 'Tasks': g.items.length, 'Done': done, 'In progress': active, 'To do': todo, 'Overdue': late, 'High priority open': hp, 'Completion': r2(shareOf(done, g.items.length)) };
          }).sort(function (a, b) { return b.Tasks - a.Tasks || a.Assignee.localeCompare(b.Assignee); });
          var tot = T.length, done = 0, late = 0, hp = 0; rows.forEach(function (r) { done += r.Done; late += r.Overdue; hp += r['High priority open']; });
          return { title: 'Task Performance by Assignee', source: 'Task assignments', period: 'As of ' + today(), scope: 'All tasks, grouped by assignee', filters: ['Assignees: ' + rows.length],
            fields: flds([['Assignee', 'text'], ['Tasks', 'number'], ['Done', 'number'], ['In progress', 'number'], ['To do', 'number'], ['Overdue', 'number'], ['High priority open', 'number'], ['Completion', 'percent']]), rows: rows,
            kpis: [{ label: 'Tasks', value: fmtNum(tot) }, { label: 'Completion rate', value: shareOf(done, tot).toFixed(1) + '%', hint: done + ' of ' + tot + ' done', tone: shareOf(done, tot) >= 70 ? 'good' : 'info' }, { label: 'Overdue', value: String(late), tone: late ? 'bad' : 'good' }, { label: 'High priority open', value: String(hp), tone: hp ? 'warn' : 'good' }, { label: 'Assignees', value: String(rows.length) }],
            chart: { title: 'Completion rate by assignee', items: rows.slice(0, 10).map(function (r) { return { label: r.Assignee, value: r.Completion }; }), pct: true, subtitle: 'Share of each person\u2019s tasks that are done' } };
        }
      },
      overdue: {
        ready: function () { var WS = window.WS; return !!(WS && WS.tasks().some(function (t) { return WS.isOverdue(t); })); },
        build: function () {
          var WS = needWS(), late = WS.tasks().filter(function (t) { return WS.isOverdue(t); });
          if (!late.length) throw new Error('No overdue tasks — there is nothing to report.');
          var rows = late.map(function (t) { var a = WS.assigneeOf(t); return { 'Task': t.title, 'Assigned to': a ? a.name : 'Unassigned', 'Priority': WS.L.priority[t.priority] || t.priority, 'Status': WS.L.status[t.status] || t.status, 'Due date': t.due, 'Days overdue': daysLate(t.due) }; })
            .sort(function (a, b) { return b['Days overdue'] - a['Days overdue'] || String(a.Task).localeCompare(String(b.Task)); });
          var sum = 0, urgent = 0; rows.forEach(function (r) { sum += r['Days overdue']; if (r.Priority === 'Urgent' || r.Priority === 'High') urgent++; });
          var owners = tally(rows, function (r) { return r['Assigned to']; }).map(function (g) { return { label: g.key, value: g.items.length }; }).sort(function (a, b) { return b.value - a.value; });
          return { title: 'Overdue Tasks Register', source: 'Task assignments', period: 'As of ' + today(), scope: 'Open tasks whose due date has passed', filters: ['Overdue tasks: ' + rows.length],
            fields: flds([['Task', 'text'], ['Assigned to', 'text'], ['Priority', 'text'], ['Status', 'text'], ['Due date', 'date'], ['Days overdue', 'number', true]]), rows: rows,
            kpis: [{ label: 'Overdue tasks', value: String(rows.length), tone: 'bad' }, { label: 'Average days overdue', value: r2(sum / rows.length).toLocaleString('en-US'), tone: 'warn' }, { label: 'Longest overdue', value: rows[0]['Days overdue'] + ' days', hint: clipTxt(rows[0].Task, 40), tone: 'bad' }, { label: 'Urgent / high priority', value: String(urgent), tone: urgent ? 'bad' : 'good' }, { label: 'People affected', value: String(owners.length) }],
            chart: { title: 'Overdue tasks by owner', items: owners.slice(0, 10), subtitle: rows.length + ' overdue tasks' } };
        }
      }
    };

    function specPayload(spec) {
      var chart = spec.chart ? chartImage(spec.chart.title, spec.chart.items, spec.chart) : null;
      return { title: spec.title, workbookName: spec.title, sourceFileName: spec.source, companyName: workspaceName(), reportingPeriod: spec.period, scope: spec.scope, generatedAt: new Date(),
        filteredRows: spec.rows.length, totalRows: spec.rows.length, filtersSummary: spec.filters || [], includeKpis: !!(spec.kpis && spec.kpis.length), kpis: spec.kpis || [],
        includeCharts: !!chart, charts: chart ? [chart] : [], includePivot: !!spec.pivot, pivot: spec.pivot || null, includeData: true, fields: spec.fields, rows: spec.rows, formatCell: fmtCellByType };
    }
    function analyticsRun(r, fmt, o) {
      var spec; try { spec = ANALYTICS[r.build].build(); } catch (e) { return Promise.reject(e); }   /* the messages are written for people */
      o.rows = spec.rows.length; o.note = spec.source;
      var slug = 'dashview-' + slugify(r.title) + '-' + today();
      if (fmt === 'CSV') return csvDownload(slug, [spec.fields.map(function (f) { return f.name; })].concat(spec.rows.map(function (row) { return spec.fields.map(function (f) { return row[f.name] == null ? '' : row[f.name]; }); })));
      var E = window.DVReportEngine; if (!E) return Promise.reject(new Error('The report engine did not load.'));
      var payload = specPayload(spec);
      return (fmt === 'PDF' ? E.generatePdfReport(payload) : E.generateExcelReport(payload)).then(function () { return true; });
    }

    /* ── saved reports (templates): a builder setup you can run again in one click ─── */
    function templateRun(t, o) {
      var loader = SRC_LOADERS[t.src];
      if (!loader || (t.src === 'imported' && !imported)) return Promise.reject(new Error('This saved report needs ' + (t.src === 'imported' ? 'the imported file — import it again.' : 'its data source.')));
      var srcDef = { id: t.src, label: SRC_LABELS[t.src] || t.src, load: loader };
      o.rows = applyPlan(loader(), t.plan, t.cols).rows.length; o.note = (SRC_LABELS[t.src] || t.src) + ' · saved report';
      return generateFrom(srcDef, t.cols, t.fmt, t.name, t.summary !== false, t.plan);
    }

    /* ── builder modal ───────────────────────────────────────────────────────── */
    function newB() { return { src: '', cols: null, fmt: 'PDF', title: '', summary: true, titleTouched: false, filters: [], sort: { col: '', dir: 'desc' }, limit: 0, group: '', agg: 'count', aggCol: '', tplId: '' }; }
    var B = newB(), builderLast = null, MAX_FILTERS = 4;
    function curSource() { return sources().filter(function (s) { return s.id === B.src; })[0]; }
    function planFromB() { return { filters: B.filters.map(function (f) { return { col: f.col, op: f.op, val: f.val }; }), sort: { col: B.sort.col, dir: B.sort.dir }, limit: B.limit, group: B.group, agg: B.agg, aggCol: B.aggCol }; }
    function builderOpen(tpl) {
      var list = sources();
      builderLast = document.activeElement;
      B = newB();
      if (tpl && tpl.cols) {
        var p = tpl.plan || {};
        B.src = tpl.src; B.cols = tpl.cols.slice(); B.fmt = tpl.fmt; B.title = tpl.name; B.titleTouched = true; B.summary = tpl.summary !== false; B.tplId = tpl.id;
        B.filters = (p.filters || []).map(function (f) { return { col: f.col, op: f.op, val: f.val }; });
        B.sort = { col: (p.sort && p.sort.col) || '', dir: (p.sort && p.sort.dir) || 'desc' }; B.limit = Number(p.limit) || 0; B.group = p.group || ''; B.agg = p.agg || 'count'; B.aggCol = p.aggCol || '';
      } else {
        B.src = (list.filter(function (s) { return !s.disabled && s.count; })[0] || list.filter(function (s) { return !s.disabled; })[0] || list[0]).id;
      }
      renderBuilder();
      builder.classList.add('open');
      setTimeout(function () { var t = $('#rpbTitle'); if (t) t.focus(); }, 60);
    }
    function builderClose() {
      if (!builder.classList.contains('open')) return;
      builder.classList.remove('open');
      if (builderLast && builderLast.focus && document.contains(builderLast)) try { builderLast.focus(); } catch (e) {}
    }
    function colOpts(data, sel, blank, only) {
      return (blank != null ? '<option value="">' + esc(blank) + '</option>' : '') + data.columns.filter(function (c) { return !only || only(c); }).map(function (c) { return '<option value="' + esc(c.key) + '"' + (c.key === sel ? ' selected' : '') + '>' + esc(c.label) + '</option>'; }).join('');
    }
    function focusSel(el) {
      if (!el || el === document.body || !builder.contains(el)) return '';
      if (el.id) return '#' + el.id;
      var names = ['data-col', 'data-f-col', 'data-f-op', 'data-f-val', 'data-f-del', 'data-src', 'data-f', 'data-dir'];
      for (var i = 0; i < names.length; i++) { var v = el.getAttribute && el.getAttribute(names[i]); if (v != null) return '[' + names[i] + '="' + String(v).replace(/"/g, '\\"') + '"]'; }
      return '';
    }
    function previewHtml(cur, data) {
      var ok = cur && !cur.disabled, res = ok ? applyPlan(data, planFromB(), B.cols) : { columns: [], rows: [], notes: [], sourceCount: 0, filteredCount: 0 };
      var blocked = !ok || !data.rows.length || !res.columns.length || !res.rows.length;
      var head = blocked ? (ok && data.rows.length && res.columns.length && !res.rows.length ? 'No rows match the filters' : 'Nothing to preview') : fmtNum(res.rows.length) + ' rows × ' + res.columns.length + ' columns' + (res.grouped ? ' · summarises ' + fmtNum(res.filteredCount) + ' rows' : res.filteredCount !== res.sourceCount ? ' · filtered from ' + fmtNum(res.sourceCount) : '');
      var num = function (c) { return c.type === 'number' || c.type === 'percent' ? ' class="num"' : ''; };
      var fmtv = function (v, c) { return v instanceof Date ? v.toISOString().slice(0, 10) : (c.type === 'percent' && typeof v === 'number' ? v.toFixed(1) + '%' : v); };
      var pdfNote = B.fmt === 'PDF' && res.rows.length > 1500 ? 'The PDF shows the first 1,500 rows — choose Excel or CSV for all ' + fmtNum(res.rows.length) + '.' : '';
      return '<div class="rpb-preview-head"><span>Preview</span><em>' + esc(head) + '</em></div>'
        + (blocked ? '' : '<div class="rpb-scroll"><table><thead><tr>' + res.columns.map(function (c) { return '<th' + num(c) + '>' + esc(c.label) + '</th>'; }).join('') + '</tr></thead><tbody>' + res.rows.slice(0, 5).map(function (r) { return '<tr>' + res.columns.map(function (c) { return '<td' + num(c) + '>' + esc(fmtv(r[c.key], c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>')
        + (res.notes.length && !blocked ? '<ul class="rpb-notes">' + res.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '')
        + (pdfNote ? '<p class="rpb-note">' + ICON.warn + esc(pdfNote) + '</p>' : '')
        + (blocked ? '<span hidden data-blocked></span>' : '');
    }
    function refreshPreview() {
      var cur = curSource(), data = cur && !cur.disabled ? cur.load() : { columns: [], rows: [] }, host = $('#rpbPreview'); if (!host) return;
      host.innerHTML = previewHtml(cur, data);
      var go = $('#rpbGo'); if (go) go.disabled = !!$('[data-blocked]', host);
      var sv = $('#rpbSave'); if (sv) sv.disabled = !!$('[data-blocked]', host);
    }
    function renderBuilder() {
      var keep = focusSel(document.activeElement);
      var list = sources(), cur = list.filter(function (s) { return s.id === B.src; })[0];
      var data = cur && !cur.disabled ? cur.load() : { columns: [], rows: [] };
      var has = function (k) { return data.columns.some(function (c) { return c.key === k; }); };
      if (!B.cols) B.cols = data.columns.map(function (c) { return c.key; });
      B.cols = B.cols.filter(has);
      B.filters = B.filters.filter(function (f) { return has(f.col); });
      if (B.sort.col && !has(B.sort.col)) B.sort.col = '';
      if (B.group && !has(B.group)) B.group = '';
      var numCols = data.columns.filter(function (c) { return c.type === 'number'; });
      if (B.agg !== 'count' && !numCols.some(function (c) { return c.key === B.aggCol; })) B.aggCol = numCols[0] ? numCols[0].key : '';
      if (B.agg !== 'count' && !B.aggCol) B.agg = 'count';
      if (!B.titleTouched) B.title = (cur && cur.id === 'imported' && imported ? imported.name.replace(/\.[^.]+$/, '') : (cur ? cur.label : 'Custom')) + ' report';
      var grouped = !!B.group;
      var filtersHtml = B.filters.map(function (f, i) {
        var noVal = f.op === 'empty' || f.op === 'notempty';
        return '<div class="rpb-frow"><select class="rpb-input" data-f-col="' + i + '" aria-label="Filter column">' + colOpts(data, f.col) + '</select>'
          + '<select class="rpb-input" data-f-op="' + i + '" aria-label="Filter condition">' + OPS.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === f.op ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'
          + '<input class="rpb-input" data-f-val="' + i + '" type="text" value="' + esc(f.val) + '" placeholder="' + (noVal ? 'No value needed' : 'Value') + '"' + (noVal ? ' disabled' : '') + ' aria-label="Filter value" spellcheck="false"/>'
          + '<button type="button" class="rp-iconbtn" data-f-del="' + i + '" aria-label="Remove filter">' + ICON.close + '</button></div>';
      }).join('');
      $('#rpBuilderBody').innerHTML =
        '<div class="rpb-step"><span class="rpb-n">1</span><h4>Choose data</h4></div><div class="rpb-sources">'
        + list.map(function (s) { return '<button type="button" class="rpb-src' + (s.id === B.src ? ' on' : '') + '" data-src="' + s.id + '"' + (s.disabled ? ' disabled' : '') + '><b>' + esc(s.label) + '</b><span>' + esc(s.hint) + '</span><em>' + (s.disabled ? '—' : fmtNum(s.count) + ' row' + (s.count === 1 ? '' : 's')) + '</em></button>'; }).join('') + '</div>'
        + '<div class="rpb-step"><span class="rpb-n">2</span><h4>Pick columns</h4>' + (grouped ? '' : '<button type="button" class="rpb-link" id="rpbAll">' + (B.cols.length === data.columns.length ? 'Clear all' : 'Select all') + '</button>') + '</div>'
        + (grouped ? '<p class="rpb-muted">Columns are replaced by the grouped summary below (group, row count and your measure).</p>'
          : '<div class="rpb-cols">' + (data.columns.length ? data.columns.map(function (c) { return '<label class="rpb-col' + (B.cols.indexOf(c.key) > -1 ? ' on' : '') + '"><input type="checkbox" data-col="' + esc(c.key) + '"' + (B.cols.indexOf(c.key) > -1 ? ' checked' : '') + '/><span>' + esc(c.label) + '</span></label>'; }).join('') : '<p class="rpb-muted">' + (cur && cur.disabled ? 'Import a file first (Import data, top right) to use it here.' : 'No data available for this source yet.') + '</p>') + '</div>')
        + '<div class="rpb-step"><span class="rpb-n">3</span><h4>Refine <em class="rpb-opt">optional</em></h4></div>'
        + '<div class="rpb-refine">'
        + '<div class="rpb-block"><div class="rpb-label">Filter rows <span>all conditions must match</span></div>' + filtersHtml
        + (B.filters.length < MAX_FILTERS && data.columns.length ? '<button type="button" class="rpb-link rpb-add" id="rpbAddF">+ Add filter</button>' : '') + '</div>'
        + '<div class="rpb-block"><div class="rpb-label">Summarise <span>group rows and measure them</span></div><div class="rpb-grid2">'
        + '<select class="rpb-input" id="rpbGroup" aria-label="Group by">' + colOpts(data, B.group, 'Don\u2019t group — list every row') + '</select>'
        + (grouped ? '<select class="rpb-input" id="rpbAgg" aria-label="Measure">' + AGGS.map(function (a) { return '<option value="' + a[0] + '"' + (a[0] === B.agg ? ' selected' : '') + (a[0] !== 'count' && !numCols.length ? ' disabled' : '') + '>' + a[1] + '</option>'; }).join('') + '</select>' : '')
        + (grouped && B.agg !== 'count' ? '<select class="rpb-input rpb-span" id="rpbAggCol" aria-label="Measure column">' + colOpts(data, B.aggCol, null, function (c) { return c.type === 'number'; }) + '</select>' : '') + '</div></div>'
        + '<div class="rpb-block"><div class="rpb-label">Order &amp; size</div><div class="rpb-grid2">'
        + (grouped ? '' : '<select class="rpb-input" id="rpbSortCol" aria-label="Sort by">' + colOpts(data, B.sort.col, 'Keep original order') + '</select>')
        + '<div class="rp-seg rpb-dir" id="rpbDir" role="group" aria-label="Sort direction"><button type="button" data-dir="desc" class="' + (B.sort.dir === 'desc' ? 'active' : '') + '">' + (grouped ? 'Largest first' : 'High → Low') + '</button><button type="button" data-dir="asc" class="' + (B.sort.dir === 'asc' ? 'active' : '') + '">' + (grouped ? 'Smallest first' : 'Low → High') + '</button></div>'
        + '<select class="rpb-input" id="rpbLimit" aria-label="Row limit">' + LIMITS.map(function (n) { return '<option value="' + n + '"' + (n === B.limit ? ' selected' : '') + '>' + (n ? (grouped ? 'Top ' : 'First ') + n + (grouped ? ' groups' : ' rows') : 'All rows') + '</option>'; }).join('') + '</select></div></div>'
        + '</div>'
        + '<div class="rpb-step"><span class="rpb-n">4</span><h4>Format &amp; title</h4></div>'
        + '<div class="rp-seg rpb-fmt" id="rpbFmt">' + ['PDF', 'XLSX', 'CSV'].map(function (f) { return '<button type="button" data-f="' + f + '" class="' + (B.fmt === f ? 'active' : '') + '">' + f + '</button>'; }).join('') + '</div>'
        + '<input class="rpb-title" id="rpbTitle" maxlength="120" spellcheck="false" aria-label="Report title" value="' + esc(B.title) + '"/>'
        + (B.fmt !== 'CSV' ? '<label class="rpb-check"><input type="checkbox" id="rpbSummary"' + (B.summary ? ' checked' : '') + '/> Add a summary page (' + (grouped ? 'groups and top group' : 'row count and totals') + ')</label>' : '')
        + '<div class="rpb-preview" id="rpbPreview">' + previewHtml(cur, data) + '</div>'
        + '<div class="rpb-actions"><button class="btn btn-outline btn-lg rpb-save" id="rpbSave" type="button">' + ICON.save + '<span>' + (B.tplId ? 'Update saved report' : 'Save to library') + '</span></button>'
        + '<button class="btn btn-primary btn-lg rpb-go" id="rpbGo" type="button">' + ICON.download + '<span>Generate ' + B.fmt + ' report</span></button></div>';
      refreshPreview();
      if (keep) { var n = $(keep, builder); if (n && !n.disabled) { try { n.focus(); } catch (e) {} } }
    }
    function saveTemplate() {
      var cur = curSource(); if (!cur || cur.disabled) return;
      var name = (($('#rpbTitle') || {}).value || '').trim() || (cur.label + ' report'), t = { id: B.tplId || 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: name, src: B.src, srcLabel: cur.label, cols: B.cols.slice(), fmt: B.fmt, summary: B.summary, plan: planFromB(), at: Date.now() };
      var i = -1; templates.forEach(function (x, k) { if (x.id === t.id) i = k; });
      if (i > -1) templates[i] = t; else templates.unshift(t);
      if (templates.length > 40) templates.length = 40;
      saveJSON(TKEY, templates);
      builderClose(); renderCats(); renderStats(); renderGrid(false);
      F.cat = 'Saved'; renderCats(); renderGrid(true);
      toast(i > -1 ? 'Saved report updated.' : 'Saved to your library — run it any time from the Saved tab.');
    }
    builder.addEventListener('click', function (e) {
      if (e.target === builder) return builderClose();
      var src = e.target.closest('[data-src]'); if (src && !src.disabled) { B.src = src.getAttribute('data-src'); B.cols = null; B.filters = []; B.sort.col = ''; B.group = ''; B.aggCol = ''; B.agg = 'count'; B.limit = 0; return renderBuilder(); }
      var f = e.target.closest('[data-f]'); if (f) { B.fmt = f.getAttribute('data-f'); return renderBuilder(); }
      var dir = e.target.closest('[data-dir]'); if (dir) { B.sort.dir = dir.getAttribute('data-dir'); return renderBuilder(); }
      var del = e.target.closest('[data-f-del]'); if (del) { B.filters.splice(Number(del.getAttribute('data-f-del')), 1); return renderBuilder(); }
      if (e.target.closest('#rpbAddF')) { var d0 = (curSource() || { load: function () { return { columns: [] }; } }).load(); if (d0.columns.length && B.filters.length < MAX_FILTERS) { B.filters.push({ col: d0.columns[0].key, op: 'contains', val: '' }); renderBuilder(); var last = $('[data-f-val="' + (B.filters.length - 1) + '"]', builder); if (last) last.focus(); } return; }
      if (e.target.closest('#rpbAll')) { var d = (curSource() || { load: function () { return { columns: [] }; } }).load(); B.cols = B.cols.length === d.columns.length ? [] : d.columns.map(function (c) { return c.key; }); return renderBuilder(); }
      if (e.target.closest('#rpbSave')) return saveTemplate();
      if (e.target.closest('#rpbGo')) {
        var cur = curSource(); if (!cur || cur.disabled) return;
        var title = ($('#rpbTitle').value || '').trim() || 'Custom report', fmt = B.fmt, cols = B.cols.slice(), summary = B.summary, plan = planFromB();
        var n = applyPlan(cur.load(), plan, cols).rows.length;
        builderClose();
        runJob({ title: title, fmt: fmt, kind: 'builder', note: cur.label + ' · ' + (plan.group ? 'grouped summary' : cols.length + ' columns'), rows: n, run: function () { return generateFrom(cur, cols, fmt, title, summary, plan); } });
      }
    });
    builder.addEventListener('change', function (e) {
      var t = e.target, c = t.closest && t.closest('[data-col]');
      if (c) { var k = c.getAttribute('data-col'), i = B.cols.indexOf(k); if (c.checked && i < 0) B.cols.push(k); if (!c.checked && i > -1) B.cols.splice(i, 1); return renderBuilder(); }
      if (t.id === 'rpbSummary') { B.summary = t.checked; return; }
      var fc = t.getAttribute && t.getAttribute('data-f-col'); if (fc != null) { B.filters[Number(fc)].col = t.value; return renderBuilder(); }
      var fo = t.getAttribute && t.getAttribute('data-f-op'); if (fo != null) { B.filters[Number(fo)].op = t.value; return renderBuilder(); }
      if (t.getAttribute && t.getAttribute('data-f-val') != null) { B.filters[Number(t.getAttribute('data-f-val'))].val = t.value; return refreshPreview(); }
      if (t.id === 'rpbSortCol') { B.sort.col = t.value; return renderBuilder(); }
      if (t.id === 'rpbLimit') { B.limit = Number(t.value) || 0; return renderBuilder(); }
      if (t.id === 'rpbGroup') { B.group = t.value; if (!B.group) { B.agg = 'count'; } return renderBuilder(); }
      if (t.id === 'rpbAgg') { B.agg = t.value; return renderBuilder(); }
      if (t.id === 'rpbAggCol') { B.aggCol = t.value; return renderBuilder(); }
    });
    var previewTimer = null;
    builder.addEventListener('input', function (e) {
      var t = e.target;
      if (t.id === 'rpbTitle') { B.title = t.value; B.titleTouched = true; return; }
      if (t.getAttribute && t.getAttribute('data-f-val') != null) { B.filters[Number(t.getAttribute('data-f-val'))].val = t.value; clearTimeout(previewTimer); previewTimer = setTimeout(refreshPreview, 180); }
    });
    $('#rpBuilderClose').addEventListener('click', builderClose);

    /* ── import drawer ───────────────────────────────────────────────────────── */
    var ACCEPT = ['csv', 'tsv', 'xlsx', 'xls', 'json'], MAX_BYTES = 40 * 1048576, MAX_ROWS = 200000;
    var IMP = { wb: null, file: null, busy: false, sheet: '' };
    var drawerBody = $('#rpDrawerBody'), lastFocus = null;
    var STAGES = ['Read file', 'Parse', 'Profile columns', 'Ready'];

    function drawerShow() {
      if (!can('importExport')) { toast('You do not have permission to import.'); return; }
      lastFocus = document.activeElement;
      drawer.hidden = false;
      if (!imported && !IMP.busy) renderDrop();
      nextFrame(function () { drawer.classList.add('open'); });
      setTimeout(function () { var b = $('.rp-iconbtn[data-close]', drawer); if (b) b.focus(); }, 80);
    }
    function drawerHide() {
      drawer.classList.remove('open');
      setTimeout(function () { drawer.hidden = true; }, RM ? 0 : 320);
      if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {}
    }
    drawer.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) drawerHide(); });

    function renderDrop(msg) {
      drawerBody.innerHTML =
        '<label class="rp-drop" id="rpDrop" tabindex="0"><input type="file" id="rpFile" accept=".csv,.tsv,.xlsx,.xls,.json" hidden/>'
        + '<span class="rp-drop-rings" aria-hidden="true"><i></i><i></i><i></i></span><span class="rp-drop-ico">' + ICON.upload + '</span>'
        + '<strong>Drop a file here, or browse</strong><span class="rp-drop-fmt">CSV · TSV · XLSX · XLS · JSON · up to 40 MB</span></label>'
        + (msg ? '<p class="rp-error" role="alert">' + ICON.warn + '<span>' + esc(msg) + '</span></p>' : '')
        + '<ul class="rp-imp-points"><li><b>Private</b> — the file is read in this browser and never uploaded.</li><li><b>Profiled</b> — every column gets a type, completeness and range before you use it.</li><li><b>Reusable</b> — turn it into a PDF / Excel / CSV report or open it in Data Studio.</li></ul>';
      var drop = $('#rpDrop');
      var inp = $('#rpFile');
      inp.addEventListener('change', function () { if (inp.files[0]) importFile(inp.files[0]); inp.value = ''; });
      drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
      ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.remove('over'); }); });
    }
    function renderProgress(file, stage, pct, note) {
      var ext = file.name.split('.').pop().toUpperCase();
      drawerBody.innerHTML = '<div class="rp-prog"><div class="rp-prog-file"><span class="rp-scan" aria-hidden="true">' + ICON.file + '<i></i></span><div><strong>' + esc(file.name) + '</strong><span>' + esc(ext) + ' · ' + bytes(file.size) + '</span></div></div>'
        + '<div class="rp-bar big"><i id="rpImpBar" style="width:' + pct + '%"></i></div>'
        + '<ol class="rp-stages">' + STAGES.map(function (s, i) { return '<li class="' + (i < stage ? 'done' : i === stage ? 'active' : '') + '"><b>' + (i < stage ? '✓' : i + 1) + '</b><span>' + s + '</span></li>'; }).join('') + '</ol>'
        + '<p class="rp-prog-note" id="rpImpNote">' + esc(note || '') + '</p></div>';
    }
    function setProgress(pct, note, stage, file) {
      var bar = $('#rpImpBar'); if (bar) { bar.style.width = pct + '%'; }
      var n = $('#rpImpNote'); if (n && note != null) n.textContent = note;
      if (stage != null) $$('.rp-stages li', drawerBody).forEach(function (li, i) { li.className = i < stage ? 'done' : i === stage ? 'active' : ''; $('b', li).textContent = i < stage ? '✓' : i + 1; });
    }
    function importFail(file, msg) {
      IMP.busy = false;
      renderDrop(msg);
      addHistory({ kind: 'import', title: file ? file.name : 'Import', fmt: file ? file.name.split('.').pop().toUpperCase() : '', status: 'failed', note: msg });
    }
    function readAs(file, binary) {
      return new Promise(function (res, rej) {
        var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = function () { rej(new Error('Could not read ' + file.name + '. Try another file.')); };
        binary ? r.readAsArrayBuffer(file) : r.readAsText(file);
      });
    }
    function normCell(v) {
      if (v instanceof Date) return isNaN(v.getTime()) ? '' : (v.getFullYear() + '-' + ('0' + (v.getMonth() + 1)).slice(-2) + '-' + ('0' + v.getDate()).slice(-2));
      if (v == null) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return v;
    }
    function rowsFromObjects(arr) {
      var cols = [], seen = {};
      arr.forEach(function (r) { Object.keys(r).forEach(function (k) { if (!seen[k]) { seen[k] = 1; cols.push(k); } }); });
      return { columns: cols, rows: arr.map(function (r) { var o = {}; cols.forEach(function (c) { o[c] = normCell(r[c]); }); return o; }) };
    }
    function parseSheet(wb, name) {
      var json = window.XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: '', raw: true });
      if (!json.length) throw new Error('The worksheet "' + name + '" has no data rows.');
      return rowsFromObjects(json);
    }
    function parseFile(file) {
      var ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'json') {
        return readAs(file).then(function (t) {
          var d = JSON.parse(t), arr = Array.isArray(d) ? d : (d && Array.isArray(d.data) ? d.data : null);
          if (!arr || !arr.length) throw new Error('Expected a JSON array of objects.');
          if (arr.some(function (r) { return !r || typeof r !== 'object' || Array.isArray(r); })) throw new Error('Each item in the JSON array must be an object with named columns.');
          return rowsFromObjects(arr);
        });
      }
      if (ext === 'csv' || ext === 'tsv') {
        if (!window.Studio) return Promise.reject(new Error('The CSV reader did not load.'));
        return readAs(file).then(function (t) { return Studio.parseDelimited(t, ext === 'tsv' ? '\t' : ','); });
      }
      if (!window.XLSX) return Promise.reject(new Error('The Excel reader did not load — check your connection and retry.'));
      return readAs(file, true).then(function (buf) {
        var b = new Uint8Array(buf);
        if (ext === 'xlsx' && !(b[0] === 0x50 && b[1] === 0x4b)) throw new Error('This .xlsx file is not a valid Excel workbook.');
        var wb = window.XLSX.read(b, { type: 'array', cellDates: true });
        if (!wb.SheetNames || !wb.SheetNames.length) throw new Error('No worksheets were found in this workbook.');
        IMP.wb = wb; IMP.sheet = wb.SheetNames[0];
        var p = parseSheet(wb, IMP.sheet); p.sheets = wb.SheetNames.slice(); return p;
      });
    }
    function classify(v) { return window.Studio && Studio.classifyValue ? Studio.classifyValue(v) : (v === '' || v == null ? 'blank' : (isNaN(Number(v)) ? 'text' : 'number')); }
    function profile(parsed, onProgress) {
      var cols = parsed.columns, rows = parsed.rows.slice(0, MAX_ROWS), total = rows.length;
      var prof = cols.map(function (c) { return { key: c, filled: 0, uniq: {}, uniqN: 0, capped: false, sample: [], min: null, max: null, sum: 0, nums: 0, kinds: {} }; });
      var dupSeen = Object.create(null), dups = 0, i = 0, CH = 4000;
      return new Promise(function (resolve) {
        function chunk() {
          var end = Math.min(total, i + CH);
          for (; i < end; i++) {
            var r = rows[i], sig = [];
            for (var c = 0; c < cols.length; c++) {
              var v = r[cols[c]], p = prof[c], k = classify(v);
              sig.push(String(v));
              p.kinds[k] = (p.kinds[k] || 0) + 1;
              if (k === 'blank') continue;
              p.filled++;
              if (!p.capped) { var s = String(v); if (!p.uniq[s]) { p.uniq[s] = 1; p.uniqN++; if (p.uniqN >= 5000) p.capped = true; } }
              if (p.sample.length < 400) p.sample.push(v);
              if (k === 'number') { var n = toNum(v); if (n != null) { p.nums++; p.sum += n; if (p.min == null || n < p.min) p.min = n; if (p.max == null || n > p.max) p.max = n; } }
            }
            var key = sig.join('␟'); if (dupSeen[key]) dups++; else dupSeen[key] = 1;
          }
          onProgress(total ? i / total : 1);
          if (i < total) setTimeout(chunk, 0); else done();
        }
        function done() {
          var out = prof.map(function (p) {
            var type = window.Studio && Studio.inferType ? Studio.inferType(p.sample, p.key) : (p.nums / Math.max(1, p.filled) > 0.7 ? 'number' : 'text');
            var mixed = false, nonBlank = p.filled;
            if (nonBlank) { var top = 0, kinds = 0; ['number', 'date', 'boolean', 'text'].forEach(function (k) { var c = p.kinds[k] || 0; if (c) kinds++; if (c > top) top = c; }); mixed = kinds > 1 && top / nonBlank < 0.9 && type === 'text'; }
            return { key: p.key, type: type, filled: p.filled, pct: total ? p.filled / total : 0, uniq: p.uniqN, capped: p.capped, min: p.min, max: p.max, avg: p.nums ? p.sum / p.nums : null, mixed: mixed };
          });
          var empty = out.filter(function (c) { return c.filled === 0; }).map(function (c) { return c.key; });
          var filledCells = out.reduce(function (s, c) { return s + c.filled; }, 0), cells = total * cols.length;
          resolve({ columns: out, total: total, truncated: parsed.rows.length > MAX_ROWS, dups: dups, completeness: cells ? filledCells / cells : 0, empty: empty });
        }
        chunk();
      });
    }
    function warnings(parsed, prof) {
      var w = [];
      if (prof.truncated) w.push('Only the first ' + fmtNum(MAX_ROWS) + ' rows were profiled.');
      if (prof.dups) w.push(fmtNum(prof.dups) + ' duplicate row' + (prof.dups === 1 ? '' : 's') + ' found — consider cleaning before reporting.');
      if (prof.empty.length) w.push('Empty column' + (prof.empty.length === 1 ? '' : 's') + ': ' + prof.empty.slice(0, 4).join(', ') + (prof.empty.length > 4 ? '…' : '') + '.');
      var blankHead = parsed.columns.filter(function (c) { return /^(__EMPTY|Column \d+)/.test(c); });
      if (blankHead.length) w.push(blankHead.length + ' column' + (blankHead.length === 1 ? ' has' : 's have') + ' no header name.');
      var low = prof.columns.filter(function (c) { return c.filled && c.pct < 0.5; });
      if (low.length) w.push(low.length + ' column' + (low.length === 1 ? ' is' : 's are') + ' more than half empty.');
      var mixed = prof.columns.filter(function (c) { return c.mixed; });
      if (mixed.length) w.push('Mixed value types in: ' + mixed.slice(0, 3).map(function (c) { return c.key; }).join(', ') + '.');
      return w;
    }
    function importFile(file) {
      if (IMP.busy) return;
      var ext = file.name.split('.').pop().toLowerCase();
      if (ACCEPT.indexOf(ext) === -1) return importFail(file, 'Choose a CSV, TSV, XLSX, XLS or JSON file.');
      if (file.size > MAX_BYTES) return importFail(file, 'That file is ' + bytes(file.size) + ' — the limit is 40 MB.');
      if (!file.size) return importFail(file, 'That file is empty.');
      IMP.busy = true; IMP.wb = null; IMP.file = file;
      if (drawer.hidden) drawerShow();
      renderProgress(file, 0, 4, 'Opening ' + file.name + '…');
      var parsed;
      wait(260).then(function () { setProgress(14, 'Reading ' + bytes(file.size) + '…', 0); return parseFile(file); })
        .then(function (p) { parsed = p; setProgress(40, 'Found ' + fmtNum(p.rows.length) + ' rows and ' + p.columns.length + ' columns.', 1); return wait(380); })
        .then(function () { setProgress(46, 'Checking every column…', 2); return profile(parsed, function (f) { setProgress(46 + Math.round(f * 46), null); }); })
        .then(function (prof) { setProgress(100, 'Done.', 3); return wait(420).then(function () { return prof; }); })
        .then(function (prof) {
          IMP.busy = false;
          imported = { name: file.name, size: file.size, columns: prof.columns, rows: parsed.rows, file: file, at: Date.now(), parsed: parsed, prof: prof, sheets: parsed.sheets || null };
          renderResult(); renderGrid(false);
          addHistory({ kind: 'import', title: file.name, fmt: ext.toUpperCase(), rows: prof.total, status: 'ok', note: fmtNum(prof.total) + ' rows · ' + prof.columns.length + ' columns' });
        })
        .catch(function (err) { importFail(file, (err && err.message) || 'Could not read that file.'); });
    }
    var TYPE_LABEL = { number: 'Number', currency: 'Currency', percent: 'Percent', date: 'Date', boolean: 'Yes / No', text: 'Text' };
    function fmtRange(c) {
      if (c.min == null) return '—';
      var f = function (n) { return Math.abs(n) >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n.toLocaleString(undefined, { maximumFractionDigits: 2 }); };
      return f(c.min) + ' – ' + f(c.max);
    }
    function numCls(c) { return /^(number|currency|percent)$/.test(c.type) ? ' class="num"' : ''; }
    function renderResult() {
      var im = imported; if (!im) return renderDrop();
      var prof = im.prof, warns = warnings(im.parsed, prof), ext = im.name.split('.').pop().toUpperCase();
      var sheets = im.sheets && im.sheets.length > 1 ? '<div class="rp-sheets" role="group" aria-label="Worksheet">' + im.sheets.map(function (s) { return '<button type="button" data-sheet="' + esc(s) + '" class="' + (s === IMP.sheet ? 'active' : '') + '">' + esc(s) + '</button>'; }).join('') + '</div>' : '';
      drawerBody.innerHTML =
        '<div class="rp-result">'
        + '<div class="rp-result-file"><span class="rp-result-ico">' + ICON.check + '</span><div><strong>' + esc(im.name) + '</strong><span>' + ext + ' · ' + bytes(im.size) + ' · profiled just now</span></div><button class="rp-linkbtn" type="button" id="rpDiscard">Discard</button></div>'
        + sheets
        + '<div class="rp-tiles">'
        + '<div class="rp-tile" style="--i:0"><b data-to="' + prof.total + '">0</b><span>Rows</span></div>'
        + '<div class="rp-tile" style="--i:1"><b data-to="' + prof.columns.length + '">0</b><span>Columns</span></div>'
        + '<div class="rp-tile ' + (prof.completeness > .95 ? 'good' : prof.completeness > .8 ? '' : 'warn') + '" style="--i:2"><b data-to="' + Math.round(prof.completeness * 100) + '" data-suffix="%">0</b><span>Complete</span></div>'
        + '<div class="rp-tile ' + (prof.dups ? 'warn' : 'good') + '" style="--i:3"><b data-to="' + prof.dups + '">0</b><span>Duplicates</span></div></div>'
        + (warns.length ? '<ul class="rp-warns">' + warns.map(function (w) { return '<li>' + ICON.warn + '<span>' + esc(w) + '</span></li>'; }).join('') + '</ul>' : '<p class="rp-clean">' + ICON.check + '<span>No quality problems found.</span></p>')
        + '<h4 class="rp-sub">Columns</h4><div class="rp-cols-table">'
        + prof.columns.slice(0, 80).map(function (c, i) {
          return '<div class="rp-colrow" style="--i:' + Math.min(i, 14) + '"><span class="rp-colname" title="' + esc(c.key) + '">' + esc(c.key) + '</span><span class="rp-type t-' + c.type + '">' + TYPE_LABEL[c.type] + '</span>'
            + '<span class="rp-fill" title="' + Math.round(c.pct * 100) + '% filled"><i style="--w:' + Math.round(c.pct * 100) + '%"></i></span>'
            + '<span class="rp-colnum">' + Math.round(c.pct * 100) + '%</span><span class="rp-colrange">' + (/^(number|currency|percent)$/.test(c.type) ? fmtRange(c) : fmtNum(c.uniq) + (c.capped ? '+' : '') + ' unique') + '</span></div>';
        }).join('') + (prof.columns.length > 80 ? '<p class="rpb-muted">+ ' + (prof.columns.length - 80) + ' more columns</p>' : '') + '</div>'
        + '<h4 class="rp-sub">Preview <em>first ' + Math.min(8, im.rows.length) + ' of ' + fmtNum(prof.total) + ' rows</em></h4>'
        + '<div class="rpb-scroll rp-prev"><table><thead><tr>' + prof.columns.slice(0, 12).map(function (c) { return '<th' + numCls(c) + '>' + esc(c.key) + '</th>'; }).join('') + '</tr></thead><tbody>'
        + im.rows.slice(0, 8).map(function (r) { return '<tr>' + prof.columns.slice(0, 12).map(function (c) { return '<td' + numCls(c) + '>' + esc(r[c.key]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'
        + '<div class="rp-result-actions">'
        + '<button class="btn btn-primary btn-sm rp-btn" type="button" data-act="studio">' + ICON.studio + '<span>Open in Data Studio</span></button>'
        + '<button class="btn btn-outline btn-sm rp-btn" type="button" data-act="PDF">' + ICON.download + '<span>PDF report</span></button>'
        + '<button class="btn btn-outline btn-sm rp-btn" type="button" data-act="XLSX">' + ICON.download + '<span>Excel</span></button>'
        + '<button class="btn btn-outline btn-sm rp-btn" type="button" data-act="CSV">' + ICON.download + '<span>CSV</span></button>'
        + '<button class="btn btn-ghost btn-sm rp-btn" type="button" data-act="builder">Customise columns…</button></div></div>';
      $$('.rp-tile b', drawerBody).forEach(function (el) { var suf = el.getAttribute('data-suffix') || ''; countUp(el, el.getAttribute('data-to'), 800); if (suf) setTimeout(function () { el.textContent = el.getAttribute('data-to') + suf; }, RM ? 0 : 860); });
      nextFrame(function () { drawerBody.classList.add('shown'); });
    }
    drawerBody.addEventListener('click', function (e) {
      var sh = e.target.closest('[data-sheet]');
      if (sh && imported && IMP.wb) {
        if (IMP.busy) return;
        var name = sh.getAttribute('data-sheet'), p;
        try { p = parseSheet(IMP.wb, name); } catch (err) { toast(err.message); return; }
        p.sheets = imported.sheets; IMP.busy = true; IMP.sheet = name;
        renderProgress(imported.file, 2, 50, 'Profiling “' + name + '”…');
        profile(p, function (f) { setProgress(50 + Math.round(f * 50), null); }).then(function (prof) {
          IMP.busy = false;
          imported.parsed = p; imported.prof = prof; imported.columns = prof.columns; imported.rows = p.rows; imported.dateOk = null; renderResult(); renderGrid(false);
        }, function (err) { IMP.busy = false; toast((err && err.message) || 'Could not read that worksheet.'); renderResult(); });
        return;
      }
      if (e.target.closest('#rpDiscard')) { imported = null; IMP.wb = null; renderDrop(); renderGrid(false); toast('Imported file discarded.'); return; }
      var a = e.target.closest('[data-act]'); if (!a || !imported) return;
      var act = a.getAttribute('data-act');
      if (act === 'studio') {
        if (window.DVStudioBridge && DVStudioBridge.importFile && window.dashviewShowView) { drawerHide(); window.dashviewShowView('studio'); setTimeout(function () { DVStudioBridge.importFile(imported.file); }, 120); }
        else toast('Data Studio is not available here.');
        return;
      }
      if (act === 'builder') { drawerHide(); setTimeout(function () { builderOpen(); B.src = 'imported'; B.cols = null; renderBuilder(); }, 200); return; }
      var im = imported, src = sources().filter(function (s) { return s.id === 'imported'; })[0], cols = src.load().columns.map(function (c) { return c.key; });
      var title = im.name.replace(/\.[^.]+$/, '') + ' report';
      runJob({ title: title, fmt: act, kind: 'export', note: 'From imported file ' + im.name, rows: im.rows.length, run: function () { return generateFrom(src, cols, act, title, true); } });
    });

    /* global drag-and-drop over the Reports screen */
    var dragDepth = 0, veil = $('#rpVeil');
    function hasFiles(e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') > -1; }
    function reportsActive() { return root.classList.contains('active'); }
    document.addEventListener('dragenter', function (e) { if (!reportsActive() || !hasFiles(e)) return; dragDepth++; veil.classList.add('on'); });
    document.addEventListener('dragover', function (e) { if (reportsActive() && hasFiles(e)) e.preventDefault(); });
    document.addEventListener('dragleave', function (e) { if (!reportsActive() || !hasFiles(e)) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth || e.relatedTarget === null) { dragDepth = 0; veil.classList.remove('on'); } });
    document.addEventListener('dragend', function () { dragDepth = 0; veil.classList.remove('on'); });
    document.addEventListener('drop', function (e) {
      if (!reportsActive() || !hasFiles(e)) return;
      dragDepth = 0; veil.classList.remove('on');
      if (e.target.closest && e.target.closest('#rpDrop')) { e.preventDefault(); if (e.dataTransfer.files[0]) importFile(e.dataTransfer.files[0]); return; }
      e.preventDefault();
      if (!can('importExport')) { toast('You do not have permission to import.'); return; }
      if (e.dataTransfer.files[0]) importFile(e.dataTransfer.files[0]);
    });

    /* ── activity tab ────────────────────────────────────────────────────────── */
    var actFilter = '';
    function startOfDay(ts) { var d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
    function renderInsights() {
      var host = $('#rpInsights'); if (!host) return;
      if (!history.length) { host.innerHTML = ''; return; }
      var ok = history.filter(function (h) { return h.status === 'ok'; }), ex = ok.filter(function (h) { return h.kind !== 'import'; });
      var rate = Math.round(ok.length / history.length * 100), rowsOut = ex.reduce(function (n, h) { return n + (Number(h.rows) || 0); }, 0);
      var byFmt = {}; ex.forEach(function (h) { if (h.fmt) byFmt[h.fmt] = (byFmt[h.fmt] || 0) + 1; });
      var topFmt = Object.keys(byFmt).sort(function (a, b) { return byFmt[b] - byFmt[a]; })[0];
      var t0 = startOfDay(Date.now()), days = [], max = 1, i;
      for (i = 13; i >= 0; i--) days.push({ t: t0 - i * 864e5, ok: 0, bad: 0 });
      history.forEach(function (h) { var k = Math.round((startOfDay(h.at) - days[0].t) / 864e5); if (k >= 0 && k < 14) days[k][h.status === 'ok' ? 'ok' : 'bad']++; });
      days.forEach(function (d) { max = Math.max(max, d.ok + d.bad); });
      var byTitle = {}; ex.forEach(function (h) { byTitle[h.title] = (byTitle[h.title] || 0) + 1; });
      var top = Object.keys(byTitle).sort(function (a, b) { return byTitle[b] - byTitle[a]; }).slice(0, 5), topMax = top.length ? byTitle[top[0]] : 1;
      host.innerHTML = '<section class="rp-ins" aria-label="Report analytics">'
        + '<div class="rp-ins-tiles"><div class="rp-tile"><b>' + fmtNum(history.length) + '</b><span>Runs logged</span></div>'
        + '<div class="rp-tile ' + (rate >= 90 ? 'good' : rate >= 70 ? '' : 'warn') + '"><b>' + rate + '%</b><span>Success rate</span></div>'
        + '<div class="rp-tile"><b>' + fmtNum(rowsOut) + '</b><span>Rows delivered</span></div>'
        + '<div class="rp-tile"><b>' + esc(topFmt || '—') + '</b><span>Most used format</span></div></div>'
        + '<div class="rp-ins-cols"><div class="rp-ins-card"><h4>Last 14 days</h4><div class="rp-ins-bars" role="img" aria-label="Runs per day for the last 14 days">'
        + days.map(function (d) { var tot = d.ok + d.bad, title = new Date(d.t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + d.ok + ' done' + (d.bad ? ', ' + d.bad + ' failed' : '');
          return '<div class="rp-ins-col" title="' + esc(title) + '"><div class="rp-ins-stack" style="height:' + (tot ? Math.max(8, Math.round(tot / max * 100)) : 0) + '%">' + (d.bad ? '<i class="bad" style="flex:' + d.bad + '"></i>' : '') + (d.ok ? '<i class="ok" style="flex:' + d.ok + '"></i>' : '') + '</div><span>' + new Date(d.t).toLocaleDateString(undefined, { weekday: 'narrow' }) + '</span></div>'; }).join('')
        + '</div></div><div class="rp-ins-card"><h4>Most generated</h4>'
        + (top.length ? '<ul class="rp-ins-top">' + top.map(function (t) { return '<li><span class="rp-ins-name" title="' + esc(t) + '">' + esc(t) + '</span><span class="rp-ins-track"><i style="width:' + Math.round(byTitle[t] / topMax * 100) + '%"></i></span><b>' + byTitle[t] + '</b></li>'; }).join('') + '</ul>' : '<p class="rpb-muted">Generate a report to see which ones you use most.</p>')
        + '</div></div></section>';
    }
    function renderActivity(fresh) {
      renderInsights();
      var list = history.filter(function (h) { return !actFilter || (actFilter === 'import' ? h.kind === 'import' : h.kind !== 'import'); });
      $('#rpActCount').textContent = history.length ? history.length : '';
      var host = $('#rpActList');
      if (!list.length) { host.innerHTML = '<div class="rp-empty">' + ICON.empty + '<strong>No activity yet</strong><span>Generate a report or import a file and it will be logged here.</span></div>'; return; }
      host.innerHTML = list.map(function (h, i) {
        var col = FMT_COLOR[h.fmt] || '#8a94a0', imp = h.kind === 'import';
        return '<div class="rp-act ' + (h.status === 'ok' ? 'ok' : 'bad') + (fresh && i === 0 ? ' is-new' : '') + '" style="--fmt:' + col + '"><span class="rp-act-ico">' + (imp ? ICON.upload : ICON.download) + '</span>'
          + '<div class="rp-act-main"><strong>' + esc(h.title) + '</strong><span>' + (imp ? 'Imported' : h.kind === 'builder' ? 'Custom report' : 'Generated') + (h.fmt ? ' · ' + esc(h.fmt) : '') + (h.rows != null ? ' · ' + fmtNum(h.rows) + ' rows' : '') + (h.note && h.kind !== 'import' ? ' · ' + esc(h.note) : '') + '</span></div>'
          + '<span class="rp-act-status">' + (h.status === 'ok' ? 'Done' : 'Failed') + '</span><time title="' + esc(new Date(h.at).toLocaleString()) + '">' + ago(h.at) + '</time></div>'
          + (h.status !== 'ok' && h.note ? '<p class="rp-act-err">' + esc(h.note) + '</p>' : '');
      }).join('');
    }

    /* ── wiring ──────────────────────────────────────────────────────────────── */
    function setTab(name) {
      $$('.rp-tab', root).forEach(function (t) { var on = t.getAttribute('data-tab') === name; t.classList.toggle('active', on); t.setAttribute('aria-selected', on); t.setAttribute('tabindex', on ? '0' : '-1'); });
      $('#rpLibrary').classList.toggle('active', name === 'library'); $('#rpLibrary').hidden = name !== 'library';
      $('#rpActivity').classList.toggle('active', name === 'activity'); $('#rpActivity').hidden = name !== 'activity';
      moveInk();
      if (name === 'activity') renderActivity(false);
    }
    function moveInk() {
      var a = $('.rp-tab.active', root), ink = $('.rp-tab-ink', root); if (!a || !ink) return;
      ink.style.width = a.offsetWidth + 'px'; ink.style.transform = 'translateX(' + a.offsetLeft + 'px)';
    }
    $('#rpTabs').addEventListener('click', function (e) { var t = e.target.closest('.rp-tab'); if (t) setTab(t.getAttribute('data-tab')); });
    $('#rpTabs').addEventListener('keydown', function (e) {
      var tabs = $$('.rp-tab', root), i = tabs.indexOf(document.activeElement), n = -1;
      if (i < 0) return;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length; else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1;
      if (n < 0) return;
      e.preventDefault(); setTab(tabs[n].getAttribute('data-tab')); tabs[n].focus();
    });
    window.addEventListener('resize', moveInk);

    $('#rpSearch').addEventListener('input', function () { F.q = this.value.trim(); renderGrid(true); });
    $('#rpCats').addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (!b) return; F.cat = b.getAttribute('data-cat'); renderCats(); renderGrid(true); });
    $('#rpFmt').addEventListener('click', function (e) { var b = e.target.closest('[data-fmt]'); if (!b) return; F.fmt = b.getAttribute('data-fmt'); $$('#rpFmt button').forEach(function (x) { x.classList.toggle('active', x === b); }); renderGrid(true); });
    $('#rpActFilter').addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (!b) return; actFilter = b.getAttribute('data-k'); $$('#rpActFilter button').forEach(function (x) { x.classList.toggle('active', x === b); }); renderActivity(false); });
    var clearTimer = null;
    $('#rpActClear').addEventListener('click', function () {
      var b = this; if (!history.length) return;
      if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = 'Click again to clear'; clearTimeout(clearTimer); clearTimer = setTimeout(function () { b.classList.remove('armed'); b.textContent = 'Clear'; }, 4000); return; }
      clearTimeout(clearTimer); b.classList.remove('armed'); b.textContent = 'Clear';
      history = []; saveJSON(HKEY, history); renderActivity(false); renderStats(); renderGrid(false); toast('Report activity cleared.');
    });
    $('#rpActExport').addEventListener('click', function () {
      if (!history.length) { toast('No activity to export yet.'); return; }
      var lib = window.DVFmt && window.DVFmt.csv ? window.DVFmt : window.WS; if (!lib) return;
      lib.download('dashview-report-activity-' + today() + '.csv', lib.csv([['When', 'Type', 'Name', 'Format', 'Rows', 'Status', 'Note']].concat(history.map(function (h) { return [new Date(h.at).toISOString(), h.kind, h.title, h.fmt || '', h.rows == null ? '' : h.rows, h.status, h.note || '']; }))));
      toast('Activity log exported.');
    });

    $('#reportsGrid').addEventListener('click', function (e) {
      var run = e.target.closest('button[data-rid]');
      if (run) { var r = allReports().filter(function (x) { return x.id === run.getAttribute('data-rid'); })[0]; if (r) runReport(r); return; }
      var pk = e.target.closest('[data-pick]');
      if (pk) { var pp = pk.getAttribute('data-pick').split('|'); picks[pp[0]] = pp[1]; saveJSON(PKEY, picks); renderGrid(false); var again = $('.rp-card[data-id="' + pp[0] + '"] [data-pick$="|' + pp[1] + '"]'); if (again) again.focus(); return; }
      var te = e.target.closest('[data-tpl-edit]');
      if (te) { var tt = templates.filter(function (x) { return x.id === te.getAttribute('data-tpl-edit'); })[0]; if (tt) builderOpen(tt); return; }
      var td = e.target.closest('[data-tpl-del]');
      if (td) {
        if (!td.classList.contains('armed')) { td.classList.add('armed'); td.setAttribute('title', 'Click again to delete'); setTimeout(function () { td.classList.remove('armed'); td.setAttribute('title', 'Delete saved report'); }, 3500); return; }
        var tid = td.getAttribute('data-tpl-del'); templates = templates.filter(function (x) { return x.id !== tid; }); favs = favs.filter(function (x) { return x !== 'tpl-' + tid; }); saveJSON(TKEY, templates); saveJSON(FKEY, favs);
        renderCats(); renderStats(); renderGrid(false); toast('Saved report deleted.'); return;
      }
      var fav = e.target.closest('[data-fav]');
      if (fav) { var id = fav.getAttribute('data-fav'), i = favs.indexOf(id); if (i > -1) favs.splice(i, 1); else favs.push(id); saveJSON(FKEY, favs); renderGrid(false); return; }
      var d = e.target.closest('[data-def]');
      if (d) { var card = d.closest('.rp-card'), on = !card.classList.contains('open'); card.classList.toggle('open', on); d.setAttribute('aria-expanded', on); return; }
      if (e.target.closest('#rpResetFilters')) { F = { q: '', cat: 'All', fmt: '' }; $('#rpSearch').value = ''; $$('#rpFmt button').forEach(function (x, i) { x.classList.toggle('active', i === 0); }); renderCats(); renderGrid(true); }
    });
    $('#rpImportBtn').addEventListener('click', drawerShow);
    $('#newReportBtn').addEventListener('click', function () { builderOpen(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        var box = builder.classList.contains('open') ? $('.rp-builder-card', builder) : (!drawer.hidden && drawer.classList.contains('open') ? $('.rp-drawer', drawer) : null);
        if (box) {
          var f = $$('button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', box).filter(function (x) { return !x.hidden && x.type !== 'hidden'; });
          if (f.length) { var first = f[0], last = f[f.length - 1]; if (e.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && (document.activeElement === last || !box.contains(document.activeElement))) { e.preventDefault(); first.focus(); } }
        }
        return;
      }
      if (e.key !== 'Escape') return;
      if (builder.classList.contains('open')) builderClose();
      else if (!drawer.hidden && drawer.classList.contains('open')) drawerHide();
    });
    document.addEventListener('dv:view', function (e) { if (e.detail && e.detail.view === 'reports') { renderStats(); renderGrid(true); requestAnimationFrame(moveInk); } });
    window.addEventListener('focus', function () { if (reportsActive()) { renderStats(); renderGrid(false); } });

    renderCats(); renderStats(); renderGrid(true); renderActivity(false); requestAnimationFrame(moveInk);
    window.DVReportsHub = { run: runJob, openImport: drawerShow, openBuilder: builderOpen, history: function () { return history.slice(); }, plan: applyPlan, analytics: function (id) { return ANALYTICS[id].build(); }, templates: function () { return templates.slice(); } };
  });
})();
