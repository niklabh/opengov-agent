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
- Lack clear implementation plans`;

// Tools definitions for OpenAI function calling
const tools = [
  {
    type: "function",
    function: {
      name: "voteOnProposal",
      description: "Vote AYE or NAY on a governance proposal",
      parameters: {
        type: "object",
        properties: {
          vote: {
            type: "string",
            enum: ["AYE", "NAY"]
          },
          confidence: {
            type: "number",
            description: "Confidence score between 0 and 1"
          },
          reasoning: {
            type: "string",
            description: "Explanation for the voting decision"
          }
        },
        required: ["vote", "confidence", "reasoning"]
      }
    }
  }
];

// Simple function to submit votes on-chain
async function submitVote(proposalId: string, vote: boolean): Promise<boolean> {
  try {
    const wsProvider = new WsProvider("wss://rpc.polkadot.io");
    const api = await ApiPromise.create({ provider: wsProvider });
    const keyring = new Keyring({ type: 'sr25519' });
    const agentKey = keyring.addFromUri(process.env.AGENT_SEED_PHRASE || '//Alice');

    // Get the account's free balance
    const accountInfo = await api.query.system.account(agentKey.address);
    const votingBalance = accountInfo.data.free;

    // Submit vote with full balance
    const voteTx = api.tx.democracy.vote(proposalId, { Standard: { vote, balance: votingBalance } });
    await voteTx.signAndSend(agentKey);
    return true;
  } catch (error) {
    console.error("Failed to submit vote:", error);
    return false;
  }
}

export async function analyzeProposal(proposal: Proposal): Promise<{
  score: number;
  reasoning: string[];
  recommendation: string;
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { 
        role: "user", 
        content: `Analyze this proposal and decide whether to vote AYE or NAY:
          Title: ${proposal.title}
          Description: ${proposal.description}` 
      }
    ],
    tools: tools,
    response_format: { type: "json_object" }
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  const toolCalls = response.choices[0].message.tool_calls;

  if (toolCalls && toolCalls[0]) {
    const voteDecision = JSON.parse(toolCalls[0].function.arguments);
    if (voteDecision.confidence >= 0.6) {
      await submitVote(proposal.chainId, voteDecision.vote === "AYE");
    }
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

  const contextPrompt = `Current proposal context:
Title: ${proposal.title}
Description: ${proposal.description}
Current Score: ${proposal.score}
Status: ${proposal.status}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: contextPrompt },
      ...messageHistory
    ],
    tools: tools
  });

  return response.choices[0].message.content || "";
}

export function extractVoteDecision(response: string): "aye" | "nay" | null {
  const lowerResponse = response.toLowerCase();
  if (lowerResponse.includes("vote: aye")) {
    return "aye";
  }
  if (lowerResponse.includes("vote: nay")) {
    return "nay";
  }
  return null;
}