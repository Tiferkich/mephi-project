-- Add encrypted_title column to password_entries table
ALTER TABLE password_entries ADD COLUMN encrypted_title TEXT NOT NULL DEFAULT '';

-- Update existing records to have empty encrypted title
UPDATE password_entries SET encrypted_title = '' WHERE encrypted_title IS NULL; 