import BottomNav from "@/components/utente/BottomNav";
import { NavProvider, useNav } from "@/constants/nav-context";
import { router, Stack, usePathname } from "expo-router";
import { useRef } from "react";
import { PanResponder, View } from "react-native";

/* collega la navbar al pager: onTabChange → cambiaTab aggiorna `tab`
   nel context e l'effect di home.tsx fa scrollTo(tab * width) */
function BottomNavCollegata() {
  const { cambiaTab } = useNav();
  return <BottomNav onTabChange={cambiaTab} />;
}

export default function UtenteLayout() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  /* swipe orizzontale globale: nelle schermate interne (fuori dal pager
     della home) il gesto riporta alla schermata precedente, fino alla home;
     sulla home lascia il campo al PanResponder del pager */
  const backPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        pathnameRef.current !== "/home" &&
        Math.abs(g.dx) > 20 &&
        Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_e, g) => {
        if (
          (Math.abs(g.dx) >= 50 || Math.abs(g.vx) >= 0.3) &&
          router.canGoBack()
        ) {
          router.back();
        }
      },
    }),
  ).current;

  return (
    <NavProvider>
      <View style={{ flex: 1 }} {...backPan.panHandlers}>
        <Stack screenOptions={{ headerShown: false }} />
        {/* montato una sola volta: persiste su tutte le schermate figlie */}
        <BottomNavCollegata />
      </View>
    </NavProvider>
  );
}
