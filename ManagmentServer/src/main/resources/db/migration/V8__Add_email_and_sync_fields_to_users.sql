-- Add email and sync-related fields to users table

-- Add email field
ALTER TABLE users ADD COLUMN email VARCHAR(255);
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Add OTP fields for email verification and password recovery
ALTER TABLE users ADD COLUMN otp_code VARCHAR(10);
ALTER TABLE users ADD COLUMN otp_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN otp_type VARCHAR(50);

-- Add transfer token fields for device migration
ALTER TABLE users ADD COLUMN transfer_token VARCHAR(255);
ALTER TABLE users ADD COLUMN transfer_token_expires_at TIMESTAMP;

-- Add local user ID for sync mapping
ALTER TABLE users ADD COLUMN local_user_id VARCHAR(36);

-- Create unique index on email (allow nulls for existing users)
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Create index on local_user_id for sync lookups
CREATE INDEX idx_users_local_user_id ON users(local_user_id) WHERE local_user_id IS NOT NULL; 