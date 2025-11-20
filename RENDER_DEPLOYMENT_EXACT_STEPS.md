# Exact Steps to Deploy to Render

## Prerequisites Checklist
- [ ] GitHub account
- [ ] Render.com account (sign up at https://render.com)
- [ ] Code pushed to GitHub repository

---

## Step 1: Push Code to GitHub

**If you haven't pushed your code yet:**

```bash
cd /Users/ephriamkassa/Desktop/EphItUp/thirdopen/open-notebook

# Check git status
git status

# Add all files
git add .

# Commit changes
git commit -m "Ready for Render deployment with persistent disk default"

# Push to GitHub (replace 'main' with your branch name if different)
git push origin main
```

**If code is already on GitHub:**
- Skip this step, proceed to Step 2

---

## Step 2: Connect Repository to Render

1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com
   - Sign in or create account

2. **Create New Blueprint**
   - Click **"New +"** button (top right)
   - Select **"Blueprint"** from dropdown

3. **Connect GitHub**
   - If not connected: Click **"Connect GitHub"** → Authorize Render
   - If already connected: Select your GitHub account

4. **Select Repository**
   - Find and select: `thirdopen` (or your repository name)
   - Select branch: `main` (or your default branch)

5. **Render will detect `render.yaml`**
   - You should see: "Found render.yaml" message
   - Click **"Apply"** or **"Create Blueprint"**

---

## Step 3: Review Service Configuration

Render will read `render.yaml` and create a service. Verify these settings:

**Service Name:** `ephitup` (or customize)

**Plan:** 
- **Starter** ($7/month) - Recommended minimum
- **Standard** ($25/month) - Better performance
- **Free** - Not recommended (spins down after inactivity)

**Persistent Disk:**
- Name: `ephitup-data`
- Mount Path: `/mydata`
- Size: `10GB` ($2.50/month)
- ✅ **This is REQUIRED** - Your database and files will be stored here

**Environment Variables (Auto-configured from render.yaml):**
- `JWT_SECRET` - Auto-generated ✅
- `SURREAL_URL` - `ws://localhost:8000/rpc` ✅
- `SURREAL_USER` - `root` ✅
- `SURREAL_PASSWORD` - Auto-generated ✅
- `SURREAL_NAMESPACE` - `open_notebook` ✅
- `SURREAL_DATABASE` - `production` ✅
- `INTERNAL_API_URL` - `http://localhost:5055` ✅
- `DATA_PATH` - `/mydata` ✅
- `ENABLE_WORKER` - `true` ✅

**S3 Variables (NOT SET - Using Persistent Disk):**
- All S3 variables are commented out ✅
- System will use `/mydata/` for all storage ✅

---

## Step 4: Optional - Add User API Keys

**You don't need to set these now** - Users can add their own API keys via the Settings page after deployment.

**If you want to set system-level fallback keys:**

1. In Render Dashboard → Your Service → **Environment**
2. Click **"Add Environment Variable"**
3. Add (one at a time):
   - `OPENAI_API_KEY` = `sk-...` (your OpenAI key)
   - Mark as **"Secret"** ✅
   - Click **"Save Changes"**

**Note:** These are optional fallbacks. Users can add their own keys in the app.

---

## Step 5: Deploy

1. **Click "Create Web Service"** or **"Apply"**
2. **Watch the Build Logs**
   - Build takes 5-15 minutes
   - You'll see Docker build progress
   - Frontend build happens during Docker build
   - Wait for: "Build successful" message

3. **First Deploy Will:**
   - Build Docker image (~10-15 min)
   - Start SurrealDB
   - Run database migrations
   - Start FastAPI backend
   - Start Worker process
   - Start Next.js frontend
   - All managed by Supervisord

---

## Step 6: Get Your App URL

After deployment completes:

1. **Find Your URL**
   - Render Dashboard → Your Service
   - Look for: **"Your service is live at"**
   - Example: `https://ephitup.onrender.com`
   - Or: `https://ephitup-xxxx.onrender.com`

2. **Copy the URL**
   - This is your production app URL
   - Bookmark it!

---

## Step 7: Verify Deployment

1. **Open Your App URL**
   - Visit: `https://your-app-name.onrender.com`
   - Should see: Open Notebook homepage

2. **Create Account**
   - Click "Sign Up" or "Register"
   - Enter email and password
   - Click "Create Account"

3. **Login**
   - Use your credentials
   - Should redirect to dashboard

4. **Test Features**
   - Create a notebook
   - Upload a source file (PDF)
   - Add API keys in Settings (if needed)
   - Test chat functionality

---

## Step 8: Monitor Your Deployment

**View Logs:**
- Render Dashboard → Your Service → **Logs** tab
- See real-time logs from all services
- Filter by service: SurrealDB, API, Worker, Frontend

**Check Health:**
- Render Dashboard → Your Service → **Metrics**
- Monitor: CPU, Memory, Disk usage
- Health check: `/api/health` endpoint

**View Persistent Disk:**
- Render Dashboard → Your Service → **Disk** tab
- See disk usage: `/mydata/`
- Files stored: Database, uploads, podcasts

---

## What's Running

Your single container includes:

| Service | Port | Purpose |
|---------|------|---------|
| SurrealDB | 8000 | Database (internal) |
| FastAPI | 5055 | Backend API (internal) |
| Worker | - | Background jobs |
| Next.js | 10000 | Frontend (public) |

All managed by Supervisord in one container.

---

## Storage Locations

**All data stored on persistent disk (`/mydata/`):**

```
/mydata/
├── mydatabase.db          # SurrealDB database
├── uploads/               # User uploaded files
│   └── *.pdf, *.docx, etc.
├── podcasts/              # Podcast audio files
│   └── episodes/
│       └── episode_name/
│           └── audio/
├── sqlite-db/            # LangGraph checkpoints
│   └── checkpoints.sqlite
└── .secrets/             # Encryption keys
    └── fernet.key
```

**All data persists across deployments!** ✅

---

## Updating Your App

**To deploy updates:**

```bash
cd /Users/ephriamkassa/Desktop/EphItUp/thirdopen/open-notebook

# Make your changes
# ... edit files ...

# Commit and push
git add .
git commit -m "Your update description"
git push origin main
```

**Render will automatically:**
- Detect the push
- Start new build
- Deploy new version
- Keep your data safe (persistent disk)

**Watch deployment:**
- Render Dashboard → Your Service → **Events** tab
- See build progress in real-time

---

## Troubleshooting

### Build Fails

**Check:**
- Render Dashboard → Logs → Look for error messages
- Common issues:
  - Missing dependencies in `requirements.txt`
  - Dockerfile.single not found
  - Frontend build errors

**Fix:**
- Check logs for specific error
- Fix code locally
- Push again

### App Won't Start

**Check:**
- Render Dashboard → Logs → Look for startup errors
- Common issues:
  - Port conflicts
  - Database connection issues
  - Missing environment variables

**Fix:**
- Check all environment variables are set
- Verify `DATA_PATH=/mydata` is set
- Check SurrealDB logs

### Can't Access App

**Check:**
- Is service status "Live"?
- Check URL is correct
- Try health endpoint: `https://your-app.onrender.com/api/health`

**Fix:**
- Wait for deployment to complete
- Check Render status page
- Verify DNS is working

### Database Issues

**Check:**
- Render Dashboard → Logs → Filter "SurrealDB"
- Look for connection errors

**Fix:**
- Database is at `/mydata/mydatabase.db`
- Verify persistent disk is mounted
- Check `SURREAL_PASSWORD` is set

### Frontend Not Loading

**Check:**
- Browser console (F12) for errors
- Network tab for failed requests
- Render logs for frontend errors

**Fix:**
- Verify `INTERNAL_API_URL` is correct
- Check API is running (port 5055)
- Check frontend build succeeded

---

## Cost Breakdown

**Monthly Costs:**

| Item | Cost |
|------|------|
| Web Service (Starter) | $7/month |
| Persistent Disk (10GB) | $2.50/month |
| **Total** | **$9.50/month** |

**Free Tier:**
- 750 hours/month (enough for 24/7 on one service)
- But: Spins down after 15 min inactivity
- Not recommended for production

**Upgrade Options:**
- Standard Plan: $25/month (better performance)
- Larger Disk: $0.25/GB/month (increase if needed)

---

## Security Checklist

- [x] JWT_SECRET auto-generated (secure)
- [x] SURREAL_PASSWORD auto-generated (secure)
- [x] FERNET_SECRET_KEY auto-generated and stored securely
- [x] API keys stored encrypted in database
- [x] HTTPS enabled automatically (Render)
- [x] Persistent disk secured (Render managed)

---

## Next Steps After Deployment

1. **Create Admin User** (if needed)
   - Use the app normally
   - First user can be admin

2. **Add API Keys**
   - Go to Settings page
   - Add your OpenAI/Anthropic keys
   - Keys are encrypted and user-specific

3. **Test Features**
   - Upload sources
   - Create notebooks
   - Generate podcasts
   - Test chat

4. **Monitor Usage**
   - Check Render metrics
   - Monitor disk usage
   - Watch for errors in logs

---

## Quick Reference

**Your App URL:**
```
https://your-app-name.onrender.com
```

**Health Check:**
```
https://your-app-name.onrender.com/api/health
```

**Render Dashboard:**
```
https://dashboard.render.com
```

**Logs:**
```
Render Dashboard → Your Service → Logs
```

**Environment Variables:**
```
Render Dashboard → Your Service → Environment
```

---

## ✅ Deployment Complete!

Your app is now live and accessible worldwide!

**Remember:**
- All data is stored on persistent disk (`/mydata/`)
- Data survives deployments and restarts
- S3 is optional (not configured by default)
- Users can add their own API keys via Settings

**Need Help?**
- Check Render logs
- Review this guide
- Check Render documentation: https://render.com/docs

