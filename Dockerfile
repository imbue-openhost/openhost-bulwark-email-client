FROM ghcr.io/bulwarkmail/webmail:latest

USER root
RUN apk add --no-cache caddy
USER nextjs

ENV JMAP_SERVER_URL=https://email.host.zackpolizzi.com
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY Caddyfile /etc/caddy/Caddyfile
COPY owner-login.html /app/static/owner-login.html
COPY inject-proxy.js /app/inject-proxy.js
COPY entrypoint.sh /app/entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
