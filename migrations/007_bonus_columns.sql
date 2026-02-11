-- Add Bonus Columns for KYC Reward
ALTER TABLE users ADD COLUMN bonus REAL DEFAULT 0;
ALTER TABLE users ADD COLUMN kyc_bonus_claimed INTEGER DEFAULT 0;
