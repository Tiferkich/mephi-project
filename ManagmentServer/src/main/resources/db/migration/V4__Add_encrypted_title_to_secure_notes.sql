-- Add encrypted_title column to secure_notes table
ALTER TABLE secure_notes ADD COLUMN encrypted_title TEXT NOT NULL DEFAULT '';

-- Update existing records to have empty encrypted title
UPDATE secure_notes SET encrypted_title = '' WHERE encrypted_title IS NULL; 