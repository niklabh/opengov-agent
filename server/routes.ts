import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertProposalSchema, insertChatMessageSchema } from "@shared/schema";
import { ApiPromise, WsProvider } from "@polkadot/api";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // Polkadot API setup
  const wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io");
  const api = await ApiPromise.create({ provider: wsProvider });

  // WebSocket handling
  wss.on("connection", (ws) => {
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "chat") {
          const validatedMessage = insertChatMessageSchema.parse(message.data);
          const savedMessage = await storage.createChatMessage(validatedMessage);
          
          // Broadcast to all connected clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: "chat",
                data: savedMessage
              }));
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

  app.post("/api/proposals", async (req, res) => {
    try {
      const proposal = insertProposalSchema.parse(req.body);
      const saved = await storage.createProposal(proposal);
      res.json(saved);
    } catch (error) {
      res.status(400).json({ error: "Invalid proposal data" });
    }
  });

  app.get("/api/proposals/:id/messages", async (req, res) => {
    const messages = await storage.getChatMessages(parseInt(req.params.id));
    res.json(messages);
  });

  app.post("/api/vote", async (req, res) => {
    const { proposalId, decision } = req.body;
    try {
      const proposal = await storage.getProposal(proposalId);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      // Submit vote to chain (stubbed for now)
      await storage.updateProposalStatus(proposalId, "voted");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to submit vote" });
    }
  });

  return httpServer;
}
