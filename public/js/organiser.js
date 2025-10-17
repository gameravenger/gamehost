// Organiser Dashboard JavaScript

class OrganiserManager {
  constructor() {
    this.currentSection = 'dashboard';
    this.organiserData = null;
    this.games = [];
    this.participants = [];
    this.init();
  }

  async init() {
    // Check if user is logged in and is an organiser
    if (!app.user || (app.user.role !== 'organiser' && app.user.role !== 'admin')) {
      this.showLoginRequired();
      return;
    }

    this.showDashboard();
    this.setupEventListeners();
    await this.loadOrganiserData();
    await this.loadDashboardData();
  }

  showLoginRequired() {
    document.getElementById('loginRequiredScreen').style.display = 'block';
    document.getElementById('organiserDashboard').style.display = 'none';
  }

  showDashboard() {
    document.getElementById('loginRequiredScreen').style.display = 'none';
    document.getElementById('organiserDashboard').style.display = 'flex';
  }

  setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.currentTarget.dataset.section;
        this.switchSection(section);
      });
    });

    // Sidebar toggle for mobile
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // Profile form
    document.getElementById('profileForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.updateProfile();
    });

    // Create game form
    document.getElementById('createGameForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.createGame();
    });

    // Game status filter
    document.getElementById('gameStatusFilter')?.addEventListener('change', (e) => {
      this.filterGames(e.target.value);
    });

    // Participant filters
    document.getElementById('participantGameFilter')?.addEventListener('change', () => {
      this.filterParticipants();
    });

    document.getElementById('participantStatusFilter')?.addEventListener('change', () => {
      this.filterParticipants();
    });

    // End game form
    document.getElementById('endGameForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.endGame();
    });

    // Set minimum date for game creation
    const gameDate = document.getElementById('gameDate');
    if (gameDate) {
      const today = new Date().toISOString().split('T')[0];
      gameDate.min = today;
    }
  }

  switchSection(section) {
    this.currentSection = section;

    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    // Show section
    document.querySelectorAll('.content-section').forEach(sec => {
      sec.classList.remove('active');
    });
    document.getElementById(`${section}-section`).classList.add('active');

    // Load section data
    this.loadSectionData(section);
  }

  async loadSectionData(section) {
    switch (section) {
      case 'dashboard':
        await this.loadDashboardData();
        break;
      case 'profile':
        await this.loadProfileData();
        break;
      case 'active-games':
        await this.loadActiveGames();
        break;
      case 'participants':
        await this.loadParticipants();
        break;
      case 'history':
        await this.loadHistory();
        break;
    }
  }

  async loadOrganiserData() {
    try {
      const response = await app.apiCall('/organiser/profile');
      this.organiserData = response.organiser;
    } catch (error) {
      console.error('Error loading organiser data:', error);
      app.showNotification('Failed to load organiser data', 'error');
    }
  }

  async loadDashboardData() {
    try {
      const [statsResponse, gamesResponse] = await Promise.all([
        app.apiCall('/organiser/stats'),
        app.apiCall('/organiser/games?status=upcoming')
      ]);

      // Update stats
      document.getElementById('totalGamesCreated').textContent = statsResponse.totalGames || 0;
      document.getElementById('activeGamesCount').textContent = gamesResponse.games?.length || 0;
      document.getElementById('totalRevenue').textContent = `₹${(statsResponse.totalRevenue || 0).toLocaleString()}`;
      document.getElementById('totalProfit').textContent = `₹${(statsResponse.totalProfit || 0).toLocaleString()}`;

      // Load recent games widget
      this.loadRecentGamesWidget(gamesResponse.games?.slice(0, 5) || []);

      // Load pending verifications
      await this.loadPendingVerifications();

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

  loadRecentGamesWidget(games) {
    const widget = document.getElementById('recentGamesWidget');
    if (!widget) return;

    if (games.length === 0) {
      widget.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No recent games</p>';
      return;
    }

    widget.innerHTML = games.map(game => `
      <div style="padding: 10px 0; border-bottom: 1px solid rgba(255, 107, 53, 0.1);">
        <div style="font-weight: 600; color: var(--text-light); margin-bottom: 5px;">${game.name}</div>
        <div style="font-size: 0.9rem; color: var(--text-muted);">
          ${app.formatDate(game.game_date)} • ₹${game.total_prize.toLocaleString()}
        </div>
      </div>
    `).join('');
  }

  async loadPendingVerifications() {
    try {
      const response = await app.apiCall('/organiser/games');
      const allGames = response.games || [];
      
      // Get participants for all games
      let pendingCount = 0;
      const widget = document.getElementById('pendingVerificationsWidget');
      
      for (const game of allGames.slice(0, 3)) {
        try {
          const participantsResponse = await app.apiCall(`/organiser/games/${game.id}/participants`);
          const pending = participantsResponse.participants?.filter(p => p.payment_status === 'pending') || [];
          pendingCount += pending.length;
        } catch (error) {
          console.error('Error loading participants for game:', game.id);
        }
      }

      if (widget) {
        if (pendingCount === 0) {
          widget.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No pending verifications</p>';
        } else {
          widget.innerHTML = `
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 2rem; color: var(--warning-color); margin-bottom: 10px;">${pendingCount}</div>
              <div style="color: var(--text-light);">Pending Verifications</div>
            </div>
          `;
        }
      }
    } catch (error) {
      console.error('Error loading pending verifications:', error);
    }
  }

  async loadProfileData() {
    if (!this.organiserData) return;

    // Fill form with current data
    document.getElementById('realName').value = this.organiserData.real_name || '';
    document.getElementById('personalPhone').value = this.organiserData.personal_phone || '';
    document.getElementById('email').value = this.organiserData.users?.email || '';
    document.getElementById('username').value = this.organiserData.users?.username || '';
    document.getElementById('organiserName').value = this.organiserData.organiser_name || '';
    document.getElementById('whatsappNumber').value = this.organiserData.whatsapp_number || '';
  }

  async updateProfile() {
    try {
      const formData = new FormData(document.getElementById('profileForm'));
      const data = {
        organiserName: formData.get('organiserName'),
        whatsappNumber: formData.get('whatsappNumber')
      };

      const response = await app.apiCall('/organiser/profile', 'PUT', data);
      app.showNotification('Profile updated successfully', 'success');
      
      // Reload organiser data
      await this.loadOrganiserData();
      
    } catch (error) {
      app.showNotification(error.message || 'Failed to update profile', 'error');
    }
  }

  async createGame() {
    try {
      const formData = new FormData(document.getElementById('createGameForm'));
      const data = {
        name: formData.get('gameName'),
        bannerImageUrl: formData.get('bannerImageUrl'),
        totalPrize: parseFloat(formData.get('totalPrize')),
        pricePerSheet1: parseFloat(formData.get('pricePerSheet1')),
        pricePerSheet2: parseFloat(formData.get('pricePerSheet2')),
        pricePerSheet3Plus: parseFloat(formData.get('pricePerSheet3Plus')),
        paymentQrCodeUrl: formData.get('paymentQrCodeUrl'),
        zoomLink: formData.get('zoomLink'),
        zoomPassword: formData.get('zoomPassword'),
        gameDate: formData.get('gameDate'),
        gameTime: formData.get('gameTime'),
        sheetsFolderId: formData.get('sheetsFolderId'),
        totalSheets: parseInt(formData.get('totalSheets'))
      };

      const response = await app.apiCall('/organiser/games', 'POST', data);
      app.showNotification('Game created successfully', 'success');
      
      // Reset form and switch to active games
      document.getElementById('createGameForm').reset();
      this.switchSection('active-games');
      
    } catch (error) {
      app.showNotification(error.message || 'Failed to create game', 'error');
    }
  }

  async loadActiveGames() {
    try {
      const response = await app.apiCall('/organiser/games');
      this.games = response.games || [];
      this.renderActiveGames(this.games);
      
      // Populate game filter for participants
      this.populateGameFilter();
      
    } catch (error) {
      console.error('Error loading active games:', error);
      app.showNotification('Failed to load games', 'error');
    }
  }

  renderActiveGames(games) {
    const grid = document.getElementById('activeGamesGrid');
    if (!grid) return;

    if (games.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--text-muted);">
          <h3>No games created yet</h3>
          <p>Create your first game to get started!</p>
          <button class="btn btn-primary" onclick="organiserManager.switchSection('create-game')">
            Create Game
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = games.map(game => `
      <div class="game-card">
        <div class="game-card-header">
          <div class="game-card-title">${game.name}</div>
          <div class="game-card-meta">
            <span>${app.formatDate(game.game_date)}</span>
            <span class="status-badge status-${game.status}">${game.status}</span>
          </div>
        </div>
        <div class="game-card-body">
          <div class="game-card-stats">
            <div class="game-stat">
              <div class="game-stat-value">₹${game.total_prize.toLocaleString()}</div>
              <div class="game-stat-label">Prize Pool</div>
            </div>
            <div class="game-stat">
              <div class="game-stat-value">${game.registered_participants || 0}</div>
              <div class="game-stat-label">Participants</div>
            </div>
          </div>
          <div class="game-card-actions">
            <button class="btn btn-secondary btn-sm" onclick="organiserManager.editGame('${game.id}')">
              Edit
            </button>
            <button class="btn btn-primary btn-sm" onclick="organiserManager.viewParticipants('${game.id}')">
              Participants
            </button>
            ${game.status === 'live' ? `
              <button class="btn btn-success btn-sm" onclick="organiserManager.showEndGameModal('${game.id}')">
                End Game
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  filterGames(status) {
    if (status === 'all') {
      this.renderActiveGames(this.games);
    } else {
      const filtered = this.games.filter(game => game.status === status);
      this.renderActiveGames(filtered);
    }
  }

  async loadParticipants() {
    try {
      // Load participants for all games
      const allParticipants = [];
      
      for (const game of this.games) {
        try {
          const response = await app.apiCall(`/organiser/games/${game.id}/participants`);
          const participants = response.participants || [];
          participants.forEach(p => {
            p.gameName = game.name;
            p.gameId = game.id;
          });
          allParticipants.push(...participants);
        } catch (error) {
          console.error(`Error loading participants for game ${game.id}:`, error);
        }
      }
      
      this.participants = allParticipants;
      this.renderParticipants(this.participants);
      
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  }

  populateGameFilter() {
    const filter = document.getElementById('participantGameFilter');
    if (!filter) return;

    const options = '<option value="all">All Games</option>' +
      this.games.map(game => `<option value="${game.id}">${game.name}</option>`).join('');
    
    filter.innerHTML = options;
  }

  renderParticipants(participants) {
    const tbody = document.getElementById('participantsTableBody');
    if (!tbody) return;

    if (participants.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No participants found
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = participants.map(participant => `
      <tr>
        <td>${participant.users?.username || 'Unknown'}</td>
        <td>${participant.gameName}</td>
        <td>${participant.sheets_selected}</td>
        <td>₹${participant.total_amount.toLocaleString()}</td>
        <td>${participant.utr_id}</td>
        <td>${participant.payment_phone}</td>
        <td><span class="status-badge status-${participant.payment_status}">${participant.payment_status}</span></td>
        <td>
          ${participant.payment_status === 'pending' ? `
            <div class="action-buttons">
              <button class="btn btn-success btn-xs" onclick="organiserManager.updateParticipantStatus('${participant.id}', 'approved')">
                Approve
              </button>
              <button class="btn btn-danger btn-xs" onclick="organiserManager.updateParticipantStatus('${participant.id}', 'rejected')">
                Reject
              </button>
            </div>
          ` : '-'}
        </td>
      </tr>
    `).join('');
  }

  filterParticipants() {
    const gameFilter = document.getElementById('participantGameFilter')?.value;
    const statusFilter = document.getElementById('participantStatusFilter')?.value;

    let filtered = [...this.participants];

    if (gameFilter && gameFilter !== 'all') {
      filtered = filtered.filter(p => p.gameId === gameFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(p => p.payment_status === statusFilter);
    }

    this.renderParticipants(filtered);
  }

  async updateParticipantStatus(participantId, status) {
    try {
      const response = await app.apiCall(`/organiser/participants/${participantId}/status`, 'PUT', {
        status: status
      });

      app.showNotification(`Participant ${status} successfully`, 'success');
      
      // Reload participants
      await this.loadParticipants();
      
    } catch (error) {
      app.showNotification(error.message || `Failed to ${status} participant`, 'error');
    }
  }

  viewParticipants(gameId) {
    // Set game filter and switch to participants section
    this.switchSection('participants');
    setTimeout(() => {
      const gameFilter = document.getElementById('participantGameFilter');
      if (gameFilter) {
        gameFilter.value = gameId;
        this.filterParticipants();
      }
    }, 100);
  }

  editGame(gameId) {
    // Find the game
    const game = this.games.find(g => g.id === gameId);
    if (!game) return;

    // Populate edit form (simplified for now)
    app.showNotification('Game editing feature coming soon', 'info');
  }

  showEndGameModal(gameId) {
    document.getElementById('endGameId').value = gameId;
    document.getElementById('endGameModal').style.display = 'block';
  }

  async endGame() {
    try {
      const formData = new FormData(document.getElementById('endGameForm'));
      const gameId = formData.get('endGameId') || document.getElementById('endGameId').value;
      
      const winners = [];
      
      // Collect winners data
      for (let i = 1; i <= 3; i++) {
        const username = formData.get(`winner${i}`);
        const prize = formData.get(`prize${i}`);
        
        if (username && prize) {
          winners.push({
            userId: username, // In real implementation, you'd need to resolve username to userId
            position: i,
            prizeAmount: parseFloat(prize)
          });
        }
      }

      const response = await app.apiCall(`/organiser/games/${gameId}/end`, 'POST', {
        winners: winners
      });

      app.showNotification('Game ended successfully and winners added', 'success');
      this.closeEndGameModal();
      
      // Reload games
      await this.loadActiveGames();
      
    } catch (error) {
      app.showNotification(error.message || 'Failed to end game', 'error');
    }
  }

  closeEndGameModal() {
    document.getElementById('endGameModal').style.display = 'none';
    document.getElementById('endGameForm').reset();
  }

  async loadHistory() {
    try {
      const [statsResponse, gamesResponse] = await Promise.all([
        app.apiCall('/organiser/stats'),
        app.apiCall('/organiser/games?status=ended')
      ]);

      // Update summary cards
      document.getElementById('historyTotalGames').textContent = statsResponse.endedGamesCount || 0;
      document.getElementById('historyTotalRevenue').textContent = `₹${(statsResponse.totalRevenue || 0).toLocaleString()}`;
      document.getElementById('historyTotalProfit').textContent = `₹${(statsResponse.totalProfit || 0).toLocaleString()}`;
      
      // Calculate total participants from ended games
      const endedGames = gamesResponse.games || [];
      const totalParticipants = endedGames.reduce((sum, game) => sum + (game.registered_participants || 0), 0);
      document.getElementById('historyTotalParticipants').textContent = totalParticipants;

      // Render history table
      this.renderHistoryTable(endedGames);

    } catch (error) {
      console.error('Error loading history:', error);
    }
  }

  renderHistoryTable(games) {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    if (games.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No completed games yet
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = games.map(game => {
      const revenue = (game.registered_participants || 0) * (game.price_per_sheet_1 || 0); // Simplified calculation
      const profit = revenue - (game.total_prize || 0);
      
      return `
        <tr>
          <td>${game.name}</td>
          <td>${app.formatDate(game.game_date)}</td>
          <td>₹${game.total_prize.toLocaleString()}</td>
          <td>${game.registered_participants || 0}</td>
          <td>₹${revenue.toLocaleString()}</td>
          <td style="color: ${profit >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}">
            ₹${profit.toLocaleString()}
          </td>
          <td>
            <button class="btn btn-secondary btn-xs" onclick="organiserManager.viewGameDetails('${game.id}')">
              View Details
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  viewGameDetails(gameId) {
    app.showNotification('Game details view coming soon', 'info');
  }

  exportData(type) {
    app.showNotification(`${type} data export coming soon`, 'info');
  }
}

// Global functions
function closeEditGameModal() {
  document.getElementById('editGameModal').style.display = 'none';
}

function closeEndGameModal() {
  organiserManager.closeEndGameModal();
}

// Close modals when clicking outside
window.onclick = function(event) {
  const editModal = document.getElementById('editGameModal');
  const endModal = document.getElementById('endGameModal');
  
  if (event.target === editModal) {
    closeEditGameModal();
  }
  if (event.target === endModal) {
    closeEndGameModal();
  }
}

// Initialize organiser manager
const organiserManager = new OrganiserManager();