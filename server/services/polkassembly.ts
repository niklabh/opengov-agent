import { InsertProposal } from "@shared/schema";

interface PolkassemblyResponse {
  title: string;
  content: string;
}

export async function fetchProposalFromPolkassembly(proposalId: string): Promise<InsertProposal> {
  const response = await fetch(
    `https://polkadot.polkassembly.io/api/v1/posts/on-chain-post?postId=${proposalId}&proposalType=referendums_v2`,
    {
      headers: {
        "x-network": "polkadot"
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch proposal: ${response.statusText}`);
  }

  const data = await response.json() as PolkassemblyResponse;

  return {
    chainId: proposalId,
    title: data.title,
    description: data.content,
    proposer: "polkassembly"
  };
}
