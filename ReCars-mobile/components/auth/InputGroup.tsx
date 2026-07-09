import { FontAwesome6 } from "@expo/vector-icons";
import { useState } from "react";
import { TextInput, TextInputProps, View } from "react-native";

type Props = TextInputProps & {
  icon: string;
};

/** Replica .input-group di style-auth.css: icona arancio + campo su sfondo vetro. */
export default function InputGroup({ icon, ...inputProps }: Props) {
  const [focus, setFocus] = useState(false);
  return (
    <View
      className="flex-row items-center gap-3 rounded-xl px-4"
      style={{
        backgroundColor: focus
          ? "rgba(255,255,255,0.12)"
          : "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: focus ? "#f97316" : "rgba(255,255,255,0.15)",
        paddingVertical: 2,
      }}
    >
      <FontAwesome6 name={icon as any} size={14} color="#f97316" />
      <TextInput
        className="flex-1 text-white text-sm py-3"
        placeholderTextColor="rgba(255,255,255,0.4)"
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        {...inputProps}
      />
    </View>
  );
}
