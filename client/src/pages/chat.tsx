import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, Proposal } from "@shared/schema";
import { createWebSocket, sendChatMessage } from "@/lib/websocket";
import { analyzeProposal } from "@/lib/scoring";

export default function Chat({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const socketRef = useRef<WebSocket>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: proposal } = useQuery<Proposal>({ 
    queryKey: ["/api/proposals", params.id]
  });

  const { data: initialMessages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/proposals", params.id, "messages"],
  });

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    const socket = createWebSocket();
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "chat") {
        setMessages(prev => [...prev, message.data]);
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    };

    return () => socket.close();
  }, []);

  const handleSend = () => {
    if (!input.trim() || !socketRef.current) return;

    const message = {
      proposalId: parseInt(params.id),
      sender: "proposer",
      content: input
    };

    sendChatMessage(socketRef.current, message);
    setInput("");

    // Update proposal analysis based on new message
    const analysis = analyzeProposal(input);
    console.log("Message analysis:", analysis);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="container mx-auto px-4 py-6 flex-1 flex flex-col max-w-4xl">
        <Card className="flex-1 flex flex-col">
          <CardContent className="p-6 flex-1 flex flex-col min-h-0">
            {/* Proposal Details */}
            <div className="border-b pb-4 mb-4">
              <h2 className="text-2xl font-bold">{proposal?.title}</h2>
              <p className="text-muted-foreground mt-2">{proposal?.description}</p>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4 pb-4">
                  {messages.map((message, i) => (
                    <div
                      key={i}
                      className={`flex ${
                        message.sender === "agent" ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`rounded-lg px-4 py-2 max-w-[80%] ${
                          message.sender === "agent"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div className="text-xs opacity-70 mb-1">
                          {message.sender === "agent" ? "AI Agent" : "You"}
                        </div>
                        <div className="whitespace-pre-wrap break-words">{message.content}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Input Area */}
            <div className="flex gap-2 pt-4 border-t mt-4">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button onClick={handleSend}>Send</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}