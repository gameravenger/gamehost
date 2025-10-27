-- Add columns for tracking game end information
-- This migration adds fields to track how and when games end

-- Add columns to games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS end_reason VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ended_by UUID REFERENCES users(id) DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN games.end_reason IS 'Reason for game ending: manual_end, auto_ended, cancelled';
COMMENT ON COLUMN games.ended_at IS 'Timestamp when the game was ended';
COMMENT ON COLUMN games.ended_by IS 'User ID who ended the game (NULL for auto-ended games)';

-- Create index for better performance on queries
CREATE INDEX IF NOT EXISTS idx_games_status_date ON games(status, game_date);
CREATE INDEX IF NOT EXISTS idx_games_ended_at ON games(ended_at) WHERE ended_at IS NOT NULL;

-- Update existing ended games to have proper end_reason
UPDATE games 
SET end_reason = 'manual_end', ended_at = updated_at 
WHERE status = 'ended' AND end_reason IS NULL;