import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Set base to relative path
  plugins: [react()],
  build: {
    outDir: 'dist'
  }
})
