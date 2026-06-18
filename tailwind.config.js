/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAFBFC",
        ink: "#161B22",
        cobalt: "#2742CC",
        cobaltDark: "#1D33A3",
        signal: "#E8590C",
        signalSoft: "#FDEDE3",
        muted: "#5B6572",
        line: "#D9DFE7",
        panel: "#F0F3F8",
        panelDeep: "#E6EBF3",
        codeBg: "#10151E",
        codeInk: "#D7DEE9",
        right: "#1B7F4D",
        rightSoft: "#E5F4EC",
        wrong: "#C03221",
        wrongSoft: "#FBEAE7",
      },
      fontFamily: {
        serif: ['"Source Serif 4"', "Georgia", '"Times New Roman"', "serif"],
        sans: ["Archivo", "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
