# Plain static files (HTML, CSS, ES modules); nothing to compile, so this is
# a single stage that copies the site into nginx.
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="gcloud cheat sheet" \
      org.opencontainers.image.description="Google Cloud CLI cheat sheet with ready-to-copy gcloud commands." \
      org.opencontainers.image.source="https://github.com/aafanasev-dev/gcloud_cheatsheet"

COPY nginx.conf  /etc/nginx/conf.d/default.conf
COPY index.html favicon.svg /usr/share/nginx/html/
COPY css/        /usr/share/nginx/html/css/
COPY js/         /usr/share/nginx/html/js/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/healthz || exit 1
