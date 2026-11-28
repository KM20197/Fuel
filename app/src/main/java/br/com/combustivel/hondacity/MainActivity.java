package br.com.combustivel.hondacity;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String LOCAL_START_URL = MainActivityHelper.LOCAL_ASSET_PREFIX + "index.html";
    private static final int REQUEST_OPEN_CSV = 4101;
    private static final int REQUEST_SAVE_CSV = 4102;

    private static final String STATE_PENDING_REQ_ID = "pending_request_id";
    private static final String STATE_PENDING_FILE_NAME = "pending_file_name";
    private static final String STATE_PENDING_MIME = "pending_mime_type";
    private static final String STATE_PENDING_CACHE_PATH = "pending_cache_path";

    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;
    private String pendingRequestId;
    private String pendingFileName;
    private String pendingMimeType;
    private String pendingCachePath;

    private final ExecutorService ioExecutor = Executors.newSingleThreadExecutor();
    private Object backInvokedCallback;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (savedInstanceState != null) {
            pendingRequestId = savedInstanceState.getString(STATE_PENDING_REQ_ID);
            pendingFileName = savedInstanceState.getString(STATE_PENDING_FILE_NAME);
            pendingMimeType = savedInstanceState.getString(STATE_PENDING_MIME);
            pendingCachePath = savedInstanceState.getString(STATE_PENDING_CACHE_PATH);
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            applyLegacySystemBarColors();
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(15, 19, 26));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                return Api30Insets.apply(view, insets);
            }
            return applyLegacyInsets(view, insets);
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " CalculadoraCombustivelAPK/3.1.1");

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.setWebViewClient(new LocalOnlyWebViewClient());
        webView.setWebChromeClient(new AppWebChromeClient());
        setContentView(webView);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            backInvokedCallback = Api33Back.register(this, this::handleBackNavigation);
        }

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(LOCAL_START_URL);
        }
    }

    @SuppressWarnings("deprecation")
    private void applyLegacySystemBarColors() {
        getWindow().setStatusBarColor(Color.rgb(15, 19, 26));
        getWindow().setNavigationBarColor(Color.rgb(15, 19, 26));
    }

    @SuppressWarnings("deprecation")
    private WindowInsets applyLegacyInsets(View view, WindowInsets insets) {
        view.setPadding(
            insets.getSystemWindowInsetLeft(),
            insets.getSystemWindowInsetTop(),
            insets.getSystemWindowInsetRight(),
            insets.getSystemWindowInsetBottom()
        );
        return insets.consumeSystemWindowInsets();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) {
            webView.saveState(outState);
        }
        outState.putString(STATE_PENDING_REQ_ID, pendingRequestId);
        outState.putString(STATE_PENDING_FILE_NAME, pendingFileName);
        outState.putString(STATE_PENDING_MIME, pendingMimeType);
        outState.putString(STATE_PENDING_CACHE_PATH, pendingCachePath);
        super.onSaveInstanceState(outState);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        handleBackNavigation();
    }

    private void handleBackNavigation() {
        if (webView == null) {
            finish();
            return;
        }
        webView.evaluateJavascript(
            "(function(){return window.handleAndroidBack ? Boolean(window.handleAndroidBack()) : false;})()",
            result -> {
                if ("true".equals(result)) {
                    return;
                }
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            }
        );
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
            String reqId = pendingRequestId;
            String cachePath = pendingCachePath;
            clearPendingExportMetadata();

            if (resultCode != RESULT_OK || data == null || data.getData() == null) {
                deleteTempFile(cachePath);
                notifySaveResult(reqId, false, true);
                return;
            }
            if (cachePath == null) {
                Toast.makeText(this, "Os dados da exportação não estavam mais disponíveis.", Toast.LENGTH_LONG).show();
                notifySaveResult(reqId, false, false);
                return;
            }
            writePendingFileAsync(data.getData(), new File(cachePath), reqId);
        }
    }

    private void writePendingFileAsync(Uri uri, File tempFile, String requestId) {
        ioExecutor.execute(() -> {
            boolean ok = false;
            try (
                InputStream input = new FileInputStream(tempFile);
                OutputStream output = getContentResolver().openOutputStream(uri, "w")
            ) {
                if (output == null) {
                    throw new IllegalStateException("O destino selecionado não pôde ser aberto.");
                }
                byte[] buffer = new byte[16384];
                int read;
                while ((read = input.read(buffer)) != -1) {
                    output.write(buffer, 0, read);
                }
                output.flush();
                ok = true;
            } catch (Exception error) {
                ok = false;
            } finally {
                if (tempFile.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    tempFile.delete();
                }
            }

            final boolean saved = ok;
            runOnUiThread(() -> {
                if (saved) {
                    Toast.makeText(this, "Arquivo salvo com sucesso.", Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(this, "Não foi possível salvar o arquivo.", Toast.LENGTH_LONG).show();
                }
                notifySaveResult(requestId, saved, false);
            });
        });
    }

    private void notifySaveResult(String requestId, boolean ok, boolean canceled) {
        if (webView == null || requestId == null || requestId.isEmpty()) {
            return;
        }
        String safeId = requestId.replaceAll("[^A-Za-z0-9_-]", "");
        String js = "window.__onAndroidSaveResult && window.__onAndroidSaveResult('"
            + safeId + "'," + ok + "," + canceled + ");";
        webView.evaluateJavascript(js, null);
    }

    private void clearPendingExportMetadata() {
        pendingRequestId = null;
        pendingFileName = null;
        pendingMimeType = null;
        pendingCachePath = null;
    }

    private static void deleteTempFile(String path) {
        if (path == null) {
            return;
        }
        File f = new File(path);
        if (f.exists()) {
            //noinspection ResultOfMethodCallIgnored
            f.delete();
        }
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
            if (uri == null) {
                return true;
            }
            String value = uri.toString();
            String scheme = uri.getScheme();
            if (MainActivityHelper.isLocalAssetOrAbout(value, scheme)) {
                return false;
            }
            if (!MainActivityHelper.isAllowedExternalScheme(scheme)) {
                Toast.makeText(MainActivity.this, "Esquema de link não permitido.", Toast.LENGTH_SHORT).show();
                return true;
            }
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (ActivityNotFoundException error) {
                Toast.makeText(MainActivity.this, "Nenhum aplicativo disponível para abrir este link.", Toast.LENGTH_LONG).show();
            } catch (RuntimeException error) {
                Toast.makeText(MainActivity.this, "Não foi possível abrir o link externo.", Toast.LENGTH_LONG).show();
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
                // "text/*" ocultava os backups .json (application/json) no seletor; o tipo é amplo e o
                // aplicativo valida o conteúdo ao importar.
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[] {
                    "text/*", "text/csv", "text/comma-separated-values", "application/csv",
                    "application/vnd.ms-excel", "application/json", "application/octet-stream"
                });
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
            saveTextWithId("", fileName, mimeType, text);
        }

        @JavascriptInterface
        public void saveTextWithId(String requestId, String fileName, String mimeType, String text) {
            final String safeReqId = requestId == null ? "" : requestId.replaceAll("[^A-Za-z0-9_-]", "");
            final String resolvedMime = (mimeType == null || mimeType.trim().isEmpty()) ? "text/csv" : mimeType.trim();
            final String resolvedName = MainActivityHelper.safeFileName(fileName, resolvedMime);
            final String content = text == null ? "" : text;

            runOnUiThread(() -> {
                deleteTempFile(pendingCachePath);
                File tempFile;
                try {
                    tempFile = File.createTempFile("fuel_export_", ".tmp", getCacheDir());
                    try (OutputStream out = new FileOutputStream(tempFile)) {
                        out.write(content.getBytes(StandardCharsets.UTF_8));
                        out.flush();
                    }
                } catch (IOException error) {
                    clearPendingExportMetadata();
                    Toast.makeText(MainActivity.this, "Não foi possível preparar o arquivo para salvar.", Toast.LENGTH_LONG).show();
                    notifySaveResult(safeReqId, false, false);
                    return;
                }

                pendingRequestId = safeReqId;
                pendingMimeType = resolvedMime;
                pendingFileName = resolvedName;
                pendingCachePath = tempFile.getAbsolutePath();

                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(resolvedMime);
                intent.putExtra(Intent.EXTRA_TITLE, resolvedName);
                try {
                    startActivityForResult(intent, REQUEST_SAVE_CSV);
                } catch (ActivityNotFoundException error) {
                    deleteTempFile(pendingCachePath);
                    clearPendingExportMetadata();
                    Toast.makeText(MainActivity.this, "Nenhum local disponível para salvar o arquivo.", Toast.LENGTH_LONG).show();
                    notifySaveResult(safeReqId, false, false);
                }
            });
        }
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && backInvokedCallback != null) {
            Api33Back.unregister(this, backInvokedCallback);
            backInvokedCallback = null;
        }
        ioExecutor.shutdownNow();
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidBridge");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private static final class Api30Insets {
        static WindowInsets apply(View view, WindowInsets insets) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
                return insets;
            }
            Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsets.CONSUMED;
        }
    }

    private static final class Api33Back {
        static Object register(Activity activity, Runnable onBack) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                return null;
            }
            android.window.OnBackInvokedCallback cb = onBack::run;
            activity.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                cb
            );
            return cb;
        }

        static void unregister(Activity activity, Object cb) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && cb instanceof android.window.OnBackInvokedCallback) {
                activity.getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(
                    (android.window.OnBackInvokedCallback) cb
                );
            }
        }
    }
}
