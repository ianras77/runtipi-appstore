import { Text, View, StyleSheet } from "react-native";
import { ScreenLayout } from "../components/ScreenLayout";

export const LandingScreen = () => {
  return (
    <ScreenLayout title="Retro Arcade">
      <View style={styles.block}>
        <Text style={styles.heading}>Jogmania Arena</Text>
        <Text style={styles.body}>
          A running quest platform with AI narration and shared types across iOS, Web, and API.
        </Text>
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  block: {
    gap: 12
  },
  heading: {
    color: "#00f7ff",
    fontSize: 20,
    fontWeight: "700"
  },
  body: {
    color: "rgba(255,255,255,0.75)",
    lineHeight: 20
  }
});
