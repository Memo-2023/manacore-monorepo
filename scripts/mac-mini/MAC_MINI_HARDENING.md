# Mac Mini (mana-server) — Hardening & Cleanup

**Stand:** 2026-06-04 · **Anlass:** 502-Flottenausfall (31.5.) + Aufräum-Durchgang.
Zum Mitnehmen an den Mac Mini. Abschnitt 1 ist **ein** sudo-Befehl (offen), der
Rest ist erledigt bzw. eine kurze Rest-Checkliste.

> **Zugang:** `ssh mana-server-remote` (Cloudflare-Tunnel, von überall) ·
> `ssh mana-server` (nur LAN). `sudo` braucht Passwort → interaktiv.
> **Achtung:** `ssh mana-server-remote` läuft DURCH den cloudflared-Tunnel —
> ein cloudflared-Restart kappt kurz die eigene SSH-Sitzung (normal).

---

## 0. Erledigt (live, ohne sudo)

**Aus dem 502-Postmortem (31.5.):**

- ✅ `com.mana.ssh-mux-refresh` abgeschafft (riss planmäßig den colima-SSH-Mux ab → 8h-502). mana `04f0570`.
- ✅ Watchdog `ensure-containers-running.sh` heilt jetzt selbst (`docker info`-Probe → sanft → `colima restart`, mit Backoff/Locks). managarten `7c6fde148`.

**Aus dem Cleanup-Durchgang (4.6.):**

- ✅ **cloudflared-Config-Footgun weg** — `~/.cloudflared/config.yml` (stale 113 Routen) → **Symlink auf die SOT** (`mana-platform-deploy/…/cloudflared-config.yml`, 126 Routen, von `tunnel-reconcile` gepflegt). Alte Datei: `*.stale-bak-20260604`.
- ✅ **Doppelter LaunchAgent** `homebrew.mxcl.cloudflared.plist` entfernt.
- ✅ **cloudflared upgraded** 2026.1.1 → **2026.5.2** (`brew upgrade` + kickstart); 1 gesunder Connector, alle Sites 200.
- ✅ **`rebuild-tunnel.sh`** zeigt jetzt auf die SOT-Config statt aufs veraltete `managarten/cloudflared-config.yml`. managarten `e2680f71d`.
- ✅ **`weekly-report.sh`** Exit-127-Bug behoben (naives `source .env.macmini` brach an mehrzeiligen PEM-Werten → jetzt gezielte `TELEGRAM_*`-Extraktion). Läuft Exit 0. managarten `e2680f71d`.
- ✅ **`check-ssd.sh` repariert** — prüfte den alten Mount-Pfad `/Volumes/TillJakob-S04` (false „SSD nicht gemountet"); jetzt `/Volumes/ManaData`. Dabei die Symlinks `~/stt-models` + `~/flux2` auf den neuen Pfad repointet. Exit 0.
- ✅ **Toten Backup-Cron stillgelegt** — `0 3 * * * ~/backup-postgres.sh` schrieb seit Feb nur „Operation not permitted" (cron-TCC). Auskommentiert (Crontab-Backup: `~/crontab-backup-20260604.txt`). `backup-databases.sh` (launchd, 3:02) deckt alles ab: per-DB + weekly + **Off-Site verschlüsselt zur GPU-Box** (verifiziert: 43 Dumps am 4.6. gespiegelt).

---

## 1. Offen: EIN sudo-Befehl ⏳

Macht **Sleep-Hardening** + entfernt den **toten root-cloudflared-Daemon**.
Selbst-verifizierend, idempotent, fasst den aktiven Tunnel nicht an.

```bash
ssh mana-server-remote
sudo bash ~/mac-mini-cleanup-sudo.sh    # fragt nach sudo-Passwort
```

| #   | Aktion                                                              | Warum                                                                                                |
| --- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | `powernap 0`, `disksleep 0`                                         | kein nächtlicher Dark-Wake / Disk-Sleep-Churn. `sleep`/`displaysleep`/`standby` schon 0.             |
| 2   | root-Daemon `com.cloudflare.cloudflared` ausbooten + Plist beiseite | Zombie seit 20.5.: **0 Netzverbindungen**, leere Logs. Echter Tunnel = User-Agent, bleibt unberührt. |

### Optional (deine Entscheidung): WiFi aus

Der Mini läuft über Ethernet (en0); WiFi (en1, 192.168.1.196) ist zusätzlich an
(Quelle des „systemWokenByWiFi"). Falls nicht gebraucht:
`sudo networksetup -setairportpower en1 off`

---

## 1c. Monitoring konsolidiert: 5 → 2 ✅ (4.6.)

Die fünf überlappenden Monitore sind jetzt **zwei mit klaren Rollen**:

- **Enforcer:** `com.mana.ensure-containers` (300s) — heilt colima+Container aktiv. Unverändert.
- **Reporter:** `com.mana.server-health` (900s) — `mana-server-health.sh full`,
  meldet via Forgejo-Issues (`till/mana-ops`). Erweitert um die einzigartigen
  Checks der alten Reporter: **Public-Hostname-Sweep** (alle ~115 CF-Routen),
  **Disk-Schwellen** (80/90 %), **SSD-Mount+Symlinks** (Layer 5/6/7).
- **Stillgelegt** (reversibel, `.retired-20260604.bak`): `com.mana.health-check`,
  `com.mana.disk-check`, `com.mana.ssd-check`.

Dabei mitgefixt:

- **Flapping behoben** — `probe_vm` nutzt jetzt `docker info` statt `colima status`
  (das lügt/flappt) + HTTP-Retry gegen Tunnel-Reload-Blips. Vorher filete der
  Reporter bei jedem Reload Falsch-Issues. (mana `b818eb2`)
- **6 tote Ingress-Routen entfernt** (vom Sweep aufgedeckt): quotes/quotess
  (kein DNS), viadocu.mana.how-Web (AASA-Route bleibt!), api/playground/cardecky.com
  (502/keine Antwort). Tunnel reloaded auf 120 Hosts. (mana `6d1f9cb`)
- **Verloren (bewusst):** disk-check's Emergency-`docker prune` bei 90 % +
  node_modules-auto-rm (Enforcer-Aufgabe; Disk bei 17/32 %, wöchentl. docker-cleanup
  deckt Routine). Falls gewünscht → in den Enforcer.

## 2. Beobachten / kein Handlungsbedarf

- **pelias-Container** (gestoppt): **bleiben** — Abhängigkeit von `mana-discover`
  (im Aufbau), nicht stillgelegt. Disk ist entspannt (2,6 Ti frei).
- **colima-RAM:** 12 GiB von 16 GB Host, 98 Container, Last ~2. Bei Swap-Druck in
  `~/.colima/default/colima.yaml` senken → `colima restart`.
- **green.ch PTR** (Mail-Reputation): Provider-Ticket, kein Mac-Mini-Schritt.
- **Stale `hourly_*`-Dumps** (51 Stück, eingestellt 26.5.) im Backup-Root — harmlos,
  Disk reicht; bei Bedarf wegräumen.

---

## 3. Verifikation (nach dem sudo-Schritt)

```bash
ssh mana-server-remote 'zsh -lc "
  echo == pmset ==; pmset -g custom | grep -E \"powernap|disksleep|sleep|standby\"
  echo == cloudflared-Prozesse ==; ps aux | grep \"[c]loudflared\" | wc -l
  echo == root-Daemon weg ==; ls /Library/LaunchDaemons/com.cloudflare.cloudflared.plist 2>&1
  echo == docker ==; docker info >/dev/null 2>&1 && echo OK || echo FAIL
  echo == Container ==; docker ps -q | wc -l
"'
curl -s -o /dev/null -w "auth.mana.how/login -> %{http_code}\n" "https://auth.mana.how/login?app=wordeck"
```

Erwartung: powernap/disksleep=0; **1** cloudflared-Prozess; root-Plist „No such file"; docker OK; ~98 Container; login 200.

---

## Quick-Reference: colima-502-Recovery von Hand

```bash
# 1. wedged Mux sanft beenden
ssh mana-server-remote '/usr/bin/ssh -F /dev/null -O exit \
  -S /Users/mana/.colima/_lima/colima/ssh.sock _ 2>&1'
# 2. wenn docker danach immer noch tot: harter Restart (im Hintergrund!)
ssh mana-server-remote 'zsh -lc "nohup colima restart > /tmp/colima-restart.log 2>&1 &"'
# NIE colima restart per Tool-Timeout abwürgen → hinterlässt in_use_by-Lock.
```
