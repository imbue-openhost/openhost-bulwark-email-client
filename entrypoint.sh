#!/bin/sh
set -e

# Start inject proxy (auto-login script injection, :3001 -> :3000)
node /app/inject-proxy.js &

# Start Caddy (:4000 -> :3001)
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &

# Start Bulwark (:3000)
exec node /app/server.js
