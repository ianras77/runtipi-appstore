# Upstream schema attribution

The three TypeScript files under `upstream/packages/common/src` are unmodified schema sources from `runtipi/runtipi` tag v4.11.0 / commit `5e4d7a5bb1d537782191fc1fbcb7e30c0423d566`. Their exact Git blob identities are in `upstream-blob-shas.json`; imports use locally compiled JavaScript. The upstream `packages/common/package.json` identifies this package as MIT-licensed. The containing Runtipi project identifies its overall repository license separately; retain upstream attribution/license obligations if distributing these files.

`compose-spec.json` is the unmodified official Compose specification schema from commit `3a4a6995e4a971f6173dff9130cb3e38e6738651` (one added terminal newline does not change JSON semantics). See the source repository's license when redistributing it. Exact source URLs and pinned validation/action provenance are in `provenance.json`.

No hand-written schema is presented as an official schema. `tests/` adds release-policy checks separately from upstream format validation.
