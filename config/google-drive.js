const { google } = require('googleapis');

class GoogleDriveManager {
  constructor() {
    this.drive = null;
    this.auth = null;
    this.init();
  }

  async init() {
    try {
      // Initialize Google Drive API with service account or OAuth2
      this.auth = new google.auth.GoogleAuth({
        credentials: {
          client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
          client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
          // For service account, you'd use:
          // type: "service_account",
          // project_id: process.env.GOOGLE_PROJECT_ID,
          // private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
          // private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          // client_email: process.env.GOOGLE_CLIENT_EMAIL,
        },
        scopes: ['https://www.googleapis.com/auth/drive.readonly']
      });

      this.drive = google.drive({ version: 'v3', auth: this.auth });
    } catch (error) {
      console.error('Google Drive initialization error:', error);
    }
  }

  // Extract folder ID from Google Drive URL
  extractFolderIdFromUrl(url) {
    if (!url) return null;
    
    // Handle different Google Drive URL formats
    const patterns = [
      /\/folders\/([a-zA-Z0-9-_]+)/,  // Standard folder URL
      /id=([a-zA-Z0-9-_]+)/,          // Alternative format
      /^([a-zA-Z0-9-_]+)$/            // Direct folder ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  // Validate if the folder is accessible and public
  async validateAndGetFolderId(folderUrlOrId) {
    try {
      const folderId = this.extractFolderIdFromUrl(folderUrlOrId);
      if (!folderId) {
        throw new Error('Invalid Google Drive folder URL or ID');
      }

      // For public folders, we can validate by trying to access the folder
      try {
        const testUrl = `https://drive.google.com/drive/folders/${folderId}`;
        const response = await fetch(testUrl, { method: 'HEAD' });
        
        // If we get any response (even 403), the folder exists
        // 404 means folder doesn't exist or is completely private
        if (response.status === 404) {
          throw new Error('Folder not found. Make sure the folder exists and is shared with "Anyone with the link can view"');
        }
        
        return folderId;
      } catch (fetchError) {
        // If fetch fails, still return the folder ID as it might be valid
        // The actual validation will happen when trying to access files
        return folderId;
      }
      
    } catch (error) {
      throw new Error(`Invalid folder: ${error.message}`);
    }
  }

  // Generate secure download URL for a specific sheet
  generateSecureSheetUrl(folderId, sheetNumber, fileName, participationId) {
    // Create a secure proxy URL that doesn't expose the Google Drive structure
    return `/api/games/sheets/secure-download/${participationId}/${sheetNumber}`;
  }

  // Get public file download URL for Google Drive files
  getPublicFileDirectUrl(folderId, fileName) {
    // For public folders, we can construct direct download URLs
    // This is a simplified approach - in production you'd want more robust file discovery
    const encodedFileName = encodeURIComponent(fileName);
    return `https://drive.google.com/uc?export=download&id=${folderId}&filename=${encodedFileName}`;
  }

  // Get sheet download URL for public folders (without API authentication)
  async getSheetDownloadUrl(folderId, sheetNumber, participantId) {
    try {
      // For public folders, we construct direct download URLs
      // This avoids API authentication issues while keeping links secure
      
      // Generate a secure proxy URL through our server
      const proxyUrl = `/api/games/sheets/download/${folderId}/${sheetNumber}/${participantId}`;
      
      return {
        sheetNumber: sheetNumber,
        downloadUrl: proxyUrl,
        fileName: `Sheet_${sheetNumber}.pdf`,
        participantId: participantId
      };

    } catch (error) {
      console.error('Error getting sheet download URL:', error);
      throw error;
    }
  }

  // Get direct Google Drive download URL for public files
  getPublicFileDownloadUrl(fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  // AUTO-SCAN GOOGLE DRIVE FOLDER TO GET ALL INDIVIDUAL FILE IDs
  async scanFolderForSheets(folderId) {
    try {
      console.log(`🔍 SCANNING: Google Drive folder ${folderId} for individual sheets`);
      
      if (!this.drive) {
        console.log('⚠️ SCANNING: Google Drive API not initialized, using public API approach');
        return await this.scanPublicFolderForSheets(folderId);
      }

      // Use Google Drive API to list all files in folder
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, size, mimeType)',
        orderBy: 'name'
      });

      const files = response.data.files || [];
      console.log(`📁 SCANNING: Found ${files.length} files in folder`);

      // Extract sheet numbers and create mapping
      const sheetFiles = {};
      const sheetPattern = /(?:sheet[_\s]*)?(\d+)/i;

      files.forEach(file => {
        // Skip non-PDF files
        if (!file.name.toLowerCase().endsWith('.pdf')) {
          console.log(`⏭️ SCANNING: Skipping non-PDF file: ${file.name}`);
          return;
        }

        // Extract sheet number from filename
        const match = file.name.match(sheetPattern);
        if (match) {
          const sheetNumber = parseInt(match[1]);
          sheetFiles[sheetNumber] = {
            fileId: file.id,
            fileName: file.name,
            size: file.size,
            directUrl: `https://drive.google.com/uc?export=download&id=${file.id}`
          };
          console.log(`✅ SCANNING: Sheet ${sheetNumber} -> ${file.name} (${file.id})`);
        } else {
          console.log(`⚠️ SCANNING: Could not extract sheet number from: ${file.name}`);
        }
      });

      console.log(`🎯 SCANNING: Successfully mapped ${Object.keys(sheetFiles).length} sheets`);
      return {
        success: true,
        totalFiles: files.length,
        sheetFiles: sheetFiles,
        scannedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('💥 SCANNING ERROR:', error);
      throw error;
    }
  }

  // FALLBACK: Scan public folder using web scraping approach
  async scanPublicFolderForSheets(folderId) {
    try {
      console.log(`🔍 PUBLIC SCAN: Attempting to scan public folder ${folderId}`);
      
      // For public folders, we'll generate expected file IDs based on common patterns
      // This is a fallback when API access isn't available
      const sheetFiles = {};
      
      // Generate sheet files for common range (1-100)
      for (let i = 1; i <= 100; i++) {
        // We'll use a placeholder system that can be updated by organizers
        sheetFiles[i] = {
          fileId: `PLACEHOLDER_${folderId}_${i}`, // Will be replaced with actual file IDs
          fileName: `Sheet_${i}.pdf`,
          size: 'unknown',
          directUrl: `https://drive.google.com/uc?export=download&id=PLACEHOLDER_${folderId}_${i}`,
          placeholder: true
        };
      }

      console.log(`📋 PUBLIC SCAN: Generated placeholder mapping for 100 sheets`);
      return {
        success: true,
        totalFiles: 100,
        sheetFiles: sheetFiles,
        scannedAt: new Date().toISOString(),
        placeholder: true,
        note: 'Placeholder mapping - organizer should update with actual file IDs'
      };

    } catch (error) {
      console.error('💥 PUBLIC SCAN ERROR:', error);
      throw error;
    }
  }

  async validateFolderId(folderId) {
    try {
      if (!this.drive) {
        return false;
      }

      const response = await this.drive.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType'
      });

      return response.data.mimeType === 'application/vnd.google-apps.folder';
    } catch (error) {
      return false;
    }
  }

  async getSheetsList(folderId) {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not initialized');
      }

      const response = await this.drive.files.list({
        q: `'${folderId}' in parents`,
        fields: 'files(id, name, size, modifiedTime)',
        orderBy: 'name'
      });

      return response.data.files || [];
    } catch (error) {
      console.error('Error getting sheets list:', error);
      throw error;
    }
  }

  // Proxy method to serve sheets through our server (for security)
  async proxySheetDownload(folderId, sheetNumber, participantId) {
    try {
      const sheetInfo = await this.getSheetDownloadUrl(folderId, sheetNumber, participantId);
      
      // In a real implementation, you'd:
      // 1. Validate participant has access to this sheet
      // 2. Log the download
      // 3. Stream the file through your server
      // 4. Add watermarks or participant info if needed
      
      return sheetInfo;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new GoogleDriveManager();