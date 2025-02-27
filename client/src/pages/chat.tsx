import { useState, useEffect, useRef } from 'react';
import { useRoute } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ChatInput } from '@/components/ChatInput';
import { ChatMessage as ChatMessageComponent } from '@/components/ChatMessage';
import { ChatLoader } from '@/components/ChatLoader';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, Proposal } from "@shared/schema";
import { createWebSocket, sendChatMessage } from "@/lib/websocket";

export default function Chat() {
  const [_, params] = useRoute('/chat/:id');
  const proposalId = params?.id ? parseInt(params.id) : 0;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (proposalId) {
      const fetchMessages = async () => {
        try {
          const data = await apiRequest("GET", `/api/proposals/${proposalId}/messages`);
          // Ensure data is an array before setting state
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

      socketRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };

      socketRef.current.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
      };

      return () => {
        if (socketRef.current) {
          socketRef.current.close();
        }
      };
    }
  }, [proposalId, toast]);

  const handleSend = () => {
    if (!input.trim() || !isConnected || isLoading) return;

    const message = {
      proposalId,
      sender: 'user',
      content: input
    };

    // Add message to UI immediately
    setMessages(prev => [...prev, { ...message, id: Date.now(), timestamp: new Date().toISOString() }]);
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
        description: 'Not connected to chat service',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-4xl mx-auto">
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
                {isLoading && <ChatLoader />}
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
                disabled={!isConnected || isLoading}
              />
              <Button 
                onClick={handleSend} 
                disabled={!input.trim() || !isConnected || isLoading}
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