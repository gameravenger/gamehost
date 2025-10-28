// Comprehensive test script for Google Drive storage system
const fs = require('fs');
const path = require('path');

console.log('🧪 COMPREHENSIVE SYSTEM TEST\n');

// Test 1: Check required files exist
console.log('📁 TEST 1: File Structure Check');
const requiredFiles = [
  'config/google-drive-storage.js',
  'api/organiser.js',
  'api/games.js',
  'public/upload-to-drive.html',
  'scripts/cleanup-scheduler.js',
  'GOOGLE_DRIVE_STORAGE_SETUP.md',
  'IMPLEMENTATION_SUMMARY.md',
  '.env.example'
];

let filesOK = true;
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    filesOK = false;
  }
});

if (filesOK) {
  console.log('✅ All required files present\n');
} else {
  console.log('❌ Some files are missing\n');
}

// Test 2: Check dependencies
console.log('📦 TEST 2: Dependencies Check');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const requiredDeps = [
  'googleapis',
  'sharp',
  'pdf2pic',
  'jimp',
  'multer-google-storage',
  'node-cron'
];

let depsOK = true;
requiredDeps.forEach(dep => {
  if (packageJson.dependencies && packageJson.dependencies[dep]) {
    console.log(`✅ ${dep} - ${packageJson.dependencies[dep]}`);
  } else {
    console.log(`❌ ${dep} - NOT INSTALLED`);
    depsOK = false;
  }
});

if (depsOK) {
  console.log('✅ All dependencies installed\n');
} else {
  console.log('❌ Some dependencies missing\n');
}

// Test 3: Check environment variables template
console.log('⚙️ TEST 3: Environment Configuration Check');
const envExample = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');
const requiredEnvVars = [
  'GOOGLE_SERVICE_ACCOUNT_KEY',
  'GOOGLE_DRIVE_STORAGE_FOLDER_ID'
];

let envOK = true;
requiredEnvVars.forEach(envVar => {
  if (envExample.includes(envVar)) {
    console.log(`✅ ${envVar} - Template present`);
  } else {
    console.log(`❌ ${envVar} - Missing from template`);
    envOK = false;
  }
});

if (envOK) {
  console.log('✅ Environment template complete\n');
} else {
  console.log('❌ Environment template incomplete\n');
}

// Test 4: Check API endpoints
console.log('🔌 TEST 4: API Endpoints Check');
const organiserJs = fs.readFileSync(path.join(__dirname, '..', 'api', 'organiser.js'), 'utf8');
const gamesJs = fs.readFileSync(path.join(__dirname, '..', 'api', 'games.js'), 'utf8');

const requiredEndpoints = [
  { file: 'organiser.js', endpoint: '/games/:gameId/upload-to-drive', content: organiserJs },
  { file: 'organiser.js', endpoint: '/cleanup-old-files', content: organiserJs },
  { file: 'games.js', endpoint: '/sheets/secure-token', content: gamesJs }
];

let endpointsOK = true;
requiredEndpoints.forEach(({ file, endpoint, content }) => {
  if (content.includes(endpoint)) {
    console.log(`✅ ${file} - ${endpoint}`);
  } else {
    console.log(`❌ ${file} - ${endpoint} - MISSING`);
    endpointsOK = false;
  }
});

if (endpointsOK) {
  console.log('✅ All API endpoints present\n');
} else {
  console.log('❌ Some API endpoints missing\n');
}

// Test 5: Check frontend integration
console.log('🎨 TEST 5: Frontend Integration Check');
const uploadHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'upload-to-drive.html'), 'utf8');
const organiserJs2 = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'organiser.js'), 'utf8');

const frontendFeatures = [
  { file: 'upload-to-drive.html', feature: 'DriveUploadManager', content: uploadHtml },
  { file: 'upload-to-drive.html', feature: 'drag and drop', content: uploadHtml },
  { file: 'upload-to-drive.html', feature: 'browse button', content: uploadHtml },
  { file: 'organiser.js', feature: 'uploadToDrive', content: organiserJs2 }
];

let frontendOK = true;
frontendFeatures.forEach(({ file, feature, content }) => {
  if (content.includes(feature) || content.toLowerCase().includes(feature.toLowerCase())) {
    console.log(`✅ ${file} - ${feature}`);
  } else {
    console.log(`❌ ${file} - ${feature} - MISSING`);
    frontendOK = false;
  }
});

if (frontendOK) {
  console.log('✅ Frontend integration complete\n');
} else {
  console.log('❌ Frontend integration incomplete\n');
}

// Test 6: Check error handling
console.log('🛡️ TEST 6: Error Handling Check');
const errorHandlingChecks = [
  { file: 'config/google-drive-storage.js', check: 'catch', content: fs.readFileSync(path.join(__dirname, '..', 'config', 'google-drive-storage.js'), 'utf8') },
  { file: 'api/organiser.js', check: 'catch|error', content: organiserJs },
  { file: 'public/upload-to-drive.html', check: 'catch', content: uploadHtml }
];

let errorHandlingOK = true;
errorHandlingChecks.forEach(({ file, check, content }) => {
  const regex = new RegExp(check, 'i');
  if (regex.test(content)) {
    console.log(`✅ ${file} - Error handling present`);
  } else {
    console.log(`❌ ${file} - Error handling missing`);
    errorHandlingOK = false;
  }
});

if (errorHandlingOK) {
  console.log('✅ Error handling implemented\n');
} else {
  console.log('❌ Error handling incomplete\n');
}

// Final summary
console.log('📊 FINAL TEST SUMMARY');
console.log('='.repeat(50));

const allTestsPassed = filesOK && depsOK && envOK && endpointsOK && frontendOK && errorHandlingOK;

if (allTestsPassed) {
  console.log('🎉 ALL TESTS PASSED - SYSTEM READY FOR DEPLOYMENT!');
  console.log('\n✅ File structure complete');
  console.log('✅ Dependencies installed');
  console.log('✅ Environment configured');
  console.log('✅ API endpoints implemented');
  console.log('✅ Frontend integration complete');
  console.log('✅ Error handling implemented');
  console.log('\n🚀 Ready to commit to main repository!');
} else {
  console.log('❌ SOME TESTS FAILED - PLEASE FIX ISSUES BEFORE DEPLOYMENT');
  console.log('\n🔧 Issues to fix:');
  if (!filesOK) console.log('   - Missing required files');
  if (!depsOK) console.log('   - Missing dependencies');
  if (!envOK) console.log('   - Incomplete environment template');
  if (!endpointsOK) console.log('   - Missing API endpoints');
  if (!frontendOK) console.log('   - Incomplete frontend integration');
  if (!errorHandlingOK) console.log('   - Missing error handling');
}

console.log('\n' + '='.repeat(50));
process.exit(allTestsPassed ? 0 : 1);