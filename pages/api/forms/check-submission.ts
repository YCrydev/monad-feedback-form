import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress, formId } = req.body;

    if (!walletAddress || !formId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hasSubmitted = await db.hasWalletSubmittedToForm(formId, walletAddress);

    res.status(200).json({ hasSubmitted });
  } catch (error) {
    console.error('Error checking form submission status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 