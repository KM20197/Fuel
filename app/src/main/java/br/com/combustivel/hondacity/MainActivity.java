package br.com.combustivel.hondacity;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final String LOCAL_START_URL = "file:///android_asset/www/index.html";
    private static final String LOCAL_ASSET_PREFIX = "file:///android_asset/www/";
    private static final int REQUEST_OPEN_CSV = 4101;
    private static final int REQUEST_SAVE_CSV = 4102;

    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;
    private String pendingFileName;
    private String pendingMimeType;
    private String pendingText;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.rgb(15, 19, 26));
        getWindow().setNavigationBarColor(Color.rgb(15, 19, 26));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(15, 19, 26));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " CalculadoraCombustivelAPK/3.0");

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.setWebViewClient(new LocalOnlyWebViewClient());
        webView.setWebChromeClient(new AppWebChromeClient());
        setContentView(webView);

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(LOCAL_START_URL);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == REQUEST_OPEN_CSV) {
            if (fileChooserCallback != null) {
                fileChooserCallback.onReceiveValue(
                    WebChromeClient.FileChooserParams.parseResult(resultCode, data)
                );
                fileChooserCallback = null;
            }
            return;
        }

        if (requestCode == REQUEST_SAVE_CSV) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null && pendingText != null) {
                writePendingText(data.getData());
            }
            clearPendingExport();
        }
    }

    private void writePendingText(Uri uri) {
        try (OutputStream output = getContentResolver().openOutputStream(uri, "w")) {
            if (output == null) {
                throw new IllegalStateException("O destino selecionado não pôde ser aberto.");
            }
            output.write(pendingText.getBytes(StandardCharsets.UTF_8));
            output.flush();
            Toast.makeText(this, "CSV salvo com sucesso.", Toast.LENGTH_SHORT).show();
        } catch (Exception error) {
            Toast.makeText(this, "Não foi possível salvar o CSV.", Toast.LENGTH_LONG).show();
        }
    }

    private void clearPendingExport() {
        pendingFileName = null;
        pendingMimeType = null;
        pendingText = null;
    }

    private String safeFileName(String value) {
        String fallback = "calculadora_combustivel.csv";
        if (value == null || value.trim().isEmpty()) {
            return fallback;
        }
        String safe = value.trim().replaceAll("[\\\\/:*?\"<>|]", "_");
        return safe.toLowerCase().endsWith(".csv") ? safe : safe + ".csv";
    }

    private final class LocalOnlyWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return handleNavigation(request.getUrl());
        }

        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return handleNavigation(Uri.parse(url));
        }

        private boolean handleNavigation(Uri uri) {
            String value = uri.toString();
            if (value.startsWith(LOCAL_ASSET_PREFIX) || "about".equals(uri.getScheme())) {
                return false;
            }

            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (ActivityNotFoundException error) {
                Toast.makeText(MainActivity.this, "Nenhum aplicativo disponível para abrir este link.", Toast.LENGTH_LONG).show();
            }
            return true;
        }
    }

    private final class AppWebChromeClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(
            WebView view,
            ValueCallback<Uri[]> callback,
            FileChooserParams fileChooserParams
        ) {
            if (fileChooserCallback != null) {
                fileChooserCallback.onReceiveValue(null);
            }
            fileChooserCallback = callback;

            Intent intent;
            try {
                intent = fileChooserParams.createIntent();
                intent.setType("text/*");
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                startActivityForResult(intent, REQUEST_OPEN_CSV);
                return true;
            } catch (ActivityNotFoundException error) {
                fileChooserCallback = null;
                Toast.makeText(MainActivity.this, "Nenhum seletor de arquivos disponível.", Toast.LENGTH_LONG).show();
                return false;
            }
        }
    }

    public final class AndroidBridge {
        @JavascriptInterface
        public void saveText(String fileName, String mimeType, String text) {
            pendingFileName = safeFileName(fileName);
            pendingMimeType = (mimeType == null || mimeType.trim().isEmpty()) ? "text/csv" : mimeType;
            pendingText = text == null ? "" : text;

            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(pendingMimeType);
                intent.putExtra(Intent.EXTRA_TITLE, pendingFileName);
                try {
                    startActivityForResult(intent, REQUEST_SAVE_CSV);
                } catch (ActivityNotFoundException error) {
                    clearPendingExport();
                    Toast.makeText(MainActivity.this, "Nenhum local disponível para salvar o CSV.", Toast.LENGTH_LONG).show();
                }
            });
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidBridge");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
