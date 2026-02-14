import { useState } from "react";
import { Text, TextInput, View, StyleSheet } from "react-native";
import { api, setToken } from "../lib/api";
import { ArcadeButton } from "../components/ArcadeButton";
import { ScreenLayout } from "../components/ScreenLayout";

type Props = {
  onLoggedIn?: () => void;
};

export const LoginScreen = ({ onLoggedIn }: Props) => {
  const [email, setEmail] = useState("runner@jogmania.com");
  const [password, setPassword] = useState("supersecret");
  const [status, setStatus] = useState<string | null>(null);

  const handleRegister = async () => {
    setStatus("Registering...");
    try {
      await api.register({ email, password });
      setStatus("Registered. Now log in.");
    } catch (err) {
      setStatus(`Register failed: ${(err as Error).message}`);
    }
  };

  const handleLogin = async () => {
    setStatus("Logging in...");
    try {
      const token = await api.login({ email, password });
      setToken(token.access_token);
      setStatus("Logged in.");
      onLoggedIn?.();
    } catch (err) {
      setStatus(`Login failed: ${(err as Error).message}`);
    }
  };

  return (
    <ScreenLayout title="Login">
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>
      <View style={styles.actions}>
        <ArcadeButton title="Login" onPress={handleLogin} />
        <ArcadeButton title="Register" onPress={handleRegister} />
      </View>
      {status && <Text style={styles.status}>{status}</Text>}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  field: {
    marginBottom: 12
  },
  label: {
    color: "rgba(255,255,255,0.7)",
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 10,
    color: "white"
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
