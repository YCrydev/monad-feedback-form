import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      name, 
      slug, 
      title, 
      description, 
      paymentAmount, 
      adminWalletAddress, 
      questions 
    } = req.body;

    if (!name || !slug || !title || !paymentAmount || !adminWalletAddress || !questions) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user is admin
    const isAdmin = await db.isAdmin(adminWalletAddress);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }

    // Check if slug already exists
    const existingForm = await db.getFormBySlug(slug);
    if (existingForm) {
      return res.status(409).json({ error: 'Form slug already exists. Please choose a different one.' });
    }

    // Validate questions
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'At least one question is required' });
    }

    // Create form
    const form = await db.createForm({
      name,
      slug,
      title,
      description,
      paymentAmount,
      adminWalletAddress
    });

    // Create questions
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      if (!question.questionText) {
        continue; // Skip empty questions
      }

      await db.createFormQuestion({
        formId: form.id,
        questionText: question.questionText,
        questionType: question.questionType || 'text',
        questionOptions: question.questionOptions || null,
        isRequired: question.isRequired || false,
        orderIndex: question.orderIndex || i
      });
    }

    res.status(201).json({ 
      message: 'Form created successfully',
      form: {
        id: form.id,
        name: form.name,
        slug: form.slug,
        title: form.title,
        description: form.description,
        paymentAmount: form.payment_amount,
        createdAt: form.created_at
      }
    });
  } catch (error) {
    console.error('Error creating form:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 