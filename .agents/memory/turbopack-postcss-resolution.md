---
name: Turbopack PostCSS resolution
description: Dependency placement needed when Next.js Turbopack evaluates an artifact’s PostCSS configuration in this monorepo.
---

Keep PostCSS plugins used by a nested Next.js artifact available from both the artifact package and the workspace root.

**Why:** Production builds resolved the artifact-local package, but the Next.js development worker emitted its PostCSS transform under the workspace-root Turbopack project and could not resolve that same plugin until it was also a root dependency. Restarting alone and clearing the development cache alone did not fix it.

**How to apply:** When adding or changing PostCSS plugins in a nested web artifact, install them in the artifact and at workspace root, clear the artifact’s generated Next development cache, and restart its workflow once.