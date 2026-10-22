<div align="center">

# MISphere

**Team performance, tasks and daily notes — in one fast, private dashboard.**

![Version](https://img.shields.io/badge/version-10.1.0-4f46e5)
![Licence](https://img.shields.io/badge/licence-All%20Rights%20Reserved-red)
![No backend](https://img.shields.io/badge/backend-none-0a84ff)
![Data](https://img.shields.io/badge/data-stays%20in%20your%20browser-30d158)

</div>

MISphere helps a team lead run a department week by week: assign and track tasks, see who delivers on time, review insights and keep daily notes. It is a static web app (plain HTML, CSS and JavaScript) with no server, no login and no build step.

## Highlights

- **Home** — weekly KPIs with week-over-week change, a "needs attention" panel, team cards and the leader of the week.
- **Tasks** — create, edit and track tasks with module, priority, estimate, progress and an office-hours timer. *By day* and drag-and-drop *Board* views, status tiles, and a filter toolbar (search, member, status, priority, due, sort) with one-click reset and **Export view** to CSV.
- **Insights** — Overview, Team, Modules and Executive sections built from line and bar charts, with health score, key findings, backlog burn, member scorecard, delivery forecast and 1 / 4 / 12 / 26 week periods.
- **Daily notes** — day-wise key points with must-do stars, streak, tasks due and unfinished-point carry-over.
- **Members** — one **Admin**, everyone else a **Member**. The weekly **leader** is chosen from the members, and leader history is kept.
- **Modules** — tag every task to a module (Sales, Inventory, HR and more, fully editable) and report per module.
- **Reports and data** — Excel import / export (with a styled blank template), CSV week report, JSON backup, and a print-ready report.
- **Design** — iOS-style liquid-glass interface, light / dark / auto theme, accent colours, command palette (`Ctrl/Cmd + K`), keyboard shortcuts (`1`–`9` pages, `/` search, `?` help).
- **Updates** — one-click updates read from `version.json`; your data is never touched by an update.

## Quick start

1. Download or clone this repository.
2. Open `landing.html` (or `index.html` directly) in Chrome, Edge, Safari or Firefox.
3. Choose **Create workspace**, pick a template and add your team.

Excel features load SheetJS from a CDN and need an internet connection. Everything else works offline.

### Publish with GitHub Pages

Settings → Pages → deploy from the `main` branch (root). Keep `landing.html`, `index.html`, `version.json` and `favicon.svg` in the same folder. To ship an update, upload the new `index.html`, raise `APP_VERSION` inside it and edit `version.json`; open dashboards will offer **Update now**.

## Your data

Data lives in the browser's `localStorage` on the device where it was entered. Download a backup (Reports → Backup download) or an Excel export every week. Clearing browser data erases it.

### Optional: sync to GitHub

Settings → **Live sync to GitHub** commits every change to one JSON file in a repository, so the same data opens on other devices. Three ways to connect:

| Method | Token in browser? | Notes |
|---|---|---|
| Cloudflare Worker (recommended) | No | Token stays in Cloudflare. Follow [`worker/DEPLOY.txt`](worker/DEPLOY.txt). |
| Personal access token | Yes (this browser only) | Fine-grained token, one repository, Contents: read and write. |
| Auto-save to a file | No | Chrome / Edge; choose a file inside your local repository folder. |

> **Use a private repository for real data.** In a public repository anyone can read the data file. See [SECURITY.md](SECURITY.md).

## Repository layout

```
index.html                    the dashboard (all CSS and JS inline)
landing.html                  entry page
version.json                  version and release notes for the updater
favicon.svg                   icon
MIS-Task-Import-Template.xlsx blank Excel import template
worker/                       optional Cloudflare Worker for GitHub sync
CHANGELOG.md                  release history
SECURITY.md  CONTRIBUTING.md  LICENSE  THIRD_PARTY_NOTICES.md
```

## Browser support

Current Chrome, Edge, Safari and Firefox. Glass effects degrade gracefully with reduced-motion and reduced-transparency settings. Auto-save to a file needs Chrome or Edge.

## Security

Please report vulnerabilities privately; see [SECURITY.md](SECURITY.md). Note that Admin and Member are organisational labels, not a login system.

## Licence and copyright

Copyright © 2026 YOUR NAME. **All rights reserved.**

This is proprietary software. No permission is given to copy, modify, distribute, host or reuse it without written consent. See [LICENSE](LICENSE). Third-party components keep their own licences: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Questions about permission or commercial use: contact the owner through the GitHub profile.
