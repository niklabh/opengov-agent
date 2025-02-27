import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { insertProposalSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Proposal, InsertProposal } from "@shared/schema";
import { z } from "zod";
import { AgentInfo } from "@/components/AgentInfo"; // Added import

const fetchProposalSchema = z.object({
  proposalId: z.string().min(1, "Please enter a proposal ID")
});

type FetchProposalForm = z.infer<typeof fetchProposalSchema>;

function FetchProposalForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const form = useForm<FetchProposalForm>({
    resolver: zodResolver(fetchProposalSchema),
    defaultValues: {
      proposalId: ""
    }
  });

  const fetchProposal = useMutation({
    mutationFn: async (data: FetchProposalForm) => {
      await apiRequest("POST", "/api/proposals/fetch", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      toast({
        title: "Success",
        description: "Proposal fetched successfully"
      });
      onSuccess();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to fetch proposal",
        variant: "destructive"
      });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => fetchProposal.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="proposalId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proposal ID</FormLabel>
              <FormControl>
                <Input placeholder="Enter Polkadot proposal ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={fetchProposal.isPending}
        >
          {fetchProposal.isPending ? "Fetching..." : "Fetch Proposal"}
        </Button>
      </form>
    </Form>
  );
}

function CreateProposalForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const form = useForm<InsertProposal>({
    resolver: zodResolver(insertProposalSchema),
    defaultValues: {
      chainId: "kusama",
      title: "",
      description: "",
      proposer: "anon" // In a real app, this would come from authentication
    }
  });

  const createProposal = useMutation({
    mutationFn: async (data: InsertProposal) => {
      await apiRequest("POST", "/api/proposals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      toast({
        title: "Success",
        description: "Proposal created successfully"
      });
      onSuccess();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create proposal",
        variant: "destructive"
      });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => createProposal.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter proposal title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe your proposal..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={createProposal.isPending}
        >
          {createProposal.isPending ? "Creating..." : "Create Proposal"}
        </Button>
      </form>
    </Form>
  );
}

export default function Home() {
  const { data: proposals, isLoading } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals"]
  });

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading proposals...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          AI Governance Agent
        </h1>

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
      </div>

      <AgentInfo />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {proposals?.map((proposal) => (
          <Card key={proposal.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">ID: {proposal.id}</div>
                  <h2 className="text-xl font-semibold">{proposal.title}</h2>
                </div>
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