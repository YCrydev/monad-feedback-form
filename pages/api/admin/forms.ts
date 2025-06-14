import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Check if user is admin
    const isAdmin = await db.isAdmin(walletAddress);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    // Get forms for this admin
    const forms = await db.getFormsByAdmin(walletAddress);

    res.status(200).json({ forms });
  } catch (error) {
    console.error('Error fetching admin forms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 