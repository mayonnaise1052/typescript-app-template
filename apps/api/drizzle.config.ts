import { defineConfig } from 'drizzle-kit';

// `npm run db:generate` で src/db/schema.ts からマイグレーション SQL を生成します。
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './migrations',
});
