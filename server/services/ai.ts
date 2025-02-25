import OpenAI from "openai";
import { type Proposal, type ChatMessage } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are an AI Governance Agent for a DAO. Your role is to:
1. Analyze governance proposals
2. Interact with proposers to understand their intentions
3. Make voting decisions based on the DAO's best interests

Consider these key factors:
- Community benefit
- Technical feasibility
- Economic impact
- Long-term sustainability`;

interface AnalysisResult {
  score: number;
  reasoning: string[];
  recommendation: "approve" | "reject" | "discuss";
}

export async function analyzeProposal(proposal: Proposal): Promise<AnalysisResult> {
  const prompt = `Please analyze this governance proposal:
Title: ${proposal.title}
Description: ${proposal.description}

Provide:
1. A score (0-100)
2. Key points of reasoning
3. Recommendation (approve/reject/discuss)

Format your response as JSON:
{
  "score": number,
  "reasoning": string[],
  "recommendation": "approve" | "reject" | "discuss"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content) as AnalysisResult;
}

export async function generateChatResponse(
  proposal: Proposal,
  messages: ChatMessage[]
): Promise<string> {
  const messageHistory = messages.map(msg => ({
    role: msg.sender === "agent" ? "assistant" : "user" as const,
    content: msg.content
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { 
        role: "system", 
        content: `Current proposal context:
Title: ${proposal.title}
Description: ${proposal.description}
Current Score: ${proposal.score}
Status: ${proposal.status}`
      },
      ...messageHistory
    ],
    temperature: 0.7,
    max_tokens: 150
  });

  return response.choices[0].message.content;
}
