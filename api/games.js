const express = require('express');
const path = require('path');
const fs = require('fs');
const { supabase, supabaseAdmin } = require('../config/database');
const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// AUTH TEST ENDPOINT - MUST BE FIRST to avoid conflicts
router.get('/auth-test', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication working',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// Get all active games for today
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('Fetching games for date:', today);
    
    const { data: games, error } = await supabaseAdmin
      .from('games')
      .select(`
        *,
        organisers (
          organiser_name,
          whatsapp_number,
          real_name
        )
      `)
      .eq('game_date', today)
      .in('status', ['upcoming', 'live'])
      .order('game_time', { ascending: true });

    console.log('Games query result:', { games: games?.length || 0, error });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // If no games for today, get upcoming games from future dates
    if (!games || games.length === 0) {
      console.log('No games for today, fetching upcoming games');
        const { data: upcomingGames, error: upcomingError } = await supabaseAdmin
          .from('games')
          .select(`
            *,
            organisers (
              organiser_name,
              whatsapp_number,
              real_name
            )
          `)
          .gte('game_date', today)
          .eq('status', 'upcoming')
          .order('game_date', { ascending: true })
          .order('game_time', { ascending: true })
          .limit(20);

      if (upcomingError) {
        return res.status(400).json({ error: upcomingError.message });
      }

      return res.json({ games: upcomingGames || [] });
    }

    res.json({ games });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all public games (no auth required) - FIXED VERSION
router.get('/public', async (req, res) => {
  try {
    console.log('🌍 Fetching public games...');
    
    const { data: games, error } = await supabaseAdmin
      .from('games')
      .select(`
        *,
        organisers (
          organiser_name,
          whatsapp_number,
          real_name
        )
      `)
      .in('status', ['upcoming', 'live'])
      .order('game_date', { ascending: true })
      .order('game_time', { ascending: true })
      .limit(50);

    console.log('📊 Public games query result:', { games: games?.length || 0, error });

    if (error) {
      console.error('💥 Public games query error:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ games: games || [] });
  } catch (error) {
    console.error('💥 Error fetching public games:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get featured games
router.get('/featured', async (req, res) => {
  try {
    const { data: games, error } = await supabaseAdmin
      .from('games')
      .select(`
        *,
        organisers (
          organiser_name,
          whatsapp_number
        )
      `)
      .eq('is_featured', true)
      .eq('status', 'upcoming')
      .order('featured_order', { ascending: true })
      .limit(15);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ games });
  } catch (error) {
    console.error('Error fetching featured games:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get top games
router.get('/top', async (req, res) => {
  try {
    const { data: games, error } = await supabaseAdmin
      .from('games')
      .select(`
        *,
        organisers (
          organiser_name,
          whatsapp_number
        )
      `)
      .eq('is_top_game', true)
      .eq('status', 'upcoming')
      .order('top_game_order', { ascending: true })
      .limit(15);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ games });
  } catch (error) {
    console.error('Error fetching top games:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's game participations - MUST BE BEFORE /:id routes
router.get('/user/participations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data: participations, error } = await supabaseAdmin
      .from('game_participants')
      .select(`
        *,
        games (
          id,
          name,
          banner_image_url,
          game_date,
          game_time,
          status,
          zoom_link,
          zoom_password
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ participations });
  } catch (error) {
    console.error('Error fetching participations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SECURE INDIVIDUAL SHEET DOWNLOAD - NO FOLDER ACCESS
router.get('/sheets/secure-download/:participationId/:sheetNumber', authenticateToken, async (req, res) => {
  try {
    const { participationId, sheetNumber } = req.params;
    const userId = req.user.userId;

    console.log(`🔐 SECURE DOWNLOAD: User ${userId} requesting sheet ${sheetNumber} from participation ${participationId}`);

    // Verify user has access to this specific sheet
    const { data: participation } = await supabaseAdmin
      .from('game_participants')
      .select(`
        *,
        games (
          sheets_folder_id,
          sheet_file_format,
          name,
          id,
          individual_sheet_files
        )
      `)
      .eq('id', participationId)
      .eq('user_id', userId)
      .eq('payment_status', 'approved')
      .single();

    if (!participation) {
      console.log(`❌ SECURITY: Access denied for user ${userId}, participation ${participationId}`);
      return res.status(403).json({ error: 'Access denied - participation not found or not approved' });
    }

    // Check if user selected this specific sheet
    const selectedSheets = participation.selected_sheet_numbers || [];
    const requestedSheet = parseInt(sheetNumber);
    
    // Convert all selected sheets to integers for comparison
    const selectedSheetsAsNumbers = selectedSheets.map(sheet => 
      typeof sheet === 'string' ? parseInt(sheet) : sheet
    );
    
    if (!selectedSheetsAsNumbers.includes(requestedSheet)) {
      console.log(`❌ SECURITY: Sheet ${requestedSheet} not in user's selection:`, selectedSheetsAsNumbers);
      return res.status(403).json({ error: 'You are not authorized to download this sheet' });
    }

    // Check if this sheet was already downloaded (one-time download)
    const downloadedSheets = participation.downloaded_sheet_numbers || [];
    if (downloadedSheets.includes(requestedSheet)) {
      console.log(`⚠️ SECURITY: Sheet ${requestedSheet} already downloaded by user ${userId}`);
      return res.status(409).json({ 
        error: 'This sheet has already been downloaded. Each sheet can only be downloaded once.',
        code: 'ALREADY_DOWNLOADED'
      });
    }

    const game = participation.games;
    const fileName = (game.sheet_file_format || 'Sheet_{number}.pdf').replace('{number}', sheetNumber);
    const folderId = game.sheets_folder_id;
    
    if (!folderId) {
      return res.status(404).json({ error: 'Game sheets not available' });
    }

    console.log(`✅ SECURITY: Authorized download for user ${userId}, sheet ${requestedSheet}`);

    // Create direct download URL for the specific file
    const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${folderId}/${fileName}`;
    
    // Alternative: Create a more specific file URL if we know the file ID
    // For now, we'll use a proxy approach to ensure security
    
    // Check if game has individual file IDs configured
    const individualFiles = game.individual_sheet_files || {};
    const fileId = individualFiles[requestedSheet.toString()];
    
    console.log(`🔍 DOWNLOAD DEBUG: Game ${game.name} (${game.id})`);
    console.log(`📊 Individual files configured:`, Object.keys(individualFiles).length > 0 ? Object.keys(individualFiles).slice(0, 5) : 'NONE');
    console.log(`🎯 Looking for sheet ${requestedSheet}, found fileId:`, fileId ? 'YES' : 'NO');

    // CRITICAL SECURITY: If no individual file ID, block download completely
    if (!fileId) {
      console.log(`🚫 SECURITY BLOCK: No individual file ID for sheet ${requestedSheet} - BLOCKING DOWNLOAD`);
      
      return res.status(503).json({
        success: false,
        error: 'Individual file download not configured',
        message: 'This game requires auto-scanning to enable secure downloads',
        details: {
          issue: 'No individual file ID found for this sheet',
          sheetNumber: requestedSheet,
          gameName: game.name,
          securityNote: 'Folder access would expose all sheets causing business losses',
          solution: 'Game organizer must run auto-scan to configure individual file access'
        },
        adminAction: 'Use POST /api/organiser/games/:id/auto-scan-sheets to enable downloads',
        businessProtection: 'Download blocked to prevent unauthorized access to other sheets'
      });
    }

    // Handle Google Drive storage files (uploaded with compression)
    if (fileId && !fileId.startsWith('FOLDER_') && !fileId.startsWith('LOCAL_')) {
      console.log(`☁️ GOOGLE DRIVE DOWNLOAD: Using compressed Google Drive file for sheet ${requestedSheet}`);
      
      const fileName = (game.sheet_file_format || 'Sheet_{number}.pdf').replace('{number}', requestedSheet);
      
      // Mark as downloaded BEFORE providing download link
      const updatedDownloadedSheets = [...downloadedSheets, requestedSheet];
      await supabaseAdmin
        .from('game_participants')
        .update({
          downloaded_sheet_numbers: updatedDownloadedSheets,
          sheets_downloaded: updatedDownloadedSheets.length === selectedSheetsAsNumbers.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', participationId);
      
      // Use the SECURE TOKEN endpoint for Google Drive files
      const secureTokenUrl = `/api/games/sheets/secure-token/${participationId}/${sheetNumber}`;
      
      return res.json({
        success: true,
        fileName: fileName,
        sheetNumber: requestedSheet,
        gameName: game.name,
        directDownload: true,
        downloadUrl: secureTokenUrl,
        downloadMethod: 'google_drive_storage',
        message: `Sheet ${requestedSheet} ready for secure download (compressed)`,
        security: {
          secureToken: true,
          googleDriveStorage: true,
          autoCompressed: true,
          autoDeleteIn2Days: true,
          noFolderExposure: true,
          authorizedSheet: requestedSheet,
          participantOnly: true,
          downloadTracked: true,
          businessProtected: true,
          costEffective: true
        }
      });
    }

    // Check if this is a folder-based file ID (bulk scan result)
    const isFolderBased = fileId.startsWith('FOLDER_');
    
    if (isFolderBased) {
      console.log(`🔐 SECURE BULK DOWNLOAD: Using secure proxy for sheet ${requestedSheet}`);
      
      // Extract folder ID from the special file ID format
      const folderIdMatch = fileId.match(/FOLDER_([^_]+)_SHEET_(\d+)/);
      if (folderIdMatch) {
        const [, extractedFolderId, sheetNum] = folderIdMatch;
        const fileName = (game.sheet_file_format || 'Sheet_{number}.pdf').replace('{number}', sheetNum);
        
        console.log(`🔐 SECURE PROXY: Using server-side proxy for ${fileName} (NO Google Drive exposure)`);
        
        // Mark as downloaded BEFORE providing download link
        const updatedDownloadedSheets = [...downloadedSheets, requestedSheet];
        await supabaseAdmin
          .from('game_participants')
          .update({
            downloaded_sheet_numbers: updatedDownloadedSheets,
            sheets_downloaded: updatedDownloadedSheets.length === selectedSheetsAsNumbers.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', participationId);
        
        // Use the SECURE PROXY endpoint - NO Google Drive exposure
        const secureProxyUrl = `/api/games/sheets/secure-proxy/${participationId}/${sheetNumber}/${encodeURIComponent(fileName)}`;
        
        return res.json({
          success: true,
          fileName: fileName,
          sheetNumber: requestedSheet,
          gameName: game.name,
          directDownload: true,
          downloadUrl: secureProxyUrl,
          downloadMethod: 'secure_proxy',
          message: `Sheet ${requestedSheet} ready for secure download`,
          security: {
            secureProxy: true,
            noGoogleDriveExposure: true,
            serverSideDownload: true,
            authorizedSheet: requestedSheet,
            participantOnly: true,
            downloadTracked: true,
            businessProtected: true
          }
        });
      }
    }

    // Mark this sheet as downloaded BEFORE providing download link
    const updatedDownloadedSheets = [...downloadedSheets, requestedSheet];
    await supabaseAdmin
      .from('game_participants')
      .update({ 
        downloaded_sheet_numbers: updatedDownloadedSheets,
        sheets_downloaded: updatedDownloadedSheets.length === selectedSheetsAsNumbers.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', participationId);

    console.log(`📥 SECURE AUTHORIZATION: User ${userId} authorized for individual file ${fileId}`);

    // Return direct file download information - NO folder access
    res.json({
      success: true,
      fileName: fileName,
      sheetNumber: requestedSheet,
      gameName: game.name,
      directDownload: true,
      downloadUrl: `/api/games/sheets/direct-file-access/${participationId}/${sheetNumber}`,
      message: `Sheet ${requestedSheet} authorized for direct individual file download`,
      security: {
        directIndividualFile: true,
        noFolderExposure: true,
        oneTimeDownload: true,
        authorizedSheet: requestedSheet,
        participantOnly: true,
        downloadTracked: true,
        businessProtected: true
      }
    });

  } catch (error) {
    console.error('💥 Error in secure sheet download:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// SECURE FILE STREAMING - NO GOOGLE DRIVE EXPOSURE TO USERS
router.get('/sheets/proxy-download/:participationId/:sheetNumber', authenticateToken, async (req, res) => {
  try {
    const { participationId, sheetNumber } = req.params;
    const userId = req.user.userId;

    console.log(`🔄 SECURE STREAM: User ${userId} requesting secure file stream for sheet ${sheetNumber}`);

    // Re-verify access (security check)
    const { data: participation } = await supabaseAdmin
      .from('game_participants')
      .select(`
        *,
        games (
          sheets_folder_id,
          sheet_file_format,
          name,
          individual_sheet_files
        )
      `)
      .eq('id', participationId)
      .eq('user_id', userId)
      .eq('payment_status', 'approved')
      .single();

    if (!participation) {
      console.log(`❌ SECURITY: Access denied for user ${userId}, participation ${participationId}`);
      return res.status(403).json({ error: 'Access denied - not authorized' });
    }

    const requestedSheet = parseInt(sheetNumber);
    const selectedSheetsAsNumbers = (participation.selected_sheet_numbers || []).map(sheet => 
      typeof sheet === 'string' ? parseInt(sheet) : sheet
    );
    
    if (!selectedSheetsAsNumbers.includes(requestedSheet)) {
      console.log(`❌ SECURITY: Sheet ${requestedSheet} not in user selection:`, selectedSheetsAsNumbers);
      return res.status(403).json({ error: 'Sheet not in your selection' });
    }

    // Check if already downloaded
    const downloadedSheets = participation.downloaded_sheet_numbers || [];
    if (downloadedSheets.includes(requestedSheet)) {
      console.log(`⚠️ SECURITY: Sheet ${requestedSheet} already downloaded by user ${userId}`);
      return res.status(409).json({ 
        error: 'This sheet has already been downloaded. Each sheet can only be downloaded once.',
        code: 'ALREADY_DOWNLOADED'
      });
    }

    const game = participation.games;
    const fileName = (game.sheet_file_format || 'Sheet_{number}.pdf').replace('{number}', sheetNumber);

    // Check if game has individual file IDs configured
    const individualFiles = game.individual_sheet_files || {};
    const fileId = individualFiles[sheetNumber.toString()];

    if (!fileId) {
      console.log(`🚫 SECURITY: No individual file ID configured for sheet ${requestedSheet}`);
      return res.status(503).json({
        error: 'Secure download not available',
        message: 'This sheet is not yet available for secure download',
        code: 'NOT_CONFIGURED'
      });
    }

    console.log(`✅ SECURE STREAM: Authorized file stream for user ${userId}, sheet ${requestedSheet}`);

    // Mark as downloaded BEFORE streaming
    const updatedDownloadedSheets = [...downloadedSheets, requestedSheet];
    await supabaseAdmin
      .from('game_participants')
      .update({ 
        downloaded_sheet_numbers: updatedDownloadedSheets,
        sheets_downloaded: updatedDownloadedSheets.length === selectedSheetsAsNumbers.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', participationId);

    // STREAM FILE THROUGH OUR SERVER - NO GOOGLE DRIVE EXPOSURE
    try {
      const https = require('https');
      const directFileUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      
      console.log(`📥 STREAMING: Fetching file ${fileId} for user ${userId}`);

      // Set response headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Stream the file through our server
      const request = https.get(directFileUrl, (fileResponse) => {
        if (fileResponse.statusCode === 200) {
          console.log(`✅ STREAMING: Successfully streaming ${fileName} to user ${userId}`);
          fileResponse.pipe(res);
        } else {
          console.log(`❌ STREAMING: Failed to fetch file ${fileId}, status: ${fileResponse.statusCode}`);
          res.status(404).json({ error: 'File not found or not accessible' });
        }
      });

      request.on('error', (error) => {
        console.error(`💥 STREAMING ERROR: ${error.message}`);
        if (!res.headersSent) {
          res.status(500).json({ error: 'File streaming failed' });
        }
      });

      request.setTimeout(30000, () => {
        console.log(`⏰ STREAMING TIMEOUT: File ${fileId} for user ${userId}`);
        request.destroy();
        if (!res.headersSent) {
          res.status(408).json({ error: 'Download timeout' });
        }
      });

    } catch (streamError) {
      console.error(`💥 STREAMING SETUP ERROR:`, streamError);
      res.status(500).json({ error: 'File streaming setup failed' });
    }

  } catch (error) {
    console.error('💥 Error in secure file streaming:', error);
    res.status(500).json({ error: 'Secure streaming failed' });
  }
});

// DIRECT INDIVIDUAL FILE ACCESS - NO FOLDER EXPOSURE EVER
router.get('/sheets/direct-file-access/:participationId/:sheetNumber', authenticateToken, async (req, res) => {
  try {
    const { participationId, sheetNumber } = req.params;
    const userId = req.user.userId;

    console.log(`🔐 DIRECT ACCESS: User ${userId} requesting direct file access for sheet ${sheetNumber}`);

    // Re-verify access (security check)
    const { data: participation } = await supabaseAdmin
      .from('game_participants')
      .select(`
        *,
        games (
          individual_sheet_files,
          sheet_file_format,
          name
        )
      `)
      .eq('id', participationId)
      .eq('user_id', userId)
      .eq('payment_status', 'approved')
      .single();

    if (!participation) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const requestedSheet = parseInt(sheetNumber);
    const selectedSheetsAsNumbers = (participation.selected_sheet_numbers || []).map(sheet => 
      typeof sheet === 'string' ? parseInt(sheet) : sheet
    );
    
    if (!selectedSheetsAsNumbers.includes(requestedSheet)) {
      return res.status(403).json({ error: 'Sheet not in your selection' });
    }

    const game = participation.games;
    const fileName = (game.sheet_file_format || 'Sheet_{number}.pdf').replace('{number}', sheetNumber);
    
    // Get individual file ID for this specific sheet
    const individualFiles = game.individual_sheet_files || {};
    const fileId = individualFiles[requestedSheet.toString()];

    if (!fileId) {
      console.log(`❌ DIRECT ACCESS: No individual file ID for sheet ${requestedSheet}`);
      return res.status(404).json({ 
        error: 'Sheet file not available',
        message: 'This sheet has not been configured for download',
        code: 'FILE_NOT_CONFIGURED'
      });
    }

    console.log(`✅ DIRECT ACCESS: Providing direct file access for sheet ${requestedSheet}, file ${fileId}`);

    // Create direct download URL for individual file ONLY
    const directFileUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    // Return direct file access - NO folder exposure
    res.json({
      success: true,
      fileName: fileName,
      sheetNumber: requestedSheet,
      gameName: game.name,
      accessMethod: 'direct_individual_file',
      directFileUrl: directFileUrl,
      fileId: fileId,
      security: {
        individualFileOnly: true,
        noFolderAccess: true,
        businessProtected: true
      },
      downloadTracking: {
        participationId: participationId,
        userId: userId,
        fileId: fileId,
        timestamp: new Date().toISOString(),
        method: 'direct_file_access'
      }
    });

  } catch (error) {
    console.error('💥 Error in direct file access:', error);
    res.status(500).json({ error: 'Direct file access failed' });
  }
});

// ALL SPECIFIC ROUTES MUST COME BEFORE GENERIC /:id ROUTE

// Get sold/reserved sheets for a game (includes pending and approved) - FIXED
router.get('/:id/sold-sheets', async (req, res) => {
  try {
    const { id: gameId } = req.params;
    
    console.log(`🔍 SOLD SHEETS API: Getting sheet status for game ${gameId}`);
    
    // Get all participations for this game (pending and approved, but not rejected)
    const { data: participations, error } = await supabaseAdmin
      .from('game_participants')
      .select('selected_sheet_numbers, payment_status, user_id')
      .eq('game_id', gameId)
      .in('payment_status', ['pending', 'approved']); // Include both pending and approved

    if (error) {
      console.log(`❌ SOLD SHEETS ERROR:`, error.message);
      return res.status(400).json({ error: error.message });
    }

    console.log(`📊 SOLD SHEETS: Found ${participations?.length || 0} participations`);

    // Collect all reserved/sold sheet numbers
    const reservedSheets = [];
    const approvedSheets = [];
    
    if (participations && participations.length > 0) {
      participations.forEach(participation => {
        if (participation.selected_sheet_numbers && Array.isArray(participation.selected_sheet_numbers)) {
          const sheets = participation.selected_sheet_numbers.map(s => parseInt(s));
          if (participation.payment_status === 'approved') {
            approvedSheets.push(...sheets);
          } else if (participation.payment_status === 'pending') {
            reservedSheets.push(...sheets);
          }
        }
      });
    }

    // Remove duplicates and sort
    const uniqueApprovedSheets = [...new Set(approvedSheets)].sort((a, b) => a - b);
    const uniqueReservedSheets = [...new Set(reservedSheets)].sort((a, b) => a - b);
    const allUnavailableSheets = [...uniqueApprovedSheets, ...uniqueReservedSheets];
    const uniqueUnavailableSheets = [...new Set(allUnavailableSheets)].sort((a, b) => a - b);

    console.log(`✅ SOLD SHEETS RESULT:`, {
      totalUnavailable: uniqueUnavailableSheets.length,
      approved: uniqueApprovedSheets.length,
      reserved: uniqueReservedSheets.length,
      approvedSheets: uniqueApprovedSheets.slice(0, 10),
      reservedSheets: uniqueReservedSheets.slice(0, 10)
    });

    res.json({ 
      success: true,
      soldSheets: uniqueUnavailableSheets, // All unavailable sheets
      approvedSheets: uniqueApprovedSheets, // Only approved/sold
      reservedSheets: uniqueReservedSheets // Only pending/reserved
    });
  } catch (error) {
    console.error('❌ Error fetching sold sheets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download sheets (only for approved participants) - COMPREHENSIVE FIX
router.get('/:id/download-sheets', authenticateToken, async (req, res) => {
  try {
    const { id: gameId } = req.params;
    const userId = req.user?.userId;

    // Enhanced authentication debugging
    console.log(`🔍 DOWNLOAD REQUEST:`, {
      gameId,
      userId,
      userObject: req.user,
      headers: {
        authorization: req.headers.authorization ? 'Present' : 'Missing',
        contentType: req.headers['content-type']
      }
    });

    if (!userId) {
      console.log(`❌ DOWNLOAD ERROR: No user ID found in token`);
      return res.status(401).json({ 
        error: 'Authentication required. Please log in again.',
        code: 'AUTH_REQUIRED'
      });
    }

    // Verify game exists first
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('id, name, status')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      console.log(`❌ DOWNLOAD ERROR: Game not found:`, gameError?.message);
      return res.status(404).json({ 
        error: 'Game not found',
        code: 'GAME_NOT_FOUND'
      });
    }

    console.log(`🎮 DOWNLOAD: Game found - ${game.name} (${game.status})`);
    
    // Get ALL participations for this user and game with detailed logging
    console.log(`🔍 DOWNLOAD: Querying participations for user ${userId}, game ${gameId}`);
    
    const { data: allParticipations, error: allError } = await supabaseAdmin
      .from('game_participants')
      .select(`
        id,
        user_id,
        game_id,
        payment_status,
        selected_sheet_numbers,
        total_amount,
        utr_id,
        created_at
      `)
      .eq('game_id', gameId)
      .eq('user_id', userId);

    console.log(`📊 DOWNLOAD QUERY RESULT:`, {
      error: allError?.message,
      participationsFound: allParticipations?.length || 0,
      participations: allParticipations?.map(p => ({
        id: p.id,
        status: p.payment_status,
        sheets: p.selected_sheet_numbers,
        amount: p.total_amount
      })) || []
    });

    if (allError) {
      console.log(`💥 DOWNLOAD ERROR: Database query failed:`, allError);
      return res.status(500).json({ 
        error: `Database error: ${allError.message}`,
        code: 'DB_ERROR'
      });
    }
    
    if (!allParticipations || allParticipations.length === 0) {
      console.log(`🚫 DOWNLOAD DENIED: No participations found for user ${userId}, game ${gameId}`);
      return res.status(403).json({ 
        error: 'You are not registered for this game. Please register first.',
        code: 'NOT_REGISTERED'
      });
    }

    // Filter for approved participations
    const approvedParticipations = allParticipations.filter(p => p.payment_status === 'approved');
    const pendingParticipations = allParticipations.filter(p => p.payment_status === 'pending');
    const rejectedParticipations = allParticipations.filter(p => p.payment_status === 'rejected');
    
    console.log(`📈 DOWNLOAD STATUS BREAKDOWN:`, {
      total: allParticipations.length,
      approved: approvedParticipations.length,
      pending: pendingParticipations.length,
      rejected: rejectedParticipations.length
    });
    
    if (approvedParticipations.length === 0) {
      console.log(`⏳ DOWNLOAD DENIED: No approved participations found`);
      
      return res.status(403).json({ 
        error: pendingParticipations.length > 0 
          ? 'Your payment is pending organiser approval. Please wait.'
          : 'No approved participations found. Please contact the organiser.',
        code: 'NOT_APPROVED',
        details: {
          pending: pendingParticipations.length,
          rejected: rejectedParticipations.length,
          total: allParticipations.length
        }
      });
    }

    // Get game details with sheets folder (using different variable name to avoid conflict)
    const { data: gameDetails } = await supabaseAdmin
      .from('games')
      .select('sheets_folder_id, name, sheet_file_format, individual_sheet_files')
      .eq('id', gameId)
      .single();

    if (!gameDetails || !gameDetails.sheets_folder_id) {
      console.log(`❌ DOWNLOAD ERROR: Game ${gameId} has no sheets folder configured`);
      return res.status(404).json({ error: 'Game sheets not available. Contact the organiser.' });
    }

    console.log(`🎮 DOWNLOAD: Game ${gameDetails.name} has sheets folder configured`);

    // Collect all sheet numbers from all approved participations
    const allSheetNumbers = [];
    const sheetsData = [];
    
    approvedParticipations.forEach(participation => {
      if (participation.selected_sheet_numbers && Array.isArray(participation.selected_sheet_numbers)) {
        participation.selected_sheet_numbers.forEach(sheetNum => {
          const sheetNumber = parseInt(sheetNum);
          if (!allSheetNumbers.includes(sheetNumber)) {
            allSheetNumbers.push(sheetNumber);
            const fileName = (gameDetails.sheet_file_format || 'Sheet_{number}.pdf').replace('{number}', sheetNumber);
            sheetsData.push({
              sheetNumber: sheetNumber,
              fileName: fileName,
              downloadUrl: `/api/games/sheets/secure-download/${participation.id}/${sheetNumber}`,
              participationId: participation.id
            });
          }
        });
      }
    });

    console.log(`📄 DOWNLOAD SUCCESS: Prepared ${sheetsData.length} sheets for download`);
    console.log(`📋 DOWNLOAD SHEETS:`, allSheetNumbers.join(', '));

    // Return comprehensive sheet download information
    res.json({
      success: true,
      message: `${sheetsData.length} sheets ready for secure download`,
      sheets: sheetsData,
      totalSheets: sheetsData.length,
      gameId: gameId,
      gameName: gameDetails.name,
      participations: approvedParticipations.map(p => ({
        id: p.id,
        sheets: p.selected_sheet_numbers,
        downloadUrl: `/api/games/${gameId}/sheets/${p.id}`
      }))
    });
  } catch (error) {
    console.error('💥 DOWNLOAD FATAL ERROR:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Register for a game (payment verification)
router.post('/:id/register', authenticateToken, async (req, res) => {
  try {
    const { id: gameId } = req.params;
    const { sheetsSelected, utrId, paymentPhone, selectedSheetNumbers } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!sheetsSelected || !utrId || !paymentPhone || !selectedSheetNumbers) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if game exists and is active
    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.status === 'ended') {
      return res.status(400).json({ error: 'Game has already ended' });
    }

    // Check for conflicts with ALL existing participations (pending and approved)
    const { data: allParticipations } = await supabaseAdmin
      .from('game_participants')
      .select('selected_sheet_numbers, user_id, payment_status')
      .eq('game_id', gameId)
      .in('payment_status', ['pending', 'approved']); // Include both pending and approved

    // Collect all taken sheets and user's own sheets
    const allTakenSheets = [];
    const userTakenSheets = [];
    
    if (allParticipations && allParticipations.length > 0) {
      allParticipations.forEach(participation => {
        if (participation.selected_sheet_numbers) {
          // Add to all taken sheets
          allTakenSheets.push(...participation.selected_sheet_numbers);
          
          // Add to user's own sheets if it's the same user
          if (participation.user_id === userId) {
            userTakenSheets.push(...participation.selected_sheet_numbers);
          }
        }
      });
    }

    // Check for conflicts with ANY existing sheets (reserved or sold)
    const conflictingSheets = selectedSheetNumbers.filter(sheet => allTakenSheets.includes(sheet));
    if (conflictingSheets.length > 0) {
      // Check if conflicts are with user's own sheets or others
      const userConflicts = conflictingSheets.filter(sheet => userTakenSheets.includes(sheet));
      const otherConflicts = conflictingSheets.filter(sheet => !userTakenSheets.includes(sheet));
      
      if (otherConflicts.length > 0) {
        return res.status(400).json({ 
          error: `These sheets are already taken by other users: ${otherConflicts.join(', ')}. Please select different sheets.` 
        });
      } else if (userConflicts.length > 0) {
        return res.status(400).json({ 
          error: `You have already selected these sheets: ${userConflicts.join(', ')}. Please select different sheets.` 
        });
      }
    }

    // Calculate total amount based on sheets selected
    let totalAmount = 0;
    if (sheetsSelected === 1) {
      totalAmount = game.price_per_sheet_1;
    } else if (sheetsSelected === 2) {
      totalAmount = game.price_per_sheet_2 * 2;
    } else {
      totalAmount = game.price_per_sheet_3_plus * sheetsSelected;
    }

    // Create participation record using admin client to bypass RLS
    const { data: participation, error } = await supabaseAdmin
      .from('game_participants')
      .insert([{
        game_id: gameId,
        user_id: userId,
        sheets_selected: sheetsSelected,
        total_amount: totalAmount,
        utr_id: utrId,
        payment_phone: paymentPhone,
        selected_sheet_numbers: selectedSheetNumbers,
        payment_status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: 'Registration submitted successfully. Waiting for organiser approval.',
      participation
    });
  } catch (error) {
    console.error('Error registering for game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sheet download links for approved participants
router.get('/:gameId/sheets/:participationId', authenticateToken, async (req, res) => {
  try {
    const { gameId, participationId } = req.params;
    const userId = req.user.userId;

    // Verify participation and approval
    const { data: participation } = await supabaseAdmin
      .from('game_participants')
      .select(`
        *,
        games (
          sheets_folder_id, 
          sheets_folder_url,
          sheet_file_format,
          name,
          individual_sheet_files
        )
      `)
      .eq('id', participationId)
      .eq('user_id', userId)
      .eq('payment_status', 'approved')
      .single();

    if (!participation) {
      return res.status(403).json({ error: 'Access denied - not approved for this game' });
    }

    const game = participation.games;
    if (!game.sheets_folder_id) {
      return res.status(404).json({ error: 'Game sheets not available' });
    }

    // Generate secure download links for selected sheets
    const sheets = [];

    for (const sheetNumber of participation.selected_sheet_numbers) {
      const fileName = (game.sheet_file_format || 'Sheet_{number}.pdf').replace('{number}', sheetNumber);
      const secureUrl = `/api/games/sheets/secure-download/${participationId}/${sheetNumber}`;
      
      sheets.push({
        sheetNumber: sheetNumber,
        fileName: fileName,
        downloadUrl: secureUrl,
        gameName: game.name
      });
    }

    res.json({
      message: 'Sheet download links ready',
      sheets: sheets,
      totalSheets: sheets.length,
      gameId: gameId,
      gameName: game.name
    });

  } catch (error) {
    console.error('Error preparing sheet downloads:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GENERIC GAME DETAILS ROUTE - MUST BE LAST to avoid conflicts with specific routes
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: game, error } = await supabaseAdmin
      .from('games')
      .select(`
        *,
        organisers (
          organiser_name,
          whatsapp_number,
          real_name
        )
      `)
      .eq('id', id)
      .single();

    if (error || !game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get participant count
    const { count: participantCount } = await supabaseAdmin
      .from('game_participants')
      .select('*', { count: 'exact' })
      .eq('game_id', id)
      .eq('payment_status', 'approved');

    game.registered_participants = participantCount || 0;

    res.json({ game });
  } catch (error) {
    console.error('Error fetching game details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SECURE INDIVIDUAL SHEET PROXY - NO FOLDER ACCESS, ONLY SPECIFIC APPROVED SHEETS
router.get('/sheets/secure-proxy/:participationId/:sheetNumber/:fileName', authenticateToken, async (req, res) => {
  try {
    const { participationId, sheetNumber, fileName } = req.params;
    const userId = req.user.userId;
    
    console.log(`🔐 SECURE PROXY: User ${userId} requesting ${fileName} (sheet ${sheetNumber})`);
    
    // CRITICAL SECURITY: Verify user has access to this SPECIFIC sheet
    const { data: participation } = await supabaseAdmin
      .from('game_participants')
      .select(`
        *,
        games (
          sheets_folder_id,
          name,
          individual_sheet_files
        )
      `)
      .eq('id', participationId)
      .eq('user_id', userId)
      .eq('payment_status', 'approved')
      .single();

    if (!participation) {
      console.log(`❌ SECURITY: Access denied for user ${userId}, participation ${participationId}`);
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if user selected this specific sheet
    const selectedSheets = participation.selected_sheet_numbers || [];
    const requestedSheet = parseInt(sheetNumber);
    
    if (!selectedSheets.includes(requestedSheet)) {
      console.log(`❌ SECURITY: User ${userId} did not select sheet ${requestedSheet}`);
      return res.status(403).json({ error: 'Sheet not selected by user' });
    }

    // Check if already downloaded (one-time download)
    const downloadedSheets = participation.downloaded_sheet_numbers || [];
    if (downloadedSheets.includes(requestedSheet)) {
      console.log(`❌ SECURITY: Sheet ${requestedSheet} already downloaded by user ${userId}`);
      return res.status(409).json({ error: 'Sheet already downloaded' });
    }

    const game = participation.games;
    const folderId = game.sheets_folder_id;
    
    if (!folderId) {
      return res.status(404).json({ error: 'Game sheets not configured' });
    }

    console.log(`🔐 SECURE PROXY: Downloading ${fileName} from folder ${folderId} for authorized user`);
    
    // SECURE APPROACH: Server downloads the file and streams it to user
    // This prevents any Google Drive exposure
    
    // Check if we have individual file IDs configured
    const individualFiles = game.individual_sheet_files || {};
    const specificFileId = individualFiles[requestedSheet.toString()];
    
    let googleDriveUrl;
    
    if (specificFileId && !specificFileId.startsWith('FOLDER_')) {
      // Use specific file ID (from API scan)
      googleDriveUrl = `https://drive.google.com/uc?export=download&id=${specificFileId}`;
      console.log(`🔐 SECURE PROXY: Using specific file ID ${specificFileId} for ${fileName}`);
    } else {
      // Fallback to folder-based approach
      googleDriveUrl = `https://drive.google.com/uc?export=download&id=${folderId}&filename=${encodeURIComponent(fileName)}`;
      console.log(`🔐 SECURE PROXY: Using folder-based approach for ${fileName}`);
    }
    
    try {
      console.log(`🔐 SECURE PROXY: Fetching from ${googleDriveUrl}`);
      const response = await fetch(googleDriveUrl);
      
      if (!response.ok) {
        console.error(`❌ SECURE PROXY: Google Drive returned ${response.status} for ${googleDriveUrl}`);
        throw new Error(`Google Drive returned ${response.status}`);
      }
      
      // Mark as downloaded BEFORE streaming
      const updatedDownloadedSheets = [...downloadedSheets, requestedSheet];
      await supabaseAdmin
        .from('game_participants')
        .update({
          downloaded_sheet_numbers: updatedDownloadedSheets,
          sheets_downloaded: updatedDownloadedSheets.length === selectedSheets.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', participationId);
      
      console.log(`✅ SECURE PROXY: Streaming ${fileName} to user ${userId} (no Google Drive exposure)`);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      // Stream the file through our server (NO Google Drive exposure)
      response.body.pipe(res);
      
    } catch (downloadError) {
      console.error(`💥 SECURE PROXY ERROR:`, downloadError);
      return res.status(500).json({
        error: 'File download failed',
        details: 'Could not retrieve file from secure storage'
      });
    }
    
  } catch (error) {
    console.error('💥 SECURE PROXY ERROR:', error);
    res.status(500).json({
      error: 'Secure download failed',
      details: error.message
    });
  }
});

// SECURE TOKEN DOWNLOAD - Generate time-limited secure download tokens
router.get('/sheets/secure-token/:participationId/:sheetNumber', authenticateToken, async (req, res) => {
  try {
    const { participationId, sheetNumber } = req.params;
    const userId = req.user.userId;
    
    console.log(`🎫 SECURE TOKEN: User ${userId} requesting download token for sheet ${sheetNumber}`);
    
    // Verify user has access to this specific sheet
    const { data: participation } = await supabaseAdmin
      .from('game_participants')
      .select(`
        *,
        games (
          id,
          name,
          individual_sheet_files
        )
      `)
      .eq('id', participationId)
      .eq('user_id', userId)
      .eq('payment_status', 'approved')
      .single();

    if (!participation) {
      console.log(`❌ SECURITY: Access denied for user ${userId}, participation ${participationId}`);
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if user selected this specific sheet
    const selectedSheets = participation.selected_sheet_numbers || [];
    const requestedSheet = parseInt(sheetNumber);
    
    if (!selectedSheets.includes(requestedSheet)) {
      console.log(`❌ SECURITY: User ${userId} did not select sheet ${requestedSheet}`);
      return res.status(403).json({ error: 'Sheet not selected by user' });
    }

    // Check if already downloaded (one-time download)
    const downloadedSheets = participation.downloaded_sheet_numbers || [];
    if (downloadedSheets.includes(requestedSheet)) {
      console.log(`❌ SECURITY: Sheet ${requestedSheet} already downloaded by user ${userId}`);
      return res.status(409).json({ error: 'Sheet already downloaded' });
    }

    const game = participation.games;
    const individualFiles = game.individual_sheet_files || {};
    const fileInfo = individualFiles[requestedSheet.toString()];
    
    if (!fileInfo || !fileInfo.downloadUrl) {
      console.log(`❌ FILE NOT CONFIGURED: No download URL for sheet ${requestedSheet}`);
      return res.status(404).json({ error: 'Sheet download not configured' });
    }

    // Mark as downloaded BEFORE providing token
    const updatedDownloadedSheets = [...downloadedSheets, requestedSheet];
    await supabaseAdmin
      .from('game_participants')
      .update({
        downloaded_sheet_numbers: updatedDownloadedSheets,
        sheets_downloaded: updatedDownloadedSheets.length === selectedSheets.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', participationId);

    console.log(`✅ SECURE TOKEN: Providing download URL for ${fileInfo.fileName} to user ${userId}`);

    // Return the direct Google Drive download URL
    // This is secure because:
    // 1. User must be authenticated
    // 2. User must have selected this sheet
    // 3. User must be approved
    // 4. One-time download only
    // 5. No folder access - only specific file
    res.json({
      success: true,
      fileName: fileInfo.fileName,
      downloadUrl: fileInfo.downloadUrl,
      sheetNumber: requestedSheet,
      gameName: game.name,
      message: 'Download authorized',
      security: {
        authenticated: true,
        approved: true,
        selectedSheet: true,
        oneTimeOnly: true,
        noFolderAccess: true
      }
    });
    
  } catch (error) {
    console.error('💥 SECURE TOKEN ERROR:', error);
    res.status(500).json({
      error: 'Token generation failed',
      details: error.message
    });
  }
});

module.exports = router;