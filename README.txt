MIS Team Performance Dashboard
==============================
How to open: double-click landing.html (or index.html for the dashboard directly) in any modern browser (Chrome / Edge). No installation or server required.

Features
- Dashboard: weekly KPIs with week-over-week change, "Needs attention" panel, team cards, leader of the week
- Tasks: create, filter, sort; priority, progress and an office-hours timer
- Insights: KPIs, daily activity, status mix, 6-week trend, performance heatmap, workload and efficiency tables
- Members: add, edit and delete members (name, role, colour)
- Data: Excel import/export (.xlsx) with blank template, CSV weekly report, JSON backup/restore, print report
- Floating liquid-glass bottom tab bar for navigation (no sidebar); keyboard shortcuts (1-8 for pages (3, 5, 6 open sections of Reports), / to search)

Notes
- Data is stored in the browser (localStorage). Take a backup or Excel export every week.
- Excel buttons need an internet connection (SheetJS loads from cdnjs). Everything else works offline.
- favicon.svg is already embedded in index.html; the separate file is for use on a website.

Version 2
- Settings tab: office hours and working days, KPI targets, scoring points, department name, defaults, compact layout, backup status
- Insights: health score, key findings, burn chart, risk matrix, backlog ageing, weekday pattern, member scorecard with trends; 1 / 4 / 12 week periods
- Tab bar: overdue count badge, shortcut tooltips, one Reports tab combining performance, leader history and data & backup in a single view, office-hours status chip

Version 2.1
- Starts empty: no members, tasks or settings are stored until you create a workspace (first-run setup with Blank, MIS / IT, Support desk and Sales templates)
- MIS-Task-Import-Template.xlsx: styled import template with dropdowns, date/number validation, instructions and no data; the same file is built into the dashboard (Reports > Excel template)
- Settings > Erase all data returns the dashboard to the empty state

Version 3
- No names, roles or sample data are stored anywhere: templates only set the department, targets and role hints
- Modern interface: sticky glass header, refined type and cards, light / dark / auto theme (Settings or header button)
- Command palette: Ctrl/Cmd + K to jump to pages, run actions, find members and tasks
- Home shows a getting-started card until the first task exists

Version 3.1
- On first open, any old sample team still saved in the browser is detected and can be removed (a backup is downloaded first). Settings > Erase all data clears everything.

Version 4 - Executive intelligence
- Insights > Executive intelligence (period: this week / 4 / 12 / 26 weeks, deltas vs previous period)
- Executive summary: delivery health gauge plus an auto-written narrative of pace, reliability, backlog and overdue work
- 9 management KPIs: throughput, delivery reliability, median turnaround (P50/P85/P95), backlog runway, 28-day net flow, deadline exposure, workload balance, estimate accuracy, output stability
- Priority actions: ranked (Critical / Important / Watch / Insight) recommendations generated from your data and Settings targets
- Delivery forecast: projected backlog clear date from the last 28 days of throughput
- Charts: throughput control chart (mean +/- 1 sigma), delivery quality trend vs target, turnaround distribution, member performance map (output vs reliability), estimated vs actual hours
- Tables: priority performance, workload distribution vs cap, slippage watchlist (days late)
- Excel export now adds Exec KPIs, Weekly Trend, Priority Performance and Workload sheets (ignored on import)
- Fully theme-aware (light / dark) and included in Print report

Landing page
- landing.html: marketing / entry page. Open it first; every "Create workspace" button opens index.html, where the first-run setup creates the workspace.
- Keep landing.html and index.html in the same folder. Needs internet only for the Google Fonts (falls back to system fonts offline).

Settings > Erase all data now returns you to landing.html. The setup screen also has a 'Back to home' link.

Landing page v2 - liquid glass and motion
- Floating glass navigation with scroll progress bar, frosted-glass cards with cursor spotlight, drifting colour orbs behind the glass (with scroll parallax)
- Hero: word-by-word headline entrance, 3D tilt on the dashboard preview, floating glass badges, count-up numbers, animated ring, bars and line chart
- Sections reveal as you scroll; buttons have a light sweep; the final call-to-action pulses gently
- Respects the "reduce motion" system setting (animations are turned off automatically)
