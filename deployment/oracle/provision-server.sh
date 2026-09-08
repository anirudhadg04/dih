#!/usr/bin/env bash
# One-time Ubuntu 24.04 setup for an Oracle Cloud Always Free VM.
# Usage: sudo DOMAIN=anvation.example.com bash deployment/oracle/provision-server.sh
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script with sudo." >&2
  exit 1
fi

DOMAIN="${DOMAIN:-}"
if [[ ! "${DOMAIN}" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "Set DOMAIN to the public domain name, for example: DOMAIN=anvation.example.com" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_USER="anvation"
APP_DIR="/opt/anvation"
DATA_DIR="/var/lib/anvation"
CONFIG_DIR="/etc/anvation"
ENV_FILE="${CONFIG_DIR}/anvation.env"

apt-get update
apt-get install -y ca-certificates curl gnupg caddy rsync

if ! command -v node >/dev/null 2>&1 || ! node --version | grep -Eq '^v(22|23|24)\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! id "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --home-dir "${APP_DIR}" --shell /usr/sbin/nologin "${APP_USER}"
fi

install -d -o "${APP_USER}" -g "${APP_USER}" -m 0755 "${APP_DIR}"
install -d -o "${APP_USER}" -g "${APP_USER}" -m 0700 "${DATA_DIR}" "${DATA_DIR}/backups"
install -d -m 0750 "${CONFIG_DIR}"

if [[ ! -f "${ENV_FILE}" ]]; then
  install -m 0600 "${SCRIPT_DIR}/anvation.env.example" "${ENV_FILE}"
  echo "Created ${ENV_FILE}. Add SMTP settings there if email delivery is needed."
fi

install -m 0644 "${SCRIPT_DIR}/anvation.service" /etc/systemd/system/anvation.service
install -m 0644 "${SCRIPT_DIR}/anvation-backup.service" /etc/systemd/system/anvation-backup.service
install -m 0644 "${SCRIPT_DIR}/anvation-backup.timer" /etc/systemd/system/anvation-backup.timer

sed "s/anvation\.example\.com/${DOMAIN}/g" "${SCRIPT_DIR}/Caddyfile" > /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

systemctl daemon-reload
systemctl enable caddy anvation.service anvation-backup.timer
systemctl restart caddy

echo "Server base setup is complete. Next run:"
echo "  sudo bash deployment/oracle/deploy-app.sh"
echo "Then open firewall ports 80 and 443 in Oracle Cloud and point ${DOMAIN} DNS to this VM."
