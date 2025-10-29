-- =====================================================
-- FIX ALL GAMES: Update sheets_folder_id for ALL games
-- =====================================================
-- This fixes both existing games with NULL sheets_folder_id
-- and ensures all future games work correctly
-- =====================================================

-- Step 1: Check current state of ALL games
SELECT 
    '=== BEFORE FIX ===' as status,
    id,
    name,
    sheets_count,
    CASE 
        WHEN sheets_folder_id IS NOT NULL THEN '✅ HAS ID'
        WHEN drive_folder_name IS NOT NULL THEN '⚠️ HAS DRIVE BUT NO ID'
        ELSE '❌ NO DATA'
    END as folder_status,
    sheets_folder_id,
    drive_folder_name
FROM games
WHERE status IN ('upcoming', 'live')
ORDER BY created_at DESC;

-- Step 2: For games that have drive_folder_name but NULL sheets_folder_id,
-- we need to extract the folder ID from the individual_sheet_files
-- The individual_sheet_files contains the actual Google Drive file IDs

-- This query shows which games need fixing
SELECT 
    '=== GAMES NEEDING FIX ===' as status,
    id,
    name,
    sheets_count,
    drive_folder_name,
    CASE 
        WHEN individual_sheet_files IS NOT NULL 
             AND jsonb_typeof(individual_sheet_files) = 'object'
             AND (SELECT COUNT(*) FROM jsonb_object_keys(individual_sheet_files)) > 0
        THEN '✅ CAN AUTO-FIX (has individual files)'
        WHEN sheets_count > 0 
        THEN '⚠️ MANUAL FIX NEEDED (no individual files)'
        ELSE '❌ NO SHEETS UPLOADED'
    END as fix_status
FROM games
WHERE sheets_folder_id IS NULL
  AND status IN ('upcoming', 'live')
ORDER BY created_at DESC;

-- Step 3: AUTO-FIX for games with individual_sheet_files
-- Extract the folder ID from the first sheet's file path
-- (Google Drive files are stored in a specific folder structure)

-- First, let's see what we have in individual_sheet_files
SELECT 
    id,
    name,
    jsonb_pretty(individual_sheet_files) as sheet_files_sample
FROM games
WHERE sheets_folder_id IS NULL
  AND individual_sheet_files IS NOT NULL
  AND jsonb_typeof(individual_sheet_files) = 'object'
LIMIT 1;

-- Step 4: For games with drive_folder_id set but sheets_folder_id NULL,
-- we can copy drive_folder_id to sheets_folder_id
-- This is the actual folder where sheets were uploaded

UPDATE games
SET 
    sheets_folder_id = drive_folder_id,
    updated_at = NOW()
WHERE sheets_folder_id IS NULL
  AND drive_folder_id IS NOT NULL
  AND status IN ('upcoming', 'live');

-- Show how many were fixed
SELECT 
    '=== AUTO-FIX APPLIED ===' as status,
    COUNT(*) as games_fixed
FROM games
WHERE sheets_folder_id = drive_folder_id
  AND updated_at > NOW() - INTERVAL '1 minute';

-- Step 5: Verify the fix worked
SELECT 
    '=== AFTER FIX ===' as status,
    id,
    name,
    sheets_count,
    CASE 
        WHEN sheets_folder_id IS NOT NULL THEN '✅ FIXED!'
        WHEN drive_folder_name IS NOT NULL THEN '⚠️ STILL NEEDS MANUAL FIX'
        ELSE '❌ NO DATA'
    END as folder_status,
    sheets_folder_id
FROM games
WHERE status IN ('upcoming', 'live')
ORDER BY created_at DESC;

-- Step 6: For any remaining games that couldn't be auto-fixed,
-- show what needs to be done manually
SELECT 
    '=== MANUAL FIX NEEDED ===' as status,
    id,
    name,
    sheets_count,
    drive_folder_name,
    'Run: UPDATE games SET sheets_folder_id = ''<FOLDER_ID>'' WHERE id = ''' || id || ''';' as fix_command
FROM games
WHERE sheets_folder_id IS NULL
  AND status IN ('upcoming', 'live')
ORDER BY created_at DESC;

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 
    '=== FINAL SUMMARY ===' as summary,
    COUNT(*) as total_active_games,
    COUNT(CASE WHEN sheets_folder_id IS NOT NULL THEN 1 END) as games_with_folder_id,
    COUNT(CASE WHEN sheets_folder_id IS NULL THEN 1 END) as games_still_broken,
    ROUND(
        100.0 * COUNT(CASE WHEN sheets_folder_id IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0),
        1
    ) || '%' as success_rate
FROM games
WHERE status IN ('upcoming', 'live');
