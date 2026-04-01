/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Base colors
        primary: {
          DEFAULT: "#1C1C1E",
          dark: "#1C1C1E",
        },
        // Background colors (light/dark)
        background: {
          DEFAULT: "#FFFFFF",
          dark: "#1C1C1E",
        },
        surface: {
          DEFAULT: "#F5F5F7",
          dark: "#2C2C2E",
          light: "#E8E8ED",
        },
        // Text colors
        foreground: {
          DEFAULT: "#1C1C1E",
          dark: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#8E8E93",
          foreground: "#8E8E93",
        },
        // Accent colors
        accent: {
          purple: "#D8D4FC",
          "purple-dark": "#B8B4DC",
          yellow: "#FBEB9E",
          "yellow-dark": "#D4C4A0",
          pink: "#FF7476",
          "pink-light": "rgba(255, 116, 118, 0.2)",
          mint: "#A8E6CF",
          "mint-dark": "#88C6AF",
          cyan: "#7DD3E8",
          danger: "#8B3A3A",
          "danger-light": "rgba(139, 58, 58, 0.8)",
        },
        // Gray scale
        gray: {
          50: "#F5F5F7",
          100: "#E8E8ED",
          200: "#D1D1D6",
          400: "#8E8E93",
          500: "#6E6E73",
          600: "#48484A",
          700: "#3A3A3C",
          800: "#2C2C2E",
        },
        // Status colors
        success: "#22C55E",
        error: "#EF4444",
        warning: "#FB923C",
        info: "#60A5FA",
        // Navigation
        nav: {
          background: {
            DEFAULT: "#FFFFFF",
            dark: "#2C2C2E",
          },
          active: {
            DEFAULT: "#1C1C1E",
            dark: "#FFFFFF",
          },
          inactive: "#8E8E93",
        },
        // Input colors
        input: {
          background: {
            DEFAULT: "#F5F5F7",
            dark: "#2C2C2E",
          },
          border: {
            DEFAULT: "#E8E8ED",
            dark: "transparent",
          },
          focus: "#D4C4A0",
        },
      },
      fontFamily: {
        manrope: ["Manrope_400Regular"],
        "manrope-extralight": ["Manrope_200ExtraLight"],
        "manrope-light": ["Manrope_300Light"],
        "manrope-medium": ["Manrope_500Medium"],
        "manrope-semibold": ["Manrope_600SemiBold"],
        "manrope-bold": ["Manrope_700Bold"],
        "manrope-extrabold": ["Manrope_800ExtraBold"],
      },
      fontSize: {
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg: ["18px", { lineHeight: "28px" }],
        xl: ["22px", { lineHeight: "28px" }],
        "2xl": ["28px", { lineHeight: "34px" }],
        "3xl": ["32px", { lineHeight: "40px" }],
        "4xl": ["36px", { lineHeight: "44px" }],
        "5xl": ["48px", { lineHeight: "56px" }],
      },
      borderRadius: {
        14: "14px",
        16: "16px",
        20: "20px",
        22: "22px",
        24: "24px",
        28: "28px",
        40: "40px",
        48: "48px",
      },
      spacing: {
        4.5: "18px",
        13: "52px",
        14: "56px",
        15: "60px",
        16: "64px",
        18: "72px",
        22: "88px",
        30: "120px",
      },
    },
  },
  plugins: [],
};
