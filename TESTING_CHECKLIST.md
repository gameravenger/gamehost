# 🧪 GameBlast Mobile - Complete Testing Checklist

## ✅ **End-to-End Testing Guide**

### **🏠 Homepage Testing**
- [ ] Disclaimer banner displays at top
- [ ] Header navigation works (all links)
- [ ] News ticker scrolls smoothly (if content added)
- [ ] Sponsored ads section (hidden if no ads, shows when ads added)
- [ ] Hero section buttons work (Games, Leaderboard)
- [ ] Featured games carousel displays and scrolls
- [ ] Top games carousel displays and scrolls
- [ ] Footer links work
- [ ] Mobile responsive design
- [ ] PWA installation prompt

### **🔐 Authentication Testing**
- [ ] User registration works (username, email, phone, password)
- [ ] User login works (email/phone + password)
- [ ] Organiser registration works (all fields including Aadhaar URLs)
- [ ] Admin login works
- [ ] Logout functionality works
- [ ] Password validation works
- [ ] Duplicate user prevention works
- [ ] JWT token handling works

### **🎮 Game System Testing**
- [ ] Games listing page loads
- [ ] Game filters work (All, Upcoming, Live)
- [ ] Game search works
- [ ] Individual game details page loads
- [ ] Sheet selection works (1, 2, 3+ pricing tiers)
- [ ] Sheet grid displays and selection works
- [ ] Payment modal opens with QR code
- [ ] UTR verification form works
- [ ] Payment submission works

### **🎯 Organiser Panel Testing**
- [ ] Organiser dashboard loads after approval
- [ ] Profile management works (editable fields only)
- [ ] Game creation form works
- [ ] Google Drive folder URL validation works
- [ ] Sheet format selection works
- [ ] Game creation saves correctly
- [ ] Active games display
- [ ] Participant management works
- [ ] Payment verification (approve/reject) works
- [ ] Game start functionality works
- [ ] Game end functionality with winners works
- [ ] Analytics and history display

### **⚙️ Admin Panel Testing**
- [ ] Admin dashboard loads
- [ ] User management displays all users
- [ ] Organiser approval system works
- [ ] Games management displays all games
- [ ] Featured games management works
- [ ] Top games management works
- [ ] Sponsored ads management works
- [ ] News banner management works
- [ ] Platform settings save correctly
- [ ] Ad network scripts save correctly
- [ ] Data export functionality works

### **📱 Mobile Testing**
- [ ] All pages responsive on mobile
- [ ] Touch interactions work
- [ ] PWA installation works
- [ ] Offline functionality works
- [ ] Mobile menu works
- [ ] Forms work on mobile keyboards
- [ ] Payment QR scanning works on mobile
- [ ] Meeting links open correctly on mobile

### **🔒 Security Testing**
- [ ] JWT tokens expire correctly
- [ ] Role-based access control works
- [ ] API endpoints require proper authentication
- [ ] No sensitive data in client-side code
- [ ] Password hashing works
- [ ] SQL injection prevention
- [ ] XSS prevention

### **🔗 Google Drive Integration Testing**
- [ ] Folder URL extraction works
- [ ] Folder validation works
- [ ] Sheet format validation works
- [ ] Sheet download links generate correctly
- [ ] Access control for sheet downloads works
- [ ] No Google Drive links exposed to users

### **📊 Data Flow Testing**
- [ ] User registration → Login → Game participation flow
- [ ] Organiser registration → Approval → Game creation flow
- [ ] Game creation → User participation → Payment → Approval flow
- [ ] Payment verification → Sheet download flow
- [ ] Game start → Notifications → Live game flow
- [ ] Game end → Winners → Leaderboard flow

---

## 🚀 **Deployment Testing Steps**

### **Step 1: Local Testing**
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your Supabase and other credentials

# Run locally
npm run dev

# Test all functionality locally
```

### **Step 2: Database Testing**
```sql
-- Test database schema
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Test user creation
INSERT INTO users (username, email, phone, password_hash, role) 
VALUES ('testuser', 'test@example.com', '+1234567890', '$2a$10$hash', 'user');

-- Test organiser creation
-- Test game creation
-- Test all relationships
```

### **Step 3: API Testing**
```bash
# Test authentication endpoints
curl -X POST localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","phone":"+1234567890","password":"test123"}'

# Test protected endpoints
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  localhost:3000/api/users/profile

# Test all CRUD operations
```

### **Step 4: Frontend Testing**
- [ ] Test all user interactions
- [ ] Test form validations
- [ ] Test error handling
- [ ] Test loading states
- [ ] Test responsive design
- [ ] Test PWA functionality

### **Step 5: Integration Testing**
- [ ] Test complete user journey
- [ ] Test organiser workflow
- [ ] Test admin operations
- [ ] Test Google Drive integration
- [ ] Test notifications system
- [ ] Test real-time updates

---

## 🐛 **Common Issues & Solutions**

### **Database Issues**
- **Issue**: RLS policies blocking queries
- **Solution**: Check user authentication and role-based policies

### **Authentication Issues**
- **Issue**: JWT token not working
- **Solution**: Verify JWT_SECRET is consistent and tokens are properly formatted

### **Google Drive Issues**
- **Issue**: Folder not accessible
- **Solution**: Ensure folder is public (Anyone with link can view)

### **Mobile Issues**
- **Issue**: PWA not installing
- **Solution**: Check manifest.json and service worker registration

### **API Issues**
- **Issue**: CORS errors
- **Solution**: Verify CORS configuration in server.js

---

## ✅ **Production Readiness Checklist**

### **Security**
- [ ] All environment variables secured
- [ ] JWT secret is strong and unique
- [ ] Database RLS policies active
- [ ] No sensitive data in client code
- [ ] HTTPS enabled
- [ ] Input validation on all forms

### **Performance**
- [ ] Images optimized
- [ ] CSS/JS minified
- [ ] Database queries optimized
- [ ] Caching headers set
- [ ] CDN configured (optional)

### **Functionality**
- [ ] All core features working
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Mobile optimization complete
- [ ] PWA functionality working

### **Content**
- [ ] Platform settings configured
- [ ] Admin account created
- [ ] Legal pages reviewed
- [ ] Default content added
- [ ] Test data cleaned up

### **Monitoring**
- [ ] Error tracking setup (optional)
- [ ] Analytics configured (optional)
- [ ] Uptime monitoring (optional)
- [ ] Performance monitoring (optional)

---

## 🎯 **User Acceptance Testing Scenarios**

### **Scenario 1: New User Journey**
1. User visits homepage
2. User registers account
3. User browses games
4. User selects game and sheets
5. User makes payment
6. User waits for approval
7. User downloads sheets
8. User joins live game
9. User checks leaderboard

### **Scenario 2: Organiser Journey**
1. Organiser registers with documents
2. Admin approves organiser
3. Organiser creates game with Google Drive folder
4. Users register for game
5. Organiser verifies payments
6. Organiser starts game
7. Organiser ends game with winners
8. Winners appear on leaderboard

### **Scenario 3: Admin Journey**
1. Admin logs in
2. Admin approves pending organisers
3. Admin sets featured games
4. Admin adds sponsored ads
5. Admin configures platform settings
6. Admin exports platform data

---

## 📋 **Final Deployment Checklist**

- [ ] All tests pass
- [ ] Database schema deployed
- [ ] Environment variables configured
- [ ] Domain configured (if using custom domain)
- [ ] SSL certificate active
- [ ] Admin account created and tested
- [ ] Platform settings configured
- [ ] Sample content added
- [ ] Legal pages reviewed
- [ ] Mobile testing complete
- [ ] Performance testing complete
- [ ] Security testing complete
- [ ] Backup strategy in place

---

**🎉 Ready for Production!**

Once all items are checked, your GameBlast Mobile platform is ready for live users!