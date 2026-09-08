#!/usr/bin/env bash
# Creates a dated local snapshot of the JSON datastore and participant CSV.
# The real-time CSV is still written by server.ts after every registration.
set -Eeuo pipefail
umask 077

DATA_DIR="${DATA_DIR:-/var/lib/anvation}"
BACKUP_DIR="${BACKUP_DIR:-${DATA_DIR}/backups}"
SNAPSHOT_ROOT="${BACKUP_DIR}/snapshots"
STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
SNAPSHOT_DIR="${SNAPSHOT_ROOT}/${STAMP}"

install -d -m 700 "${SNAPSHOT_DIR}"

copied=0
for source_file in "${DATA_DIR}/server-data.json" "${BACKUP_DIR}/participant-registration-backup.csv"; do
  if [[ -f "${source_file}" ]]; then
    cp --preserve=mode,timestamps "${source_file}" "${SNAPSHOT_DIR}/$(basename "${source_file}")"
    copied=$((copied + 1))
  fi
done

if [[ "${copied}" -eq 0 ]]; then
  rmdir "${SNAPSHOT_DIR}"
  echo "No ANVATION data files exist yet; snapshot skipped." >&2
  exit 0
fi

printf 'created_at_utc=%s\nfiles_copied=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${copied}" > "${SNAPSHOT_DIR}/manifest.txt"
echo "Local ANVATION snapshot created: ${SNAPSHOT_DIR}"
