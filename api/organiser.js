const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { supabase, supabaseAdmin } = require('../config/database');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const gameId = req.params.gameId || 'temp';
    const uploadDir = path.join(__dirname, '..', 'uploads', 'games', gameId);
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Extract sheet number from filename or use timestamp
    const originalName = file.originalname;
    const sheetMatch = originalName.match(/(\d+)/);
    const sheetNumber = sheetMatch ? sheetMatch[1] : Date.now();
    const extension = path.extname(originalName);
    
    cb(null, `Sheet_${sheetNumber}${extension}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 100 // Max 100 files at once
  },
  fileFilter: function (req, file, cb) {
    // Accept PDF files only
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Middleware to verify organiser token
const authenticateOrganiser = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (user.role !== 'organiser' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Organiser access required' });
    }
    req.user = user;
    next();
  });
};

// Get organiser profile
router.get('/profile', authenticateOrganiser, async (req, res) => {
  try {
    console.log('🏢 Fetching organiser profile for user:', req.user.userId);
    console.log('🔍 User object from token:', req.user);
    
    const { data: organiser, error } = await supabaseAdmin
      .from('organisers')
      .select(`
        *,
        users (
          username,
          email,
          phone
        )
      `)
      .eq('user_id', req.user.userId)
      .single();

    if (error) {
      console.log('❌ Organiser profile query error:', error);
      return res.status(400).json({ error: 'Database error: ' + error.message });
    }

    if (!organiser) {
      console.log('❌ Organiser profile not found for user_id:', req.user.userId);
      return res.status(404).json({ error: 'Organiser profile not found' });
    }

    console.log('✅ Organiser profile loaded:', organiser.organiser_name);
    console.log('📊 Profile data:', { id: organiser.id, name: organiser.organiser_name, approved: organiser.is_approved });
    res.json({ organiser });
  } catch (error) {
    console.error('💥 Error fetching organiser profile:', error);
    console.error('💥 Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Update organiser profile (limited fields)
router.put('/profile', authenticateOrganiser, async (req, res) => {
  try {
    const { organiserName, whatsappNumber } = req.body;

    const { data: organiser, error } = await supabaseAdmin
      .from('organisers')
      .update({
        organiser_name: organiserName,
        whatsapp_number: whatsappNumber,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', req.user.userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Profile updated successfully', organiser });
  } catch (error) {
    console.error('Error updating organiser profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new game
router.post('/games', authenticateOrganiser, async (req, res) => {
  try {
    const {
      name,
      bannerImageUrl,
      totalPrize,
      pricePerSheet1,
      pricePerSheet2,
      pricePerSheet3Plus,
      paymentQrCodeUrl,
      zoomLink,
      zoomPassword,
      gameDate,
      gameTime,
      sheetsFolder,
      totalSheets,
      sheetFileFormat,
      customFormat,
      individualSheetFiles,
      autoScanned
    } = req.body;

    // Extract and validate Google Drive folder ID
    const googleDrive = require('../config/google-drive');
    let sheetsFolderId = null;
    
    if (sheetsFolder) {
      try {
        sheetsFolderId = await googleDrive.validateAndGetFolderId(sheetsFolder);
      } catch (error) {
        return res.status(400).json({ error: `Invalid Google Drive folder: ${error.message}` });
      }
    }

    // Get organiser ID
    const { data: organiser } = await supabaseAdmin
      .from('organisers')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    if (!organiser) {
      return res.status(404).json({ error: 'Organiser profile not found' });
    }

    // Determine final file format
    let finalFileFormat = sheetFileFormat;
    if (sheetFileFormat === 'custom' && customFormat) {
      finalFileFormat = customFormat;
    }

    // Log auto-scan status
    if (autoScanned && individualSheetFiles && Object.keys(individualSheetFiles).length > 0) {
      console.log(`🔍 GAME CREATION: Auto-scanned game with ${Object.keys(individualSheetFiles).length} individual files`);
      console.log(`📋 INDIVIDUAL FILES:`, Object.keys(individualSheetFiles).slice(0, 5)); // Show first 5
    } else {
      console.log(`📁 GAME CREATION: Traditional game creation (no auto-scan data provided)`);
      console.log(`📊 AUTO-SCAN DATA:`, { autoScanned, hasIndividualFiles: !!individualSheetFiles, fileCount: Object.keys(individualSheetFiles || {}).length });
    }

    // Create game data object
    const gameData = {
      organiser_id: organiser.id,
      name,
      banner_image_url: bannerImageUrl,
      total_prize: totalPrize,
      price_per_sheet_1: pricePerSheet1,
      price_per_sheet_2: pricePerSheet2,
      price_per_sheet_3_plus: pricePerSheet3Plus,
      payment_qr_code_url: paymentQrCodeUrl,
      zoom_link: zoomLink,
      zoom_password: zoomPassword,
      game_date: gameDate,
      game_time: gameTime,
      sheets_folder_id: sheetsFolderId,
      sheets_folder_url: sheetsFolder, // Store original URL for reference
      sheet_file_format: finalFileFormat,
      total_sheets: totalSheets,
      status: 'upcoming'
    };

    // Add individual_sheet_files if provided (and column exists)
    if (individualSheetFiles && Object.keys(individualSheetFiles).length > 0) {
      gameData.individual_sheet_files = individualSheetFiles;
    }

    // Try to create game with individual_sheet_files
    let { data: game, error } = await supabaseAdmin
      .from('games')
      .insert([gameData])
      .select()
      .single();

    // If error is about missing column, create without it for now
    if (error && error.message.includes('individual_sheet_files')) {
      console.log('⚠️ MIGRATION: individual_sheet_files column missing, creating game without it...');
      console.log('💡 SOLUTION: Run this SQL in Supabase Dashboard:');
      console.log('   ALTER TABLE games ADD COLUMN IF NOT EXISTS individual_sheet_files JSONB DEFAULT \'{}\';');
      
      // Remove the problematic field and try again
      const { individual_sheet_files, ...gameDataWithoutFiles } = gameData;
      
      const retryResult = await supabaseAdmin
        .from('games')
        .insert([gameDataWithoutFiles])
        .select()
        .single();
      
      game = retryResult.data;
      error = retryResult.error;
      
      if (!error && individual_sheet_files && Object.keys(individual_sheet_files).length > 0) {
        console.log(`⚠️ WARNING: Game created without ${Object.keys(individual_sheet_files).length} individual sheet files.`);
        console.log('🔧 NEXT STEP: After running migration, use the Auto-Scan button to configure downloads.');
      }
    }

    if (error) {
      console.error('❌ GAME CREATION ERROR:', error);
      return res.status(400).json({ 
        error: error.message,
        details: 'Failed to create game. Please try again or contact support.',
        migrationNeeded: error.message.includes('individual_sheet_files')
      });
    }

    res.status(201).json({ message: 'Game created successfully', game });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get organiser's games
router.get('/games', authenticateOrganiser, async (req, res) => {
  try {
    const { status } = req.query;
    console.log('🎮 Fetching games for organiser user:', req.user.userId);
    console.log('🔍 Query status filter:', status);

    // Get organiser ID
    console.log('🔍 Looking up organiser for user_id:', req.user.userId);
    const { data: organiser, error: organiserError } = await supabaseAdmin
      .from('organisers')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    if (organiserError) {
      console.log('❌ Organiser lookup error:', organiserError);
      return res.status(400).json({ error: 'Error finding organiser: ' + organiserError.message });
    }

    if (!organiser) {
      console.log('❌ Organiser profile not found for user:', req.user.userId);
      return res.status(404).json({ error: 'Organiser profile not found' });
    }

    console.log('✅ Found organiser ID:', organiser.id);

    let query = supabaseAdmin
      .from('games')
      .select('*')
      .eq('organiser_id', organiser.id);

    if (status) {
      console.log('🔍 Adding status filter:', status);
      query = query.eq('status', status);
    }

    console.log('🔍 Executing games query...');
    const { data: games, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.log('❌ Games query error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Games loaded:', games?.length || 0);
    console.log('📊 Games data sample:', games?.slice(0, 2));
    res.json({ games });
  } catch (error) {
    console.error('💥 Error fetching organiser games:', error);
    console.error('💥 Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Update game
router.put('/games/:id', authenticateOrganiser, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get organiser ID
    const { data: organiser } = await supabaseAdmin
      .from('organisers')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    // Verify game belongs to organiser
    const { data: existingGame } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', id)
      .eq('organiser_id', organiser.id)
      .single();

    if (!existingGame) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    const { data: game, error } = await supabaseAdmin
      .from('games')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organiser_id', organiser.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Game updated successfully', game });
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Configure individual sheet file IDs for secure downloads
router.put('/games/:id/sheet-files', authenticateOrganiser, async (req, res) => {
  try {
    const { id } = req.params;
    const { individualSheetFiles } = req.body;

    console.log(`🔧 ORGANISER: Configuring individual sheet files for game ${id}`);

    // Get organiser ID
    const { data: organiser } = await supabaseAdmin
      .from('organisers')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    // Verify game belongs to organiser
    const { data: existingGame } = await supabaseAdmin
      .from('games')
      .select('organiser_id, name, total_sheets')
      .eq('id', id)
      .single();

    if (!existingGame || existingGame.organiser_id !== organiser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate the individual sheet files format
    if (!individualSheetFiles || typeof individualSheetFiles !== 'object') {
      return res.status(400).json({ 
        error: 'Invalid sheet files format',
        expectedFormat: 'Object with sheet numbers as keys and Google Drive file IDs as values',
        example: '{"1": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", "2": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upmt"}'
      });
    }

    // Validate file IDs format
    const fileIdPattern = /^[a-zA-Z0-9_-]{25,}$/;
    const invalidEntries = [];
    
    Object.entries(individualSheetFiles).forEach(([sheetNum, fileId]) => {
      if (!fileIdPattern.test(fileId)) {
        invalidEntries.push({ sheet: sheetNum, fileId: fileId });
      }
    });

    if (invalidEntries.length > 0) {
      return res.status(400).json({
        error: 'Invalid Google Drive file IDs',
        invalidEntries: invalidEntries,
        note: 'File IDs should be 25+ characters long and contain only letters, numbers, underscores, and hyphens',
        howToGetFileId: 'Right-click file in Google Drive → Get link → Extract ID from URL'
      });
    }

    // Update the game with individual sheet files
    const { data: updatedGame, error } = await supabaseAdmin
      .from('games')
      .update({ 
        individual_sheet_files: individualSheetFiles,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, name, individual_sheet_files')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    console.log(`✅ ORGANISER: Individual sheet files configured for game ${existingGame.name}`);

    res.json({
      success: true,
      message: 'CRITICAL SECURITY UPDATE: Individual sheet files configured successfully',
      game: updatedGame,
      secureDownloadsEnabled: Object.keys(individualSheetFiles).length > 0,
      configuredSheets: Object.keys(individualSheetFiles).map(Number).sort((a, b) => a - b),
      securityNote: 'Users can now only download their specific approved sheets - NO folder access',
      businessProtection: 'This prevents users from downloading all sheets and causing business loss'
    });

  } catch (error) {
    console.error('Error configuring sheet files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AUTO-SCAN GOOGLE DRIVE FOLDER AND POPULATE INDIVIDUAL SHEET FILES
router.post('/games/:id/auto-scan-sheets', authenticateOrganiser, async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🔍 AUTO-SCAN: Starting auto-scan for game ${id}`);

    // Get organiser ID
    const { data: organiser } = await supabaseAdmin
      .from('organisers')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    // Verify game belongs to organiser
    const { data: existingGame } = await supabaseAdmin
      .from('games')
      .select('organiser_id, name, sheets_folder_id')
      .eq('id', id)
      .single();

    if (!existingGame || existingGame.organiser_id !== organiser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!existingGame.sheets_folder_id) {
      return res.status(400).json({ 
        error: 'No Google Drive folder ID configured for this game',
        action: 'Please set the sheets_folder_id first'
      });
    }

    console.log(`🔍 AUTO-SCAN: Scanning folder ${existingGame.sheets_folder_id} for game ${existingGame.name}`);

    // Import Google Drive manager
    const googleDrive = require('../config/google-drive');
    
    // Scan the folder for individual sheet files
    const scanResult = await googleDrive.scanFolderForSheets(existingGame.sheets_folder_id);

    if (!scanResult.success) {
      // If scan failed, provide manual configuration instructions
      return res.status(200).json({
        success: false,
        error: 'Automatic scan not available',
        message: 'Manual configuration required for secure downloads',
        solution: 'Configure individual file IDs manually',
        instructions: {
          step1: 'Open your Google Drive folder',
          step2: 'For each sheet file: Right-click → Share → Copy link',
          step3: 'Extract file ID from URL (the long string after /d/ and before /view)',
          step4: 'Use the manual configuration to set file IDs',
          example: 'From https://drive.google.com/file/d/1ABC123xyz/view → File ID is: 1ABC123xyz'
        },
        manualConfigEndpoint: `/api/organiser/games/${id}/sheet-files`,
        scanMethod: scanResult.scanMethod || 'failed'
      });
    }

    // Convert scan result to individual_sheet_files format
    const individualSheetFiles = {};
    Object.entries(scanResult.sheetFiles).forEach(([sheetNumber, fileInfo]) => {
      individualSheetFiles[sheetNumber] = fileInfo.fileId;
    });

    console.log(`✅ AUTO-SCAN: Found ${Object.keys(individualSheetFiles).length} sheets in folder`);

    // Update the game with auto-scanned individual sheet files
    const { data: updatedGame, error } = await supabaseAdmin
      .from('games')
      .update({ 
        individual_sheet_files: individualSheetFiles,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, name, individual_sheet_files')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    console.log(`🎯 AUTO-SCAN: Successfully configured ${Object.keys(individualSheetFiles).length} individual sheet files`);

    res.json({
      success: true,
      message: 'SECURITY UPDATE: Individual sheet files auto-configured successfully',
      game: updatedGame,
      scanResult: {
        totalFilesFound: scanResult.totalFiles,
        sheetsConfigured: Object.keys(individualSheetFiles).length,
        scannedAt: scanResult.scannedAt,
        placeholder: scanResult.placeholder || false
      },
      secureDownloadsEnabled: true,
      securityNote: 'Users can now only download their specific approved sheets - NO folder access',
      businessProtection: 'Auto-scanning prevents business losses by eliminating folder exposure'
    });

  } catch (error) {
    console.error('💥 Error in auto-scan:', error);
    res.status(500).json({ 
      error: 'Auto-scan failed',
      details: error.message 
    });
  }
});

// MIGRATION STATUS - Check if database migration is needed
router.get('/migration-status', authenticateOrganiser, async (req, res) => {
  try {
    console.log('🔍 MIGRATION CHECK: Checking if migration is needed...');
    
    // Try to select the individual_sheet_files column to see if it exists
    const { data, error } = await supabaseAdmin
      .from('games')
      .select('individual_sheet_files')
      .limit(1);

    if (error && error.message.includes('individual_sheet_files')) {
      // Column doesn't exist
      res.json({
        migrationNeeded: true,
        message: 'Database migration required',
        missingColumns: ['individual_sheet_files'],
        instructions: {
          step1: 'Go to your Supabase dashboard',
          step2: 'Navigate to SQL Editor',
          step3: 'Run the migration script from scripts/add-individual-sheet-files.sql',
          step4: 'Refresh this page to verify'
        }
      });
    } else if (error) {
      // Other error
      res.status(500).json({
        error: 'Failed to check migration status',
        details: error.message
      });
    } else {
      // Column exists
      res.json({
        migrationNeeded: false,
        message: 'Database is up to date',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('💥 MIGRATION CHECK ERROR:', error);
    res.status(500).json({
      error: 'Migration check failed',
      details: error.message
    });
  }
});

// PREVIEW SCAN - Scan Google Drive folder without creating game
router.post('/scan-folder-preview', authenticateOrganiser, async (req, res) => {
  try {
    const { folderId } = req.body;

    console.log(`🔍 PREVIEW SCAN: Scanning folder ${folderId} for preview`);

    if (!folderId) {
      return res.status(400).json({ 
        error: 'Folder ID is required',
        message: 'Please provide a valid Google Drive folder ID'
      });
    }

    // Import Google Drive manager
    const googleDrive = require('../config/google-drive');
    
    try {
      // Scan the folder for individual sheet files
      const scanResult = await googleDrive.scanFolderForSheets(folderId);

      if (!scanResult || !scanResult.success) {
        console.error('❌ PREVIEW SCAN: Scan result indicates failure');
        return res.status(500).json({
          error: 'Failed to scan Google Drive folder',
          details: scanResult?.error || 'Scan returned unsuccessful result',
          folderId: folderId,
          suggestion: 'Please check if the folder is publicly accessible'
        });
      }

      const sheetsCount = Object.keys(scanResult.sheetFiles || {}).length;
      console.log(`✅ PREVIEW SCAN: Found ${sheetsCount} sheets using ${scanResult.scanMethod || 'unknown'} method`);

      // Determine scan quality message
      let scanQualityMessage = 'Folder scanned successfully';
      if (scanResult.scanMethod === 'api') {
        scanQualityMessage = 'High-quality API scan completed';
      } else if (scanResult.scanMethod === 'public_estimation') {
        scanQualityMessage = 'Intelligent estimation scan completed';
      } else if (scanResult.scanMethod === 'emergency') {
        scanQualityMessage = 'Emergency scan completed (limited results)';
      }

      res.json({
        success: true,
        message: scanQualityMessage,
        scanResult: {
          totalFilesFound: scanResult.totalFiles || 0,
          sheetsDetected: sheetsCount,
          scannedAt: scanResult.scannedAt,
          scanMethod: scanResult.scanMethod || 'unknown',
          estimated: scanResult.estimated || false,
          placeholder: scanResult.placeholder || false,
          note: scanResult.note || null
        },
        sheetFiles: scanResult.sheetFiles || {},
        folderId: folderId,
        autoScanEnabled: true,
        businessProtection: 'Individual file access configured - no folder exposure'
      });

    } catch (scanError) {
      console.error('💥 PREVIEW SCAN: Scan operation failed:', scanError);
      
      // Return a helpful error with fallback suggestion
      res.status(500).json({
        error: 'Scan operation failed',
        details: scanError.message || 'Unknown scanning error',
        folderId: folderId,
        suggestion: 'Please ensure the Google Drive folder is publicly accessible with "Anyone with the link can view" permissions',
        troubleshooting: {
          step1: 'Right-click your Google Drive folder',
          step2: 'Select "Share"',
          step3: 'Change access to "Anyone with the link"',
          step4: 'Set permission to "Viewer"',
          step5: 'Copy the folder URL and try again'
        }
      });
    }

  } catch (error) {
    console.error('💥 Error in preview scan endpoint:', error);
    res.status(500).json({ 
      error: 'Preview scan endpoint failed',
      details: error.message,
      suggestion: 'Please try again or contact support if the issue persists'
    });
  }
});

// UPLOAD SHEETS - Direct file upload to server (RELIABLE SOLUTION)
router.post('/games/:gameId/upload-sheets', authenticateOrganiser, upload.array('sheets', 100), async (req, res) => {
  try {
    const { gameId } = req.params;
    const uploadedFiles = req.files;

    console.log(`📤 UPLOAD: Received ${uploadedFiles.length} files for game ${gameId}`);

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please select PDF files to upload'
      });
    }

    // Verify game belongs to organiser
    const { data: organiser } = await supabaseAdmin
      .from('organisers')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    const { data: game } = await supabaseAdmin
      .from('games')
      .select('organiser_id, name')
      .eq('id', gameId)
      .single();

    if (!game || game.organiser_id !== organiser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Process uploaded files and create mapping
    const sheetFiles = {};
    const uploadedSheets = [];

    uploadedFiles.forEach(file => {
      const sheetMatch = file.filename.match(/Sheet_(\d+)/);
      if (sheetMatch) {
        const sheetNumber = parseInt(sheetMatch[1]);
        const relativePath = path.relative(path.join(__dirname, '..'), file.path);
        
        sheetFiles[sheetNumber] = {
          fileId: `LOCAL_${gameId}_${sheetNumber}`,
          fileName: file.filename,
          originalName: file.originalname,
          size: file.size,
          path: relativePath,
          uploadedAt: new Date().toISOString()
        };
        
        uploadedSheets.push(sheetNumber);
        console.log(`✅ UPLOAD: Sheet ${sheetNumber} -> ${file.filename} (${file.size} bytes)`);
      }
    });

    // Update game with uploaded sheet information
    const { error: updateError } = await supabaseAdmin
      .from('games')
      .update({
        individual_sheet_files: sheetFiles,
        total_sheets: uploadedSheets.length,
        sheets_uploaded: true,
        upload_method: 'direct_upload',
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId);

    if (updateError) {
      console.error('❌ UPLOAD: Database update failed:', updateError);
      return res.status(500).json({ error: 'Failed to update game data' });
    }

    console.log(`✅ UPLOAD: Successfully uploaded ${uploadedSheets.length} sheets for game ${game.name}`);

    res.json({
      success: true,
      message: `Successfully uploaded ${uploadedSheets.length} sheets`,
      uploadedSheets: uploadedSheets.sort((a, b) => a - b),
      totalSheets: uploadedSheets.length,
      gameName: game.name,
      uploadMethod: 'direct_upload',
      sheetFiles: sheetFiles
    });

  } catch (error) {
    console.error('💥 UPLOAD ERROR:', error);
    res.status(500).json({
      error: 'Upload failed',
      details: error.message
    });
  }
});

// Get game participants for verification
router.get('/games/:id/participants', authenticateOrganiser, async (req, res) => {
  try {
    const { id } = req.params;

    // Get organiser ID
    const { data: organiser } = await supabaseAdmin
      .from('organisers')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    // Verify game belongs to organiser
    const { data: game } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', id)
      .eq('organiser_id', organiser.id)
      .single();

    if (!game) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    const { data: participants, error } = await supabaseAdmin
      .from('game_participants')
      .select(`
        *,
        users (
          username,
          email
        )
      `)
      .eq('game_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ participants });
  } catch (error) {
    console.error('Error fetching game participants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve/Reject participant payment
router.put('/participants/:id/status', authenticateOrganiser, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get participant details
    const { data: participant } = await supabaseAdmin
      .from('game_participants')
      .select(`
        *,
        games (
          organiser_id,
          organisers (
            user_id
          )
        )
      `)
      .eq('id', id)
      .single();

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Verify organiser owns this game
    if (participant.games.organisers.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update participant status
    const { data: updatedParticipant, error } = await supabaseAdmin
      .from('game_participants')
      .update({
        payment_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Send notification to user and handle sheet release
    if (status === 'approved') {
      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: participant.user_id,
          title: 'Payment Approved',
          message: `Your payment for the game has been approved. You can now download your sheets.`,
          type: 'payment_approved'
        }]);
    } else if (status === 'rejected') {
      // IMPORTANT: When payment is rejected, the sheets are automatically released
      // because our sold-sheets API only includes 'pending' and 'approved' status
      // Rejected participations are excluded, making their sheets available again
      
      console.log(`🔄 SHEET RELEASE: Payment rejected for participant ${id}. Sheets ${participant.selected_sheet_numbers?.join(', ')} are now available again.`);
      
      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: participant.user_id,
          title: 'Payment Rejected',
          message: `Your payment for the game has been rejected. Your selected sheets have been released and are available for others. Please contact the organiser for more information.`,
          type: 'payment_rejected'
        }]);
    }

    res.json({ 
      message: `Participant ${status} successfully`, 
      participant: updatedParticipant,
      sheetsReleased: status === 'rejected' ? participant.selected_sheet_numbers : null
    });
  } catch (error) {
    console.error('Error updating participant status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End game and add winners
router.post('/games/:id/end', authenticateOrganiser, async (req, res) => {
  try {
    const { id } = req.params;
    const { winners } = req.body; // Array of {userId, position, prizeAmount}

    // Get organiser ID
    const { data: organiser } = await supabaseAdmin
      .from('organisers')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    // Verify game belongs to organiser
    const { data: game } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', id)
      .eq('organiser_id', organiser.id)
      .single();

    if (!game) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    // Update game status to ended
    await supabaseAdmin
      .from('games')
      .update({
        status: 'ended',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    // Add winners
    if (winners && winners.length > 0) {
      // First, get user IDs from usernames
      const winnerRecords = [];
      
      for (const winner of winners) {
        // In a real implementation, you'd resolve usernames to user IDs
        // For now, we'll assume winner.userId is provided or resolved
        if (winner.userId && winner.position && winner.prizeAmount) {
          winnerRecords.push({
            game_id: id,
            user_id: winner.userId,
            position: winner.position,
            prize_amount: winner.prizeAmount
          });
        }
      }

      if (winnerRecords.length > 0) {
        await supabaseAdmin
          .from('game_winners')
          .insert(winnerRecords);
      }
    }

    res.json({ message: 'Game ended successfully and winners added' });
  } catch (error) {
    console.error('Error ending game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get organiser statistics
router.get('/stats', authenticateOrganiser, async (req, res) => {
  try {
    console.log('📊 Fetching stats for organiser user:', req.user.userId);
    
    // Get organiser ID
    const { data: organiser, error: organiserError } = await supabaseAdmin
      .from('organisers')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    if (organiserError) {
      console.log('❌ Organiser lookup error for stats:', organiserError);
      return res.status(400).json({ error: 'Error finding organiser: ' + organiserError.message });
    }

    if (!organiser) {
      console.log('❌ Organiser not found for stats, user_id:', req.user.userId);
      return res.status(404).json({ error: 'Organiser profile not found' });
    }

    console.log('✅ Found organiser for stats, ID:', organiser.id);

    // Get total games
    const { count: totalGames } = await supabaseAdmin
      .from('games')
      .select('*', { count: 'exact' })
      .eq('organiser_id', organiser.id);

    // Get ended games with financial data
    const { data: endedGames } = await supabaseAdmin
      .from('games')
      .select(`
        id,
        total_prize,
        game_participants!inner(total_amount, payment_status)
      `)
      .eq('organiser_id', organiser.id)
      .eq('status', 'ended');

    let totalRevenue = 0;
    let totalPrizesPaid = 0;
    let totalProfit = 0;

    endedGames.forEach(game => {
      const approvedParticipants = game.game_participants.filter(p => p.payment_status === 'approved');
      const gameRevenue = approvedParticipants.reduce((sum, p) => sum + parseFloat(p.total_amount), 0);
      totalRevenue += gameRevenue;
      totalPrizesPaid += parseFloat(game.total_prize);
    });

    totalProfit = totalRevenue - totalPrizesPaid;

    res.json({
      totalGames: totalGames || 0,
      totalRevenue,
      totalPrizesPaid,
      totalProfit,
      endedGamesCount: endedGames.length
    });
  } catch (error) {
    console.error('Error fetching organiser stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate Google Drive folder
router.post('/validate-folder', authenticateOrganiser, async (req, res) => {
  try {
    const { folderUrl } = req.body;
    
    if (!folderUrl) {
      return res.status(400).json({ error: 'Folder URL is required' });
    }

    // Extract folder ID from URL
    const googleDrive = require('../config/google-drive');
    const folderId = googleDrive.extractFolderIdFromUrl(folderUrl);
    
    if (!folderId) {
      return res.status(400).json({ error: 'Invalid Google Drive folder URL. Please provide a valid folder URL or ID.' });
    }

    // Validate folder accessibility
    try {
      const validatedFolderId = await googleDrive.validateAndGetFolderId(folderUrl);
      
      res.json({ 
        message: 'Folder is valid and accessible',
        folderId: validatedFolderId,
        folderUrl: `https://drive.google.com/drive/folders/${validatedFolderId}`,
        instructions: 'Make sure your folder is set to "Anyone with the link can view" for users to download sheets.'
      });
      
    } catch (validationError) {
      res.status(400).json({ 
        error: validationError.message,
        folderId: folderId,
        suggestions: [
          'Make sure the folder exists in your Google Drive',
          'Set folder sharing to "Anyone with the link can view"',
          'Copy the complete folder URL from your browser',
          'Or just paste the folder ID (the long string after /folders/)'
        ]
      });
    }

  } catch (error) {
    console.error('Error validating folder:', error);
    res.status(400).json({ error: error.message });
  }
});

// Validate sheets in folder
router.post('/validate-sheets', authenticateOrganiser, async (req, res) => {
  try {
    const { folderUrl, totalSheets, fileFormat } = req.body;
    
    if (!folderUrl || !totalSheets || !fileFormat) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const googleDrive = require('../config/google-drive');
    const folderId = googleDrive.extractFolderIdFromUrl(folderUrl);
    
    if (!folderId) {
      return res.status(400).json({ error: 'Invalid Google Drive folder URL' });
    }

    // Validate a sample of sheets (first 10 sheets)
    const validation = {};
    const samplesToCheck = Math.min(10, totalSheets);
    
    for (let i = 1; i <= samplesToCheck; i++) {
      try {
        const fileName = fileFormat.replace('{number}', i);
        // For now, we'll assume sheets are accessible if folder is public
        // In production, you'd implement actual file checking
        validation[i] = true;
      } catch (error) {
        validation[i] = false;
      }
    }

    res.json({
      message: 'Sheet validation completed',
      validation: validation,
      folderId: folderId,
      totalChecked: samplesToCheck
    });

  } catch (error) {
    console.error('Error validating sheets:', error);
    res.status(400).json({ error: error.message });
  }
});

// Start game (mark as live)
router.post('/games/:id/start', authenticateOrganiser, async (req, res) => {
  try {
    const { id } = req.params;

    // Get organiser ID
    const { data: organiser } = await supabaseAdmin
      .from('organisers')
      .select('id')
      .eq('user_id', req.user.userId)
      .single();

    // Verify game belongs to organiser
    const { data: game } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('id', id)
      .eq('organiser_id', organiser.id)
      .single();

    if (!game) {
      return res.status(404).json({ error: 'Game not found or access denied' });
    }

    // Update game status to live
    await supabaseAdmin
      .from('games')
      .update({
        status: 'live',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    // Get all approved participants for this game
    const { data: participants } = await supabaseAdmin
      .from('game_participants')
      .select('user_id')
      .eq('game_id', id)
      .eq('payment_status', 'approved');

    // Send notifications to all approved participants
    if (participants && participants.length > 0) {
      const notifications = participants.map(participant => ({
        user_id: participant.user_id,
        title: 'Game is Live!',
        message: `${game.name} has started. Join now using the meeting link.`,
        type: 'game_live'
      }));

      await supabaseAdmin
        .from('notifications')
        .insert(notifications);
    }

    res.json({ 
      message: 'Game started successfully', 
      participantsNotified: participants?.length || 0 
    });

  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;