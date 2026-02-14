import { useState } from "react";
import { Text, TextInput, View, StyleSheet } from "react-native";
import { api } from "../lib/api";
import { ArcadeButton } from "../components/ArcadeButton";
import { ScreenLayout } from "../components/ScreenLayout";

export const QuestScreen = () => {
  const [prompt, setPrompt] = useState("Give me a neon dusk sprint quest.");
  const [quest, setQuest] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleQuest = async () => {
    setStatus("Fetching quest...");
    try {
      const response = await api.aiQuest({ prompt });
      setQuest(response.quest_text);
      setStatus("Quest ready.");
    } catch (err) {
      setStatus(`Quest failed: ${(err as Error).message}`);
    }
  };

  return (
    <ScreenLayout title="Quest">
      <Text style={styles.label}>Quest Prompt</Text>
      <TextInput
        style={styles.input}
        value={prompt}
        onChangeText={setPrompt}
        multiline
      />
      <View style={styles.actions}>
        <ArcadeButton title="Generate" onPress={handleQuest} />
      </View>
      {status && <Text style={styles.status}>{status}</Text>}
      {quest && (
        <View style={styles.questBox}>
          <Text style={styles.questTitle}>Quest</Text>
          <Text style={styles.questText}>{quest}</Text>
        </View>
      )}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  label: {
    color: "rgba(255,255,255,0.7)",
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 10,
    color: "white",
    minHeight: 80
  },
  actions: {
    flexDirection: "row",
    marginTop: 12
  },
  status: {
    marginTop: 12,
    color: "#00f7ff"
  },
  questBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  questTitle: {
    color: "#ffe44d",
    fontWeight: "700",
    marginBottom: 6
  },
  questText: {
    color: "white"
  }
});
