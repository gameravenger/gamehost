-- Add individual sheet files support to games table
-- This allows storing individual Google Drive file IDs for each sheet
-- instead of exposing the entire folder

-- Add column for individual sheet file mappings
ALTER TABLE games 
ADD COLUMN individual_sheet_files JSONB DEFAULT '{}';

-- Add comment explaining the structure
COMMENT ON COLUMN games.individual_sheet_files IS 'JSON object mapping sheet numbers to individual Google Drive file IDs. Format: {"1": "file_id_1", "2": "file_id_2", ...}';

-- Example of how the data should look:
-- individual_sheet_files: {
--   "1": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
--   "2": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upmt",
--   "3": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upmu"
-- }

-- This ensures each sheet has its own file ID and users cannot access other sheets