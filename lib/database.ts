import { Pool } from 'pg';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Types for our database tables
export interface Payment {
  payment_hash: string;
  wallet_address: string;
  amount: string;
  status: 'pending' | 'confirmed' | 'failed';
  block_number?: number;
  gas_used?: number;
  form_id?: number;
  created_at: string;
  confirmed_at?: string;
}

export interface Feedback {
  id: number;
  feedback: string;
  category: string;
  wallet_address: string;
  payment_hash: string;
  is_anonymous: boolean;
  created_at: string;
}

// Admin interfaces
export interface Admin {
  id: number;
  wallet_address: string;
  payment_hash: string;
  amount: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Form {
  id: number;
  name: string;
  slug: string;
  title: string;
  description?: string;
  payment_amount: string;
  admin_wallet_address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormQuestion {
  id: number;
  form_id: number;
  question_text: string;
  question_type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox';
  question_options?: string[];
  is_required: boolean;
  order_index: number;
  created_at: string;
}

export interface FormResponse {
  id: number;
  form_id: number;
  response_data: Record<string, any>;
  wallet_address: string;
  payment_hash: string;
  submitted_at: string;
}

// Database query functions
export const db = {
  // Check if a wallet has any confirmed payments
  async checkPaymentStatus(walletAddress: string): Promise<{ hasPayment: boolean; paymentCount: number; lastPayment: Payment | null }> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM payments WHERE wallet_address = $1 AND status = $2 LIMIT 1',
        [walletAddress.toLowerCase(), 'confirmed']
      );
      
      const hasPayment = result.rows.length > 0;
      return {
        hasPayment,
        paymentCount: result.rows.length,
        lastPayment: hasPayment ? result.rows[0] : null
      };
    } finally {
      client.release();
    }
  },

  // Check if a wallet has made payment for a specific form
  async checkFormPaymentStatus(walletAddress: string, formId: number): Promise<{ hasPayment: boolean; paymentCount: number; lastPayment: Payment | null }> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM payments WHERE wallet_address = $1 AND form_id = $2 AND status = $3 ORDER BY confirmed_at DESC LIMIT 1',
        [walletAddress.toLowerCase(), formId, 'confirmed']
      );
      
      const hasPayment = result.rows.length > 0;
      return {
        hasPayment,
        paymentCount: result.rows.length,
        lastPayment: hasPayment ? result.rows[0] : null
      };
    } finally {
      client.release();
    }
  },

  // Check if a payment hash already exists
  async findPaymentByHash(paymentHash: string): Promise<Payment | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM payments WHERE payment_hash = $1',
        [paymentHash]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  },

  // Create a new payment record
  async createPayment(payment: {
    paymentHash: string;
    walletAddress: string;
    amount: string;
    status?: string;
    blockNumber?: number;
    gasUsed?: number;
    formId?: number;
  }): Promise<Payment> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO payments (payment_hash, wallet_address, amount, status, block_number, gas_used, form_id, confirmed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          payment.paymentHash,
          payment.walletAddress.toLowerCase(),
          payment.amount,
          payment.status || 'pending',
          payment.blockNumber || null,
          payment.gasUsed || null,
          payment.formId || null,
          payment.status === 'confirmed' ? new Date().toISOString() : null
        ]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  // Update an existing payment record
  async updatePayment(paymentHash: string, updates: {
    status?: string;
    blockNumber?: number;
    gasUsed?: number;
  }): Promise<Payment> {
    const client = await pool.connect();
    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.status !== undefined) {
        setParts.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      
      if (updates.blockNumber !== undefined) {
        setParts.push(`block_number = $${paramIndex++}`);
        values.push(updates.blockNumber);
      }
      
      if (updates.gasUsed !== undefined) {
        setParts.push(`gas_used = $${paramIndex++}`);
        values.push(updates.gasUsed);
      }

      if (updates.status === 'confirmed') {
        setParts.push(`confirmed_at = $${paramIndex++}`);
        values.push(new Date().toISOString());
      }

      values.push(paymentHash);

      const result = await client.query(
        `UPDATE payments SET ${setParts.join(', ')} WHERE payment_hash = $${paramIndex} RETURNING *`,
        values
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  // Create a new feedback record
  async createFeedback(feedbackData: {
    feedback: string;
    category: string;
    walletAddress: string;
    paymentHash: string;
    isAnonymous?: boolean;
  }): Promise<Feedback> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO feedback (feedback, category, wallet_address, payment_hash, is_anonymous)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          feedbackData.feedback,
          feedbackData.category,
          feedbackData.walletAddress.toLowerCase(),
          feedbackData.paymentHash,
          feedbackData.isAnonymous !== undefined ? feedbackData.isAnonymous : true
        ]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  // Get confirmed payment for a wallet (needed to reference in feedback)
  async getConfirmedPaymentForWallet(walletAddress: string): Promise<Payment | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM payments WHERE wallet_address = $1 AND status = $2 ORDER BY confirmed_at DESC LIMIT 1',
        [walletAddress.toLowerCase(), 'confirmed']
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  },

  // Check if wallet has already submitted feedback
  async hasWalletSubmittedFeedback(walletAddress: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id FROM feedback WHERE wallet_address = $1 LIMIT 1',
        [walletAddress.toLowerCase()]
      );
      
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  },

  // Get feedback by wallet address
  async getFeedbackByWallet(walletAddress: string): Promise<Feedback | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM feedback WHERE wallet_address = $1 LIMIT 1',
        [walletAddress.toLowerCase()]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  },

  // Admin functions
  async createAdmin(adminData: {
    walletAddress: string;
    paymentHash: string;
    amount: string;
    status?: string;
  }): Promise<Admin> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO admins (wallet_address, payment_hash, amount, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          adminData.walletAddress.toLowerCase(),
          adminData.paymentHash,
          adminData.amount,
          adminData.status || 'confirmed'
        ]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  async isAdmin(walletAddress: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id FROM admins WHERE wallet_address = $1 AND status = $2',
        [walletAddress.toLowerCase(), 'confirmed']
      );
      
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  },

  async createForm(formData: {
    name: string;
    slug: string;
    title: string;
    description?: string;
    paymentAmount: string;
    adminWalletAddress: string;
  }): Promise<Form> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO forms (name, slug, title, description, payment_amount, admin_wallet_address)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          formData.name,
          formData.slug,
          formData.title,
          formData.description || null,
          formData.paymentAmount,
          formData.adminWalletAddress.toLowerCase()
        ]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  async getFormBySlug(slug: string): Promise<Form | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM forms WHERE slug = $1 AND is_active = true',
        [slug]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  },

  async getFormsByAdmin(walletAddress: string): Promise<Form[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM forms WHERE admin_wallet_address = $1 ORDER BY created_at DESC',
        [walletAddress.toLowerCase()]
      );
      
      return result.rows;
    } finally {
      client.release();
    }
  },

  async createFormQuestion(questionData: {
    formId: number;
    questionText: string;
    questionType: string;
    questionOptions?: string[];
    isRequired: boolean;
    orderIndex: number;
  }): Promise<FormQuestion> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO form_questions (form_id, question_text, question_type, question_options, is_required, order_index)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          questionData.formId,
          questionData.questionText,
          questionData.questionType,
          questionData.questionOptions || null,
          questionData.isRequired,
          questionData.orderIndex
        ]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  async getFormQuestions(formId: number): Promise<FormQuestion[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM form_questions WHERE form_id = $1 ORDER BY order_index',
        [formId]
      );
      
      return result.rows;
    } finally {
      client.release();
    }
  },

  async createFormResponse(responseData: {
    formId: number;
    responseData: Record<string, any>;
    walletAddress: string;
    paymentHash: string;
  }): Promise<FormResponse> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO form_responses (form_id, response_data, wallet_address, payment_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          responseData.formId,
          JSON.stringify(responseData.responseData),
          responseData.walletAddress.toLowerCase(),
          responseData.paymentHash
        ]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  async hasWalletSubmittedToForm(formId: number, walletAddress: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id FROM form_responses WHERE form_id = $1 AND wallet_address = $2',
        [formId, walletAddress.toLowerCase()]
      );
      
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  },

  async getFormResponses(formId: number): Promise<FormResponse[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM form_responses WHERE form_id = $1 ORDER BY submitted_at DESC',
        [formId]
      );
      
      return result.rows;
    } finally {
      client.release();
    }
  },

  // Get all feedback with optional filtering
  async getAllFeedback(filters?: {
    category?: string;
    isAnonymous?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ feedback: Feedback[]; total: number }> {
    const client = await pool.connect();
    try {
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramCount = 0;

      if (filters?.category) {
        paramCount++;
        whereConditions.push(`category = $${paramCount}`);
        queryParams.push(filters.category);
      }

      if (filters?.isAnonymous !== undefined) {
        paramCount++;
        whereConditions.push(`is_anonymous = $${paramCount}`);
        queryParams.push(filters.isAnonymous);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM feedback ${whereClause}`,
        queryParams
      );
      const total = parseInt(countResult.rows[0].count);

      // Get feedback with limit and offset
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;
      
      paramCount++;
      queryParams.push(limit);
      paramCount++;
      queryParams.push(offset);

      const result = await client.query(
        `SELECT id, feedback, category, 
         CASE WHEN is_anonymous = false THEN wallet_address ELSE NULL END as wallet_address,
         is_anonymous, created_at 
         FROM feedback ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
        queryParams
      );
      
      return {
        feedback: result.rows,
        total
      };
    } finally {
      client.release();
    }
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  pool.end();
});

process.on('SIGTERM', () => {
  pool.end();
});