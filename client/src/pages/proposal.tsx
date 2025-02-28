import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { Proposal } from "@shared/schema";

export default function ProposalPage() {
  const [_, params] = useRoute('/proposal/:id');
  const proposalId = params?.id;

  const { data: proposal, isLoading } = useQuery<Proposal>({
    queryKey: [`/api/proposals/${proposalId}`],
    enabled: !!proposalId
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-secondary rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-secondary rounded mb-4"></div>
          <div className="h-16 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Proposal not found</h1>
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </div>
    );
  }

  const formattedDate = new Date(proposal.createdAt).toLocaleString();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/">
          <Button variant="outline">← Back</Button>
        </Link>
        <Badge variant={proposal.status === "pending" ? "outline" : "default"}>
          {proposal.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">#{proposal.chainId}</Badge>
              {proposal.voteResult && (
                <Badge variant={proposal.voteResult === "aye" ? "success" : "destructive"}>
                  Vote: {proposal.voteResult.toUpperCase()}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold">{proposal.title}</h1>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>
                Proposed by: {proposal.proposer}
              </div>
              <div>Created: {formattedDate}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose dark:prose-invert max-w-none" 
               dangerouslySetInnerHTML={{ __html: proposal.description }} />

          <div className="flex flex-col gap-2 pt-4 border-t">
            <div>
              <span className="text-sm text-muted-foreground">AI Score:</span>
              <span className="ml-2 font-semibold">{proposal.score}/100</span>
            </div>
            {proposal.voteTxHash && (
              <div>
                <span className="text-sm text-muted-foreground">Transaction:</span>
                <a
                  href={`https://polkadot.subscan.io/extrinsic/${proposal.voteTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-500 hover:underline"
                >
                  View on Subscan
                </a>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Link href={`/chat/${proposal.id}`}>
              <Button>Discuss with AI Agent</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}