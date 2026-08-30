import { defineConfig } from "drizzle-kit";

// Load .env.local for drizzle-kit CLI commands.
import { config } from "dotenv";
config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
