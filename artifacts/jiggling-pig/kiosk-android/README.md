# Jiggling Pig Android kiosk shell

This package is a Capacitor Android wrapper for:

`https://jpig-ecommerce-clientside.replit.app/kiosk?kioskClient=android`

It does not contain payment or ordering logic. The query parameter identifies the
Android kiosk client and hides browser card entry so the Android customer flow
offers the paired terminal only. It is **not an authentication or authorization
boundary**; server payment controls remain authoritative.

## Security and kiosk behavior

- Top-level WebView navigation is limited to HTTPS on the exact production host,
  port 443, and `/kiosk` route boundary. Staff/admin routes, non-HTTPS URLs, and
  external intents are blocked.
- SSL failures are cancelled; there is no certificate bypass.
- Android back is consumed, release WebView debugging is disabled, backups and
  cleartext traffic are disabled, and `INTERNET` is the only permission.
- DOM storage, WebView databases, and cookies remain persistent across launches.
- Before the terminal order POST, the approved top-level kiosk document writes a
  synchronous native `SharedPreferences` payment-outcome lock through a
  no-argument JavascriptInterface. `markActive()` returns true only when the
  current top-level document is approved and the synchronous commit succeeds;
  the web kiosk will not send the terminal POST without that positive result.
  The lock survives process death. A local
  failure screen offers a manual retry only when that lock is absent. If it is
  active, startup and failures use a separate fail-closed screen with no retry
  control and direct the customer to staff for reconciliation. There is intentionally no
  connectivity listener or automatic reload, because reloading an active payment
  when connectivity changes could duplicate or interrupt the transaction.
- The screen stays awake, uses immersive mode, and is locked to landscape.

Terminal-only/card-choice presentation is a usability preference only. The
server and payment provider must continue to enforce all real authorization and
payment rules.

## Repeatable builds

Requirements: Node.js, pnpm, JDK 21, Android SDK Platform 36, and the Android SDK
build tools accepted by the generated Gradle project. Set `ANDROID_HOME` (or add
an uncommitted `android/local.properties` with `sdk.dir=...`).

```sh
cd artifacts/jiggling-pig/kiosk-android
pnpm install --ignore-workspace
pnpm run typecheck
pnpm run build:debug
```

The debug APK, when the build succeeds, is:
`android/app/build/outputs/apk/debug/app-debug.apk`.

Release builds are signed only from environment variables. Gradle deliberately
fails any release task with a list of missing variables rather than creating an
unsigned release. Set `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD`; set `KIOSK_VERSION_NAME` to a
semantic version and `KIOSK_VERSION_CODE` to an integer from `1` through
`2100000000`. The version variables default to `1.0.0` and `1` for debug builds.
Then run `pnpm run build:release` for an AAB or
`pnpm run build:release-apk` for an APK. Do not put credentials in Gradle
properties or commit them.

Verify a direct-sideload APK before installing it:

```sh
apksigner verify --verbose --print-certs android/app/build/outputs/apk/release/app-release.apk
adb install --replace path/to/verified-signed-release.apk
```

Debug APKs are suitable only for development checks.

## Signed GitHub Releases

Create the organization-owned upload keystore once, in a secure working
directory, on Windows, macOS, or Linux (the JDK `keytool` command is the same):

```sh
keytool -genkeypair -v -keystore jiggling-pig-kiosk-release.jks -alias jiggling-pig-kiosk -keyalg RSA -keysize 4096 -validity 10000
```

Choose and securely record the keystore password, alias, and key password. Back
up the keystore in the organization's protected credential store and record its
certificate fingerprint. **Never lose, delete, or rotate this keystore.** Android
will reject an APK signed with a different key as an update to installed kiosks.
Never commit the keystore or passwords.

Encode the binary keystore as one-line base64 for GitHub:

**Windows PowerShell**

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path ".\jiggling-pig-kiosk-release.jks"))) | Set-Clipboard
```

**macOS**

```sh
base64 < jiggling-pig-kiosk-release.jks | tr -d '\n' | pbcopy
```

**Linux**

```sh
base64 -w 0 jiggling-pig-kiosk-release.jks
```

Before using the release template, create the protected GitHub environment
**`kiosk-production-signing`** under **Settings → Environments**. Configure its
deployment branch rule to allow only `main` and require an authorized release
reviewer. The job itself also refuses to run unless `github.ref` is
`refs/heads/main`.

Put these signing secrets in that **`kiosk-production-signing` environment**
(not in the repository's general Actions secrets):

- `ANDROID_KEYSTORE_BASE64`: the one-line encoded keystore
- `ANDROID_KEYSTORE_PASSWORD`: its store password
- `ANDROID_KEY_ALIAS`: its alias
- `ANDROID_KEY_PASSWORD`: the private-key password

In the same protected environment (or as a non-secret repository Actions
variable), set `KIOSK_SIGNING_CERT_SHA256` to the SHA-256 fingerprint for the
signing certificate. Obtain it locally without sharing the keystore or password:

```sh
keytool -list -v -keystore jiggling-pig-kiosk-release.jks -alias jiggling-pig-kiosk
```

Copy the `SHA256:` certificate fingerprint into the variable; colons and letter
case are normalized by the workflow. Do not put a fingerprint or any secret
value into chat, tickets, workflow YAML, logs, issues, or release notes.

Do not paste secret values into workflow YAML, logs, issues, or release notes.
The release workflow decodes the keystore only into the GitHub runner's
temporary directory immediately before Gradle runs and deletes it immediately
afterward.

The repository includes two copy-ready manual GitHub Actions templates:

- `github-actions/jiggling-pig-kiosk-android-debug.yml` keeps the existing
  unsigned debug artifact build.
- `github-actions/jiggling-pig-kiosk-android-release.yml` validates a semantic
  version and bounded Android version code, runs type and native checks, builds
  the signed APK, verifies it with `apksigner --verbose --print-certs` against
  the configured certificate fingerprint, creates a versioned APK, SHA-256, and
  release metadata JSON, and publishes all three with the GitHub CLI.

They are stored outside `.github/workflows` because GitHub rejects workflow-file
pushes made through OAuth credentials that do not have the separate `workflow`
permission.

After the app code has been pushed, create
`.github/workflows/jiggling-pig-kiosk-android-debug.yml` in GitHub's web editor,
copy the template into it, and commit it there. Then run
**Actions → Build Jiggling Pig kiosk debug APK → Run workflow** to obtain a
14-day `jiggling-pig-kiosk-debug-apk` artifact. The workflow uses the standalone
frozen lockfile and does not access signing secrets or produce a release build.

For releases, similarly copy the release template to
`.github/workflows/jiggling-pig-kiosk-android-release.yml` in GitHub's web
editor. Run **Actions → Release signed Jiggling Pig kiosk APK → Run workflow**,
enter a semantic version without `v` (for example `1.2.3`) and a new,
monotonically increasing version code (between `1` and `2100000000`). Every
release must use a new, unique semantic version/tag and a code greater than the
highest prior `kiosk-v*` release metadata code. The workflow requires metadata
on every prior kiosk release and rejects an existing tag, release, or
non-increasing code both before building and again immediately before
publication. History retrieval fails closed, and one fixed non-cancelling
concurrency group serializes all production kiosk releases. It creates the tag
for the exact checked-out `GITHUB_SHA`, has only
`contents: write`, uses the built-in `GITHUB_TOKEN`, and marks the created release
as latest. The first kiosk release may use any code in the allowed range. The
stable download page is:

`https://github.com/codestormtek/JPIGEcommerce-Clientside/releases/latest`

Web-only kiosk changes served by the production URL do **not** require a new APK;
release one only when the native Android shell changes.

## Samsung device setup and physical verification

1. Fully update Android System WebView and Chrome, set automatic date/time, join
   the production Wi-Fi, and install the verified signed APK.
2. Launch once and confirm the URL displays the real production kiosk. Confirm
   landscape lock, screen-awake behavior, keyboard/touch operation, and readable
   focus states with at least 44 px targets.
3. Complete a low-value real order using the intended terminal flow. Confirm
   modifiers, totals, cancellation, confirmation, receipt/order state, and that
   exactly one payment/order is created. Do not repeat a payment merely because
   a failure screen appeared.
4. During a non-payment menu screen, disable Wi-Fi and navigate to trigger the
   local failure screen. Restore Wi-Fi and confirm it stays put until **Try
   again** is tapped. Separately verify an interrupted payment using the payment
   provider's reconciliation procedure rather than retrying blindly. If the
   payment-uncertain screen is shown after a restart, staff must verify the
   Square terminal/payment and the matching order first. Only after the outcome
   is confirmed safe may an authorized technician clear this app's data and
   re-register the kiosk; never use clear-data as a way to dismiss an
   unverified payment.
5. Try Android back, an external link, and known `/admin` or staff URLs. They
   must not leave the current kiosk page or launch another app. Confirm WebView
   inspection cannot attach to a release build.
6. Reboot the tablet and verify cookies/storage and kiosk operation survive.

Android screen pinning is a supervised convenience: users may be able to exit it
with the device PIN, and it does not grant app-level authorization. For unattended
lockdown, enroll the Samsung tablet through Android Enterprise/Knox as a fully
managed dedicated device and allowlist this package as the lock-task/home app.
Configure Wi-Fi, OS updates, remote recovery, and an authorized staff escape
procedure in the EMM. Test lockdown on the exact Samsung model before rollout.