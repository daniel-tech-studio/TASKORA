#!/usr/bin/env bash
# Déploie TASKORA sur le VPS (Docker) : envoie le code, génère les secrets au premier
# déploiement, construit les images, démarre la stack et affiche l'adresse publique.
# Usage : deploy/deploy.sh [hôte-ssh]   (défaut : souven)
set -euo pipefail
HOST="${1:-souven}"
REMOTE_DIR="apps/taskora"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "→ Envoi du code vers $HOST:~/$REMOTE_DIR"
ssh "$HOST" "mkdir -p ~/$REMOTE_DIR"
(cd "$ROOT" && git ls-files -co --exclude-standard -- backend frontend deploy) \
  | grep -v -e '^frontend/e2e/' -e '^backend/test/' \
  | rsync -az --files-from=- "$ROOT/" "$HOST:~/$REMOTE_DIR/"

echo "→ Secrets (générés une seule fois, jamais versionnés)"
ssh "$HOST" "cd ~/$REMOTE_DIR/deploy && if [ ! -f .env ]; then umask 077; \
  printf 'JWT_ACCESS_SECRET=%s\nCSRF_SECRET=%s\n' \"\$(openssl rand -base64 48 | tr -d '\n=+/')\" \"\$(openssl rand -base64 48 | tr -d '\n=+/')\" > .env; \
  echo '  .env créé'; else echo '  .env existant conservé'; fi"

echo "→ Construction et démarrage"
ssh "$HOST" "cd ~/$REMOTE_DIR/deploy && docker compose build --pull && docker compose up -d --remove-orphans"

echo "→ Adresse publique"
ssh "$HOST" "~/$REMOTE_DIR/deploy/url.sh"
