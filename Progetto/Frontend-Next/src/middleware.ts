import { NextResponse, type NextRequest } from "next/server";

/**
 * Protezione delle route: il JWT vero è un cookie httpOnly sul dominio del
 * backend (invisibile qui), quindi il middleware controlla il cookie flag
 * `rc_session` impostato da src/lib/auth.ts al login. Le route pubbliche
 * sono solo landing, login e registrazione; con l'accesso salvato (30
 * giorni) landing e login rimandano alla home.
 */
const SESSION_COOKIE = "rc_session";

const ROUTE_PUBBLICHE = new Set(["/", "/login", "/registrazione"]);

/** Home di chi ha già fatto l'accesso (valore del flag, vedi src/lib/auth.ts). */
const HOME_SESSIONE: Record<string, string> = { u: "/homepage", o: "/officina" };

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessione = request.cookies.get(SESSION_COOKIE);

  // accesso salvato sul dispositivo: landing e login portano dritti alla home
  if ((pathname === "/" || pathname === "/login") && sessione && HOME_SESSIONE[sessione.value]) {
    return NextResponse.redirect(new URL(HOME_SESSIONE[sessione.value], request.url));
  }

  if (ROUTE_PUBBLICHE.has(pathname)) {
    return NextResponse.next();
  }

  if (!sessione) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // esclude asset statici, immagini, file di sistema Next e della PWA (manifest,
  // service worker, icone, pagina offline): devono caricarsi anche senza login
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|sw.js|offline.html|icons/|Img/).*)"],
};
