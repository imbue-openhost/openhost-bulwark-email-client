// Serves /owner-login: forges Bulwark's encrypted session cookies directly
// (bypassing /api/auth/session which has an SSRF guard blocking localhost),
// sets localStorage for the Zustand store, and redirects to /en.
//
// Supports multiple accounts via OWNER_EMAIL_ACCOUNTS, a JSON array of
// {user, password} entries. The first entry is the active/default account.
// Falls back to OWNER_EMAIL_USER / OWNER_EMAIL_PASSWORD when the JSON var
// is unset (single-account compatibility with earlier deploys).
//
// Cookie naming follows Bulwark's convention (see route.ts module 21574/47749):
//   slot 0 → jmap_session,        jmap_stalwart_ctx
//   slot N → jmap_session_<N>,    jmap_stalwart_ctx_<N>
const http = require("http");
const crypto = require("crypto");

const APP_NAME = process.env.OPENHOST_APP_NAME || "webmail";
const ZONE_DOMAIN = process.env.OPENHOST_ZONE_DOMAIN || "host.zackpolizzi.com";
const SESSION_SECRET = process.env.SESSION_SECRET || "";

const PUBLIC_JMAP = `https://${APP_NAME}.${ZONE_DOMAIN}/jmap-proxy`;

function loadAccounts() {
  const raw = process.env.OWNER_EMAIL_ACCOUNTS;
  if (raw) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("OWNER_EMAIL_ACCOUNTS must be a non-empty JSON array");
    }
    return parsed.map((a, i) => {
      if (!a || typeof a.user !== "string" || typeof a.password !== "string") {
        throw new Error(`OWNER_EMAIL_ACCOUNTS[${i}] missing user or password`);
      }
      return { user: a.user, password: a.password };
    });
  }
  return [
    {
      user: process.env.OWNER_EMAIL_USER || "owner",
      password: process.env.OWNER_EMAIL_PASSWORD || "openhost-owner-email",
    },
  ];
}

function encryptWithKey(obj) {
  const key = crypto.createHash("sha256").update(SESSION_SECRET).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = JSON.stringify(obj);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

const COOKIE_OPTS = "Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000";

function cookieNames(slot) {
  return slot === 0
    ? { session: "jmap_session", ctx: "jmap_stalwart_ctx" }
    : { session: `jmap_session_${slot}`, ctx: `jmap_stalwart_ctx_${slot}` };
}

const accounts = loadAccounts();

// Pre-compute cookies and per-account registry entries at startup.
const setCookieHeaders = [];
const registryAccounts = [];
const usernames = [];
let activeAccountId = null;

accounts.forEach((acct, slot) => {
  const accountId = `${acct.user}@${PUBLIC_JMAP.replace("https://", "")}`;
  const authHeader = `Basic ${Buffer.from(`${acct.user}:${acct.password}`).toString("base64")}`;

  const sessionCookie = encryptWithKey({
    v: 1,
    serverUrl: PUBLIC_JMAP,
    username: acct.user,
    password: acct.password,
  });
  const ctxCookie = encryptWithKey({
    serverUrl: PUBLIC_JMAP,
    username: acct.user,
    authHeader,
  });

  const { session, ctx } = cookieNames(slot);
  setCookieHeaders.push(`${session}=${sessionCookie}; ${COOKIE_OPTS}`);
  setCookieHeaders.push(`${ctx}=${ctxCookie}; ${COOKIE_OPTS}`);

  usernames.push(acct.user);
  registryAccounts.push({
    label: acct.user,
    serverUrl: PUBLIC_JMAP,
    username: acct.user,
    authMode: "basic",
    rememberMe: true,
    displayName: acct.user,
    email: acct.user,
    lastLoginAt: Date.now(),
    isConnected: true,
    hasError: false,
    isDefault: slot === 0,
    id: accountId,
    cookieSlot: slot,
    avatarColor: "#3b82f6",
  });
  if (slot === 0) activeAccountId = accountId;
});

const firstAccount = registryAccounts[0];
const PAGE = `<!DOCTYPE html>
<html>
<head><title>Signing in...</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc}p{color:#64748b}</style>
</head>
<body>
<p>Signing in...</p>
<script>
(function(){
  localStorage.setItem("auth-storage",JSON.stringify({
    state:{serverUrl:${JSON.stringify(firstAccount.serverUrl)},
           username:${JSON.stringify(firstAccount.username)},
           authMode:"basic",rememberMe:true,isAuthenticated:true,
           activeAccountId:${JSON.stringify(activeAccountId)}},
    version:0
  }));
  localStorage.setItem("account-registry",JSON.stringify({
    state:{accounts:${JSON.stringify(registryAccounts)},
           activeAccountId:${JSON.stringify(activeAccountId)},
           defaultAccountId:${JSON.stringify(activeAccountId)}},
    version:0
  }));
  localStorage.setItem("webmail_usernames",JSON.stringify(${JSON.stringify(usernames)}));
  window.location.replace("/en");
})();
</script>
</body>
</html>`;

http.createServer((req, res) => {
  if (req.url !== "/owner-login") {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, {
    "Content-Type": "text/html",
    "Set-Cookie": setCookieHeaders,
  });
  res.end(PAGE);
}).listen(3001, "::");
