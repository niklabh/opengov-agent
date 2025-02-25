import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { fetchOnChainProposals } from "@/lib/polkadot";
import type { Proposal } from "@shared/schema";

export default function Home() {
  const { data: proposals, isLoading } = useQuery<Proposal[]>({ 
    queryKey: ["/api/proposals"]
  });

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading proposals...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        AI Governance Agent
      </h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {proposals?.map((proposal) => (
          <Card key={proposal.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{proposal.title}</h2>
                <Badge variant={proposal.status === "pending" ? "outline" : "default"}>
                  {proposal.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4 line-clamp-3">
                {proposal.description}
              </p>
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Score: {proposal.score}
                </div>
                <Link href={`/chat/${proposal.id}`}>
                  <Button>Discuss</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
