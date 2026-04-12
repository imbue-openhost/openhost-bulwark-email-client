#!/bin/sh
set -e

# Owner-login handler (:3001)
node /app/owner-login.js &

# Caddy reverse proxy (:4000 -> :3000 + :3001)
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &

# Bulwark (:3000)
exec node /app/server.js
