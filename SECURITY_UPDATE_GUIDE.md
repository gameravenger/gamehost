# Security Update Guide - Individual Sheet Download Tracking

## Critical Database Changes Required

To enable individual sheet download tracking and prevent unauthorized downloads, you need to add a new column to track which specific sheets each user has downloaded.

### Step 1: Connect to Your Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the following SQL commands:

```sql
-- Add individual sheet download tracking column
ALTER TABLE game_participants 
ADD COLUMN IF NOT EXISTS downloaded_sheet_numbers INTEGER[] DEFAULT '{}';

-- Add comment to explain the column
COMMENT ON COLUMN game_participants.downloaded_sheet_numbers IS 'Array of sheet numbers that have been downloaded by this participant';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_game_participants_downloaded_sheets 
ON game_participants USING GIN (downloaded_sheet_numbers);
```

### Step 2: Verify the Changes

Run this query to confirm the column was added:

```sql
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'game_participants' 
AND column_name IN ('downloaded_sheet_numbers', 'selected_sheet_numbers', 'sheets_downloaded');
```

You should see all three columns listed.

### Step 3: Test the Security Features

1. Try downloading sheets - each sheet should only be downloadable once
2. Check that users can only download their purchased sheets
3. Verify that download attempts are logged in the server console

## What This Security Update Enables

### 🔒 **Individual Sheet Tracking**
- Each sheet download is tracked separately
- Users cannot download the same sheet twice
- System knows exactly which sheets have been downloaded

### 🛡️ **Enhanced Authorization**
- Server validates every download request
- Users can only download sheets they've purchased
- Unauthorized attempts are logged and blocked

### 📊 **Granular Download Status**
- Track which specific sheets are downloaded vs pending
- Better user experience with accurate download status
- Organizers can see detailed download analytics

### 🚨 **Security Logging**
- All download attempts are logged with user details
- Unauthorized access attempts are flagged
- Comprehensive audit trail for security monitoring

## Security Features Implemented

### ✅ **Server-Side Validation**
- Every download request verified against purchased sheets
- Double-download prevention
- User authorization checks

### ✅ **Individual Sheet URLs**
- Each sheet gets its own secure download URL
- No more folder access (except as controlled fallback)
- Granular permission system

### ✅ **Download Tracking**
- `downloaded_sheet_numbers` array tracks individual sheets
- `sheets_downloaded` boolean for overall participation status
- Automatic status updates when all sheets downloaded

### ✅ **Enhanced User Interface**
- Clear security notices in download modal
- Individual sheet download buttons
- Progress tracking for remaining downloads

## Important Notes

- **Backward Compatibility**: Existing participations will work with empty `downloaded_sheet_numbers` arrays
- **Performance**: GIN index ensures fast queries on sheet arrays
- **Security**: Multiple layers of validation prevent unauthorized access
- **Logging**: All security events are logged for monitoring

## Testing Checklist

After applying the database changes:

- [ ] Users can download their purchased sheets
- [ ] Users cannot download sheets they haven't purchased
- [ ] Users cannot download the same sheet twice
- [ ] Download modal shows security information
- [ ] Server logs show download attempts
- [ ] Unauthorized attempts are blocked and logged

This update significantly enhances the security of the sheet download system!