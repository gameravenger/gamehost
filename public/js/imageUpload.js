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

  // Create image upload widget
  createUploadWidget(containerId, onSuccess, onError) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="image-upload-widget">
        <div class="upload-tabs">
          <button class="upload-tab active" data-tab="file">📁 Upload File</button>
          <button class="upload-tab" data-tab="url">🔗 Image URL</button>
          <button class="upload-tab" data-tab="drive">📂 Google Drive</button>
        </div>
        
        <!-- File Upload Tab -->
        <div class="upload-content active" id="file-upload">
          <div class="file-drop-zone" id="dropZone">
            <div class="drop-zone-content">
              <div class="upload-icon">📸</div>
              <p>Drag & drop your image here</p>
              <p class="upload-subtext">or click to browse</p>
              <input type="file" id="fileInput" accept="image/*" style="display: none;">
              <button type="button" class="btn btn-primary" onclick="document.getElementById('fileInput').click()">
                Choose Image
              </button>
            </div>
          </div>
          <div class="upload-progress" id="uploadProgress" style="display: none;">
            <div class="progress-bar">
              <div class="progress-fill" id="progressFill"></div>
            </div>
            <div class="progress-text" id="progressText">Uploading...</div>
          </div>
        </div>
        
        <!-- URL Input Tab -->
        <div class="upload-content" id="url-upload">
          <div class="url-input-section">
            <label>Image URL:</label>
            <input type="url" id="imageUrl" placeholder="https://example.com/image.jpg" class="form-control">
            <button type="button" class="btn btn-secondary" onclick="imageUploadManager.validateImageUrl()">
              🔍 Validate URL
            </button>
          </div>
          <div class="url-preview" id="urlPreview" style="display: none;">
            <img id="previewImage" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
          </div>
        </div>
        
        <!-- Google Drive Tab -->
        <div class="upload-content" id="drive-upload">
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
      </div>
    `;

    this.setupEventListeners(onSuccess, onError);
  }

  setupEventListeners(onSuccess, onError) {
    // Tab switching
    document.querySelectorAll('.upload-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // File input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        this.handleFileSelect(e.target.files[0], onSuccess, onError);
      });
    }

    // Drag and drop
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });

      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          this.handleFileSelect(files[0], onSuccess, onError);
        }
      });
    }
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

  async handleFileSelect(file, onSuccess, onError) {
    if (!this.validateFile(file)) {
      onError('Invalid file. Please select a valid image file under 5MB.');
      return;
    }

    try {
      this.showProgress(true);
      const imageUrl = await this.uploadToImgBB(file);
      this.showProgress(false);
      onSuccess(imageUrl);
    } catch (error) {
      this.showProgress(false);
      onError(`Upload failed: ${error.message}`);
    }
  }

  validateFile(file) {
    if (!file) return false;
    
    // Check file type
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!this.supportedFormats.includes(fileExtension)) {
      return false;
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      return false;
    }

    return true;
  }

  async uploadToImgBB(file) {
    const formData = new FormData();
    formData.append('image', file);

    // Note: In production, the API key should come from your backend
    // For demo purposes, users can get a free key from https://api.imgbb.com/
    const apiKey = 'YOUR_IMGBB_API_KEY'; // This should be configured in admin panel
    
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Upload service unavailable');
    }

    const result = await response.json();
    if (result.success) {
      return result.data.url;
    } else {
      throw new Error(result.error?.message || 'Upload failed');
    }
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
    // Copy to clipboard
    navigator.clipboard.writeText(directUrl).then(() => {
      app.showNotification('✅ Direct URL copied to clipboard!', 'success');
    });
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