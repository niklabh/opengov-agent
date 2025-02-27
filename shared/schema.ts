import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  chainId: text("chain_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  proposer: text("proposer").notNull(),
  score: integer("score").default(0),
  status: text("status").notNull().default("pending"),
  voteDecision: text("vote_decision"),
  voteResult: text("vote_result"),
  voteTxHash: text("vote_tx_hash"),
  analysis: jsonb("analysis"),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposal_id").notNull(),
  sender: text("sender").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
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
