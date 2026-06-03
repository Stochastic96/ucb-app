# Debugging Build Version Issues

## Problem: Blank Screen After Login Screen

**Symptoms:**
- APK downloads successfully
- Login screen shows for 1 second
- Everything becomes blank/black
- No error messages shown

**Root Causes Found & Fixed:**
1. ✅ Silent error handling in App.js (now logs errors)
2. ✅ No error UI for initialization failures (added ErrorOverlay)
3. ✅ Missing logging in services (added console.log in API and bootstrap)

---

## How to Debug the Build

### 1. **View Android Logs via ADB (Best Method)**

```bash
# Enable USB Debugging on your Android device
# Connect device via USB cable

# View live logs filtered for errors:
adb logcat | grep -i "react\|expo\|error\|studip\|supabase"

# Or save all logs to a file:
adb logcat > phone-logs.txt &

# [Open the app, let it crash, then stop logging]
# Ctrl+C to stop

# Search the log file:
grep -i "error\|exception\|studip\|bootstrap\|initialization" phone-logs.txt
```

### 2. **Check for These Specific Errors**

Look in the logs for these patterns:

```
[App] Starting initialization...       ← Should see this
[App] Checking for existing session... ← Should see this
[API] GET /users/me                    ← Auth check
[Bootstrap] Starting...                ← Data loading
[Bootstrap] Complete                   ← Success!
```

**If you see errors:**
- `[API] Request timeout` → Network issue or Stud.IP down
- `[API] Response 401` → Invalid credentials
- `[API] Response 500` → Stud.IP server error
- `[Bootstrap] Failed` → Data loading failed

### 3. **Common Issues & Solutions**

#### Issue: "Could not reach Stud.IP"
**Cause:** Network issue or wrong URL in build
**Solution:**
```bash
# Check if eas.json has correct env vars:
cat eas.json | grep STUDIP

# Should show:
# "EXPO_PUBLIC_STUDIP_BASE_URL": "https://studip.hochschule-trier.de/jsonapi.php/v1"

# If wrong, update and rebuild:
eas build --platform android --profile preview
```

#### Issue: "Session expired" after 1 second
**Cause:** Device time is wrong or session cache corrupted
**Solution:**
```bash
# Clear app data:
adb shell pm clear app.ucbnavigator

# Or uninstall and reinstall:
adb uninstall app.ucbnavigator
# Then reinstall APK
```

#### Issue: "Unable to load your Stud.IP data"
**Cause:** API call failed during bootstrap
**Symptoms:** Error shows on screen (not blank)
**Solution:**
- Check your credentials are correct
- Check Stud.IP is accessible: https://studip.hochschule-trier.de/
- Wait a moment and retry (Stud.IP might be slow)

#### Issue: Blank Screen with No Error (Silent Crash)
**Cause:** RootNavigator or a component crashed silently
**Solution:**
1. Check logs for React errors:
   ```bash
   adb logcat | grep -i "react.*error\|thrown\|fatal"
   ```
2. Check if biometric lock is stuck:
   ```bash
   # Clear secure storage:
   adb shell 'rm -r /data/data/app.ucbnavigator/shared_prefs'
   ```

---

## Testing Checklist Before Build

```bash
# 1. Make sure you have .env file for local testing:
ls -la .env

# 2. Test in Expo Go first:
npm start

# 3. Check that all environment variables are set:
grep EXPO_PUBLIC eas.json

# 4. Rebuild after changes:
eas build --platform android --profile preview

# 5. Download APK and install:
adb install -r path/to/your-app.apk
```

---

## What Changes Were Made

### App.js
- ✅ Added console.log for initialization steps
- ✅ Added error capture in checkExistingSession()
- ✅ Added error capture in bootstrapSessionData()
- ✅ Added ErrorOverlay component to display errors to user
- ✅ Shows retry button so user can try again

### services/api.js
- ✅ Added console.log for each API request
- ✅ Added console.error on request failure
- ✅ Better error messages

### services/bootstrap.js
- ✅ Added console.log at start and end
- ✅ Added console.error if bootstrap fails
- ✅ Shows course/event counts loaded

### components/ErrorOverlay.js (NEW)
- ✅ Shows error messages to user
- ✅ Provides Retry button
- ✅ Prevents silent failures

---

## How to Read the Error Screen

When you rebuild and install:

1. **Click "Retry"** if you see an error dialog
2. **Check ADB logs** while the app is running:
   ```bash
   adb logcat | tail -100
   ```
3. **Share the error message** and the logs from the dialog/console

---

## Next Steps

1. Make sure all these changes are committed
2. Rebuild with EAS:
   ```bash
   eas build --platform android --profile preview
   ```
3. Download and test the new APK
4. If you get an error, share:
   - The error message shown on screen
   - The output of: `adb logcat | grep -E "\[App\]|\[API\]|\[Bootstrap\]|error|Error"`

---

## Environment Variables Check

Make sure your `eas.json` has these three variables:

```json
"env": {
  "EXPO_PUBLIC_STUDIP_BASE_URL": "https://studip.hochschule-trier.de/jsonapi.php/v1",
  "EXPO_PUBLIC_SUPABASE_URL": "https://vrnhkwhwoxhcjssqhdat.supabase.co",
  "EXPO_PUBLIC_SUPABASE_KEY": "sb_publishable_M15oPdD_Rg75_80UVcA80Q_r051Uhvg"
}
```

✅ These look correct in your current eas.json.
