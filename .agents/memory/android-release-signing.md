---
name: Android release signing
description: Durable integrity rules for publishing updatable Android APKs from GitHub Actions.
---

Production Android releases must use one protected signing identity, pin its certificate fingerprint, enforce increasing version codes from fail-closed release metadata, and bind each immutable release tag to the exact built commit.

**Why:** A merely valid APK signature does not prove update compatibility. A rotated key, lower version code, incomplete history query, concurrent release, or tag/source race can publish an APK that Android refuses as an update.

**How to apply:** Keep signing secrets in a protected, reviewed environment restricted to the approved branch. Decode the keystore only for the signing step, remove it immediately, avoid persisted checkout credentials, pin Actions by commit SHA, serialize releases, and abort on missing or incomplete prior-release metadata.

GitHub does not allow the runner context in job-level env expressions. Initialize runner-dependent paths inside a step using RUNNER_TEMP and GITHUB_ENV instead.

**Why:** A runner.temp expression at job env scope prevents workflow validation before any build starts.