import { ApiPromise, WsProvider } from "@polkadot/api";
import { formatBalance } from "@polkadot/util";

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

export async function getAgentAddress(): Promise<string> {
  const api = await initPolkadotApi();
  // The address is derived from the agent's seed phrase on the server
  // We just need to show a placeholder for now
  return "AGENT_ADDRESS"; // This will be replaced with actual address from server
}

export async function getVotingPower(address: string): Promise<string> {
  const api = await initPolkadotApi();
  const balance = await api.query.system.account(address);
  return formatBalance(balance.data.free, { withUnit: 'DOT' });
}

export async function delegateVotingPower(to: string, amount: string) {
  const api = await initPolkadotApi();
  // Implementation will depend on the specific delegation mechanism
  // This is a placeholder that will be replaced with actual implementation
  console.log("Delegating voting power:", { to, amount });
}

export async function submitVote(proposalHash: string, vote: boolean) {
  const api = await initPolkadotApi();
  // Implement actual voting logic here
  console.log("Submitting vote:", { proposalHash, vote });
}