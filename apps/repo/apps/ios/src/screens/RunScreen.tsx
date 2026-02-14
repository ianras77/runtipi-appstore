import { useEffect, useMemo, useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { api } from "../lib/api";
import { ArcadeButton } from "../components/ArcadeButton";
import { ScreenLayout } from "../components/ScreenLayout";

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const RunScreen = () => {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const pace = useMemo(() => Number((6 + (elapsed % 20) * 0.03).toFixed(2)), [elapsed]);

  const handleSave = async () => {
    setStatus("Saving run...");
    try {
      const run = await api.createRun({
        started_at: new Date().toISOString(),
        duration_seconds: elapsed,
        avg_pace: pace
      });
      setStatus(`Run saved #${run.id}`);
    } catch (err) {
      setStatus(`Save failed: ${(err as Error).message}`);
    }
  };

  return (
    <ScreenLayout title="Run">
      <View style={styles.statRow}>
        <Text style={styles.label}>Elapsed</Text>
        <Text style={styles.value}>{formatTime(elapsed)}</Text>
      </View>
      <View style={styles.statRow}>
        <Text style={styles.label}>Avg Pace</Text>
        <Text style={styles.value}>{pace} min/km</Text>
      </View>
      <View style={styles.actions}>
        <ArcadeButton title={running ? "Stop" : "Start"} onPress={() => setRunning(!running)} />
        <ArcadeButton title="Reset" onPress={() => setElapsed(0)} />
        <ArcadeButton title="Save" onPress={handleSave} />
      </View>
      {status && <Text style={styles.status}>{status}</Text>}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  label: {
    color: "rgba(255,255,255,0.6)"
  },
  value: {
    color: "#ffe44d",
    fontWeight: "700"
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12
  },
  status: {
    marginTop: 12,
    color: "#00f7ff"
  }
});
