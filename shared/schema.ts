import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Configuration table for fundraising settings
export const config = pgTable("config", {
  id: serial("id").primaryKey(),
  formId: text("form_id").notNull().default("1eb8be3a-d8e8-42ec-aa64-404af5a6d625"),
  goalAmount: integer("goal_amount").notNull().default(50000),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertConfigSchema = createInsertSchema(config);
export const selectConfigSchema = createSelectSchema(config);
export type Config = typeof config.$inferSelect;
export type InsertConfig = typeof config.$inferInsert;
