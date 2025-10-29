const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const multer = require('multer');

class GoogleDriveStorage {
  constructor() {
    this.drive = null;
    this.auth = null;
    this.initializeAuth();
  }
  
  // Extract folder ID from URL or return ID if already clean
  extractFolderId(folderInput) {
    if (!folderInput) return null;
    
    // If it's already a clean ID (no slashes or special chars), return it
    if (/^[a-zA-Z0-9_-]+$/.test(folderInput)) {
      return folderInput;
    }
    
    // Extract from URL patterns
    const patterns = [
      /\/folders\/([a-zA-Z0-9_-]+)/,  // Standard folder URL
      /id=([a-zA-Z0-9_-]+)/,          // Alternative format
      /^([a-zA-Z0-9_-]+)$/            // Direct folder ID
    ];
    
    for (const pattern of patterns) {
      const match = folderInput.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  async initializeAuth() {
    try {
      // Initialize Google Drive API with service account or OAuth2
      // Support both: JSON string (Vercel env var) or file path (local dev)
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      
      if (!serviceAccountKey) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable not set');
      }
      
      let authConfig;
      
      // Check if it's a JSON string or file path
      if (serviceAccountKey.trim().startsWith('{')) {
        // It's a JSON string - parse and use credentials directly
        console.log('📝 Using Google service account from JSON string (Vercel mode)');
        const credentials = JSON.parse(serviceAccountKey);
        
        authConfig = {
          credentials: credentials,
          scopes: ['https://www.googleapis.com/auth/drive']
        };
      } else {
        // It's a file path - use keyFile
        console.log('📁 Using Google service account from file path (local mode)');
        
        // Check if file exists
        if (!fs.existsSync(serviceAccountKey)) {
          throw new Error(`Service account key file not found: ${serviceAccountKey}`);
        }
        
        authConfig = {
          keyFile: serviceAccountKey,
          scopes: ['https://www.googleapis.com/auth/drive']
        };
      }
      
      this.auth = new google.auth.GoogleAuth(authConfig);
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      
      console.log('✅ Google Drive Storage initialized successfully');
    } catch (error) {
      console.error('❌ Google Drive Storage initialization failed:', error.message);
      console.error('💡 TIP: Set GOOGLE_SERVICE_ACCOUNT_KEY to either:');
      console.error('   1. Full JSON string (for Vercel): {"type":"service_account",...}');
      console.error('   2. File path (for local): /path/to/service-account.json');
      throw error;
    }
  }

  // Compress image files
  async compressImage(inputPath, outputPath, quality = 80) {
    try {
      // Check if input file exists
      if (!fs.existsSync(inputPath)) {
        throw new Error(`Input file does not exist: ${inputPath}`);
      }
      
      const stats = fs.statSync(inputPath);
      const originalSize = stats.size;

      // Determine output format based on input
      const ext = path.extname(inputPath).toLowerCase();
      let sharpInstance = sharp(inputPath);
      
      if (ext === '.jpg' || ext === '.jpeg') {
        sharpInstance = sharpInstance.jpeg({ quality: quality, progressive: true });
      } else if (ext === '.png') {
        sharpInstance = sharpInstance.png({ compressionLevel: 9, progressive: true });
      } else if (ext === '.webp') {
        sharpInstance = sharpInstance.webp({ quality: quality });
      } else {
        // For other formats, convert to JPEG with compression
        sharpInstance = sharpInstance.jpeg({ quality: quality, progressive: true });
      }
      
      await sharpInstance.toFile(outputPath);

      const compressedStats = fs.statSync(outputPath);
      const compressedSize = compressedStats.size;
      const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

      console.log(`📦 COMPRESSION: ${path.basename(inputPath)} - ${originalSize} → ${compressedSize} bytes (${compressionRatio}% reduction)`);
      
      return {
        originalSize,
        compressedSize,
        compressionRatio: parseFloat(compressionRatio),
        outputPath
      };
    } catch (error) {
      console.error('❌ Image compression failed:', error);
      throw error;
    }
  }

  // Compress PDF files (basic optimization)
  async compressPDF(inputPath, outputPath) {
    try {
      // Check if input file exists
      if (!fs.existsSync(inputPath)) {
        throw new Error(`Input file does not exist: ${inputPath}`);
      }
      
      // For now, just copy the file (PDF compression requires more complex libraries)
      // In production, you might want to use pdf-lib or similar
      fs.copyFileSync(inputPath, outputPath);
      
      const stats = fs.statSync(inputPath);
      console.log(`📄 PDF: ${path.basename(inputPath)} - ${stats.size} bytes (no compression applied)`);
      
      return {
        originalSize: stats.size,
        compressedSize: stats.size,
        compressionRatio: 0,
        outputPath
      };
    } catch (error) {
      console.error('❌ PDF processing failed:', error);
      throw error;
    }
  }

  // Upload file to Google Drive
  async uploadFile(filePath, fileName, parentFolderIdOrUrl = null, mimeType = null) {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not initialized');
      }
      
      // Extract clean folder ID from URL or ID
      const parentFolderId = parentFolderIdOrUrl ? this.extractFolderId(parentFolderIdOrUrl) : null;
      
      console.log('🔍 UPLOAD DEBUG:', {
        inputFolderId: parentFolderIdOrUrl,
        extractedFolderId: parentFolderId,
        fileName: fileName
      });
      
      // CRITICAL: Service accounts MUST have a parent folder
      if (!parentFolderId) {
        throw new Error(
          '❌ CRITICAL: No parent folder specified!\n' +
          'Service accounts cannot upload to "My Drive" - they have no storage quota.\n' +
          'You MUST specify a folder ID that is shared with the service account.\n' +
          'Check GOOGLE_DRIVE_STORAGE_FOLDER_ID environment variable.\n' +
          'See GOOGLE_DRIVE_SERVICE_ACCOUNT_FIX.md for setup.'
        );
      }

      const fileMetadata = {
        name: fileName,
        parents: [parentFolderId] // Always required for service accounts
      };

      const media = {
        mimeType: mimeType || 'application/octet-stream',
        body: fs.createReadStream(filePath)
      };

      console.log(`☁️  Uploading to folder: ${parentFolderId}`);

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, size, createdTime, webViewLink, webContentLink'
      });

      // Make file publicly accessible
      await this.drive.permissions.create({
        fileId: response.data.id,
        resource: {
          role: 'reader',
          type: 'anyone'
        }
      });

      console.log(`✅ UPLOADED: ${fileName} - ID: ${response.data.id}`);

      return {
        fileId: response.data.id,
        fileName: response.data.name,
        size: response.data.size,
        createdTime: response.data.createdTime,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${response.data.id}`
      };

    } catch (error) {
      console.error('❌ Google Drive upload failed:', error.message);
      
      // Enhanced error messages for common issues
      if (error.message && error.message.includes('storage quota')) {
        console.error('');
        console.error('💡 SOLUTION: The folder must be SHARED with the service account email!');
        console.error('   1. Open your service account JSON file');
        console.error('   2. Find the "client_email" field');
        console.error('   3. Go to Google Drive and share the folder with that email');
        console.error('   4. Give it "Editor" permission (not Viewer!)');
        console.error('   5. The email looks like: name@project.iam.gserviceaccount.com');
        console.error('');
        console.error('📖 See QUICK_FIX_CHECKLIST.md for detailed instructions');
        console.error('');
      } else if (error.code === 404) {
        console.error('');
        console.error('💡 SOLUTION: Folder not found or not shared!');
        console.error(`   - Folder ID used: ${parentFolderId || 'NONE!'}`);
        console.error('   - Check GOOGLE_DRIVE_STORAGE_FOLDER_ID is correct');
        console.error('   - Ensure folder is shared with service account email');
        console.error('');
      } else if (error.code === 403) {
        console.error('');
        console.error('💡 SOLUTION: Permission denied!');
        console.error('   - Service account needs "Editor" permission (not "Viewer")');
        console.error('   - Check folder sharing settings in Google Drive');
        console.error('');
      }
      
      throw error;
    }
  }

  // Delete file from Google Drive
  async deleteFile(fileId) {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not initialized');
      }

      await this.drive.files.delete({
        fileId: fileId
      });

      console.log(`🗑️ DELETED: File ${fileId} from Google Drive`);
      return true;

    } catch (error) {
      console.error('❌ Google Drive deletion failed:', error);
      throw error;
    }
  }

  // Create folder in Google Drive
  async createFolder(folderName, parentFolderIdOrUrl = null) {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not initialized');
      }
      
      // Extract clean folder ID from URL or ID
      const parentFolderId = parentFolderIdOrUrl ? this.extractFolderId(parentFolderIdOrUrl) : null;

      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : undefined
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id, name'
      });

      console.log(`📁 CREATED FOLDER: ${folderName} - ID: ${response.data.id}`);
      return response.data.id;

    } catch (error) {
      console.error('❌ Folder creation failed:', error);
      throw error;
    }
  }

  // Get files older than specified days
  async getOldFiles(daysOld = 2, folderIdOrUrl = null) {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not initialized');
      }
      
      // Extract clean folder ID from URL or ID
      const folderId = folderIdOrUrl ? this.extractFolderId(folderIdOrUrl) : null;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffISO = cutoffDate.toISOString();

      let query = `createdTime < '${cutoffISO}' and trashed = false`;
      if (folderId) {
        query += ` and '${folderId}' in parents`;
      }

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, createdTime, size)',
        pageSize: 1000
      });

      return response.data.files || [];

    } catch (error) {
      console.error('❌ Failed to get old files:', error);
      throw error;
    }
  }

  // Clean up old files (auto-delete after 2 days)
  async cleanupOldFiles(daysOld = 2, folderId = null) {
    try {
      const oldFiles = await this.getOldFiles(daysOld, folderId);
      
      if (oldFiles.length === 0) {
        console.log('🧹 CLEANUP: No old files to delete');
        return { deletedCount: 0, totalSize: 0 };
      }

      let deletedCount = 0;
      let totalSize = 0;

      console.log(`🧹 CLEANUP: Found ${oldFiles.length} files older than ${daysOld} days`);

      for (const file of oldFiles) {
        try {
          await this.deleteFile(file.id);
          deletedCount++;
          totalSize += parseInt(file.size || 0);
          console.log(`🗑️ DELETED: ${file.name} (${file.size} bytes)`);
        } catch (error) {
          console.error(`❌ Failed to delete ${file.name}:`, error.message);
        }
      }

      console.log(`✅ CLEANUP COMPLETE: Deleted ${deletedCount}/${oldFiles.length} files (${totalSize} bytes freed)`);

      return {
        deletedCount,
        totalFiles: oldFiles.length,
        totalSize,
        errors: oldFiles.length - deletedCount
      };

    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }
}

// Multer storage engine for Google Drive
class MulterGoogleDriveStorage {
  constructor(options = {}) {
    this.driveStorage = new GoogleDriveStorage();
    this.tempDir = options.tempDir || '/tmp';
    this.compressionQuality = options.compressionQuality || 80;
    
    // CRITICAL: Extract and validate folder ID
    const rawFolderId = options.parentFolderId;
    if (!rawFolderId || rawFolderId.trim() === '') {
      throw new Error(
        '❌ GOOGLE_DRIVE_STORAGE_FOLDER_ID is required!\n' +
        'Service accounts cannot upload to "My Drive" - you must specify a shared folder.\n' +
        'Set GOOGLE_DRIVE_STORAGE_FOLDER_ID in your environment variables.\n' +
        'See GOOGLE_DRIVE_SERVICE_ACCOUNT_FIX.md for setup instructions.'
      );
    }
    
    // Extract folder ID from URL or use as-is
    this.parentFolderId = this.driveStorage.extractFolderId(rawFolderId);
    
    if (!this.parentFolderId) {
      throw new Error(
        `❌ Invalid GOOGLE_DRIVE_STORAGE_FOLDER_ID: "${rawFolderId}"\n` +
        'Please provide either:\n' +
        '  - Folder ID: 1PIgEhMR2-rVHbbfpELSYDakzYlEkWBXM\n' +
        '  - Full URL: https://drive.google.com/drive/folders/1PIgEhMR2-rVHbbfpELSYDakzYlEkWBXM'
      );
    }
    
    console.log(`✅ Google Drive upload folder configured: ${this.parentFolderId}`);
  }

  _handleFile(req, file, cb) {
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(this.tempDir, `temp_${Date.now()}_${file.originalname}`);
    const compressedFilePath = path.join(this.tempDir, `compressed_${Date.now()}_${file.originalname}`);

    const writeStream = fs.createWriteStream(tempFilePath);
    file.stream.pipe(writeStream);

    writeStream.on('error', cb);
    writeStream.on('finish', async () => {
      try {
        let finalFilePath = tempFilePath;
        let compressionInfo = null;

        // Compress based on file type
        if (file.mimetype.startsWith('image/')) {
          compressionInfo = await this.driveStorage.compressImage(tempFilePath, compressedFilePath, this.compressionQuality);
          finalFilePath = compressedFilePath;
        } else if (file.mimetype === 'application/pdf') {
          compressionInfo = await this.driveStorage.compressPDF(tempFilePath, compressedFilePath);
          finalFilePath = compressedFilePath;
        } else {
          // For other file types, use original file
          finalFilePath = tempFilePath;
          compressionInfo = {
            originalSize: fs.statSync(tempFilePath).size,
            compressedSize: fs.statSync(tempFilePath).size,
            compressionRatio: 0,
            outputPath: tempFilePath
          };
        }

        // Upload to Google Drive
        console.log(`📤 Multer: Uploading ${file.originalname} to folder: ${this.parentFolderId}`);
        
        const uploadResult = await this.driveStorage.uploadFile(
          finalFilePath,
          file.originalname,
          this.parentFolderId,
          file.mimetype
        );

        // Clean up temp files
        fs.unlinkSync(tempFilePath);
        if (finalFilePath !== tempFilePath) {
          fs.unlinkSync(finalFilePath);
        }

        // Return file info
        cb(null, {
          ...uploadResult,
          originalName: file.originalname,
          mimetype: file.mimetype,
          compression: compressionInfo
        });

      } catch (error) {
        // Clean up temp files on error
        try {
          fs.unlinkSync(tempFilePath);
          if (fs.existsSync(compressedFilePath)) {
            fs.unlinkSync(compressedFilePath);
          }
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
        cb(error);
      }
    });
  }

  _removeFile(req, file, cb) {
    // File is already on Google Drive, so we just need to delete it from there
    this.driveStorage.deleteFile(file.fileId)
      .then(() => cb(null))
      .catch(cb);
  }
}

module.exports = {
  GoogleDriveStorage,
  MulterGoogleDriveStorage
};