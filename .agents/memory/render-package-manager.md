---
name: Render package-manager bootstrap
description: Distinguish Render's broken Corepack launcher from application build failures.
---

Treat a missing pnpm executable under Render's Corepack cache as a package-manager bootstrap failure, not an application compilation error.

**Why:** A storefront deployment failed before dependency installation because Corepack selected a pnpm executable absent from its cache. The project's local pnpm was a different version.

**How to apply:** Pin the package-manager version to the one verified against the project and bypass the broken Corepack launcher if necessary. Any bypass must cover both build and start commands. Confirm the next deployment's logs before claiming the workaround succeeded.