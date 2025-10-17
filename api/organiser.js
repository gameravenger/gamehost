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
      sheetsFolderId,
      totalSheets
    } = req.body;

    // Get organiser ID
    const { data: organiser } = await supabase
      .from('organisers')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    if (!organiser) {
      return res.status(404).json({ error: 'Organiser profile not found' });
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
      const winnerRecords = winners.map(winner => ({
        game_id: id,
        user_id: winner.userId,
        position: winner.position,
        prize_amount: winner.prizeAmount
      }));

      await supabase
        .from('game_winners')
        .insert(winnerRecords);
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

module.exports = router;