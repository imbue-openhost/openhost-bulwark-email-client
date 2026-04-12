#!/bin/sh
set -e

# Start Caddy (auto-login + proxy on :4000 -> Bulwark on :3000) in background
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &

# Start Bulwark
exec node /app/server.js
