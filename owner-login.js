// Serves /owner-login as an HTML page that:
// 1. Calls Bulwark's /api/auth/session to create an encrypted session cookie
// 2. Sets localStorage so Bulwark's Zustand store knows to restore from the cookie
// 3. Redirects to /en
// Listens on :3001, proxied by Caddy on :4000.
const http = require("http");

const APP_NAME = process.env.OPENHOST_APP_NAME || "webmail";
const ZONE_DOMAIN = process.env.OPENHOST_ZONE_DOMAIN || "host.zackpolizzi.com";
const JMAP_USER = process.env.OWNER_EMAIL_USER || "owner";
const JMAP_PASS = process.env.OWNER_EMAIL_PASSWORD || "openhost-owner-email";

// Server-side: Bulwark validates creds against this URL (hits localhost Caddy -> sidecar -> service proxy).
// The sidecar injects owner auth, so the password here is just a placeholder that gets stripped.
const LOCAL_JMAP = "http://localhost:4000/jmap-proxy";
// Browser-side: the JMAP client in the browser uses this URL (goes through openhost router with owner cookie).
const PUBLIC_JMAP = `https://${APP_NAME}.${ZONE_DOMAIN}/jmap-proxy`;

const PAGE = `<!DOCTYPE html>
<html>
<head><title>Signing in...</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc}p{color:#64748b}</style>
</head>
<body>
<p>Signing in...</p>
<script>
(async function(){
  var localServerUrl=${JSON.stringify(LOCAL_JMAP)};
  var publicServerUrl=${JSON.stringify(PUBLIC_JMAP)};
  var username=${JSON.stringify(JMAP_USER)};
  var password=${JSON.stringify(JMAP_PASS)};
  var accountId=username+"@"+publicServerUrl.replace("https://","");

  try {
    var r=await fetch("/api/auth/session?slot=0",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({serverUrl:localServerUrl,username:username,password:password,slot:0})
    });
    if(!r.ok) throw new Error("session API: "+r.status);

    localStorage.setItem("auth-storage",JSON.stringify({
      state:{serverUrl:publicServerUrl,username:username,authMode:"basic",
             rememberMe:true,isAuthenticated:true,activeAccountId:accountId},
      version:0
    }));
    localStorage.setItem("account-registry",JSON.stringify({
      state:{accounts:[{label:username,serverUrl:publicServerUrl,username:username,
             authMode:"basic",rememberMe:true,displayName:username,email:username,
             lastLoginAt:Date.now(),isConnected:true,hasError:false,isDefault:true,
             id:accountId,cookieSlot:0,avatarColor:"#3b82f6"}],
             activeAccountId:accountId,defaultAccountId:accountId},
      version:0
    }));
    localStorage.setItem("webmail_usernames",JSON.stringify([username]));
    window.location.replace("/en");
  } catch(e) {
    document.querySelector("p").textContent="Login failed: "+e.message;
    setTimeout(function(){window.location.replace("/en/login")},2000);
  }
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
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(PAGE);
}).listen(3001, "::");
