"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { useMiAvatar } from "@/lib/avatar";
import { imagenADataUrl } from "@/lib/imagen";
import { useTema, type Tema } from "@/lib/tema";
import { useCliente } from "@/lib/store";
import { useUsuario } from "@/components/AppShell";
import CampoClave from "@/components/CampoClave";
import Desplegable from "@/components/Desplegable";
import { cambiarClave } from "@/lib/auth";
import { descargarJson, eliminarCuenta, exportarDatos, guardarPermisos, leerPermisos, type Permisos } from "@/lib/cuenta";
import { modoDemo } from "@/lib/supabase";
import type { Usuario } from "@/lib/types";

type Mensaje = { ok: boolean; texto: string } | null;

function Aviso({ msg }: { msg: Mensaje }) {
  if (!msg) return null;
  return (
    <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
      {msg.texto}
    </p>
  );
}

function PermisosCuenta({ uid, rol }: { uid: string; rol: string }) {
  const [permisos, setPermisos] = useState<Permisos | null>(null);
  const [msg, setMsg] = useState<Mensaje>(null);

  useEffect(() => {
    let vivo = true;
    leerPermisos(uid).then((p) => { if (vivo) setPermisos(p); }).catch(() => {});
    return () => { vivo = false; };
  }, [uid]);

  async function cambiar(parche: Partial<Permisos>) {
    if (!permisos) return;
    const nuevo = { ...permisos, ...parche };
    setPermisos(nuevo);
    const fallo = await guardarPermisos(uid, nuevo);
    setMsg(fallo ? { ok: false, texto: fallo } : { ok: true, texto: "Permiso actualizado." });
  }

  if (!permisos) return <p className="text-sm text-zinc-500">{modoDemo ? "En el modo demo no hay permisos que cambiar." : "Cargando tus permisos..."}</p>;
  return (
    <div className="flex flex-col gap-3">
      {rol === "atleta" && (
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 size-5 accent-orange-600" checked={permisos.entrenador} onChange={(e) => cambiar({ entrenador: e.target.checked })} />
          <span><b>Mi entrenador/a puede ver mis medidas, entrenos y comidas.</b><br /><span className="text-zinc-500">Si lo desactivas, te verá como &quot;Sin permiso&quot;. Tu estado de cuota sigue visible porque es su cobro.</span></span>
        </label>
      )}
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 size-5 accent-orange-600" checked={permisos.tribu} onChange={(e) => cambiar({ tribu: e.target.checked })} />
        <span><b>Aparecer en el ranking de mi tribu.</b><br /><span className="text-zinc-500">Mostrará mi nombre y cuántos entrenos hice en 30 días a los demás alumnos de mi entrenador/a.</span></span>
      </label>
      <Aviso msg={msg} />
    </div>
  );
}

function FotoPerfil({ usuario }: { usuario: Usuario }) {
  const { avatar, guardar } = useMiAvatar(usuario);
  const [msg, setMsg] = useState<Mensaje>(null);
  const [ocupado, setOcupado] = useState(false);
  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    const campo = e.target;
    if (!archivo) return;
    setOcupado(true);
    const r = await imagenADataUrl(archivo, { lado: 256 });
    if (!r.url) setMsg({ ok: false, texto: r.error ?? "No se pudo leer la imagen." });
    else {
      const fallo = await guardar(r.url);
      setMsg(fallo ? { ok: false, texto: fallo } : { ok: true, texto: "Foto de perfil actualizada." });
    }
    setOcupado(false);
    campo.value = "";
  }
  async function quitar() {
    const fallo = await guardar(null);
    setMsg(fallo ? { ok: false, texto: fallo } : { ok: true, texto: "Quitaste tu foto de perfil." });
  }
  return (
    <section className="tarjeta flex flex-col gap-4" aria-label="Foto de perfil">
      <h2 className="subtitulo">Foto de perfil</h2>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar nombre={usuario.nombre} src={avatar} className="size-24 text-4xl" />
        <div className="flex flex-col items-start gap-2">
          <label className="btn-primary cursor-pointer" aria-disabled={ocupado}>
            {ocupado ? "Guardando…" : avatar ? "Cambiar foto" : "Subir foto"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Elegir foto de perfil" onChange={subir} disabled={ocupado} />
          </label>
          {avatar && <button type="button" className="text-sm font-bold text-red-600 underline" onClick={quitar}>Quitar foto</button>}
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        {usuario.rol === "entrenador" ? "La ven tus alumnos en el chat." : "La ve tu entrenador/a en tu ficha y en el chat."}
      </p>
      <Aviso msg={msg} />
    </section>
  );
}

function Preferencias() {
  const [tema, setTema] = useTema();
  const inicial = useCliente(() => (typeof Notification === "undefined" ? "no" : Notification.permission), "no");
  const [nuevo, setPermiso] = useState<string | null>(null);
  const permiso = nuevo ?? inicial;
  async function activar() {
    try { setPermiso(await Notification.requestPermission()); } catch { /* sin soporte */ }
  }
  return (
    <section className="tarjeta flex flex-col gap-4">
      <h2 className="subtitulo">Preferencias</h2>
      <div>
        <label className="etiqueta" htmlFor="tema">Tema</label>
        <select id="tema" className="campo max-w-60" value={tema} onChange={(e) => setTema(e.target.value as Tema)}>
          <option value="auto">Automático (como tu teléfono)</option>
          <option value="claro">Claro</option>
          <option value="oscuro">Oscuro</option>
        </select>
      </div>
      <div className="flex flex-col items-start gap-2">
        <span className="etiqueta !mb-0">Avisos en este dispositivo</span>
        {permiso === "no" ? (
          <p className="text-sm text-zinc-500">Este navegador no permite avisos del sistema. Tus avisos siguen en la campana 🔔.</p>
        ) : permiso === "granted" ? (
          <p className="text-sm text-green-700 dark:text-green-400">Activados: te avisaremos cuando llegue algo mientras la app esté abierta.</p>
        ) : permiso === "denied" ? (
          <p className="text-sm text-zinc-500">Los bloqueaste en el navegador. Puedes activarlos desde los ajustes del sitio.</p>
        ) : (
          <button type="button" className="btn-ghost" onClick={activar}>Activar avisos</button>
        )}
      </div>
    </section>
  );
}

export default function Cuenta() {
  const usuario = useUsuario();
  const router = useRouter();
  const [datosMsg, setDatosMsg] = useState<Mensaje>(null);
  const [claveMsg, setClaveMsg] = useState<Mensaje>(null);
  const [borrarMsg, setBorrarMsg] = useState<Mensaje>(null);
  const [confirmacion, setConfirmacion] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  if (!usuario) return null;

  async function descargar() {
    setTrabajando(true);
    try {
      descargarJson(`tribu-fit-mis-datos-${new Date().toISOString().slice(0, 10)}.json`, await exportarDatos(usuario!));
      setDatosMsg({ ok: true, texto: "Listo. Se descargó un archivo con todos tus datos." });
    } catch {
      setDatosMsg({ ok: false, texto: "No se pudieron reunir tus datos. Inténtalo de nuevo." });
    }
    setTrabajando(false);
  }

  async function nuevaClave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulario = e.currentTarget;
    const f = new FormData(formulario);
    const nueva = String(f.get("nueva") ?? "");
    if (nueva.length < 8) return setClaveMsg({ ok: false, texto: "La contraseña necesita 8 caracteres o más." });
    if (nueva !== String(f.get("repetir") ?? "")) return setClaveMsg({ ok: false, texto: "Las dos contraseñas no coinciden." });
    const fallo = await cambiarClave(nueva);
    setClaveMsg(fallo ? { ok: false, texto: fallo } : { ok: true, texto: "Contraseña cambiada." });
    if (!fallo) formulario.reset();
  }

  async function borrar() {
    if (confirmacion.trim().toUpperCase() !== "ELIMINAR") return setBorrarMsg({ ok: false, texto: "Escribe ELIMINAR para confirmar." });
    setTrabajando(true);
    const fallo = await eliminarCuenta();
    setTrabajando(false);
    if (fallo) return setBorrarMsg({ ok: false, texto: fallo });
    router.push("/");
  }

  return (
    <main className="flex flex-col gap-5">
      <div>
        <h1 className="titulo">Cuenta</h1>
        <p className="mt-2 text-sm text-zinc-500">{usuario.nombre} · {usuario.email}</p>
      </div>

      <FotoPerfil usuario={usuario} />

      <Preferencias />

      <section className="tarjeta flex flex-col gap-3">
        <h2 className="subtitulo">Permisos</h2>
        <PermisosCuenta uid={usuario.id} rol={usuario.rol} />
      </section>

      <section className="tarjeta flex flex-col items-start gap-3">
        <h2 className="subtitulo">Mis datos</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Descarga en un archivo todo lo que Tribu Fit guarda de ti: perfil, medidas, entrenos, comidas, pagos y planes.</p>
        <button type="button" className="btn-ghost" onClick={descargar} disabled={trabajando}>Descargar mis datos</button>
        <Aviso msg={datosMsg} />
      </section>

      {!modoDemo && (
        <Desplegable titulo="Cambiar contraseña">
          <form onSubmit={nuevaClave} noValidate className="flex flex-col gap-4">
            <div>
              <label className="etiqueta" htmlFor="nueva">Contraseña nueva</label>
              <CampoClave id="nueva" name="nueva" autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
            </div>
            <div>
              <label className="etiqueta" htmlFor="repetir">Repite la contraseña</label>
              <CampoClave id="repetir" name="repetir" autoComplete="new-password" />
            </div>
            <Aviso msg={claveMsg} />
            <div><button className="btn-primary">Guardar contraseña</button></div>
          </form>
        </Desplegable>
      )}

      <section className="tarjeta flex flex-col gap-3">
        <h2 className="subtitulo">Legal</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/terminos" className="font-bold text-orange-600 underline">Términos de uso</Link>
          <Link href="/privacidad" className="font-bold text-orange-600 underline">Política de privacidad</Link>
        </div>
      </section>

      <Desplegable titulo="Eliminar mi cuenta" detalle="Borra tu cuenta y tus datos para siempre">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Se borrará tu perfil, tus medidas, entrenos, comidas, planes y pagos. <b>No se puede deshacer.</b>
          {usuario.rol === "entrenador" && " Como entrenador/a, también se perderán tu cobro, los planes que asignaste y el historial de pagos de tus alumnos."}
          {" "}Antes, puedes descargar tus datos arriba.
        </p>
        <div>
          <label className="etiqueta" htmlFor="confirmar">Escribe ELIMINAR para confirmar</label>
          <input className="campo" id="confirmar" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} autoComplete="off" />
        </div>
        <Aviso msg={borrarMsg} />
        <div>
          <button type="button" onClick={borrar} disabled={trabajando} className="inline-block cursor-pointer rounded-md bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
            Eliminar mi cuenta
          </button>
        </div>
      </Desplegable>
    </main>
  );
}
