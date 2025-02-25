import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';
import { apiRequest } from '@/lib/queryClient';

export function DelegateModal() {
  const [accounts, setAccounts] = useState<Array<{ address: string; meta: { name: string } }>>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  async function connectWallet() {
    try {
      setIsConnecting(true);
      const extensions = await web3Enable('AI Governance Agent');
      
      if (extensions.length === 0) {
        toast({
          title: "No wallet found",
          description: "Please install the Polkadot.js extension",
          variant: "destructive"
        });
        return;
      }

      const allAccounts = await web3Accounts();
      setAccounts(allAccounts);

      if (allAccounts.length > 0) {
        setSelectedAddress(allAccounts[0].address);
      }

      toast({
        title: "Wallet connected",
        description: `Found ${allAccounts.length} account(s)`
      });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast({
        title: "Connection failed",
        description: "Could not connect to wallet",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDelegate() {
    if (!selectedAddress || !amount) {
      toast({
        title: "Invalid input",
        description: "Please select an address and enter an amount",
        variant: "destructive"
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/agent/delegate", {
        fromAddress: selectedAddress,
        amount: parseFloat(amount)
      });

      toast({
        title: "Success",
        description: "Successfully delegated voting power"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delegate voting power",
        variant: "destructive"
      });
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          Delegate Voting Power
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delegate Voting Power</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {accounts.length === 0 ? (
            <Button
              onClick={connectWallet}
              className="w-full"
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Address</label>
                <Select value={selectedAddress} onValueChange={setSelectedAddress}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an address" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.address} value={account.address}>
                        {account.meta.name} - {account.address.substring(0, 6)}...{account.address.substring(account.address.length - 4)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (DOT)</label>
                <Input
                  type="number"
                  placeholder="Enter amount to delegate"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <Button onClick={handleDelegate} className="w-full">
                Delegate
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
