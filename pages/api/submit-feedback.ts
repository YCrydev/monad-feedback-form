import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../lib/database';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { feedback, category, walletAddress, isAnonymous } = req.body;

  // Validate required fields
  if (!feedback || !category || !walletAddress) {
    return res.status(400).json({ 
      error: 'Feedback, category, and wallet address are required' 
    });
  }

  // Validate category
  const allowedCategories = ['dev', 'community'];
  if (!allowedCategories.includes(category)) {
    return res.status(400).json({ 
      error: 'Invalid category. Must be one of: ' + allowedCategories.join(', ') 
    });
  }

  // Validate feedback length
  if (feedback.length > 1000) {
    return res.status(400).json({ 
      error: 'Feedback must be 1000 characters or less' 
    });
  }

  try {
    // Check if wallet has already submitted feedback
    const hasAlreadySubmitted = await db.hasWalletSubmittedFeedback(walletAddress);
    
    if (hasAlreadySubmitted) {
      return res.status(409).json({ 
        error: 'You have already submitted feedback. Only one feedback submission per wallet is allowed.' 
      });
    }

    // Check if wallet has a confirmed payment
    const confirmedPayment = await db.getConfirmedPaymentForWallet(walletAddress);
    
    if (!confirmedPayment) {
      return res.status(403).json({ 
        error: 'No confirmed payment found for this wallet. Payment required to submit feedback.' 
      });
    }

    // Create feedback record
    const createdFeedback = await db.createFeedback({
      feedback: feedback.trim(),
      category,
      walletAddress,
      paymentHash: confirmedPayment.payment_hash,
      isAnonymous: isAnonymous !== undefined ? isAnonymous : true // Default to anonymous if not specified
    });

    return res.status(201).json({ 
      success: true, 
      feedbackId: createdFeedback.id,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ 
      error: 'Failed to submit feedback',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 