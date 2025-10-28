const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Initialize cleanup scheduler for Google Drive storage
const CleanupScheduler = require('./scripts/cleanup-scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Import API routes
const authRoutes = require('./api/auth');
const gameRoutes = require('./api/games');
const organiserRoutes = require('./api/organiser');
const adminRoutes = require('./api/admin');
const userRoutes = require('./api/users');
const contactRoutes = require('./api/contact');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/organiser', organiserRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contact', contactRoutes);

// Serve HTML files for different routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/games', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'games.html'));
});

app.get('/game/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game-details.html'));
});

app.get('/how-to-play', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'how-to-play.html'));
});

app.get('/organiser', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'organiser.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/secure-download', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'secure-download.html'));
});

app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html'));
});

app.get('/terms-conditions', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms-conditions.html'));
});

app.get('/disclaimer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'disclaimer.html'));
});

app.get('/refund-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'refund-policy.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/help', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/image-upload-guide.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'image-upload-guide.html'));
});

// Handle 404
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Dashboard: http://localhost:${PORT}`);
  console.log(`👥 Admin: http://localhost:${PORT}/admin.html`);
  console.log(`🎮 Organiser: http://localhost:${PORT}/organiser.html`);
  
  // Initialize Google Drive cleanup scheduler
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_DRIVE_STORAGE_FOLDER_ID) {
    try {
      console.log('☁️ Initializing Google Drive storage cleanup scheduler...');
      new CleanupScheduler();
      console.log('✅ Google Drive auto-cleanup enabled (2-day retention)');
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive cleanup scheduler:', error.message);
      console.log('⚠️ Cleanup scheduler disabled - manual cleanup still available');
    }
  } else {
    console.log('⚠️ Google Drive storage not configured - skipping cleanup scheduler');
    console.log('📖 See GOOGLE_DRIVE_STORAGE_SETUP.md for setup instructions');
  }
});

module.exports = app;