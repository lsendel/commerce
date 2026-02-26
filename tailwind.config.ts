import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fef7ee",
          100: "#fdedd3",
          200: "#fad7a5",
          300: "#f6ba6d",
          400: "#f19333",
          500: "#ee7a12",
          600: "#df6008",
          700: "#b94909",
          800: "#933a0f",
          900: "#773110",
        },
        pet: {
          teal: "#2dd4bf",
          coral: "#fb7185",
          amber: "#fbbf24",
          sage: "#86efac",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
