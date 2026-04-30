FROM ghcr.io/bulwarkmail/webmail:latest

USER root
RUN apk add --no-cache caddy
USER nextjs

ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV SESSION_SECRET=openhost-bulwark-session-secret-key-do-not-share

COPY Caddyfile /etc/caddy/Caddyfile
COPY owner-login.js /app/owner-login.js
COPY jmap-consumer.js /app/jmap-consumer.js
COPY entrypoint.sh /app/entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
