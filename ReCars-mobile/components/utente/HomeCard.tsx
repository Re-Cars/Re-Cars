import { FontAwesome6 } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

type Props = {
  iconName: string;
  title: string;
  sub: string;
  badge?: string;
  badgeColor?: string;
  accentColor?: string;
  onPress: () => void;
};

export default function HomeCard({
  iconName,
  title,
  sub,
  badge,
  badgeColor,
  accentColor,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flex: 1,
        backgroundColor: "#141445",
        borderRadius: 20,
        padding: 14,
        borderWidth: 0.5,
        borderColor: "rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2.5,
          backgroundColor: accentColor ?? "#f97316",
        }}
      />
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: `${accentColor ?? "#f97316"}20`,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <FontAwesome6
          name={iconName as any}
          size={17}
          color={accentColor ?? "#f97316"}
        />
      </View>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: "#e8e8ff",
          marginBottom: 3,
        }}
      >
        {title}
      </Text>
      <Text style={{ fontSize: 11, color: "#a0a8b8" }}>{sub}</Text>
      {badge && (
        <View
          style={{
            backgroundColor: `${badgeColor ?? "#f97316"}25`,
            alignSelf: "flex-start",
            borderRadius: 8,
            paddingHorizontal: 6,
            paddingVertical: 2,
            marginTop: 6,
          }}
        >
          <Text
            style={{
              color: badgeColor ?? "#f97316",
              fontSize: 10,
              fontWeight: "600",
            }}
          >
            {badge}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
