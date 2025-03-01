import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DelegateModal } from "./DelegateModal";
import FetchProposalForm from "./FetchProposalForm";
import { WalletIcon, Vote } from "lucide-react";

function formatPolkadotAddress(address: string) {
  const prefix = address.slice(0, 8);
  const suffix = address.slice(-6);
  return `${prefix}...${suffix}`;
}

export function AgentInfo() {
  const { data: agentInfo, isLoading } = useQuery({
    queryKey: ["/api/agent/info"],
    select: (data) => data as { address: string; votingPower: string }
  });

  if (isLoading) {
    return (
      <Card className="mb-8 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 opacity-50"></div>
      <CardContent className="relative space-y-6 p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4 p-6 bg-white/50 dark:bg-gray-900/50 rounded-lg border">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <WalletIcon className="h-5 w-5" />
              <p className="text-sm font-medium">Agent Address</p>
            </div>
            <div className="space-y-2">
              <p className="font-mono text-sm bg-gray-50 dark:bg-gray-900 p-2 rounded">
                {agentInfo?.address && formatPolkadotAddress(agentInfo.address)}
              </p>
              <p className="text-xs text-muted-foreground">
                Click to copy full address
              </p>
            </div>
          </div>
          <div className="space-y-4 p-6 bg-white/50 dark:bg-gray-900/50 rounded-lg border">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Vote className="h-5 w-5" />
              <p className="text-sm font-medium">Current Voting Power</p>
            </div>
            <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {agentInfo?.votingPower}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                Load Proposal
              </Button>
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
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
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