# Deploy Failed - Troubleshooting Guide

## Step 1: Get the Exact Error

**Please share the error message from Render logs:**

1. Go to Render Dashboard → Your Service (`ephitup`)
2. Click **"Logs"** tab
3. Scroll to the bottom (most recent errors)
4. Look for lines with:
   - `ERROR`
   - `FAILED`
   - `Error:`
   - `Exception:`
5. Copy the last 50-100 lines and share them

**Or check the Events tab:**
- Render Dashboard → Your Service → **Events**
- Look for failed deployment events
- Click on them to see details

---

## Common Issues & Quick Fixes

### Issue 1: Build Failed - Docker Build Error

**Symptoms:**
- Error during Docker build phase
- Messages like: "COPY failed", "RUN failed", "npm ci failed"

**Common Causes:**

**A. Frontend Build Failed**
```
npm ERR! ... 
Error during npm ci or npm run build
```

**Fix:**
```bash
# Test locally first
cd /Users/ephriamkassa/Desktop/EphItUp/thirdopen/open-notebook/frontend
rm -rf node_modules .next
npm ci
npm run build
```

**B. Python Dependencies Failed**
```
ModuleNotFoundError: No module named '...'
uv sync failed
```

**Fix:**
```bash
# Test locally
cd /Users/ephriamkassa/Desktop/EphItUp/thirdopen/open-notebook
source venv/bin/activate  # or your venv
uv sync --frozen --no-dev
```

**C. Missing Files**
```
COPY failed: file not found
```

**Fix:**
- Ensure all files are committed to git
- Check `.dockerignore` isn't excluding needed files

---

### Issue 2: Service Won't Start

**Symptoms:**
- Build succeeds but service fails to start
- Health check fails
- Status shows "Failed" or "Unhealthy"

**Common Causes:**

**A. Frontend Server Not Starting**
```
Error: Cannot find module '/app/frontend/server.js'
```

**Fix:** The Next.js standalone structure might be wrong. Check:
- Is `server.js` at `/app/frontend/server.js`?
- Or is it at `/app/frontend/.next/standalone/server.js`?

**B. Port Binding Issue**
```
Error: listen EADDRINUSE: address already in use :::10000
```

**Fix:** Usually means multiple services trying to use same port. Check supervisord config.

**C. Database Connection Failed**
```
Failed to connect to SurrealDB
Connection refused
```

**Fix:**
- Check `SURREAL_URL=ws://localhost:8000/rpc` is correct
- Verify SurrealDB starts before API (priority in supervisord)
- Check `/mydata` directory is writable

**D. Missing Environment Variables**
```
JWT_SECRET is required
SURREAL_PASSWORD is required
```

**Fix:**
- These should auto-generate, but check Render Environment tab
- Ensure `generateValue: true` is set in render.yaml

---

### Issue 3: Health Check Failed

**Symptoms:**
- Service starts but health check fails
- Status shows "Unhealthy"
- `/api/health` endpoint returns error

**Common Causes:**

**A. Health Check Path Wrong**
```
404 Not Found at /api/health
```

**Fix:** Verify `healthCheckPath: /api/health` in render.yaml matches your actual endpoint.

**B. API Not Ready**
```
Connection refused at /api/health
```

**Fix:** API might not be started yet. Check:
- Is API service running? (check logs)
- Is it binding to correct port? (5055)
- Are there startup errors?

---

## Quick Diagnostic Commands

**If you can access Render shell (SSH):**

```bash
# Check if files exist
ls -la /app/frontend/server.js
ls -la /app/frontend/.next/static

# Check if services are running
ps aux | grep node
ps aux | grep uvicorn
ps aux | grep surreal

# Check environment variables
env | grep PORT
env | grep SURREAL
env | grep JWT

# Check logs
tail -100 /var/log/supervisor/supervisord.log
```

---

## Most Likely Issues Based on Your Setup

### 1. Next.js Standalone Structure Mismatch

**Problem:** Next.js standalone might create `server.js` at a different path than expected.

**Check:** Look in Render logs for:
```
Error: Cannot find module '/app/frontend/server.js'
```

**Possible Fix:** Update supervisord.single.conf if server.js is in a different location.

### 2. Build Memory Issues

**Problem:** Starter plan (512MB) might not have enough memory for build.

**Check:** Look for:
```
JavaScript heap out of memory
Killed (out of memory)
```

**Fix:** 
- Upgrade to Standard plan (2GB) for build
- Or reduce memory usage in build

### 3. Missing Dependencies

**Problem:** Some Python or Node dependencies might be missing.

**Check:** Look for:
```
ModuleNotFoundError
npm ERR! missing dependency
```

**Fix:** Ensure all dependencies are in `pyproject.toml` and `package.json`

---

## What to Share With Me

To help debug, please share:

1. **Error Type:**
   - [ ] Build failed (during Docker build)
   - [ ] Service won't start (after build)
   - [ ] Health check failed (service running but unhealthy)
   - [ ] Runtime error (app loads but crashes)

2. **Exact Error Message:**
   ```
   [Paste the exact error from Render logs]
   ```

3. **When It Fails:**
   - During which phase? (build/startup/runtime)
   - How long does it take before failing?

4. **Logs:**
   - Last 50-100 lines from Render logs
   - Focus on ERROR lines

---

## Quick Fixes to Try

### Fix 1: Ensure All Files Committed

```bash
cd /Users/ephriamkassa/Desktop/EphItUp/thirdopen/open-notebook
git add -A
git status  # Check what's being committed
git commit -m "Fix deployment issues"
git push origin main
```

### Fix 2: Check Render Configuration

1. Render Dashboard → Your Service → **Environment**
2. Verify these are set (should auto-generate):
   - `JWT_SECRET` ✅
   - `SURREAL_PASSWORD` ✅
3. Verify these are set:
   - `DATA_PATH=/mydata` ✅
   - `INTERNAL_API_URL=http://localhost:5055` ✅

### Fix 3: Try Standard Plan

If Starter plan (512MB) is too small:
1. Render Dashboard → Your Service → **Settings**
2. Change Plan: Starter → **Standard** (2GB)
3. Redeploy

---

## Next Steps

**Once you share the error message, I can:**
1. Identify the exact issue
2. Provide a targeted fix
3. Update the code if needed
4. Test the fix

**Please share:**
- The exact error message from Render logs
- Which phase it fails at (build/startup/runtime)

Then I'll provide a specific fix! 🔧

