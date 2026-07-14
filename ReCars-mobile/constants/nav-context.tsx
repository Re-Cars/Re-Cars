import * as Haptics from "expo-haptics";
import { router, usePathname } from "expo-router";
import {
  createContext,
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, ScrollView } from "react-native";

export const NUM_TAB = 5;

type NavContextType = {
  /* indice discreto del tab attivo (0..4) */
  tab: number;
  /* cambia tab con haptic; da una schermata interna torna prima alla home */
  cambiaTab: (i: number) => void;
  /* posizione continua 0..4 del pager: guida l'indicatore del BottomNav */
  tabIndex: Animated.Value;
  /* ref del pager orizzontale montato nella home */
  pagerRef: RefObject<ScrollView | null>;
};

const NavContext = createContext<NavContextType | null>(null);

/**
 * Stato di navigazione condiviso tra il BottomNav (montato una sola volta
 * nel layout, come Instagram) e il pager delle 5 tab montato nella home.
 */
export function NavProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState(0);
  const tabIndex = useRef(new Animated.Value(0)).current;
  const pagerRef = useRef<ScrollView | null>(null);

  /* cambiaTab è stabile: legge tab/pathname correnti dai ref */
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const cambiaTab = useCallback((i: number) => {
    const dest = Math.max(0, Math.min(NUM_TAB - 1, Math.round(i)));
    const fuoriHome = pathnameRef.current !== "/home";
    if (dest === tabRef.current && !fuoriHome) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTab(dest);
    /* il pager vive nella home: le schermate interne impilate sopra vanno
       chiuse perché il tab scelto diventi visibile */
    if (fuoriHome) {
      if (router.canGoBack()) router.dismissTo("/(utente)/home");
      else router.replace("/(utente)/home");
    }
  }, []);

  const value = useMemo(
    () => ({ tab, cambiaTab, tabIndex, pagerRef }),
    [tab, cambiaTab, tabIndex],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav va usato dentro NavProvider");
  return ctx;
}
