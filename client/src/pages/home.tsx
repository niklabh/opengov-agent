import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import type { Proposal } from "@shared/schema";
import { AgentInfo } from "@/components/AgentInfo";

export default function Home() {
  const { data: proposals, isLoading } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals"]
  });

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading proposals...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">
        AI Governance Agent
      </h1>

      <AgentInfo />

      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Proposals</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {proposals?.map((proposal) => (
          <Card key={proposal.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">Referendum #{proposal.chainId}</Badge>
                    <Badge variant={proposal.status === "pending" ? "outline" : "default"}>
                      {proposal.status}
                    </Badge>
                  </div>
                  <Link href={`/proposal/${proposal.id}`}>
                    <h2 className="text-xl font-semibold hover:text-blue-600 transition-colors">
                      {proposal.title}
                    </h2>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4 line-clamp-3">
                {proposal.description}
              </p>
              <div className="flex space-x-2 mt-2">
                {proposal.status === "voted" && (
                  <Badge variant="success">
                    Voted: {proposal.voteResult?.toUpperCase()}
                  </Badge>
                )}
                <Badge variant="outline">{proposal.score}/100</Badge>
              </div>
              {proposal.voteTxHash && (
                <div className="mt-2 text-xs">
                  <a 
                    href={`https://polkadot.subscan.io/extrinsic/${proposal.voteTxHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    View transaction on Subscan
                  </a>
                </div>
              )}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-muted-foreground">
                  Score: {proposal.score}
                </div>
                <div className="space-x-2">
                  <Link href={`/proposal/${proposal.id}`}>
                    <Button variant="outline">View Details</Button>
                  </Link>
                  <Link href={`/chat/${proposal.id}`}>
                    <Button>Discuss</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}