// Tiny proxy that injects an auto-login script into Bulwark's HTML responses.
// Sits between Caddy (:4000) and Bulwark (:3000), listens on :3001.
const http = require("http");

const SCRIPT = `<script>
(function(){
  if(!location.pathname.includes("/login"))return;
  var u=sessionStorage.getItem("_alu");
  var p=sessionStorage.getItem("_alp");
  if(!u||!p)return;
  sessionStorage.removeItem("_alu");
  sessionStorage.removeItem("_alp");
  var iv=setInterval(function(){
    var e=document.getElementById("username");
    var pw=document.getElementById("password");
    if(!e||!pw)return;
    clearInterval(iv);
    var s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;
    s.call(e,u);e.dispatchEvent(new Event("input",{bubbles:true}));
    s.call(pw,p);pw.dispatchEvent(new Event("input",{bubbles:true}));
    setTimeout(function(){
      var b=document.querySelector('button[type="submit"]');
      if(b)b.click();
    },400);
  },200);
})();
</script>`;

http.createServer((req, res) => {
  const opts = {
    hostname: "127.0.0.1",
    port: 3000,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, "accept-encoding": "identity" },
  };
  const p = http.request(opts, (pr) => {
    const ct = pr.headers["content-type"] || "";
    if (!ct.includes("text/html")) {
      res.writeHead(pr.statusCode, pr.headers);
      pr.pipe(res);
      return;
    }
    let body = "";
    pr.on("data", (c) => (body += c));
    pr.on("end", () => {
      body = body.replace("</head>", SCRIPT + "</head>");
      const h = { ...pr.headers };
      h["content-length"] = Buffer.byteLength(body);
      delete h["transfer-encoding"];
      res.writeHead(pr.statusCode, h);
      res.end(body);
    });
  });
  p.on("error", () => {
    res.writeHead(502);
    res.end("upstream not ready");
  });
  req.pipe(p);
}).listen(3001, "::");
