import { ApiPromise, WsProvider } from "@polkadot/api";

let api: ApiPromise | null = null;

export async function initPolkadotApi() {
  if (!api) {
    const wsProvider = new WsProvider("wss://kusama-rpc.polkadot.io");
    api = await ApiPromise.create({ provider: wsProvider });
  }
  return api;
}

export async function fetchOnChainProposals() {
  const api = await initPolkadotApi();
  const proposals = await api.query.democracy.publicProps();
  return proposals.toJSON();
}

export async function submitVote(proposalHash: string, vote: boolean) {
  const api = await initPolkadotApi();
  // Implement actual voting logic here
  console.log("Submitting vote:", { proposalHash, vote });
}
