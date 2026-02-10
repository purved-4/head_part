/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    name: "Bluewave",
    fontFamily: {
      sans: [
        "Open Sans",
        "ui-sans-serif",
        "system-ui",
        "sans-serif",
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
        '"Noto Color Emoji"',
      ],
    },
    extend: {
      fontFamily: {
        title: [
          "Lato",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
        body: [
          "Open Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
      },
      colors: {
        neutral: {
          50: "#f7f7f7",
          100: "#eeeeee",
          200: "#e0e0e0",
          300: "#cacaca",
          400: "#b1b1b1",
          500: "#999999",
          600: "#7f7f7f",
          700: "#676767",
          800: "#545454",
          900: "#464646",
          950: "#282828",
        },
        primary: {
          50: "#f3f1ff",
          100: "#e9e5ff",
          200: "#d5cfff",
          300: "#b7a9ff",
          400: "#9478ff",
          500: "#7341ff",
          600: "#631bff",
          700: "#611bf8",
          800: "#4607d0",
          900: "#3c08aa",
          950: "#220174",
          DEFAULT: "#611bf8",
        },
        purple: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7c3aed",
          800: "#6b21a8",
          900: "#581c87",
        },
        animation: {
          "fade-in": "fadeIn 0.2s ease-out",
          "zoom-in": "zoomIn 0.2s ease-out",
        },

        role: {
          owner: {
            primary: "#5A0B95", 
            secondary: "#FFDF80", 
            bg: "#F8F5FF", 
            font: "#FFFFFF", 
            border: "#E6C44A", 
            hover: "#6B1FB3", 
            glow: "rgba(90,11,149,0.50)", 
          },
          controller: {
            primary: "#1A56DB", 
            secondary: "#4F83E8", 
            bg: "#F0F7FF", 
            font: "#FFFFFF", 
            border: "#1E429F", 
            hover: "#1E4BBB", 
            glow: "rgba(26,86,219,0.50)", 
          },
          manager: {
            primary: "#1E7B1E", 
            secondary: "#5CB85C", 
            bg: "#F2FCF2", 
            font: "#FFFFFF", 
            border: "#2D682D", 
            hover: "#259225", 
            glow: "rgba(30,123,30,0.50)", 
          },
          head: {
            primary: "#E67A00",
            secondary: "#FFB366", 
            bg: "#FFF9F2", 
            font: "#FFFFFF",
            border: "#CC6A00", 
            hover: "#FF8A1A", 
            glow: "rgba(230,122,0,0.50)", 
          },
          branch: {
            primary: "#FFC61A",
            secondary: "#FFE699",
            bg: "#FFFDF2", 
            font: "#1F2937", 
            border: "#E6B800", 
            hover: "#FFD54F", 
            glow: "rgba(255,198,26,0.50)", 
          },
        },
      },

      /* Add named shadows for hover glow using the RGBA values above */
      boxShadow: {
        "owner-glow": "0 6px 18px rgba(106,13,173,0.40)",
        "controller-glow": "0 6px 18px rgba(0,71,171,0.40)",
        "manager-glow": "0 6px 18px rgba(34,139,34,0.40)",
        "head-glow": "0 6px 18px rgba(255,140,0,0.40)",
        "branch-glow": "0 6px 18px rgba(255,215,0,0.40)",
      },

      /* small utility sizes for the badge heights you described */
      height: {
        "badge-sm": "24px",
        "badge-lg": "32px",
      },
      fontSize: {
        "badge-sm": ["12px", { lineHeight: "19.2px" }],
        "badge-lg": ["14px", { lineHeight: "20px" }],
      },
    }, // end extend
  },

  /* keep plugins and other settings intact */
  plugins: [],
};
