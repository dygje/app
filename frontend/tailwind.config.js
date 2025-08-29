/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Telegram Dark Theme Color Palette
        telegram: {
          bg: '#0E1621',          // Main background
          surface: '#17212B',     // Card/surface background  
          elevated: '#1E2832',    // Elevated surface
          border: '#2C3E50',      // Border color
          blue: '#2AABEE',        // Telegram blue primary
          blueHover: '#229ED9',   // Telegram blue hover
          blueDark: '#1A87C7',    // Telegram blue dark
          text: '#FFFFFF',        // Primary text
          textSecondary: '#8B98A5', // Secondary text
          textMuted: '#6C7883',   // Muted text
          green: '#4DCD5E',       // Success/online
          red: '#E74C3C',         // Error/danger
          orange: '#F39C12',      // Warning
          gray: '#34495E',        // Neutral gray
        },
        // Fluent UI inspired colors
        fluent: {
          accent: '#005A9E',
          accentHover: '#004578',
          neutral: {
            10: '#F8F9FA',
            20: '#F1F3F4',
            30: '#EDEFF1',
            40: '#E1E5E9',
            50: '#D2D8DD',
            60: '#C1C9D0',
            70: '#A8B2BD',
            80: '#8A9BA8',
            90: '#69788A',
            100: '#4C5F70',
            110: '#3C4A5C',
            120: '#2C3E50',
            130: '#1E2832',
            140: '#17212B',
            150: '#0E1621',
          }
        }
      },
      fontFamily: {
        sans: [
          'SF Pro Display',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Inter',
          'system-ui',
          'sans-serif'
        ],
      },
      borderRadius: {
        'telegram': '12px',
        'fluent': '8px',
        'fluent-lg': '12px',
      },
      boxShadow: {
        'telegram': '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
        'telegram-hover': '0 2px 8px 0 rgba(0, 0, 0, 0.4)',
        'fluent': '0 2px 4px rgba(0,0,0,0.14), 0 1px 2px rgba(0,0,0,0.12)',
        'fluent-hover': '0 4px 8px rgba(0,0,0,0.16), 0 2px 4px rgba(0,0,0,0.14)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      }
    },
  },
  plugins: [],
}