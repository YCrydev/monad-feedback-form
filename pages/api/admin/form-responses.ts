import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/database';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { formId, walletAddress } = req.body;

  if (!formId || !walletAddress) {
    return res.status(400).json({ error: 'Form ID and wallet address are required' });
  }

  try {
    // First verify that the wallet address is an admin and owns this form
    const isAdmin = await db.isAdmin(walletAddress);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin status required.' });
    }

    // Get the form to verify ownership
    const forms = await db.getFormsByAdmin(walletAddress);
    const targetForm = forms.find(form => form.id === parseInt(formId));
    
    if (!targetForm) {
      return res.status(404).json({ error: 'Form not found or you do not have access to it' });
    }

    // Get form responses
    const responses = await db.getFormResponses(parseInt(formId));
    
    // Get form questions for context
    const questions = await db.getFormQuestions(parseInt(formId));

    return res.status(200).json({
      success: true,
      form: targetForm,
      questions,
      responses,
      total: responses.length
    });

  } catch (error) {
    console.error('Error fetching form responses:', error);
    res.status(500).json({ 
      error: 'Failed to fetch form responses',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 