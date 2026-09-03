import Link from "next/link";

interface BreadCrumbProps {
  /** Nome della pagina corrente mostrato dopo "Home ›". */
  pagina: string;
}

/** Percorso di navigazione: Home › pagina corrente. */
export default function BreadCrumb({ pagina }: BreadCrumbProps) {
  return (
    <div className="breadcrumb">
      <Link href="/homepage">
        <i className="fa-solid fa-house" /> Home
      </Link>
      <span>›</span>
      <span>{pagina}</span>
    </div>
  );
}
