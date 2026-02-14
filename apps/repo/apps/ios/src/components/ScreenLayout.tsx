import { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export const ScreenLayout = ({ title, children }: { title: string; children: ReactNode }) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Jogmania</Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.panel}>{children}</View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b16"
  },
  content: {
    padding: 24
  },
  kicker: {
    color: "#ffe44d",
    textTransform: "uppercase",
    letterSpacing: 2,
    fontSize: 12
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 16
  },
  panel: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
    borderColor: "rgba(255,255,255,0.1)",
    borderWidth: 1
  }
});
