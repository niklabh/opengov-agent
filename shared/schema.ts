import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const proposals = sqliteTable("proposals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chainId: text("chain_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  proposer: text("proposer").notNull(),
  proposerAddress: text("proposer_address"),
  createdAt: text("created_at").notNull(),
  score: integer("score").default(0),
  status: text("status").notNull().default("pending"),
  voteDecision: text("vote_decision"),
  voteResult: text("vote_result"),
  voteTxHash: text("vote_tx_hash"),
  analysis: blob("analysis", { mode: "json" })
});

export const chatMessages = sqliteTable("chat_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  proposalId: integer("proposal_id").notNull(),
  sender: text("sender").notNull(),
  content: text("content").notNull(),
  timestamp: integer("timestamp").notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const insertProposalSchema = createInsertSchema(proposals).omit({ 
  id: true,
  score: true,
  status: true,
  voteDecision: true,
  analysis: true 
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true
});

export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Proposal = typeof proposals.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;