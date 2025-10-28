-- Add individual sheet download tracking to game_participants table
-- This enables tracking which specific sheets each user has downloaded

-- Add column to track downloaded sheet numbers for each participation
ALTER TABLE game_participants 
ADD COLUMN IF NOT EXISTS downloaded_sheet_numbers INTEGER[] DEFAULT '{}';

-- Add comment to explain the column
COMMENT ON COLUMN game_participants.downloaded_sheet_numbers IS 'Array of sheet numbers that have been downloaded by this participant';

-- Create index for better performance on downloaded sheets queries
CREATE INDEX IF NOT EXISTS idx_game_participants_downloaded_sheets 
ON game_participants USING GIN (downloaded_sheet_numbers);

-- Verify the changes
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'game_participants' 
AND column_name IN ('downloaded_sheet_numbers', 'selected_sheet_numbers', 'sheets_downloaded');

-- Note: This change enables individual sheet download tracking
-- The system can now prevent duplicate downloads of specific sheets
-- and provide granular download status for each sheet