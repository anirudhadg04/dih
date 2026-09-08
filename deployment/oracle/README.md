# Oracle Cloud Always Free deployment and backup runbook

This package runs ANVATION on one Ubuntu 24.04 Oracle Cloud Always Free VM.
The application process is restarted automatically after a crash or VM reboot.
It is a single-server setup: it improves operational reliability, but it is not
high availability across two data centres.

## What is protected

The server writes one row per participant to this file *before* a successful
registration response is returned:

```
/var/lib/anvation/backups/participant-registration-backup.csv
```

The CSV is append-only during normal operation, includes the participants'
contact, college, registration, accommodation, GitHub, LinkedIn, and payment
reference details, uses safe Excel-compatible CSV escaping, and never includes
access passwords or payment screenshots. On its first start, it is seeded from
`server-data.json` if records already exist.

A systemd timer also creates one local dated snapshot per day:

```
/var/lib/anvation/backups/snapshots/<UTC timestamp>/
```

Each snapshot contains the JSON datastore and the CSV backup. The files are
private to the `anvation` service account; they are deliberately **not** made
available through a public URL because they contain participant personal data.

## Before starting

1. Create an Oracle Cloud Always Free Ubuntu 24.04 VM. An Ampere A1 VM with 2
   OCPUs and 12 GB RAM is the recommended starting size.
2. Assign it a public IPv4 address and choose a domain, for example
   `anvation.example.edu`.
3. Add the domain's DNS A record pointing to the VM's public IP address.
4. In Oracle Cloud's security list/network security group, allow inbound TCP
   ports `80` and `443` from the internet. Allow port `22` only from trusted
   organiser IP addresses. Do not open port `3001` or `3002` publicly.
5. Copy the repository to the VM (using a private Git repository or `scp`) and
   log in over SSH. The commands below assume it is in `~/anvation-source`.

## One-time server setup

From the source checkout on the Ubuntu VM, run this command with the actual
domain substituted:

```bash
cd ~/anvation-source
sudo DOMAIN=anvation.example.edu bash deployment/oracle/provision-server.sh
```

The script installs Node.js 22, Caddy, the `anvation` system account, systemd
units, and a private data directory at `/var/lib/anvation`. Caddy automatically
obtains and renews HTTPS once the DNS record points to the VM.

Review and, if needed, edit the protected runtime configuration:

```bash
sudo nano /etc/anvation/anvation.env
```

Use this file for SMTP credentials. Do not put credentials in the repository.

## Deploy the site

Still from the source checkout, run:

```bash
sudo bash deployment/oracle/deploy-app.sh
```

This installs dependencies, builds the production bundle, copies code to
`/opt/anvation`, starts the website service, and enables the daily snapshot.
It explicitly leaves `/var/lib/anvation` untouched, so a code update cannot
overwrite registrations or backups.

Verify the deployment:

```bash
curl -fsS http://127.0.0.1:3001/api/health
sudo systemctl status anvation.service
sudo systemctl list-timers anvation-backup.timer
```

## Retrieve the backup without using the Admin Portal

From an organiser's computer, download the live CSV over SSH/SCP. Replace the
server user and IP address:

```powershell
scp ubuntu@203.0.113.10:/var/lib/anvation/backups/participant-registration-backup.csv .
```

This creates a CSV download on that computer. It is a manual, authenticated
download; registration never triggers an unwanted browser download on an
organiser's machine.

On the server, these commands show whether the backup is present and current:

```bash
sudo ls -lh /var/lib/anvation/backups/participant-registration-backup.csv
sudo wc -l /var/lib/anvation/backups/participant-registration-backup.csv
sudo systemctl start anvation-backup.service
```

## Event-day checks

Before opening registrations, make one test registration and confirm that its
participant rows appear in the CSV. Then delete the test registration only if
you deliberately want it removed from the application; the append-only backup
will retain the record as an audit trail.

Monitor the following during the registration window:

```bash
sudo journalctl -u anvation.service -f
df -h /var/lib/anvation
free -h
```

The core site should be load-tested before an event with 500 simultaneous
visitors, especially because payment screenshots make registration requests
much larger than normal logins.
