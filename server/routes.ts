import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertProposalSchema, insertChatMessageSchema } from "@shared/schema";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { analyzeProposal, generateChatResponse } from "./services/ai";
import { Keyring } from "@polkadot/keyring";
import { fetchProposalFromPolkassembly } from "./services/polkassembly";
import { z } from "zod";
import { log } from "./vite";

const fetchProposalSchema = z.object({
  proposalId: z.string()
});

//Helper function to format balance
const formatBalance = (balance: string, options: { withUnit: string }) => {
    // Convert balance to DOT (10 decimal places)
    const amount = BigInt(balance);
    const dotAmount = Number(amount) / Math.pow(10, 10);
    // Format with 4 decimal places
    return `${dotAmount.toFixed(4)} ${options.withUnit}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/socket" });

  // Polkadot API setup with enhanced error handling
  log('Connecting to Polkadot network...', 'polkadot');
  try {
    const wsProvider = new WsProvider("wss://rpc.polkadot.io");
    const api = await ApiPromise.create({ 
      provider: wsProvider,
      noInitWarn: true 
    });

    await api.isReady;
    log('Successfully connected to Polkadot network', 'polkadot');

    // Setup Polkadot keyring
    const keyring = new Keyring({ type: 'sr25519' });
    const agentKey = keyring.addFromUri(process.env.AGENT_SEED_PHRASE || '//Alice');
    log('Keyring setup completed', 'polkadot');

    // WebSocket handling
    wss.on("connection", (ws) => {
      log('New WebSocket connection established', 'websocket');

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

            // Broadcast messages to all connected clients
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: "chat", data: savedMessage }));
                client.send(JSON.stringify({ type: "chat", data: aiMessage }));
              }
            });
          }
        } catch (error) {
          log(`WebSocket error: ${error}`, 'websocket');
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

        try {
          // Analyze the proposal using AI
          const analysis = await analyzeProposal(saved);
          const score = (analysis && analysis.score !== undefined) ? analysis.score : 0;
          const updated = await storage.updateProposalScore(saved.id, score);
          res.json(updated);
        } catch (error) {
          console.error("Error analyzing proposal:", error);
          res.json(saved);
        }
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
        const address = agentKey.address;
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

  } catch (error) {
    log(`Failed to connect to Polkadot network: ${error}`, 'polkadot');
    throw error;
  }
}