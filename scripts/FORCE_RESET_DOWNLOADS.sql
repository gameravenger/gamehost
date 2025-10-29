-- FORCE RESET ALL DOWNLOADS FOR THIS USER
-- This will reset ALL participations for user 1d7c48d2-6ddf-441e-a08d-bd5c445159da

-- Step 1: Show what we're going to reset
SELECT 
    id,
    game_id,
    selected_sheet_numbers,
    downloaded_sheet_numbers,
    payment_status
FROM game_participants
WHERE user_id = '1d7c48d2-6ddf-441e-a08d-bd5c445159da'
AND payment_status = 'approved';

-- Step 2: FORCE RESET
UPDATE game_participants
SET 
    downloaded_sheet_numbers = ARRAY[]::integer[],
    sheets_downloaded = false,
    updated_at = NOW()
WHERE user_id = '1d7c48d2-6ddf-441e-a08d-bd5c445159da'
AND payment_status = 'approved';

-- Step 3: Verify it worked
SELECT 
    id,
    game_id,
    selected_sheet_numbers,
    downloaded_sheet_numbers,
    sheets_downloaded
FROM game_participants
WHERE user_id = '1d7c48d2-6ddf-441e-a08d-bd5c445159da'
AND payment_status = 'approved';
