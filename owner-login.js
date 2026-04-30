// Serves /owner-login: forges Bulwark's encrypted session cookie directly
// (bypassing /api/auth/session which has an SSRF guard blocking localhost),
// sets localStorage for the Zustand store, and redirects to /en.
//
// The cookie format matches Bulwark's session module: AES-256-GCM encrypted
// JSON {v:1, serverUrl, username, password}, keyed by SHA-256(SESSION_SECRET).
const http = require("http");
const crypto = require("crypto");

const APP_NAME = process.env.OPENHOST_APP_NAME || "webmail";
const ZONE_DOMAIN = process.env.OPENHOST_ZONE_DOMAIN || "host.zackpolizzi.com";
const JMAP_USER = process.env.OWNER_EMAIL_USER || "owner";
const JMAP_PASS = process.env.OWNER_EMAIL_PASSWORD || "openhost-owner-email";
const SESSION_SECRET = process.env.SESSION_SECRET || "";

const PUBLIC_JMAP = `https://${APP_NAME}.${ZONE_DOMAIN}/jmap-proxy`;

function encryptSession(serverUrl, username, password) {
  const key = crypto.createHash("sha256").update(SESSION_SECRET).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = JSON.stringify({ v: 1, serverUrl, username, password });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function encryptPayload(obj) {
  const key = crypto.createHash("sha256").update(SESSION_SECRET).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = JSON.stringify(obj);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

// Pre-compute cookie values at startup (they don't change)
const sessionCookie = encryptSession(PUBLIC_JMAP, JMAP_USER, JMAP_PASS);
const authHeader = `Basic ${Buffer.from(`${JMAP_USER}:${JMAP_PASS}`).toString("base64")}`;
const stalwartCtx = encryptPayload({ serverUrl: PUBLIC_JMAP, username: JMAP_USER, authHeader });

const COOKIE_OPTS = "Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000";

const PAGE = `<!DOCTYPE html>
<html>
<head><title>Signing in...</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc}p{color:#64748b}</style>
</head>
<body>
<p>Signing in...</p>
<script>
(function(){
  var serverUrl=${JSON.stringify(PUBLIC_JMAP)};
  var username=${JSON.stringify(JMAP_USER)};
  var accountId=username+"@"+serverUrl.replace("https://","");

  localStorage.setItem("auth-storage",JSON.stringify({
    state:{serverUrl:serverUrl,username:username,authMode:"basic",
           rememberMe:true,isAuthenticated:true,activeAccountId:accountId},
    version:0
  }));
  localStorage.setItem("account-registry",JSON.stringify({
    state:{accounts:[{label:username,serverUrl:serverUrl,username:username,
           authMode:"basic",rememberMe:true,displayName:username,email:username,
           lastLoginAt:Date.now(),isConnected:true,hasError:false,isDefault:true,
           id:accountId,cookieSlot:0,avatarColor:"#3b82f6"}],
           activeAccountId:accountId,defaultAccountId:accountId},
    version:0
  }));
  localStorage.setItem("webmail_usernames",JSON.stringify([username]));
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
    "Set-Cookie": [
      `jmap_session=${sessionCookie}; ${COOKIE_OPTS}`,
      `jmap_stalwart_ctx=${stalwartCtx}; ${COOKIE_OPTS}`,
    ],
  });
  res.end(PAGE);
}).listen(3001, "::");
