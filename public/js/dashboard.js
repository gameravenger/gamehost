// User Dashboard JavaScript

class DashboardManager {
  constructor() {
    this.participations = [];
    this.notifications = [];
    this.currentFilter = 'all';
    this.init();
  }

  async init() {
    // Wait for app authentication to complete
    if (!app.authReady) {
      window.addEventListener('authReady', () => this.checkAuthAndInit());
      
      // Fallback timeout in case event doesn't fire
      setTimeout(() => {
        if (!app.authReady) {
          console.log('⏰ Auth timeout, checking anyway...');
          this.checkAuthAndInit();
        }
      }, 3000);
      return;
    }
    
    this.checkAuthAndInit();
  }
  
  checkAuthAndInit() {
    // Check if user is logged in
    console.log('🔍 Checking user auth. User:', app.user);
    
    if (!app.user || app.user.role !== 'user') {
      console.log('❌ User access denied. User role:', app.user?.role || 'No user');
      this.showLoginRequired();
      return;
    }

    console.log('✅ User dashboard access granted for:', app.user.username);
    this.showDashboard();
    this.setupEventListeners();
    this.loadDashboardData();
  }

  showLoginRequired() {
    document.getElementById('loginRequiredScreen').style.display = 'block';
    document.getElementById('userDashboard').style.display = 'none';
  }

  showDashboard() {
    document.getElementById('loginRequiredScreen').style.display = 'none';
    document.getElementById('userDashboard').style.display = 'block';
    
    // Update user name
    document.getElementById('userName').textContent = app.user.username;
  }

  setupEventListeners() {
    // Participation filter
    document.getElementById('participationFilter')?.addEventListener('change', (e) => {
      this.currentFilter = e.target.value;
      this.filterParticipations();
    });

    // Notification clicks
    document.addEventListener('click', (e) => {
      if (e.target.closest('.notification-item')) {
        const notificationId = e.target.closest('.notification-item').dataset.notificationId;
        this.markNotificationAsRead(notificationId);
      }
    });
  }

  async loadDashboardData() {
    try {
      await Promise.all([
        this.loadParticipations(),
        this.loadNotifications(),
        this.loadUserStats()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      app.showNotification('Failed to load dashboard data', 'error');
    }
  }

  async loadParticipations() {
    try {
      const response = await app.apiCall('/games/user/participations');
      this.participations = response.participations || [];
      this.renderParticipations();
    } catch (error) {
      console.error('Error loading participations:', error);
    }
  }

  async loadNotifications() {
    try {
      const response = await app.apiCall('/users/notifications');
      this.notifications = response.notifications || [];
      this.renderNotifications();
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  async loadUserStats() {
    try {
      // Calculate stats from participations
      const total = this.participations.length;
      const approved = this.participations.filter(p => p.payment_status === 'approved').length;
      const pending = this.participations.filter(p => p.payment_status === 'pending').length;
      
      // Update stats display
      document.getElementById('totalParticipations').textContent = total;
      document.getElementById('approvedParticipations').textContent = approved;
      document.getElementById('pendingParticipations').textContent = pending;
      document.getElementById('totalWins').textContent = '0'; // Would come from wins API
      
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }

  renderNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;

    const recentNotifications = this.notifications.slice(0, 5);

    if (recentNotifications.length === 0) {
      notificationsList.innerHTML = `
        <div class="no-content">
          <h4>📭 No notifications yet</h4>
          <p>You'll receive notifications when games go live or your payments are approved.</p>
        </div>
      `;
      return;
    }

    notificationsList.innerHTML = recentNotifications.map(notification => `
      <div class="notification-item ${notification.is_read ? '' : 'unread'} ${notification.type === 'game_live' ? 'game-live' : ''}" 
           data-notification-id="${notification.id}">
        <div class="notification-header">
          <div class="notification-title">${notification.title}</div>
          <div class="notification-time">${this.formatTimeAgo(notification.created_at)}</div>
        </div>
        <div class="notification-message">${notification.message}</div>
      </div>
    `).join('');
  }

  renderParticipations() {
    const participationsGrid = document.getElementById('participationsGrid');
    const noParticipations = document.getElementById('noParticipations');

    if (this.participations.length === 0) {
      participationsGrid.innerHTML = '';
      noParticipations.style.display = 'block';
      return;
    }

    noParticipations.style.display = 'none';
    this.filterParticipations();
  }

  filterParticipations() {
    const participationsGrid = document.getElementById('participationsGrid');
    
    let filtered = this.participations;
    if (this.currentFilter !== 'all') {
      filtered = this.participations.filter(p => p.payment_status === this.currentFilter);
    }

    if (filtered.length === 0) {
      participationsGrid.innerHTML = `
        <div class="no-content" style="grid-column: 1 / -1;">
          <h4>No ${this.currentFilter === 'all' ? '' : this.currentFilter} participations found</h4>
          <p>Try changing the filter or join more games!</p>
        </div>
      `;
      return;
    }

    participationsGrid.innerHTML = filtered.map(participation => this.createParticipationCard(participation)).join('');
  }

  createParticipationCard(participation) {
    const game = participation.games;
    const canDownload = participation.payment_status === 'approved' && !participation.sheets_downloaded;
    const canJoinMeeting = participation.payment_status === 'approved' && game.status === 'live' && game.zoom_link;

    return `
      <div class="participation-card ${participation.payment_status}">
        <div class="participation-header">
          <div class="participation-title">${game.name}</div>
          <div class="participation-meta">
            <span>${app.formatDate(game.game_date)}</span>
            <span>${game.game_time ? app.formatTime(game.game_time) : 'TBA'}</span>
          </div>
        </div>
        
        <div class="participation-body">
          <div class="participation-details">
            <div class="detail-item">
              <div class="detail-label">Sheets</div>
              <div class="detail-value">${participation.sheets_selected}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Amount</div>
              <div class="detail-value amount">₹${participation.total_amount.toLocaleString()}</div>
            </div>
          </div>
          
          <div class="participation-status">
            <span class="status-badge status-${participation.payment_status}">
              ${participation.payment_status}
            </span>
          </div>
          
          <div class="participation-actions">
            ${canDownload ? `
              <button class="btn btn-download" onclick="dashboardManager.downloadSheets('${participation.id}', '${game.id}')">
                📥 Download Sheets
              </button>
            ` : participation.sheets_downloaded ? `
              <button class="btn btn-secondary" disabled>
                ✅ Sheets Downloaded
              </button>
            ` : `
              <button class="btn btn-secondary" disabled>
                ⏳ Awaiting Approval
              </button>
            `}
            
            ${canJoinMeeting ? `
              <button class="btn btn-meeting" onclick="dashboardManager.joinMeeting('${game.zoom_link}')">
                🎥 Join Meeting
              </button>
            ` : ''}
          </div>
          
          <div class="participation-info">
            <small>UTR: ${participation.utr_id}</small><br>
            <small>Registered: ${app.formatDate(participation.created_at)}</small>
          </div>
        </div>
      </div>
    `;
  }

  async downloadSheets(participationId, gameId) {
    try {
      app.showNotification('Preparing your sheet downloads...', 'info');
      
      const response = await app.apiCall(`/games/${gameId}/sheets/${participationId}`);
      
      if (response.sheets && response.sheets.length > 0) {
        this.showDownloadModal(response.sheets, response.totalSheets);
      } else {
        app.showNotification('No sheets available for download', 'error');
      }
      
    } catch (error) {
      app.showNotification(error.message || 'Failed to prepare downloads', 'error');
    }
  }

  showDownloadModal(sheets, totalSheets) {
    const modalBody = document.getElementById('downloadModalBody');
    
    modalBody.innerHTML = `
      <div class="download-summary">
        <p>You have <strong>${totalSheets}</strong> sheets ready for download.</p>
        <p class="download-warning">⚠️ <strong>Important:</strong> You can download each sheet only once. Save them to your device.</p>
      </div>
      
      <div class="download-list">
        ${sheets.map(sheet => `
          <div class="download-item">
            <div class="download-item-info">
              <div class="download-item-name">Sheet ${sheet.sheetNumber}</div>
              <div class="download-item-details">${sheet.fileName}</div>
            </div>
            <button class="btn-download-sheet" onclick="dashboardManager.downloadSheet('${sheet.downloadUrl}', '${sheet.fileName}')">
              📥 Download
            </button>
          </div>
        `).join('')}
      </div>
      
      <div class="download-actions">
        <button class="btn btn-primary" onclick="dashboardManager.downloadAllSheets(${JSON.stringify(sheets).replace(/"/g, '&quot;')})">
          📥 Download All Sheets
        </button>
        <button class="btn btn-secondary" onclick="closeDownloadModal()">
          Close
        </button>
      </div>
    `;

    document.getElementById('downloadModal').style.display = 'block';
  }

  async downloadSheet(downloadUrl, fileName) {
    try {
      app.showNotification(`Preparing ${fileName} for download...`, 'info');
      
      // Get download information from API
      const response = await app.apiCall(downloadUrl.replace('/api', ''));
      
      if (response.success && response.downloadOptions) {
        // Try direct download first if available
        if (response.downloadOptions.direct) {
          const link = document.createElement('a');
          link.href = response.downloadOptions.direct;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Show fallback option if direct download might not work
          setTimeout(() => {
            app.showNotification(
              `If download didn't start, <a href="${response.downloadOptions.folder}" target="_blank">click here to open folder</a> and look for: ${fileName}`, 
              'info'
            );
          }, 2000);
        } else if (response.downloadOptions.folder) {
          // Open folder view directly
          window.open(response.downloadOptions.folder, '_blank');
          app.showNotification(`Opening Google Drive folder. Look for and download: ${fileName}`, 'success');
        } else {
          throw new Error('No download options available');
        }
      } else {
        throw new Error('Download information not available');
      }
      
    } catch (error) {
      console.error('Download error:', error);
      app.showNotification(error.message || 'Download failed', 'error');
    }
  }

  async downloadAllSheets(sheets) {
    try {
      app.showNotification('Starting download of all sheets...', 'info');
      
      // Download each sheet with a small delay
      for (let i = 0; i < sheets.length; i++) {
        setTimeout(() => {
          this.downloadSheet(sheets[i].downloadUrl, sheets[i].fileName);
        }, i * 1000); // 1 second delay between downloads
      }
      
      // Close modal after starting all downloads
      setTimeout(() => {
        this.closeDownloadModal();
      }, 2000);
      
    } catch (error) {
      app.showNotification('Failed to download all sheets', 'error');
    }
  }

  joinMeeting(meetingLink) {
    if (meetingLink) {
      window.open(meetingLink, '_blank');
      app.showNotification('Opening meeting...', 'success');
    }
  }

  async markNotificationAsRead(notificationId) {
    try {
      await app.apiCall(`/users/notifications/${notificationId}/read`, 'PUT');
      
      // Update notification display
      const notificationElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
      if (notificationElement) {
        notificationElement.classList.remove('unread');
      }
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  closeDownloadModal() {
    document.getElementById('downloadModal').style.display = 'none';
  }

  formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }
}

// Global functions
function closeDownloadModal() {
  dashboardManager.closeDownloadModal();
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('downloadModal');
  if (event.target === modal) {
    closeDownloadModal();
  }
}

// Initialize dashboard manager
const dashboardManager = new DashboardManager();