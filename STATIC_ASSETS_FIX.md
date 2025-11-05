# Static Assets Fix - Issue #8

## Problem
Frontend loads but all static assets return 404:
- `/_next/static/css/*.css` - 404
- `/_next/static/chunks/*.js` - 404  
- `/_next/static/media/*.woff2` - 404

## Root Cause

Next.js standalone build creates this structure:
```
.next/
  standalone/        ← Contains server.js and minimal dependencies
    server.js        ← Main server file
    node_modules/    ← Minimal required dependencies
    package.json
  static/            ← Static assets (CSS, JS, fonts)
    css/
    chunks/
    media/
```

**The Problem:**
The Dockerfile was:
1. Copying entire `/app` from builder (line 71)
2. Then trying to overwrite with standalone files (lines 74-76)
3. This created a conflicting directory structure where static assets weren't in the correct location

The standalone `server.js` expects to find:
- `public/` in the same directory as `server.js`
- `.next/static/` in the same directory as `server.js`

## The Fix

### Before (BROKEN):
```dockerfile
# Copy the application code
COPY --from=builder /app /app

# Copy built frontend from builder stage  
COPY --from=builder /app/frontend/.next/standalone /app/frontend/
COPY --from=builder /app/frontend/.next/static /app/frontend/.next/static
COPY --from=builder /app/frontend/public /app/frontend/public
```

**Problem:** Copying entire `/app` includes the frontend build directory, which conflicts with the standalone copy. The standalone directory structure wasn't preserved correctly.

### After (FIXED):
```dockerfile
# Copy backend application code (excluding frontend to avoid conflicts)
COPY --from=builder /app/api /app/api
COPY --from=builder /app/open_notebook /app/open_notebook
COPY --from=builder /app/commands /app/commands
COPY --from=builder /app/prompts /app/prompts
COPY --from=builder /app/migrations /app/migrations
COPY --from=builder /app/*.py /app/
COPY --from=builder /app/pyproject.toml /app/
COPY --from=builder /app/uv.lock /app/

# Copy frontend standalone build with correct structure
# Next.js standalone puts everything at .next/standalone/ root
COPY --from=builder /app/frontend/.next/standalone /app/frontend/
# Static assets must be copied separately to .next/static
COPY --from=builder /app/frontend/.next/static /app/frontend/.next/static
# Public folder must be copied separately
COPY --from=builder /app/frontend/public /app/frontend/public
```

**Solution:** 
1. Copy backend files individually (no conflict)
2. Copy standalone's `/frontend` subdirectory which contains `server.js`
3. Copy `.next/static` to correct location relative to `server.js`
4. Copy `public` to correct location relative to `server.js`

## Expected File Structure in Container

```
/app/
  frontend/
    server.js              ← From standalone/frontend/
    node_modules/          ← From standalone/frontend/
    .next/
      static/              ← Copied separately
        css/
        chunks/
        media/
    public/                ← Copied separately
      *.svg
  api/
  open_notebook/
  ...other backend files
```

## Why This Works

When Next.js standalone builds, it creates `server.js` inside a subdirectory. The path is:
```
.next/standalone/frontend/server.js
```

NOT:
```
.next/standalone/server.js
```

By copying `.next/standalone/` (which contains server.js at its root) to `/app/frontend/`, we get the correct structure where:
- `server.js` is at `/app/frontend/server.js`
- Static assets are at `/app/frontend/.next/static/`
- Public files are at `/app/frontend/public/`

This matches exactly what `server.js` expects.

## Testing

After this fix:
```bash
# Static CSS should load
curl https://ephitup-72fx.onrender.com/_next/static/css/7e7d96b1e6991756.css
# Should return CSS, not 404

# Static JS should load  
curl https://ephitup-72fx.onrender.com/_next/static/chunks/webpack-dd07967a10962ce5.js
# Should return JavaScript, not 404

# Fonts should load
curl https://ephitup-72fx.onrender.com/_next/static/media/e4af272ccee01ff0-s.p.woff2
# Should return font file, not 404
```

## Related Issues
- Issue #4: PORT configuration (fixed)
- Issue #7: package.json defaults (fixed)

This is Issue #8 in the deployment fix series.

