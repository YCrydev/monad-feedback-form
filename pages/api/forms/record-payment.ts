import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/database';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { paymentHash, walletAddress, amount, formId, status, blockNumber, gasUsed } = req.body;

  if (!paymentHash || !walletAddress || !amount || !formId) {
    return res.status(400).json({ error: 'Payment hash, wallet address, amount, and form ID are required' });
  }

  try {
    // Check if payment already exists
    const existingPayment = await db.findPaymentByHash(paymentHash);

    if (existingPayment) {
      // Payment already exists, update it
      const updatedPayment = await db.updatePayment(paymentHash, {
        status,
        blockNumber,
        gasUsed
      });

      return res.status(200).json({ 
        success: true, 
        payment: updatedPayment,
        action: 'updated'
      });
    } else {
      // Create new payment record with form ID
      const createdPayment = await db.createPayment({
        paymentHash,
        walletAddress,
        amount,
        status: status || 'pending',
        blockNumber,
        gasUsed,
        formId
      });

      return res.status(201).json({ 
        success: true, 
        payment: createdPayment,
        action: 'created'
      });
    }

  } catch (error) {
    console.error('Error recording form payment:', error);
    res.status(500).json({ 
      error: 'Failed to record payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 