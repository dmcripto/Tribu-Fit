/** Foto de perfil redonda; si no hay foto, la inicial del nombre sobre un degradado. */
export default function Avatar({
  nombre, src, className = "size-10 text-base",
}: { nombre: string; src?: string | null; className?: string }) {
  const valida = !!src && src.startsWith("data:image/");
  return valida ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src!} alt={`Foto de ${nombre}`} className={`${className} shrink-0 rounded-full object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${className} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 font-black text-white`}>
      {nombre.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
