import type { ElementType } from "react";

interface BrandTitleProps {
  /** Tag del titolo: h1 nelle pagine di accesso, span nell'header. */
  as?: ElementType;
  className?: string;
  /** Sequenza d'ingresso: prima la stanghetta, poi RE, poi CARS. */
  animato?: boolean;
  /** Con `animato`, avvia la sequenza quando diventa true. */
  visibile?: boolean;
}

/**
 * Titolo RE|CARS unico per landing, login/registrazione e header:
 * lettere bianche e stanghetta centrale arancione. Animato, RE e CARS
 * escono da dietro la stanghetta (vedi .brand-title in globals.css).
 */
export default function BrandTitle({ as: Tag = "span", className, animato = false, visibile = true }: BrandTitleProps) {
  const classi = ["brand-title", animato && "brand-title--anim", animato && visibile && "in", className]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={classi}>
      <span className="sr-only">RE|CARS</span>
      <span className="bt-re" aria-hidden="true">
        <span>RE</span>
      </span>
      <span className="bt-bar" aria-hidden="true" />
      <span className="bt-cars" aria-hidden="true">
        <span>CARS</span>
      </span>
    </Tag>
  );
}
