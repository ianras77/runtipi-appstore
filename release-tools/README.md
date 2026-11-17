# Elderseth web package release preparation

Target: `ianras77/runtipi-appstore@app/wordpress_elderseth`, baseline
`4d7d5a9ad09fc24010abd16a35e3048d11e3d847`. No existing package files are changed.
`usmender/existing-package-sha256.json` locks the safely acquired files for all
104 existing direct packages. It does **not** include or inspect the accidentally
nested store/source tree or any `.env`. Publication must preserve omitted remote
tree entries rather than replace the whole tree with this sparse snapshot.

## Tests

```
npm ci --ignore-scripts
python3 -m pip install -r requirements.txt
npm run compile:schemas
node scripts/validate-official.mjs
python3 scripts/validate-compose-spec.py
python3 scripts/test-usmender.py
python3 scripts/check-usmender.py
python3 scripts/check-usmender.py --source /path/to/reviewed/web-usmender
```

The final paired command requires the API compiled by its own source build.
It compares source-contract bytes and invokes the actual compiled **pure** runtime
configuration validator with synthetic values, without dotenv, credentials,
connections, migrations or conversation content. Store CI validates the vendored
contract; it does not claim it fetched/built the application. Refresh its snapshot
and SHA only after reviewing a source contract change.

The original store's `apps/dynamic-compose-schema.json` is stale relative to its
v2 JSON packages. It is intentionally not rewritten across 104 existing apps.
This new package uses YAML and the exact vendored Runtipi v4.11.0 source schemas
plus pinned Compose specification (see schemas/provenance.json). These are
syntax/contracts checks, not evidence that the user's installed host supports them.

## Remaining release prerequisites (not yet done)

1. Freeze and publish the reviewed USMender source commit. The reviewed source now supplies Node24.22.2, frozen-lock API/web recipes and a standalone web artifact; actual Docker builds remain unexecuted here. Validate
   Build actual API/web images with the exact rewrite arguments and the corrected
   source entrypoint. Record architecture and build provenance; none are assumed.
2. The source-owned `services/cat/Dockerfile` now packages plugins/bootstrap and safe empty-data initialization, but requires an explicit verified legacy-compatible `CAT_BASE_IMAGE` digest. Cat2 is a major redesign and not compatible with the existing plugin/bootstrap. Build and test the custom image against actual Cat and inference contracts. Authenticated inference is unqualified and credential inputs fail closed; do not claim that RassyMind authentication already works. No built custom Cat artifact is claimed here.
3. Resolve an actual PostgreSQL16 image digest and API/web/custom-Cat digests into
   `usmender/release-lock.json`. Registry publication requires a separately
   authorized registry-capable environment; do not request or embed credentials.
4. Render a **separate** staging Compose file with
   `python3 scripts/check-usmender.py --lock /path/to/release-lock.json --render /path/to/staging.yml`.
   This rejects missing source revisions, tag-only images and obvious fake digests.
   Digest syntax is NOT proof of artifact existence or provenance.
5. In separately authorized Docker/Runtipi staging, verify host version/private
   HTTPS ingress, image pulls, fresh install, migrations, browser flow, restart
   persistence, backup+restore and restored-data upgrade. Preserve DB/JWT keys;
   never baseline/reset a nonempty production database. Record evidence for the
   lock's currently-null qualification entries. Rendered files alone are not
   release qualification; there is deliberately no automatic promotion command.
6. Human review of actual lifecycle evidence and explicit merge/deploy authority
   precedes any enablement. A real-conversation/Matrix/Twilio/encrypted profile
   needs additional source and provider/identity/security work, not a form toggle.

This preparation is not an installed app, image release, store migration, or
claim of full USMender feature readiness. Next candidates: Crack after its
in-progress dependency/source freeze and image contracts; Astrology using its
explicit `infra/Dockerfile.api` and `infra/Dockerfile.web` (not legacy bind mounts).

## Full inventory and version-control gate

Run `npm run test:inventory` here, or `npm run test:store-contracts` from the
repository root after installing release-tools dependencies and Python requirements.
Root `npm test` now calls this actual checked-in suite instead of empty Jest discovery. Tipi CI uses Node24.22.2 and stable pnpm12.16.1 (registry verified 2026-10-30), with frozen-lockfile/ignore-scripts installation and explicit Python/release tooling. Lint requires BASE_SHA from the actual PR base or previous push commit, verifies that commit exists, and never defaults to origin/master. These changes do not claim the entire store is healthy.

`validate-inventory.mjs` is nonrecursive: only direct app directories and their
config/compose files are read. Nested repositories, assets and `.env` are never
traversed. Symlinked package contracts are refused. Both JSON and YAML files are
checked when present; this does not assert which the installed runtime selects.

- Missing JSON schemaVersion selects official legacy v1 (supported but deprecated).
- Numeric schemaVersion 2 selects official v2; v1 environment objects then fail.
- Other explicit versions, including string "2", fail closed, never fall back.
- YAML with x-runtipi uses the official Runtipi YAML contract AND Compose spec.
- Legacy plain YAML uses the Compose spec and is labelled legacy, not v2.
- Metadata uses official app-info; folder/id mismatches are reported, not renamed.

Baseline at `4d7d5a9ad09fc24010abd16a35e3048d11e3d847`: 104 packages; 102 v2 JSON,
2 v1 JSON; 80 additional legacy YAML files. **16 existing failures**: six folder/id
mismatches and ten MCP packages with v2 declarations but v1 environment shapes.
The candidate has 105 packages with the same 16 failures and zero new regressions.
The gate prints `Inventory DEGRADED; regression gate PASS`, not universal green.

Baseline exceptions apply only when ALL recorded config/compose file hashes for
that app remain byte-identical and the exact issue was recorded. Changed broken
apps lose their exception. New failures, removed packages, v2-to-v1 downgrades,
new/changed floating latest/nightly/main/master images, and changed contracts
without an increased integer tipi_version block the regression gate. The baseline
is review-controlled evidence; never regenerate it automatically to make CI pass.
An app fix must remove its failures, bump tipi_version, and undergo lifecycle review.

Latest-stable policy: official Runtipi releases/latest was checked 2026-10-30 and
reported stable v4.11.0, released 2026-10-21. Source schemas are pinned to that
release's exact commit and verified by Git blob hash before compilation. This
is NOT a claim that every app image is current or the user's host is updated.
Before each release, recheck official stable releases, compatibility, advisories,
source/image provenance and install/upgrade/restore results; update pins through
reviewed changes, not floating tags or unattended major upgrades. The checked-in
schemas keep validation reproducible if upstream changes, not perpetually fresh.

Compose batch coverage is fail-closed: each request is identified by app/file plus
its source SHA256; every response must carry exactly one expected identity and
well-formed problem list. Missing, extra, duplicate, stale or malformed responses
abort validation. Reordered responses are associated by identity, not position.
Independent review reproduced an empty-response false pass before this guard;
that case is now rejected and covered by negative regression tests.

## PR/CI publication safeguards

The inherited close-PR workflow previously used head.repo.fork, which is also
true for internal branches of this fork. Its close action now compares head and
base repository full names. Same-repository repairs stay open; the existing
external-PR policy and `no-close` label escape remain unchanged. This privileged
pull_request_target workflow still does not check out PR content or run shell
code. Permissions and auto-merge workflows are not changed. Until this fix is
merged, the old base-branch workflow can still close an internal PR; a maintainer
may need its existing `no-close` label and reopen action.

Eight checked-in workflow/lint tests cover those cases and CI wiring. A real
synthetic two-commit Git checkout verifies dynamic-base Biome CI, rather than
only checking workflow text. Vendored upstream schemas, exact source-contract
snapshot and generated baseline/hash ledgers are excluded only from formatting;
their provenance, source pairing, schema compilation and inventory tests still
run. Original application files are never reformatted in this repair.
