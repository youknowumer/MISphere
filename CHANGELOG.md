# Changelog

All notable changes to MISphere, newest first.

## 10.3.0 — 2026-10-22

- Command header redesign: live greeting and clock, week context (ISO week, relative), office-day progress bar, live task pulse (open / due today / overdue), profile avatar, compact sticky mode on scroll, responsive mobile layout

## 10.2.0 — 2026-10-22

- Insights: new report header (organisation, classification, prepared by), executive summary with delivery-health ring, targets scorecard, auto key findings and recommended actions, print/PDF header and footer
- Settings rebuilt as a sectioned workspace: search, unsaved-changes bar with validation, per-section reset, settings export / import, live previews
- New settings: organisation, prepared by, classification, opening page, hours format, default analysis period, at-risk window, attention look-ahead, backup reminder, reduce motion
- Fix: Insights tags could leak into saved settings
- Copyright and licence now name Muhammad Umer Faheem

## Version 10.1
- Insights: line and bar charts only. iOS colour-graded glass theme. Tasks: Due filter and CSV export of the current view.
- Updates no longer keep or offer restore points (use Reports > Backup download for your own backups).

## Version 10 — Single Admin, leader from members, task filters
- One Admin; everyone else is a Member. Admin & leader panel in Members; leader is chosen from members.
- Tasks: themed filter toolbar (search, member, status, priority, sort, reset, result count).



## Version 9.3 — Insights Pro
- SVG charts, KPI trends, section switcher (Overview / Team / Modules / Executive), tooltips; board class names separated from Insights charts.



## Version 9.2
- Board cards redesigned (quick actions, due labels, progress), progressive edge blur rebuilt.



## Version 9.1.1
- Tab bar position locked (bottom centre), header pinned, new top/bottom edge blur that responds to scrolling.



## Version 9.1 — Task board
- Tasks: status summary tiles (To do / In progress / Done / Overdue), By day and Board views, drag & drop between columns. Status filters now follow the task's status (an overdue open task still counts under To do / In progress; use Overdue to see only late ones).



## Version 9 — Liquid Glass polish
- iOS 26 style glass (edge rims, specular highlights), smooth page transitions, spring press feedback, Inter/SF typography with tabular numbers, layout and mobile glitch fixes, accessibility fallbacks (reduced motion / transparency, high contrast).
- Publish: upload index.html + version.json; open dashboards offer 'Update now' (auto backup first).



## Version 8 — Glass, motion and one-click updates
- Stronger liquid-glass cards/tab bar, smooth entrance and hover motion (respects "reduce motion").
- Settings > Updates & version history: "Check for updates" reads version.json next to index.html. If it is newer, "Update now" takes an automatic safety backup of your data, clears caches and reloads the new version. Data is never deleted by an update; restore points (last 3) can be restored from the same panel.
- To publish an update: upload the new index.html, bump APP_VERSION in the script at the bottom of index.html, and edit version.json (version, notes, history). Every open dashboard then offers the update (checked on open, at most every 6 hours).




## Version 7 — Modules, module reporting and live GitHub sync

### Modules (which module is the work against)
- Every task has a Module (Tasks > New Task > Module, also in Edit task). The list is yours: Settings > Modules (one name per line). Default list: Sales, Purchase, Inventory, Accounting, CRM, HR / Payroll, Manufacturing, Projects, Website / eCommerce, Reporting / BI, IT Infrastructure, General.
- Header selector "All modules / <module>": choose the module you are working on and the whole dashboard (Home, Tasks, Performance, Insights, Executive intelligence) shows only that module. A banner shows the active module; "Show all modules" clears it. The choice is remembered in this browser.
- Settings > "Require a module on new tasks" makes the field mandatory.
- Reports > Modules (new): period (viewed week / 4 / 12 / 26 weeks / all time), KPI cards (busiest module, best delivery, needs attention, overall deadline-met), workload and state bars per module, a full scorecard (tasks, done, on time, late, overdue, open, deadline met %, avg progress, estimated vs actual hours, efficiency, score, lead contributor, high-priority open), a member x module matrix, CSV download and a clean "Print module report" page. "Focus" on a row filters the dashboard to that module.
- Insights has a new "Module Breakdown" panel for the viewed week (included in Print report).
- Excel: Tasks sheet has a Module column, new "Module Summary" sheet, import reads the Module column (new module names are added to your list). The blank template now has a Module column with a dropdown (Modules sheet). CSV week report has a Module column.


### Live sync to GitHub (data saved into one file in your repository)
- Settings > Live sync to GitHub > Connect: owner, repository, branch, file path (default data/mis-data.json) and a GitHub token.
- Token: GitHub > Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token. Select ONLY your MISphere repository, Repository permissions > Contents > Read and write.
- After connecting, every change is committed to that one file a few seconds later (header chip shows "GitHub: synced hh:mm"). Open the file on GitHub (button "Open data file") to read it: at the top is a report (summary, moduleReport, memberReport, taskRegister), the full data for restore is at the bottom. "Change history" shows every save as a commit: who changed what and when.
- Other device / browser: open the site > "Load from GitHub" (setup screen) or Settings > Load from GitHub. If GitHub and this browser differ, sync pauses and asks you to choose Load from GitHub or Overwrite GitHub - nothing is overwritten silently.
- The token is stored only in the browser you typed it in. It is never put in backups, Excel exports or the GitHub data file.
- IMPORTANT: if the repository is public, anyone can read the data file. Use a private repository for real data (GitHub Pages from a private repo needs a paid GitHub plan; alternatively keep the site in one public repo and put the data in a separate private repo - just enter that repo in the connect form).


### Auto-save to a file (no token)
- Settings > "Auto-save to a file" > Choose file...: pick a file once (e.g. mis-data.json inside your MISphere repository folder). It is rewritten ~1.5 s after every change, with the same readable report + full data as the GitHub file. Chrome / Edge only. After reopening the page, click "Save now" once to allow access again.
- To publish: commit and push that folder (GitHub Desktop). "Restore from file" in Reports > Data & Backup accepts this file too.


### GitHub via Cloudflare Worker (no token in the browser)
- Folder worker/ (index.js, wrangler.jsonc, DEPLOY.txt): a tiny Cloudflare Worker that holds the GitHub token as a secret and can read/write only ONE file in ONE repository. Follow worker/DEPLOY.txt once.
- In MISphere: Settings > Live sync to GitHub > Connect > fill "Worker URL" + "Access code" (section A).
- Zero-prompt mode: in index.html set PRESET_WORKER = {url:"https://...workers.dev", key:"your code"}. Every browser that opens the site then connects automatically, loads the data from GitHub if it is empty, and saves every change. The access code is then visible in the page source: anyone who finds it could overwrite the data file, so keep the repo private / rotate the code if needed (wrangler secret put MIS_KEY + edit index.html).



## Version 6 — Final
- Animated, professional "Set up your workspace" screen (drifting colour orbs, glass card with cursor spotlight and sheen, staggered entrance, template cards with icons, live team preview chips, step tracker, pulsing Create button) matching landing.html.
- Task editing, activity log, notes search, "Today's key points" panel on Home, roles & permission matrix, daily notes (see Version 5).
- Files: landing.html (entry page) -> index.html (app). Keep all files in one folder.



## Version 5 — Team roles and daily notes
- Roles & capabilities: every member has an access role (Admin, Team Lead, Member, Viewer) and a status (Active / On leave). Members > Roles & capabilities is a permission matrix you can edit (assign tasks, update anyone's tasks, delete tasks, set leader, view team notes, manage members, import/erase data, change settings).
- "Acting as" selector in the header chooses who is using the dashboard; Members only see/assign their own tasks, Viewers are read-only. The first member of an existing workspace becomes Admin automatically. Roles are enforced inside the dashboard (browser-only app, no login).
- Tasks remember who assigned them; at least one Admin is always kept.
- Notes tab (key 9): day-wise key points with must-do stars and tick-off, day notes (auto-saved), week strip with progress, streak, "Tasks due" for the day with one-click Done, unfinished points from the last 14 days with Move here / Move all, copy day summary, team notes for roles that may view them. Badge on the tab shows today's pending key points.
- Notes and roles are included in JSON backup and Excel export/import (Daily Notes sheet, Access/Status columns).



## Landing page v2 — liquid glass and motion
- Floating glass navigation with scroll progress bar, frosted-glass cards with cursor spotlight, drifting colour orbs behind the glass (with scroll parallax)
- Hero: word-by-word headline entrance, 3D tilt on the dashboard preview, floating glass badges, count-up numbers, animated ring, bars and line chart
- Sections reveal as you scroll; buttons have a light sweep; the final call-to-action pulses gently
- Respects the "reduce motion" system setting (animations are turned off automatically)



## Landing page
- landing.html: marketing / entry page. Open it first; every "Create workspace" button opens index.html, where the first-run setup creates the workspace.
- Keep landing.html and index.html in the same folder. Needs internet only for the Google Fonts (falls back to system fonts offline).


### Settings > Erase all data now returns you to landing.html. The setup screen also has a 'Back to home' link.



## Version 4 — Executive intelligence
- Insights > Executive intelligence (period: this week / 4 / 12 / 26 weeks, deltas vs previous period)
- Executive summary: delivery health gauge plus an auto-written narrative of pace, reliability, backlog and overdue work
- 9 management KPIs: throughput, delivery reliability, median turnaround (P50/P85/P95), backlog runway, 28-day net flow, deadline exposure, workload balance, estimate accuracy, output stability
- Priority actions: ranked (Critical / Important / Watch / Insight) recommendations generated from your data and Settings targets
- Delivery forecast: projected backlog clear date from the last 28 days of throughput
- Charts: throughput control chart (mean +/- 1 sigma), delivery quality trend vs target, turnaround distribution, member performance map (output vs reliability), estimated vs actual hours
- Tables: priority performance, workload distribution vs cap, slippage watchlist (days late)
- Excel export now adds Exec KPIs, Weekly Trend, Priority Performance and Workload sheets (ignored on import)
- Fully theme-aware (light / dark) and included in Print report



## Version 3.1
- On first open, any old sample team still saved in the browser is detected and can be removed (a backup is downloaded first). Settings > Erase all data clears everything.



## Version 3
- No names, roles or sample data are stored anywhere: templates only set the department, targets and role hints
- Modern interface: sticky glass header, refined type and cards, light / dark / auto theme (Settings or header button)
- Command palette: Ctrl/Cmd + K to jump to pages, run actions, find members and tasks
- Home shows a getting-started card until the first task exists



## Version 2.1
- Starts empty: no members, tasks or settings are stored until you create a workspace (first-run setup with Blank, MIS / IT, Support desk and Sales templates)
- MIS-Task-Import-Template.xlsx: styled import template with dropdowns, date/number validation, instructions and no data; the same file is built into the dashboard (Reports > Excel template)
- Settings > Erase all data returns the dashboard to the empty state



## Version 2
- Settings tab: office hours and working days, KPI targets, scoring points, department name, defaults, compact layout, backup status
- Insights: health score, key findings, burn chart, risk matrix, backlog ageing, weekday pattern, member scorecard with trends; 1 / 4 / 12 week periods
- Tab bar: overdue count badge, shortcut tooltips, one Reports tab combining performance, leader history and data & backup in a single view, office-hours status chip
