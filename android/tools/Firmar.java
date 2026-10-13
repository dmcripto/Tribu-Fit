import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;

import java.io.File;
import java.io.FileInputStream;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Firma y verifica un APK con la librería oficial de Android (apksig).
 *   firmar   <clave.p12> <alias> <contraseña> <entrada.apk> <salida.apk> <minSdk>
 *   verificar <apk> <minSdk>
 */
public class Firmar {
    public static void main(String[] a) throws Exception {
        if (a.length >= 1 && a[0].equals("verificar")) {
            verificar(new File(a[1]), Integer.parseInt(a[2]));
            return;
        }
        if (a.length != 7 || !a[0].equals("firmar")) {
            System.err.println("Uso: firmar <clave.p12> <alias> <contraseña> <entrada.apk> <salida.apk> <minSdk> | verificar <apk> <minSdk>");
            System.exit(2);
        }
        KeyStore ks = KeyStore.getInstance("PKCS12");
        try (FileInputStream in = new FileInputStream(a[1])) {
            ks.load(in, a[3].toCharArray());
        }
        PrivateKey clave = (PrivateKey) ks.getKey(a[2], a[3].toCharArray());
        List<X509Certificate> cadena = new ArrayList<>();
        for (Certificate c : ks.getCertificateChain(a[2])) cadena.add((X509Certificate) c);

        ApkSigner.SignerConfig firmante = new ApkSigner.SignerConfig.Builder("tribufit", clave, cadena).build();
        new ApkSigner.Builder(Collections.singletonList(firmante))
                .setInputApk(new File(a[4]))
                .setOutputApk(new File(a[5]))
                .setMinSdkVersion(Integer.parseInt(a[6]))
                // La firma v1 (JAR) solo hace falta por debajo de Android 7. La app exige Android 8 o superior.
                .setV1SigningEnabled(false)
                .setV2SigningEnabled(true)
                .build()
                .sign();
        System.out.println("APK firmado: " + a[5]);
    }

    private static void verificar(File apk, int minSdk) throws Exception {
        ApkVerifier.Result r = new ApkVerifier.Builder(apk).setMinCheckedPlatformVersion(minSdk).build().verify();
        System.out.println("Firma válida:        " + r.isVerified());
        System.out.println("Esquema v1 (jar):    " + r.isVerifiedUsingV1Scheme());
        System.out.println("Esquema v2:          " + r.isVerifiedUsingV2Scheme());
        for (X509Certificate c : r.getSignerCertificates()) {
            byte[] h = MessageDigest.getInstance("SHA-256").digest(c.getEncoded());
            StringBuilder sb = new StringBuilder();
            for (byte b : h) sb.append(String.format("%02X", b));
            System.out.println("Certificado:         " + c.getSubjectX500Principal() + " (válido hasta " + c.getNotAfter() + ")");
            System.out.println("Huella SHA-256:      " + sb);
        }
        r.getErrors().forEach(e -> System.out.println("ERROR:   " + e));
        r.getWarnings().forEach(w -> System.out.println("AVISO:   " + w));
        if (!r.isVerified()) System.exit(1);
    }
}
