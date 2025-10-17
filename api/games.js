const express = require('express');
const { supabase } = require('../config/database');
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
    
    const { data: games, error } = await supabase
      .from('games')
      .select(`
        *,
        organisers (
          organiser_name,
          whatsapp_number
        )
      `)
      .eq('game_date', today)
      .in('status', ['upcoming', 'live'])
      .order('game_time', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ games });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get featured games
router.get('/featured', async (req, res) => {
  try {
    const { data: games, error } = await supabase
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
    const { data: games, error } = await supabase
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

    const { data: game, error } = await supabase
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
    const { count: participantCount } = await supabase
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
    const { data: game, error: gameError } = await supabase
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

    // Check if user already registered for this game
    const { data: existingParticipation } = await supabase
      .from('game_participants')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .single();

    if (existingParticipation) {
      return res.status(400).json({ error: 'You have already registered for this game' });
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

    // Create participation record
    const { data: participation, error } = await supabase
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

    const { data: participations, error } = await supabase
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

module.exports = router;