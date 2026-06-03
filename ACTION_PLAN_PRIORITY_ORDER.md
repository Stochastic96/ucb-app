# ACTION PLAN - Priority Order (Critical to Nice-to-Have)

## 🔴 PRIORITY 1: FIX DEPENDENCIES (CRITICAL - BLOCKING)

### Why
- App crashes at native layer before JavaScript runs
- Error handling can't help if app never starts
- This is the **root cause** of blank screen in standalone builds

### What to Do

```bash
# Step 1: Open package.json
nano package.json

# Step 2: Replace dependencies section with Expo 54 compatible versions
# (See DEPENDENCY_FIX_CRITICAL.md for exact JSON)

# Step 3: Clean install
rm -rf node_modules package-lock.json
npm install

# Step 4: Verify
npm ls react react-native
# Should show: react@18.2.0 and react-native@0.73.6

# Step 5: Commit
git add package.json
git commit -m "fix: align dependencies to Expo SDK 54 (React 18, RN 0.73)"

# Step 6: Test locally
npm start
# Scan QR code with Expo Go
# Verify app launches and works

# Step 7: Rebuild APK with clean cache
eas build --platform android --profile preview --clear-cache

# Step 8: Install and test
adb install -r your-app.apk
adb logcat | grep "error\|Error\|ERROR"
```

### Expected Result
✅ App launches on device without blank screen
✅ Login screen appears
✅ No native crashes

### Time Estimate
- 15 minutes to update package.json
- 5 minutes to clean install
- 10-15 minutes EAS build
- 5 minutes to test
- **Total: ~45 minutes**

---

## 🟡 PRIORITY 2: VERIFY ERROR HANDLING WORKS (IMPORTANT)

### Why
- Error handling is in place but untested with correct dependencies
- Needs verification that ErrorOverlay displays correctly

### What to Do

```bash
# Step 1: Turn off WiFi on device

# Step 2: Try to refresh data in app
# (Pull down on Home screen or Force Refresh)

# Step 3: Observe error message
# Should see ErrorOverlay with:
# - Error description
# - Retry button
# - Dismiss button

# Step 4: Tap Retry
# (Turn WiFi back on first)
# Error should clear and data should load

# Step 5: Check console logs
adb logcat | grep "\[App\]\|\[API\]\|\[Bootstrap\]"

# Should show timestamps and log messages
```

### Expected Result
✅ Error message appears instead of blank screen
✅ Retry button works
✅ Console logs show all operations
✅ No silent failures

### Time Estimate
- **5 minutes**

---

## 🟢 PRIORITY 3: VERIFY ANALYTICS WORK (GOOD)

### Why
- Analytics needed for monitoring app health
- Error tracking helps identify issues
- KPI tracking shows engagement

### What to Do

```bash
# Step 1: Use app normally for 5 minutes
# Log in, navigate screens, trigger errors

# Step 2: Go to Supabase Console
# https://app.supabase.com

# Step 3: Navigate to engagement_events table

# Step 4: Run query to see events
SELECT * FROM engagement_events
ORDER BY created_at DESC
LIMIT 20;

# Step 5: Verify you see:
# - session_start events
# - screen_view events
# - Any error events if triggered

# Step 6: Check event structure
# - event_type: session_start|session_end|screen_view|error
# - event_name: specific name (app_open, HomeScreen, etc.)
# - properties: has app_language, ts
# - platform: android
```

### Expected Result
✅ Analytics events appear in Supabase
✅ Session tracking works
✅ Screen navigation tracked
✅ Error tracking operational

### Time Estimate
- **5 minutes**

---

## 💜 PRIORITY 4: REVIEW DOCUMENTATION (NICE-TO-HAVE)

### Why
- Team needs to understand error handling system
- Future maintenance depends on good docs
- Debugging guide helps troubleshoot issues

### What to Do

```bash
# Read in this order:
1. QUICK_START_DEBUGGING.md       # Quick reference
2. DEPENDENCY_FIX_CRITICAL.md     # Why the fix was needed
3. ERROR_HANDLING_AND_LOGGING.md  # How to use logger
4. ANALYTICS_AND_KPI_GUIDE.md     # What's being tracked
5. VERIFICATION_CHECKLIST.md      # Complete testing guide
```

### Expected Result
✅ Team understands error handling
✅ Debugging procedures documented
✅ Analytics setup understood
✅ Future maintenance procedures clear

### Time Estimate
- **20-30 minutes** (reading)

---

## 📋 Complete Checklist

### Phase 1: Fix Dependencies
- [ ] Update package.json with Expo 54 compatible versions
- [ ] Run npm install (clean)
- [ ] Verify react@18.2.0 and react-native@0.73.6
- [ ] Test locally in Expo Go
- [ ] Commit changes
- [ ] Rebuild APK with --clear-cache
- [ ] Install APK on device
- [ ] Verify app launches (no blank screen)
- [ ] Check console for initialization logs

### Phase 2: Verify Error Handling
- [ ] Turn off WiFi
- [ ] Trigger error (force refresh)
- [ ] Verify ErrorOverlay appears
- [ ] Check error message is readable
- [ ] Tap Retry button
- [ ] Verify app recovers
- [ ] Check console logs (adb logcat)
- [ ] Test with valid network
- [ ] Verify normal operation works

### Phase 3: Verify Analytics
- [ ] Use app for 5 minutes
- [ ] Check Supabase engagement_events table
- [ ] Verify session_start event
- [ ] Verify screen_view events
- [ ] Verify event structure (properties, platform, etc.)
- [ ] Verify timestamp recording
- [ ] Test error event tracking (optional)

### Phase 4: Documentation Review
- [ ] Read QUICK_START_DEBUGGING.md
- [ ] Read DEPENDENCY_FIX_CRITICAL.md
- [ ] Read ERROR_HANDLING_AND_LOGGING.md
- [ ] Read ANALYTICS_AND_KPI_GUIDE.md
- [ ] Skim VERIFICATION_CHECKLIST.md
- [ ] Share docs with team

---

## Success Criteria

### App Works
- ✅ Launches on Android device
- ✅ Shows login screen (no blank screen)
- ✅ Login functionality works
- ✅ Navigation works
- ✅ Data loads correctly

### Error Handling Works
- ✅ Network errors show message
- ✅ Auth failures show message
- ✅ Server errors show message
- ✅ Retry button available
- ✅ Console logs show all steps

### Analytics Works
- ✅ Events in Supabase
- ✅ Session tracking
- ✅ Screen navigation tracked
- ✅ Error rates visible
- ✅ Duration metrics recorded

---

## Timeline

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Fix dependencies | 45 min | 🔴 TODO |
| 2 | Verify error handling | 5 min | ⏳ After Phase 1 |
| 3 | Verify analytics | 5 min | ⏳ After Phase 1 |
| 4 | Review docs | 30 min | ⏳ Ongoing |
| **Total** | **Complete Fix & Verification** | **~90 minutes** | |

---

## What NOT to Do

❌ Don't test in Expo Go yet (it will work but that's not helpful)
❌ Don't skip the npm clean install
❌ Don't build without --clear-cache
❌ Don't assume it works without testing on device
❌ Don't ignore dependency warnings
❌ Don't modify error handling code yet (dependencies first)

---

## If Something Goes Wrong

### Problem: npm install fails

**Solution:**
```bash
# Check error message carefully
# Usually missing version or typo in package.json
# Revert and try again:
git checkout package.json
npm install
```

### Problem: App still shows blank screen after rebuild

**Solution:**
```bash
# Check native compilation errors:
# Go to EAS dashboard → build logs
# Look for "ABI mismatch" or compilation errors
# Verify versions in package.json match Expo 54
# Rebuild with --clear-cache
```

### Problem: Analytics not appearing

**Solution:**
```bash
# Wait 30+ seconds (batching interval)
# Check analyticsEnabled is true in app settings
# Verify network is connected when app closes
# Check Supabase RLS policies allow anon inserts
```

---

## Next Steps

**Immediately:**
1. Follow Priority 1 (Fix Dependencies)
2. Test on device

**After Success:**
1. Follow Priority 2 (Verify Error Handling)
2. Follow Priority 3 (Verify Analytics)
3. Follow Priority 4 (Review Documentation)

**For Team:**
1. Share this action plan
2. Share documentation
3. Set up Supabase monitoring
4. Document error procedures

---

## Questions to Answer

After completing all phases:

- ✅ Does app launch without errors?
- ✅ Are error messages user-friendly?
- ✅ Is console logging comprehensive?
- ✅ Are analytics working in Supabase?
- ✅ Can team debug issues using logs?
- ✅ Is the process documented?

If all answers are ✅, you're done!

---

**Status**: Ready to execute
**Blocking Issue**: Dependency mismatch
**Solution**: DEPENDENCY_FIX_CRITICAL.md
**Next Action**: Update package.json
