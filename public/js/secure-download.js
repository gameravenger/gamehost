// Secure Download Page JavaScript

class SecureDownloadManager {
  constructor() {
    this.gameId = null;
    this.participationId = null;
    this.sheetNumber = null;
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
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    this.gameId = urlParams.get('game');
    this.participationId = urlParams.get('participation');
    this.sheetNumber = urlParams.get('sheet');

    console.log('🔍 Secure download params:', {
      gameId: this.gameId,
      participationId: this.participationId,
      sheetNumber: this.sheetNumber,
      user: app.user
    });

    // Check if user is logged in
    if (!app.user) {
      console.log('❌ User not logged in');
      this.showLoginRequired();
      return;
    }

    // Validate parameters
    if (!this.gameId || !this.participationId || !this.sheetNumber) {
      console.log('❌ Invalid download parameters');
      this.showError('Invalid download link. Please use the download link from your dashboard.');
      return;
    }

    console.log('✅ User authenticated, loading secure download');
    this.loadSecureDownload();
  }

  showLoginRequired() {
    document.getElementById('loginRequiredScreen').style.display = 'block';
    document.getElementById('secureDownloadContainer').style.display = 'none';
    document.getElementById('errorScreen').style.display = 'none';
  }

  showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorScreen').style.display = 'block';
    document.getElementById('loginRequiredScreen').style.display = 'none';
    document.getElementById('secureDownloadContainer').style.display = 'none';
  }

  showDownload() {
    document.getElementById('secureDownloadContainer').style.display = 'block';
    document.getElementById('loginRequiredScreen').style.display = 'none';
    document.getElementById('errorScreen').style.display = 'none';
  }

  async loadSecureDownload() {
    try {
      // Verify access and get download information
      const response = await app.apiCall(`/games/sheets/secure-download/${this.participationId}/${this.sheetNumber}`);
      
      if (response.success && response.security && response.security.restricted) {
        this.renderSecureDownload(response);
        this.showDownload();
      } else {
        this.showError('This download is not properly secured. Please contact support.');
      }
      
    } catch (error) {
      console.error('Secure download error:', error);
      this.showError(error.message || 'Access denied. You may not have permission to download this sheet.');
    }
  }

  renderSecureDownload(downloadData) {
    const downloadInfo = document.getElementById('downloadInfo');
    
    downloadInfo.innerHTML = `
      <div class="download-card">
        <div class="download-header">
          <h2>📄 ${downloadData.fileName}</h2>
          <div class="download-meta">
            <span class="game-name">Game: ${downloadData.gameName}</span>
            <span class="sheet-number">Sheet #${downloadData.sheetNumber}</span>
          </div>
        </div>

        <div class="download-content">
          <div class="download-status">
            <div class="status-item">
              <span class="status-label">Status:</span>
              <span class="status-value success">✅ Authorized</span>
            </div>
            <div class="status-item">
              <span class="status-label">Your Selected Sheets:</span>
              <span class="status-value">${downloadData.security.authorizedSheets.join(', ')}</span>
            </div>
          </div>

          <div class="download-actions">
            <div class="primary-download">
              <h3>🔒 Secure Download Options:</h3>
              <p class="download-description">Choose your preferred download method:</p>
              
              <div class="download-options">
                <button class="btn btn-primary btn-large" onclick="secureDownloadManager.downloadSecureSheet()">
                  🔐 Download ${downloadData.fileName}
                </button>
                
                <div class="alternative-download">
                  <p class="alt-description">
                    <strong>Alternative:</strong> If the secure download doesn't work, you can access the folder directly, 
                    but <strong>please only download your authorized sheet: ${downloadData.fileName}</strong>
                  </p>
                  <button class="btn btn-secondary" onclick="secureDownloadManager.openFolderWithWarning('${downloadData.downloadOptions.folder}')">
                    📁 Open Folder (Use Responsibly)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="download-warning">
          <h4>⚠️ Important Guidelines:</h4>
          <ul>
            <li>Only download the sheet you've paid for: <strong>${downloadData.fileName}</strong></li>
            <li>Do not download other participants' sheets</li>
            <li>Each sheet can only be downloaded once</li>
            <li>Unauthorized downloads may result in account suspension</li>
          </ul>
        </div>
      </div>
    `;

    // Store download data for later use
    this.downloadData = downloadData;
  }

  async downloadSecureSheet() {
    try {
      app.showNotification('🔐 Initiating secure download...', 'info');
      
      // Try to create a direct download link
      const response = await app.apiCall(`/games/sheets/direct-download/${this.participationId}/${this.sheetNumber}`);
      
      if (response.directUrl) {
        // Create download link
        const link = document.createElement('a');
        link.href = response.directUrl;
        link.download = this.downloadData.fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        app.showNotification('✅ Secure download started!', 'success');
      } else {
        // Fallback to folder with strong warning
        this.openFolderWithWarning(this.downloadData.downloadOptions.folder);
      }
      
    } catch (error) {
      console.error('Secure download error:', error);
      app.showNotification('Secure download failed. Using folder access as fallback.', 'warning');
      this.openFolderWithWarning(this.downloadData.downloadOptions.folder);
    }
  }

  openFolderWithWarning(folderUrl) {
    const confirmed = confirm(
      `⚠️ SECURITY WARNING ⚠️\n\n` +
      `You are about to access the game sheets folder.\n\n` +
      `IMPORTANT: You are only authorized to download:\n` +
      `"${this.downloadData.fileName}"\n\n` +
      `Downloading other sheets is:\n` +
      `• Against the terms of service\n` +
      `• Unfair to other participants\n` +
      `• May result in account suspension\n\n` +
      `Do you agree to only download your authorized sheet?`
    );

    if (confirmed) {
      window.open(folderUrl, '_blank');
      app.showNotification(`Opening folder. Remember: Only download ${this.downloadData.fileName}`, 'warning');
      
      // Log the folder access for security monitoring
      this.logFolderAccess();
    }
  }

  async logFolderAccess() {
    try {
      await app.apiCall('/games/sheets/log-folder-access', 'POST', {
        participationId: this.participationId,
        sheetNumber: this.sheetNumber,
        gameId: this.gameId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
    } catch (error) {
      console.error('Failed to log folder access:', error);
    }
  }
}

// Initialize secure download manager
const secureDownloadManager = new SecureDownloadManager();