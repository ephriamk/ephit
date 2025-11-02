# Critical Deployment Architecture Issues

## Real User Flow Analysis

### What SHOULD Happen on Render:

```
1. User visits: https://ephitup-2g8q.onrender.com
2. Render Load Balancer (port 443) routes to Container PORT (dynamically assigned, e.g., 10000)
3. Container Frontend (Next.js) binds to that PORT
4. User's browser makes API call: https://ephitup-2g8q.onrender.com/api/users
5. Next.js rewrite proxies: /api/* → http://localhost:5055/api/*
6. Backend (FastAPI) responds
7. Backend connects to SurrealDB at localhost:8000
```

## 🚨 CRITICAL ISSUE #1: PORT Configuration Conflict

**Location:** `supervisord.single.conf` line 48

```ini
[program:frontend]
command=bash -c "sleep 5 && NODE_OPTIONS='--max-old-space-size=128' node .next/standalone/server.js -p ${PORT:-8502}"
environment=NODE_ENV="production",PORT="8502",NODE_OPTIONS="--max-old-space-size=128"
passenv=API_URL,NEXT_PUBLIC_API_URL,INTERNAL_API_URL,PORT
```

**Problem:**
- `environment=PORT="8502"` **OVERRIDES** Render's dynamically assigned PORT
- Render expects service on PORT (e.g., 10000)
- Frontend binds to hardcoded 8502
- **Result:** 502 Bad Gateway - Render can't reach the service!

**Evidence from logs:**
```
▲ Next.js 15.4.7
 - Local: http://localhost:8502
 - Network: http://10.23.141.200:8502
```
Should be binding to PORT from Render, not 8502!

**Fix:**
Remove PORT from environment line - let it come from passenv only:
```ini
environment=NODE_ENV="production",NODE_OPTIONS="--max-old-space-size=128"
```

## 🚨 CRITICAL ISSUE #2: API URL Auto-Detection is WRONG

**Location:** `frontend/src/app/config/route.ts` line 51

```typescript
const apiUrl = `${proto}://${hostname}:5055`
```

**Problem:**
- On Render, this produces: `https://ephitup-2g8q.onrender.com:5055`
- Port 5055 is **internal to the container**
- Users' browsers **cannot reach** internal container ports directly
- Only the PORT that Render assigns is exposed publicly

**Real Example:**
- User loads frontend: `https://ephitup-2g8q.onrender.com` (works, port 443 → PORT)
- Frontend tells browser to call: `https://ephitup-2g8q.onrender.com:5055/api/users`
- Browser tries to connect to port 5055 directly
- **Result:** Connection refused - port 5055 is not exposed!

**What SHOULD Happen:**
- Browser should call: `https://ephitup-2g8q.onrender.com/api/users` (no port)
- Next.js rewrite handles internal proxying to localhost:5055

**Fix:**
Return relative API URL (empty or "/") so browser uses same host:
```typescript
return NextResponse.json({
  apiUrl: '', // Use same host/port as frontend
})
```

Then API client uses relative URLs: `/api/users` instead of full URLs with port.

## 🚨 ISSUE #3: Memory Constraints (512MB for 4 Services)

**Current Setup:**
- SurrealDB: ~50-100MB
- FastAPI: ~50-100MB
- Worker: ~50-100MB
- Next.js: ~100-200MB
- **Total:** ~250-500MB (very tight!)

**Evidence from past runs:**
```
Instance failed: Ran out of memory (used over 512MB)
```

**Recommendation:**
- Upgrade to "standard" plan (2GB RAM) for production
- Or optimize further by:
  - Disabling worker until needed
  - Further reducing Next.js heap size
  - Using lighter Python dependencies

## 🚨 ISSUE #4: Frontend API Client Logic

**Location:** `frontend/src/lib/config.ts` lines 97-98

```typescript
if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
  defaultApiUrl = `${protocol}//${hostname}:5055`
```

**Problem:**
Same as Issue #2 - tries to use port 5055 directly which doesn't work on Render.

**Fix:**
On Render deployment, API should be accessed via the same URL as frontend (no port).

## 🚨 ISSUE #5: Health Check Timing

**Location:** `render.yaml` line 8

```yaml
healthCheckPath: /
```

**Problem:**
- Health check hits PORT (frontend)
- Frontend starts after 5 second sleep
- SurrealDB needs time to initialize
- Backend needs time to run migrations

**Current Startup Order:**
```
0s:  SurrealDB starts
3s:  API marked "up" (but might still be initializing)
3s:  Worker marked "up"
5s:  Frontend starts
?s:  Migrations complete
```

**Recommendation:**
- Increase `startsecs` for services that need initialization time
- Or add a proper health check endpoint that verifies all services are ready

## 📋 Complete Fix Checklist

### 1. Fix PORT Binding
- [ ] Remove `PORT="8502"` from supervisord environment line
- [ ] Verify frontend uses Render's PORT variable
- [ ] Test that health check reaches frontend on dynamic PORT

### 2. Fix API URL Configuration
- [ ] Update `/config` route to return relative URL
- [ ] Update API client to use relative URLs (no port 5055)
- [ ] Remove port-specific logic from config.ts
- [ ] Test API calls work through Next.js rewrite

### 3. Simplify Architecture
- [ ] Remove confusing dual URL system (API_URL vs INTERNAL_API_URL)
- [ ] Use consistent approach: frontend proxies to backend internally
- [ ] Browser only knows about one URL: the Render domain

### 4. Add Proper Health Check
- [ ] Create `/api/health` endpoint that checks:
  - Backend is running
  - Database is connected
  - Migrations are complete
- [ ] Update render.yaml to use this endpoint

### 5. Memory Optimization (if staying on 512MB)
- [ ] Disable worker on startup (start manually when needed)
- [ ] Further reduce Next.js memory limits
- [ ] Monitor actual usage patterns

## Correct Architecture for Render Single-Container Deployment

```
Internet
   ↓
Render Load Balancer (HTTPS port 443)
   ↓
Container (binds to dynamic PORT from Render, e.g., 10000)
   ↓
Next.js Frontend (PORT from env var)
   │
   ├─→ Static pages/assets served directly
   │
   ├─→ /api/* requests → Next.js rewrite → http://localhost:5055/api/*
   │                                              ↓
   │                                         FastAPI Backend
   │                                              ↓
   │                                         SurrealDB (localhost:8000)
   │
   └─→ Browser never sees port numbers!
       All requests go to: https://ephitup-2g8q.onrender.com
```

**Key Principles:**
1. Only ONE port is public: Render's assigned PORT
2. All internal communication uses localhost
3. Browser uses relative URLs or same-origin URLs (no ports)
4. Next.js rewrite is transparent to the browser

