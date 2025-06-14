import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../lib/database';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category, anonymous, page = '1', limit = '20' } = req.query;
    
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const offset = (pageNum - 1) * limitNum;

    const filters: any = {
      limit: limitNum,
      offset: offset
    };

    if (category && category !== 'all') {
      filters.category = category as string;
    }

    if (anonymous !== undefined && anonymous !== 'all') {
      filters.isAnonymous = anonymous === 'true';
    }

    const result = await db.getAllFeedback(filters);

    return res.status(200).json({
      success: true,
      responses: result.feedback,
      total: result.total,
      page: pageNum,
      totalPages: Math.ceil(result.total / limitNum),
      hasNext: offset + limitNum < result.total,
      hasPrev: pageNum > 1
    });

  } catch (error) {
    console.error('Error fetching responses:', error);
    res.status(500).json({ 
      error: 'Failed to fetch responses',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 