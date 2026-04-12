FROM ghcr.io/bulwarkmail/webmail:latest

ENV JMAP_SERVER_URL=https://email.host.zackpolizzi.com
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000
