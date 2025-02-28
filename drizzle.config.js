const drizzleKit = require("drizzle-kit");
const { vector } = require("drizzle-orm/pg-core");


module.exports = drizzleKit.defineConfig({
  schema: "./modelsDrizzle.js", // Caminho para o schema
  out: "./migrations", // Pasta onde as migrações serão salvas
  dialect: "postgresql", // Dialeto correto para PostgreSQL
  dbCredentials: {
    connectionString: process.env.DATABASE_URL, // Certifique-se de que esta variável está no .env
  },
});
