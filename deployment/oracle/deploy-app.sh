#!/usr/bin/env bash
# Deploy or update this checkout without overwriting persistent registrations.
# Usage (from the repository root): sudo bash deployment/oracle/deploy-app.sh
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script with sudo." >&2
  exit 1
fi

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR="/opt/anvation"
APP_USER="anvation"

if ! id "${APP_USER}" >/dev/null 2>&1; then
  echo "The anvation service user does not exist. Run provision-server.sh first." >&2
  exit 1
fi

# Registrations, environment secrets, and generated backups never come from
# source control and are therefore protected from --delete during upgrades.
rsync -a --delete \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude '.env' \
  --exclude 'server-data.json' \
  --exclude 'server-data.json.tmp' \
  --exclude 'backups/' \
  "${SOURCE_DIR}/" "${APP_DIR}/"

chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"
chmod 0750 "${APP_DIR}/deployment/oracle/"*.sh

runuser -u "${APP_USER}" -- bash -lc "cd '${APP_DIR}' && npm ci && npm run build"

systemctl restart anvation.service
systemctl enable --now anvation-backup.timer
systemctl start anvation-backup.service
systemctl --no-pager --full status anvation.service
