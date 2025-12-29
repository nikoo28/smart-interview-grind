import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/smart-interview-grind/',
  server: {
    allowedHosts: ["quiet-stone-1cec.tunnl.gg"],
  },
})
