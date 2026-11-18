import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4caf50',
          light: '#2e7d32',
          dark: '#1b5e20',
        },
        secondary: '#04535f',
        danger: '#F44336',
        warn: {
          DEFAULT: '#FDB93F',
          dark: '#C88A00',
          light: '#FBEDBA',
        },
        orange: '#FF933A',
        success: '#4caf50',
        green: {
          DEFAULT: '#2e7d32',
          light: '#20c997',
        },
        gray: {
          DEFAULT: '#92A0B3',
          text: '#74788D',
          text2: '#7E7E7E',
          ultra: '#e0e0e0',
          light: '#f5f5f5',
          dark: 'rgba(0, 0, 0, 0.87)',
        },
        border: {
          DEFAULT: '#D9E5F0',
          input: '#CED4DA',
        },
        bg: {
          DEFAULT: '#F2F8FF',
          header: '#F4F3F9',
          sidebar: '#f0eff0',
        },
        text: {
          DEFAULT: '#343A40',
          gray: '#74788D',
          dark: 'rgba(0, 0, 0, 0.87)',
        },
        blue: {
          DEFAULT: '#012253',
          light: '#1957B4',
          dark: '#1E293B',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'mui': '0 4px 12px 0 rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)',
        'card': '0px 0px 6px rgb(0 0 0 / 16%)',
      },
    },
  },
  plugins: [],
};

export default config;
