import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "arcade-pink": "#ff4fd8",
        "arcade-cyan": "#00f7ff",
        "arcade-yellow": "#ffe44d",
        "arcade-dark": "#0b0b16"
      },
      fontFamily: {
        arcade: ["'Press Start 2P'", "monospace"],
        body: ["'Space Grotesk'", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
