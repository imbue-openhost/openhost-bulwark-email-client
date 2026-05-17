// Consumer-side JMAP proxy: translates vanilla JMAP requests into openhost
// v2 service proxy calls.  Listens on localhost:3002, called by Caddy when
// the browser (or Bulwark server-side) hits /jmap-proxy/*.
//
// For /.well-known/jmap responses, rewrites Stalwart's URLs so the browser
// calls back through this proxy rather than hitting Stalwart directly.

const http = require("http");
const { URL } = require("url");

const ROUTER_URL = process.env.OPENHOST_ROUTER_URL || "http://host.containers.internal:8080";
const APP_TOKEN = process.env.OPENHOST_APP_TOKEN || "";
const APP_NAME = process.env.OPENHOST_APP_NAME || "webmail";
const ZONE_DOMAIN = process.env.OPENHOST_ZONE_DOMAIN || "host.zackpolizzi.com";

const SHORTNAME = "jmap";

// Keep the `/jmap` suffix in rewritten URLs so the router's
// /api/services/v2/call/<shortname>/<path:rest> route always sees a non-empty
// rest (apiUrl '/jmap/' would otherwise collapse to empty rest and 404).
const PUBLIC_BASE = `https://${APP_NAME}.${ZONE_DOMAIN}/jmap-proxy/jmap`;
const PUBLIC_WS_BASE = `wss://${APP_NAME}.${ZONE_DOMAIN}/jmap-proxy/jmap`;

const routerParsed = new URL(ROUTER_URL);
const SERVICE_CALL_PREFIX = `/api/services/v2/call/${SHORTNAME}`;

function rewriteSessionUrls(body) {
  // Replace https://any-host/jmap with our public proxy base
  body = body.replace(/https?:\/\/[^/"\s]+\/jmap(?=[/"\s])/g, PUBLIC_BASE);
  // Replace wss://any-host/jmap with our websocket proxy base
  body = body.replace(/wss?:\/\/[^/"\s]+\/jmap(?=[/"\s])/g, PUBLIC_WS_BASE);
  return body;
}

const server = http.createServer(async (req, res) => {
  const endpoint = req.url || "/";

  const headers = { ...req.headers };
  delete headers.host;
  delete headers["content-length"];
  headers["Authorization"] = `Bearer ${APP_TOKEN}`;

  const isSession = endpoint === "/.well-known/jmap";
  const targetPath = SERVICE_CALL_PREFIX + (endpoint.startsWith("/") ? endpoint : "/" + endpoint);

  const proxyReq = http.request(
    {
      hostname: routerParsed.hostname,
      port: routerParsed.port,
      path: targetPath,
      method: req.method,
      headers: headers,
    },
    (proxyRes) => {
      if (isSession && proxyRes.statusCode === 200) {
        // Buffer and rewrite session response
        const chunks = [];
        proxyRes.on("data", (c) => chunks.push(c));
        proxyRes.on("end", () => {
          let body = Buffer.concat(chunks).toString("utf-8");
          body = rewriteSessionUrls(body);
          const responseHeaders = {};
          for (const [k, v] of Object.entries(proxyRes.headers)) {
            const kl = k.toLowerCase();
            if (kl === "transfer-encoding" || kl === "connection") continue;
            responseHeaders[k] = v;
          }
          responseHeaders["content-length"] = Buffer.byteLength(body);
          res.writeHead(proxyRes.statusCode, responseHeaders);
          res.end(body);
        });
      } else {
        // Stream response through
        const responseHeaders = {};
        for (const [k, v] of Object.entries(proxyRes.headers)) {
          const kl = k.toLowerCase();
          if (kl === "transfer-encoding" || kl === "connection") continue;
          responseHeaders[k] = v;
        }
        res.writeHead(proxyRes.statusCode, responseHeaders);
        proxyRes.pipe(res);
      }
    }
  );

  proxyReq.on("error", (err) => {
    console.error("JMAP consumer proxy error:", err.message);
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "upstream_unavailable" }));
    }
  });

  // Pipe request body through
  req.pipe(proxyReq);
});

server.listen(3002, "127.0.0.1", () => {
  console.log("JMAP consumer proxy listening on 127.0.0.1:3002");
});
