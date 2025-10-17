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

  async getSheetDownloadUrl(folderId, sheetNumber, participantId) {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not initialized');
      }

      // List files in the folder
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and name contains '${sheetNumber}'`,
        fields: 'files(id, name, webContentLink, webViewLink)'
      });

      const files = response.data.files;
      if (files.length === 0) {
        throw new Error(`Sheet ${sheetNumber} not found`);
      }

      const file = files[0];
      
      // Generate a temporary download link
      // In production, you might want to create a signed URL or proxy the download
      return {
        fileId: file.id,
        fileName: file.name,
        downloadUrl: file.webContentLink,
        viewUrl: file.webViewLink
      };

    } catch (error) {
      console.error('Error getting sheet download URL:', error);
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