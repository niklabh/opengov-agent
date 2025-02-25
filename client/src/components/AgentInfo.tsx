import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function AgentInfo() {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");

  const { data: agentInfo, isLoading } = useQuery({
    queryKey: ["/api/agent/info"]
  });

  const handleDelegate = async () => {
    try {
      await apiRequest("POST", "/api/agent/delegate", { amount });
      toast({
        title: "Success",
        description: "Successfully delegated voting power to the agent"
      });
      setAmount("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delegate voting power",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return <div>Loading agent information...</div>;
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <h2 className="text-2xl font-semibold">AI Governance Agent</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Agent Address</p>
          <p className="font-mono text-sm">{agentInfo?.address}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Current Voting Power</p>
          <p className="text-lg font-semibold">{agentInfo?.votingPower} DOT</p>
        </div>
      </CardContent>
      <CardFooter className="flex gap-4">
        <Input
          type="number"
          placeholder="Amount to delegate (DOT)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleDelegate}>Delegate</Button>
      </CardFooter>
    </Card>
  );
}
