import type { Config } from "tailwindcss";

const config: Config = {
  // `.dark` can sit on the same element as `dark:` utilities (the admin wrapper), so match it and its descendants.
  darkMode: ["variant", "&:where(.dark, .dark *)"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1.25rem", lg: "2rem" }, screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        whatsapp: { DEFAULT: "#0F7A41", hover: "#0B6636" }, // darker than WhatsApp's logo green so white text passes WCAG AA
        charcoal: "#1F2124",
        graphite: "#3A3D42",
        silver: "#C9CDD2",
        mist: "#F4F5F7",
        // Driven by CSS variables so Admin > Settings can retint the site (see app/layout.tsx).
        brand: { DEFAULT: "rgb(var(--brand-rgb) / <alpha-value>)", hover: "rgb(var(--brand-hover-rgb) / <alpha-value>)", deep: "rgb(var(--brand-deep-rgb) / <alpha-value>)" },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: { xl: "12px", "2xl": "16px", "3xl": "24px" },
      boxShadow: {
        soft: "0 2px 12px rgba(31,33,36,0.06)",
        lift: "0 14px 40px -12px rgba(31,33,36,0.22)",
        glow: "0 10px 30px -8px rgb(var(--brand-rgb) / 0.45)",
      },
      keyframes: {
        "slow-zoom": { "0%": { transform: "scale(1)" }, "100%": { transform: "scale(1.12)" } },
        dash: { to: { strokeDashoffset: "-24" } },
        pulseRing: { "0%": { transform: "scale(1)", opacity: "0.6" }, "100%": { transform: "scale(3)", opacity: "0" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "slow-zoom": "slow-zoom 18s ease-in-out infinite alternate",
        dash: "dash 1.2s linear infinite",
        "pulse-ring": "pulseRing 2.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
