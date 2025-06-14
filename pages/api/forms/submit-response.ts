import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { formId, responses, walletAddress } = req.body;

    if (!formId || !responses || !walletAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if wallet has already submitted to this form
    const hasAlreadySubmitted = await db.hasWalletSubmittedToForm(formId, walletAddress);
    if (hasAlreadySubmitted) {
      return res.status(409).json({ error: 'You have already submitted a response to this form' });
    }

    // Check if wallet has made payment for this specific form
    const paymentStatus = await db.checkFormPaymentStatus(walletAddress, formId);
    if (!paymentStatus.hasPayment || !paymentStatus.lastPayment) {
      return res.status(403).json({ error: 'Payment required for this specific form to submit response' });
    }

    // Get form questions to validate
    const questions = await db.getFormQuestions(formId);
    if (questions.length === 0) {
      return res.status(404).json({ error: 'Form not found or has no questions' });
    }

    // Validate required fields
    const requiredQuestions = questions.filter(q => q.is_required);
    for (const question of requiredQuestions) {
      if (!responses[question.id] || (typeof responses[question.id] === 'string' && !responses[question.id].trim())) {
        return res.status(400).json({ error: `Missing required response for question: ${question.question_text}` });
      }
    }

    // Create form response
    const response = await db.createFormResponse({
      formId,
      responseData: responses,
      walletAddress,
      paymentHash: paymentStatus.lastPayment.payment_hash
    });

    res.status(201).json({ 
      message: 'Response submitted successfully',
      responseId: response.id,
      submittedAt: response.submitted_at
    });
  } catch (error) {
    console.error('Error submitting form response:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 