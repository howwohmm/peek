import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#262626",
          elevated: "#2e2e2e",
          sunk: "#1f1f1f",
        },
        ink: {
          DEFAULT: "#e8e6e1",
          dim: "#a8a6a1",
          mute: "#6e6c68",
        },
        line: "#3a3a3a",
        accent: "#c9a96a",
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontWeight: {
        light: "300",
        normal: "400",
      },
      letterSpacing: {
        tight: "-0.01em",
      },
    },
  },
  plugins: [],
};

export default config;
