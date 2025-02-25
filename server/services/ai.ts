import OpenAI from "openai";
import { type Proposal, type ChatMessage } from "@shared/schema";

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

interface AnalysisResult {
  score: number;
  reasoning: string[];
  recommendation: "approve" | "reject" | "discuss";
  voteDecision?: "aye" | "nay";
  readyToVote: boolean;
}

export async function analyzeProposal(proposal: Proposal): Promise<AnalysisResult> {
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
  "readyToVote": boolean
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content || "{}") as AnalysisResult;
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

  return response.choices[0].message.content || "";
}

export function extractVoteDecision(response: string): "aye" | "nay" | null {
  if (response.includes("VOTE: AYE")) {
    return "aye";
  }
  return null;
}