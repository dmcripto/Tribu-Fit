package com.tribufit.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.net.http.SslError;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Tribu Fit para Android: la web de Tribu Fit dentro de un contenedor.
 * Todo el contenido y la lógica viven en la web, así que se actualiza sin instalar nada nuevo.
 */
public class MainActivity extends Activity {
    private static final int PEDIR_ARCHIVO = 1001;
    private static final String PAGINA_SIN_CONEXION = "file:///android_asset/sin-conexion.html";

    private WebView web;
    private ValueCallback<Uri[]> alElegirArchivo;
    private String urlInicial;
    private String host;
    /** Última dirección cargada. Se guarda aparte para poder leerla desde el hilo del puente de JavaScript. */
    private volatile String urlActual = "";
    private boolean mostrandoSinConexion;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        urlInicial = getString(R.string.app_url);
        host = Uri.parse(urlInicial).getHost();

        web = new WebView(this);
        setContentView(web);

        WebSettings ajustes = web.getSettings();
        ajustes.setJavaScriptEnabled(true);
        ajustes.setDomStorageEnabled(true); // la sesión y los datos de la web usan el almacenamiento local
        ajustes.setAllowFileAccess(false);
        ajustes.setAllowContentAccess(false);
        ajustes.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        ajustes.setSupportMultipleWindows(false);
        ajustes.setMediaPlaybackRequiresUserGesture(true);
        ajustes.setUserAgentString(ajustes.getUserAgentString() + " TribuFitApp/1.0");
        WebView.setWebContentsDebuggingEnabled(false);
        CookieManager.getInstance().setAcceptCookie(true);

        web.addJavascriptInterface(new Puente(), "TribuFitApp");
        web.setWebViewClient(new Cliente());
        web.setWebChromeClient(new Chrome());
        web.setDownloadListener((url, agente, disposicion, mime, longitud) -> {
            if (url != null && url.startsWith("blob:")) {
                descargarBlob(url, mime, URLUtil.guessFileName(url, disposicion, mime));
            }
        });

        if (estado != null) {
            web.restoreState(estado);
        } else {
            web.loadUrl(urlInicial);
        }
    }

    /* ---------- Navegación ---------- */

    private class Cliente extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView vista, WebResourceRequest peticion) {
            return enlaceExterno(peticion.getUrl());
        }

        @Override
        public void onPageStarted(WebView vista, String url, Bitmap icono) {
            urlActual = url == null ? "" : url;
        }

        @Override
        public void onPageFinished(WebView vista, String url) {
            mostrandoSinConexion = PAGINA_SIN_CONEXION.equals(url);
        }

        @Override
        public void onReceivedError(WebView vista, WebResourceRequest peticion, WebResourceError error) {
            if (peticion.isForMainFrame()) {
                mostrandoSinConexion = true;
                vista.loadUrl(PAGINA_SIN_CONEXION);
            }
        }

        @Override
        public void onReceivedSslError(WebView vista, SslErrorHandler manejador, SslError error) {
            // Nunca se acepta un certificado dudoso.
            manejador.cancel();
        }
    }

    /**
     * Devuelve true si el enlace se abre fuera de la app (en el navegador u otra app) y false si
     * se queda dentro. Solo se queda dentro lo que pertenece a la propia web de Tribu Fit.
     */
    private boolean enlaceExterno(Uri uri) {
        String esquema = uri.getScheme() == null ? "" : uri.getScheme();
        if (esquema.equals("https") && host != null && host.equalsIgnoreCase(uri.getHost())) return false;
        if (uri.toString().startsWith("file:///android_asset/")) return false;
        if (esquema.equals("https") || esquema.equals("http") || esquema.equals("mailto")
                || esquema.equals("tel") || esquema.equals("sms") || esquema.equals("whatsapp")) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (ActivityNotFoundException e) {
                // No hay ninguna app que lo abra: se ignora.
            }
        }
        return true;
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack() && !mostrandoSinConexion) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    /* ---------- Subir archivos (comprobantes, QR) ---------- */

    private class Chrome extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView vista, ValueCallback<Uri[]> respuesta, FileChooserParams parametros) {
            if (alElegirArchivo != null) alElegirArchivo.onReceiveValue(null);
            alElegirArchivo = respuesta;
            try {
                startActivityForResult(parametros.createIntent(), PEDIR_ARCHIVO);
            } catch (ActivityNotFoundException e) {
                alElegirArchivo = null;
                return false;
            }
            return true;
        }
    }

    @Override
    protected void onActivityResult(int codigo, int resultado, Intent datos) {
        super.onActivityResult(codigo, resultado, datos);
        if (codigo == PEDIR_ARCHIVO && alElegirArchivo != null) {
            alElegirArchivo.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultado, datos));
            alElegirArchivo = null;
        }
    }

    /* ---------- Descargas (por ejemplo "Descargar mis datos") ---------- */

    /** Las descargas de la web son archivos "blob" que el sistema no puede bajar solo: se leen con JavaScript. */
    private void descargarBlob(String url, String mime, String nombre) {
        String js = "javascript:(function(){var x=new XMLHttpRequest();x.open('GET'," + JSONObject.quote(url)
                + ",true);x.responseType='blob';x.onload=function(){if(x.status===200){var r=new FileReader();"
                + "r.onloadend=function(){TribuFitApp.guardarArchivo(r.result," + JSONObject.quote(mime == null ? "" : mime)
                + "," + JSONObject.quote(nombre) + ");};r.readAsDataURL(x.response);}};x.send();})();";
        web.loadUrl(js);
    }

    private boolean paginaDeConfianza() {
        String u = urlActual;
        return u.startsWith("https://" + host + "/") || u.equals("https://" + host);
    }

    private void avisar(final int texto) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, texto, Toast.LENGTH_LONG).show());
    }

    /** Funciones que la web puede llamar. Solo se atienden si la página es la de Tribu Fit. */
    private class Puente {
        @JavascriptInterface
        public void guardarArchivo(String urlDeDatos, String mime, String nombre) {
            if (!paginaDeConfianza() || urlDeDatos == null) return;
            try {
                int coma = urlDeDatos.indexOf(',');
                byte[] bytes = Base64.decode(urlDeDatos.substring(coma + 1), Base64.DEFAULT);
                String limpio = nombre == null ? "tribu-fit" : nombre.replaceAll("[^A-Za-z0-9._-]", "_");
                if (limpio.length() > 80) limpio = limpio.substring(limpio.length() - 80);
                String tipo = (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime;
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues valores = new ContentValues();
                    valores.put(MediaStore.MediaColumns.DISPLAY_NAME, limpio);
                    valores.put(MediaStore.MediaColumns.MIME_TYPE, tipo);
                    valores.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    Uri destino = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, valores);
                    if (destino == null) throw new IllegalStateException("sin destino");
                    OutputStream salida = getContentResolver().openOutputStream(destino);
                    try { salida.write(bytes); } finally { salida.close(); }
                } else {
                    File carpeta = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                    FileOutputStream salida = new FileOutputStream(new File(carpeta, limpio));
                    try { salida.write(bytes); } finally { salida.close(); }
                }
                avisar(R.string.descarga_guardada);
            } catch (Exception e) {
                avisar(R.string.descarga_error);
            }
        }

        /** Botón "Reintentar" de la pantalla sin conexión. */
        @JavascriptInterface
        public void reintentar() {
            runOnUiThread(() -> web.loadUrl(urlInicial));
        }
    }

    /* ---------- Ciclo de vida ---------- */

    @Override
    protected void onSaveInstanceState(Bundle estado) {
        super.onSaveInstanceState(estado);
        web.saveState(estado);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
        CookieManager.getInstance().flush();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }
}
