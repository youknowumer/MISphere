// MISphere → GitHub bridge (Cloudflare Worker)
// The GitHub token lives ONLY here (secret GH_TOKEN). The browser sends an access code (MIS_KEY) instead.
// The Worker can read/write exactly ONE file in ONE repository: GH_OWNER/GH_REPO @ GH_BRANCH : GH_PATH.
const MAX_BODY = 6 * 1024 * 1024;

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allow = !env.ALLOWED_ORIGIN || env.ALLOWED_ORIGIN === "*" ? "*" : env.ALLOWED_ORIGIN;
    const cors = {
      "Access-Control-Allow-Origin": allow,
      "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
      "Access-Control-Allow-Headers": "X-MIS-Key,Content-Type,Accept,X-GitHub-Api-Version",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (allow !== "*" && origin && origin !== allow) return json({ message: "Origin not allowed" }, 403);
    if (!env.MIS_KEY || req.headers.get("X-MIS-Key") !== env.MIS_KEY) return json({ message: "Bad access code" }, 401);
    if (!env.GH_TOKEN || !env.GH_OWNER || !env.GH_REPO) return json({ message: "Worker is not configured (GH_TOKEN / GH_OWNER / GH_REPO)" }, 500);

    const branch = env.GH_BRANCH || "main", path = (env.GH_PATH || "data/mis-data.json").replace(/^\/+/, "");
    const api = `https://api.github.com/repos/${encodeURIComponent(env.GH_OWNER)}/${encodeURIComponent(env.GH_REPO)}`;
    const gh = (url, init = {}) => fetch(url, { ...init, headers: {
      Authorization: "Bearer " + env.GH_TOKEN, "User-Agent": "misphere-worker", "X-GitHub-Api-Version": "2022-11-28",
      Accept: (init.headers && init.headers.Accept) || "application/vnd.github+json", ...(init.body ? { "Content-Type": "application/json" } : {}) } });
    const pass = async r => new Response(await r.text(), { status: r.status, headers: { ...cors, "Content-Type": r.headers.get("Content-Type") || "application/json" } });
    const url = new URL(req.url);

    // connection test: never reveals the token
    if (url.pathname === "/repo" && req.method === "GET") {
      const r = await gh(api);
      if (!r.ok) return pass(r);
      const j = await r.json();
      return json({ private: j.private, permissions: { push: !!(j.permissions && j.permissions.push) }, owner: env.GH_OWNER, repo: env.GH_REPO, branch, path });
    }
    // the data file (path and branch are fixed by the Worker, whatever the browser sends)
    if (url.pathname === "/file") {
      const target = `${api}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
      if (req.method === "GET") return pass(await gh(`${target}?ref=${encodeURIComponent(branch)}`, { headers: { Accept: req.headers.get("Accept") || "application/vnd.github+json" } }));
      if (req.method === "PUT") {
        const text = await req.text();
        if (text.length > MAX_BODY) return json({ message: "Payload too large" }, 413);
        let b; try { b = JSON.parse(text); } catch { return json({ message: "Invalid JSON" }, 400); }
        const body = { message: String(b.message || "MIS data update").slice(0, 200), content: b.content, branch };
        if (b.sha) body.sha = b.sha;
        return pass(await gh(target, { method: "PUT", body: JSON.stringify(body) }));
      }
    }
    return json({ message: "Not found" }, 404);
  },
};
