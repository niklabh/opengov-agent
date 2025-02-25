import { InsertProposal, Proposal, InsertChatMessage, ChatMessage } from "@shared/schema";

export interface IStorage {
  // Proposals
  getProposal(id: number): Promise<Proposal | undefined>;
  listProposals(): Promise<Proposal[]>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposalScore(id: number, score: number): Promise<Proposal>;
  updateProposalStatus(id: number, status: string): Promise<Proposal>;
  
  // Chat Messages
  getChatMessages(proposalId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

export class MemStorage implements IStorage {
  private proposals: Map<number, Proposal>;
  private chatMessages: Map<number, ChatMessage>;
  private proposalId: number;
  private messageId: number;

  constructor() {
    this.proposals = new Map();
    this.chatMessages = new Map();
    this.proposalId = 1;
    this.messageId = 1;
  }

  async getProposal(id: number): Promise<Proposal | undefined> {
    return this.proposals.get(id);
  }

  async listProposals(): Promise<Proposal[]> {
    return Array.from(this.proposals.values());
  }

  async createProposal(insertProposal: InsertProposal): Promise<Proposal> {
    const id = this.proposalId++;
    const proposal: Proposal = {
      ...insertProposal,
      id,
      score: 0,
      status: "pending",
      voteDecision: null,
      analysis: null
    };
    this.proposals.set(id, proposal);
    return proposal;
  }

  async updateProposalScore(id: number, score: number): Promise<Proposal> {
    const proposal = await this.getProposal(id);
    if (!proposal) throw new Error("Proposal not found");
    
    const updated = { ...proposal, score };
    this.proposals.set(id, updated);
    return updated;
  }

  async updateProposalStatus(id: number, status: string): Promise<Proposal> {
    const proposal = await this.getProposal(id);
    if (!proposal) throw new Error("Proposal not found");
    
    const updated = { ...proposal, status };
    this.proposals.set(id, updated);
    return updated;
  }

  async getChatMessages(proposalId: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(msg => msg.proposalId === proposalId);
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.messageId++;
    const message: ChatMessage = {
      ...insertMessage,
      id,
      timestamp: new Date()
    };
    this.chatMessages.set(id, message);
    return message;
  }
}

export const storage = new MemStorage();
