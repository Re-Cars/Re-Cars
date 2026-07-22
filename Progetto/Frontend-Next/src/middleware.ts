import { NextResponse, type NextRequest } from "next/server";

/**
 * Protezione delle route: il JWT vero è un cookie httpOnly sul dominio del
 * backend (invisibile qui), quindi il middleware controlla il cookie flag
 * `rc_session` impostato da src/lib/auth.ts al login. Le route pubbliche
 * sono solo landing, login e registrazione.
 */
const SESSION_COOKIE = "rc_session";

const ROUTE_PUBBLICHE = new Set(["/", "/login", "/registrazione"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ROUTE_PUBBLICHE.has(pathname)) {
    return NextResponse.next();
  }

  const sessione = request.cookies.get(SESSION_COOKIE);
  if (!sessione) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // esclude asset statici, immagini e file di sistema Next
  matcher: ["/((?!_next/static|_next/image|favicon.ico|Img/).*)"],
};
