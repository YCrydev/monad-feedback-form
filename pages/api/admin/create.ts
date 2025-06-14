import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress, paymentHash, amount } = req.body;

    if (!walletAddress || !paymentHash || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if admin already exists
    const isAlreadyAdmin = await db.isAdmin(walletAddress);
    if (isAlreadyAdmin) {
      return res.status(409).json({ error: 'Wallet is already an admin' });
    }

    // Create admin record
    const admin = await db.createAdmin({
      walletAddress,
      paymentHash,
      amount,
      status: 'confirmed'
    });

    res.status(201).json({ 
      message: 'Admin created successfully',
      admin: {
        id: admin.id,
        walletAddress: admin.wallet_address,
        createdAt: admin.created_at
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 