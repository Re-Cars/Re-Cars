import { logoutGlobale } from "@/hooks/use-veicoli";
import { FontAwesome6 } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DashboardOfficina() {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* header come le altre schermate */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-orange/15">
        <Text className="text-xl font-extrabold text-orange tracking-widest">
          RE|CARS
        </Text>
        <TouchableOpacity
          onPress={logoutGlobale}
          className="flex-row items-center gap-2 rounded-full px-4 py-2"
          style={{
            backgroundColor: "rgba(235,32,32,0.12)",
            borderWidth: 1,
            borderColor: "rgba(235,32,32,0.4)",
          }}
        >
          <FontAwesome6 name="right-from-bracket" size={12} color="#eb2020" />
          <Text className="text-xs font-bold" style={{ color: "#eb2020" }}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 items-center justify-center gap-4 px-8">
        <View
          className="w-16 h-16 rounded-2xl items-center justify-center"
          style={{ backgroundColor: "rgba(249,115,22,0.15)" }}
        >
          <FontAwesome6 name="screwdriver-wrench" size={26} color="#f97316" />
        </View>
        <Text className="text-lg font-bold text-white">Dashboard Officina</Text>
        <Text className="text-sm text-muted text-center">
          L&apos;interfaccia officina è in fase di sviluppo.{"\n"}Torna presto!
        </Text>
      </View>
    </SafeAreaView>
  );
}
