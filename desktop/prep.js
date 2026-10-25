// Copies the web app (one folder up) into ./app and the icon into ./build, ready for Electron.
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), out = path.join(__dirname, "app");
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
for (const f of ["index.html", "landing.html", "version.json", "favicon.svg", "manifest.webmanifest", "MIS-Task-Import-Template.xlsx", "LICENSE"])
  if (fs.existsSync(path.join(root, f))) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const d of ["vendor", "icons"]) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
fs.mkdirSync(path.join(__dirname, "build"), { recursive: true });
fs.copyFileSync(path.join(root, "icons", "icon-1024.png"), path.join(__dirname, "build", "icon.png"));
console.log("App files ready in desktop/app");
