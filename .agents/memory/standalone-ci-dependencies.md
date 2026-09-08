---
name: Standalone CI dependencies
description: Dependency-isolation rule for nested packages that install independently in CI.
---

Any nested package with its own lockfile and independent CI install must explicitly declare every runtime, build, and type dependency its checks use.

**Why:** A local monorepo check passed because workspace-level Node types were available, while the clean standalone GitHub Actions install failed before the Android build.

**How to apply:** Reproduce standalone CI with a clean install that ignores the parent workspace and uses the frozen nested lockfile. Treat a passing workspace-root check as insufficient evidence for these packages.