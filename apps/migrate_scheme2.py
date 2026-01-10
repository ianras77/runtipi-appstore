#!/usr/bin/env python3
import json
import os
from pathlib import Path

ROOT = Path(".")

def convert_env(env):
    """
    v1: { "FOO": "bar", "BAZ": "${VAR}" }
    v2: [ {"key":"FOO","value":"bar"}, {"key":"BAZ","value":"${VAR}"} ]
    """
    if isinstance(env, dict):
        return [{"key": k, "value": v} for k, v in env.items()]
    return env

def migrate_services(services):
    if not isinstance(services, list):
        return services
    for svc in services:
        if not isinstance(svc, dict):
            continue

        # environment: object -> array
        if "environment" in svc:
            svc["environment"] = convert_env(svc["environment"])

        # depends_on -> dependsOn (if you ever used docker-compose-ish keys)
        if "depends_on" in svc and "dependsOn" not in svc:
            svc["dependsOn"] = svc.pop("depends_on")

    return services

def migrate_overrides(overrides):
    if not isinstance(overrides, list):
        return overrides
    for ov in overrides:
        if not isinstance(ov, dict):
            continue
        if "services" in ov:
            ov["services"] = migrate_services(ov["services"])
    return overrides

def migrate_file(path: Path):
    try:
        data = json.loads(path.read_text())
    except Exception as e:
        print(f"[SKIP] {path}: cannot parse JSON: {e}")
        return

    changed = False

    # Ensure schemaVersion = 2
    if data.get("schemaVersion") != 2:
        data["schemaVersion"] = 2
        changed = True

    # Migrate services
    if "services" in data:
        before = json.dumps(data["services"], sort_keys=True)
        data["services"] = migrate_services(data["services"])
        after = json.dumps(data["services"], sort_keys=True)
        if before != after:
            changed = True

    # Migrate overrides if present
    if "overrides" in data:
        before = json.dumps(data["overrides"], sort_keys=True)
        data["overrides"] = migrate_overrides(data["overrides"])
        after = json.dumps(data["overrides"], sort_keys=True)
        if before != after:
            changed = True

    if changed:
        backup = path.with_suffix(".v1.backup.json")
        if not backup.exists():
            backup.write_text(json.dumps(data, indent=2))
            # Actually the backup should be original, so re-read original
            backup.write_text(json.dumps(json.loads(path.read_text()), indent=2))

        # Write migrated file
        path.write_text(json.dumps(data, indent=2))
        print(f"[OK]  Migrated {path}")
    else:
        print(f"[OK]  No changes needed {path}")

def main():
    for docker_json in ROOT.rglob("docker-compose.json"):
        migrate_file(docker_json)

if __name__ == "__main__":
    main()

