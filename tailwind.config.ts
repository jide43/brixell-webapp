import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brixell: {
          green:        "#1B4332",
          "green-cta":  "#2D6A4F",
          red:          "#C41E3A",
          gold:         "#C4943D",
          bg:           "#FFFFFF",
          footer:       "#F5F5F5",
          text:         "#333333",
        },
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans:  ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;