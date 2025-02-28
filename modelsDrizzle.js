import { pgTable, text, uuid, timestamp, serial } from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-vector"; // Importa suporte ao pgvector

// Tabela Instruction
export const instruction = pgTable("instruction", {
  id: uuid("id").defaultRandom().primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabela UserEmbedding com suporte a vetores
export const userEmbedding = pgTable("user_embedding", {
  id: serial("id").primaryKey(), // Autoincremento
  sessionId: text("session_id").notNull(),
  question: text("question").notNull(),
  embedding: vector("embedding", 1536).notNull(), // Vetor de 1536 dimensões
  createdAt: timestamp("created_at").defaultNow(),
});
