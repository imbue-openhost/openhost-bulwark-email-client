#!/bin/sh
set -e

# Owner-login handler (:3001)
node /app/owner-login.js &

# JMAP consumer proxy (:3002) — translates vanilla JMAP requests into
# openhost v2 service proxy calls with bearer auth + service headers.
node /app/jmap-consumer.js &

# Caddy reverse proxy (:4000 -> :3000 + :3001 + :3002)
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &

# Bulwark (:3000)
exec node /app/server.js
