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
      console.log('📊 DASHBOARD: Loading participations...');
      const response = await app.apiCall('/games/user/participations');
      this.participations = response.participations || [];
      
      console.log('✅ DASHBOARD: Participations loaded:', {
        count: this.participations.length,
        sample: this.participations.slice(0, 2).map(p => ({
          id: p.id,
          gameId: p.games?.id,
          gameName: p.games?.name,
          status: p.payment_status
        }))
      });
      
      this.renderParticipations();
    } catch (error) {
      console.error('❌ Error loading participations:', error);
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
    
    // Debug game object structure (will be removed after testing)
    console.log('🎮 DASHBOARD DEBUG: Game object for participation:', {
      participationId: participation.id,
      gameObject: game,
      gameId: game?.id,
      gameName: game?.name
    });
    
    // Check if user has multiple participations for this game
    const gameParticipations = this.participations.filter(p => p.games?.id === game.id);
    const hasMultipleParticipations = gameParticipations.length > 1;
    
    // Check if ANY participation for this game is approved and not downloaded
    const hasApprovedParticipations = gameParticipations.some(p => p.payment_status === 'approved');
    const hasUndownloadedSheets = gameParticipations.some(p => p.payment_status === 'approved' && !p.sheets_downloaded);
    
    const canDownload = hasApprovedParticipations && hasUndownloadedSheets;
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
              <button class="btn btn-download" onclick="dashboardManager.downloadAllGameSheets('${game.id}')">
                📥 Download ${hasMultipleParticipations ? 'All ' : ''}Sheets
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

  // New method to download all sheets for a game (handles multiple participations) - FIXED
  async downloadAllGameSheets(gameId) {
    try {
      app.showNotification('Preparing your sheet downloads...', 'info');
      
      console.log(`📥 DOWNLOAD: Attempting download for game ${gameId}`);

      // Try the download directly
      const response = await app.apiCall(`/games/${gameId}/download-sheets`);
      
      console.log('📥 DOWNLOAD RESPONSE:', response);
      
      if (response.success && response.sheets && response.sheets.length > 0) {
        console.log(`✅ DOWNLOAD: Found ${response.sheets.length} sheets to download`);
        this.showDownloadModal(response.sheets, response.totalSheets);
      } else if (response.error) {
        // Handle specific error codes
        if (response.code === 'NOT_REGISTERED') {
          app.showNotification('❌ You are not registered for this game. Please register first.', 'error');
        } else if (response.code === 'NOT_APPROVED') {
          app.showNotification('⏳ Your payment is pending approval by the organiser. Please wait.', 'warning');
        } else {
          app.showNotification(response.error, 'error');
        }
      } else {
        app.showNotification('No sheets available for download', 'error');
      }
      
    } catch (error) {
      console.error('Download error:', error);
      
      // Show detailed error information
      const errorDetails = `
ERROR DETAILS:
- Message: ${error.message}
- Status: ${error.status || 'Unknown'}
- Response: ${JSON.stringify(error.response || 'No response')}
      `;
      console.log(errorDetails);
      
      if (error.message.includes('not approved')) {
        app.showNotification('⏳ Your payment is pending organiser approval', 'warning');
      } else if (error.message.includes('not registered')) {
        app.showNotification('❌ Please register for this game first', 'error');
      } else if (error.status === 403) {
        app.showNotification('🚫 Access denied. Check console for details.', 'error');
      } else {
        app.showNotification(error.message || 'Failed to prepare downloads', 'error');
      }
    }
  }

  // Legacy method for single participation downloads (kept for compatibility)
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
        <p>You have <strong>${totalSheets}</strong> approved sheets ready for secure download.</p>
        <p class="download-warning">🔒 <strong>Security Notice:</strong> Each sheet can only be downloaded ONCE. No folder access provided.</p>
        <p class="download-info">📋 <strong>Your Authorized Sheets:</strong> ${sheets.map(s => s.sheetNumber).join(', ')}</p>
      </div>
      
      <div class="download-list">
        ${sheets.map(sheet => `
          <div class="download-item" id="sheet-${sheet.participationId}-${sheet.sheetNumber}">
            <div class="download-item-info">
              <div class="download-item-name">Sheet ${sheet.sheetNumber}</div>
              <div class="download-item-details">${sheet.fileName}</div>
              <div class="download-security">🔐 One-Time Secure Download</div>
            </div>
            <button class="btn-download-sheet" 
                    onclick="dashboardManager.downloadSecureSheet('${sheet.participationId || ''}', '${sheet.sheetNumber}', '${sheet.fileName}')"
                    data-participation="${sheet.participationId}"
                    data-sheet="${sheet.sheetNumber}">
              📥 Download Now
            </button>
          </div>
        `).join('')}
      </div>
      
      <div class="download-actions">
        <button class="btn btn-primary" onclick="dashboardManager.downloadAllSecureSheets(${JSON.stringify(sheets).replace(/"/g, '&quot;')})">
          📥 Download All Sheets (One by One)
        </button>
        <button class="btn btn-secondary" onclick="closeDownloadModal()">
          Close
        </button>
      </div>
      
      <div class="security-notice">
        <h4>🛡️ Enhanced Security Features:</h4>
        <ul>
          <li>🔐 <strong>Individual Sheet Access:</strong> Only your purchased sheets are accessible</li>
          <li>⚡ <strong>Fast Downloads:</strong> Direct download links with no delays</li>
          <li>🚫 <strong>No Folder Access:</strong> Cannot access other participants' sheets</li>
          <li>📊 <strong>Download Tracking:</strong> Each download is logged and limited</li>
          <li>✅ <strong>One-Time Only:</strong> Each sheet can only be downloaded once</li>
        </ul>
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
        // SECURITY ENHANCEMENT: Use secure download page if available
        if (response.downloadOptions.secure) {
          // Redirect to secure download page
          window.open(response.downloadOptions.secure, '_blank');
          app.showNotification(`🔐 Opening secure download page for: ${fileName}`, 'success');
        } else if (response.downloadOptions.direct) {
          // Try direct download if available
          const link = document.createElement('a');
          link.href = response.downloadOptions.direct;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          app.showNotification(`📥 Starting download: ${fileName}`, 'success');
        } else if (response.downloadOptions.folder) {
          // Folder access with security warning
          const confirmed = confirm(
            `⚠️ SECURITY NOTICE ⚠️\n\n` +
            `You are about to access the game sheets folder.\n` +
            `Please only download your authorized sheet: ${fileName}\n\n` +
            `Downloading other sheets violates terms of service.\n\n` +
            `Continue?`
          );
          
          if (confirmed) {
            window.open(response.downloadOptions.folder, '_blank');
            app.showNotification(`📁 Opening folder. Only download: ${fileName}`, 'warning');
          }
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

  // SECURE DOWNLOAD - Individual sheets with proper authorization
  async downloadSecureSheet(participationId, sheetNumber, fileName) {
    try {
      app.showNotification(`🔐 Authorizing download for ${fileName}...`, 'info');
      
      console.log(`🔐 DOWNLOAD: Requesting secure download for sheet ${sheetNumber}, participation ${participationId}`);
      
      // Call the secure download API to get authorization
      const response = await app.apiCall(`/games/sheets/secure-download/${participationId}/${sheetNumber}`);
      
      if (response.success && response.downloadUrl) {
        console.log(`✅ DOWNLOAD: Authorized for sheet ${sheetNumber}`);
        
        // Get the proxy download information
        const proxyResponse = await app.apiCall(response.downloadUrl.replace('/api', ''));
        
        if (proxyResponse.success && proxyResponse.secureAccess) {
          // Show secure download modal with instructions
          this.showSecureDownloadInstructions(proxyResponse);
          
          // Update UI to show downloaded status
          this.markSheetAsDownloaded(participationId, sheetNumber);
          
        } else {
          throw new Error('Failed to get secure access information');
        }
        
      } else {
        throw new Error(response.error || 'Download authorization failed');
      }
      
    } catch (error) {
      console.error('Secure download error:', error);
      
      if (error.message.includes('already been downloaded')) {
        app.showNotification(`⚠️ ${fileName} has already been downloaded`, 'warning');
        this.markSheetAsDownloaded(participationId, sheetNumber);
      } else if (error.message.includes('not authorized')) {
        app.showNotification(`🚫 You are not authorized to download ${fileName}`, 'error');
      } else if (error.message.includes('not configured') || error.message.includes('temporarily disabled')) {
        app.showNotification(`🔒 Secure downloads not configured for this game yet`, 'warning');
        this.showSecurityConfigurationNotice();
      } else {
        app.showNotification(`❌ Failed to download ${fileName}: ${error.message}`, 'error');
      }
    }
  }

  // Show secure download instructions modal
  showSecureDownloadInstructions(downloadInfo) {
    const modal = document.createElement('div');
    modal.className = 'secure-download-modal';
    modal.innerHTML = `
      <div class="secure-download-content">
        <h3>🔐 ${downloadInfo.instructions.title}</h3>
        
        <div class="download-warning">
          ${downloadInfo.instructions.warning}
        </div>
        
        <div class="download-steps">
          <h4>Download Instructions:</h4>
          <ol>
            ${downloadInfo.instructions.steps.map(step => `<li>${step}</li>`).join('')}
          </ol>
        </div>
        
        <div class="download-actions">
          <a href="${downloadInfo.secureAccess.url}" target="_blank" class="btn btn-primary">
            🔐 Open Secure Folder
          </a>
          <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
            Close
          </button>
        </div>
        
        <div class="security-info">
          <small>
            🛡️ This download is tracked and logged for security purposes.<br>
            📋 Authorized file: <strong>${downloadInfo.secureAccess.authorizedFile}</strong>
          </small>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (modal.parentElement) {
        modal.remove();
      }
    }, 30000);
    
    app.showNotification(`🔐 Secure folder opened for ${downloadInfo.fileName}`, 'success');
  }

  // Show security configuration notice for games not yet configured
  showSecurityConfigurationNotice() {
    const modal = document.createElement('div');
    modal.className = 'secure-download-modal';
    modal.innerHTML = `
      <div class="secure-download-content">
        <h3>🔒 Secure Downloads Not Yet Configured</h3>
        
        <div class="download-warning">
          ⚠️ This game is not yet configured for secure individual sheet downloads
        </div>
        
        <div class="download-steps">
          <h4>Why downloads are disabled:</h4>
          <ul>
            <li>🛡️ <strong>Security Protection:</strong> We prevent folder access that would expose all sheets</li>
            <li>💰 <strong>Business Protection:</strong> Folder access would allow downloading all sheets, causing massive losses</li>
            <li>🔐 <strong>Individual File Access:</strong> Each sheet needs its own secure file ID</li>
            <li>⚡ <strong>Coming Soon:</strong> Organizer is configuring individual sheet access</li>
          </ul>
        </div>
        
        <div class="download-actions">
          <button class="btn btn-primary" onclick="this.parentElement.parentElement.parentElement.remove()">
            I Understand
          </button>
        </div>
        
        <div class="security-info">
          <small>
            🛡️ This security measure protects both users and the business.<br>
            📋 Contact the game organizer if you need immediate access to your sheets.
          </small>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-remove after 20 seconds
    setTimeout(() => {
      if (modal.parentElement) {
        modal.remove();
      }
    }, 20000);
  }

  // Mark sheet as downloaded in the UI
  markSheetAsDownloaded(participationId, sheetNumber) {
    // Find and update the download button for this sheet
    const downloadButtons = document.querySelectorAll(`[onclick*="${participationId}"][onclick*="${sheetNumber}"]`);
    downloadButtons.forEach(button => {
      button.textContent = '✅ Downloaded';
      button.disabled = true;
      button.classList.add('downloaded');
    });
  }

  // New secure download method for all sheets
  async downloadAllSecureSheets(sheets) {
    try {
      app.showNotification('🔐 Starting secure download of all sheets...', 'info');
      
      // Download each sheet with a small delay using secure method
      for (let i = 0; i < sheets.length; i++) {
        setTimeout(() => {
          this.downloadSecureSheet(sheets[i].participationId || '', sheets[i].sheetNumber, sheets[i].fileName);
        }, i * 2000); // 2 second delay between downloads for security
      }
      
      // Close modal after starting all downloads
      setTimeout(() => {
        this.closeDownloadModal();
      }, 3000);
      
    } catch (error) {
      app.showNotification('Failed to download all sheets securely', 'error');
    }
  }

  // Legacy method - kept for backward compatibility but enhanced with security warnings
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