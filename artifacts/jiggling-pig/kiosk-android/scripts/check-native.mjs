import { readFile } from "node:fs/promises";

const capacitorSource =
  "node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor";
const [activity, bridge, client, main, manifest, config] = await Promise.all([
  readFile(`${capacitorSource}/BridgeActivity.java`, "utf8"),
  readFile(`${capacitorSource}/Bridge.java`, "utf8"),
  readFile(`${capacitorSource}/BridgeWebViewClient.java`, "utf8"),
  readFile("android/app/src/main/java/app/replit/jpigecommerce/kiosk/MainActivity.java", "utf8"),
  readFile("android/app/src/main/AndroidManifest.xml", "utf8"),
  readFile("capacitor.config.ts", "utf8"),
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
];

const failures = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
}
if (failures.length) process.exit(1);