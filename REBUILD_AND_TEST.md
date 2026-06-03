# Quick Rebuild & Test Guide

## Step 1: Verify Changes Are Correct

```bash
# See what was changed
git status

# You should see these files modified:
# - App.js
# - services/api.js
# - services/bootstrap.js

# And these new:
# - components/ErrorOverlay.js
# - DEBUG_BUILD_ISSUES.md
# - REBUILD_AND_TEST.md
```

## Step 2: Test in Expo Go First (Optional but Recommended)

```bash
# Start Expo Go dev server
npm start

# Scan QR code with Expo Go on your phone
# Try logging in to make sure the app still works locally
# You should see console logs in the terminal
```

## Step 3: Commit Changes

```bash
git add -A
git commit -m "fix: add comprehensive error handling and logging to build startup

- Add ErrorOverlay component to display initialization errors
- Add console.log statements throughout App.js, api.js, bootstrap.js
- Fix silent error catching in checkExistingSession and bootstrap
- Users now see errors instead of blank screens
- Added DEBUG_BUILD_ISSUES.md with debugging guide"
```

## Step 4: Build APK

```bash
# Preview profile (use this for testing):
eas build --platform android --profile preview

# OR Production profile (for release):
# eas build --platform android --profile production

# The build will take 5-10 minutes
# You'll get a download link when done
```

## Step 5: Download & Install APK

```bash
# Connect phone via USB with USB Debug enabled

# Download the APK (from EAS console or link provided)
# Then install:
adb install -r ~/Downloads/your-app.apk

# Or if you have the direct path:
eas build --platform android --profile preview --wait
# Copy the APK path from the output and:
adb install -r <copied-path>.apk
```

## Step 6: Test the App

1. **Open the app on your phone**
   - You should see the login screen
   - Log in with your Stud.IP credentials

2. **Monitor logs while running**
   ```bash
   adb logcat | grep -E "\[App\]|\[API\]|\[Bootstrap\]|error|Error"
   ```

3. **Look for these messages in order:**
   ```
   [App] Starting initialization...
   [App] Checking for existing session...
   [API] GET /users/me
   [Bootstrap] Starting...
   [Bootstrap] Complete
   ```

4. **If you get an error:**
   - Take a screenshot of the error overlay
   - Copy the full error message
   - Run: `adb logcat > full-logs.txt` and share the logs

## Step 7: If It Works

🎉 Success! The blank screen issue is fixed.

If you see a blank screen again, go to [DEBUG_BUILD_ISSUES.md](./DEBUG_BUILD_ISSUES.md) for troubleshooting.

## Quick Commands Reference

```bash
# Clear app cache if stuck:
adb shell pm clear app.ucbnavigator

# View logs:
adb logcat | grep "App\|API\|Bootstrap"

# Save logs to file:
adb logcat > phone-debug.log

# Uninstall app:
adb uninstall app.ucbnavigator

# Check connected devices:
adb devices

# Real-time log with timestamps:
adb logcat -v time | grep -E "\[App\]|\[API\]|\[Bootstrap\]"
```

---

## Expected Behavior After Fix

### If there's a network error:
You'll see an error dialog like:
```
⚠️ Initialization Error

Could not reach Stud.IP. Check your internet connection.

[Retry] [Dismiss]
```

### If credentials are invalid:
```
⚠️ Initialization Error

Session expired. Please log in again.

[Retry] [Dismiss]
```

### If everything works:
- Login screen briefly appears
- App loads data
- You're logged in with courses/events visible
- No error dialog shows
