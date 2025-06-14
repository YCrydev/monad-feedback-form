# Monad Feedback System

## Overview

The Monad Feedback System allows users to submit anonymous feedback after making a verified payment on the Monad testnet. This ensures feedback quality while maintaining user privacy. **Each wallet can only submit one feedback to prevent spam and ensure fair participation.**

## Database Schema

### Feedback Table

```sql
CREATE TABLE feedback (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    feedback TEXT NOT NULL,                -- The feedback content (max 1000 chars)
    category VARCHAR(50) NOT NULL,         -- 'dev' or 'community'
    wallet_address VARCHAR(42) NOT NULL,   -- Wallet that submitted feedback
    payment_hash VARCHAR(66) NOT NULL,     -- Reference to the payment that enabled this feedback
    is_anonymous BOOLEAN DEFAULT TRUE,     -- Track if feedback should be anonymous
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one feedback per wallet
    UNIQUE KEY unique_wallet_feedback (wallet_address)
);
```

### Relationships

- `payment_hash` references `payments.payment_hash` (foreign key)
- Each feedback entry is linked to a confirmed payment
- Wallet addresses are stored for verification but feedback is marked as anonymous
- **UNIQUE constraint on `wallet_address` ensures only one feedback per wallet**

## API Endpoints

### POST /api/submit-feedback

Submits new feedback to the database.

**Request Body:**
```json
{
  "feedback": "string (max 1000 chars)",
  "category": "dev | community",
  "walletAddress": "0x..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "feedbackId": 123,
  "message": "Feedback submitted successfully"
}
```

**Response (Error - Already Submitted):**
```json
{
  "error": "You have already submitted feedback. Only one feedback submission per wallet is allowed."
}
```

**Response (Other Errors):**
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

### POST /api/check-feedback-status

Checks if a wallet has already submitted feedback.

**Request Body:**
```json
{
  "walletAddress": "0x..."
}
```

**Response:**
```json
{
  "hasSubmittedFeedback": true,
  "feedbackId": 123,
  "submittedAt": "2023-12-01T10:30:00Z"
}
```

## Validation Rules

1. **Payment Verification**: User must have a confirmed payment on record
2. **One Feedback Per Wallet**: Each wallet address can only submit one feedback (enforced at database and API level)
3. **Category Validation**: Only 'dev' and 'community' categories allowed
4. **Length Limit**: Feedback text limited to 1000 characters
5. **Required Fields**: feedback, category, and walletAddress are required

## Privacy Features

- All feedback is marked as `is_anonymous: true`
- While wallet addresses are stored for payment verification, the feedback content is not directly linked to user identity in the application
- Feedback IDs are provided for confirmation but don't reveal user identity
- One feedback per wallet prevents spam while maintaining anonymity

## Database Functions

### `db.createFeedback(feedbackData)`

Creates a new feedback record with payment verification and duplicate checking.

**Parameters:**
```typescript
{
  feedback: string;
  category: string;
  walletAddress: string;
  paymentHash: string;
  isAnonymous?: boolean; // defaults to true
}
```

### `db.hasWalletSubmittedFeedback(walletAddress)`

Checks if a wallet address has already submitted feedback.

**Returns:** `boolean`

### `db.getFeedbackByWallet(walletAddress)`

Retrieves existing feedback for a wallet address.

**Returns:** `Feedback | null`

### `db.getConfirmedPaymentForWallet(walletAddress)`

Retrieves the most recent confirmed payment for a wallet address.

## Frontend Integration

The frontend handles the one-feedback-per-wallet rule by:

1. Checking feedback status on wallet connection
2. Showing appropriate UI states (already submitted, can submit, payment required)
3. Disabling form when feedback already submitted
4. Handling API errors gracefully
5. Providing clear feedback to users about their submission status

## Security Considerations

- Payment verification prevents spam
- One feedback per wallet prevents multiple submissions
- Input validation prevents injection attacks
- Anonymous storage protects user privacy
- Database constraints ensure data integrity
- Rate limiting can be added at the API level if needed

## Migration

Run the migration script to create the feedback table:

```sql
-- See migrations/001_create_feedback_table.sql
```

## Testing

To test the feedback system:

1. Connect a wallet with confirmed payment
2. Fill out feedback form and submit
3. Verify feedback is stored in database
4. Try to submit again - should be prevented
5. Check that appropriate UI states are shown

## Error Handling

The system handles these scenarios:
- Wallet not connected
- No confirmed payment
- Already submitted feedback (409 status code)
- Invalid input data
- Database connection issues
- Network errors

## Monitoring

Consider monitoring:
- Feedback submission rates
- Duplicate submission attempts
- Error rates in submission
- Payment verification failures
- Database performance on feedback queries
- Unique wallet participation rates 