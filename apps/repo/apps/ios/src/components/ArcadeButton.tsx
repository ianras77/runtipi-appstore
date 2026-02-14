import { Pressable, StyleSheet, Text } from "react-native";

type Props = {
  title: string;
  onPress: () => void;
};

export const ArcadeButton = ({ title, onPress }: Props) => {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#ff4fd8",
    marginRight: 12,
    marginBottom: 12
  },
  text: {
    color: "#0b0b16",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1
  }
});
