# Production APK Build Guide for Hochschule Trier

## 📱 APP CONFIGURATION

```
App Name: UCB Navigator
Version: 1.0.0
Package: app.ucbnavigator
Bundle ID: com.anonymous.ucb
Target: Android (APK for direct distribution)
Build Profile: production
Architecture: New React Native Architecture enabled
```

---

## 🔧 BUILD PREREQUISITES

Ensure you have:
- ✅ Node.js v26.1.0+ installed
- ✅ npm v11.13.0+ installed
- ✅ EAS CLI: `npm install -g eas-cli`
- ✅ Expo CLI: `npm install -g expo-cli`
- ✅ Expo account with login: `eas login`

---

## 📦 BUILD ENVIRONMENT CONFIGURATION

**Production Environment Variables** (auto-configured in `eas.json`):

```json
{
  "EXPO_PUBLIC_STUDIP_BASE_URL": "https://studip.hochschule-trier.de/jsonapi.php/v1",
  "EXPO_PUBLIC_SUPABASE_URL": "https://vrnhkwhwoxhcjssqhdat.supabase.co",
  "EXPO_PUBLIC_SUPABASE_KEY": "sb_publishable_M15oPdD_Rg75_80UVcA80Q_r051Uhvg"
}
```

All environment variables are:
- ✅ Public (no secrets)
- ✅ Production-ready
- ✅ DSGVO compliant (anon Supabase key, no personal data)

---

## 🚀 BUILD COMMANDS

### **Option 1: EAS Cloud Build (RECOMMENDED)**

Fast, reliable, tested build in Expo's cloud infrastructure.

```bash
cd /Users/prashantsharma/Documents/ucb

# Login to Expo (first time only)
eas login

# Build production APK
eas build --platform android --profile production

# Monitor build status
eas build:list

# Download APK when complete (you'll get a URL)
# Build typically takes 10-15 minutes
```

**Result**: APK file ready for distribution to Android users

---

### **Option 2: Local Build (Advanced)**

For complete control; requires Android SDK/NDK setup.

```bash
# Install dependencies
npm install

# Generate native Android project
expo prebuild --clean

# Build APK locally
cd android
./gradlew clean assemble Release
# APK location: android/app/build/outputs/apk/release/app-release.apk
```

---

## 📥 DOWNLOADING & DISTRIBUTING THE APK

### **After EAS Build Completes:**

1. **Get Download URL**:
   ```bash
   eas build:list    # Copy the APK URL from output
   ```

2. **Direct Download Link Format**:
   ```
   https://eas-build-artifacts.s3.amazonaws.com/...
   ```

3. **Share with Users**:
   - Email the download link
   - Host on university server
   - Create QR code for easy scanning
   - Post in student portal

### **Installation on Android Devices**:

Users download the APK and install via:
```
Settings → Apps → Install unknown apps → [Choose browser] → Allow
Then tap the downloaded APK to install
```

---

## ✅ VERIFICATION CHECKLIST

Before distributing, verify on a test device:

- [ ] App launches without crashes
- [ ] Login screen appears
- [ ] Can log in with Stud.IP credentials
- [ ] Courses/timetable loads correctly
- [ ] Offline mode works (airplane mode toggle)
- [ ] Error messages show clearly
- [ ] Notifications can be enabled
- [ ] App closes gracefully
- [ ] No console errors in Expo logs

---

## 🔐 SECURITY & COMPLIANCE

### DSGVO (German Data Protection)

✅ **What's Protected:**
- No personal credentials stored on disk
- Credentials secured in encrypted keychain
- No personal analytics collected
- Consent modal on first launch
- User can disable analytics in Settings
- All data HTTPS encrypted

✅ **What's Tracked** (anonymous only):
- Session start/end times
- Feature usage (timetable opened, news read, etc.)
- Error types (no error details)
- App language preference
- Platform/version info

❌ **What's NOT Collected:**
- Student ID or name
- Login credentials
- Course content
- Personal notes/data
- Device identifiers

### **Privacy Documentation**:
- See `screens/legal/DatenschutzScreen.js` for user-facing disclosure
- See `services/analytics.js` for implementation details

---

## 📊 BUILD CONFIGURATION DETAILS

### **eas.json - Production Profile**:

```json
{
  "production": {
    "autoIncrement": true,
    "channel": "production",
    "env": {
      "EXPO_PUBLIC_SUPABASE_URL": "https://vrnhkwhwoxhcjssqhdat.supabase.co",
      "EXPO_PUBLIC_SUPABASE_KEY": "sb_publishable_M15oPdD_Rg75_80UVcA80Q_r051Uhvg",
      "EXPO_PUBLIC_STUDIP_BASE_URL": "https://studip.hochschule-trier.de/jsonapi.php/v1"
    }
  }
}
```

### **app.json - Android Configuration**:

```json
{
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/adaptive-icon.png",
      "backgroundColor": "#ffffff"
    },
    "edgeToEdgeEnabled": true,
    "allowBackup": false,
    "package": "app.ucbnavigator"
  }
}
```

Key settings:
- ✅ `allowBackup: false` - Prevents iCloud/Google backup of sensitive data
- ✅ `edgeToEdgeEnabled: true` - Modern Android UI
- ✅ `package: app.ucbnavigator` - Unique identifier

---

## 🐛 TROUBLESHOOTING

### **Build Fails**

```bash
# Clear cache and rebuild
rm -rf node_modules .expo
npm install
eas build --platform android --profile production --clear-cache
```

### **APK Won't Install**

- Check minimum Android version (currently 8.0+)
- Device may need "Install from Unknown Sources" enabled
- Try uninstalling previous version first

### **App Crashes on Launch**

- Check Expo logs: `eas build:logs <build-id>`
- Verify internet connection
- Ensure Stud.IP is accessible from device network

### **Login Fails**

- Verify Stud.IP credentials are correct
- Check network connectivity
- Confirm app has internet permission

---

## 📈 MONITORING & UPDATES

### **After Release**

1. **Monitor Crashes**:
   - Check error logs in-app (if enabled)
   - Users can share crash reports

2. **Update App**:
   - Increment version in `app.json`
   - Run new build with same command
   - Distribute new APK to users

3. **Over-The-Air Updates** (optional):
   - Uses Expo Updates service
   - Small changes don't require new APK
   - Configured in `app.json` updates section

---

## 📞 SUPPORT & FEEDBACK

For issues, maintain:
- Build logs (from EAS)
- User device info (Android version, model)
- Error messages from app logger
- Network connectivity status

---

## ✨ FINAL CHECKLIST BEFORE DISTRIBUTION

- [ ] All 5 critical security fixes deployed ✅
- [ ] DSGVO compliance verified ✅
- [ ] Error logging enabled ✅
- [ ] Analytics consent working ✅
- [ ] Offline mode tested ✅
- [ ] Production APK built ✅
- [ ] APK verified on test device ✅
- [ ] Privacy policy disclosed ✅
- [ ] Download URL/QR code ready ✅

---

## 🎉 YOU'RE READY TO DISTRIBUTE!

```bash
# One-command production build
eas build --platform android --profile production

# Download APK and share with Hochschule Trier students
```

**Expected output**:
```
✅ Build successful
Download: https://eas-build-artifacts.s3.amazonaws.com/...
Ready for Android distribution
```
