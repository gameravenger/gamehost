// Game Scheduler Service
// Handles automatic game status updates and ending

const { supabaseAdmin } = require('../config/database');

class GameScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  // Start the scheduler
  start() {
    if (this.isRunning) {
      console.log('⏰ Game scheduler is already running');
      return;
    }

    console.log('🚀 Starting game scheduler...');
    this.isRunning = true;
    
    // Run immediately
    this.checkGames();
    
    // Then run every 5 minutes
    this.intervalId = setInterval(() => {
      this.checkGames();
    }, 5 * 60 * 1000); // 5 minutes
    
    console.log('✅ Game scheduler started - checking every 5 minutes');
  }

  // Stop the scheduler
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏹️ Game scheduler stopped');
  }

  // Main function to check and update game statuses
  async checkGames() {
    try {
      console.log('🔍 Checking games for status updates...');
      
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
      
      // Get all games that might need status updates
      const { data: games, error } = await supabaseAdmin
        .from('games')
        .select('*')
        .in('status', ['upcoming', 'live'])
        .order('game_date', { ascending: true })
        .order('game_time', { ascending: true });

      if (error) {
        console.error('❌ Error fetching games:', error);
        return;
      }

      if (!games || games.length === 0) {
        console.log('📭 No active games to check');
        return;
      }

      console.log(`📊 Checking ${games.length} active games...`);

      for (const game of games) {
        await this.updateGameStatus(game, now);
      }

    } catch (error) {
      console.error('💥 Error in game scheduler:', error);
    }
  }

  // Update individual game status
  async updateGameStatus(game, now) {
    try {
      const gameDateTime = new Date(`${game.game_date}T${game.game_time}`);
      const timeDiff = now - gameDateTime;
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      let newStatus = game.status;
      let shouldUpdate = false;

      // Game should start (within 1 hour of scheduled time)
      if (game.status === 'upcoming' && hoursDiff >= -1 && hoursDiff <= 0) {
        newStatus = 'live';
        shouldUpdate = true;
        console.log(`🎮 Starting game: ${game.name} (scheduled for ${game.game_date} ${game.game_time})`);
      }
      
      // Game should auto-end (3 hours after scheduled time)
      else if (game.status === 'live' && hoursDiff >= 3) {
        newStatus = 'ended';
        shouldUpdate = true;
        console.log(`⏰ Auto-ending game: ${game.name} (3+ hours past scheduled time)`);
        
        // Also update the end reason
        await this.endGameAutomatically(game);
        return; // endGameAutomatically handles the status update
      }

      // Update status if needed
      if (shouldUpdate) {
        const { error: updateError } = await supabaseAdmin
          .from('games')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', game.id);

        if (updateError) {
          console.error(`❌ Error updating game ${game.name}:`, updateError);
        } else {
          console.log(`✅ Updated game ${game.name}: ${game.status} → ${newStatus}`);
        }
      }

    } catch (error) {
      console.error(`💥 Error updating game ${game.name}:`, error);
    }
  }

  // End game automatically without winners
  async endGameAutomatically(game) {
    try {
      console.log(`🔚 Auto-ending game: ${game.name}`);

      // Update game status to ended with auto-end reason
      const { error: gameError } = await supabaseAdmin
        .from('games')
        .update({ 
          status: 'ended',
          end_reason: 'auto_ended',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', game.id);

      if (gameError) {
        console.error(`❌ Error auto-ending game ${game.name}:`, gameError);
        return;
      }

      // Calculate basic stats for the game
      const { data: participants, error: participantsError } = await supabaseAdmin
        .from('game_participants')
        .select('*')
        .eq('game_id', game.id)
        .eq('payment_status', 'approved');

      if (participantsError) {
        console.error(`❌ Error fetching participants for game ${game.name}:`, participantsError);
      }

      const totalParticipants = participants ? participants.length : 0;
      const totalRevenue = participants ? participants.reduce((sum, p) => sum + p.total_amount, 0) : 0;

      console.log(`📊 Game ${game.name} auto-ended:`, {
        participants: totalParticipants,
        revenue: totalRevenue,
        prizePool: game.total_prize
      });

      // Optionally, send notifications to participants about auto-ended game
      if (totalParticipants > 0) {
        await this.notifyParticipantsGameEnded(game, participants);
      }

    } catch (error) {
      console.error(`💥 Error in auto-ending game ${game.name}:`, error);
    }
  }

  // Send notifications to participants when game is auto-ended
  async notifyParticipantsGameEnded(game, participants) {
    try {
      console.log(`📢 Sending auto-end notifications for game: ${game.name}`);

      const notifications = participants.map(participant => ({
        user_id: participant.user_id,
        title: 'Game Ended',
        message: `The game "${game.name}" has been automatically ended. No winners were declared.`,
        type: 'game_ended',
        game_id: game.id,
        is_read: false,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabaseAdmin
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('❌ Error sending auto-end notifications:', error);
      } else {
        console.log(`✅ Sent ${notifications.length} auto-end notifications`);
      }

    } catch (error) {
      console.error('💥 Error sending auto-end notifications:', error);
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId !== null
    };
  }
}

// Create singleton instance
const gameScheduler = new GameScheduler();

module.exports = gameScheduler;