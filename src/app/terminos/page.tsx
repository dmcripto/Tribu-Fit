import type { Metadata } from "next";
import PaginaLegal, { Seccion } from "@/components/PaginaLegal";
import { CONTACTO, RESPONSABLE } from "@/lib/legal";

export const metadata: Metadata = { title: "Términos de uso · Tribu Fit" };

export default function Terminos() {
  return (
    <PaginaLegal titulo="Términos de uso">
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        Al crear una cuenta en Tribu Fit aceptas estas condiciones. Léelas con calma: son cortas y explican cómo funciona el servicio.
      </p>

      <Seccion titulo="1. Qué es Tribu Fit">
        <p>Tribu Fit es una plataforma que ayuda a entrenadores/as y a sus alumnos a llevar el seguimiento del entrenamiento, la nutrición y los pagos de la cuota. El servicio lo ofrece {RESPONSABLE}.</p>
      </Seccion>

      <Seccion titulo="2. Tu cuenta">
        <p>Debes tener 16 años o más. Da datos verdaderos, guarda tu contraseña en secreto y avísanos si crees que alguien entró en tu cuenta. Eres responsable de lo que se haga con ella.</p>
      </Seccion>

      <Seccion titulo="3. No es consejo médico">
        <p>Tribu Fit y los planes que veas aquí no sustituyen la opinión de un médico ni de un profesional de la salud. Antes de empezar o cambiar un plan de ejercicio o de alimentación, consulta con un profesional, sobre todo si tienes alguna condición de salud. Si sientes dolor, mareo o malestar, detente. Entrenas bajo tu propia responsabilidad.</p>
      </Seccion>

      <Seccion titulo="4. Tu entrenador/a">
        <p>Las rutinas y los objetivos de nutrición los define tu entrenador/a, que es responsable de su contenido. Tribu Fit es la herramienta donde se entregan y no comprueba títulos ni formación de los entrenadores.</p>
      </Seccion>

      <Seccion titulo="5. Pagos">
        <ul className="list-disc space-y-1 pl-5">
          <li>La cuota se acuerda entre tú y tu entrenador/a. Tribu Fit <b>no cobra ni retiene dinero</b> ni guarda datos de tarjetas.</li>
          <li>Si pagas con tarjeta, lo haces en la página de un proveedor de pagos externo, con sus propias condiciones.</li>
          <li>Tu pago queda confirmado cuando tu entrenador/a lo confirma. Las devoluciones, los errores de cobro y las disputas se resuelven entre tú y tu entrenador/a.</li>
        </ul>
      </Seccion>

      <Seccion titulo="6. Seguimiento premium y bloqueo">
        <ul className="list-disc space-y-1 pl-5">
          <li>El seguimiento personalizado (plan de rutinas y nutrición a tu medida) depende de tener la cuota al día.</li>
          <li>Si la cuota vence, tienes unos días de gracia que fija tu entrenador/a. Después, el seguimiento personalizado se bloquea automáticamente hasta que se confirme un pago nuevo.</li>
          <li>Tu entrenador/a también puede bloquearlo, o darte acceso gratuito, según su criterio.</li>
          <li>Mientras esté bloqueado, no pierdes tus datos: sigues viendo tu historial y puedes registrar medidas, comidas y entrenos.</li>
        </ul>
      </Seccion>

      <Seccion titulo="7. Uso correcto">
        <p>No suplantes a otras personas, no subas contenido ilegal u ofensivo (por ejemplo, en los comprobantes de pago), no intentes acceder a datos de otros usuarios y no uses el servicio para abusar de él o dañarlo.</p>
      </Seccion>

      <Seccion titulo="8. Tus datos">
        <p>Tus datos son tuyos. Nos permites usarlos solo para darte el servicio, como explica la <a href="/privacidad" className="font-bold text-orange-600">Política de privacidad</a>. Puedes descargarlos o borrar tu cuenta cuando quieras desde Cuenta.</p>
      </Seccion>

      <Seccion titulo="9. Disponibilidad y responsabilidad">
        <p>Hacemos lo posible para que el servicio funcione siempre, pero puede haber interrupciones o cambios. En la medida que permita la ley, no respondemos por daños indirectos, por lesiones derivadas de ejercicios o dietas, ni por acuerdos entre alumnos y entrenadores. Esto no limita los derechos que la ley te reconozca como consumidor.</p>
      </Seccion>

      <Seccion titulo="10. Terminar">
        <p>Puedes dejar de usar Tribu Fit y eliminar tu cuenta cuando quieras. Podemos suspender cuentas que incumplan estos términos.</p>
      </Seccion>

      <Seccion titulo="11. Cambios y ley aplicable">
        <p>Podemos actualizar estos términos. Si el cambio es importante, te avisaremos y podremos pedirte que lo aceptes de nuevo. Se rigen por la ley del país donde tiene su sede el responsable del servicio, sin perjuicio de los derechos de consumidor que te reconozca la ley de tu país.</p>
      </Seccion>

      <Seccion titulo="12. Propiedad intelectual">
        <p>Tribu Fit (la aplicación, su código, diseño, textos, logotipo, imágenes y videos) es propiedad de Mario David Macías, con todos los derechos reservados. Se te permite usar el servicio para tu entrenamiento, pero no copiar, reproducir, modificar, descompilar, hacer ingeniería inversa, extraer de forma automática su contenido ni crear obras derivadas o servicios que lo imiten, sin autorización escrita del titular. El nombre y el logotipo «Tribu Fit» no pueden usarse sin permiso.</p>
      </Seccion>

      <Seccion titulo="13. Contacto">
        <p>{CONTACTO ? <>Escríbenos a <b>{CONTACTO}</b>.</> : "Contáctanos por el medio indicado en la aplicación."}</p>
      </Seccion>
    </PaginaLegal>
  );
}
