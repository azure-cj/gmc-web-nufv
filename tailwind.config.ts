import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gmc: {
          dark: "#1E1E2C",
          darkBorder: "#2D2D3F",
          main: "#F4F6F8",
          accent: "#3B8FF3",
          cta: "#F29F67",
          success: "#34B1AA",
          warning: "#E0B50F",
          rejected: "#E05252",
          draft: "#8A94A6",
        },
      },
    },
  },
  plugins: [],
};

export default config;
