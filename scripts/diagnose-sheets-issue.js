const { supabaseAdmin } = require('../config/database');

async function diagnoseIssue() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 DIAGNOSING GAME SHEETS DOWNLOAD ISSUE');
  console.log('='.repeat(70));

  try {
    // Check recent games
    const { data: games, error } = await supabaseAdmin
      .from('games')
      .select('id, name, status, sheets_folder_id, sheets_count, sheets_uploaded, individual_sheet_files, drive_folder_id, drive_folder_name')
      .in('status', ['upcoming', 'live'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Database query error:', error);
      return;
    }

    if (!games || games.length === 0) {
      console.log('⚠️ No active games found');
      return;
    }

    console.log(`\n📊 Found ${games.length} active game(s):\n`);

    games.forEach((game, index) => {
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`Game ${index + 1}: ${game.name}`);
      console.log(`${'─'.repeat(70)}`);
      console.log(`ID: ${game.id}`);
      console.log(`Status: ${game.status}`);
      console.log(`\nCRITICAL FIELDS FOR DOWNLOAD:`);
      console.log(`  sheets_folder_id: ${game.sheets_folder_id ? '✅ ' + game.sheets_folder_id : '❌ NULL - PROBLEM!'}`);
      console.log(`  sheets_count: ${game.sheets_count || 0}`);
      console.log(`  sheets_uploaded: ${game.sheets_uploaded ? '✅ true' : '❌ false'}`);
      console.log(`\nGOOGLE DRIVE INFO:`);
      console.log(`  drive_folder_id: ${game.drive_folder_id || 'NULL'}`);
      console.log(`  drive_folder_name: ${game.drive_folder_name || 'NULL'}`);
      console.log(`\nINDIVIDUAL SHEET FILES:`);
      
      if (game.individual_sheet_files) {
        const fileCount = Object.keys(game.individual_sheet_files).length;
        if (fileCount > 0) {
          console.log(`  ✅ Has ${fileCount} individual file mappings`);
          console.log(`  Sheet numbers: ${Object.keys(game.individual_sheet_files).slice(0, 10).join(', ')}${fileCount > 10 ? '...' : ''}`);
        } else {
          console.log(`  ❌ Empty object {} - PROBLEM!`);
        }
      } else {
        console.log(`  ❌ Column doesn't exist or NULL - PROBLEM!`);
      }

      console.log(`\n🎯 DIAGNOSIS:`);
      if (!game.sheets_folder_id) {
        console.log(`  ⚠️  sheets_folder_id is NULL - This is why download fails!`);
        console.log(`  💡 SOLUTION: Re-upload your game sheets`);
      } else if (!game.individual_sheet_files || Object.keys(game.individual_sheet_files).length === 0) {
        console.log(`  ⚠️  individual_sheet_files is empty - Downloads will be blocked for security`);
        console.log(`  💡 SOLUTION: Re-upload sheets OR use auto-scan endpoint`);
      } else {
        console.log(`  ✅ All data looks good - download should work!`);
        console.log(`  💡 If still failing, check user's participation status (must be approved)`);
      }
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ DIAGNOSIS COMPLETE');
    console.log('='.repeat(70) + '\n');

  } catch (err) {
    console.error('💥 Error during diagnosis:', err);
  }
}

diagnoseIssue().then(() => process.exit(0));
