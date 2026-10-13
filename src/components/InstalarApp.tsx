"use client";

import { useEffect, useState } from "react";

type EventoInstalar = Event & { prompt: () => Promise<void> };

/** Botón "Instalar en este dispositivo": Android/Chrome (instalación directa) o instrucciones para iPhone. */
export default function InstalarApp() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [ios, setIos] = useState(false);
  const [instalada, setInstalada] = useState(false);

  useEffect(() => {
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setInstalada(window.matchMedia("(display-mode: standalone)").matches);
    const alPrompt = (e: Event) => { e.preventDefault(); setEvento(e as EventoInstalar); };
    const alInstalar = () => setInstalada(true);
    window.addEventListener("beforeinstallprompt", alPrompt);
    window.addEventListener("appinstalled", alInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", alPrompt);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  if (instalada) return <p className="text-sm text-green-700 dark:text-green-400">Ya estás usando la app instalada.</p>;
  if (evento) {
    return (
      <button type="button" className="btn-primary" onClick={() => evento.prompt().then(() => setEvento(null))}>
        Instalar en este dispositivo
      </button>
    );
  }
  if (ios) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        En iPhone: abre esta página en Safari, toca <b>Compartir</b> y elige <b>Añadir a pantalla de inicio</b>.
      </p>
    );
  }
  return null;
}
