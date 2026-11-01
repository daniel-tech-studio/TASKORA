#!/usr/bin/env bash
# Affiche l'adresse publique actuelle du tunnel Cloudflare (change à chaque redémarrage du tunnel).
cd "$(dirname "$0")"
for _ in $(seq 1 30); do
  URL=$(docker compose logs tunnel 2>/dev/null | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1)
  if [ -n "$URL" ]; then echo "$URL"; exit 0; fi
  sleep 2
done
echo "Adresse introuvable : docker compose logs tunnel" >&2
exit 1
