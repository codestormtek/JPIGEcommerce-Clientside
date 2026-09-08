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

For release, first run `pnpm run build:release` for an AAB or
`pnpm run build:release-apk` for a sideloadable APK. Without an externally
configured release signing setup these outputs are unsigned; this project does
not create or manage signing credentials. Use an organization owned keystore
stored outside the repository (preferably in a managed secret store/HSM),
configure signing through a protected local Gradle properties file or CI secret
injection, and run the selected task again. Prefer Google Play App Signing for
managed distribution. Never commit the keystore, aliases, passwords,
`local.properties`, APKs, or AABs. Record the certificate fingerprint separately
so future upgrades use the same signing identity.

For direct release sideloading, have the release manager produce a signed APK
with Android Studio or `apksigner`, verify it with `apksigner verify --verbose`,
then install it with:

```sh
adb install --replace path/to/verified-signed-release.apk
```

Debug APKs are suitable only for development checks.

The repository also includes the manual-only GitHub Actions workflow
`Build Jiggling Pig kiosk debug APK`. Run it with **Actions → Run workflow** to
obtain a 14-day `jiggling-pig-kiosk-debug-apk` artifact. It uses the standalone
frozen lockfile and does not access signing secrets or produce a release build.

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