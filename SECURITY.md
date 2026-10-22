# Security Policy

## Supported versions

Only the latest release (see `version.json`) receives security fixes. Please update before reporting.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

1. Open the repository's **Security** tab → **Report a vulnerability** (GitHub private vulnerability reporting), or
2. Contact the owner through the details on the GitHub profile.

Please include: what you found, steps to reproduce, the affected version and browser, and the impact you expect. We aim to acknowledge reports within 5 working days and to keep you updated until the issue is fixed. Please give us reasonable time to fix it before any public disclosure.

## How MISphere handles data (read this before deploying)

- MISphere is a **browser-only app**. Data is kept in the browser's `localStorage` on the device that entered it. Clearing browser data erases it, so download a backup regularly.
- **Admin and Member are organisational labels, not a security boundary.** There is no login. Anyone with access to the page on that device can change the data.
- **Live sync to GitHub writes your data into a file in your repository.** If the repository is public, anyone can read that file. Use a **private** repository (or a separate private data repository) for real data.
- The optional **Cloudflare Worker** keeps the GitHub token as a secret and can touch only one file in one repository. Set `ALLOWED_ORIGIN` to your site instead of `*`, use a fine-grained token limited to that one repository (Contents: read and write), and rotate `MIS_KEY` if it is ever exposed.
- If you place the Worker URL and access code in `PRESET_WORKER` inside `index.html`, they become visible in the page source. Anyone who finds them can overwrite the data file. Keep the repository private, or leave `PRESET_WORKER` empty and enter the details in Settings.
- **Never commit tokens, keys or `.dev.vars` files.** The included `.gitignore` excludes the common ones.
- Excel and JSON imports are validated, but you should only import files you trust.

## Out of scope

Social engineering, denial-of-service, issues that need physical access to an unlocked device, vulnerabilities in third-party services (GitHub, Cloudflare, Google Fonts, cdnjs) and findings that apply only to unsupported versions.
