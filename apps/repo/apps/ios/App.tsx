import { useState } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LandingScreen } from "./src/screens/LandingScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { QuestScreen } from "./src/screens/QuestScreen";
import { RunScreen } from "./src/screens/RunScreen";

const screens = [
  { key: "home", label: "Home" },
  { key: "login", label: "Login" },
  { key: "run", label: "Run" },
  { key: "quest", label: "Quest" }
] as const;

type ScreenKey = (typeof screens)[number]["key"];

export default function App() {
  const [active, setActive] = useState<ScreenKey>("home");

  const renderScreen = () => {
    switch (active) {
      case "login":
        return <LoginScreen onLoggedIn={() => setActive("run")} />;
      case "run":
        return <RunScreen />;
      case "quest":
        return <QuestScreen />;
      default:
        return <LandingScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {renderScreen()}
      <View style={styles.nav}>
        {screens.map((screen) => (
          <TouchableOpacity key={screen.key} onPress={() => setActive(screen.key)}>
            <Text style={[styles.navItem, active === screen.key && styles.navActive]}>
              {screen.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b16"
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.8)"
  },
  navItem: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  navActive: {
    color: "#00f7ff"
  }
});
