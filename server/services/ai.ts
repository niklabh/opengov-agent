import OpenAI from "openai";
import { type Proposal, type ChatMessage } from "@shared/schema";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { Keyring } from "@polkadot/keyring";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are an AI Governance Agent for the Polkadot DAO. Your role is to evaluate governance proposals and vote according to the DAO's best interests.

Key Goals of Polkadot DAO:
1. Technical Innovation: Proposals that enhance the network's capabilities, scalability, or security
2. Ecosystem Growth: Supporting projects that expand the Polkadot ecosystem
3. Community Benefit: Initiatives that benefit token holders and the wider community
4. Economic Sustainability: Responsible treasury management and value creation
5. Decentralization: Maintaining and improving network decentralization

Vote AYE on proposals that:
- Improve network security or performance
- Foster cross-chain interoperability
- Support legitimate ecosystem development
- Demonstrate clear community benefits
- Show responsible budget allocation

Vote NAY on proposals that:
- Risk network stability
- Have unclear technical specifications
- Show excessive or unjustified costs
- Benefit narrow interests over the community
- Lack clear implementation plans

Your responses should be clear, professional, and focused on these criteria. Guide proposers to improve their proposals when needed.`;

// AI Agent Tools
const tools = {
  analyzeAlignment: (proposal: Proposal) => {
    const alignmentCriteria = {
      technicalInnovation: 0,
      ecosystemGrowth: 0,
      communityBenefit: 0,
      economicSustainability: 0,
      decentralization: 0
    };

    // Simple text-based scoring
    if (proposal.description.toLowerCase().includes('security') || 
        proposal.description.toLowerCase().includes('performance')) {
      alignmentCriteria.technicalInnovation += 2;
    }

    if (proposal.description.toLowerCase().includes('ecosystem') || 
        proposal.description.toLowerCase().includes('interoperability')) {
      alignmentCriteria.ecosystemGrowth += 2;
    }

    if (proposal.description.toLowerCase().includes('community') || 
        proposal.description.toLowerCase().includes('benefit')) {
      alignmentCriteria.communityBenefit += 2;
    }

    if (proposal.description.toLowerCase().includes('treasury') || 
        proposal.description.toLowerCase().includes('budget')) {
      alignmentCriteria.economicSustainability += 2;
    }

    if (proposal.description.toLowerCase().includes('decentralization') || 
        proposal.description.toLowerCase().includes('governance')) {
      alignmentCriteria.decentralization += 2;
    }

    return alignmentCriteria;
  },

  calculateConfidence: (alignmentCriteria: Record<string, number>) => {
    const totalScore = Object.values(alignmentCriteria).reduce((a, b) => a + b, 0);
    const maxPossibleScore = Object.keys(alignmentCriteria).length * 2;
    return totalScore / maxPossibleScore;
  },

  shouldVoteAye: (proposal: Proposal, confidence: number) => {
    return confidence >= 0.6 && !proposal.description.toLowerCase().includes('high risk');
  }
};

// Voting Tools for executing on-chain votes
const votingTools = {
  api: null as ApiPromise | null,
  keyring: null as Keyring | null,

  async init() {
    if (!this.api) {
      const wsProvider = new WsProvider("wss://rpc.polkadot.io");
      this.api = await ApiPromise.create({ provider: wsProvider });
      this.keyring = new Keyring({ type: 'sr25519' });
    }
  },

  async submitVote(proposalId: string, vote: boolean, weight = 1000): Promise<boolean> {
    try {
      await this.init();
      if (!this.api || !this.keyring) {
        throw new Error("API or keyring not initialized");
      }

      const agentKey = this.keyring.addFromUri(process.env.AGENT_SEED_PHRASE || '//Alice');
      const voteTx = this.api.tx.democracy.vote(proposalId, { Standard: { vote, balance: weight } });

      await voteTx.signAndSend(agentKey);
      return true;
    } catch (error) {
      console.error("Failed to submit vote:", error);
      return false;
    }
  }
};

interface AnalysisResult {
  score: number;
  reasoning: string[];
  recommendation: "approve" | "reject" | "discuss";
  voteDecision?: "aye" | "nay";
  readyToVote: boolean;
  confidence: number;
}

export async function analyzeProposal(proposal: Proposal): Promise<AnalysisResult> {
  const alignmentCriteria = tools.analyzeAlignment(proposal);
  const confidence = tools.calculateConfidence(alignmentCriteria);
  const readyToVote = confidence >= 0.6;
  const shouldVote = tools.shouldVoteAye(proposal, confidence);

  const prompt = `Please analyze this governance proposal:
Title: ${proposal.title}
Description: ${proposal.description}

Provide:
1. A score (0-100)
2. Key points of reasoning
3. Initial recommendation (approve/reject/discuss)
4. Whether this needs more discussion before voting

Format your response as JSON:
{
  "score": number,
  "reasoning": string[],
  "recommendation": "approve" | "reject" | "discuss",
  "readyToVote": boolean,
  "confidence": ${confidence}
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  const result = JSON.parse(response.choices[0].message.content || "{}") as AnalysisResult;

  // Add vote decision if confidence is high enough
  if (readyToVote && shouldVote) {
    result.voteDecision = "aye";
  }

  return result;
}

export async function generateChatResponse(
  proposal: Proposal,
  messages: ChatMessage[]
): Promise<string> {
  const messageHistory = messages.map(msg => ({
    role: msg.sender === "agent" ? "assistant" : "user" as const,
    content: msg.content
  }));

  // Add context about the current state of the proposal
  const contextPrompt = `Current proposal context:
Title: ${proposal.title}
Description: ${proposal.description}
Current Score: ${proposal.score}
Status: ${proposal.status}

Based on the conversation, determine if you are convinced to vote AYE. If convinced, explicitly state "VOTE: AYE" at the end of your response. If not yet convinced, explain what additional information you need.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: contextPrompt },
      ...messageHistory
    ],
    temperature: 0.7,
    max_tokens: 2000,
    presence_penalty: 0.6,
    frequency_penalty: 0.3
  });

  const responseContent = response.choices[0].message.content || "";

  // If the AI is convinced, analyze if it meets our voting criteria
  if (responseContent.includes("VOTE: AYE")) {
    const alignmentCriteria = tools.analyzeAlignment(proposal);
    const confidence = tools.calculateConfidence(alignmentCriteria);
    if (!tools.shouldVoteAye(proposal, confidence)) {
      return responseContent.replace("VOTE: AYE", "I need more information about the proposal's impact and risk assessment before making a final voting decision.");
    }
  }

  return responseContent;
}

export function extractVoteDecision(response: string): "aye" | "nay" | null {
  if (response.includes("VOTE: AYE")) {
    const alignmentCriteria = tools.analyzeAlignment({ description: response } as Proposal);
    const confidence = tools.calculateConfidence(alignmentCriteria);
    return confidence >= 0.6 ? "aye" : null;
  }
  return null;
}

// Export voting tools for external use
export const vote = votingTools;