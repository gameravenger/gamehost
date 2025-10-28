const express = require('express');
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

// Get game details by ID
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

// Get sold/reserved sheets for a game (includes pending and approved)
router.get('/:id/sold-sheets', async (req, res) => {
  try {
    const { id: gameId } = req.params;
    
    // Get all participations for this game (pending and approved, but not rejected)
    const { data: participations, error } = await supabase
      .from('game_participants')
      .select('selected_sheet_numbers, payment_status')
      .eq('game_id', gameId)
      .in('payment_status', ['pending', 'approved']); // Include both pending and approved

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Collect all reserved/sold sheet numbers
    const reservedSheets = [];
    const approvedSheets = [];
    
    if (participations && participations.length > 0) {
      participations.forEach(participation => {
        if (participation.selected_sheet_numbers) {
          if (participation.payment_status === 'approved') {
            approvedSheets.push(...participation.selected_sheet_numbers);
          } else if (participation.payment_status === 'pending') {
            reservedSheets.push(...participation.selected_sheet_numbers);
          }
        }
      });
    }

    // Combine all unavailable sheets (both reserved and sold)
    const allUnavailableSheets = [...reservedSheets, ...approvedSheets];
    const uniqueUnavailableSheets = [...new Set(allUnavailableSheets)].sort((a, b) => a - b);

    res.json({ 
      soldSheets: uniqueUnavailableSheets, // All unavailable sheets
      approvedSheets: [...new Set(approvedSheets)].sort((a, b) => a - b), // Only approved/sold
      reservedSheets: [...new Set(reservedSheets)].sort((a, b) => a - b) // Only pending/reserved
    });
  } catch (error) {
    console.error('Error fetching sold sheets:', error);
    res.status(500).json({ error: 'Internal server error' });
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

// Get user's game participations
router.get('/user/participations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data: participations, error } = await supabaseAdmin
      .from('game_participants')
      .select(`
        *,
        games (
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

// Download sheets (only for approved participants)
router.get('/:id/download-sheets', authenticateToken, async (req, res) => {
  try {
    const { id: gameId } = req.params;
    const userId = req.user.userId;

    // Get ALL approved participations for this user and game
    console.log(`🔍 DOWNLOAD DEBUG: Checking participations for user ${userId}, game ${gameId}`);
    
    const { data: participations, error } = await supabaseAdmin
      .from('game_participants')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .eq('payment_status', 'approved');

    console.log(`📊 DOWNLOAD DEBUG: Found ${participations?.length || 0} approved participations`);
    console.log(`❌ DOWNLOAD DEBUG: Error:`, error);
    
    if (error) {
      console.log(`💥 DOWNLOAD ERROR: Database error:`, error.message);
      return res.status(500).json({ error: `Database error: ${error.message}` });
    }
    
    if (!participations || participations.length === 0) {
      console.log(`🚫 DOWNLOAD DENIED: No approved participations found for user ${userId}, game ${gameId}`);
      
      // Let's also check what participations exist for debugging
      const { data: allParticipations } = await supabaseAdmin
        .from('game_participants')
        .select('payment_status, created_at')
        .eq('game_id', gameId)
        .eq('user_id', userId);
        
      console.log(`📋 DOWNLOAD DEBUG: All user participations:`, allParticipations);
      
      return res.status(403).json({ 
        error: 'You are not approved for this game or not registered',
        debug: {
          userId,
          gameId,
          foundParticipations: allParticipations?.length || 0,
          participationStatuses: allParticipations?.map(p => p.payment_status) || []
        }
      });
    }

    // Get game details with sheets folder
    const { data: game } = await supabaseAdmin
      .from('games')
      .select('sheets_folder_id, name')
      .eq('id', gameId)
      .single();

    if (!game || !game.sheets_folder_id) {
      return res.status(404).json({ error: 'Game sheets not available' });
    }

    // Mark all participations as downloaded
    const participationIds = participations.map(p => p.id);
    await supabaseAdmin
      .from('game_participants')
      .update({ sheets_downloaded: true })
      .in('id', participationIds);

    // Collect all sheet numbers from all participations
    const allSheetNumbers = [];
    participations.forEach(participation => {
      if (participation.selected_sheet_numbers) {
        allSheetNumbers.push(...participation.selected_sheet_numbers);
      }
    });

    // Return sheet download information
    res.json({
      message: 'Sheets ready for download',
      sheetNumbers: allSheetNumbers,
      gameId: gameId,
      gameName: game.name,
      participations: participations.map(p => ({
        id: p.id,
        sheets: p.selected_sheet_numbers,
        downloadUrl: `/api/games/${gameId}/sheets/${p.id}`
      }))
    });
  } catch (error) {
    console.error('Error downloading sheets:', error);
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
          name
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

// Secure sheet download proxy - hides Google Drive structure
router.get('/sheets/secure-download/:participationId/:sheetNumber', authenticateToken, async (req, res) => {
  try {
    const { participationId, sheetNumber } = req.params;
    const userId = req.user.userId;

    // Verify user has access to this specific sheet
    const { data: participation } = await supabaseAdmin
      .from('game_participants')
      .select(`
        *,
        games (
          sheets_folder_id,
          sheets_folder_url,
          sheet_file_format,
          name
        )
      `)
      .eq('id', participationId)
      .eq('user_id', userId)
      .eq('payment_status', 'approved')
      .single();

    if (!participation) {
      return res.status(403).json({ error: 'Access denied - participation not found or not approved' });
    }

    // Check if user selected this specific sheet
    const selectedSheets = participation.selected_sheet_numbers || [];
    const requestedSheet = parseInt(sheetNumber);
    
    console.log('🔍 Sheet validation:', {
      selectedSheets: selectedSheets,
      requestedSheet: requestedSheet,
      selectedSheetsType: typeof selectedSheets[0],
      requestedSheetType: typeof requestedSheet
    });
    
    // Convert all selected sheets to integers for comparison
    const selectedSheetsAsNumbers = selectedSheets.map(sheet => 
      typeof sheet === 'string' ? parseInt(sheet) : sheet
    );
    
    if (!selectedSheetsAsNumbers.includes(requestedSheet)) {
      console.log('❌ Sheet not in selection:', {
        selectedSheetsAsNumbers,
        requestedSheet,
        participationId: participation.id
      });
      return res.status(403).json({ error: 'Sheet not in your selection' });
    }
    
    console.log('✅ Sheet validation passed');

    const game = participation.games;
    const fileName = (game.sheet_file_format || 'Sheet_{number}.pdf').replace('{number}', sheetNumber);
    
    // Log the download attempt
    console.log(`Download attempt: User ${userId}, Game ${game.name}, Sheet ${sheetNumber}`);

    // SECURITY FIX: Instead of giving folder access, create a restricted download page
    const folderId = game.sheets_folder_id;
    
    // Create a secure download page URL that only shows this user's sheets
    const restrictedDownloadUrl = `/secure-download?game=${gameId}&participation=${participationId}&sheet=${sheetNumber}`;
    
    // For backward compatibility, still provide folder URL but with warning
    const folderViewUrl = `https://drive.google.com/drive/folders/${folderId}`;
    
    // Return secure download options
    res.json({
      success: true,
      fileName: fileName,
      sheetNumber: sheetNumber,
      gameName: game.name,
      downloadOptions: {
        secure: restrictedDownloadUrl, // Primary secure method
        folder: folderViewUrl, // Fallback (with restrictions warning)
        instructions: `Download your specific sheet: ${fileName}`
      },
      message: `Sheet ${sheetNumber} ready for secure download`,
      instructions: `Click the secure download link to access only your authorized sheet: ${fileName}`,
      security: {
        restricted: true,
        authorizedSheets: [sheetNumber],
        participantOnly: true
      }
    });

    // Mark this sheet as accessed (for tracking)
    await supabaseAdmin
      .from('game_participants')
      .update({ 
        sheets_downloaded: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', participationId);

  } catch (error) {
    console.error('Error in secure sheet download:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Direct download endpoint for secure downloads with individual sheet tracking
router.get('/sheets/direct-download/:participationId/:sheetNumber', authenticateToken, async (req, res) => {
  try {
    const { participationId, sheetNumber } = req.params;
    const userId = req.user.userId;

    // Verify participation and authorization
    const { data: participation, error } = await supabaseAdmin
      .from('game_participants')
      .select(`
        *,
        games (
          sheets_folder_id,
          sheet_file_format,
          name
        )
      `)
      .eq('id', participationId)
      .eq('user_id', userId)
      .eq('payment_status', 'approved')
      .single();

    if (error || !participation) {
      console.log(`🚫 SECURITY: Unauthorized download attempt by user ${userId} for participation ${participationId}`);
      return res.status(403).json({ error: 'Access denied - You are not authorized for this download' });
    }

    // Check if user is authorized for this specific sheet
    const sheetNum = parseInt(sheetNumber);
    if (!participation.selected_sheet_numbers.includes(sheetNum)) {
      console.log(`🚫 SECURITY: User ${userId} attempted to download unauthorized sheet ${sheetNum}. Authorized sheets: ${participation.selected_sheet_numbers.join(', ')}`);
      return res.status(403).json({ error: `You are not authorized to download sheet ${sheetNum}. Your authorized sheets are: ${participation.selected_sheet_numbers.join(', ')}` });
    }

    // Check if this specific sheet has already been downloaded
    const downloadedSheets = participation.downloaded_sheet_numbers || [];
    if (downloadedSheets.includes(sheetNum)) {
      return res.status(409).json({ error: `Sheet ${sheetNum} has already been downloaded. Each sheet can only be downloaded once.` });
    }

    const game = participation.games;
    const fileName = (game.sheet_file_format || 'Sheet_{number}.pdf').replace('{number}', sheetNumber);

    // Log the authorized download attempt
    console.log(`✅ AUTHORIZED DOWNLOAD: User ${userId} downloading sheet ${sheetNum} from game ${game.name}`);

    // Mark this specific sheet as downloaded
    const updatedDownloadedSheets = [...downloadedSheets, sheetNum];
    await supabaseAdmin
      .from('game_participants')
      .update({ 
        downloaded_sheet_numbers: updatedDownloadedSheets,
        updated_at: new Date().toISOString()
      })
      .eq('id', participationId);

    // Check if all sheets for this participation have been downloaded
    const allSheetsDownloaded = participation.selected_sheet_numbers.every(sheet => 
      updatedDownloadedSheets.includes(sheet)
    );

    if (allSheetsDownloaded) {
      await supabaseAdmin
        .from('game_participants')
        .update({ 
          sheets_downloaded: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', participationId);
    }

    // In a real implementation, this would generate a direct download URL from Google Drive
    // For now, return the secure download page URL
    const secureDownloadUrl = `/secure-download?participation=${participationId}&sheet=${sheetNumber}`;
    
    res.json({
      success: true,
      secureUrl: secureDownloadUrl,
      fileName: fileName,
      sheetNumber: sheetNum,
      message: `Authorized download for sheet ${sheetNum}`,
      remainingSheets: participation.selected_sheet_numbers.filter(sheet => !updatedDownloadedSheets.includes(sheet))
    });

  } catch (error) {
    console.error('Error in direct download:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log folder access for security monitoring
router.post('/sheets/log-folder-access', authenticateToken, async (req, res) => {
  try {
    const { participationId, sheetNumber, gameId, timestamp, userAgent } = req.body;
    const userId = req.user.userId;

    // Log the access attempt
    console.log(`🔒 SECURITY LOG: User ${userId} accessed folder for game ${gameId}, participation ${participationId}, sheet ${sheetNumber} at ${timestamp}`);
    console.log(`🔒 User Agent: ${userAgent}`);

    // In a real implementation, you might want to store this in a security_logs table
    
    res.json({ success: true, logged: true });
  } catch (error) {
    console.error('Error logging folder access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;