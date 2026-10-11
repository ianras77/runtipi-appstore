# House archive retrieval

Archive retrieval is intentionally bounded and source-owned by the existing Thoughts, bedtime-story, and music-library services. The current release uses deterministic metadata/Markdown scanning with lexical matching and compact result limits; it does not scan arbitrary host files or audio contents.

The Mastra LibSQL dependency is pinned for the next incremental index implementation, but no external vector service is required by this release. Retrieval failures fall back to the deterministic archive path.
