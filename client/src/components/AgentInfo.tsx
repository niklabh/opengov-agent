import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DelegateModal } from "./DelegateModal";
import FetchProposalForm from "./FetchProposalForm"; // Assuming this component exists

export function AgentInfo() {
  const { data: agentInfo, isLoading } = useQuery({
    queryKey: ["/api/agent/info"],
    select: (data) => data as { address: string; votingPower: string }
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
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>Load Proposal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Load Polkadot Proposal</DialogTitle>
              </DialogHeader>
              <FetchProposalForm onSuccess={() => document.querySelector<HTMLButtonElement>('[role="dialog"] button[aria-label="Close"]')?.click()} />
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                Delegate Voting Power
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delegate Voting Power</DialogTitle>
              </DialogHeader>
              <DelegateModal />
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}