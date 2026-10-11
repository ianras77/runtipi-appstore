export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.08), 0 25px 70px rgba(0,0,0,0.55), 0 0 70px rgba(34,211,238,0.18)',
        soft: '0 15px 40px rgba(0,0,0,0.45)'
      }
    }
  },
  plugins: []
};
