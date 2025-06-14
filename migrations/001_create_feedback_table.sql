-- Migration: Create feedback table with one feedback per wallet constraint
-- Description: Creates the feedback table to store anonymous user feedback linked to payments

CREATE TABLE IF NOT EXISTS feedback (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    feedback TEXT NOT NULL,                -- The feedback content
    category VARCHAR(50) NOT NULL,         -- 'dev', 'community', etc.
    wallet_address VARCHAR(42) NOT NULL,   -- Wallet that submitted feedback
    payment_hash VARCHAR(66) NOT NULL,     -- Reference to the payment that enabled this feedback
    is_anonymous BOOLEAN DEFAULT TRUE,     -- Track if feedback should be anonymous
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Add indexes for better query performance
    INDEX idx_wallet_address (wallet_address),
    INDEX idx_payment_hash (payment_hash),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at),
    
    -- Ensure only one feedback per wallet
    UNIQUE KEY unique_wallet_feedback (wallet_address),
    
    -- Add foreign key constraint to link with payments table
    FOREIGN KEY (payment_hash) REFERENCES payments(payment_hash) ON DELETE CASCADE
);

-- Add constraints
ALTER TABLE feedback 
ADD CONSTRAINT chk_category CHECK (category IN ('dev', 'community')),
ADD CONSTRAINT chk_feedback_length CHECK (CHAR_LENGTH(feedback) <= 1000);

-- Add comment to document the table
ALTER TABLE feedback COMMENT = 'Stores anonymous feedback submissions from users who have made verified payments. One feedback per wallet allowed.'; 