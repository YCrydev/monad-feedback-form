import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../lib/database';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  try {
    const hasSubmittedFeedback = await db.hasWalletSubmittedFeedback(walletAddress);
    const existingFeedback = hasSubmittedFeedback ? await db.getFeedbackByWallet(walletAddress) : null;

    res.status(200).json({
      hasSubmittedFeedback,
      feedbackId: existingFeedback?.id || null,
      submittedAt: existingFeedback?.created_at || null
    });

  } catch (error) {
    console.error('Error checking feedback status:', error);
    res.status(500).json({ 
      error: 'Failed to check feedback status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 