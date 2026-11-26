package br.com.combustivel.hondacity;

import java.util.Locale;

final class MainActivityHelper {
    static final String LOCAL_ASSET_PREFIX = "file:///android_asset/www/";

    private MainActivityHelper() {
    }

    static String extensaoPorMimeType(String mimeType) {
        String mime = mimeType == null ? "" : mimeType.trim().toLowerCase(Locale.ROOT);
        if (mime.startsWith("application/json")) {
            return ".json";
        }
        if (mime.startsWith("text/csv") || mime.startsWith("text/comma-separated-values")) {
            return ".csv";
        }
        return ".bin";
    }

    static String safeFileName(String value, String mimeType) {
        String fallback = "calculadora_combustivel" + extensaoPorMimeType(mimeType);
        if (value == null || value.trim().isEmpty()) {
            return fallback;
        }
        String safe = value.trim().replaceAll("[\\\\/:*?\"<>|]", "_");
        String minusculo = safe.toLowerCase(Locale.ROOT);
        if (minusculo.endsWith(".csv") || minusculo.endsWith(".json")) {
            return safe;
        }
        return safe + extensaoPorMimeType(mimeType);
    }

    static boolean isLocalAssetOrAbout(String url, String scheme) {
        if (url != null && url.startsWith(LOCAL_ASSET_PREFIX)) {
            return true;
        }
        return "about".equalsIgnoreCase(scheme);
    }

    static boolean isAllowedExternalScheme(String scheme) {
        return "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);
    }
}
