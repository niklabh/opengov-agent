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

// Simple function to submit votes on-chain
async function executeVote(proposalId: string, vote: boolean): Promise<boolean> {
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

const availableTools = {
  async submitVote({ proposalId, vote, reasoning }: { proposalId: string; vote: "AYE" | "NAY"; reasoning: string }) {
    const success = await executeVote(proposalId, vote === "AYE");
    return { success, reasoning };
  }
};

const tools = [
  {
    type: "function",
    function: {
      name: "submitVote",
      description: "Submit an on-chain vote for a governance proposal",
      parameters: {
        type: "object",
        properties: {
          proposalId: {
            type: "string",
            description: "The ID of the proposal to vote on"
          },
          vote: {
            type: "string",
            enum: ["AYE", "NAY"],
            description: "Vote in favor (AYE) or against (NAY) the proposal"
          },
          reasoning: {
            type: "string",
            description: "Explanation for the voting decision"
          }
        },
        required: ["proposalId", "vote", "reasoning"]
      }
    }
  }
];

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
          Description: ${proposal.description}

          If you are confident about your decision, use the submitVote function to cast your vote.` 
      }
    ],
    tools: tools,
    tool_choice: "auto"
  });

  const message = response.choices[0].message;
  const result = JSON.parse(message.content || "{}");

  // Handle any function calls
  if (message.tool_calls) {
    for (const toolCall of message.tool_calls) {
      if (toolCall.function.name === "submitVote") {
        const args = JSON.parse(toolCall.function.arguments);
        await availableTools.submitVote({
          ...args,
          proposalId: proposal.chainId // Use the chainId as the proposalId
        });
      }
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
    tools: tools,
    tool_choice: "auto"
  });

  const message = response.choices[0].message;

  // Handle any function calls
  if (message.tool_calls) {
    for (const toolCall of message.tool_calls) {
      if (toolCall.function.name === "submitVote") {
        const args = JSON.parse(toolCall.function.arguments);
        await availableTools.submitVote({
          ...args,
          proposalId: proposal.chainId
        });
      }
    }
  }

  return message.content || "";
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