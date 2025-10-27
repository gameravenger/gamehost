// Image Upload Handler for GameBlast Mobile
// Handles image uploads to various cloud services

class ImageUploadManager {
  constructor() {
    this.supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.uploadServices = {
      imgbb: {
        name: 'ImgBB',
        apiKey: null, // Will be set from admin panel
        endpoint: 'https://api.imgbb.com/1/upload'
      }
    };
  }

  // Create image upload widget (no direct upload to save storage)
  createUploadWidget(containerId, onSuccess, onError) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="image-upload-widget">
        <div class="upload-tabs">
          <button class="upload-tab active" data-tab="drive">📂 Google Drive</button>
          <button class="upload-tab" data-tab="ibb">🖼️ ImgBB</button>
          <button class="upload-tab" data-tab="url">🔗 Direct URL</button>
        </div>
        
        <!-- Google Drive Tab -->
        <div class="upload-content active" id="drive-upload">
          <div class="drive-instructions">
            <h4>📂 How to use Google Drive:</h4>
            <ol>
              <li>Upload your image to Google Drive</li>
              <li>Right-click → "Get link"</li>
              <li>Set to "Anyone with the link can view"</li>
              <li>Copy and paste the link below</li>
            </ol>
          </div>
          <div class="drive-input-section">
            <label>Google Drive Link:</label>
            <input type="url" id="driveUrl" placeholder="https://drive.google.com/file/d/..." class="form-control">
            <button type="button" class="btn btn-secondary" onclick="imageUploadManager.processDriveUrl()">
              🔄 Convert Link
            </button>
          </div>
          <div class="drive-result" id="driveResult" style="display: none;">
            <label>Direct Image URL:</label>
            <input type="url" id="driveDirectUrl" class="form-control" readonly>
            <button type="button" class="btn btn-success" onclick="imageUploadManager.useDriveUrl()">
              ✅ Use This URL
            </button>
          </div>
        </div>
        
        <!-- ImgBB Tab -->
        <div class="upload-content" id="ibb-upload">
          <div class="ibb-instructions">
            <h4>🖼️ How to use ImgBB:</h4>
            <ol>
              <li>Go to <a href="https://imgbb.com" target="_blank">imgbb.com</a></li>
              <li>Upload your image (drag & drop or browse)</li>
              <li>Copy the <strong>Direct Link</strong> (not the page URL)</li>
              <li>Paste it below</li>
            </ol>
          </div>
          <div class="ibb-input-section">
            <label>ImgBB URL:</label>
            <input type="url" id="ibbUrl" placeholder="https://ibb.co/abc123 or https://i.ibb.co/abc123/image.jpg" class="form-control">
            <button type="button" class="btn btn-secondary" onclick="imageUploadManager.processIbbUrl()">
              🔄 Convert Link
            </button>
          </div>
          <div class="ibb-result" id="ibbResult" style="display: none;">
            <label>Direct Image URL:</label>
            <input type="url" id="ibbDirectUrl" class="form-control" readonly>
            <button type="button" class="btn btn-success" onclick="imageUploadManager.useIbbUrl()">
              ✅ Use This URL
            </button>
          </div>
        </div>
        
        <!-- Direct URL Tab -->
        <div class="upload-content" id="url-upload">
          <div class="url-input-section">
            <label>Direct Image URL:</label>
            <input type="url" id="imageUrl" placeholder="https://example.com/image.jpg" class="form-control">
            <button type="button" class="btn btn-secondary" onclick="imageUploadManager.validateImageUrl()">
              🔍 Test & Preview
            </button>
          </div>
          <div class="url-preview" id="urlPreview" style="display: none;">
            <img id="previewImage" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
            <button type="button" class="btn btn-success" onclick="imageUploadManager.useDirectUrl()">
              ✅ Use This URL
            </button>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners(onSuccess, onError);
  }

  setupEventListeners(onSuccess, onError) {
    this.onSuccess = onSuccess;
    this.onError = onError;
    
    // Tab switching
    document.querySelectorAll('.upload-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.upload-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.upload-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-upload`).classList.add('active');
  }


  async validateImageUrl() {
    const urlInput = document.getElementById('imageUrl');
    const preview = document.getElementById('urlPreview');
    const previewImg = document.getElementById('previewImage');
    
    const url = urlInput.value.trim();
    if (!url) {
      app.showNotification('Please enter an image URL', 'warning');
      return;
    }

    try {
      // Test if URL is accessible
      previewImg.onload = () => {
        preview.style.display = 'block';
        app.showNotification('✅ Image URL is valid!', 'success');
      };
      
      previewImg.onerror = () => {
        preview.style.display = 'none';
        app.showNotification('❌ Image URL is not accessible', 'error');
      };
      
      previewImg.src = url;
      
    } catch (error) {
      app.showNotification('Invalid image URL', 'error');
    }
  }

  processDriveUrl() {
    const driveInput = document.getElementById('driveUrl');
    const result = document.getElementById('driveResult');
    const directUrlInput = document.getElementById('driveDirectUrl');
    
    const driveUrl = driveInput.value.trim();
    if (!driveUrl) {
      app.showNotification('Please enter a Google Drive link', 'warning');
      return;
    }

    // Extract file ID from Google Drive URL
    const fileId = driveUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!fileId) {
      app.showNotification('Invalid Google Drive URL format', 'error');
      return;
    }

    // Convert to direct image URL
    const directUrl = `https://drive.google.com/uc?export=view&id=${fileId[1]}`;
    directUrlInput.value = directUrl;
    result.style.display = 'block';
    
    app.showNotification('✅ Google Drive link converted!', 'success');
  }

  useDriveUrl() {
    const directUrl = document.getElementById('driveDirectUrl').value;
    if (this.onSuccess) {
      this.onSuccess(directUrl);
    }
  }

  processIbbUrl() {
    const ibbInput = document.getElementById('ibbUrl');
    const result = document.getElementById('ibbResult');
    const directUrlInput = document.getElementById('ibbDirectUrl');
    
    const ibbUrl = ibbInput.value.trim();
    if (!ibbUrl) {
      app.showNotification('Please enter an ImgBB link', 'warning');
      return;
    }

    let directUrl = null;

    // If it's already a direct URL, use it
    if (ibbUrl.includes('i.ibb.co/') && (ibbUrl.includes('.jpg') || ibbUrl.includes('.png') || ibbUrl.includes('.gif'))) {
      directUrl = ibbUrl;
    }
    // If it's a page URL, try to convert it
    else if (ibbUrl.includes('ibb.co/')) {
      const match = ibbUrl.match(/ibb\.co\/([a-zA-Z0-9]+)/);
      if (match) {
        const id = match[1];
        // We'll test multiple possible formats
        this.testIbbUrls(id, directUrlInput, result);
        return;
      }
    }

    if (directUrl) {
      directUrlInput.value = directUrl;
      result.style.display = 'block';
      app.showNotification('✅ ImgBB URL ready to use!', 'success');
    } else {
      app.showNotification('❌ Invalid ImgBB URL format', 'error');
    }
  }

  async testIbbUrls(id, directUrlInput, result) {
    const possibleUrls = [
      `https://i.ibb.co/${id}.jpg`,
      `https://i.ibb.co/${id}.png`,
      `https://i.ibb.co/${id}.gif`,
      `https://i.ibb.co/${id}/image.jpg`,
      `https://i.ibb.co/${id}/image.png`
    ];

    app.showNotification('🔍 Testing ImgBB URL formats...', 'info');

    for (const url of possibleUrls) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        const isValid = await new Promise((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = url;
          
          // Timeout after 3 seconds
          setTimeout(() => resolve(false), 3000);
        });

        if (isValid) {
          directUrlInput.value = url;
          result.style.display = 'block';
          app.showNotification('✅ Found working ImgBB URL!', 'success');
          return;
        }
      } catch (error) {
        continue;
      }
    }

    app.showNotification('❌ Could not find a working ImgBB direct URL. Try copying the direct link from ImgBB.', 'error');
  }

  useIbbUrl() {
    const directUrl = document.getElementById('ibbDirectUrl').value;
    if (this.onSuccess) {
      this.onSuccess(directUrl);
    }
  }

  useDirectUrl() {
    const directUrl = document.getElementById('imageUrl').value;
    if (this.onSuccess) {
      this.onSuccess(directUrl);
    }
  }

  showProgress(show) {
    const progress = document.getElementById('uploadProgress');
    if (progress) {
      progress.style.display = show ? 'block' : 'none';
    }
  }

  // Get valid image URL (same as existing function but enhanced)
  getValidImageUrl(imageUrl) {
    if (!imageUrl) return '/images/default-game.svg';
    
    // If it's a local path, try SVG version first
    if (imageUrl.startsWith('/images/') && imageUrl.endsWith('.jpg')) {
      return imageUrl.replace('.jpg', '.svg');
    }
    
    // For external URLs, validate and fix them
    if (imageUrl.startsWith('http')) {
      // Fix ibb.co URLs - convert page URLs to direct image URLs
      if (imageUrl.includes('ibb.co/')) {
        // Extract image ID from ibb.co URL
        const match = imageUrl.match(/ibb\.co\/([a-zA-Z0-9]+)/);
        if (match) {
          // Convert to direct image URL
          return `https://i.ibb.co/${match[1]}.jpg`;
        }
        console.warn('Invalid ibb.co URL:', imageUrl);
        return '/images/default-game.svg';
      }
      
      // Fix Google Drive URLs
      if (imageUrl.includes('drive.google.com/file/')) {
        const fileId = imageUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (fileId) {
          return `https://drive.google.com/uc?export=view&id=${fileId[1]}`;
        }
        console.warn('Invalid Google Drive URL:', imageUrl);
        return '/images/default-game.svg';
      }
      
      // For other external URLs, validate they look like image URLs
      if (imageUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) {
        return imageUrl; // Valid image URL
      }
      
      console.warn('Invalid image URL format:', imageUrl);
      return '/images/default-game.svg';
    }
    
    return imageUrl;
  }
}

// Create global instance
const imageUploadManager = new ImageUploadManager();