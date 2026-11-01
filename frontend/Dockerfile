# Interface TASKORA — build Vite servi par nginx, qui proxifie /api vers l'API.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
# CSP : empreinte du script inline anti-flash de thème (aucun 'unsafe-inline' pour les scripts).
RUN node -e "\
const fs=require('fs'),c=require('crypto');\
const html=fs.readFileSync('dist/index.html','utf8');\
const hashes=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>\"'sha256-\"+c.createHash('sha256').update(m[1]).digest('base64')+\"'\");\
const csp=\"default-src 'self'; script-src 'self' \"+hashes.join(' ')+\"; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'\";\
fs.writeFileSync('csp.conf','add_header Content-Security-Policy \"'+csp+'\" always;\n');"

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/csp.conf /etc/nginx/snippets/csp.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
