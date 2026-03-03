import { db } from "./db";
import { config, type Config, type InsertConfig } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getConfig(): Promise<Config | undefined>;
  updateConfig(data: Partial<InsertConfig>): Promise<Config>;
}

export class DatabaseStorage implements IStorage {
  async getConfig(): Promise<Config | undefined> {
    const rows = await db.select().from(config).limit(1);
    return rows[0];
  }

  async updateConfig(data: Partial<InsertConfig>): Promise<Config> {
    const existing = await this.getConfig();
    if (!existing) {
      const [newConfig] = await db.insert(config).values({
        formId: data.formId || "1eb8be3a-d8e8-42ec-aa64-404af5a6d625",
        goalAmount: data.goalAmount || 50000,
      }).returning();
      return newConfig;
    }
    const [updated] = await db
      .update(config)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(config.id, existing.id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
