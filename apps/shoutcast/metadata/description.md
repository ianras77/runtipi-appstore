# SHOUTcast DNAS (Self-Hosted)

Run the SHOUTcast DNAS streaming server with zero shell setup. This app generates a valid `sc_serv.conf` from your install form, persists logs and content, and exposes the player/admin UI through Runtipi. Use it for a personal radio, family channel, AutoDJ/playlist, or as a relay of another station.

## What’s Included
- SHOUTcast DNAS server (main service)
- Init job that writes a ready-to-run `sc_serv.conf`
- Persistent volumes for **config**, **logs**, **control** (ban/rip files), and **content**
- Defaults: `portbase=8000`, single stream `sid=1`, private by default (`publicserver=never`)

## Ports & URLs
- Internal port: **8000**
- Player/Status: `https://<your-tipi-domain>/`
- Stream mount: `https://<your-tipi-domain><STREAM_PATH>` (default `/stream`)
- Admin UI: `https://<your-tipi-domain>/admin.cgi` (uses Admin password)

## Volumes
| Host path                             | Container path               | Purpose                       |
|--------------------------------------|------------------------------|-------------------------------|
| `${APP_DATA_DIR}/config/sc_serv.conf`| `/opt/shoutcast/sc_serv.conf`| Primary config                |
| `${APP_DATA_DIR}/logs`               | `/opt/shoutcast/logs`        | `sc_serv.log`, `sc_w3c.log`   |
| `${APP_DATA_DIR}/control`            | `/opt/shoutcast/control`     | `sc_serv.ban`, `sc_serv.rip`  |
| `${APP_DATA_DIR}/content`            | `/opt/shoutcast/content`     | AutoDJ/playlist/relay files   |

## First-Run Settings (Install Form)
- **Source password** (encoder login)
- **Admin password** (admin UI)
- Optional: Station name/URL/genre, Max listeners, Stream ID, Stream path, Public server mode (`never`/`always`/`default`)
- Optional SHOUTcast Self-Hosted licensing: **userid** and **licenceid**

## Encoder Setup (BUTT, Mixxx, Liquidsoap, etc.)
- Server/Host: your Runtipi URL (Traefik proxies 8000)
- Port: `8000` (if required by your encoder)
- Password: Source password
- Mount/Path: `STREAM_PATH` (default `/stream`)
- Format: MP3 recommended; set bitrate/sample rate in encoder

## Security & Multi-User
- No end-user accounts (radio server). Protect Admin UI via strong password and (optionally) Runtipi auth/IP rules.
- Keep `publicserver=never` for private stations.

## Backups
Back up `${APP_DATA_DIR}`:
- `/config/sc_serv.conf`, `/logs`, `/control`, `/content`

## Troubleshooting
- Encoder can’t connect → verify Source password + `streampath`
- Silent stream → encoder not sending audio; check device/bitrate
- Admin re-prompts → wrong Admin password
- Choppy audio → reduce bitrate; check CPU/network

