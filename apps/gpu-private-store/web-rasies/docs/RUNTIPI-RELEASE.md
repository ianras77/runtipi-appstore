# Runtipi release

The canonical application source is this repository. The Runtipi app copy is a generated release mirror synchronized with `rsync --delete`, excluding Git metadata, dependencies, build output, and environment files. Release evidence must include source commit, mirror hash, compose validation, image build, container health, and representative API/user-flow probes.

The release topology is one `rasies-portal` container plus persistent app data. Host gateway access is retained for RassyMind and existing read-only media mounts are preserved.
