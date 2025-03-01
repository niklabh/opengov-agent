import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import type { Proposal } from "@shared/schema";
import { AgentInfo } from "@/components/AgentInfo";
import { ListStart } from "lucide-react";

export default function Home() {
  const { data: proposals, isLoading } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals"]
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          AI Governance Agent
        </h1>
        <div className="animate-pulse space-y-6">
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center">
        AI Governance Agent
      </h1>

      <AgentInfo />

      <div className="flex items-center gap-3 mb-6">
        <ListStart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h2 className="text-2xl font-bold">Active Proposals</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {proposals?.map((proposal) => (
          <Card key={proposal.id} className="hover:shadow-lg transition-shadow bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">#{proposal.chainId}</Badge>
                    <Badge variant={proposal.status === "pending" ? "outline" : "default"}>
                      {proposal.status}
                    </Badge>
                  </div>
                  <Link href={`/proposal/${proposal.id}`}>
                    <h3 className="text-xl font-semibold hover:text-blue-600 transition-colors line-clamp-2">
                      {proposal.title}
                    </h3>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4 line-clamp-3">
                {proposal.description.replace(/<[^>]*>/g, '')}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {proposal.status === "voted" && (
                  <Badge variant={proposal.voteResult === "aye" ? "success" : "destructive"}>
                    Voted: {proposal.voteResult?.toUpperCase()}
                  </Badge>
                )}
                <Badge variant="outline">Score: {proposal.score}/100</Badge>
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
              <div className="flex justify-end items-center gap-2 mt-4">
                <Link href={`/proposal/${proposal.id}`}>
                  <Button variant="outline" size="sm">View Details</Button>
                </Link>
                <Link href={`/chat/${proposal.id}`}>
                  <Button size="sm">Discuss</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}