// Tiny server that handles /owner-login by creating a Bulwark session
// via Bulwark's own /api/auth/session endpoint, then redirecting to /en.
// Listens on :3001, proxied by Caddy on :4000.
const http = require("http");

const JMAP_SERVER = process.env.JMAP_SERVER_URL || "https://email.host.zackpolizzi.com";
const JMAP_USER = process.env.OWNER_EMAIL_USER || "owner";
const JMAP_PASS = process.env.OWNER_EMAIL_PASSWORD || "openhost-owner-email";

http.createServer((req, res) => {
  if (req.url !== "/owner-login") {
    res.writeHead(404);
    res.end();
    return;
  }

  // POST to Bulwark's session API to create an encrypted session cookie
  const body = JSON.stringify({
    serverUrl: JMAP_SERVER,
    username: JMAP_USER,
    password: JMAP_PASS,
    slot: 0,
  });

  const proxy = http.request(
    {
      hostname: "127.0.0.1",
      port: 3000,
      path: "/api/auth/session?slot=0",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    },
    (pr) => {
      if (pr.statusCode === 200) {
        // Forward the Set-Cookie headers from Bulwark, then redirect
        const cookies = pr.headers["set-cookie"] || [];
        res.writeHead(302, {
          Location: "/en",
          "Set-Cookie": cookies,
        });
        res.end();
      } else {
        // Session creation failed — fall through to normal login
        let data = "";
        pr.on("data", (c) => (data += c));
        pr.on("end", () => {
          console.error("[owner-login] session API error:", pr.statusCode, data);
          res.writeHead(302, { Location: "/en/login" });
          res.end();
        });
      }
    }
  );

  proxy.on("error", (err) => {
    console.error("[owner-login] upstream error:", err.message);
    res.writeHead(302, { Location: "/en/login" });
    res.end();
  });

  proxy.end(body);
}).listen(3001, "::");
