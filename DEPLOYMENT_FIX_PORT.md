# Frontend PORT Configuration Fix

## Problem
The app was deployed successfully but showed a blank page because the frontend wasn't listening on the correct port.

## Root Cause
1. **Wrong Next.js standalone syntax**: Used `-p` flag which standalone server.js ignores
2. **Port mismatch**: Dockerfile exposed 8502, but Render assigns dynamic PORT (10000)

## The Fix

### Before (BROKEN):
```bash
# supervisord.single.conf
command=bash -c "sleep 5 && NODE_OPTIONS='--max-old-space-size=128' node .next/standalone/server.js -p ${PORT:-8502}"
```
**Problem:** Next.js standalone server **doesn't support `-p` flag**. It only reads PORT environment variable.

### After (FIXED):
```bash
# supervisord.single.conf  
command=bash -c "sleep 5 && export PORT=${PORT:-10000} && NODE_OPTIONS='--max-old-space-size=128' node .next/standalone/server.js"
```
**Solution:** Explicitly set PORT environment variable that Next.js standalone reads.

### Dockerfile Update:
```dockerfile
# Before
EXPOSE 8502 5055

# After  
EXPOSE 10000 5055  # Match Render's expected default
```

## Why This Works
- Render sets `PORT` environment variable dynamically
- Next.js standalone server **only** reads PORT env var (ignores command-line args)
- We explicitly export PORT with fallback to 10000
- This ensures frontend binds to correct port that Render routes traffic to

## Expected Result
- Frontend accessible at https://ephitup-72fx.onrender.com
- All routes work (/login, /notebooks, etc.)
- Health checks continue to pass on /api/health

