# Contributing

MISphere is proprietary software (see [LICENSE](LICENSE)). Code contributions are **by invitation only**: please open an issue and wait for the owner's agreement before sending a pull request.

By submitting a contribution you confirm it is your own work and agree that the owner may use it under section 5 of the licence.

## Bug reports and ideas (welcome)

Use the issue templates. A good report has the app version (Settings → Updates), browser and device, the steps to reproduce, what you expected and what happened. Never paste real team data or tokens; screenshots with names blurred are fine.

## Security issues

Do not use public issues. Follow [SECURITY.md](SECURITY.md).

## Working on the code (for invited contributors)

- The app is two static files: `index.html` (the dashboard, all CSS and JS inline) and `landing.html`. There is no build step. Open the file in a browser to test.
- `worker/` holds the optional Cloudflare Worker.
- Test in **light and dark** themes and at phone width (about 390 px) before sending changes.
- Keep data compatibility: older `localStorage` data, JSON backups and Excel files must keep loading.
- Releasing: raise `APP_VERSION` near the bottom of `index.html`, update `version.json` (version, date, notes, history) and add an entry to `CHANGELOG.md`. Open dashboards then offer the update.
