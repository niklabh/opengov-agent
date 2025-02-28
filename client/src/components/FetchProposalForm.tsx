import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const fetchProposalSchema = z.object({
  proposalId: z.string().min(1, "Please enter a proposal ID")
});

type FetchProposalForm = z.infer<typeof fetchProposalSchema>;

export function FetchProposalForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const form = useForm<FetchProposalForm>({
    resolver: zodResolver(fetchProposalSchema),
    defaultValues: {
      proposalId: ""
    }
  });

  const fetchProposal = useMutation({
    mutationFn: async (data: FetchProposalForm) => {
      const response = await apiRequest("POST", "/api/proposals/fetch", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      toast({
        title: "Success",
        description: "Proposal fetched successfully"
      });
      // Navigate to the proposal page
      window.location.href = `/proposal/${data.id}`;
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

export default FetchProposalForm;