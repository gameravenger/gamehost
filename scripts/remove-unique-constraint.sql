-- Remove unique constraint to allow multiple sheet purchases for same game
-- This allows users to buy additional sheets for the same game

-- Drop the unique constraint
ALTER TABLE game_participants DROP CONSTRAINT IF EXISTS game_participants_game_id_user_id_key;

-- Verify the constraint is removed
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'game_participants'::regclass 
AND contype = 'u';

-- Note: This change allows users to make multiple purchases for the same game
-- The application logic will prevent duplicate sheet selections