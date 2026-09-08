import { readFile } from "node:fs/promises";

const capacitorSource =
  "node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor";
const [activity, bridge, client, main, manifest, config, appGradle, releaseWorkflow] = await Promise.all([
  readFile(`${capacitorSource}/BridgeActivity.java`, "utf8"),
  readFile(`${capacitorSource}/Bridge.java`, "utf8"),
  readFile(`${capacitorSource}/BridgeWebViewClient.java`, "utf8"),
  readFile("android/app/src/main/java/app/replit/jpigecommerce/kiosk/MainActivity.java", "utf8"),
  readFile("android/app/src/main/AndroidManifest.xml", "utf8"),
  readFile("capacitor.config.ts", "utf8"),
  readFile("android/app/build.gradle", "utf8"),
  readFile("github-actions/jiggling-pig-kiosk-android-release.yml", "utf8"),
]);

const checks = [
  ["BridgeActivity exposes the bridge", /protected Bridge bridge;/.test(activity)],
  ["BridgeActivity load can be overridden", /protected void load\(\)/.test(activity)],
  ["Bridge exposes getWebView", /public WebView getWebView\(\)/.test(bridge)],
  ["Bridge accepts BridgeWebViewClient", /public void setWebViewClient\(BridgeWebViewClient client\)/.test(bridge)],
  ["BridgeWebViewClient constructor matches", /public BridgeWebViewClient\(Bridge bridge\)/.test(client)],
  ["restrictive client precedes remote load", main.indexOf("bridge.setWebViewClient") < main.indexOf("webView.loadUrl(KIOSK_URL)")],
  ["payment interface precedes remote load", main.indexOf("addJavascriptInterface") < main.indexOf("webView.loadUrl(KIOSK_URL)")],
  ["payment lock returns synchronous commit result", /return paymentLock\.edit\(\)\.putBoolean\(PAYMENT_LOCK_KEY, active\)\.commit\(\)/.test(main)],
  ["markActive requires approval and persistence success", /public boolean markActive\(\) \{\s*return approvedKioskDocument && persistPaymentLock\(true\);/.test(main)],
  ["process restart is fail-closed for payment lock", /if \(isPaymentLockActive\(\)\) \{[\s\S]*webView\.loadUrl\(PAYMENT_UNCERTAIN_URL\)/.test(main)],
  ["payment lock blocks retry", /if \(isPaymentLockActive\(\)\) \{\s*return true;/.test(main)],
  ["payment interface is limited to approved kiosk documents", /approvedKioskDocument && persistPaymentLock/.test(main)],
  ["SSL errors are cancelled", /onReceivedSslError[\s\S]*handler\.cancel\(\)/.test(main)],
  ["release WebView debugging is disabled", /setWebContentsDebuggingEnabled\(false\)/.test(main)],
  ["third-party cookies are disabled", /setAcceptThirdPartyCookies\(webView, false\)/.test(main)],
  ["backups are disabled", /android:allowBackup="false"/.test(manifest)],
  ["cleartext is disabled", /android:usesCleartextTraffic="false"/.test(manifest)],
  ["remote URL is not loaded by Capacitor before native policy", !/server:\s*\{[\s\S]*url:/.test(config)],
  ["release signing credentials come from the environment", /System\.getenv\(\)/.test(appGradle) && /ANDROID_KEYSTORE_PATH/.test(appGradle) && /ANDROID_KEYSTORE_PASSWORD/.test(appGradle) && /ANDROID_KEY_ALIAS/.test(appGradle) && /ANDROID_KEY_PASSWORD/.test(appGradle)],
  ["release tasks reject missing signing credentials", /releaseTaskRequested[\s\S]*throw new GradleException/.test(appGradle)],
  ["Android version name and bounded code are configurable", /KIOSK_VERSION_NAME/.test(appGradle) && /KIOSK_VERSION_CODE/.test(appGradle) && /2100000000/.test(appGradle)],
  ["release workflow verifies APK certificates", /verify --verbose --print-certs/.test(releaseWorkflow)],
  ["release workflow publishes with GitHub CLI", /gh release create/.test(releaseWorkflow) && /contents: write/.test(releaseWorkflow)],
  ["release workflow targets the checked-out commit", /ref: \$\{\{ github\.sha \}\}/.test(releaseWorkflow) && /--target "\$GITHUB_SHA"/.test(releaseWorkflow)],
  ["release workflow guards unique tags before and during publication", (releaseWorkflow.match(/gh release view/g) || []).length >= 2 && (releaseWorkflow.match(/git\/ref\/tags/g) || []).length >= 2],
  ["release workflow is main-gated and protected", /if: github\.ref == 'refs\/heads\/main'/.test(releaseWorkflow) && /environment: kiosk-production-signing/.test(releaseWorkflow)],
  ["release actions are pinned to reviewed SHAs", /actions\/checkout@11bd71901bbe5b1630ceea73d27597364c9af683/.test(releaseWorkflow) && /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/.test(releaseWorkflow) && /pnpm\/action-setup@fc06bc1257f339d1d5d8b3a19a8cae5388b55320/.test(releaseWorkflow) && /actions\/setup-java@dded0888837ed1f317902acf8a20df0ad188d165/.test(releaseWorkflow) && /gradle\/actions\/setup-gradle@da187c8e6ffbd3802e00f2477aa5a822b25f2dda/.test(releaseWorkflow)],
  ["release checkout does not persist credentials", /persist-credentials: false/.test(releaseWorkflow)],
  ["release keystore is short-lived", releaseWorkflow.indexOf("Decode release keystore") > releaseWorkflow.indexOf("Check TypeScript and native contract") && releaseWorkflow.indexOf("Delete release keystore") > releaseWorkflow.indexOf("Build signed release APK") && /if: always\(\)/.test(releaseWorkflow)],
  ["release workflow pins the signing certificate", /KIOSK_SIGNING_CERT_SHA256/.test(releaseWorkflow) && /APK signer certificate does not match/.test(releaseWorkflow)],
  ["release workflow checks all prior kiosk metadata twice", (releaseWorkflow.match(/gh api --paginate/g) || []).length >= 2 && (releaseWorkflow.match(/jiggling-pig-kiosk-release-metadata\.json/g) || []).length >= 4 && (releaseWorkflow.match(/max_version_code/g) || []).length >= 4],
  ["release metadata records version, commit, and signer", /versionName: \$versionName, versionCode: \$versionCode, gitSha: \$gitSha, signerFingerprint: \$signerFingerprint/.test(releaseWorkflow)],
  ["production releases share a non-cancelling concurrency group", /concurrency:\s*\n\s*group: kiosk-production-release\s*\n\s*cancel-in-progress: false/.test(releaseWorkflow)],
  ["release history retrieval fails closed", (releaseWorkflow.match(/if ! gh api --paginate/g) || []).length >= 2 && (releaseWorkflow.match(/Could not retrieve the complete kiosk release history/g) || []).length >= 2 && !/< <\(gh api/.test(releaseWorkflow)],
];

const failures = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
}
if (failures.length) process.exit(1);