import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress, formId, paymentAmount } = req.body;

    if (!walletAddress || !formId || !paymentAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if wallet has made payment for this specific form
    const paymentStatus = await db.checkFormPaymentStatus(walletAddress, formId);
    
    // Check if payment exists and meets the minimum amount required
    const hasPayment = paymentStatus.hasPayment && paymentStatus.lastPayment && 
                      parseFloat(paymentStatus.lastPayment.amount) >= parseFloat(paymentAmount);

    res.status(200).json({ hasPayment });
  } catch (error) {
    console.error('Error checking form payment status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 