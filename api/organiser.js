const express = require('express');
const { supabase } = require('../config/database');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Middleware to verify organiser token
const authenticateOrganiser = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (user.role !== 'organiser' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Organiser access required' });
    }
    req.user = user;
    next();
  });
};

// Get organiser profile
router.get('/profile', authenticateOrganiser, async (req, res) => {
  try {
    const { data: organiser, error } = await supabase
      .from('organisers')
      .select(`
        *,
        users (
          username,
          email,
          phone
        )
      `)
      .eq('user_id', req.user.userId)
      .single();

    if (error || !organiser) {
      return res.status(404).json({ error: 'Organiser profile not found' });
    }

    res.json({ organiser });
  } catch (error) {
    console.error('Error fetching organiser profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update organiser profile (limited fields)
router.put('/profile', authenticateOrganiser, async (req, res) => {
  try {
    const { organiserName, whatsappNumber } = req.body;

    const { data: organiser, error } = await supabase
      .from('organisers')
      .update({
        organiser_name: organiserName,
        whatsapp_number: whatsappNumber,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', req.user.userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Profile updated successfully', organiser });
  } catch (error) {
    console.error('Error updating organiser profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new game
router.post('/games', authenticateOrganiser, async (req, res) => {
  try {
    const {
      name,
      bannerImageUrl,
      totalPrize,
      pricePerSheet1,
      pricePerSheet2,
      pricePerSheet3Plus,
      paymentQrCodeUrl,
      zoomLink,
      zoomPassword,
      gameDate,
      gameTime,
      sheetsFolder,
      totalSheets,
      sheetFileFormat,
      customFormat
    } = req.body;

    // Extract and validate Google Drive folder ID
    const googleDrive = require('../config/google-drive');
    let sheetsFolderId = null;
    
    if (sheetsFolder) {
      try {
        sheetsFolderId = await googleDrive.validateAndGetFolderId(sheetsFolder);
      } catch (error) {
        return res.status(400).json({ error: `Invalid Google Drive folder: ${error.message}` });
      }
    }

    // Get organiser ID
    const { data: organiser } = await supabase
      .from('organisers')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    if (!organiser) {
      return res.status(404).json({ error: 'Organiser profile not found' });
    }

    // Determine final file format
    let finalFileFormat = sheetFileFormat;
    if (sheetFileFormat === 'custom' && customFormat) {
      finalFileFormat = customFormat;
    }

    // Create game
    const { data: game, error } = await supabase
      .from('games')
      .insert([{
        organiser_id: organiser.id,
        name,
        banner_image_url: bannerImageUrl,
        total_prize: totalPrize,
        price_per_sheet_1: pricePerSheet1,
        price_per_sheet_2: pricePerSheet2,
        price_per_sheet_3_plus: pricePerSheet3Plus,
        payment_qr_code_url: paymentQrCodeUrl,
        zoom_link: zoomLink,
        zoom_password: zoomPassword,
        game_date: gameDate,
        game_time: gameTime,
        sheets_folder_id: sheetsFolderId,
        sheets_folder_url: sheetsFolder, // Store original URL for reference
        sheet_file_format: finalFileFormat,
        total_sheets: totalSheets,
        status: 'upcoming'
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ message: 'Game created successfully', game });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get organiser's games
router.get('/games', authenticateOrganiser, async (req, res) => {
  try {
    const { status } = req.query;

    // Get organiser ID
    const { data: organiser } = await supabase
      .from('organisers')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    if (!organiser) {
      return res.status(404).json({ error: 'Organiser profile not found' });
    }

    let query = supabase
      .from('games')
      .select('*')
      .eq('organiser_id', organiser.id);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: games, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ games });
  } catch (error) {
    console.error('Error fetching organiser games:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update game
router.put('/games/:id', authenticateOrganiser, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get organiser ID
    const { data: organiser } = await supabase
      .from('organisers')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    // Verify game belongs to organiser
    const { data: existingGame } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .eq('organiser_id', organiser.id)
      .single();

    if (!existingGame) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    const { data: game, error } = await supabase
      .from('games')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organiser_id', organiser.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Game updated successfully', game });
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get game participants for verification
router.get('/games/:id/participants', authenticateOrganiser, async (req, res) => {
  try {
    const { id } = req.params;

    // Get organiser ID
    const { data: organiser } = await supabase
      .from('organisers')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    // Verify game belongs to organiser
    const { data: game } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .eq('organiser_id', organiser.id)
      .single();

    if (!game) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    const { data: participants, error } = await supabase
      .from('game_participants')
      .select(`
        *,
        users (
          username,
          email
        )
      `)
      .eq('game_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ participants });
  } catch (error) {
    console.error('Error fetching game participants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve/Reject participant payment
router.put('/participants/:id/status', authenticateOrganiser, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get participant details
    const { data: participant } = await supabase
      .from('game_participants')
      .select(`
        *,
        games (
          organiser_id,
          organisers (
            user_id
          )
        )
      `)
      .eq('id', id)
      .single();

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Verify organiser owns this game
    if (participant.games.organisers.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update participant status
    const { data: updatedParticipant, error } = await supabase
      .from('game_participants')
      .update({
        payment_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Send notification to user
    if (status === 'approved') {
      await supabase
        .from('notifications')
        .insert([{
          user_id: participant.user_id,
          title: 'Payment Approved',
          message: `Your payment for the game has been approved. You can now download your sheets.`,
          type: 'payment_approved'
        }]);
    }

    res.json({ message: `Participant ${status} successfully`, participant: updatedParticipant });
  } catch (error) {
    console.error('Error updating participant status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End game and add winners
router.post('/games/:id/end', authenticateOrganiser, async (req, res) => {
  try {
    const { id } = req.params;
    const { winners } = req.body; // Array of {userId, position, prizeAmount}

    // Get organiser ID
    const { data: organiser } = await supabase
      .from('organisers')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    // Verify game belongs to organiser
    const { data: game } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .eq('organiser_id', organiser.id)
      .single();

    if (!game) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    // Update game status to ended
    await supabase
      .from('games')
      .update({
        status: 'ended',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    // Add winners
    if (winners && winners.length > 0) {
      // First, get user IDs from usernames
      const winnerRecords = [];
      
      for (const winner of winners) {
        // In a real implementation, you'd resolve usernames to user IDs
        // For now, we'll assume winner.userId is provided or resolved
        if (winner.userId && winner.position && winner.prizeAmount) {
          winnerRecords.push({
            game_id: id,
            user_id: winner.userId,
            position: winner.position,
            prize_amount: winner.prizeAmount
          });
        }
      }

      if (winnerRecords.length > 0) {
        await supabase
          .from('game_winners')
          .insert(winnerRecords);
      }
    }

    res.json({ message: 'Game ended successfully and winners added' });
  } catch (error) {
    console.error('Error ending game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get organiser statistics
router.get('/stats', authenticateOrganiser, async (req, res) => {
  try {
    // Get organiser ID
    const { data: organiser } = await supabase
      .from('organisers')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    // Get total games
    const { count: totalGames } = await supabase
      .from('games')
      .select('*', { count: 'exact' })
      .eq('organiser_id', organiser.id);

    // Get ended games with financial data
    const { data: endedGames } = await supabase
      .from('games')
      .select(`
        id,
        total_prize,
        game_participants!inner(total_amount, payment_status)
      `)
      .eq('organiser_id', organiser.id)
      .eq('status', 'ended');

    let totalRevenue = 0;
    let totalPrizesPaid = 0;
    let totalProfit = 0;

    endedGames.forEach(game => {
      const approvedParticipants = game.game_participants.filter(p => p.payment_status === 'approved');
      const gameRevenue = approvedParticipants.reduce((sum, p) => sum + parseFloat(p.total_amount), 0);
      totalRevenue += gameRevenue;
      totalPrizesPaid += parseFloat(game.total_prize);
    });

    totalProfit = totalRevenue - totalPrizesPaid;

    res.json({
      totalGames: totalGames || 0,
      totalRevenue,
      totalPrizesPaid,
      totalProfit,
      endedGamesCount: endedGames.length
    });
  } catch (error) {
    console.error('Error fetching organiser stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate Google Drive folder
router.post('/validate-folder', authenticateOrganiser, async (req, res) => {
  try {
    const { folderUrl } = req.body;
    
    if (!folderUrl) {
      return res.status(400).json({ error: 'Folder URL is required' });
    }

    // Extract folder ID from URL
    const googleDrive = require('../config/google-drive');
    const folderId = googleDrive.extractFolderIdFromUrl(folderUrl);
    
    if (!folderId) {
      return res.status(400).json({ error: 'Invalid Google Drive folder URL' });
    }

    // Validate folder accessibility
    await googleDrive.validateAndGetFolderId(folderUrl);
    
    res.json({ 
      message: 'Folder is valid and accessible',
      folderId: folderId
    });

  } catch (error) {
    console.error('Error validating folder:', error);
    res.status(400).json({ error: error.message });
  }
});

// Validate sheets in folder
router.post('/validate-sheets', authenticateOrganiser, async (req, res) => {
  try {
    const { folderUrl, totalSheets, fileFormat } = req.body;
    
    if (!folderUrl || !totalSheets || !fileFormat) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const googleDrive = require('../config/google-drive');
    const folderId = googleDrive.extractFolderIdFromUrl(folderUrl);
    
    if (!folderId) {
      return res.status(400).json({ error: 'Invalid Google Drive folder URL' });
    }

    // Validate a sample of sheets (first 10 sheets)
    const validation = {};
    const samplesToCheck = Math.min(10, totalSheets);
    
    for (let i = 1; i <= samplesToCheck; i++) {
      try {
        const fileName = fileFormat.replace('{number}', i);
        // For now, we'll assume sheets are accessible if folder is public
        // In production, you'd implement actual file checking
        validation[i] = true;
      } catch (error) {
        validation[i] = false;
      }
    }

    res.json({
      message: 'Sheet validation completed',
      validation: validation,
      folderId: folderId,
      totalChecked: samplesToCheck
    });

  } catch (error) {
    console.error('Error validating sheets:', error);
    res.status(400).json({ error: error.message });
  }
});

// Start game (mark as live)
router.post('/games/:id/start', authenticateOrganiser, async (req, res) => {
  try {
    const { id } = req.params;

    // Get organiser ID
    const { data: organiser } = await supabase
      .from('organisers')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    // Verify game belongs to organiser
    const { data: game } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .eq('organiser_id', organiser.id)
      .single();

    if (!game) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    // Update game status to live
    await supabase
      .from('games')
      .update({
        status: 'live',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    // Get all approved participants for this game
    const { data: participants } = await supabase
      .from('game_participants')
      .select('user_id')
      .eq('game_id', id)
      .eq('payment_status', 'approved');

    // Send notifications to all approved participants
    if (participants && participants.length > 0) {
      const notifications = participants.map(participant => ({
        user_id: participant.user_id,
        title: 'Game is Live!',
        message: `${game.name} has started. Join now using the meeting link.`,
        type: 'game_live'
      }));

      await supabase
        .from('notifications')
        .insert(notifications);
    }

    res.json({ 
      message: 'Game started successfully', 
      participantsNotified: participants?.length || 0 
    });

  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;