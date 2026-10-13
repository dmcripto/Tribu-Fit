import type { Metadata } from "next";
import PaginaLegal, { Seccion } from "@/components/PaginaLegal";
import { CONTACTO, RESPONSABLE } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de privacidad · Tribu Fit" };

export default function Privacidad() {
  return (
    <PaginaLegal titulo="Política de privacidad">
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        En Tribu Fit tratamos datos sensibles, como tu peso, tus entrenos y tu alimentación. Aquí te explicamos qué guardamos, para qué, quién puede verlo y cómo controlarlo.
      </p>

      <Seccion titulo="1. Quién es el responsable">
        <p>
          El responsable del tratamiento es {RESPONSABLE}.{" "}
          {CONTACTO ? <>Puedes escribirnos a <b>{CONTACTO}</b> para cualquier consulta o para ejercer tus derechos.</> : "Puedes contactarnos por el medio indicado en la aplicación para cualquier consulta o para ejercer tus derechos."}
        </p>
      </Seccion>

      <Seccion titulo="2. Qué datos tratamos">
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Cuenta:</b> nombre, correo electrónico y contraseña. La contraseña se guarda cifrada y nadie puede leerla.</li>
          <li><b>Salud y condición física:</b> peso, % de grasa, cintura, entrenos realizados, comidas y calorías, agua, objetivo y nivel. Son datos de salud, una categoría especial que protegemos con más cuidado.</li>
          <li><b>Pagos:</b> importe, método, número de operación y el comprobante si lo subes, además de las fechas de vencimiento de tu cuota. <b>No guardamos datos de tarjetas.</b></li>
          <li><b>Plan y seguimiento:</b> los planes de rutinas y objetivos de nutrición que tu entrenador/a te asigna.</li>
          <li><b>Técnicos:</b> usamos el almacenamiento de tu navegador para mantener tu sesión. No usamos cookies de publicidad ni de seguimiento.</li>
        </ul>
      </Seccion>

      <Seccion titulo="3. Para qué los usamos y con qué base">
        <ul className="list-disc space-y-1 pl-5">
          <li>Darte el servicio: registrar tu progreso, mostrarte tus rutinas y tu nutrición. Base: ejecución del servicio que pides.</li>
          <li>Tratar tus <b>datos de salud</b>: lo hacemos solo con tu <b>consentimiento explícito</b>, que das al registrarte y puedes retirar cuando quieras.</li>
          <li>Compartir tu progreso con tu entrenador/a o tu tribu: solo si lo permites, y puedes cambiarlo en Cuenta.</li>
          <li>Gestionar tu cuota y el acceso al seguimiento personalizado. Base: ejecución del servicio.</li>
          <li>Cumplir obligaciones legales y proteger la seguridad del servicio.</li>
        </ul>
        <p>No vendemos tus datos ni los usamos para publicidad.</p>
      </Seccion>

      <Seccion titulo="4. Quién puede ver tus datos">
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Tú</b>, siempre.</li>
          <li><b>Tu entrenador/a</b>, si estás vinculado/a con su código y le diste permiso. Siempre ve tus pagos y tu estado de cuota, porque son su cobro.</li>
          <li><b>Tu tribu</b>, tu racha y tus puntos, solo si lo permites.</li>
          <li><b>Proveedores técnicos</b> que nos prestan el servicio y tratan datos por encargo nuestro: Supabase (base de datos y autenticación) y Vercel (alojamiento de la web).</li>
          <li><b>El proveedor de pagos</b> que use tu entrenador/a, si pagas con tarjeta. Pagas en su página, con sus propias condiciones, y no en Tribu Fit.</li>
        </ul>
      </Seccion>

      <Seccion titulo="5. Transferencias internacionales">
        <p>Nuestros proveedores pueden almacenar datos en servidores fuera de tu país, por ejemplo en Estados Unidos. Trabajamos con proveedores que aplican medidas de seguridad reconocidas.</p>
      </Seccion>

      <Seccion titulo="6. Cuánto tiempo los guardamos">
        <p>Mientras tengas cuenta. Si la eliminas, borramos tus datos de nuestra base de datos. Pueden permanecer en copias de seguridad un tiempo limitado hasta que se renuevan.</p>
      </Seccion>

      <Seccion titulo="7. Tus derechos">
        <p>Tienes derecho a acceder a tus datos, corregirlos, borrarlos, llevártelos, limitar o oponerte a su uso y retirar tu consentimiento. Puedes hacerlo tú mismo/a desde <b>Cuenta</b>:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Descargar mis datos:</b> te entrega todo lo que guardamos de ti en un archivo.</li>
          <li><b>Permisos:</b> decides si compartes tu progreso con tu entrenador/a y tu tribu.</li>
          <li><b>Eliminar mi cuenta:</b> borra tu cuenta y tus datos de forma definitiva.</li>
        </ul>
        <p>Si algo no puedes hacerlo desde ahí, escríbenos. También puedes reclamar ante la autoridad de protección de datos de tu país.</p>
      </Seccion>

      <Seccion titulo="8. Seguridad">
        <p>Las conexiones van cifradas. Las contraseñas se guardan cifradas. La base de datos aplica reglas de acceso por usuario, de modo que cada persona solo accede a lo suyo y a lo que le han permitido. Ningún sistema es infalible, pero trabajamos para proteger tus datos.</p>
      </Seccion>

      <Seccion titulo="9. Menores">
        <p>Tribu Fit es para mayores de 16 años. Si eres menor de esa edad, necesitas la autorización de tu madre, padre o tutor.</p>
      </Seccion>

      <Seccion titulo="10. Cambios">
        <p>Si cambiamos esta política de forma importante, te lo avisaremos en la aplicación y, cuando haga falta, te pediremos que la aceptes de nuevo.</p>
      </Seccion>
    </PaginaLegal>
  );
}
