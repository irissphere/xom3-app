/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border-0)",
        input: "hsl(var(--background))",
        ring: "hsl(var(--ring))",
        background: "var(--bg-0)",
        foreground: "var(--text-0)",
        primary: {
          DEFAULT: "var(--xom3-primary)",
          foreground: "var(--text-0)",
        },
        secondary: {
          DEFAULT: "var(--xom3-secondary)",
          foreground: "var(--text-1)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "var(--text-2)",
          foreground: "var(--text-1)",
        },
        accent: {
          DEFAULT: "var(--surface-2)",
          foreground: "var(--text-0)",
        },
        popover: {
          DEFAULT: "var(--surface-0)",
          foreground: "var(--text-0)",
        },
        card: {
          DEFAULT: "var(--surface-1)",
          foreground: "var(--text-0)",
        },
      },
      borderRadius: {
        lg: "var(--r-lg)",
        md: "var(--r-md)",
        sm: "var(--r-sm)",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        mono: ["SFMono-Regular", "Consolas", "Liberation Mono", "Menlo", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      animationDelay: {
        '100': '100ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}




