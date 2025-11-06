# Worker Setup Complete ✅

**Date:** 2025-11-05  
**Status:** READY for both Local and Production

---

## 🎯 What Was Configured

### Intended Architecture
**Asynchronous processing with background worker** - This is how Open Notebook is designed to work.

### Local Development
✅ `.env` has `ENABLE_WORKER=true`  
✅ `start-local-dev.sh` automatically starts worker  
✅ Worker starts 15s after API to ensure DB is ready  

### Production (Render)
✅ `render.yaml` has `ENABLE_WORKER=true` (line 73)  
✅ `supervisord.single.conf` starts worker automatically  
✅ Worker enabled by default on all deploys  

---

## 🚀 How to Start Locally

```bash
cd /Users/ephriamkassa/Desktop/EphItUp/thirdopen/open-notebook
./start-local-dev.sh
```

This will start **4 services**:
1. **SurrealDB** (database) - Port 8000
2. **Backend API** (FastAPI) - Port 5055
3. **Worker** (background processing) - No port (internal)
4. **Frontend** (Next.js) - Port 3000

**Open:** http://localhost:3000

---

## 📊 What the Worker Does

The worker is essential for:

1. **Source Processing** 
   - Extracts content from PDFs, URLs, documents
   - Generates embeddings for search
   - Chunks large documents
   - Updates processing status in real-time

2. **Transformations**
   - Applies AI transformations (summaries, insights)
   - Runs asynchronously without blocking API

3. **Podcast Generation**
   - Generates outlines and transcripts
   - Processes audio synthesis
   - Long-running task (minutes)

4. **Embeddings Rebuild**
   - Batch processes embeddings
   - Background maintenance tasks

**Without the worker:** Sources get stuck in "processing" status forever.

---

## 🔍 How to Check Worker Status

### Local
```bash
# Check if worker is running
ps aux | grep "surreal-commands-worker"

# View worker logs (in the terminal where you ran start-local-dev.sh)
# Look for: "Starting surreal-commands-worker..."
```

### Production (Render)
1. Go to https://dashboard.render.com
2. Click on your service "ephitup"
3. Click "Logs" tab
4. Search for: `Starting surreal-commands-worker`
5. You should see: `Worker enabled. Starting after 15s delay...`

---

## 🧪 Test Source Processing

### Step 1: Add a Source
1. Go to http://localhost:3000 (or your Render URL)
2. Create a notebook
3. Click "Add Source"
4. Paste a URL: `https://example.com` or upload a PDF
5. Check "Embed content" (optional)
6. Click "Add Source"

### Step 2: Watch Processing
You should see:
- Status: **"Queued"** (yellow) → immediately
- Status: **"Processing"** (blue spinner) → within 15-20 seconds
- Status: **"Completed"** (green checkmark) → after content extraction

**Timing:**
- Small webpage: 10-30 seconds
- Large PDF: 1-3 minutes
- With embeddings: +20-60 seconds

### Step 3: Check Logs
**Local:**
```bash
# In the terminal where start-local-dev.sh is running, you'll see:
# "Processing command: process_source"
# "Content extracted: 5000 characters"
# "Embeddings generated: 12 chunks"
# "Command completed successfully"
```

**Production:**
- Check Render logs for same messages

---

## ⚠️ Troubleshooting

### Issue: Source Stuck in "Processing"

**Symptom:** Source status never changes from "Processing"

**Causes:**
1. Worker not running
2. API keys missing (for embeddings/transformations)
3. URL inaccessible or PDF corrupted

**Fix:**
```bash
# 1. Check worker is running
ps aux | grep surreal-commands-worker

# 2. Check logs for errors
# Look for: "Failed to process source" or "API key not found"

# 3. Restart worker if needed
pkill -f surreal-commands-worker
./start-worker.sh
```

### Issue: "ENABLE_WORKER not found"

**Fix:**
```bash
# Ensure .env has the line:
echo "ENABLE_WORKER=true" >> .env

# Or export it:
export ENABLE_WORKER=true
```

### Issue: Worker crashes immediately

**Cause:** Dependencies not installed

**Fix:**
```bash
source .venv/bin/activate
pip install -r requirements.txt
```

---

## 🎛️ Configuration Options

### Disable Worker (Not Recommended)

**Local:**
```bash
# Edit .env
ENABLE_WORKER=false
```

**Production:**
```bash
# On Render dashboard:
# Environment → ENABLE_WORKER → Set to "false" → Save
```

**Effect:** Sources will stay "queued" forever. Only use this for debugging.

---

## 📈 Performance

### Memory Usage
- **API only:** ~150MB
- **API + Worker:** ~250MB
- **Full stack (4 services):** ~450MB

### Render Plan Recommendations
- **Free (512MB):** Works but tight. May fail on cold starts.
- **Starter (512MB):** Same as free. Good for testing.
- **Standard (2GB):** **RECOMMENDED** - Stable for production.
- **Pro (4GB):** Best for heavy usage.

---

## ✅ Current Status

**Local:** ✅ Configured and ready  
**Production:** ✅ Configured and ready  
**Next Deploy:** Will have worker enabled automatically  

**Commits:**
- `54c7a1c` - Enable worker for both local and production
- `45896bd` - Final clean status report
- `3b9cc41` - Deep code audit
- `210313e` - Fix User.save() bug

**All changes pushed to:** `origin/main`

---

## 🎉 You're Done!

Run `./start-local-dev.sh` and start adding sources. They will process automatically! 🚀

**Next time you push to Render:** Worker will be enabled and sources will process automatically there too.

---

**Need Help?**
- Check logs: `tail -f` on the terminal running start-local-dev.sh
- Render logs: Dashboard → Service → Logs
- Worker status: Look for "surreal-commands-worker" in process list

