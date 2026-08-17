/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F7F7F4",
        surface: "#FFFFFF",
        ink: "#171717",
        muted: "#737373",
        border: "#E7E5E4",
        accent: {
          DEFAULT: "#315CFF",
          dark: "#2446C7",
        },
        success: "#15803D",
        danger: "#DC2626",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.625rem",
        xl: "0.875rem",
      },
      maxWidth: {
        content: "1280px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(23,23,23,0.04)",
        card: "0 1px 3px rgba(23,23,23,0.06), 0 1px 2px rgba(23,23,23,0.04)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.18s ease-out",
      },
    },
  },
  plugins: [],
};
