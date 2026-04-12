// Serves /owner-login as an HTML page that:
// 1. Calls Bulwark's /api/auth/session to create an encrypted session cookie
// 2. Sets localStorage so Bulwark's Zustand store knows to restore from the cookie
// 3. Redirects to /en
// Listens on :3001, proxied by Caddy on :4000.
const http = require("http");

const JMAP_SERVER = process.env.JMAP_SERVER_URL || "https://email.host.zackpolizzi.com";
const JMAP_USER = process.env.OWNER_EMAIL_USER || "owner";
const JMAP_PASS = process.env.OWNER_EMAIL_PASSWORD || "openhost-owner-email";

const PAGE = `<!DOCTYPE html>
<html>
<head><title>Signing in...</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc}p{color:#64748b}</style>
</head>
<body>
<p>Signing in...</p>
<script>
(async function(){
  var serverUrl=${JSON.stringify(JMAP_SERVER)};
  var username=${JSON.stringify(JMAP_USER)};
  var password=${JSON.stringify(JMAP_PASS)};
  var accountId=username+"@"+serverUrl.replace("https://","");

  try {
    var r=await fetch("/api/auth/session?slot=0",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({serverUrl:serverUrl,username:username,password:password,slot:0})
    });
    if(!r.ok) throw new Error("session API: "+r.status);

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
