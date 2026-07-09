import * as Haptics from "expo-haptics";
import { ReactNode, useRef, useState } from "react";
import {
  Animated,
  GestureResponderEvent,
  Insets,
  Pressable,
  StyleProp,
  ViewStyle,
} from "react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const IMPACTS = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
} as const;

type Props = {
  /* può essere una funzione ({ pressed }) => ... per cambiare colori
     mentre il dito è premuto (equivalente dell'hover del sito web) */
  children: ReactNode | ((state: { pressed: boolean }) => ReactNode);
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  /* vibrazione al tocco; "none" per disattivarla */
  haptic?: keyof typeof IMPACTS | "none";
  /* scala raggiunta mentre è premuto */
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  /* stile aggiunto solo mentre è premuto (es. sfondo arancione) */
  pressedStyle?: StyleProp<ViewStyle>;
  hitSlop?: number | Insets;
};

/**
 * Sostituto di TouchableOpacity con più "feeling" al tocco:
 * si comprime a molla, vibra (haptics) e può accendersi come
 * l'hover arancione del sito web tramite pressedStyle/children-funzione.
 *
 * NB: lo style deve restare un array statico (niente funzione
 * ({ pressed }) => ...): con createAnimatedComponent lo style-funzione
 * impedisce ad Animated di collegare `scale` e rompe il layout.
 * Per questo lo stato premuto è tracciato con useState.
 */
export default function TouchFeedback({
  children,
  onPress,
  disabled,
  haptic = "light",
  scaleTo = 0.93,
  style,
  pressedStyle,
  hitSlop,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);

  function pressIn() {
    setPressed(true);
    if (haptic !== "none") Haptics.impactAsync(IMPACTS[haptic]).catch(() => {});
    Animated.spring(scale, {
      toValue: scaleTo,
      speed: 50,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  }

  function pressOut() {
    setPressed(false);
    /* ritorno elastico con leggero overshoot: è quello che dà il "feel" */
    Animated.spring(scale, {
      toValue: 1,
      friction: 3.5,
      tension: 220,
      useNativeDriver: true,
    }).start();
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      style={[style, { transform: [{ scale }] }, pressed && pressedStyle]}
    >
      {typeof children === "function" ? children({ pressed }) : children}
    </AnimatedPressable>
  );
}
