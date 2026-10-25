// Marks the page as running inside the desktop app (the web app hides its "Install app" button).
window.addEventListener("DOMContentLoaded", () => document.documentElement.classList.add("standalone", "desktop"));
