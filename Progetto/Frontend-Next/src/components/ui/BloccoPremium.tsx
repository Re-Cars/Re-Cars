import Link from "next/link";

interface BloccoPremiumProps {
  titolo: string;
  testo: string;
  icona?: string;
  /** Versione compatta, per spazi piccoli (card, azioni rapide). */
  compatto?: boolean;
}

/** Funzione inclusa in Premium: al posto dell'errore, cosa fa e dove attivarla. */
export default function BloccoPremium({ titolo, testo, icona = "ti-lock", compatto }: BloccoPremiumProps) {
  return (
    <div className={`blocco-premium${compatto ? " compatto" : ""}`}>
      <span className="blocco-premium-ic">
        <i className={`ti ${icona}`} />
      </span>
      <div className="blocco-premium-txt">
        <b>
          {titolo} <span className="badge-premium">Premium</span>
        </b>
        <p>{testo}</p>
      </div>
      <Link href="/abbonamenti" className="btn-dash btn-dash-primary">
        <i className="ti ti-diamond" />
        Scopri Premium
      </Link>
    </div>
  );
}
