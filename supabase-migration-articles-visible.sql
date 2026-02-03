-- Add articles_visible column to settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS articles_visible BOOLEAN DEFAULT false;

-- Set default value for existing row (id = 1)
UPDATE settings
SET articles_visible = false
WHERE id = 1 AND articles_visible IS NULL;
