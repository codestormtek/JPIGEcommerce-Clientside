package app.replit.jpigecommerce.kiosk;

import android.annotation.SuppressLint;
import android.graphics.Bitmap;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.content.SharedPreferences;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.JavascriptInterface;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    private static final String KIOSK_URL =
        "https://jpig-ecommerce-clientside.replit.app/kiosk?kioskClient=android";
    private static final String KIOSK_HOST = "jpig-ecommerce-clientside.replit.app";
    private static final String OFFLINE_URL = "file:///android_asset/public/offline.html";
    private static final String PAYMENT_UNCERTAIN_URL =
        "file:///android_asset/public/payment-uncertain.html";
    private static final String PAYMENT_LOCK_PREFS = "kiosk_payment_safety";
    private static final String PAYMENT_LOCK_KEY = "payment_outcome_uncertain";
    private boolean showingOffline;
    private volatile boolean approvedKioskDocument;
    private SharedPreferences paymentLock;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        );

        getOnBackPressedDispatcher().addCallback(
            this,
            new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    // Deliberately keep the customer inside the current kiosk step.
                }
            }
        );
    }

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void load() {
        super.load();

        WebView webView = bridge.getWebView();
        paymentLock = getSharedPreferences(PAYMENT_LOCK_PREFS, MODE_PRIVATE);
        WebView.setWebContentsDebuggingEnabled(false);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setDatabaseEnabled(true);
        CookieManager.getInstance().setAcceptCookie(true);
        // The Android shell is terminal-only; it does not embed the browser card form.
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        bridge.setWebViewClient(new KioskWebViewClient());
        webView.addJavascriptInterface(new PaymentLockJavascriptInterface(), "JigglingPigKioskPaymentLock");
        // Capacitor first loads the bundled page. Only start the remote kiosk after
        // the restrictive client above is installed, so the first remote request
        // cannot race navigation enforcement.
        if (isPaymentLockActive()) {
            showingOffline = true;
            webView.loadUrl(PAYMENT_UNCERTAIN_URL);
        } else {
            webView.loadUrl(KIOSK_URL);
        }
    }

    private boolean isAllowedKioskUrl(Uri uri) {
        if (!"https".equalsIgnoreCase(uri.getScheme()) || !KIOSK_HOST.equalsIgnoreCase(uri.getHost())) {
            return false;
        }

        int port = uri.getPort();
        if (port != -1 && port != 443) {
            return false;
        }

        String path = uri.getPath();
        return "/kiosk".equals(path) || (path != null && path.startsWith("/kiosk/"));
    }

    private boolean hasUncertainPayment(Uri failedUri, WebView view) {
        Uri currentUri = Uri.parse(view.getUrl() == null ? "" : view.getUrl());
        return isPaymentLockActive()
            || "payment-active".equals(currentUri.getFragment())
            || (failedUri != null && "payment-active".equals(failedUri.getFragment()));
    }

    private boolean isPaymentLockActive() {
        return paymentLock != null && paymentLock.getBoolean(PAYMENT_LOCK_KEY, false);
    }

    private boolean persistPaymentLock(boolean active) {
        // commit() intentionally completes synchronously before the terminal POST.
        return paymentLock.edit().putBoolean(PAYMENT_LOCK_KEY, active).commit();
    }

    private void showOffline(WebView view, Uri failedUri) {
        if (!showingOffline) {
            showingOffline = true;
            view.loadUrl(hasUncertainPayment(failedUri, view) ? PAYMENT_UNCERTAIN_URL : OFFLINE_URL);
        }
    }

    private final class KioskWebViewClient extends BridgeWebViewClient {
        KioskWebViewClient() {
            super(bridge);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();

            if (!request.isForMainFrame()) {
                return false;
            }

            if ("jpig-kiosk".equalsIgnoreCase(uri.getScheme()) && "retry".equalsIgnoreCase(uri.getHost())) {
                if (isPaymentLockActive()) {
                    return true;
                }
                showingOffline = false;
                view.loadUrl(KIOSK_URL);
                return true;
            }

            if (OFFLINE_URL.equals(uri.toString()) || PAYMENT_UNCERTAIN_URL.equals(uri.toString())) {
                return false;
            }

            // Block, without launching an external intent, every top-level destination
            // outside the production HTTPS origin and the /kiosk route boundary.
            return !isAllowedKioskUrl(uri);
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            approvedKioskDocument = isAllowedKioskUrl(Uri.parse(url));
            if (!OFFLINE_URL.equals(url) && !PAYMENT_UNCERTAIN_URL.equals(url)) {
                showingOffline = false;
            }
            super.onPageStarted(view, url, favicon);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                showOffline(view, request.getUrl());
                return;
            }
            super.onReceivedError(view, request, error);
        }

        @Override
        public void onReceivedHttpError(
            WebView view,
            WebResourceRequest request,
            WebResourceResponse errorResponse
        ) {
            if (request.isForMainFrame()) {
                showOffline(view, request.getUrl());
                return;
            }
            super.onReceivedHttpError(view, request, errorResponse);
        }

        @Override
        public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            handler.cancel();
            showOffline(view, Uri.parse(view.getUrl() == null ? "" : view.getUrl()));
        }
    }

    private final class PaymentLockJavascriptInterface {
        @JavascriptInterface
        public boolean markActive() {
            return approvedKioskDocument && persistPaymentLock(true);
        }

        @JavascriptInterface
        public boolean clearIfSafe() {
            return approvedKioskDocument && persistPaymentLock(false);
        }
    }
}
