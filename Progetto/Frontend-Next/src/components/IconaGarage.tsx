/**
 * Icona "Il mio garage": box con saracinesca (come quella della landing),
 * disegnata nello stile Tabler (tratto 2, angoli arrotondati) perché il
 * set Tabler non ha un garage vero e proprio. Eredita colore e dimensione
 * dal testo come le icone `ti`.
 */
export default function IconaGarage({ className }: { className?: string }) {
  return (
    <svg
      className={["icona-garage", className].filter(Boolean).join(" ")}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 20V9.5L12 4l9 5.5V20" />
      <path d="M6.5 20v-8h11v8" />
      <path d="M6.5 14.7h11M6.5 17.4h11" />
    </svg>
  );
}
