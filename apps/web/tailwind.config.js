/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx,js,jsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FFF3E6",
          100: "#FFE1BF",
          200: "#FFC38A",
          300: "#FFA35B",
          400: "#FF8F1F", // gradient end
          500: "#FF6A00", // gradient start
          600: "#E85F00",
          700: "#BF4D00",
          800: "#953E00",
          900: "#7A3300",
        },
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(90deg, #FF6A00 0%, #FF8F1F 100%)",
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
