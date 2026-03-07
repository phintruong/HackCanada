import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'civic-dark': '#0a0a0a',
        'civic-gray': '#1a1a1a',
        'accent-blue': '#003F7C',
      },
      fontFamily: {
        'mono': ['var(--font-ibm-plex-mono)', 'monospace'],
        'sans': ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
