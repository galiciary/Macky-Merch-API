import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Point the database at an in-memory SQLite instance so tests never
    // touch the development database file. Vitest sets this before any
    // module loads, and dotenv does not override existing env vars,
    // so this reliably wins over .env.
    env: {
      NODE_ENV: 'test',
      DB_PATH: ':memory:',
    },
  },
});