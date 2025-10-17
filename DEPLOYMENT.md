# GameBlast Mobile - Deployment Guide

This guide provides step-by-step instructions for deploying GameBlast Mobile to production using Vercel and Supabase.

## 🚀 Quick Deployment Checklist

- [ ] Supabase project created and configured
- [ ] Database schema executed
- [ ] Admin user created
- [ ] Environment variables configured
- [ ] Google Drive API setup (optional)
- [ ] Vercel project deployed
- [ ] Custom domain configured (optional)
- [ ] SSL certificate verified
- [ ] Testing completed

## 📋 Detailed Deployment Steps

### Step 1: Supabase Setup

#### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub
4. Click "New Project"
5. Choose organization and enter project details:
   - Name: \`gameblast-mobile\`
   - Database Password: Generate strong password
   - Region: Choose closest to your users
6. Wait for project creation (2-3 minutes)

#### 1.2 Configure Database
1. Go to SQL Editor in Supabase dashboard
2. Copy and paste the entire contents of \`config/database-schema.sql\`
3. Click "Run" to execute the schema
4. Verify tables are created in Table Editor

#### 1.3 Get API Keys
1. Go to Settings > API
2. Copy the following:
   - Project URL
   - Anon public key
   - Service role key (keep secret!)

#### 1.4 Create Admin User
1. Hash your admin password using bcrypt (strength 10)
2. In SQL Editor, run:
\`\`\`sql
INSERT INTO users (username, email, phone, password_hash, role, is_active) 
VALUES (
  'admin', 
  'your-admin@email.com', 
  '+1234567890', 
  'your_bcrypt_hashed_password', 
  'admin',
  true
);
\`\`\`

### Step 2: Environment Variables Setup

Create a \`.env\` file with the following variables:

\`\`\`env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Secret (generate a random 32+ character string)
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_long

# Admin Configuration
ADMIN_EMAIL=your-admin@email.com
ADMIN_PHONE=+1234567890

# Google Drive API (Optional - for sheet management)
GOOGLE_DRIVE_CLIENT_ID=your_google_drive_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_google_drive_client_secret

# Environment
NODE_ENV=production
\`\`\`

### Step 3: Google Drive API Setup (Optional)

#### 3.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google Drive API:
   - Go to APIs & Services > Library
   - Search "Google Drive API"
   - Click and enable it

#### 3.2 Create Credentials
1. Go to APIs & Services > Credentials
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Configure OAuth consent screen if prompted
4. Choose "Web application"
5. Add authorized redirect URIs:
   - \`http://localhost:3000/auth/google/callback\` (development)
   - \`https://yourdomain.com/auth/google/callback\` (production)
6. Download JSON credentials

#### 3.3 Configure Environment Variables
Add the client ID and secret to your environment variables.

### Step 4: Vercel Deployment

#### 4.1 Install Vercel CLI
\`\`\`bash
npm install -g vercel
\`\`\`

#### 4.2 Deploy Project
\`\`\`bash
# In your project directory
vercel

# Follow the prompts:
# ? Set up and deploy "~/gameblast-mobile"? [Y/n] y
# ? Which scope do you want to deploy to? [your-username]
# ? Link to existing project? [y/N] n
# ? What's your project's name? gameblast-mobile
# ? In which directory is your code located? ./
\`\`\`

#### 4.3 Configure Environment Variables in Vercel
1. Go to Vercel dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add all variables from your \`.env\` file:

| Name | Value | Environment |
|------|-------|-------------|
| SUPABASE_URL | https://your-project.supabase.co | Production |
| SUPABASE_ANON_KEY | your_anon_key | Production |
| SUPABASE_SERVICE_ROLE_KEY | your_service_key | Production |
| JWT_SECRET | your_jwt_secret | Production |
| ADMIN_EMAIL | admin@yourdomain.com | Production |
| ADMIN_PHONE | +1234567890 | Production |
| GOOGLE_DRIVE_CLIENT_ID | your_client_id | Production |
| GOOGLE_DRIVE_CLIENT_SECRET | your_client_secret | Production |
| NODE_ENV | production | Production |

#### 4.4 Redeploy
\`\`\`bash
vercel --prod
\`\`\`

### Step 5: Custom Domain (Optional)

#### 5.1 Add Domain in Vercel
1. Go to your project settings
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

#### 5.2 Configure DNS
Add the following DNS records with your domain provider:

**For apex domain (example.com):**
\`\`\`
Type: A
Name: @
Value: 76.76.19.61
\`\`\`

**For www subdomain:**
\`\`\`
Type: CNAME
Name: www
Value: cname.vercel-dns.com
\`\`\`

#### 5.3 Verify SSL
SSL certificates are automatically provisioned by Vercel. Verify by visiting your domain with HTTPS.

### Step 6: Post-Deployment Configuration

#### 6.1 Test Admin Login
1. Visit your deployed site
2. Go to \`/login\`
3. Select "Admin Login"
4. Use your admin credentials
5. Verify admin panel access

#### 6.2 Configure Platform Settings
1. Login as admin
2. Go to admin panel
3. Update platform settings:
   - Platform name
   - Tagline
   - Disclaimer text
   - Monthly organiser fee

#### 6.3 Add Sample Data (Optional)
1. Create test organiser account
2. Create sample games
3. Add sponsored ads
4. Configure news banner

### Step 7: Production Checklist

#### 7.1 Security Verification
- [ ] All environment variables are secure
- [ ] JWT secret is strong and unique
- [ ] Database RLS policies are active
- [ ] Admin credentials are secure
- [ ] HTTPS is working properly

#### 7.2 Functionality Testing
- [ ] User registration works
- [ ] Organiser registration works
- [ ] Admin login works
- [ ] Game creation works
- [ ] Payment flow works
- [ ] Email notifications work (if implemented)
- [ ] Mobile responsiveness verified
- [ ] PWA installation works

#### 7.3 Performance Optimization
- [ ] Images are optimized
- [ ] CSS/JS is minified
- [ ] Caching headers are set
- [ ] Database queries are optimized
- [ ] Loading times are acceptable

### Step 8: Monitoring & Maintenance

#### 8.1 Set Up Monitoring
1. Enable Vercel Analytics
2. Set up error tracking (Sentry recommended)
3. Monitor database performance in Supabase
4. Set up uptime monitoring

#### 8.2 Backup Strategy
1. Enable Supabase automated backups
2. Set up regular database exports
3. Document recovery procedures

#### 8.3 Update Strategy
1. Use staging environment for testing
2. Implement CI/CD pipeline
3. Plan regular security updates
4. Monitor dependency vulnerabilities

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Issues
- Verify Supabase URL and keys
- Check RLS policies
- Ensure service role key has proper permissions

#### Authentication Problems
- Verify JWT secret is consistent
- Check password hashing
- Ensure user roles are set correctly

#### Deployment Failures
- Check build logs in Vercel
- Verify all environment variables
- Ensure Node.js version compatibility

#### Performance Issues
- Optimize database queries
- Enable caching
- Compress images and assets
- Use CDN for static files

### Getting Help

1. Check Vercel documentation
2. Review Supabase docs
3. Check project logs
4. Contact support if needed

## 📞 Support Contacts

- **Technical Issues**: Check GitHub issues
- **Deployment Help**: Vercel support
- **Database Issues**: Supabase support
- **General Questions**: Project maintainer

---

**Deployment completed successfully!** 🎉

Your GameBlast Mobile platform should now be live and ready for users.