# VPS `j2` Read-only Audit

Status: `DONE` (read-only audit run 2026-07-11); deployment decision: `BLOCKED`.

SSH/network permission was explicitly granted for this audit. All probes were read-only; no packages, services, configurations, containers, ports, files, or remote data were changed. Findings are limited to non-sensitive metadata. A local SSH alias is not used as evidence of VPS capability.

## Rules

- Obtain explicit permission before SSH/network access.
- Read-only: do not install packages, restart services, edit configs, create containers, or open ports.
- Do not copy secrets, private keys, environment values, or full proxy configs into this document.

## Checklist

- OS/kernel, CPU, RAM, disk capacity, architecture, and current utilization.
- Docker/Compose availability and non-sensitive container/port inventory.
- Active reverse proxy (Nginx/Caddy/Traefik), TLS automation, domain readiness, and static-file support.
- Ability to configure HTTPS, CSP, COOP, COEP, CORP, WASM MIME type, service-worker scope, immutable assets, and `index.html` no-cache policy.
- Existing ports/conflicts, firewall posture, deployment user permissions, logs, rollback, and backup approach.

## Required output

- Sanitized findings and constraints.
- Pass/fail for SQLite Worker/OPFS headers.
- Recommended deployment topology with rationale.
- Separate implementation task; the audit itself authorizes no changes.

## Sanitized findings

### Host capacity and access

| Area | Finding |
|---|---|
| Kernel / architecture | Linux `4.18.0-477.21.1.lve.1.el8.x86_64`, `x86_64`; accessible release metadata did not identify the distribution. The LVE kernel is consistent with a shared-hosting-style environment. |
| CPU / current load | 32 logical CPUs; load averages were 4.92, 5.59, and 5.82 at the time of audit. |
| Memory | 251 GiB total, 171 GiB available; no swap. |
| Disk | Root XFS filesystem: 3.0 TiB total, 2.1 TiB used (68%), about 992 GiB available. |
| Audit account | A non-root deployment user with no non-interactive `sudo`. It can write its `public_html` and personal `backups` directories. |
| Deployment evidence | The account has a writable document root, user-owned `.htaccess` and `index.html`, user log paths, a personal backup directory, one user crontab entry, and several existing Git working trees. The audit did not read their contents or cron command. |

Capacity is sufficient for a static Gia Phả deployment. This does **not** grant the account server-administration capability.

### Runtime, proxy, TLS, and ports

- Docker and Compose are not installed for the audit account; consequently there is no Docker container inventory and container deployment is not currently available.
- No Nginx, Caddy, Traefik, Apache/httpd, or Docker process/binary was visible to the account. LiteSpeed installation metadata and cPanel-style listener ports are present, but LiteSpeed configuration is owned by another administrative account and is not readable. The active proxy/version and its exact virtual-host configuration are therefore **unverified**, not absent.
- TCP 80 and 443 are already listening. Other hosting/control-plane and mail/database ports also listen globally, including a LiteSpeed-admin-style port. This is a port-conflict constraint: any future self-managed proxy/container must not bind host ports 80/443 (or any observed occupied port) without an administrator-approved migration.
- `systemctl`, `ss`/`netstat`, Docker, UFW, firewalld, and nftables are unavailable in this account's shell. Firewall posture may be enforced by the host/control panel or upstream provider and cannot be determined from this account. No conclusion about internet exposure was made.
- No readable Let's Encrypt/acme metadata or certificate-automation tool was available. A listener on 443 does not prove certificate validity, domain mapping, renewal, or HTTPS policy.

### SQLite Worker / OPFS delivery gate

`01-architecture.md` requires HTTPS and appropriate isolation headers for SQLite Worker/OPFS. The audit result for the **current deployment account** is:

| Requirement | Result | Evidence / constraint |
|---|---|---|
| HTTPS / valid domain certificate | **BLOCKED** | 80/443 listen, but domain mapping, certificate chain, redirect, and renewal cannot be read or validated. |
| CSP | **BLOCKED** | `.htaccess` is writable, but LiteSpeed's per-directory override behavior and existing policy were not tested or read. |
| COOP (`Cross-Origin-Opener-Policy`) | **FAIL (not administratively configurable)** | No accessible proxy/vhost configuration; no existing header configuration could be observed. |
| COEP (`Cross-Origin-Embedder-Policy`) | **FAIL (not administratively configurable)** | Same administrative boundary; cannot guarantee cross-origin isolation. |
| CORP (`Cross-Origin-Resource-Policy`) | **FAIL (not administratively configurable)** | Same administrative boundary; cannot guarantee required resource policy. |
| WASM MIME type | **BLOCKED** | Web-server MIME mapping is not accessible; no production request was made because it would alter access logs. |
| Service-worker scope | **CONDITIONAL** | A writable document root permits placing a worker at site root, but final scope/HTTPS behavior requires deployment verification. |
| Immutable hashed assets / `index.html` no-cache | **BLOCKED** | Requires verified response headers or a documented control-panel rule. No server configuration was changed or tested. |

**Overall gate: FAIL/BLOCKED for the target SQLite Worker/OPFS header contract.** This is an authorization/configuration finding, not a claim that LiteSpeed cannot serve the headers. An administrator who controls the vhost or documented cPanel header rules could make it feasible; that work is outside this audit.

### Logs, rollback, and backup

- The user has log paths and a writable personal backup directory; the exact log retention, backup contents, frequency, restore procedure, and off-host copies were intentionally not inspected and remain unverified.
- Existing Git metadata can support source rollback for some deployed projects, but no deployment history, release procedure, or rollback command was verified.
- No deployment user can inspect or operate host services. Production operations requiring service reloads, certificates, listener changes, or firewall changes require the hosting administrator/control panel.

## Recommended topology

Use the existing account only for a static build uploaded to its document root **after** the hosting administrator confirms and provisions the header contract. Keep the deployment as static files; do not add Docker, a long-running Node server, or a second host-level reverse proxy on this VPS under the current account.

The administrator/control-panel owner must supply or approve a vhost-level configuration that provides: HTTPS with automated renewal; CSP suited to the local-only app; COOP/COEP/CORP; correct `application/wasm` MIME type; root-scoped service worker; immutable cache headers for fingerprinted assets; and `no-cache` for `index.html`. Validate those headers from an approved production URL in the separate deployment implementation task.

If this hosting plan cannot expose that configuration, deploy the static site to a host/CDN or VPS account with full web-server control. Keep family data entirely in the browser in either topology.

## Follow-up implementation task (not authorized by this audit)

1. Obtain administrative ownership or documented control-panel procedures for the target domain/vhost.
2. Configure the required HTTPS, isolation, MIME, service-worker, and cache headers without weakening the app's local-only CSP.
3. Deploy a disposable static verification build and inspect only its public response headers, certificate, worker scope, and WASM MIME type.
4. Document rollback and tested backup/restore ownership before any public release.
