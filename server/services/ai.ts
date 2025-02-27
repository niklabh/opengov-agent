import OpenAI from "openai";
import { type Proposal, type ChatMessage } from "@shared/schema";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { Keyring } from "@polkadot/keyring";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeProposal(proposal: Proposal) {
  try {
    // If OpenAI API key is available, use AI to analyze
    if (process.env.OPENAI_API_KEY) {
      const prompt = `
        Analyze this governance proposal:
        Title: ${proposal.title}
        Description: ${proposal.description}

        Rate this proposal on a scale of 0-100 based on its potential benefit to the network.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      });

      // Extract a score from the AI response
      const content = response.choices[0]?.message.content || "";
      // Try to find a number in the response
      const scoreMatch = content.match(/\b([0-9]{1,3})\b/);
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 50; // Default to 50 if no score found

      return { score };
    } else {
      // If no API key, return a default score
      console.log("No OpenAI API key found, returning default score");
      return { score: 50 };
    }
  } catch (error) {
    console.error("Error in AI analysis:", error);
    // Return a default score on error
    return { score: 50 };
  }
}

// Extract vote decision from a message
export function extractVoteDecision(message: string): string | null {
  // Simple implementation that looks for voting intent in the message
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("i vote aye") || lowerMessage.includes("vote aye") || lowerMessage.includes("i support")) {
    return "aye";
  } else if (lowerMessage.includes("i vote nay") || lowerMessage.includes("vote nay") || lowerMessage.includes("i oppose")) {
    return "nay";
  }
  return null;
}

// Generate chat response using AI
export async function generateChatResponse(proposal: Proposal, messages: ChatMessage[]): Promise<string> {
  try {
    if (process.env.OPENAI_API_KEY) {
      // Format the chat history for the AI
      const formattedMessages = [
        { 
          role: "system", 
          content: `You are an AI governance agent for the Polkadot network. You help users understand proposal ${proposal.title}. Be informative but concise.` 
        },
        ...messages.map(msg => ({
          role: msg.sender === "agent" ? "assistant" : "user",
          content: msg.content
        }))
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: formattedMessages,
      });

      return response.choices[0]?.message.content || "I'm sorry, I couldn't process that request.";
    } else {
      return "I'm a governance agent (running without OpenAI API key). How can I help you understand this proposal?";
    }
  } catch (error) {
    console.error("Error generating chat response:", error);
    return "I'm sorry, I encountered an error while processing your request.";
  }
}

const SYSTEM_PROMPT = `You are an AI Governance Agent for the Polkadot DAO. Your role is to evaluate governance proposals and vote according to the DAO's best interests.

You should consider the following criteria:
1. Technical Innovation: Does the proposal improve the network's technical capabilities?
2. Ecosystem Growth: Does it contribute to the growth of the Polkadot ecosystem?
3. Community Benefit: Does it benefit token holders and the broader community?
4. Economic Sustainability: Is it economically sustainable and responsible?
5. Decentralization: Does it enhance the decentralization of the network?

Based on your analysis, provide a score from 0-100 and a clear explanation of your reasoning.`;

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

    // Submit vote with full balance using the correct format
    const voteTx = api.tx.convictionVoting.vote(proposalId, { 
      Standard: { 
        balance: votingBalance, 
        vote: { 
          aye: vote, 
          conviction: 1 
        } 
      } 
    });
    
    await voteTx.signAndSend(agentKey);
    return true;
  } catch (error) {
    console.error("Failed to submit vote:", error);
    return false;
  }
}