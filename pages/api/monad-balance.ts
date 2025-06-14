import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    // Use Monad RPC to get balance
    const rpcResponse = await fetch('https://testnet-rpc.monad.xyz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1,
      }),
    });

    if (!rpcResponse.ok) {
      throw new Error(`RPC request failed: ${rpcResponse.statusText}`);
    }

    const rpcData = await rpcResponse.json();

    if (rpcData.error) {
      throw new Error(`RPC error: ${rpcData.error.message}`);
    }

    // rpcData.result contains the balance in wei (hex format)
    const balanceWei = rpcData.result;
    
    // Convert hex to decimal
    const balanceDecimal = BigInt(balanceWei).toString();

    res.status(200).json({ 
      balance: balanceDecimal,
      address: address,
      balanceHex: balanceWei
    });

  } catch (error) {
    console.error('Error fetching balance from Monad RPC:', error);
    res.status(500).json({ 
      error: 'Failed to fetch balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 