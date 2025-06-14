import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { txHash } = req.body;

  if (!txHash) {
    return res.status(400).json({ error: 'Transaction hash is required' });
  }

  try {
    // Use Monad RPC to get transaction receipt
    const rpcResponse = await fetch('https://testnet-rpc.monad.xyz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
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

    // If receipt is null, transaction is not confirmed yet
    if (!rpcData.result) {
      return res.status(200).json({ 
        confirmed: false,
        txHash: txHash 
      });
    }

    // Transaction is confirmed
    const receipt = rpcData.result;
    const success = receipt.status === '0x1'; // 0x1 means success, 0x0 means failure

    res.status(200).json({ 
      confirmed: true,
      success: success,
      txHash: txHash,
      receipt: receipt,
      blockNumber: parseInt(receipt.blockNumber, 16),
      gasUsed: parseInt(receipt.gasUsed, 16),
      status: receipt.status
    });

  } catch (error) {
    console.error('Error checking transaction confirmation:', error);
    res.status(500).json({ 
      error: 'Failed to check transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 