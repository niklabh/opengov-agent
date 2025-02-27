import OpenAI from "openai";
import { type Proposal, type ChatMessage } from "@shared/schema";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { Keyring } from "@polkadot/keyring";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are an AI Governance Agent for the Polkadot DAO. Your role is to evaluate governance proposals and vote according to the DAO's best interests.`;

// Tool definitions for OpenAI function calling
const tools = [
  {
    type: "function",
    function: {
      name: "submitVote",
      description: "Submit a vote on the proposal",
      parameters: {
        type: "object",
        properties: {
          vote: {
            type: "string",
            enum: ["aye", "nay"],
            description: "Vote in favor or against the proposal"
          },
          reasoning: {
            type: "string",
            description: "Your reasoning for the vote"
          }
        },
        required: ["vote", "reasoning"]
      }
    }
  }
];

// Available tools implementation
const availableTools = {
  async submitVote({ proposalId, vote, reasoning }: { proposalId: string, vote: string, reasoning: string }) {
    try {
      // Connect to Polkadot node
      const wsProvider = new WsProvider('wss://rpc.polkadot.io');
      const api = await ApiPromise.create({ provider: wsProvider });

      // Create a keyring instance
      const keyring = new Keyring({ type: 'sr25519' });

      // Add the agent's account using the seed phrase from environment variables
      const agentAccount = keyring.addFromUri(process.env.AGENT_SEED_PHRASE || '//Alice');

      // Get the API method for voting
      const referendumIndex = parseInt(proposalId, 10);

      // Get agent account balance
      const accountInfo = await api.query.system.account(agentAccount.address);
      const availableBalance = accountInfo.data.free.toBigInt();
      
      // Check if we have enough balance
      if (availableBalance <= BigInt(0)) {
        throw new Error("Insufficient balance for voting");
      }
      
      // Use 50% of available balance for voting to keep some for fees
      const voteBalance = availableBalance / BigInt(2);
      
      // Submit the vote transaction using conviction voting
      const voteValue = vote === 'aye';
      const conviction = 1; // Default conviction (can be 0-6)
      
      const tx = api.tx.convictionVoting.vote(referendumIndex, {
        Standard: { 
          balance: voteBalance.toString(), 
          vote: { 
            aye: voteValue, 
            conviction: conviction 
          } 
        }
      });

      // Sign and send the transaction
      const hash = await tx.signAndSend(agentAccount);
      const txHash = hash.toHex();

      // Log the vote details
      console.log(`Vote submitted: ${vote} on referendum ${referendumIndex}`);
      console.log(`Transaction hash: ${txHash}`);

      // Return the transaction hash so it can be stored
      return { success: true, hash: txHash, vote: vote };

      return { success: true, hash: hash.toHex() };
    } catch (error) {
      console.error("Error submitting vote:", error);
      return { success: false, error };
    }
  }
};

// Function to analyze a proposal
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
      const result = message.content || "I'm analyzing this proposal.";

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
    } else {
      return "I'm a governance agent (running without OpenAI API key). How can I help you understand this proposal?";
    }
  } catch (error) {
    console.error("Error generating chat response:", error);
    return "I'm sorry, I encountered an error while processing your request.";
  }
}

export default {
  analyzeProposal,
  extractVoteDecision,
  generateChatResponse
};