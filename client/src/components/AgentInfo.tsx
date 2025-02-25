import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { DelegateModal } from "./DelegateModal";

export function AgentInfo() {
  const { data: agentInfo, isLoading } = useQuery({
    queryKey: ["/api/agent/info"]
  });

  if (isLoading) {
    return <div>Loading agent information...</div>;
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <h2 className="text-2xl font-semibold">AI Governance Agent</h2>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Agent Address</p>
          <p className="font-mono text-sm mt-1">{agentInfo?.address}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Current Voting Power</p>
          <p className="text-2xl font-semibold mt-1">{agentInfo?.votingPower}</p>
        </div>
        <DelegateModal />
      </CardContent>
    </Card>
  );
}