// MISphere desktop shell (Electron). © 2026 Muhammad Umer Faheem. All rights reserved.
// The app is served from a fixed custom origin (misphere://app) so your data (localStorage) always stays in the same place.
const { app, BrowserWindow, Menu, shell, protocol, net, nativeTheme, dialog } = require("electron");
const path = require("path"), fs = require("fs"), { pathToFileURL } = require("url");

protocol.registerSchemesAsPrivileged([{ scheme: "misphere", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
if (!app.requestSingleInstanceLock()) app.quit();

const ROOT = path.join(__dirname, "app");
const stateFile = () => path.join(app.getPath("userData"), "window.json");
const loadState = () => { try { return JSON.parse(fs.readFileSync(stateFile(), "utf8")); } catch { return {}; } };
let win;

function createWindow() {
  const st = loadState();
  win = new BrowserWindow({
    width: st.width || 1360, height: st.height || 880, x: st.x, y: st.y, minWidth: 380, minHeight: 560,
    title: "MISphere", show: false, autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#000000" : "#f2f2f7",
    icon: path.join(ROOT, "icons", "icon-512.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: true, spellcheck: false }
  });
  if (st.max) win.maximize();
  win.once("ready-to-show", () => win.show());
  win.loadURL("misphere://app/index.html");
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("misphere://")) return { action: "allow" };
    if (/^(https?|mailto):/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("misphere://")) { e.preventDefault(); if (/^(https?|mailto):/.test(url)) shell.openExternal(url); } });
  const save = () => { if (!win || win.isDestroyed()) return; const b = win.getNormalBounds(); try { fs.writeFileSync(stateFile(), JSON.stringify({ ...b, max: win.isMaximized() })); } catch {} };
  win.on("close", save);
  // MISphere asks before closing when changes are not backed up; the desktop shell must answer that request itself
  win.webContents.on("will-prevent-unload", e => {
    const c = dialog.showMessageBoxSync(win, { type: "warning", buttons: ["Stay and back up", "Close anyway"], defaultId: 0, cancelId: 0, title: "MISphere", message: "Your data isn’t backed up", detail: "MISphere keeps your data only on this device. Save a backup first so nothing is lost." });
    if (c === 1) e.preventDefault();
  });
}

app.whenReady().then(() => {
  protocol.handle("misphere", req => {
    const u = new URL(req.url); let p = decodeURIComponent(u.pathname); if (p === "/" || p === "") p = "/index.html";
    const file = path.normalize(path.join(ROOT, p));
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
    { label: "View", submenu: [{ role: "reload" }, { role: "togglefullscreen" }, { type: "separator" }, { role: "zoomIn" }, { role: "zoomOut" }, { role: "resetZoom" }] },
    { label: "Window", submenu: [{ role: "minimize" }, { role: "close" }] },
    { label: "Help", submenu: [{ label: "MISphere landing page", click: () => win && win.loadURL("misphere://app/landing.html") }, { role: "toggleDevTools" }] }
  ]));
  createWindow();
  app.on("activate", () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
