import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertProposalSchema, insertChatMessageSchema } from "@shared/schema";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { analyzeProposal, generateChatResponse, extractVoteDecision } from "./services/ai";
import { Keyring } from "@polkadot/keyring";
import { fetchProposalFromPolkassembly } from "./services/polkassembly";
import { z } from "zod";

const fetchProposalSchema = z.object({
  proposalId: z.string()
});

//Helper function to format balance (needs implementation)
const formatBalance = (balance: string, options: { withUnit: string }) => {
    // Replace this with your actual balance formatting logic
    return `${balance} ${options.withUnit}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/socket" });

  // Polkadot API setup
  const wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io");
  const api = await ApiPromise.create({ provider: wsProvider });

  // Setup Polkadot keyring using seed phrase
  const keyring = new Keyring({ type: 'sr25519' });
  const agentKey = keyring.addFromUri(process.env.AGENT_SEED_PHRASE || '//Alice'); // Use //Alice for testing

  // WebSocket handling
  wss.on("connection", (ws) => {
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "chat") {
          const validatedMessage = insertChatMessageSchema.parse(message.data);
          const savedMessage = await storage.createChatMessage(validatedMessage);

          // Get the proposal context
          const proposal = await storage.getProposal(validatedMessage.proposalId);
          if (!proposal) {
            throw new Error("Proposal not found");
          }

          // Get chat history
          const messages = await storage.getChatMessages(validatedMessage.proposalId);

          // Generate AI response
          const aiResponse = await generateChatResponse(proposal, messages);

          // Save AI's response
          const aiMessage = await storage.createChatMessage({
            proposalId: validatedMessage.proposalId,
            sender: "agent",
            content: aiResponse
          });

          // Check if AI has decided to vote
          const voteDecision = extractVoteDecision(aiResponse);
          if (voteDecision === "aye") {
            try {
              // Submit the vote on-chain
              const vote = api.tx.democracy.vote(proposal.chainId, { Standard: { vote: true, balance: 1000 } });
              await vote.signAndSend(agentKey);

              // Update proposal status
              await storage.updateProposalStatus(proposal.id, "voted");

              // Notify about successful vote
              const voteMessage = await storage.createChatMessage({
                proposalId: validatedMessage.proposalId,
                sender: "agent",
                content: "✅ I've submitted an AYE vote on-chain for this proposal."
              });

              // Broadcast all messages
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({ type: "chat", data: savedMessage }));
                  client.send(JSON.stringify({ type: "chat", data: aiMessage }));
                  client.send(JSON.stringify({ type: "chat", data: voteMessage }));
                }
              });
              return;
            } catch (error) {
              console.error("Failed to submit vote:", error);
              const errorMessage = await storage.createChatMessage({
                proposalId: validatedMessage.proposalId,
                sender: "agent",
                content: "❌ Failed to submit the vote on-chain. Please try again later."
              });
              aiMessage.content += "\n\n" + errorMessage.content;
            }
          }

          // Broadcast messages if no vote was made
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "chat", data: savedMessage }));
              client.send(JSON.stringify({ type: "chat", data: aiMessage }));
            }
          });
        }
      } catch (error) {
        console.error("WebSocket error:", error);
      }
    });
  });

  // REST API routes
  app.get("/api/proposals", async (_req, res) => {
    const proposals = await storage.listProposals();
    res.json(proposals);
  });

  app.post("/api/proposals/fetch", async (req, res) => {
    try {
      const { proposalId } = fetchProposalSchema.parse(req.body);

      // Fetch proposal from Polkassembly
      const proposalData = await fetchProposalFromPolkassembly(proposalId);

      // Save to database
      const saved = await storage.createProposal(proposalData);

      // Analyze the proposal using AI
      const analysis = await analyzeProposal(saved);

      // Update the proposal with the analysis results
      const updated = await storage.updateProposalScore(saved.id, analysis.score);

      res.json(updated);
    } catch (error) {
      console.error("Failed to fetch proposal:", error);
      res.status(400).json({ error: "Failed to fetch proposal" });
    }
  });

  app.get("/api/proposals/:id/messages", async (req, res) => {
    const messages = await storage.getChatMessages(parseInt(req.params.id));
    res.json(messages);
  });

  app.get("/api/agent/info", async (_req, res) => {
    try {
      const keyring = new Keyring({ type: 'sr25519' });
      const agentKey = keyring.addFromUri(process.env.AGENT_SEED_PHRASE || '//Alice');
      const address = agentKey.address;

      // Get voting power (free balance)
      const accountInfo = await api.query.system.account(address);
      const votingPower = accountInfo.data.free.toString();

      res.json({
        address,
        votingPower: formatBalance(votingPower, { withUnit: 'DOT' })
      });
    } catch (error) {
      console.error("Failed to get agent info:", error);
      res.status(500).json({ error: "Failed to get agent information" });
    }
  });

  app.post("/api/agent/delegate", async (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount) {
        return res.status(400).json({ error: "Amount is required" });
      }

      const keyring = new Keyring({ type: 'sr25519' });
      const agentKey = keyring.addFromUri(process.env.AGENT_SEED_PHRASE || '//Alice');

      // In a real implementation, this would involve calling the appropriate democracy.delegate
      // or conviction voting pallet functions
      console.log(`Would delegate ${amount} DOT to ${agentKey.address}`);

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delegate:", error);
      res.status(500).json({ error: "Failed to delegate voting power" });
    }
  });

  return httpServer;
}