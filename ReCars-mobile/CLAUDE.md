# CLAUDE.md — ReCars-mobile

React Native app (Expo SDK 54, Expo Router, NativeWind/Tailwind) — mobile counterpart of the RE|CARS web frontend, talking to the same NestJS backend. Package manager: **npm** (not pnpm — different from the backend). See the root `CLAUDE.md` for cross-project context.

> **Read `AGENTS.md` in this folder before writing any Expo/Expo Router code.** It flags that this project is on Expo SDK 54, which changed significantly from earlier versions — verify APIs against https://docs.expo.dev/versions/v54.0.0/ rather than relying on training data.

## Folder structure

```
app/
├── _layout.tsx          # root layout: imports global.css, <Slot/>, <StatusBar style="light"/>
├── index.tsx              # always redirects to /(auth)/login
├── (auth)/                  # Stack, headerShown:false
│   ├── login.tsx              # multi-step login: tipo (utente/business) → azienda/officina → form
│   └── register.tsx            # multi-step registration: privato/azienda/officina
├── (officina)/                   # Stack, headerShown:false
│   └── dashboard.tsx                # placeholder screen only — officina UI not yet built
└── (utente)/                          # NavProvider + Stack + global BottomNav + swipe-back PanResponder
    ├── home.tsx                          # horizontal pager (ScrollView, pagingEnabled) — 5 pages
    ├── cerca-veicolo.tsx, prenotazioni.tsx, storico.tsx, account.tsx   # reused as pages 1-4 of the home pager
    ├── veicoli.tsx, info-veicolo.tsx, abbonamenti.tsx
    ├── info-domande.tsx, problemi.tsx, termini-privacy.tsx

components/
├── TouchFeedback.tsx        # Pressable + haptics + spring scale, used project-wide instead of TouchableOpacity
├── auth/InputGroup.tsx        # labeled input with icon + focus state, used in login/register
└── utente/
    ├── BottomNav.tsx             # floating 5-tab "liquid glass" nav bar, see below
    ├── SectionScreen.tsx           # shared layout: header + optional VeicoloSwitcher + scrollable body
    ├── VeicoloSwitcher.tsx           # active-vehicle pill + garage dropdown + delete
    ├── MappaOfficina.tsx               # Leaflet/OSM map via react-native-webview
    ├── MenuLaterale.tsx                  # hamburger + slide-out sidebar (global, mirrors the website)
    └── HomeCard.tsx                        # generic grid card (currently unused by home.tsx)

constants/    api.ts, colors.ts, theme.ts, nav-context.tsx
hooks/        use-veicoli.ts, use-color-scheme(.web).ts, use-theme-color.ts
```

Three parallel Expo Router route groups: `(auth)`, `(officina)`, `(utente)`, each with its own `_layout.tsx`. `(officina)/dashboard.tsx` is currently just a header + logout button placeholder — the officina mobile experience is not implemented yet.

`app/(utente)/home.tsx` is not a single screen: it's a horizontal pager containing the real home content as page 0, and pages 1-4 directly import and render the `CercaVeicoloScreen`, `PrenotazioniScreen`, `StoricoScreen`, `AccountScreen` components (not via navigation — as embedded components). The other screens (`veicoli`, `info-veicolo`, `abbonamenti`, `info-domande`, `problemi`, `termini-privacy`) are real routes reached via `router.push`, stacked above the pager.

## Navigation: NavContext, ScrollView pager, and BottomNav

`constants/nav-context.tsx` is the coordination point between the home pager and the bottom nav (`NUM_TAB = 5`):
- `tab` — discrete active tab index (0–4)
- `cambiaTab(i)` — changes tab with light haptic feedback; if the user is on a screen outside the home pager, it first navigates back to `/(utente)/home` (`router.dismissTo` or `router.replace`) before switching tabs
- `tabIndex` — a continuous `Animated.Value` (0..4) driven by the home `ScrollView`'s scroll position, used to animate the `BottomNav` indicator in real time during a swipe
- `pagerRef` — ref to the home screen's horizontal `ScrollView`

`components/utente/BottomNav.tsx` (`NAV_SPACE = 90`, used as bottom padding elsewhere so content doesn't sit under the floating bar):
- A single "liquid glass" circle (48px) slides under the active tab icon via `Animated.Value circlePos` interpolated to `translateX`.
- Tapping an icon animates the circle (`Animated.timing`, 200ms) and calls `cambiaTab`.
- The whole pill also supports **drag** (PanResponder, Instagram/WhatsApp-style): dragging enlarges the circle, follows the finger continuously, fires `Haptics.selectionAsync()` on each slot crossed, and snaps to the nearest slot on release.
- Icon color crossfades (white ↔ orange) via two overlapping `Animated.View`s driven by the same `circlePos`, since color isn't natively animatable on Fabric.
- It also reacts to external `tab` changes coming from the home pager's own swipe gesture, via a `useEffect` watching `NavContext`.

`app/(utente)/_layout.tsx` mounts `BottomNav` once (wrapped as `BottomNavCollegata`) and has its own separate `PanResponder` for swipe-back-to-home from any pushed screen (distinct from the pager's PanResponder inside `home.tsx`).

## JWT token handling via AsyncStorage

No `SecureStore` is used anywhere — everything goes through `AsyncStorage` (never `localStorage`, which doesn't exist in React Native; verified absent from the whole codebase).

| Key | Written by | Read by | Purpose |
|---|---|---|---|
| `yd_utente_loggato` | `login.tsx`, `register.tsx` | `login.tsx` (auto-redirect), `constants/api.ts::getUtenteLoggato()`, `use-veicoli.ts` | Serialized user/officina profile |
| `yd_access_token` | `login.tsx`, `register.tsx` | `constants/api.ts::authHeaders()` | **The JWT itself**, sent as `Authorization: Bearer <token>` |
| `veicoloAttivoId` | `use-veicoli.ts::seleziona()` | `use-veicoli.ts::carica()` | Active vehicle id |
| `storico_targhe` | `cerca-veicolo.tsx` | `cerca-veicolo.tsx` | Local plate search history |
| `garage_animation` | `cerca-veicolo.tsx` | `VeicoloSwitcher.tsx` (consumed once on mount) | Triggers the "garage pop" animation after adding a vehicle |

`constants/api.ts` is the single point that reads `yd_access_token` — via `authHeaders()`, used internally by `apiFetch()`. Unauthenticated calls (login, register, city search) call `fetch` directly instead.

**Logout has two different implementations** — be aware when touching either:
- `logoutGlobale()` in `hooks/use-veicoli.ts`: `AsyncStorage.multiRemove(["yd_utente_loggato","yd_access_token","veicoloAttivoId"])`, used by the officina dashboard, the side menu, and automatically on any `401` response.
- `app/(utente)/account.tsx`'s explicit logout button: `AsyncStorage.clear()` — wipes **everything**, not just the three auth keys.

## Switching environments: ngrok vs local IP

`constants/api.ts` exposes a single hardcoded constant:
```ts
export const API = "<BASE_URL>";
```
This is the **only** line to edit when switching environments. There is no `.env`, no `__DEV__` branching. Practical notes:
- Physical devices and most emulators cannot resolve the host machine's `localhost` — use the machine's LAN IP (e.g. `http://192.168.x.x:3000`) or a tunnel such as **ngrok** (per project convention, an ngrok tunnel started manually by the developer — see the memory index for the current setup).
- Android emulators specifically can reach the host via `10.0.2.2` instead of `localhost`.
- Whatever `API` points to, the backend's CORS whitelist doesn't affect the mobile app (CORS is a browser concept) — but the URL still needs to be genuinely reachable from wherever the app is running.

`apiFetch(path, options)` in the same file wraps `fetch` with the base URL and injects `authHeaders()` automatically — use it for every authenticated call instead of calling `fetch` directly.

## Expo commands

```bash
npm install
npx expo start           # Metro bundler, QR for Expo Go / dev client
npm run android            # expo start --android
npm run ios                  # expo start --ios (macOS only)
npm run web                    # expo start --web
npm run lint                     # expo lint
npx expo export                     # static export (also used for the web build target)
```

No `eas.json` exists yet — building for app stores requires `eas login` then `eas build:configure` before `eas build --platform android|ios`. Given `newArchEnabled: true` and native modules (`react-native-reanimated`, `react-native-worklets`, `react-native-webview`, `react-native-svg`), a **development build** (`expo run:android`/`expo run:ios`, or `eas build --profile development`) is recommended over plain Expo Go for full feature testing.

`npm run reset-project` runs `scripts/reset-project.js`, a template utility that moves the current app into `app-example/` and creates a blank `app/` — **do not run this** on the current, already-developed project.
