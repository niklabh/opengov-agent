import OpenAI from "openai";
import { type Proposal, type ChatMessage } from "@shared/schema";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { Keyring } from "@polkadot/keyring";
import { storage } from "../storage";
import { log } from "../vite";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are an AI Governance Agent for the Polkadot DAO. Your role is to evaluate governance proposals and vote according to the DAO's best interests.`;

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
            description: "Vote in favor or against the proposal",
          },
          reasoning: {
            type: "string",
            description: "Your reasoning for the vote",
          },
        },
        required: ["vote", "reasoning"],
      },
    },
  },
];

// Available tools implementation
const availableTools = {
  async submitVote({ proposalId, chainId, vote, reasoning }) {
    try {
      // Connect to Polkadot node
      const wsProvider = new WsProvider("wss://rpc.polkadot.io");
      const api = await ApiPromise.create({
        provider: wsProvider,
        noInitWarn: true,
      });

      // Create a keyring instance
      const keyring = new Keyring({ type: "sr25519" });
      const agentKey = keyring.addFromUri(
        process.env.AGENT_SEED_PHRASE || "//Alice",
      );

      // Get agent account balance
      const accountInfo = await api.query.system.account(agentKey.address);
      const balance = accountInfo.data.free.toBigInt();

      // Check if we have enough balance
      if (balance <= BigInt(0)) {
        throw new Error("Insufficient balance for voting");
      }

      // Use 50% of available balance for voting to keep some for fees
      const voteBalance = balance / BigInt(2);

      log(
        `Submitting vote for proposal ${proposalId} with balance ${voteBalance}`,
        "polkadot",
      );

      // Submit the vote transaction using conviction voting
      const voteValue = vote === "aye";
      const conviction = 6; // Maximum conviction (6x voting power)

      const tx = api.tx.convictionVoting.vote(chainId, {
        Standard: {
          balance: voteBalance.toString(),
          vote: {
            aye: voteValue,
            conviction: conviction,
          },
        },
      });

      // Sign and send the transaction
      const hash = await tx.signAndSend(agentKey);
      const txHash = hash.toHex();

      log(`Vote transaction submitted: ${txHash}`, "polkadot");

      // Update proposal status in database
      await storage.updateProposalVoteResult(
        proposalId,
        vote.toLowerCase(),
        txHash,
      );
      log(`Updated proposal ${proposalId} status to voted`, "polkadot");

      // Return the transaction hash so it can be stored
      return { success: true, hash: txHash, vote: vote };
    } catch (error) {
      console.error("Error submitting vote:", error);
      return { success: false, error: error.message };
    }
  },
};

export async function analyzeProposal(proposal: Proposal) {
  try {
    if (process.env.OPENAI_API_KEY) {
      const prompt = `
        Analyze this governance proposal:
        Title: ${proposal.title}
        Description: ${proposal.description}

        Rate this proposal on a scale of 0-100 based on its potential benefit to the network.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.choices[0]?.message.content || "";
      const scoreMatch = content.match(/\b([0-9]{1,3})\b/);
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;

      return { score };
    } else {
      console.log("No OpenAI API key found, returning default score");
      return { score: 50 };
    }
  } catch (error) {
    console.error("Error in AI analysis:", error);
    return { score: 50 };
  }
}

// Generate chat response using AI
export async function generateChatResponse(
  proposal: Proposal,
  messages: ChatMessage[],
): Promise<string> {
  try {
    if (process.env.OPENAI_API_KEY) {
      const messageHistory = messages.map((msg) => ({
        role: msg.sender === "agent" ? "assistant" : ("user" as const),
        content: msg.content,
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
          ...messageHistory,
        ],
        tools: tools,
        tool_choice: "auto",
      });

      const message = response.choices[0].message;
      console.log(JSON.stringify(response, null, 2));
      const result = message.content || "I'm analyzing this proposal.";

      // Handle any function calls
      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.function.name === "submitVote") {
            const args = JSON.parse(toolCall.function.arguments);
            const voteResult = await availableTools.submitVote({
              ...args,
              proposalId: proposal.id,
              chainId: proposal.chainId,
            });

            if (voteResult.success) {
              // Add a message about the successful vote
              await storage.createChatMessage({
                proposalId: proposal.id,
                sender: "agent",
                content: `✅ I've submitted an ${args.vote} vote on-chain for this proposal.\n\nReasoning: ${args.reasoning}\n\nTransaction hash: ${voteResult.hash}`,
              });
            } else {
              // Add an error message if the vote failed
              await storage.createChatMessage({
                proposalId: proposal.id,
                sender: "agent",
                content: `❌ Failed to submit the vote: ${voteResult.error}`,
              });
            }
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

export function extractVoteDecision(message: string): "aye" | "nay" | null {
  const lowerMessage = message.toLowerCase();
  if (
    lowerMessage.includes("i vote aye") ||
    lowerMessage.includes("vote aye") ||
    lowerMessage.includes("i support")
  ) {
    return "aye";
  } else if (
    lowerMessage.includes("i vote nay") ||
    lowerMessage.includes("vote nay") ||
    lowerMessage.includes("i oppose")
  ) {
    return "nay";
  }
  return null;
}

export default {
  analyzeProposal,
  extractVoteDecision,
  generateChatResponse,
};
