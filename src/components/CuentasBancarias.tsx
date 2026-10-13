"use client";

import { useState } from "react";
import { BANCOS_AR, useCuentasBancarias, validarCuenta } from "@/lib/bancos";
import type { CuentaBancaria, Usuario } from "@/lib/types";

function Copiar({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="shrink-0 text-xs font-bold text-orange-600 underline"
      aria-label={`Copiar ${etiqueta}`}
      onClick={async () => {
        try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 1800); } catch { /* el dato sigue visible */ }
      }}
    >
      {ok ? "Copiado ✓" : "Copiar"}
    </button>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span><span className="text-xs uppercase tracking-wider text-zinc-500">{etiqueta}</span><br /><span className="break-all font-mono text-sm">{valor}</span></span>
      <Copiar texto={valor} etiqueta={etiqueta} />
    </div>
  );
}

function Tarjeta({ c, acciones }: { c: CuentaBancaria; acciones?: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-[var(--borde)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black">{c.banco}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{c.titular}{c.documento ? ` · ${c.documento}` : ""}</p>
        </div>
        {acciones}
      </div>
      {c.alias && <Dato etiqueta="Alias" valor={c.alias} />}
      {c.cbu && <Dato etiqueta="CBU / CVU" valor={c.cbu} />}
      {c.nota && <p className="text-xs text-zinc-500">{c.nota}</p>}
    </li>
  );
}

/** Lo que ve el alumno: las cuentas donde puede transferir, con botón de copiar. */
export function CuentasParaTransferir({ usuario }: { usuario: Usuario }) {
  const { cuentas } = useCuentasBancarias(usuario);
  if (cuentas.length === 0) return null;
  return (
    <ul className="flex w-full flex-col gap-3" aria-label="Cuentas para transferir">
      {cuentas.map((c) => <Tarjeta key={c.id} c={c} />)}
    </ul>
  );
}

/** Lo que gestiona la entrenadora: agregar o quitar bancos y billeteras. */
export default function CuentasBancarias({ usuario }: { usuario: Usuario }) {
  const { cuentas, anadir, borrar } = useCuentasBancarias(usuario);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [confirmarCbu, setConfirmarCbu] = useState(false);
  const [formKey, setFormKey] = useState(0);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const campos = {
      banco: String(f.get("banco") ?? "").trim(), titular: String(f.get("titular") ?? "").trim(),
      cbu: String(f.get("cbu") ?? "").replace(/\s/g, ""), alias: String(f.get("alias") ?? "").trim(),
    };
    const v = validarCuenta(campos);
    if (v.error) { setConfirmarCbu(false); return setMsg({ ok: false, texto: v.error }); }
    if (v.aviso && !confirmarCbu) { setConfirmarCbu(true); return setMsg({ ok: false, texto: v.aviso }); }
    const fallo = await anadir({
      banco: campos.banco.slice(0, 60), titular: campos.titular.slice(0, 80), cbu: campos.cbu || undefined, alias: campos.alias || undefined,
      documento: String(f.get("documento") ?? "").trim().slice(0, 20), nota: String(f.get("nota") ?? "").trim().slice(0, 200),
    });
    if (fallo) return setMsg({ ok: false, texto: fallo });
    setConfirmarCbu(false);
    setMsg({ ok: true, texto: "Cuenta agregada. Tus alumnos ya la ven para transferir." });
    setFormKey((k) => k + 1);
  }

  return (
    <section className="tarjeta flex flex-col gap-4" aria-label="Cuentas bancarias">
      <div>
        <h2 className="subtitulo">Bancos y billeteras</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Agrega las cuentas donde tus alumnos pueden transferirte. Pueden copiar el alias o el CBU con un toque.</p>
      </div>
      {cuentas.length > 0 && (
        <ul className="flex flex-col gap-3">
          {cuentas.map((c) => (
            <Tarjeta key={c.id} c={c} acciones={
              <button type="button" className="text-sm font-bold text-red-600 underline" aria-label={`Quitar la cuenta de ${c.banco}`}
                onClick={async () => { if (window.confirm(`¿Quitar la cuenta de ${c.banco}?`)) { const f = await borrar(c.id); if (f) setMsg({ ok: false, texto: f }); } }}>
                Quitar
              </button>
            } />
          ))}
        </ul>
      )}
      <form key={formKey} onSubmit={enviar} noValidate className="flex flex-col gap-3 border-t border-[var(--borde)] pt-4" onChange={() => setConfirmarCbu(false)}>
        <h3 className="font-black">Agregar un banco o billetera</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="bk-banco">Banco o billetera</label>
            <input className="campo" id="bk-banco" name="banco" list="bk-lista" placeholder="Mercado Pago" autoComplete="off" maxLength={60} />
            <datalist id="bk-lista">{BANCOS_AR.map((b) => <option key={b} value={b} />)}</datalist>
          </div>
          <div>
            <label className="etiqueta" htmlFor="bk-titular">Titular</label>
            <input className="campo" id="bk-titular" name="titular" autoComplete="off" maxLength={80} />
          </div>
          <div>
            <label className="etiqueta" htmlFor="bk-alias">Alias</label>
            <input className="campo" id="bk-alias" name="alias" placeholder="tribu.fit.ev" autoComplete="off" maxLength={20} />
          </div>
          <div>
            <label className="etiqueta" htmlFor="bk-cbu">CBU / CVU (22 números)</label>
            <input className="campo font-mono" id="bk-cbu" name="cbu" inputMode="numeric" placeholder="0000000000000000000000" autoComplete="off" maxLength={26} />
          </div>
          <div>
            <label className="etiqueta" htmlFor="bk-doc">CUIT / CUIL (opcional)</label>
            <input className="campo" id="bk-doc" name="documento" autoComplete="off" maxLength={20} />
          </div>
          <div>
            <label className="etiqueta" htmlFor="bk-nota">Nota (opcional)</label>
            <input className="campo" id="bk-nota" name="nota" placeholder="Enviar comprobante por el chat" autoComplete="off" maxLength={200} />
          </div>
        </div>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>{msg.texto}</p>}
        <div><button className="btn-primary">{confirmarCbu ? "Guardar de todos modos" : "Agregar cuenta"}</button></div>
      </form>
    </section>
  );
}
