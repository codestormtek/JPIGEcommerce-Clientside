---
name: Standalone CI dependencies
description: Dependency-isolation rule for nested packages that install independently in CI.
---

Any nested package with its own lockfile and independent CI install must explicitly declare every runtime, build, and type dependency its checks use.

**Why:** A local monorepo check passed because workspace-level Node types were available, while the clean standalone GitHub Actions install failed before the Android build.

**How to apply:** Reproduce standalone CI with a clean install that ignores the parent workspace and uses the frozen nested lockfile. Treat a passing workspace-root check as insufficient evidence for these packages.

Resolve test tooling and Node type declarations from the package that owns the test, not an arbitrary workspace root or sibling package.

**Why:** Ad hoc checks can fail to resolve a runner or Node built-ins even when the owning application's type check passes. These are tooling-scope failures, not evidence of an application defect.

**How to apply:** Check the owning package's installed tools and compiler version before selecting a test command. Avoid adding dependencies or using newer compiler flags just to work around a wrong execution scope.