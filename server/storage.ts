import { InsertProposal, Proposal, InsertChatMessage, ChatMessage, proposals, chatMessages } from "@shared/schema";
import { getDb } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Proposals
  getProposal(id: number): Promise<Proposal | undefined>;
  listProposals(): Promise<Proposal[]>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposalScore(id: number, score: number): Promise<Proposal>;
  updateProposalStatus(id: number, status: string): Promise<Proposal>;
  updateProposalVoteResult(id: number, voteResult: string, voteTxHash: string): Promise<Proposal>;

  // Chat Messages
  getChatMessages(proposalId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

export class DatabaseStorage implements IStorage {
  async getProposal(id: number): Promise<Proposal | undefined> {
    const db = await getDb();
    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, id));
    return proposal;
  }

  async listProposals(): Promise<Proposal[]> {
    try {
      const db = await getDb();
      // Select only columns we know exist in the table
      return await db.select({
        id: proposals.id,
        chainId: proposals.chainId,
        title: proposals.title,
        description: proposals.description,
        proposer: proposals.proposer,
        score: proposals.score,
        status: proposals.status,
      }).from(proposals);
    } catch (error) {
      console.error("Error listing proposals:", error);
      return []; // Return empty array instead of failing
    }
  }

  async createProposal(insertProposal: InsertProposal): Promise<Proposal> {
    const db = await getDb();
    const [proposal] = await db
      .insert(proposals)
      .values(insertProposal)
      .returning();
    return proposal;
  }

  async updateProposalScore(id: number, score: number): Promise<Proposal> {
    const db = await getDb();
    const [proposal] = await db
      .update(proposals)
      .set({ score })
      .where(eq(proposals.id, id))
      .returning();

    if (!proposal) throw new Error("Proposal not found");
    return proposal;
  }

  async updateProposalStatus(id: number, status: string): Promise<Proposal> {
    const db = await getDb();
    const [proposal] = await db
      .update(proposals)
      .set({ status })
      .where(eq(proposals.id, id))
      .returning();

    if (!proposal) throw new Error("Proposal not found");
    return proposal;
  }

  async updateProposalVoteResult(id: number, voteResult: string, voteTxHash: string): Promise<Proposal> {
    const db = await getDb();
    const [proposal] = await db
      .update(proposals)
      .set({ 
        voteResult,
        voteTxHash,
        status: "voted" 
      })
      .where(eq(proposals.id, id))
      .returning();

    if (!proposal) throw new Error("Proposal not found");
    return proposal;
  }

  async getChatMessages(proposalId: number): Promise<ChatMessage[]> {
    const db = await getDb();
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.proposalId, proposalId));
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const db = await getDb();
    const [message] = await db
      .insert(chatMessages)
      .values(insertMessage)
      .returning();
    return message;
  }
}

export const storage = new DatabaseStorage();