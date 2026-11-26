package br.com.combustivel.hondacity;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class MainActivityHelperTest {
    @Test
    public void extensaoPorMimeType_mapeiaJsonCsvEOutros() {
        assertEquals(".json", MainActivityHelper.extensaoPorMimeType("application/json;charset=utf-8"));
        assertEquals(".csv", MainActivityHelper.extensaoPorMimeType("text/csv"));
        assertEquals(".csv", MainActivityHelper.extensaoPorMimeType("text/comma-separated-values"));
        assertEquals(".bin", MainActivityHelper.extensaoPorMimeType("application/octet-stream"));
        assertEquals(".bin", MainActivityHelper.extensaoPorMimeType(null));
    }

    @Test
    public void safeFileName_sanitizaCaracteresEPadronizaExtensao() {
        assertEquals("calculadora_combustivel.csv", MainActivityHelper.safeFileName("", "text/csv"));
        assertEquals("backup_2026_09.json", MainActivityHelper.safeFileName("backup/2026:09", "application/json"));
        assertEquals("historico_planilha.csv", MainActivityHelper.safeFileName("historico_planilha.csv", "text/csv"));
    }

    @Test
    public void isLocalAssetOrAbout_permiteApenasAssetsLocaisEAbout() {
        assertTrue(MainActivityHelper.isLocalAssetOrAbout("file:///android_asset/www/index.html", "file"));
        assertTrue(MainActivityHelper.isLocalAssetOrAbout("about:blank", "about"));
        assertFalse(MainActivityHelper.isLocalAssetOrAbout("file:///data/data/pkg/secret", "file"));
        assertFalse(MainActivityHelper.isLocalAssetOrAbout("https://example.com", "https"));
    }

    @Test
    public void isAllowedExternalScheme_restringeParaHttpEHttps() {
        assertTrue(MainActivityHelper.isAllowedExternalScheme("https"));
        assertTrue(MainActivityHelper.isAllowedExternalScheme("http"));
        assertFalse(MainActivityHelper.isAllowedExternalScheme("file"));
        assertFalse(MainActivityHelper.isAllowedExternalScheme("content"));
        assertFalse(MainActivityHelper.isAllowedExternalScheme("intent"));
        assertFalse(MainActivityHelper.isAllowedExternalScheme("javascript"));
        assertFalse(MainActivityHelper.isAllowedExternalScheme(null));
    }
}
