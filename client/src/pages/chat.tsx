import { useState, useEffect, useRef } from 'react';
import { useRoute, Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChatMessage, Proposal } from "@shared/schema";
import { createWebSocket } from "@/lib/websocket";
import { useQuery } from "@tanstack/react-query";

export default function Chat() {
  const [_, params] = useRoute('/chat/:id');
  const proposalId = params?.id ? parseInt(params.id) : 0;

  const { data: proposal } = useQuery<Proposal>({
    queryKey: [`/api/proposals/${proposalId}`],
    enabled: !!proposalId
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (proposalId) {
      const fetchMessages = async () => {
        try {
          const response = await apiRequest("GET", `/api/proposals/${proposalId}/messages`);
          const data = await response.json();

          if (Array.isArray(data)) {
            setMessages(data);
          } else {
            console.error("Expected array for messages but got:", data);
            setMessages([]); // Set to empty array as fallback
          }
        } catch (error) {
          console.error("Failed to fetch messages:", error);
          toast({
            title: "Error",
            description: "Failed to load chat messages",
            variant: "destructive"
          });
          setMessages([]); // Set to empty array on error
        }
      };

      fetchMessages();

      // Set up WebSocket connection
      socketRef.current = createWebSocket();

      socketRef.current.onopen = () => {
        setIsConnected(true);
        console.log("WebSocket connected");
      };

      socketRef.current.onclose = () => {
        setIsConnected(false);
        console.log("WebSocket disconnected");
        toast({
          title: "Connection Lost",
          description: "Chat connection lost. Please refresh the page.",
          variant: "destructive"
        });
      };

      socketRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
        toast({
          title: "Connection Error",
          description: "Failed to connect to chat service",
          variant: "destructive"
        });
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "chat" && data.data && data.data.proposalId === proposalId) {
            setMessages((prevMessages) => [...prevMessages, data.data]);
            setIsLoading(false);
          }
        } catch (err) {
          console.error("Error processing WebSocket message:", err);
        }
      };

      return () => {
        if (socketRef.current) {
          socketRef.current.close();
        }
      };
    }
  }, [proposalId, toast]);

  const handleSend = () => {
    if (!input.trim()) return;

    const message = {
      proposalId,
      sender: 'user',
      content: input
    };

    // Add message to UI immediately
    setMessages(prev => [...prev, { ...message, id: Date.now(), timestamp: Math.floor(Date.now() / 1000) }]);
    setInput('');
    setIsLoading(true);
    scrollToBottom();

    // Send message via WebSocket
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'chat',
        data: message
      }));
    } else {
      setIsLoading(false);
      toast({
        title: 'Connection Error',
        description: 'Not connected to chat service. Please refresh the page.',
        variant: 'destructive',
      });
    }
  };

  if (!proposal) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-4xl mx-auto">
        {/* Proposal Details Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Proposal #{proposal.chainId}</Badge>
                  <Badge variant={proposal.status === "pending" ? "outline" : "default"}>
                    {proposal.status}
                  </Badge>
                </div>
                <h2 className="text-2xl font-semibold">{proposal.title}</h2>
                <div className="text-sm text-muted-foreground">
                  Proposed by: {proposal.proposer}
                </div>
              </div>
              <Link href={`/proposal/${proposal.id}`}>
                <Button variant="outline">View Proposal</Button>
              </Link>
            </div>
          </CardHeader>
        </Card>

        {/* Chat Interface */}
        <Card>
          <CardContent className="p-6">
            <ScrollArea className="h-[60vh]">
              <div className="flex flex-col gap-4">
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex ${msg.sender === 'agent' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div 
                      className={`p-4 rounded-lg max-w-[80%] ${
                        msg.sender === 'agent' ? 'bg-secondary/50' : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-secondary/50 p-4 rounded-lg">
                      Thinking...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="flex gap-2 pt-4 border-t mt-4">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your message..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button 
                onClick={handleSend} 
                disabled={!input.trim() || isLoading}
              >
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}