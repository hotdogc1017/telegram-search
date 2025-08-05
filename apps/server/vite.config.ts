import DrizzleORMMigrations from '@proj-airi/unplugin-drizzle-orm-migrations/rolldown'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    DrizzleORMMigrations({
      root: '../..',
    }),
  ],
})
